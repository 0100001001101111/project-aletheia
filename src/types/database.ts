/**
 * Project Aletheia - Database Types
 * Auto-generated from PostgreSQL schema
 */

// =====================================================
// ENUM TYPES
// =====================================================

export type IdentityType = 'public' | 'anonymous_verified' | 'anonymous_unverified';

export type VerificationLevel = 'none' | 'phd' | 'researcher' | 'lab_tech' | 'independent';

export type InvestigationType =
  | 'nde'               // Near-death experiences
  | 'ganzfeld'          // Ganzfeld/psi experiments
  | 'crisis_apparition' // Crisis apparitions
  | 'stargate'          // Remote viewing
  | 'geophysical'       // Geophysical anomalies
  | 'ufo';              // UFO/UAP sightings

export type TriageStatus = 'pending' | 'provisional' | 'verified' | 'rejected';

export type PredictionStatus = 'open' | 'testing' | 'confirmed' | 'refuted' | 'pending';

export type ContributionType = 'submission' | 'validation' | 'refutation' | 'replication';

export type CommunityHypothesisStatus = 'speculative' | 'gathering_evidence' | 'promoted';

// =====================================================
// TABLE TYPES
// =====================================================

export interface User {
  id: string;
  auth_id: string | null;
  email: string | null;
  display_name: string;
  identity_type: IdentityType;
  verification_level: VerificationLevel;
  credibility_score: number;
  created_at: string;
  updated_at: string;
}

