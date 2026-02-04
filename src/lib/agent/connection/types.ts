/**
 * Connection Agent Types (Phase 6c)
 * Cross-domain pattern detection and variable mapping
 */

export type MappingType = 'semantic' | 'structural' | 'temporal' | 'experiential' | 'physical';
export type CorrelationType = 'temporal' | 'geographic' | 'demographic' | 'phenomenological' | 'statistical';
export type KeelStrength = 'strong' | 'moderate' | 'weak' | 'none' | 'inverse';

export interface VariableMapping {
  id?: string;

  // Source
  source_domain: string;
  source_variable: string;
  source_description?: string;

  // Target
  target_domain: string;
  target_variable: string;
  target_description?: string;

  // Mapping details
  mapping_type: MappingType;
  mapping_strength: number;
  mapping_rationale?: string;

  // Evidence
  supporting_evidence?: string[];
  contradicting_evidence?: string[];

  // Metadata
  confidence_score: number;
  created_by?: string;
  verified?: boolean;
}

export interface CrossDomainCorrelation {
  id?: string;
  session_id?: string;

  // Domains
  domain_a: string;
  domain_b: string;

  // Variables
  variable_a: string;
  variable_b: string;

  // Correlation details
  correlation_type: CorrelationType;
  correlation_coefficient?: number;
  p_value?: number;
  effect_size?: string;
  sample_size_a?: number;
  sample_size_b?: number;

  // Analysis
  method?: string;
  conditions?: string;
  confounds_checked?: string[];

  // Results
  is_significant: boolean;
  interpretation?: string;
}

export interface KeelTestVariable {
  domain: string;
  variable: string;
  weird_indicator: string; // What makes this "weird"
}

export interface KeelTest {
  id?: string;
  session_id?: string;

  // Test definition
  test_name: string;
  hypothesis: string;
  domains_tested: string[];

  // Variables
  variables_tested: KeelTestVariable[];

  // Results
  correlation_matrix?: Record<string, Record<string, number>>; // pairwise correlations
  overall_correlation?: number;
  p_value?: number;
  effect_size?: string;

  // Interpretation
  supports_keel_hypothesis?: boolean;
  strength?: KeelStrength;
  notes?: string;

  // Samples
  total_records?: number;
  records_per_domain?: Record<string, number>;
}

export interface ClusterCenter {
  [feature: string]: number | string;
}

export interface WitnessProfile {
  id?: string;
  session_id?: string;

  // Definition
  profile_name: string;
  profile_description?: string;

  // Cluster details
  clustering_method: string;
  features_used: string[];
  n_clusters?: number;

  // Characteristics
  cluster_centers?: ClusterCenter[];
  cluster_sizes?: number[];

  // Cross-domain distribution
  domain_distribution?: Record<string, Record<number, number>>;

  // Quality metrics
  silhouette_score?: number;
  inertia?: number;
}

export interface ClusterAssignment {
  id?: string;
  profile_id: string;
  investigation_id: string;

  // Assignment
  cluster_id: number;
  cluster_label?: string;
  distance_to_center?: number;

  // Soft clustering
  membership_probability?: number;
}

export interface ConnectionSession {
  id?: string;
  status: 'running' | 'completed' | 'failed';
  started_at?: string;
  ended_at?: string;

  // Configuration
  domains_analyzed?: string[];
  analysis_types?: string[];

  // Results
  mappings_discovered: number;
  correlations_found: number;
  keel_tests_run: number;
  profiles_generated: number;

  // Notable
  significant_connections?: SignificantConnection[];

  summary?: string;
}

export interface SignificantConnection {
  type: 'mapping' | 'correlation' | 'keel' | 'cluster';
  description: string;
  domains: string[];
  strength: number;
}

// Domain semantic mappings for variable translation
export interface DomainSemantics {
  domain: string;
  concepts: {
    name: string;
    variables: string[];
    description: string;
  }[];
}

// Configuration for Connection Agent runs
export interface ConnectionAgentConfig {
  domains: string[];
  analysis_types: ('variable_mapping' | 'cross_correlation' | 'keel_test' | 'witness_profiles')[];
  min_sample_size?: number;
  significance_threshold?: number;
}
