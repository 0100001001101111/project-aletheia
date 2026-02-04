/**
 * Discovery Agent v2 - Type Definitions
 * Types for paper extraction, literature synthesis, and replication tracking
 */

// ============================================================================
// Paper Extraction Types
// ============================================================================

export interface ExtractedStatistic {
  finding: string;
  statistic_type: string;
  value: number;
  confidence_interval?: string;
  p_value?: number;
  context?: string;
}

export interface ExtractedCorrelation {
  variable_a: string;
  variable_b: string;
  direction: 'positive' | 'negative' | 'none';
  strength: 'weak' | 'moderate' | 'strong';
  conditions?: string;
}

export interface ExtractionPrompt {
  title: string;
  abstract?: string;
  full_text?: string;
  url?: string;
}

export interface ClaudeExtractionResponse {
  sample_size: number | null;
  methodology: string;
  population: string;
  statistics: ExtractedStatistic[];
  correlations: ExtractedCorrelation[];
  key_findings: string[];
  limitations: string[];
  testable_with_aletheia: boolean;
  test_requirements: string;
}

export interface PaperExtraction {
  id?: string;
  lead_id?: string;
  domain?: string;
  title: string;
  authors: string[];
  doi?: string;
  publication?: string;
  publication_date?: string;
  url?: string;
  sample_size?: number;
  methodology?: string;
  population?: string;
  statistics: ExtractedStatistic[];
  correlations: ExtractedCorrelation[];
  comparisons_made?: string[];
  limitations: string[];
  key_findings: string[];
  testable_with_aletheia: boolean;
  test_requirements?: string;
  extraction_method?: string;
  extraction_confidence?: number;
  created_at?: string;
  updated_at?: string;
}

// ============================================================================
// Literature Synthesis Types
// ============================================================================

export interface ConsensusFinding {
  finding: string;
  supporting_papers: number;
  total_n: number;
  effect_size_range: number[];
  confidence: 'high' | 'medium' | 'low';
}

export interface ContestedFinding {
  finding: string;
  supporting_papers: string[];
  contradicting_papers: string[];
  likely_explanation: string;
}

export interface LiteratureGap {
  question: string;
  why_unstudied: string;
  could_we_address: boolean;
}

export interface LiteratureSynthesis {
  id?: string;
  domain: string;
  topic: string;
  papers_reviewed: number;
  paper_ids: string[];
  total_sample_size: number;
  year_range_start?: number;
  year_range_end?: number;
  consensus_findings: ConsensusFinding[];
  contested_findings: ContestedFinding[];
  gaps_in_literature: LiteratureGap[];
  executive_summary?: string;
  methodology_notes?: string;
  recommendations: string[];
  status: 'draft' | 'published';
  created_at?: string;
  updated_at?: string;
}

// ============================================================================
// Replication Tracking Types
// ============================================================================

export interface ReplicationAttempt {
  paper: string;
  citation: string;
  n: number;
  effect?: number;
  successful: boolean;
  notes?: string;
}

export interface ReplicationTracking {
  id?: string;
  original_paper_id?: string;
  original_finding: string;
  original_citation: string;
  original_n?: number;
  original_effect?: number;
  domain?: string;
  replications: ReplicationAttempt[];
  total_replications: number;
  successful_replications: number;
  meta_analytic_effect?: number;
  heterogeneity_i2?: number;
  replication_status: 'robust' | 'contested' | 'failed' | 'untested';
  confidence_score: number;
  aletheia_replication?: AletheiaReplication;
  created_at?: string;
  updated_at?: string;
}

export interface AletheiaReplication {
  id?: string;
  tracking_id?: string;
  hypothesis_id?: string;
  finding_id?: string;
  replicated: boolean;
  n: number;
  effect?: number;
  p_value?: number;
  methodology?: string;
  notes?: string;
  created_at?: string;
}
