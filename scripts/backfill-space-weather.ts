/**
 * Space Weather Backfill Script
 *
 * Run with: npx ts-node scripts/backfill-space-weather.ts
 *
 * This script:
 * 1. Fetches historical Kp data from GFZ Potsdam (1932-present)
 * 2. Inserts it into the aletheia_space_weather table
 * 3. Enriches existing investigations with space weather context
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const envVars: Record<string, string> = {};
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length > 0) {
    envVars[key.trim()] = valueParts.join('=').trim();
  }
});

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = envVars.SUPABASE_SERVICE_ROLE_KEY || envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const GFZ_KP_URL = 'https://www-app3.gfz-potsdam.de/kp_index/Kp_ap_since_1932.txt';

interface KpRecord {
  timestamp: string;
  kp_index: number;
  ap_index: number;
  geomagnetic_storm: boolean;
  major_storm: boolean;
  severe_storm: boolean;
  data_source: string;
}

function parseGfzLine(line: string): KpRecord | null {
  if (line.startsWith('#') || line.trim() === '') {
    return null;
  }

  const parts = line.trim().split(/\s+/);
  if (parts.length < 9) {
    return null;
  }

  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);
  const hour = parseFloat(parts[3]);
  const kp = parseFloat(parts[7]);
  const ap = parseInt(parts[8], 10);

  // Skip invalid data
  if (kp < 0 || ap < 0 || isNaN(kp) || isNaN(ap)) {
    return null;
  }

  const timestamp = new Date(Date.UTC(year, month - 1, day, Math.floor(hour)));

  return {
    timestamp: timestamp.toISOString(),
    kp_index: kp,
    ap_index: ap,
    geomagnetic_storm: kp >= 5,
    major_storm: kp >= 7,
    severe_storm: kp >= 8,
    data_source: 'gfz_potsdam',
  };
}

async function backfillSpaceWeather() {
  console.log('Fetching GFZ Kp historical data...');

  const response = await fetch(GFZ_KP_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch: ${response.status}`);
  }

  const text = await response.text();
  const lines = text.split('\n');
  console.log(`Downloaded ${lines.length} lines`);

  // Parse all records
  const records: KpRecord[] = [];
  for (const line of lines) {
    const record = parseGfzLine(line);
    if (record) {
      records.push(record);
    }
  }
  console.log(`Parsed ${records.length} valid Kp records`);

  // Insert in batches
  const BATCH_SIZE = 1000;
  let inserted = 0;
  let errors = 0;

  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);

    const { error } = await supabase
      .from('aletheia_space_weather')
      .upsert(batch, { onConflict: 'timestamp' });

    if (error) {
      console.error(`Batch ${Math.floor(i / BATCH_SIZE)} error:`, error.message);
      errors++;
    } else {
      inserted += batch.length;
    }

    if (i % 10000 === 0) {
      console.log(`Progress: ${i}/${records.length} (${Math.round(i / records.length * 100)}%)`);
    }
  }

  console.log(`\nSpace weather backfill complete:`);
  console.log(`  Inserted: ${inserted}`);
  console.log(`  Errors: ${errors}`);

  return { inserted, errors };
}

async function enrichInvestigations() {
  console.log('\nEnriching investigations with space weather data...');

  // Get count of investigations needing enrichment
  const { count } = await supabase
    .from('aletheia_investigations')
    .select('id', { count: 'exact', head: true })
    .is('kp_at_event', null);

  console.log(`Found ${count} investigations to enrich`);

  if (!count || count === 0) {
    console.log('No investigations to enrich');
    return;
  }

  const BATCH_SIZE = 100;
  let processed = 0;
  let enriched = 0;
  let noMatch = 0;

  while (processed < count) {
    // Fetch batch of investigations
    const { data: investigations, error: fetchError } = await supabase
      .from('aletheia_investigations')
      .select('id, raw_data')
      .is('kp_at_event', null)
      .order('created_at', { ascending: true })
      .range(0, BATCH_SIZE - 1);

    if (fetchError) {
      console.error('Fetch error:', fetchError.message);
      break;
    }

    if (!investigations || investigations.length === 0) {
      break;
    }

    for (const inv of investigations) {
      const rawData = inv.raw_data as Record<string, unknown>;
      const dateTimeStr = (rawData?.date_time || rawData?.event_date) as string;

      if (!dateTimeStr) {
        processed++;
        continue;
      }

      const eventTime = new Date(dateTimeStr);
      if (isNaN(eventTime.getTime())) {
        processed++;
        continue;
      }

      // Find closest Kp record within 3 hours
      const minTime = new Date(eventTime.getTime() - 3 * 60 * 60 * 1000);
      const maxTime = new Date(eventTime.getTime() + 3 * 60 * 60 * 1000);

      const { data: kpRecords } = await supabase
        .from('aletheia_space_weather')
        .select('timestamp, kp_index, ap_index, geomagnetic_storm, major_storm')
        .gte('timestamp', minTime.toISOString())
        .lte('timestamp', maxTime.toISOString())
        .order('timestamp', { ascending: true })
        .limit(5);

      if (!kpRecords || kpRecords.length === 0) {
        noMatch++;
        processed++;
        continue;
      }

      // Find closest
      let closest = kpRecords[0];
      let closestDiff = Math.abs(eventTime.getTime() - new Date(closest.timestamp).getTime());

      for (const record of kpRecords) {
        const diff = Math.abs(eventTime.getTime() - new Date(record.timestamp).getTime());
        if (diff < closestDiff) {
          closestDiff = diff;
          closest = record;
        }
      }

      // Build space weather context
      const conditions: string[] = [];
      if (closest.kp_index >= 8) conditions.push('severe_storm');
      else if (closest.kp_index >= 7) conditions.push('major_storm');
      else if (closest.kp_index >= 5) conditions.push('geomagnetic_storm');
      else if (closest.kp_index >= 4) conditions.push('elevated_kp');
      else if (closest.kp_index < 2) conditions.push('quiet');

      const spaceWeather = {
        kp_index: closest.kp_index,
        ap_index: closest.ap_index,
        conditions,
        recent_flares: [],
        recent_cme: null,
      };

      // Update investigation
      const { error: updateError } = await supabase
        .from('aletheia_investigations')
        .update({
          kp_at_event: closest.kp_index,
          during_geomagnetic_storm: closest.geomagnetic_storm,
          during_major_storm: closest.major_storm,
          space_weather: spaceWeather,
        })
        .eq('id', inv.id);

      if (!updateError) {
        enriched++;
      }
      processed++;
    }

    console.log(`Progress: ${processed}/${count} (${enriched} enriched, ${noMatch} no Kp match)`);
  }

  console.log(`\nEnrichment complete:`);
  console.log(`  Processed: ${processed}`);
  console.log(`  Enriched: ${enriched}`);
  console.log(`  No Kp match: ${noMatch}`);
}

async function main() {
  console.log('=== Space Weather Backfill ===\n');

  try {
    await backfillSpaceWeather();
    await enrichInvestigations();
    console.log('\n=== Complete ===');
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

main();
