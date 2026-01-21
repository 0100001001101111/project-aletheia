#!/usr/bin/env node
/**
 * Full Bigfoot Data Import Script
 *
 * Imports 3,809 BFRO Bigfoot sightings into the exploratory tier.
 *
 * Prerequisites:
 * - CSV file at /tmp/bigfoot_bfro.csv (downloaded from GitHub)
 * - Supabase connection via service role key
 *
 * Usage:
 *   SUPABASE_URL=https://your-project.supabase.co \
 *   SUPABASE_SERVICE_KEY=your-service-key \
 *   node scripts/import-bigfoot-full.js
 */

const fs = require('fs');

// Configuration
const CSV_PATH = '/tmp/bigfoot_bfro.csv';
const BATCH_SIZE = 100;

// Parse CSV
function parseCSV(filepath) {
  const csv = fs.readFileSync(filepath, 'utf8');
  const lines = csv.split('\n').slice(1); // Skip header

  const records = [];
  for (const line of lines) {
    if (!line.trim()) continue;

    // Parse CSV - handle quoted fields
    let fields = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        fields.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    fields.push(current);

    if (fields.length < 6) continue;

    const [number, title, classification, timestamp, lat, lng] = fields;

    // Calculate weirdness score based on classification
    let weirdness = 5;
    if (classification === 'Class A') weirdness = 8;
    else if (classification === 'Class B') weirdness = 6;
    else if (classification === 'Class C') weirdness = 4;

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);

    if (isNaN(latitude) || isNaN(longitude)) continue;

    records.push({
      title: title.substring(0, 500).replace(/'/g, "''"),
      classification,
      timestamp,
      latitude,
      longitude,
      weirdness,
      number
    });
  }

  return records;
}

// Generate SQL for a batch
function generateBatchSQL(records) {
  const values = records.map(r => {
    const raw_data = JSON.stringify({
      classification: {
        class: r.classification.replace('Class ', ''),
        class_description: r.classification === 'Class A' ? 'Clear sighting' :
                          r.classification === 'Class B' ? 'Possible/obscured' : 'Secondhand'
      },
      location: { lat: r.latitude, lng: r.longitude },
      report_metadata: { source: 'BFRO', report_number: r.number }
    }).replace(/'/g, "''");

    return `('${r.title}', 'bigfoot', 'exploratory', ${r.weirdness}, 'verified', ${r.weirdness}, '${raw_data}'::jsonb, '${r.timestamp}')`;
  });

  return `INSERT INTO aletheia_investigations (title, investigation_type, tier, triage_score, triage_status, weirdness_score, raw_data, created_at) VALUES\n${values.join(',\n')};`;
}

async function main() {
  console.log('Bigfoot Data Import Script');
  console.log('==========================\n');

  // Check for CSV file
  if (!fs.existsSync(CSV_PATH)) {
    console.log(`CSV file not found at ${CSV_PATH}`);
    console.log('\nTo download the data:');
    console.log('  curl -L "https://raw.githubusercontent.com/timothyrenner/bigfoot-dash-app/main/data/bigfoot_bfro.csv" -o /tmp/bigfoot_bfro.csv');
    process.exit(1);
  }

  // Check for Supabase credentials
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.log('Missing Supabase credentials. Set SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables.');
    console.log('\nAlternatively, this script generated SQL files in /tmp that you can run directly.');

    // Generate SQL files for manual import
    console.log('\nParsing CSV...');
    const records = parseCSV(CSV_PATH);
    console.log(`Found ${records.length} records`);

    // Generate batch files
    const batches = [];
    for (let i = 0; i < records.length; i += BATCH_SIZE) {
      batches.push(records.slice(i, i + BATCH_SIZE));
    }

    console.log(`\nGenerating ${batches.length} batch SQL files...`);
    for (let i = 0; i < batches.length; i++) {
      const sql = generateBatchSQL(batches[i]);
      fs.writeFileSync(`/tmp/bigfoot_batch_${i + 1}_of_${batches.length}.sql`, sql);
    }

    console.log(`\nSQL files written to /tmp/bigfoot_batch_*.sql`);
    console.log('You can run these in the Supabase SQL Editor.');
    process.exit(0);
  }

  // Use Supabase client for import
  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log('Parsing CSV...');
  const records = parseCSV(CSV_PATH);
  console.log(`Found ${records.length} records\n`);

  // Delete existing BFRO data to avoid duplicates
  console.log('Removing existing BFRO data...');
  const { error: deleteError } = await supabase
    .from('aletheia_investigations')
    .delete()
    .eq('investigation_type', 'bigfoot')
    .not('raw_data->report_metadata->source', 'is', null);

  if (deleteError) {
    console.error('Delete error:', deleteError);
  }

  // Import in batches
  let imported = 0;
  const batches = [];
  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    batches.push(records.slice(i, i + BATCH_SIZE));
  }

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    const rows = batch.map(r => ({
      title: r.title,
      investigation_type: 'bigfoot',
      tier: 'exploratory',
      triage_score: r.weirdness,
      triage_status: 'verified',
      weirdness_score: r.weirdness,
      raw_data: {
        classification: {
          class: r.classification.replace('Class ', ''),
          class_description: r.classification === 'Class A' ? 'Clear sighting' :
                            r.classification === 'Class B' ? 'Possible/obscured' : 'Secondhand'
        },
        location: { lat: r.latitude, lng: r.longitude },
        report_metadata: { source: 'BFRO', report_number: r.number }
      },
      created_at: r.timestamp
    }));

    const { error } = await supabase
      .from('aletheia_investigations')
      .insert(rows);

    if (error) {
      console.error(`Batch ${i + 1} error:`, error.message);
    } else {
      imported += batch.length;
      process.stdout.write(`\rImported ${imported}/${records.length} records...`);
    }
  }

  console.log(`\n\nImport complete! ${imported} records imported.`);
}

main().catch(console.error);
