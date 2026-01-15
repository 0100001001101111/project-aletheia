/**
 * Ganzfeld Experiment Schema
 * Based on Ganzfeld_Schema_v1
 */

import { z } from 'zod';

// Target information
const TargetSchema = z.object({
  type: z.enum(['static_image', 'dynamic_video', 'audio', 'object', 'location']).nullable(),
  pool_size: z.number().min(2).nullable(), // Number of decoys + target
  selection_method: z.enum(['random', 'pseudo_random', 'predetermined']).nullable(),
  description: z.string().nullable(), // Brief description (not identifying)
  category: z.string().nullable(), // e.g., "nature", "urban", "people"
});

// Session protocol
const ProtocolSchema = z.object({
  version: z.string().nullable(), // Protocol version identifier
  laboratory: z.string().nullable(),
  automated: z.boolean().nullable(), // Auto-ganzfeld?
  sender_present: z.boolean().nullable(), // Some protocols are receiver-only
  sensory_isolation: z.object({
    visual: z.boolean().nullable(), // Red light + ping pong balls
    auditory: z.boolean().nullable(), // White/pink noise
    duration_minutes: z.number().min(0).nullable(),
  }).nullable(),
  judging_method: z.enum(['binary', 'ranking', 'rating_scale']).nullable(),
  double_blind: z.boolean().nullable(),
});

// Sender profile
const SenderProfileSchema = z.object({
  id: z.string().nullable(), // Anonymized ID
  experience_level: z.enum(['novice', 'intermediate', 'experienced']).nullable(),
  relationship_to_receiver: z.enum(['stranger', 'acquaintance', 'friend', 'family']).nullable(),
  prior_sessions: z.number().min(0).nullable(),
  psi_belief: z.number().min(1).max(7).nullable(), // 1-7 scale
});

// Receiver profile
const ReceiverProfileSchema = z.object({
  id: z.string().nullable(),
  experience_level: z.enum(['novice', 'intermediate', 'experienced']).nullable(),
  prior_sessions: z.number().min(0).nullable(),
  psi_belief: z.number().min(1).max(7).nullable(),
  dream_recall_frequency: z.enum(['never', 'rarely', 'sometimes', 'often', 'always']).nullable(),
  meditation_practice: z.boolean().nullable(),
  hypnotic_susceptibility: z.number().min(0).max(12).nullable(), // Stanford scale
  openness_to_experience: z.number().min(1).max(5).nullable(), // Big Five factor
});

// Session results
const ResultsSchema = z.object({
  hit: z.boolean(), // Primary outcome - did receiver select target?
  ranking: z.number().min(1).nullable(), // If ranking method, where was target ranked?
  confidence_rating: z.number().min(0).max(100).nullable(), // Receiver's confidence
  mentation_quality: z.enum(['poor', 'fair', 'good', 'excellent']).nullable(),
  correspondence_notes: z.string().nullable(), // How mentation matched target
  imagery_type: z.enum(['visual', 'auditory', 'kinesthetic', 'emotional', 'mixed']).nullable(),
});

// Environmental factors
const EnvironmentSchema = z.object({
  local_sidereal_time: z.string().nullable(), // LST at session start
  geomagnetic_activity_kp: z.number().min(0).max(9).nullable(),
  lunar_phase: z.enum(['new', 'waxing_crescent', 'first_quarter', 'waxing_gibbous', 'full', 'waning_gibbous', 'third_quarter', 'waning_crescent']).nullable(),
  time_of_day: z.enum(['morning', 'afternoon', 'evening', 'night']).nullable(),
});

// Main Ganzfeld Schema
export const GanzfeldSchema = z.object({
  // Metadata
  session_date: z.string().nullable(),
  session_id: z.string().nullable(),
  study_id: z.string().nullable(),

  // Core data
  target: TargetSchema.nullable(),
  protocol: ProtocolSchema.nullable(),
  sender: SenderProfileSchema.nullable(),
  receiver: ReceiverProfileSchema.nullable(),
  results: ResultsSchema,
  environment: EnvironmentSchema.nullable(),

  // Mentation transcript
  mentation_transcript: z.string().nullable(),

  // Additional notes
  anomalies_noted: z.string().nullable(),
  researcher_notes: z.string().nullable(),
});

export type GanzfeldData = z.infer<typeof GanzfeldSchema>;

// Required fields
export const GANZFELD_REQUIRED_FIELDS = [
  'session_date',
  'results.hit',
  'target.pool_size',
  'protocol.version',
] as const;

// Triage indicators
export const GANZFELD_TRIAGE_INDICATORS = {
  source_integrity: [
    'session_id',
    'study_id',
    'protocol.laboratory',
  ],
  methodology: [
    'protocol.automated',
    'protocol.double_blind',
    'protocol.judging_method',
    'target.selection_method',
  ],
  variable_capture: [
    'receiver.experience_level',
    'receiver.psi_belief',
    'receiver.openness_to_experience',
    'sender.relationship_to_receiver',
  ],
  data_quality: [
    'mentation_transcript',
    'results.correspondence_notes',
    'environment.geomagnetic_activity_kp',
  ],
};

// Field descriptions for LLM parsing
export const GANZFELD_FIELD_DESCRIPTIONS = {
  session_date: 'Date of the Ganzfeld session (YYYY-MM-DD)',
  'target.type': 'Type of target: static_image, dynamic_video, audio, object, or location',
  'target.pool_size': 'Number of items in target pool (typically 4)',
  'protocol.automated': 'Was this an auto-ganzfeld (computer-controlled) session?',
  'protocol.double_blind': 'Was the session double-blind (experimenter also blind)?',
  'results.hit': 'Did the receiver correctly identify the target?',
  'results.ranking': 'If ranking method used, where was target ranked (1 = first choice)',
  'results.confidence_rating': 'Receiver confidence in their choice (0-100)',
  'receiver.experience_level': 'Receiver experience: novice, intermediate, or experienced',
  'sender.relationship_to_receiver': 'Sender-receiver relationship: stranger, acquaintance, friend, or family',
  mentation_transcript: 'Full transcript of receiver imagery/mentation during session',
};
