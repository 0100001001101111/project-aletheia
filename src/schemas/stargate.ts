/**
 * Remote Viewing (Stargate) Schema
 * Based on Stargate_Schema_v1
 */

import { z } from 'zod';

// Target information
const TargetSchema = z.object({
  type: z.enum(['geographical_location', 'event', 'object', 'person', 'document', 'other']).nullable(),
  coordinates: z.string().nullable(), // Coordinate Remote Viewing format
  feedback_provided: z.boolean().nullable(),
  target_cued: z.boolean().nullable(), // Was viewer given any cue about target type?
  target_description_post_session: z.string().nullable(), // Actual target description
  target_images_available: z.boolean().nullable(),
});

// Protocol information
const ProtocolSchema = z.object({
  type: z.enum(['crv', 'erv', 'srv', 'arv', 'grv', 'other']).nullable(), // CRV, ERV, SRV, ARV, etc.
  version: z.string().nullable(),
  organization: z.string().nullable(), // e.g., SRI, SAIC, independent
  blind_level: z.enum(['single', 'double', 'triple']).nullable(),
  frontloading: z.string().nullable(), // Any information given to viewer beforehand
  monitor_present: z.boolean().nullable(),
  monitor_blind: z.boolean().nullable(),
});

// Viewer profile
const ViewerProfileSchema = z.object({
  id: z.string().nullable(), // Anonymized
  training_background: z.enum(['military', 'civilian_trained', 'natural', 'self_taught']).nullable(),
  experience_years: z.number().min(0).nullable(),
  total_sessions: z.number().min(0).nullable(),
  historical_accuracy: z.number().min(0).max(100).nullable(), // Percentage if known
  psi_belief: z.number().min(1).max(7).nullable(),
});

// Session data
const SessionDataSchema = z.object({
  date: z.string().nullable(),
  start_time: z.string().nullable(),
  duration_minutes: z.number().min(0).nullable(),
  session_id: z.string().nullable(),
  ideograms_produced: z.number().min(0).nullable(), // For CRV
  sketches_produced: z.number().min(0).nullable(),
  pages_of_data: z.number().min(0).nullable(),
});

// Viewer impressions
const ImpressionsSchema = z.object({
  sensory: z.object({
    visual: z.array(z.string()).nullable(),
    auditory: z.array(z.string()).nullable(),
    kinesthetic: z.array(z.string()).nullable(),
    olfactory: z.array(z.string()).nullable(),
    gustatory: z.array(z.string()).nullable(),
    emotional: z.array(z.string()).nullable(),
  }).nullable(),
  dimensional: z.object({
    size: z.string().nullable(),
    shape: z.string().nullable(),
    color: z.string().nullable(),
    texture: z.string().nullable(),
    temperature: z.string().nullable(),
  }).nullable(),
  analytical_overlay: z.array(z.string()).nullable(), // AOL noted by viewer
  summary_description: z.string().nullable(),
});

// Evaluation results
const EvaluationSchema = z.object({
  judge_count: z.number().min(1).nullable(),
  judges_blind: z.boolean().nullable(),
  scoring_method: z.enum(['binary', 'rating_scale', 'ranking', 'sum_of_ranks', 'fuzzy_set']).nullable(),
  correspondence_score: z.number().nullable(), // Raw score
  score_scale_max: z.number().nullable(), // e.g., 7 for 1-7 scale
  hit_miss: z.enum(['hit', 'miss', 'partial']).nullable(),
  statistical_rank: z.number().nullable(), // Where target ranked among decoys
  decoy_pool_size: z.number().nullable(),
  effect_size: z.number().nullable(), // If calculated
});

// Sketch analysis
const SketchAnalysisSchema = z.object({
  sketches_available: z.boolean().nullable(),
  primary_elements_match: z.number().min(0).max(100).nullable(), // Percentage
  gestalt_match: z.boolean().nullable(),
  specific_details_match: z.array(z.string()).nullable(),
});

// Environmental factors
const EnvironmentSchema = z.object({
  local_sidereal_time: z.string().nullable(),
  geomagnetic_kp: z.number().min(0).max(9).nullable(),
  solar_activity: z.enum(['low', 'moderate', 'high']).nullable(),
  viewer_location: z.string().nullable(),
  target_distance_miles: z.number().nullable(),
  time_displacement: z.enum(['present', 'past', 'future']).nullable(),
  time_offset_days: z.number().nullable(), // For past/future targets
});

// Main Stargate Schema
export const StargateSchema = z.object({
  // Metadata
  session_date: z.string().nullable(),
  study_reference: z.string().nullable(),
  operational_vs_research: z.enum(['operational', 'research', 'training']).nullable(),

  // Core data
  target: TargetSchema.nullable(),
  protocol: ProtocolSchema.nullable(),
  viewer: ViewerProfileSchema.nullable(),
  session: SessionDataSchema.nullable(),
  impressions: ImpressionsSchema.nullable(),
  evaluation: EvaluationSchema.nullable(),
  sketch_analysis: SketchAnalysisSchema.nullable(),
  environment: EnvironmentSchema.nullable(),

  // Raw data
  session_transcript: z.string().nullable(),
  raw_session_data: z.string().nullable(), // Unprocessed viewer notes

  // Additional
  researcher_notes: z.string().nullable(),
});

export type StargateData = z.infer<typeof StargateSchema>;

// Required fields
export const STARGATE_REQUIRED_FIELDS = [
  'session_date',
  'target.type',
  'protocol.type',
  'evaluation.hit_miss',
] as const;

// Triage indicators
export const STARGATE_TRIAGE_INDICATORS = {
  source_integrity: [
    'study_reference',
    'session.session_id',
    'protocol.organization',
  ],
  methodology: [
    'protocol.blind_level',
    'protocol.monitor_blind',
    'evaluation.judges_blind',
    'evaluation.scoring_method',
  ],
  variable_capture: [
    'viewer.experience_years',
    'viewer.historical_accuracy',
    'environment.geomagnetic_kp',
    'environment.local_sidereal_time',
  ],
  data_quality: [
    'session_transcript',
    'sketch_analysis.sketches_available',
    'evaluation.decoy_pool_size',
  ],
};

// Field descriptions for LLM parsing
export const STARGATE_FIELD_DESCRIPTIONS = {
  session_date: 'Date of remote viewing session (YYYY-MM-DD)',
  'target.type': 'Target type: geographical_location, event, object, person, document',
  'target.coordinates': 'Coordinate code used (if CRV protocol)',
  'protocol.type': 'Protocol type: crv (Coordinate RV), erv (Extended RV), srv, arv, grv',
  'protocol.blind_level': 'Blinding level: single, double, or triple blind',
  'viewer.training_background': 'Viewer training: military, civilian_trained, natural, self_taught',
  'viewer.experience_years': 'Years of remote viewing experience',
  'evaluation.correspondence_score': 'Judge-assigned correspondence score',
  'evaluation.hit_miss': 'Overall result: hit, miss, or partial',
  'evaluation.statistical_rank': 'Where target ranked among decoys (1 = first)',
  'impressions.summary_description': 'Viewer summary of perceived target',
  session_transcript: 'Full transcript of session data/impressions',
};