export interface Investigation {
  id: string;
  user_id: string;
  investigation_type: InvestigationType;
  title: string;
  description: string;
  raw_data: Record<string, unknown>;
  raw_narrative: string | null;
  triage_score: number | null;
  triage_status: TriageStatus;
  triage_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Prediction {
  id: string;
  hypothesis: string;
  confidence_score: number;
  status: PredictionStatus;
  source_investigations: string[];
  domains_involved: InvestigationType[];
  p_value: number | null;
  brier_score: number | null;
  created_at: string;
  updated_at: string;
}

export interface PatternMatch {
  id: string;
  pattern_description: string;
  investigations_matched: string[];
  domains_matched: InvestigationType[];
  prevalence_score: number;
  reliability_score: number;
  volatility_score: number;
  confidence_score: number;
  generated_prediction_id: string | null;
  created_at: string;
}

export interface Contribution {
  id: string;
  user_id: string;
  investigation_id: string;
  contribution_type: ContributionType;
  credibility_points_earned: number;
  notes: string | null;
  created_at: string;
}

export interface TriageReview {
  id: string;
  investigation_id: string;
  reviewer_id: string | null;
  source_integrity_score: number;
  methodology_score: number;
  variable_capture_score: number;
  overall_score: number;
  notes: string | null;
  created_at: string;
}

export interface CommunityHypothesis {
  id: string;
  user_id: string | null;
  title: string;
  hypothesis: string;
  domains_referenced: InvestigationType[] | null;
  evidence_needed: string | null;
  status: CommunityHypothesisStatus;
  upvotes: number;
  created_at: string;
}

export interface CommunityHypothesisWithUser extends CommunityHypothesis {
  user?: Pick<User, 'id' | 'display_name' | 'verification_level'> | null;
}

// =====================================================
// PREDICTION TESTING SYSTEM TYPES
// =====================================================

export type SubmissionMode = 'simple' | 'advanced';
export type FlawType = 'sensory_leakage' | 'selection_bias' | 'statistical_error' | 'protocol_violation' | 'data_integrity' | 'other';
export type FlagSeverity = 'minor' | 'major' | 'fatal';
export type FlagStatus = 'open' | 'acknowledged' | 'disputed' | 'resolved';
export type PreregistrationStatus = 'active' | 'completed' | 'withdrawn';
export type DisputeStatus = 'open' | 'resolved' | 'escalated' | 'nullified';
export type JuryDecision = 'uphold' | 'overturn' | 'partial';
export type JuryVote = 'uphold' | 'overturn' | 'abstain';

export interface PredictionResult {
  id: string;
  prediction_id: string;
  tester_id: string | null;
  submission_mode: SubmissionMode;
  trials: number | null;
  hits: number | null;
  description: string | null;
  effect_observed: boolean;
  p_value: number | null;
  sample_size: number | null;
  effect_size: number | null;
  methodology: string | null;
  deviations_from_protocol: string | null;
  plain_summary: string | null;
  preregistration_url: string | null;
  publication_url: string | null;
  raw_data: Record<string, unknown> | null;
  isolation_score: number;
  target_selection_score: number;
  data_integrity_score: number;
  baseline_score: number;
  quality_score: number | null;
  preregistration_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface PredictionTester {
  id: string;
  user_id: string | null;
  display_name: string | null;
  anonymous: boolean;
  methodology_points: number;
  created_at: string;
}

export interface Preregistration {
  id: string;
  prediction_id: string;
  user_id: string | null;
  hash_id: string;
  content_hash: string;
  protocol: string;
  hypothesis: string;
  methodology: string;
  expected_sample_size: number | null;
  analysis_plan: string | null;
  embargoed: boolean;
  embargo_until: string | null;
  status: PreregistrationStatus;
  created_at: string;
}

export interface ResultFlag {
  id: string;
  result_id: string;
  flagger_id: string | null;
  flaw_type: FlawType;
  description: string;
  evidence: string | null;
  severity: FlagSeverity;
  status: FlagStatus;
  resolution_notes: string | null;
  created_at: string;
}

export interface Dispute {
  id: string;
  result_id: string;
  flag_id: string | null;
  initiator_id: string | null;
  tier: number;
  data_requested: string | null;
  data_provided: string | null;
  data_provided_at: string | null;
  jury_decision: JuryDecision | null;
  jury_votes: { uphold: number; overturn: number; abstain: number } | null;
  nullification_reason: string | null;
  status: DisputeStatus;
  resolved_at: string | null;
  created_at: string;
}

export interface JuryVoteRecord {
  id: string;
  dispute_id: string;
  juror_id: string;
  vote: JuryVote;
  reasoning: string | null;
  created_at: string;
}

export interface JuryPool {
  id: string;
  dispute_id: string;
  juror_id: string;
  selected_at: string;
  voted_at: string | null;
}

// =====================================================
// INSERT TYPES (for creating new records)
// =====================================================

export interface UserInsert {
  id?: string;
  auth_id?: string | null;
  email?: string | null;
  display_name: string;
  identity_type?: IdentityType;
  verification_level?: VerificationLevel;
  credibility_score?: number;
  created_at?: string;
  updated_at?: string;
}

export interface InvestigationInsert {
  id?: string;
  user_id: string;
  investigation_type: InvestigationType;
  title: string;
  description: string;
  raw_data?: Record<string, unknown>;
  raw_narrative?: string | null;
  triage_score?: number | null;
  triage_status?: TriageStatus;
  triage_notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface PredictionInsert {
  id?: string;
  hypothesis: string;
  confidence_score: number;
  status?: PredictionStatus;
  source_investigations?: string[];
  domains_involved?: InvestigationType[];
  p_value?: number | null;
  brier_score?: number | null;
  created_at?: string;
  updated_at?: string;
}

export interface PatternMatchInsert {
  id?: string;
  pattern_description: string;
  investigations_matched?: string[];
  domains_matched?: InvestigationType[];
  prevalence_score?: number;
  reliability_score?: number;
  volatility_score?: number;
  confidence_score?: number;
  generated_prediction_id?: string | null;
  created_at?: string;
}

export interface ContributionInsert {
  id?: string;
  user_id: string;
  investigation_id: string;
  contribution_type: ContributionType;
  credibility_points_earned?: number;
  notes?: string | null;
  created_at?: string;
}

export interface TriageReviewInsert {
  id?: string;
  investigation_id: string;
  reviewer_id?: string | null;
  source_integrity_score: number;
  methodology_score: number;
  variable_capture_score: number;
  overall_score: number;
  notes?: string | null;
  created_at?: string;
}

// =====================================================
// UPDATE TYPES (for partial updates)
// =====================================================

export type UserUpdate = Partial<UserInsert>;
export type InvestigationUpdate = Partial<InvestigationInsert>;
export type PredictionUpdate = Partial<PredictionInsert>;
export type PatternMatchUpdate = Partial<PatternMatchInsert>;
export type ContributionUpdate = Partial<ContributionInsert>;
export type TriageReviewUpdate = Partial<TriageReviewInsert>;

// =====================================================
// SUPABASE DATABASE TYPE DEFINITION
// =====================================================

export interface Database {
  public: {
    Tables: {
      aletheia_users: {
        Row: User;
        Insert: UserInsert;
        Update: UserUpdate;
      };
      aletheia_investigations: {
        Row: Investigation;
        Insert: InvestigationInsert;
        Update: InvestigationUpdate;
      };
      aletheia_predictions: {
        Row: Prediction;
        Insert: PredictionInsert;
        Update: PredictionUpdate;
      };
      aletheia_pattern_matches: {
        Row: PatternMatch;
        Insert: PatternMatchInsert;
        Update: PatternMatchUpdate;
      };
      aletheia_contributions: {
        Row: Contribution;
        Insert: ContributionInsert;
        Update: ContributionUpdate;
      };
      aletheia_triage_reviews: {
        Row: TriageReview;
        Insert: TriageReviewInsert;
        Update: TriageReviewUpdate;
      };
      aletheia_prediction_results: {
        Row: PredictionResult;
        Insert: Partial<PredictionResult> & { prediction_id: string; effect_observed: boolean };
        Update: Partial<PredictionResult>;
      };
      aletheia_prediction_testers: {
        Row: PredictionTester;
        Insert: Partial<PredictionTester>;
        Update: Partial<PredictionTester>;
      };
      aletheia_preregistrations: {
        Row: Preregistration;
        Insert: Partial<Preregistration> & { prediction_id: string; hash_id: string; content_hash: string; protocol: string; hypothesis: string; methodology: string };
        Update: Partial<Preregistration>;
      };
      aletheia_result_flags: {
        Row: ResultFlag;
        Insert: Partial<ResultFlag> & { result_id: string; flaw_type: FlawType; description: string };
        Update: Partial<ResultFlag>;
      };
      aletheia_disputes: {
        Row: Dispute;
        Insert: Partial<Dispute> & { result_id: string };
        Update: Partial<Dispute>;
      };
      aletheia_jury_votes: {
        Row: JuryVoteRecord;
        Insert: Partial<JuryVoteRecord> & { dispute_id: string; juror_id: string; vote: JuryVote };
        Update: Partial<JuryVoteRecord>;
      };
      aletheia_jury_pool: {
        Row: JuryPool;
        Insert: Partial<JuryPool> & { dispute_id: string; juror_id: string };
        Update: Partial<JuryPool>;
      };
      aletheia_community_hypotheses: {
        Row: CommunityHypothesis;
        Insert: Partial<CommunityHypothesis> & { title: string; hypothesis: string };
        Update: Partial<CommunityHypothesis>;
      };
    };
    Enums: {
      aletheia_identity_type: IdentityType;
      aletheia_verification_level: VerificationLevel;
      aletheia_investigation_type: InvestigationType;
      aletheia_triage_status: TriageStatus;
      aletheia_prediction_status: PredictionStatus;
      aletheia_contribution_type: ContributionType;
    };
  };
}

// =====================================================
// DOMAIN-SPECIFIC RAW DATA SCHEMAS
// =====================================================

/** NDE (Near-Death Experience) raw data schema */
export interface NDERawData {
  experience_date?: string;
  cardiac_arrest?: boolean;
  veridical_perception?: boolean;
  veridical_details?: string;
  obe_reported?: boolean;
  light_encounter?: boolean;
  life_review?: boolean;
  deceased_relatives?: boolean;
  time_distortion?: boolean;
  aftereffects?: string[];
  medical_context?: string;
  duration_estimate_minutes?: number;
}

/** Ganzfeld experiment raw data schema */
export interface GanzfeldRawData {
  experiment_date?: string;
  sender_id?: string;
  receiver_id?: string;
  target_type?: 'image' | 'video' | 'object';
  target_description?: string;
  hit?: boolean;
  confidence_rating?: number;
  session_duration_minutes?: number;
  laboratory?: string;
  protocol_version?: string;
}

/** Crisis apparition raw data schema */
export interface CrisisApparitionRawData {
  apparition_date?: string;
  subject_relation?: string;
  subject_status_at_time?: 'dying' | 'dead' | 'critical' | 'unknown';
  time_of_death?: string;
  distance_miles?: number;
  communication_type?: 'visual' | 'auditory' | 'tactile' | 'symbolic';
  message_content?: string;
  witnesses?: number;
  verified_death?: boolean;
}

/** Remote viewing (Stargate) raw data schema */
export interface StargateRawData {
  session_date?: string;
  viewer_id?: string;
  target_coordinates?: string;
  target_type?: 'location' | 'event' | 'object' | 'person';
  target_description?: string;
  correspondence_score?: number;
  blind_protocol?: boolean;
  judge_evaluation?: string;
  sketch_accuracy?: number;
}

/** Geophysical anomaly raw data schema */
export interface GeophysicalRawData {
  observation_date?: string;
  location_lat?: number;
  location_lng?: number;
  anomaly_type?: 'em_field' | 'temperature' | 'radiation' | 'sound' | 'light';
  measurement_value?: number;
  measurement_unit?: string;
  baseline_value?: number;
  deviation_sigma?: number;
  equipment_used?: string[];
  correlated_events?: string[];
}

/** UFO/UAP sighting raw data schema */
export interface UFORawData {
  date_time?: string;
  local_sidereal_time?: number;
  duration_seconds?: number;
  shape?: string;
  witness_count?: number;
  description?: string;
  location?: {
    city?: string;
    state?: string;
    country?: string;
    latitude?: number;
    longitude?: number;
  };
  geophysical?: {
    nearest_fault_line_km?: number;
    bedrock_type?: string;
    piezoelectric_bedrock?: boolean;
    earthquake_nearby?: boolean;
    earthquake_count?: number;
    max_magnitude?: number;
    population_density?: number;
  };
  geomagnetic?: {
    kp_index?: number;
    kp_max?: number;
    geomagnetic_storm?: boolean;
  };
  confounds?: {
    military_base_nearby_km?: number;
    airport_nearby_km?: number;
    weather_conditions?: string;
  };
  effects?: {
    physical_effects?: boolean;
    physical_effects_desc?: string;
    physiological_effects?: boolean;
    physiological_effects_desc?: string;
    em_interference?: boolean;
    em_interference_desc?: string;
  };
  source?: string;
  source_id?: string;
  has_coordinates?: boolean;
  quality_score?: number;
  confound_score?: number;
}

/** Union type for all raw data schemas */
export type InvestigationRawData =
  | NDERawData
  | GanzfeldRawData
  | CrisisApparitionRawData
  | StargateRawData
  | GeophysicalRawData
  | UFORawData;

// =====================================================
// UTILITY TYPES
// =====================================================

/** Investigation with typed raw_data based on investigation_type */
export type TypedInvestigation<T extends InvestigationType> = Omit<Investigation, 'raw_data'> & {
  investigation_type: T;
  raw_data: T extends 'nde'
    ? NDERawData
    : T extends 'ganzfeld'
    ? GanzfeldRawData
    : T extends 'crisis_apparition'
    ? CrisisApparitionRawData
    : T extends 'stargate'
    ? StargateRawData
    : T extends 'geophysical'
    ? GeophysicalRawData
    : T extends 'ufo'
    ? UFORawData
    : Record<string, unknown>;
};

/** Investigation with user data joined */
export interface InvestigationWithUser extends Investigation {
  user: Pick<User, 'id' | 'display_name' | 'verification_level' | 'credibility_score'>;
}

/** Prediction with pattern match data joined */
export interface PredictionWithPatterns extends Prediction {
  pattern_matches: PatternMatch[];
}

/** Triage score breakdown */
export interface TriageScoreBreakdown {
  source_integrity: number;  // 0-3
  methodology: number;       // 0-3
  variable_capture: number;  // 0-2
  overall: number;           // 0-10
}
