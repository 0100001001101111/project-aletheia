#!/usr/bin/env npx tsx
/**
 * NUFORC Data Import Script
 * Imports NUFORC sightings from the Hugging Face dataset JSON file
 *
 * Usage: npx tsx scripts/import-nuforc.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { parseNuforcRecord, validateInvestigation } from '../src/lib/data-ingestion/parsers';
import { RawNuforcRecord } from '../src/lib/data-ingestion/types';

// Load environment variables
const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      process.env[match[1]] = match[2];
    }
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const BATCH_SIZE = 500;
const DATA_FILE = path.join(process.cwd(), 'data-imports/nuforc.json');

interface IngestionStats {
  total: number;
  processed: number;
  inserted: number;
  skipped: number;
  errors: number;
  duplicates: number;
}

async function main() {
  console.log('=== NUFORC Data Import ===\n');

  // Check if file exists
  if (!fs.existsSync(DATA_FILE)) {
    console.error(`Data file not found: ${DATA_FILE}`);
    process.exit(1);
  }

  // Load JSON data
  console.log('Loading JSON data...');
  const rawData = fs.readFileSync(DATA_FILE, 'utf-8');
  const records: RawNuforcRecord[] = JSON.parse(rawData);
  console.log(`Loaded ${records.length.toLocaleString()} records\n`);

  // Create sync record
  const { data: syncRecord, error: syncError } = await supabase
    .from('aletheia_data_sync')
    .insert({
      source: 'nuforc',
      sync_type: 'full',
      status: 'running',
    })
    .select('id')
    .single();

  if (syncError) {
    console.error('Failed to create sync record:', syncError);
    process.exit(1);
  }

  const syncId = syncRecord.id;
  console.log(`Sync ID: ${syncId}\n`);

  const stats: IngestionStats = {
    total: records.length,
    processed: 0,
    inserted: 0,
    skipped: 0,
    errors: 0,
    duplicates: 0,
  };

  // Get existing source IDs for fast duplicate check
  console.log('Loading existing records for duplicate detection...');
  const { data: existing } = await supabase
    .from('aletheia_investigations')
    .select('source_id')
    .eq('data_source', 'nuforc');

  const existingIds = new Set((existing || []).map(r => r.source_id));
  console.log(`Found ${existingIds.size.toLocaleString()} existing NUFORC records\n`);

  // Process in batches
  const startTime = Date.now();

  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);
    const batchRecords: Array<Record<string, unknown>> = [];

    for (const raw of batch) {
      stats.processed++;

      try {
        // Parse the record
        const parsed = parseNuforcRecord(raw);
        if (!parsed) {
          stats.skipped++;
          continue;
        }

        // Check for duplicate
        if (existingIds.has(parsed.sourceId)) {
          stats.duplicates++;
          continue;
        }

        // Validate
        const validationErrors = validateInvestigation(parsed);
        if (validationErrors.length > 0) {
          stats.skipped++;
          continue;
        }

        // Build the database record
        batchRecords.push({
          investigation_type: parsed.investigationType,
          title: parsed.title,
          description: parsed.description,
          raw_data: parsed.rawData,
          data_source: parsed.dataSource,
          source_id: parsed.sourceId,
          latitude: parsed.latitude,
          longitude: parsed.longitude,
          created_at: parsed.eventDate?.toISOString() || new Date().toISOString(),
          imported_at: new Date().toISOString(),
        });

        // Add to existingIds to prevent duplicates within this run
        existingIds.add(parsed.sourceId);
      } catch (err) {
        stats.errors++;
      }
    }

    // Batch insert
    if (batchRecords.length > 0) {
      const { error: insertError } = await supabase
        .from('aletheia_investigations')
        .insert(batchRecords);

      if (insertError) {
        console.error(`Batch insert error at ${i}:`, insertError.message);
        stats.errors += batchRecords.length;
      } else {
        stats.inserted += batchRecords.length;
      }
    }

    // Progress update
    const elapsed = (Date.now() - startTime) / 1000;
    const rate = stats.processed / elapsed;
    const remaining = (records.length - stats.processed) / rate;

    if (i % 5000 === 0 || i + BATCH_SIZE >= records.length) {
      console.log(
        `Progress: ${stats.processed.toLocaleString()}/${records.length.toLocaleString()} ` +
        `(${((stats.processed / records.length) * 100).toFixed(1)}%) | ` +
        `Inserted: ${stats.inserted.toLocaleString()} | ` +
        `Skipped: ${stats.skipped.toLocaleString()} | ` +
        `Dupes: ${stats.duplicates.toLocaleString()} | ` +
        `ETA: ${Math.round(remaining)}s`
      );
    }
  }

  // Update sync record
  await supabase
    .from('aletheia_data_sync')
    .update({
      status: stats.errors > 0 ? 'partial' : 'success',
      records_added: stats.inserted,
      records_skipped: stats.skipped + stats.duplicates,
      total_source_records: records.length,
    })
    .eq('id', syncId);

  // Final summary
  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log('\n=== Import Complete ===');
  console.log(`Total records: ${stats.total.toLocaleString()}`);
  console.log(`Inserted: ${stats.inserted.toLocaleString()}`);
  console.log(`Duplicates: ${stats.duplicates.toLocaleString()}`);
  console.log(`Skipped: ${stats.skipped.toLocaleString()}`);
  console.log(`Errors: ${stats.errors.toLocaleString()}`);
  console.log(`Time: ${totalTime}s`);
  console.log(`Rate: ${Math.round(stats.processed / parseFloat(totalTime))} records/sec`);
}

main().catch(console.error);
