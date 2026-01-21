#!/usr/bin/env node
/**
 * Import Exploratory Data (Haunted Places, Crop Circles)
 * Run: SUPABASE_SERVICE_ROLE_KEY=xxx node scripts/import-exploratory-data.mjs
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
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

function parseCSV(content) {
  const lines = content.split('\n');
  const headers = parseCSVLine(lines[0]);
  const records = [];

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const values = parseCSVLine(lines[i]);
    const record = {};
    headers.forEach((h, idx) => {
      record[h] = values[idx] || '';
    });
    records.push(record);
  }
  return records;
}

function parseCSVLine(line) {
  const fields = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      fields.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  fields.push(current.trim());
  return fields;
}

async function importHauntedPlaces() {
  console.log('\n👻 Importing Haunted Places...');

  const csvPath = '/tmp/haunted_places.csv';
  if (!fs.existsSync(csvPath)) {
    console.log('Haunted places CSV not found at /tmp/haunted_places.csv');
    return 0;
  }

  const csv = fs.readFileSync(csvPath, 'utf8');
  const data = parseCSV(csv);

  const records = [];
  for (const row of data) {
    const lat = parseFloat(row.latitude);
    const lng = parseFloat(row.longitude);

    if (isNaN(lat) || isNaN(lng)) continue;

    // Calculate weirdness based on description length and keywords
    let weirdness = 5;
    const desc = (row.description || '').toLowerCase();
    if (desc.includes('death') || desc.includes('murder') || desc.includes('killed')) weirdness += 1;
    if (desc.includes('apparition') || desc.includes('ghost') || desc.includes('spirit')) weirdness += 1;
    if (desc.includes('poltergeist') || desc.includes('possession')) weirdness += 2;
    if (desc.length > 500) weirdness += 1;
    weirdness = Math.min(10, weirdness);

    records.push({
      title: `${row.location || row.city}, ${row.state_abbrev} - Haunted Location`.substring(0, 500),
      description: (row.description || '').substring(0, 2000),
      investigation_type: 'haunting',
      tier: 'exploratory',
      triage_score: weirdness,
      triage_status: 'verified',
      weirdness_score: weirdness,
      raw_data: {
        location: {
          lat,
          lng,
          city: row.city,
          state: row.state,
          state_abbrev: row.state_abbrev,
          country: row.country
        },
        source: 'Shadowlands Haunted Places Index'
      }
    });
  }

  console.log(`Parsed ${records.length} haunted places`);

  // Clear existing
  await supabase.from('aletheia_investigations').delete().eq('investigation_type', 'haunting');

  // Import in batches
  const batchSize = 100;
  let imported = 0;

  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    const { error } = await supabase.from('aletheia_investigations').insert(batch);

    if (error) {
      console.error(`Batch error:`, error.message);
    } else {
      imported += batch.length;
      process.stdout.write(`\rImported ${imported}/${records.length}...`);
    }
  }

  console.log(`\n✅ Haunted Places: ${imported} records imported`);
  return imported;
}

async function importCropCircles() {
  console.log('\n🌾 Importing Crop Circles...');

  const csvPath = '/tmp/CropCircles.csv';
  if (!fs.existsSync(csvPath)) {
    console.log('Crop circles CSV not found at /tmp/CropCircles.csv');
    return 0;
  }

  const csv = fs.readFileSync(csvPath, 'utf8');
  const data = parseCSV(csv);

  const records = [];
  for (const row of data) {
    const lat = parseFloat(row.Latitude);
    const lng = parseFloat(row.Longitude);

    if (isNaN(lat) || isNaN(lng)) continue;

    // Weirdness based on location and recency
    let weirdness = 6;
    if (row.Country === 'England') weirdness += 1; // Wiltshire hotspot
    if (parseInt(row.Year) >= 2020) weirdness += 1;

    const dateStr = `${row.Year}-${String(row.Month).padStart(2, '0')}-${String(row.Day).padStart(2, '0')}`;

    records.push({
      title: `Crop Circle - ${row.Locate}, ${row.Country} (${row.Year})`.substring(0, 500),
      investigation_type: 'crop_circle',
      tier: 'exploratory',
      triage_score: weirdness,
      triage_status: 'verified',
      weirdness_score: weirdness,
      raw_data: {
        location: {
          lat,
          lng,
          name: row.Locate,
          country: row.Country
        },
        date: {
          year: parseInt(row.Year),
          month: parseInt(row.Month),
          day: parseInt(row.Day)
        },
        source_url: row.Link,
        image_url: row.Image,
        source: 'Crop Circle Connector'
      },
      created_at: `${dateStr}T12:00:00Z`
    });
  }

  console.log(`Parsed ${records.length} crop circles`);

  // Clear existing
  await supabase.from('aletheia_investigations').delete().eq('investigation_type', 'crop_circle');

  // Import in batches
  const batchSize = 50;
  let imported = 0;

  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    const { error } = await supabase.from('aletheia_investigations').insert(batch);

    if (error) {
      console.error(`Batch error:`, error.message);
    } else {
      imported += batch.length;
    }
  }

  console.log(`✅ Crop Circles: ${imported} records imported`);
  return imported;
}

async function main() {
  console.log('🔮 Exploratory Data Import');
  console.log('='.repeat(50));

  const haunted = await importHauntedPlaces();
  const circles = await importCropCircles();

  console.log('\n' + '='.repeat(50));
  console.log(`Total imported: ${haunted + circles} records`);

  // Verify
  const { data } = await supabase
    .from('aletheia_investigations')
    .select('investigation_type')
    .in('investigation_type', ['haunting', 'crop_circle']);

  const counts = {};
  data?.forEach(r => {
    counts[r.investigation_type] = (counts[r.investigation_type] || 0) + 1;
  });
  console.log('Final counts:', counts);
}

main().catch(console.error);
