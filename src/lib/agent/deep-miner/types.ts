/**
 * Deep Miner Agent Types (Agent System v2 - Phase 6a)
 * Types for exhaustive within-domain statistical analysis
 */

export type VariableType = 'categorical' | 'continuous' | 'temporal' | 'geographic' | 'boolean' | 'text';
export type DistributionShape = 'normal' | 'skewed_left' | 'skewed_right' | 'bimodal' | 'uniform' | 'unknown';
export type TemporalTrend = 'increasing' | 'decreasing' | 'stable' | 'cyclical' | 'fluctuating' | 'unknown' | 'insufficient_data';
export type EffectSizeCategory = 'negligible' | 'small' | 'medium' | 'large';
export type OutlierMethod = 'iqr' | 'zscore' | 'isolation_forest' | 'mahalanobis';
export type DeepMinerSessionStatus = 'running' | 'completed' | 'failed';

export interface DeepMinerSession {
  id: string;
  domain: string;
  started_at: string;
  ended_at: string | null;
  status: DeepMinerSessionStatus;
  trigger_type: string;
  records_analyzed: number;
  variables_found: number;
  cross_tabs_computed: number;
  significant_associations: number;
  subgroups_analyzed: number;
  outliers_found: number;
  summary: string | null;
  created_at: string;
}

export interface VariableCensusEntry {
  id?: string;
  session_id: string;
  domain: string;
  variable_name: string;
  variable_path: string;
  variable_type: VariableType;

  // Categorical
  possible_values?: string[];
  value_distribution?: Record<string, number>;
  mode_value?: string;

  // Continuous
  min_value?: number;
  max_value?: number;
  mean_value?: number;
  median_value?: number;
  std_dev?: number;
  percentile_25?: number;
  percentile_75?: number;
  distribution_shape?: DistributionShape;

  // Temporal
  earliest_date?: string;
  latest_date?: string;
  temporal_trend?: TemporalTrend;

  // Common
  total_records: number;
  non_null_count: number;
  null_count: number;
  missing_rate: number;
  notes?: string;
}

export interface CrossTabulation {
  id?: string;
  session_id: string;
  domain: string;
  variable_a: string;
  variable_a_path: string;
  variable_b: string;
  variable_b_path: string;
  contingency_table: Record<string, Record<string, number>>;
  chi_square: number | null;
  degrees_of_freedom: number | null;
  p_value: number | null;
  cramers_v: number | null;
  significant: boolean;
  effect_size_category: EffectSizeCategory | null;
  interpretation: string | null;
  total_n: number;
  valid_n: number;
}

export interface SubgroupResult {
  name: string;
  n: number;
  statistic: number;
  ci_lower?: number;
  ci_upper?: number;
  differs_from_overall: boolean;
  notable_findings?: string[];
}

export interface SubgroupAnalysis {
  id?: string;
  session_id: string;
  domain: string;
  subgroup_variable: string;
  subgroup_variable_path: string;
  target_variable: string;
  target_variable_path: string;
  subgroups: SubgroupResult[];
  overall_statistic: number | null;
  overall_n: number;
  test_type: string | null;
  test_statistic: number | null;
  p_value: number | null;
  effect_size: number | null;
  notable_findings: string[];
  differs_from_overall: boolean;
}

export interface TemporalPeriod {
  period: string;
  n: number;
  statistic: number;
  ci_lower?: number;
  ci_upper?: number;
}

export interface TemporalStabilityAnalysis {
  id?: string;
  session_id: string;
  domain: string;
  finding: string;
  variable_path: string;
  time_periods: TemporalPeriod[];
  trend: TemporalTrend;
  stability_score: number;
  trend_test_type: string | null;
  trend_test_statistic: number | null;
  trend_p_value: number | null;
  interpretation: string | null;
}

export interface Outlier {
  case_id: string;
  value: unknown;
  deviation: number;
  possible_explanations: string[];
}

export interface OutlierAnalysis {
  id?: string;
  session_id: string;
  domain: string;
  variable_path: string;
  outlier_method: OutlierMethod;
  outliers: Outlier[];
  outlier_count: number;
  total_n: number;
  outlier_rate: number;
  pattern_in_outliers: string | null;
  pattern_significance: number | null;
}

export interface VariableComparison {
  variable: string;
  experimental_value: number;
  control_value: number;
  difference: number;
  p_value: number | null;
  effect_size: number | null;
}

export interface ControlComparison {
  id?: string;
  session_id: string;
  domain: string;
  experimental_group: string;
  control_group: string;
  comparison_description: string;
  variables_compared: VariableComparison[];
  significant_differences: number;
  total_variables: number;
  overall_interpretation: string | null;
  experimental_n: number;
  control_n: number;
  data_source: string | null;
}

export interface KeyStatistic {
  finding: string;
  statistic: string;
  comparison_to_literature: string | null;
}

export interface LiteratureComparison {
  our_finding: string;
  literature_finding: string;
  source: string;
  agreement: 'confirms' | 'contradicts' | 'extends' | 'partial' | 'novel';
}

export interface DomainDeepDive {
  id?: string;
  session_id: string;
  domain: string;
  total_records: number;
  date_range_start: string | null;
  date_range_end: string | null;
  geographic_coverage: string[];
  key_sources: string[];
  quality_assessment: string | null;
  executive_summary: string | null;
  key_statistics: KeyStatistic[];
  open_questions: string[];
  recommended_next_steps: string[];
  literature_comparisons: LiteratureComparison[];
  full_report: string | null;
  status: 'draft' | 'published';
  published_at: string | null;
  created_at?: string;
  updated_at?: string;
}

// Input types for the Deep Miner
export interface DeepMinerConfig {
  domain: string;
  max_cross_tabs?: number; // Limit to avoid explosion
  significance_threshold?: number; // Default 0.05
  min_cell_count?: number; // For cross-tabs, default 5
  min_sample_for_subgroup?: number; // Default 20
  include_text_analysis?: boolean;
  temporal_periods?: 'decade' | 'year' | 'month';
}

// Extracted variable info
export interface ExtractedVariable {
  name: string;
  path: string;
  type: VariableType;
  values: unknown[];
  sampleValue: unknown;
}

// Statistics helper types
export interface ChiSquareResult {
  chi_square: number;
  degrees_of_freedom: number;
  p_value: number;
  cramers_v: number;
}

export interface DescriptiveStats {
  n: number;
  mean: number;
  median: number;
  std_dev: number;
  min: number;
  max: number;
  percentile_25: number;
  percentile_75: number;
}
