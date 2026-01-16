/**
 * UFO Data Import Script
 * Imports UFO sightings from enriched JSON into Aletheia
 *
 * Usage: npx ts-node scripts/import-ufo-data.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Import configuration
const BATCH_SIZE = 500;
const INPUT_FILE = path.join(process.env.HOME!, 'Desktop/ufo-data-prep/outputs/ufo_sightings_enriched.json');

// System user ID for bulk imports
const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000000';

interface RawUFORecord {
  date_time: string | null;
  local_sidereal_time: number | null;
  city: string | null;
  state: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  duration_seconds: number | null;
  shape: string | null;
  witness_count: number | null;
  physical_effects: boolean;
  physical_effects_desc: string | null;
  physiological_effects: boolean;
  physiological_effects_desc: string | null;
  em_interference: boolean;
  em_interference_desc: string | null;
  description: string | null;
  source: string | null;
  source_id: string | null;
  nearest_fault_line_km: number | null;
  bedrock_type: string | null;
  piezoelectric_bedrock: boolean;
  population_density: number | null;
  military_base_nearby_km: number | null;
  airport_nearby_km: number | null;
  earthquake_nearby: boolean;
  earthquake_count: number | null;
  max_magnitude: number | null;
  kp_index: number | null;
  kp_max: number | null;
  geomagnetic_storm: boolean;
  weather_conditions: string | null;
}

/**
 * Calculate quality score for UFO sighting
 */
function calculateQualityScore(record: RawUFORecord): number {
  let score = 0;

  // Has coordinates (+3)
  if (record.latitude && record.longitude) {
    score += 3;
  }

  // Multiple witnesses (+2)
  if (record.witness_count && record.witness_count > 1) {
    score += Math.min(2, record.witness_count - 1);
  }

  // Duration captured (+1)
  if (record.duration_seconds && record.duration_seconds > 0) {
    score += 1;
  }

  // Physical/physiological effects (+2)
  if (record.physical_effects || record.physiological_effects) {
    score += 2;
  }

  // EM interference (+1)
  if (record.em_interference) {
    score += 1;
  }

  // Known source (+1)
  if (record.source) {
    score += 1;
  }

  return Math.min(10, score);
}

/**
 * Calculate confound score (likelihood of conventional explanation)
 */
function calculateConfoundScore(record: RawUFORecord): number {
  let confoundScore = 0;

  // Near airport
  if (record.airport_nearby_km !== null) {
    if (record.airport_nearby_km < 10) {
      confoundScore += 40;
    } else if (record.airport_nearby_km < 30) {
      confoundScore += 25;
    } else if (record.airport_nearby_km < 50) {
      confoundScore += 10;
    }
  }

  // Near military base
  if (record.military_base_nearby_km !== null) {
    if (record.military_base_nearby_km < 30) {
      confoundScore += 30;
    } else if (record.military_base_nearby_km < 50) {
      confoundScore += 15;
    }
  }

  // Reduce confound if effects reported
  if (record.physiological_effects) {
    confoundScore -= 20;
  }
  if (record.em_interference) {
    confoundScore -= 15;
  }

  return Math.max(0, Math.min(100, confoundScore));
}

/**
 * Determine triage status based on quality and confound scores
 */
function determineTriageStatus(qualityScore: number, confoundScore: number): 'pending' | 'provisional' | 'verified' {
  // High quality + low confound = verified
  if (qualityScore >= 7 && confoundScore < 30) {
    return 'verified';
  }
  // Medium quality OR high confound = provisional
  if (qualityScore >= 4 || confoundScore < 50) {
    return 'provisional';
  }
  return 'pending';
}

/**
 * Transform raw UFO record to investigation format
 */
