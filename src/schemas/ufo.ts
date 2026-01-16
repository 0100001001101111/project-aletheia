/**
 * UFO/UAP Sighting Schema
 * For correlating aerial anomalies with geophysical and consciousness phenomena
 */

import { z } from 'zod';

// Shape categories from NUFORC/planetsig data
const ShapeSchema = z.enum([
  'circle', 'disk', 'sphere', 'oval', 'cylinder', 'cigar',
  'triangle', 'diamond', 'rectangle', 'chevron', 'cone',
  'light', 'fireball', 'flash', 'formation', 'changing',
  'other', 'unknown'
]).nullable();

// Location information
const LocationSchema = z.object({
  city: z.string().nullable(),
  state: z.string().nullable(),
  country: z.string().nullable(),
  latitude: z.number().min(-90).max(90).nullable(),
  longitude: z.number().min(-180).max(180).nullable(),
});

// Geophysical correlates (SPECTER integration)
const GeophysicalCorrelatesSchema = z.object({
  nearest_fault_line_km: z.number().nullable(),
  bedrock_type: z.string().nullable(),
  piezoelectric_bedrock: z.boolean().nullable(),
  earthquake_nearby: z.boolean().nullable(),
  earthquake_count: z.number().nullable(),
  max_magnitude: z.number().nullable(),
  population_density: z.number().nullable(),
});

// Geomagnetic data
const GeomagneticSchema = z.object({
  kp_index: z.number().min(0).max(9).nullable(),
  kp_max: z.number().min(0).max(9).nullable(),
  geomagnetic_storm: z.boolean().nullable(),
});

// Confound flags for conventional explanations
const ConfoundFlagsSchema = z.object({
  military_base_nearby_km: z.number().nullable(),
  airport_nearby_km: z.number().nullable(),
  weather_conditions: z.string().nullable(),
});

// Effects reported (for consciousness correlation)
const EffectsSchema = z.object({
  physical_effects: z.boolean().nullable(),
  physical_effects_desc: z.string().nullable(),
  physiological_effects: z.boolean().nullable(),
  physiological_effects_desc: z.string().nullable(),
  em_interference: z.boolean().nullable(),
  em_interference_desc: z.string().nullable(),
});

// Main UFO Schema
export const UFOSchema = z.object({
  // Core sighting data
  date_time: z.string().nullable(), // ISO datetime
  local_sidereal_time: z.number().nullable(), // For STARGATE correlation
  duration_seconds: z.number().nullable(),
  shape: ShapeSchema,
  witness_count: z.number().min(1).nullable(),
  description: z.string().nullable(),

  // Location
  location: LocationSchema.nullable(),

  // Geophysical correlates
  geophysical: GeophysicalCorrelatesSchema.nullable(),

  // Geomagnetic conditions
  geomagnetic: GeomagneticSchema.nullable(),

  // Confound flags
  confounds: ConfoundFlagsSchema.nullable(),

  // Effects (consciousness correlation)
  effects: EffectsSchema.nullable(),

  // Data quality
  source: z.enum(['nuforc', 'planetsig', 'corgis', 'mufon', 'other']).nullable(),
  source_id: z.string().nullable(),
  has_coordinates: z.boolean().nullable(),

  // Calculated quality indicators
  quality_score: z.number().min(0).max(10).nullable(),
  confound_score: z.number().min(0).max(100).nullable(), // Higher = more likely conventional
});

export type UFOData = z.infer<typeof UFOSchema>;

// Required fields for triage
export const UFO_REQUIRED_FIELDS = [
  'date_time',
  'location.latitude',
  'location.longitude',
] as const;

// Triage indicators for quality scoring
export const UFO_TRIAGE_INDICATORS = {
  source_integrity: [
    'source',
    'source_id',
    'witness_count',
    'has_coordinates',
  ],
  methodology: [
    'duration_seconds',
    'shape',
    'effects.physical_effects',
    'effects.physiological_effects',
  ],
  variable_capture: [
    'geophysical.earthquake_nearby',
    'geophysical.piezoelectric_bedrock',
    'geomagnetic.kp_index',
    'local_sidereal_time',
  ],
  data_quality: [
    'description',
    'location.latitude',
    'location.longitude',
    'date_time',
  ],
};

