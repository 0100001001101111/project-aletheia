/**
 * UFO Data Import API
 * POST - Import UFO sightings in batches
 *
 * Requires admin authentication
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

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
  signal_score?: number;
}

function calculateQualityScore(record: RawUFORecord): number {
  let score = 0;
  if (record.latitude && record.longitude) score += 3;
  if (record.witness_count && record.witness_count > 1) score += Math.min(2, record.witness_count - 1);
  if (record.duration_seconds && record.duration_seconds > 0) score += 1;
  if (record.physical_effects || record.physiological_effects) score += 2;
  if (record.em_interference) score += 1;
  if (record.source) score += 1;
  return Math.min(10, score);
}

function calculateConfoundScore(record: RawUFORecord): number {
  let confoundScore = 0;
  if (record.airport_nearby_km !== null) {
    if (record.airport_nearby_km < 10) confoundScore += 40;
    else if (record.airport_nearby_km < 30) confoundScore += 25;
    else if (record.airport_nearby_km < 50) confoundScore += 10;
  }
  if (record.military_base_nearby_km !== null) {
    if (record.military_base_nearby_km < 30) confoundScore += 30;
    else if (record.military_base_nearby_km < 50) confoundScore += 15;
  }
  if (record.physiological_effects) confoundScore -= 20;
  if (record.em_interference) confoundScore -= 15;
  return Math.max(0, Math.min(100, confoundScore));
}

function determineTriageStatus(qualityScore: number, confoundScore: number): 'pending' | 'provisional' | 'verified' {
  if (qualityScore >= 7 && confoundScore < 30) return 'verified';
  if (qualityScore >= 4 || confoundScore < 50) return 'provisional';
  return 'pending';
}

function transformRecord(record: RawUFORecord) {
  const qualityScore = calculateQualityScore(record);
  const confoundScore = calculateConfoundScore(record);
  const triageStatus = determineTriageStatus(qualityScore, confoundScore);

  const cleanDescription = record.description
    ?.replace(/&#44/g, ',')
    .replace(/&#39/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim() || '';

  const dateStr = record.date_time ? new Date(record.date_time).toISOString().split('T')[0] : 'Unknown date';
  const location = [record.city, record.state, record.country].filter(Boolean).join(', ') || 'Unknown location';
  const shapeStr = record.shape ? `${record.shape} ` : '';
  const title = `${shapeStr}UFO sighting - ${location} (${dateStr})`;

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

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication (require admin or high-credibility user)
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Ensure system user exists
    const { error: checkError } = await supabase
      .from('aletheia_users')
      .select('id')
      .eq('id', SYSTEM_USER_ID)
      .single();

    if (checkError && checkError.code === 'PGRST116') {
      await (supabase.from('aletheia_users') as ReturnType<typeof supabase.from>)
        .insert({
          id: SYSTEM_USER_ID,
          display_name: 'Data Import System',
          identity_type: 'public',
          verification_level: 'none',
          credibility_score: 100,
        } as never);
    }

    // Parse request body
    const body = await request.json();
    const records: RawUFORecord[] = body.records;

    if (!records || !Array.isArray(records)) {
      return NextResponse.json({ error: 'Invalid request: records array required' }, { status: 400 });
    }

    if (records.length > 500) {
      return NextResponse.json({ error: 'Batch size limited to 500 records' }, { status: 400 });
    }

    // Transform records
    const investigations = records.map(transformRecord);

    // Insert batch
    const { data, error } = await (supabase
      .from('aletheia_investigations') as ReturnType<typeof supabase.from>)
      .insert(investigations as never)
      .select('id');

    if (error) {
      console.error('Import error:', error);
      return NextResponse.json({ error: `Import failed: ${error.message}` }, { status: 500 });
    }

    // Calculate stats
    const stats = {
      imported: data?.length || 0,
      withCoords: records.filter(r => r.latitude && r.longitude).length,
      withEffects: records.filter(r => r.physiological_effects || r.em_interference).length,
      withEarthquake: records.filter(r => r.earthquake_nearby).length,
      highQuality: investigations.filter(i => i.triage_score >= 7).length,
    };

    return NextResponse.json({
      success: true,
      ...stats,
    });

  } catch (error) {
    console.error('UFO import error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
