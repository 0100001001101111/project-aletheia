/**
 * UFO Batch Import via Supabase JS Client
 * Uses anon key with disabled RLS (or service key if available)
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const BATCH_SIZE = 50;
const MAX_RECORDS = 5000;
const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000000';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL or key');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function qualityScore(r) {
  let score = 0;
  if (r.physiological_effects) score += 3;
  if (r.em_interference) score += 3;
  if (r.earthquake_nearby) score += 2;
  if (r.geomagnetic_storm) score += 2;
  if (r.witness_count && r.witness_count > 1) score += Math.min(3, r.witness_count);
  if (r.duration_seconds && r.duration_seconds > 60) score += 1;
  if (r.shape && !['unknown', 'other', 'light'].includes(r.shape)) score += 1;
  return score;
}

function calcTriageScore(r) {
  let score = 0;
  if (r.latitude && r.longitude) score += 3;
  if (r.witness_count && r.witness_count > 1) score += Math.min(2, r.witness_count - 1);
  if (r.duration_seconds && r.duration_seconds > 0) score += 1;
  if (r.physical_effects || r.physiological_effects) score += 2;
  if (r.em_interference) score += 1;
  if (r.source) score += 1;
  return Math.min(10, score);
}

function calcConfoundScore(r) {
  let score = 0;
  if (r.airport_nearby_km != null) {
    if (r.airport_nearby_km < 10) score += 40;
    else if (r.airport_nearby_km < 30) score += 25;
    else if (r.airport_nearby_km < 50) score += 10;
  }
  if (r.military_base_nearby_km != null) {
    if (r.military_base_nearby_km < 30) score += 30;
    else if (r.military_base_nearby_km < 50) score += 15;
  }
  if (r.physiological_effects) score -= 20;
  if (r.em_interference) score -= 15;
  return Math.max(0, Math.min(100, score));
}

function cleanText(text, maxLen = 500) {
  if (!text) return '';
  return String(text)
    .replace(/\x00/g, '')
    .replace(/&#44/g, ',')
    .replace(/&#39/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim()
    .slice(0, maxLen);
}

function transformRecord(r) {
  const triageScore = calcTriageScore(r);
  const confoundScore = calcConfoundScore(r);

  let status;
  if (triageScore >= 7 && confoundScore < 30) status = 'verified';
  else if (triageScore >= 4 || confoundScore < 50) status = 'provisional';
  else status = 'pending';

  const dateStr = r.date_time ? r.date_time.slice(0, 10) : 'Unknown';
  const city = cleanText(r.city, 50) || 'Unknown';
  const state = cleanText(r.state, 20) || '';
  const shape = cleanText(r.shape, 20) || '';

  const title = `${shape ? shape + ' ' : ''}UFO - ${city}, ${state} (${dateStr})`.slice(0, 200);
  const desc = cleanText(r.description, 500) || 'UFO sighting report';

  const rawData = {
    date_time: r.date_time,
    local_sidereal_time: r.local_sidereal_time,
    shape: r.shape,
    witness_count: r.witness_count,
    location: {
      city: r.city,
      state: r.state,
      country: r.country,
      latitude: r.latitude,
      longitude: r.longitude,
    },
    geophysical: {
      earthquake_nearby: r.earthquake_nearby,
      piezoelectric_bedrock: r.piezoelectric_bedrock,
    },
    geomagnetic: {
      kp_index: r.kp_index,
      geomagnetic_storm: r.geomagnetic_storm,
    },
    effects: {
      physiological_effects: r.physiological_effects,
      em_interference: r.em_interference,
    },
    confounds: {
      airport_nearby_km: r.airport_nearby_km,
      military_base_nearby_km: r.military_base_nearby_km,
    },
    source: r.source,
  };

  return {
    user_id: SYSTEM_USER_ID,
    investigation_type: 'ufo',
    title,
    description: desc,
    raw_data: rawData,
    triage_score: triageScore,
    triage_status: status,
    triage_notes: 'Batch import',
  };
}

async function main() {
  const inputFile = join(process.env.HOME, 'Desktop/ufo-data-prep/outputs/ufo_sightings_enriched.json');
  console.log('Loading data from', inputFile);

  const records = JSON.parse(readFileSync(inputFile, 'utf-8'));
  console.log(`Total records: ${records.length}`);

  // Filter tier 1 (coords + LST)
  const tier1 = records.filter(r => r.latitude && r.longitude && r.local_sidereal_time);
  console.log(`Tier 1 (coords + LST): ${tier1.length}`);

  // Filter high signal
  const highSignal = tier1.filter(r =>
    r.physiological_effects ||
    r.em_interference ||
    r.earthquake_nearby ||
    (r.witness_count && r.witness_count > 1)
  );
  console.log(`High signal: ${highSignal.length}`);

  // Sort by quality and take top N
  highSignal.sort((a, b) => qualityScore(b) - qualityScore(a));
  const selected = highSignal.slice(0, MAX_RECORDS);
  console.log(`Selected: ${selected.length}`);

  // Transform records
  const investigations = selected.map(transformRecord);

  // Import in batches
  let imported = 0;
  let failed = 0;

  for (let i = 0; i < investigations.length; i += BATCH_SIZE) {
    const batch = investigations.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(investigations.length / BATCH_SIZE);

    try {
      const { error } = await supabase
        .from('aletheia_investigations')
        .insert(batch);

      if (error) {
        console.error(`Batch ${batchNum}/${totalBatches}: FAILED - ${error.message}`);
        failed += batch.length;
      } else {
        imported += batch.length;
        process.stdout.write(`\rImported: ${imported}/${investigations.length} (${Math.round(imported/investigations.length*100)}%)`);
      }
    } catch (e) {
      console.error(`Batch ${batchNum}/${totalBatches}: ERROR - ${e.message}`);
      failed += batch.length;
    }

    // Small delay
    await new Promise(r => setTimeout(r, 100));
  }

  console.log('\n\n=== Import Complete ===');
  console.log(`Imported: ${imported}`);
  console.log(`Failed: ${failed}`);
}

main().catch(console.error);
