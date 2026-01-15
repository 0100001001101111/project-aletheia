/**
 * NDE (Near-Death Experience) Schema
 * Based on NDE_Schema_v1
 */

import { z } from 'zod';

// Sub-schemas for complex nested data
const MedicalContextSchema = z.object({
  cause: z.enum(['cardiac_arrest', 'trauma', 'illness', 'surgery', 'drowning', 'other']).nullable(),
  cause_other: z.string().nullable(),
  location: z.enum(['hospital', 'home', 'accident_scene', 'other']).nullable(),
  resuscitation_performed: z.boolean().nullable(),
  time_clinically_dead_minutes: z.number().min(0).nullable(),
  medical_records_available: z.boolean().nullable(),
});

const CoreExperienceSchema = z.object({
  out_of_body_experience: z.boolean().nullable(),
  obe_details: z.string().nullable(),
  tunnel_or_void: z.boolean().nullable(),
  light_encounter: z.boolean().nullable(),
  light_description: z.string().nullable(),
  deceased_relatives_encounter: z.boolean().nullable(),
  relatives_identified: z.array(z.string()).nullable(),
  being_of_light: z.boolean().nullable(),
  life_review: z.boolean().nullable(),
  life_review_details: z.string().nullable(),
  border_or_barrier: z.boolean().nullable(),
  decision_to_return: z.boolean().nullable(),
  return_reason: z.string().nullable(),
});

const VeridicalPerceptionSchema = z.object({
  claimed: z.boolean(),
  description: z.string().nullable(),
  verified: z.boolean().nullable(),
  verification_method: z.string().nullable(),
  witnesses: z.array(z.string()).nullable(),
  confidence_level: z.enum(['low', 'medium', 'high']).nullable(),
});

const TimePerceptionSchema = z.object({
  distortion_reported: z.boolean().nullable(),
  distortion_type: z.enum(['accelerated', 'slowed', 'timeless', 'nonlinear']).nullable(),
  subjective_duration: z.string().nullable(),
});

const AftereffectsSchema = z.object({
  personality_changes: z.boolean().nullable(),
  personality_details: z.string().nullable(),
  spiritual_transformation: z.boolean().nullable(),
  reduced_fear_of_death: z.boolean().nullable(),
  increased_compassion: z.boolean().nullable(),
  electromagnetic_sensitivity: z.boolean().nullable(),
  precognitive_experiences: z.boolean().nullable(),
  healing_experiences: z.boolean().nullable(),
  other_aftereffects: z.array(z.string()).nullable(),
});

const SubjectProfileSchema = z.object({
  age_at_experience: z.number().min(0).max(120).nullable(),
  gender: z.enum(['male', 'female', 'other', 'prefer_not_to_say']).nullable(),
  prior_nde_knowledge: z.boolean().nullable(),
  religious_background: z.string().nullable(),
  prior_beliefs_afterlife: z.enum(['believer', 'skeptic', 'agnostic', 'atheist']).nullable(),
});

// Main NDE Schema
export const NDESchema = z.object({
  // Metadata
  experience_date: z.string().nullable(), // ISO date string
  report_date: z.string().nullable(),
  source_type: z.enum(['first_hand', 'interview', 'published_account', 'database']).nullable(),
  source_reference: z.string().nullable(),

  // Core data
  medical_context: MedicalContextSchema.nullable(),
  core_experience: CoreExperienceSchema.nullable(),
  veridical_perception: VeridicalPerceptionSchema.nullable(),
  time_perception: TimePerceptionSchema.nullable(),
  aftereffects: AftereffectsSchema.nullable(),
  subject_profile: SubjectProfileSchema.nullable(),

  // Greyson NDE Scale (if available)
  greyson_score: z.number().min(0).max(32).nullable(),

  // Additional narrative
  full_narrative: z.string().nullable(),
  researcher_notes: z.string().nullable(),
});

export type NDEData = z.infer<typeof NDESchema>;

// Required fields for triage scoring
export const NDE_REQUIRED_FIELDS = [
  'experience_date',
  'source_type',
  'medical_context.cause',
  'core_experience.out_of_body_experience',
] as const;

// Fields that contribute to triage score
export const NDE_TRIAGE_INDICATORS = {
  source_integrity: [
    'source_type',
    'source_reference',
    'medical_context.medical_records_available',
  ],
  methodology: [
    'medical_context.resuscitation_performed',
    'medical_context.time_clinically_dead_minutes',
    'greyson_score',
  ],
  variable_capture: [
    'subject_profile.age_at_experience',
    'subject_profile.gender',
    'subject_profile.prior_nde_knowledge',
    'subject_profile.prior_beliefs_afterlife',
  ],
  veridical_evidence: [
    'veridical_perception.claimed',
    'veridical_perception.verified',
    'veridical_perception.witnesses',
  ],
};

// Field descriptions for LLM parsing
export const NDE_FIELD_DESCRIPTIONS = {
  experience_date: 'Date when the NDE occurred (YYYY-MM-DD format if possible)',
  'medical_context.cause': 'Medical cause: cardiac_arrest, trauma, illness, surgery, drowning, or other',
  'medical_context.time_clinically_dead_minutes': 'Duration of clinical death in minutes',
  'core_experience.out_of_body_experience': 'Did subject report leaving their body?',
  'core_experience.light_encounter': 'Did subject report encountering a light?',
  'core_experience.deceased_relatives_encounter': 'Did subject report meeting deceased relatives?',
  'core_experience.life_review': 'Did subject report a life review/flashback?',
  'veridical_perception.claimed': 'Did subject claim to perceive verifiable information while "dead"?',
  'veridical_perception.verified': 'Was the veridical perception independently verified?',
  'aftereffects.reduced_fear_of_death': 'Did subject report reduced fear of death after NDE?',
  'aftereffects.electromagnetic_sensitivity': 'Did subject report sensitivity to electronics/EM fields?',
  'subject_profile.age_at_experience': 'Age of subject at time of NDE',
  'greyson_score': 'Greyson NDE Scale score (0-32) if assessed',
};
