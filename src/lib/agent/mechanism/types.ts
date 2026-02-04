/**
 * Mechanism Agent Types (Phase 6d)
 * Explanatory theory hunting and discriminating tests
 */

export type MechanismType =
  | 'neurological'
  | 'psychological'
  | 'physical'
  | 'quantum'
  | 'informational'
  | 'consciousness'
  | 'interdimensional'
  | 'unknown';

export type TestType =
  | 'prediction_comparison'
  | 'exclusive_outcome'
  | 'boundary_condition'
  | 'quantitative_difference'
  | 'temporal_sequence'
  | 'correlation_pattern';

export type SupportLevel = 'strong' | 'moderate' | 'weak' | 'mixed' | 'untested';
export type Plausibility = 'high' | 'medium' | 'low' | 'speculative';
export type Priority = 'critical' | 'high' | 'medium' | 'low';
export type TestStatus = 'proposed' | 'in_progress' | 'completed' | 'abandoned';

export interface MechanismPrediction {
  prediction: string;
  testable: boolean;
  tested?: boolean;
  supported?: boolean;
  notes?: string;
}

export interface Mechanism {
  id?: string;
  name: string;
  description: string;
  mechanism_type: MechanismType;

  primary_domain: string;
  applicable_domains: string[];

  theoretical_basis?: string;
  key_proponents?: string[];
  key_papers?: string[];

  predictions?: MechanismPrediction[];

  evidence_for?: string[];
  evidence_against?: string[];
  overall_support?: SupportLevel;

  created_by?: string;
  verified?: boolean;
}

export interface MechanismEvidence {
  id?: string;
  mechanism_id: string;
  evidence_type: 'statistical' | 'case_study' | 'experimental' | 'theoretical' | 'replication';

  description: string;
  source?: string;
  source_url?: string;

  supports: boolean;
  strength?: 'strong' | 'moderate' | 'weak';

  effect_size?: number;
  p_value?: number;
  sample_size?: number;
}

export interface MechanismPredictionMap {
  [mechanismName: string]: {
    predicts: string;
    confidence: number;
  };
}

export interface DiscriminatingTest {
  id?: string;
  session_id?: string;

  test_name: string;
  test_description: string;
  test_type: TestType;

  mechanism_ids?: string[];
  mechanism_names: string[];

  predictions: MechanismPredictionMap;

  test_status?: TestStatus;
  test_result?: string;
  supported_mechanism?: string;

  data_available?: boolean;
  data_requirements?: string;

  priority?: Priority;
}

export interface UnifiedTheory {
  id?: string;
  session_id?: string;

  theory_name: string;
  theory_description: string;
  core_mechanism: string;

  domains_explained: string[];
  explanation_per_domain?: Record<string, string>;

  unique_predictions?: string[];
  cross_domain_predictions?: string[];

  internal_consistency_score?: number;
  empirical_support_score?: number;
  parsimony_score?: number;
  overall_plausibility?: Plausibility;

  compared_to?: string[];
  advantages?: string[];
  disadvantages?: string[];

  status?: 'draft' | 'under_review' | 'published' | 'deprecated';
}

export interface MechanismSession {
  id?: string;
  status: 'running' | 'completed' | 'failed';
  started_at?: string;
  ended_at?: string;

  domains_analyzed?: string[];
  focus_areas?: string[];

  mechanisms_cataloged: number;
  tests_designed: number;
  theories_proposed: number;

  novel_mechanisms?: Array<{ name: string; domain: string }>;
  critical_tests?: Array<{ name: string; priority: Priority }>;

  summary?: string;
}

export interface MechanismAgentConfig {
  domains: string[];
  focus_areas?: MechanismType[];
  include_speculative?: boolean;
}
