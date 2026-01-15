/**
 * Crisis Apparition Schema
 * Based on Apparition_Schema_v1
 */

import { z } from 'zod';

// Subject (person who appeared) information
const SubjectSchema = z.object({
  relationship: z.enum(['family_parent', 'family_sibling', 'family_spouse', 'family_child', 'family_extended', 'friend_close', 'friend_casual', 'acquaintance', 'stranger']).nullable(),
  age_at_event: z.number().min(0).max(120).nullable(),
  gender: z.enum(['male', 'female', 'other']).nullable(),
  status_at_apparition_time: z.enum(['dying', 'dead', 'critical_condition', 'in_danger', 'unknown']).nullable(),
  cause_of_death_or_crisis: z.string().nullable(),
  time_of_death: z.string().nullable(), // ISO datetime
  death_verified: z.boolean().nullable(),
  death_verification_source: z.string().nullable(),
});

// Percipient (person who saw apparition) information
const PercipientSchema = z.object({
  id: z.string().nullable(), // Anonymized
  age_at_event: z.number().min(0).max(120).nullable(),
  gender: z.enum(['male', 'female', 'other', 'prefer_not_to_say']).nullable(),
  prior_apparition_experiences: z.boolean().nullable(),
  prior_psychic_experiences: z.boolean().nullable(),
  belief_in_paranormal: z.enum(['strong_believer', 'believer', 'uncertain', 'skeptic', 'strong_skeptic']).nullable(),
  mental_state_at_time: z.enum(['normal', 'drowsy', 'asleep', 'meditating', 'stressed', 'ill']).nullable(),
  substance_use_at_time: z.boolean().nullable(),
});

// Apparition characteristics
const ApparitionSchema = z.object({
  type: z.enum(['full_figure', 'partial_figure', 'face_only', 'shadow', 'light', 'mist', 'auditory_only', 'tactile_only', 'sense_of_presence']).nullable(),
  appearance: z.object({
    solid_or_transparent: z.enum(['solid', 'semi_transparent', 'transparent', 'luminous']).nullable(),
    clothing_noted: z.boolean().nullable(),
    clothing_description: z.string().nullable(),
    expression: z.string().nullable(),
    movement: z.boolean().nullable(),
    movement_description: z.string().nullable(),
  }).nullable(),
  duration_seconds: z.number().min(0).nullable(),
  disappearance: z.enum(['fade', 'sudden', 'walked_away', 'door_or_wall', 'woke_up', 'unclear']).nullable(),
});

// Communication details
const CommunicationSchema = z.object({
  occurred: z.boolean().nullable(),
  type: z.enum(['verbal', 'telepathic', 'symbolic', 'gestural']).nullable(),
  content: z.string().nullable(),
  veridical_information: z.boolean().nullable(), // Did message contain verifiable info?
  veridical_details: z.string().nullable(),
  veridical_verified: z.boolean().nullable(),
});

// Location and timing
const LocationTimingSchema = z.object({
  apparition_datetime: z.string().nullable(), // ISO datetime
  apparition_location: z.string().nullable(), // General location description
  location_type: z.enum(['home_bedroom', 'home_other', 'workplace', 'outdoors', 'vehicle', 'other']).nullable(),
  distance_from_subject_miles: z.number().min(0).nullable(),
  time_relation_to_death: z.object({
    relation: z.enum(['before', 'simultaneous', 'after', 'unknown']).nullable(),
    offset_hours: z.number().nullable(), // Negative = before death, positive = after
  }).nullable(),
});

// Witnesses
const WitnessSchema = z.object({
  count: z.number().min(0).nullable(),
  independent_reports: z.boolean().nullable(), // Did witnesses report before comparing?
  corroborating_details: z.string().nullable(),
  witness_statements_available: z.boolean().nullable(),
});

// Environmental factors
const EnvironmentSchema = z.object({
  lighting: z.enum(['dark', 'dim', 'normal', 'bright']).nullable(),
  noise_level: z.enum(['silent', 'quiet', 'moderate', 'loud']).nullable(),
  unusual_environmental_factors: z.string().nullable(),
  electronics_affected: z.boolean().nullable(),
  animals_reacted: z.boolean().nullable(),
});

// Main Crisis Apparition Schema
export const CrisisApparitionSchema = z.object({
  // Metadata
  report_date: z.string().nullable(),
  source_type: z.enum(['first_hand', 'interview', 'published_account', 'historical_archive', 'database']).nullable(),
  source_reference: z.string().nullable(),

  // Core data
  subject: SubjectSchema.nullable(),
  percipient: PercipientSchema.nullable(),
  apparition: ApparitionSchema.nullable(),
  communication: CommunicationSchema.nullable(),
  location_timing: LocationTimingSchema.nullable(),
  witnesses: WitnessSchema.nullable(),
  environment: EnvironmentSchema.nullable(),

  // Narrative
  full_narrative: z.string().nullable(),

  // Percipient awareness
  knew_subject_was_ill_or_dying: z.boolean().nullable(),
  learned_of_death_how: z.string().nullable(),

  // Additional
  researcher_notes: z.string().nullable(),
});

export type CrisisApparitionData = z.infer<typeof CrisisApparitionSchema>;

// Required fields
export const CRISIS_APPARITION_REQUIRED_FIELDS = [
  'source_type',
  'subject.relationship',
  'subject.status_at_apparition_time',
  'location_timing.apparition_datetime',
] as const;

// Triage indicators
export const CRISIS_APPARITION_TRIAGE_INDICATORS = {
  source_integrity: [
    'source_type',
    'source_reference',
    'subject.death_verified',
    'subject.death_verification_source',
  ],
  methodology: [
    'witnesses.independent_reports',
    'witnesses.witness_statements_available',
    'location_timing.time_relation_to_death.offset_hours',
  ],
  variable_capture: [
    'percipient.age_at_event',
    'percipient.prior_apparition_experiences',
    'percipient.belief_in_paranormal',
    'percipient.mental_state_at_time',
  ],
  veridical_evidence: [
    'communication.veridical_information',
    'communication.veridical_verified',
    'knew_subject_was_ill_or_dying',
  ],
};

// Field descriptions for LLM parsing
export const CRISIS_APPARITION_FIELD_DESCRIPTIONS = {
  'subject.relationship': 'Relationship of apparition to percipient: family_parent, family_sibling, friend_close, etc.',
  'subject.status_at_apparition_time': 'Subject status when apparition occurred: dying, dead, critical_condition, in_danger',
  'subject.time_of_death': 'Actual time of subject death (ISO datetime if known)',
  'percipient.mental_state_at_time': 'Percipient state: normal, drowsy, asleep, meditating, stressed, ill',
  'apparition.type': 'Apparition form: full_figure, partial_figure, face_only, auditory_only, sense_of_presence, etc.',
  'apparition.duration_seconds': 'How long the apparition lasted in seconds',
  'communication.occurred': 'Did the apparition communicate with the percipient?',
  'communication.veridical_information': 'Did communication contain verifiable information?',
  'location_timing.distance_from_subject_miles': 'Distance between percipient and subject in miles',
  'location_timing.time_relation_to_death.offset_hours': 'Hours before (negative) or after (positive) death',
  'witnesses.count': 'Number of additional witnesses to the apparition',
  knew_subject_was_ill_or_dying: 'Did percipient know subject was ill/dying before apparition?',
};
