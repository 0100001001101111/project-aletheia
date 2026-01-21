#!/usr/bin/env node
/**
 * Direct Bigfoot Import Script
 * Run: node scripts/import-bigfoot-now.mjs
 *
 * Requires: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load environment variables
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  for (const line of envContent.split('\n')) {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length) {
      process.env[key.trim()] = valueParts.join('=').trim();
    }
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://diwkdydpjakvwmzyijrk.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseKey) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY');
  console.error('');
  console.error('Get it from: https://supabase.com/dashboard/project/diwkdydpjakvwmzyijrk/settings/api');
  console.error('Then run: SUPABASE_SERVICE_ROLE_KEY=your-key node scripts/import-bigfoot-now.mjs');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('🦶 Bigfoot Data Import');
  console.log('='.repeat(50));

  const csvPath = '/tmp/bigfoot_bfro.csv';
  if (!fs.existsSync(csvPath)) {
    console.error(`CSV not found at ${csvPath}`);
    console.log('Download it with:');
    console.log('curl -L "https://raw.githubusercontent.com/timothyrenner/bigfoot-dash-app/main/data/bigfoot_bfro.csv" -o /tmp/bigfoot_bfro.csv');
    process.exit(1);
  }

  // Parse CSV
  const csv = fs.readFileSync(csvPath, 'utf8');
  const lines = csv.split('\n').slice(1);

  const records = [];
  for (const line of lines) {
    if (!line.trim()) continue;

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

    let weirdness = 5;
    if (classification === 'Class A') weirdness = 8;
    else if (classification === 'Class B') weirdness = 6;
    else if (classification === 'Class C') weirdness = 4;

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);

    if (isNaN(latitude) || isNaN(longitude)) continue;

    records.push({
      title: title.substring(0, 500),
      investigation_type: 'bigfoot',
      tier: 'exploratory',
      triage_score: weirdness,
      triage_status: 'verified',
      weirdness_score: weirdness,
      raw_data: {
        classification: {
          class: classification.replace('Class ', ''),
          class_description: classification === 'Class A' ? 'Clear sighting' :
                            classification === 'Class B' ? 'Possible/obscured' : 'Secondhand'
        },
        location: { lat: latitude, lng: longitude },
        report_metadata: { source: 'BFRO', report_number: number }
      },
      created_at: timestamp
    });
  }

  console.log(`Parsed ${records.length} records from CSV`);

  // Check existing count
  const { count: existingCount } = await supabase
    .from('aletheia_investigations')
    .select('*', { count: 'exact', head: true })
    .eq('investigation_type', 'bigfoot');

  console.log(`Existing Bigfoot records: ${existingCount}`);

  if (existingCount > 0) {
    console.log('Clearing existing records...');
    await supabase
      .from('aletheia_investigations')
      .delete()
      .eq('investigation_type', 'bigfoot');
  }

  // Import in batches
  const batchSize = 100;
  let imported = 0;

  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);

    const { error } = await supabase
      .from('aletheia_investigations')
      .insert(batch);

    if (error) {
      console.error(`Batch ${Math.floor(i / batchSize) + 1} error:`, error.message);
    } else {
      imported += batch.length;
      process.stdout.write(`\rImported ${imported}/${records.length} records...`);
    }
  }

  console.log(`\n\n✅ Import complete! ${imported} Bigfoot sightings imported.`);

  // Verify
  const { count: finalCount } = await supabase
    .from('aletheia_investigations')
    .select('*', { count: 'exact', head: true })
    .eq('investigation_type', 'bigfoot');

  console.log(`Final Bigfoot count: ${finalCount}`);
}

main().catch(console.error);
