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
  | 'geophysical';      // Geophysical anomalies

export type TriageStatus = 'pending' | 'provisional' | 'verified' | 'rejected';

export type PredictionStatus = 'open' | 'testing' | 'confirmed' | 'refuted' | 'pending';

export type ContributionType = 'submission' | 'validation' | 'refutation' | 'replication';

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

/** Union type for all raw data schemas */
export type InvestigationRawData =
  | NDERawData
  | GanzfeldRawData
  | CrisisApparitionRawData
  | StargateRawData
  | GeophysicalRawData;

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