// Field descriptions for LLM parsing
export const UFO_FIELD_DESCRIPTIONS = {
  date_time: 'Date and time of sighting (ISO format)',
  local_sidereal_time: 'Local sidereal time (0-24) for STARGATE correlation',
  duration_seconds: 'Duration of sighting in seconds',
  shape: 'Shape of observed object: disk, sphere, triangle, light, etc.',
  witness_count: 'Number of witnesses',
  'location.latitude': 'Latitude of sighting location',
  'location.longitude': 'Longitude of sighting location',
  'geophysical.earthquake_nearby': 'Was there seismic activity within 7 days and 200km?',
  'geophysical.piezoelectric_bedrock': 'Is the bedrock piezoelectric (quartz, granite)?',
  'geomagnetic.kp_index': 'Kp index (0-9) at time of sighting',
  'geomagnetic.geomagnetic_storm': 'Was there a geomagnetic storm (Kp >= 5)?',
  'confounds.military_base_nearby_km': 'Distance to nearest military base (km)',
  'confounds.airport_nearby_km': 'Distance to nearest airport (km)',
  'effects.physiological_effects': 'Were physiological effects reported (nausea, paralysis, time loss)?',
  'effects.em_interference': 'Was electromagnetic interference reported (car stalled, radio static)?',
  source: 'Data source: nuforc, planetsig, corgis, mufon, other',
  quality_score: 'Overall data quality score (0-10)',
  confound_score: 'Likelihood of conventional explanation (0-100)',
};

/**
 * Calculate quality score for UFO sighting
 * Based on: coordinates, witness count, effects reported, duration
 */
export function calculateUFOQualityScore(data: UFOData): number {
  let score = 0;

  // Has coordinates (+3)
  if (data.location?.latitude && data.location?.longitude) {
    score += 3;
  }

  // Multiple witnesses (+2)
  if (data.witness_count && data.witness_count > 1) {
    score += Math.min(2, data.witness_count - 1);
  }

  // Duration captured (+1)
  if (data.duration_seconds && data.duration_seconds > 0) {
    score += 1;
  }

  // Physical/physiological effects (+2) - high signal probability
  if (data.effects?.physical_effects || data.effects?.physiological_effects) {
    score += 2;
  }

  // EM interference (+1) - high signal probability
  if (data.effects?.em_interference) {
    score += 1;
  }

  // Known source (+1)
  if (data.source) {
    score += 1;
  }

  return Math.min(10, score);
}

/**
 * Calculate confound score (likelihood of conventional explanation)
 * Higher = more likely conventional, lower = more anomalous
 */
export function calculateConfoundScore(data: UFOData): number {
  let confoundScore = 0;

  // Near airport (major confound)
  if (data.confounds?.airport_nearby_km !== null && data.confounds?.airport_nearby_km !== undefined) {
    if (data.confounds.airport_nearby_km < 10) {
      confoundScore += 40;
    } else if (data.confounds.airport_nearby_km < 30) {
      confoundScore += 25;
    } else if (data.confounds.airport_nearby_km < 50) {
      confoundScore += 10;
    }
  }

  // Near military base
  if (data.confounds?.military_base_nearby_km !== null && data.confounds?.military_base_nearby_km !== undefined) {
    if (data.confounds.military_base_nearby_km < 30) {
      confoundScore += 30;
    } else if (data.confounds.military_base_nearby_km < 50) {
      confoundScore += 15;
    }
  }

  // Reduce confound if effects reported (unlikely for conventional aircraft)
  if (data.effects?.physiological_effects) {
    confoundScore -= 20;
  }
  if (data.effects?.em_interference) {
    confoundScore -= 15;
  }

  return Math.max(0, Math.min(100, confoundScore));
}
