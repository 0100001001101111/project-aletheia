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

// ============================================
// Data Acquisition Types (Phase 5)
// ============================================

export type GapType = 'temporal' | 'geographic' | 'domain' | 'verification';
export type SourceType = 'database' | 'api' | 'scrape' | 'rss' | 'archive';
export type QualityEstimate = 'high' | 'medium' | 'low';
export type AcquisitionStatus = 'pending' | 'approved' | 'rejected' | 'in_progress' | 'completed' | 'failed';

export interface DataGap {
  type: GapType;
  description: string;
  domain?: string;
  severity: 'critical' | 'moderate' | 'minor';
  details: {
    // For temporal gaps
    data_ends?: string;
    comparison_ends?: string;
    // For geographic gaps
    missing_regions?: string[];
    predicted_window?: string;
    // For domain gaps
    domain_count?: number;
    comparison_count?: number;
    // For verification gaps
    pattern_id?: string;
    needs_independent_source?: boolean;
  };
}

export interface DataSource {
  id?: string;
  name: string;
  url: string;
  type: SourceType;
  domain: string;
  coverage: {
    temporal?: { start: string; end: string };
    geographic?: string[];
  };
  estimated_records: number;
  quality_estimate: QualityEstimate;
  quality_reasoning: string;
  access_method: string;
  discovered_at?: string;
}

export interface AcquisitionRequest {
  id?: string;
  session_id?: string;
  gap_type: GapType;
  gap_description: string;
  source_name: string;
  source_url: string;
  source_type?: SourceType;
  domain?: string;
  estimated_records?: number;
  quality_estimate?: QualityEstimate;
  quality_reasoning?: string;
  access_method?: string;
  extraction_notes?: string;
  status: AcquisitionStatus;
  reviewed_by?: string;
  reviewed_at?: string;
  review_notes?: string;
  records_acquired?: number;
  acquisition_log?: string;
  completed_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ExtractionResult {
  source_id: string;
  records_found: number;
  records_valid: number;
  records_duplicate: number;
  records_ingested: number;
  errors: string[];
  sample_records: Record<string, unknown>[];
}

export interface KnownDataSource {
  name: string;
  url: string;
  domain: string;
  type: SourceType;
  quality: QualityEstimate;
  description: string;
  scrape_config?: {
    list_url: string;
    pagination?: string;
    record_selector: string;
    field_mappings: Record<string, string>;
  };
  api_config?: {
    endpoint: string;
    auth_type?: 'none' | 'api_key' | 'oauth';
    rate_limit?: number;
  };
}

// ============================================
// Discovery Agent Types (Phase 6)
// ============================================

export type LeadType =
  | 'paper'           // Academic paper to acquire
  | 'dataset'         // Raw data source
  | 'archive'         // Collection to mine
  | 'researcher'      // Person to follow/contact
  | 'connection'      // Cross-domain pattern
  | 'replication'     // Someone tried to replicate something
  | 'document'        // Government/institutional document
  | 'conference'      // Proceedings to scan
  | 'translation';    // Foreign source worth translating

export type LeadStatus = 'pending' | 'approved' | 'rejected' | 'acquired' | 'investigating';
export type LeadPriority = 'low' | 'normal' | 'high' | 'urgent';
export type DiscoverySourceType = 'journal' | 'archive' | 'database' | 'researcher' | 'conference' | 'organization' | 'preprint';
export type MonitorFrequency = 'daily' | 'weekly' | 'monthly' | 'manual';
export type HandoffType = 'hypothesis' | 'data_request' | 'verification_needed' | 'new_dataset';

export interface DiscoverySession {
  id: string;
  started_at: string;
  ended_at: string | null;
  status: 'running' | 'completed' | 'failed';
  leads_found: number;
  connections_found: number;
  sources_scanned: number;
  trigger_type: string | null;
  focus_areas: string[] | null;
  summary: string | null;
  created_at: string;
}

export interface DiscoveryLead {
  id?: string;
  session_id?: string;
  lead_type: LeadType;
  title: string;
  description?: string;
  source_url?: string;
  quality_score?: number;
  quality_signals?: string[];
  quality_concerns?: string[];
  domains?: string[];
  keywords?: string[];
  related_patterns?: string[];
  related_predictions?: string[];
  authors?: string[];
  publication?: string;
  publication_date?: string;
  language?: string;
  has_quantitative_data?: boolean;
  sample_size?: number;
  connection_sources?: CrossDomainConnection;
  potential_hypothesis?: string;
  status: LeadStatus;
  priority: LeadPriority;
  reviewed_by?: string;
  reviewed_at?: string;
  review_notes?: string;
  acquisition_request_id?: string;
  created_at?: string;
}

export interface DiscoverySource {
  id?: string;
  name: string;
  url?: string;
  source_type: DiscoverySourceType;
  monitor_frequency: MonitorFrequency;
  last_checked?: string;
  next_check?: string;
  quality_tier: QualityEstimate;
  notes?: string;
  leads_found: number;
  leads_approved: number;
  active: boolean;
  created_at?: string;
}

export interface TrackedResearcher {
  id?: string;
  name: string;
  affiliations?: string[];
  domains?: string[];
  email?: string;
  website?: string;
  google_scholar?: string;
  researchgate?: string;
  orcid?: string;
  last_publication_check?: string;
  known_publications?: ResearcherPublication[];
  credibility_score?: number;
  notes?: string;
  active: boolean;
  created_at?: string;
}

export interface ResearcherPublication {
  title: string;
  url?: string;
  date?: string;
  type: 'paper' | 'preprint' | 'book' | 'talk' | 'interview';
}

export interface CrossDomainConnection {
  source_a: {
    paper: string;
    domain: string;
    finding: string;
    url?: string;
  };
  source_b: {
    paper: string;
    domain: string;
    finding: string;
    url?: string;
  };
  source_c?: {
    paper: string;
    domain: string;
    finding: string;
    url?: string;
  };
  connection: string;
  potential_hypothesis: string;
  confidence: number;
}

export interface AgentHandoff {
  id?: string;
  from_agent: 'discovery' | 'research';
  to_agent: 'discovery' | 'research';
  handoff_type: HandoffType;
  payload: Record<string, unknown>;
  status: 'pending' | 'picked_up' | 'completed' | 'failed';
  picked_up_at?: string;
  completed_at?: string;
  result?: Record<string, unknown>;
  created_at?: string;
}

export interface DiscoveryStatus {
  enabled: boolean;
  currentSession: DiscoverySession | null;
  lastSession: DiscoverySession | null;
  stats: {
    totalSessions: number;
    totalLeads: number;
    pendingLeads: number;
    approvedLeads: number;
    totalConnections: number;
    sourcesMonitored: number;
    researchersTracked: number;
  };
}

export interface LeadEvaluation {
  quality_score: number;
  quality_signals: string[];
  quality_concerns: string[];
  domains: string[];
  priority: LeadPriority;
  recommendation: 'approve' | 'reject' | 'investigate';
}