function transformRecord(record: RawUFORecord, index: number) {
  const qualityScore = calculateQualityScore(record);
  const confoundScore = calculateConfoundScore(record);
  const triageStatus = determineTriageStatus(qualityScore, confoundScore);

  // Clean description (remove HTML entities)
  const cleanDescription = record.description
    ?.replace(/&#44/g, ',')
    .replace(/&#39/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim() || '';

  // Generate title
  const dateStr = record.date_time ? new Date(record.date_time).toISOString().split('T')[0] : 'Unknown date';
  const location = [record.city, record.state, record.country].filter(Boolean).join(', ') || 'Unknown location';
  const shapeStr = record.shape ? `${record.shape} ` : '';
  const title = `${shapeStr}UFO sighting - ${location} (${dateStr})`;

  // Create raw_data object matching our schema
  const rawData = {
    date_time: record.date_time,
    local_sidereal_time: record.local_sidereal_time,
    duration_seconds: record.duration_seconds,
    shape: record.shape,
    witness_count: record.witness_count,
    description: cleanDescription,
    location: {
      city: record.city,
      state: record.state,
      country: record.country,
      latitude: record.latitude,
      longitude: record.longitude,
    },
    geophysical: {
      nearest_fault_line_km: record.nearest_fault_line_km,
      bedrock_type: record.bedrock_type,
      piezoelectric_bedrock: record.piezoelectric_bedrock,
      earthquake_nearby: record.earthquake_nearby,
      earthquake_count: record.earthquake_count,
      max_magnitude: record.max_magnitude,
      population_density: record.population_density,
    },
    geomagnetic: {
      kp_index: record.kp_index,
      kp_max: record.kp_max,
      geomagnetic_storm: record.geomagnetic_storm,
    },
    confounds: {
      military_base_nearby_km: record.military_base_nearby_km,
      airport_nearby_km: record.airport_nearby_km,
      weather_conditions: record.weather_conditions,
    },
    effects: {
      physical_effects: record.physical_effects,
      physical_effects_desc: record.physical_effects_desc,
      physiological_effects: record.physiological_effects,
      physiological_effects_desc: record.physiological_effects_desc,
      em_interference: record.em_interference,
      em_interference_desc: record.em_interference_desc,
    },
    source: record.source,
    source_id: record.source_id,
    has_coordinates: !!(record.latitude && record.longitude),
    quality_score: qualityScore,
    confound_score: confoundScore,
  };

  return {
    user_id: SYSTEM_USER_ID,
    investigation_type: 'ufo' as const,
    title: title.substring(0, 255),
    description: cleanDescription.substring(0, 2000) || 'No description provided',
    raw_data: rawData,
    triage_score: qualityScore,
    triage_status: triageStatus,
    triage_notes: `Auto-imported from ${record.source || 'unknown source'}. Quality: ${qualityScore}/10, Confound: ${confoundScore}%`,
  };
}

/**
 * Ensure system user exists
 */
async function ensureSystemUser() {
  const { data, error } = await supabase
    .from('aletheia_users')
    .select('id')
    .eq('id', SYSTEM_USER_ID)
    .single();

  if (error && error.code === 'PGRST116') {
    // User doesn't exist, create it
    const { error: insertError } = await supabase
      .from('aletheia_users')
      .insert({
        id: SYSTEM_USER_ID,
        display_name: 'Data Import System',
        identity_type: 'public',
        verification_level: 'none',
        credibility_score: 100,
      });

    if (insertError) {
      console.error('Failed to create system user:', insertError);
      process.exit(1);
    }
    console.log('Created system user for imports');
  }
}

/**
 * Main import function
 */
async function importUFOData() {
  console.log('Starting UFO data import...');
  console.log(`Reading from: ${INPUT_FILE}`);

  // Ensure system user exists
  await ensureSystemUser();

  // Read and parse JSON file
  const rawData = fs.readFileSync(INPUT_FILE, 'utf-8');
  const records: RawUFORecord[] = JSON.parse(rawData);
  console.log(`Loaded ${records.length} records`);

  // Statistics
  let imported = 0;
  let failed = 0;
  let withCoords = 0;
  let withEffects = 0;
  let withEarthquake = 0;
  let highQuality = 0;

  // Process in batches
  const totalBatches = Math.ceil(records.length / BATCH_SIZE);

  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;

    // Transform batch
    const investigations = batch.map((record, idx) => {
      const inv = transformRecord(record, i + idx);

      // Update stats
      if (record.latitude && record.longitude) withCoords++;
      if (record.physiological_effects || record.em_interference) withEffects++;
      if (record.earthquake_nearby) withEarthquake++;
      if (inv.triage_score >= 7) highQuality++;

      return inv;
    });

    // Insert batch
    const { error } = await supabase
      .from('aletheia_investigations')
      .insert(investigations as never);

    if (error) {
      console.error(`Batch ${batchNum}/${totalBatches} failed:`, error.message);
      failed += batch.length;
    } else {
      imported += batch.length;
      process.stdout.write(`\rImported: ${imported}/${records.length} (${Math.round(imported/records.length*100)}%)`);
    }

    // Small delay to avoid overwhelming the database
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log('\n\n=== Import Complete ===');
  console.log(`Total records: ${records.length}`);
  console.log(`Imported: ${imported}`);
  console.log(`Failed: ${failed}`);
  console.log('\n=== Data Quality ===');
  console.log(`With coordinates: ${withCoords} (${Math.round(withCoords/records.length*100)}%)`);
  console.log(`With effects: ${withEffects} (${Math.round(withEffects/records.length*100)}%)`);
  console.log(`With earthquake correlation: ${withEarthquake} (${Math.round(withEarthquake/records.length*100)}%)`);
  console.log(`High quality (score >= 7): ${highQuality} (${Math.round(highQuality/records.length*100)}%)`);
}

// Run the import
importUFOData().catch(console.error);
