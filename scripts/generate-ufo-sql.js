#!/usr/bin/env node
/**
 * Generate UFO SQL insert batches for MCP execution
 * Outputs SQL statements to stdout, 20 records per batch
 */

const fs = require('fs');
const path = require('path');

const INPUT_FILE = path.join(process.env.HOME, 'Desktop/ufo-data-prep/outputs/ufo_sightings_enriched.json');
const BATCH_SIZE = 20;
const MAX_RECORDS = 5000;
const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000000';

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
    .replace(/'/g, "''")
    .replace(/&#44/g, ',')
    .replace(/&#39/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
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

  return { title, desc, rawData, triageScore, status };
}

// Main
console.error('Loading data...');
const records = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf-8'));
console.error(`Total records: ${records.length}`);

// Filter tier 1 (coords + LST)
const tier1 = records.filter(r => r.latitude && r.longitude && r.local_sidereal_time);
console.error(`Tier 1 (coords + LST): ${tier1.length}`);

// Filter high signal
const highSignal = tier1.filter(r =>
  r.physiological_effects ||
  r.em_interference ||
  r.earthquake_nearby ||
  (r.witness_count && r.witness_count > 1)
);
console.error(`High signal: ${highSignal.length}`);

// Sort by quality and take top N
highSignal.sort((a, b) => qualityScore(b) - qualityScore(a));
const selected = highSignal.slice(0, MAX_RECORDS);
console.error(`Selected: ${selected.length}`);

// Output batch files
const outputDir = '/tmp/ufo_small_batches';
fs.mkdirSync(outputDir, { recursive: true });

let batchNum = 0;
for (let i = 0; i < selected.length; i += BATCH_SIZE) {
  batchNum++;
  const batch = selected.slice(i, i + BATCH_SIZE);

  const values = batch.map(r => {
    const t = transformRecord(r);
    const rawJson = JSON.stringify(t.rawData).replace(/'/g, "''");
    return `('${SYSTEM_USER_ID}','ufo','${t.title}','${t.desc}','${rawJson}'::jsonb,${t.triageScore},'${t.status}','Batch import')`;
  }).join(',\n');

  const sql = `INSERT INTO aletheia_investigations (user_id,investigation_type,title,description,raw_data,triage_score,triage_status,triage_notes) VALUES\n${values};`;

  const filename = `batch_${String(batchNum).padStart(3, '0')}.sql`;
  fs.writeFileSync(path.join(outputDir, filename), sql);
}

console.error(`Generated ${batchNum} batch files in ${outputDir}`);
