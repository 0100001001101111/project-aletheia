/**
 * Aletheia Research Agent Types
 */

export type AgentSessionStatus = 'running' | 'completed' | 'failed' | 'cancelled';

export type LogType = 'info' | 'hypothesis' | 'test' | 'result' | 'warning' | 'error' | 'system' | 'research';

export interface AgentSession {
  id: string;
  started_at: string;
  ended_at: string | null;
  status: AgentSessionStatus;
  hypotheses_generated: number;
  tests_run: number;
  findings_queued: number;
  trigger_type: string | null;
  summary: string | null;
  created_at: string;
}

export interface AgentLog {
  id: string;
  session_id: string;
  timestamp: string;
  log_type: LogType;
  message: string;
  data: Record<string, unknown> | null;
  created_at: string;
}

export interface AgentHypothesis {
  id: string;
  session_id: string;
  hypothesis_text: string;
  display_title: string | null;
  domains: string[];
  source_pattern: Record<string, unknown> | null;
  confidence: number;
  status: 'pending' | 'testing' | 'confirmed' | 'rejected';
  created_at: string;
}

export interface AgentTest {
  id: string;
  hypothesis_id: string;
  session_id: string;
  test_type: string;
  parameters: Record<string, unknown>;
  results: Record<string, unknown>;
  p_value: number | null;
  effect_size: number | null;
  sample_size: number | null;
  passed_threshold: boolean;
  confounds_checked: string[];
  confounds_survived: boolean;
  notes: string | null;
  created_at: string;
}

export interface AgentFinding {
  id: string;
  hypothesis_id: string | null;
  session_id: string;
  title: string;
  display_title: string;
  summary: string;
  technical_details: Record<string, unknown> | null;
  supporting_tests: string[];
  effect_survived_controls: boolean;
  confidence: number;
  suggested_prediction: string | null;
  review_status: 'pending' | 'approved' | 'rejected';
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  created_prediction_id: string | null;
  created_at: string;
}

export interface AgentConfig {
  id: string;
  key: string;
  value: unknown;
  description: string | null;
  updated_at: string;
}

export interface AgentStatus {
  enabled: boolean;
  currentSession: AgentSession | null;
  lastSession: AgentSession | null;
  stats: {
    totalSessions: number;
    totalHypotheses: number;
    totalFindings: number;
    approvedFindings: number;
  };
}

export interface DomainCounts {
  [domain: string]: number;
}

// ============================================
// Phase 2: Analysis Engine Types
// ============================================

export type PatternType = 'co-location' | 'temporal' | 'geographic' | 'attribute';

export interface PatternCandidate {
  type: PatternType;
  description: string;
  domains: string[];
  evidence: Record<string, unknown>;
  preliminary_strength: number; // 0-1 estimate
}

export interface TestResult {
  test_type: string;
  statistic: number;
  p_value: number;
  effect_size: number;
  sample_size: number;
  passed_threshold: boolean; // p < 0.01 AND effect > 0.3
  interpretation: string;
  raw_data?: Record<string, unknown>;
}

export interface ConfoundCheckResult {
  confound_type: string;
  controlled: boolean;
  effect_survived: boolean;
  notes: string;
  stratified_results?: Record<string, unknown>;
}

export interface GeneratedHypothesis {
  hypothesis_text: string;
  display_title: string;
  testable: boolean;
  suggested_test: string;
  required_sample_size: number;
  domains: string[];
  source_pattern: PatternCandidate;
}

export interface HoldoutSplit {
  training_ids: string[];
  holdout_ids: string[];
  seed: number;
}

export interface FindingData {
  title: string;
  display_title: string;
  summary: string;
  technical_details: {
    test_results: TestResult[];
    confound_checks: ConfoundCheckResult[];
    holdout_validation: TestResult;
  };
  confidence: number;
  suggested_prediction: string;
}

export interface AgentConfigValues {
  enabled: boolean;
  run_interval_hours: number;
  min_sample_size: number;
  significance_threshold: number;
  effect_size_threshold: number;
  max_hypotheses_per_session: number;
}

// Investigation data for analysis
export interface InvestigationRecord {
  id: string;
  investigation_type: string;
  tier: string;
  raw_data: Record<string, unknown> | null;
  exploratory_data: Record<string, unknown> | null;
  created_at: string;
  triage_score: number | null;
}

// Grid cell for co-location analysis
export interface GridCellData {
  cell_id: string;
  center_lat: number;
  center_lng: number;
  ufo_count: number;
  bigfoot_count: number;
  haunting_count: number;
  total_count: number;
  type_count: number;
  types_present: string[];
  window_index: number | null;
  excess_ratio: number | null;
}

// ============================================
// Phase 4: External Research Types
// ============================================

export type ResearchQueryType = 'prior_research' | 'alternative_data' | 'mechanism' | 'debunking';

export interface ResearchQuery {
  type: ResearchQueryType;
  query: string;
  context: string;
}

export interface SearchSource {
  title: string;
  url: string;
  snippet: string;
  relevance: number;
}

export interface ResearchResult {
  query: ResearchQuery;
  sources: SearchSource[];
  synthesis: string;
}

export interface ResearchSynthesis {
  summary: string;
  key_sources: SearchSource[];
  supports_finding: boolean | null;
  confidence_adjustment: number; // -0.3 to +0.3
  recommended_next_steps: string[];
}

export type ReportVerdict = 'supported' | 'refuted' | 'inconclusive' | 'needs_more_data';

// ============================================
// Suggested Contacts Types
// ============================================

export interface SuggestedContact {
  name: string;
  affiliation: string;
  relevance: string;  // Why this person is relevant to the finding
  related_work: string;  // Paper or work that connects them
  contact_url?: string;  // Link to their faculty page, ResearchGate, etc.
  email?: string;  // If publicly available
  score: number;  // Relevance score 0-100
}

export interface KnownResearcher {
  name: string;
  affiliation: string;
  domains: string[];
  email?: string;
  contact_url?: string;
  expertise: string;
}

export interface AgentReport {
  id?: string;
  finding_id: string;
  session_id: string;
  title: string;
  display_title: string;
  slug: string;
  summary: string;
  statistical_evidence: {
    pattern: string;
    tests: TestResult[];
    confounds: ConfoundCheckResult[];
    interpretation: string;
  };
  research_queries: ResearchQuery[];
  sources: SearchSource[];
  synthesis: string;
  conclusion: string;
  recommended_actions: string[];
  confidence_initial: number;
  confidence_final: number;
  verdict: ReportVerdict;
  status: 'draft' | 'published';
  suggested_contacts: SuggestedContact[];
  published_at?: string;
  created_at?: string;
  updated_at?: string;
}
