/**
 * Synthesis Agent Types (Phase 6e)
 * Research report generation and synthesis
 */

export type AudienceType =
  | 'academic_researcher'
  | 'funding_body'
  | 'journalist'
  | 'policymaker'
  | 'general_public'
  | 'practitioner';

export type ReportStatus = 'draft' | 'review' | 'published';

export interface KeyStatistic {
  name: string;
  value: number | string;
  context: string;
  source?: string;
}

export interface CrossCuttingPattern {
  pattern: string;
  domains: string[];
  evidence: string;
  strength: 'strong' | 'moderate' | 'weak';
}

export interface DomainDeepDive {
  id?: string;
  session_id?: string;

  domain: string;
  domain_name: string;

  executive_summary: string;
  methodology_overview?: string;

  total_records?: number;
  date_range_start?: string;
  date_range_end?: string;
  geographic_coverage?: string[];

  key_statistics?: KeyStatistic[];
  consensus_findings?: string[];
  contested_findings?: string[];
  novel_findings?: string[];

  dominant_mechanisms?: string[];
  mechanism_evidence?: Record<string, string>;

  data_gaps?: string[];
  methodological_concerns?: string[];
  future_research?: string[];

  evidence_quality_score?: number;
  replication_rate?: number;

  status?: ReportStatus;
}

export interface CrossDomainSynthesis {
  id?: string;
  session_id?: string;

  title: string;
  theme: string;
  domains_covered: string[];

  executive_summary: string;
  methodology?: string;

  cross_cutting_patterns?: CrossCuttingPattern[];
  domain_specific_variations?: Record<string, string>;
  unexplained_differences?: string[];

  supported_theories?: string[];
  challenged_theories?: string[];
  novel_hypotheses?: string[];

  total_records_analyzed?: number;
  significant_correlations?: number;
  effect_sizes?: Record<string, number>;

  research_priorities?: string[];
  data_collection_recommendations?: string[];

  status?: ReportStatus;
}

export interface ContactSuggestion {
  name: string;
  affiliation?: string;
  relevance: string;
  contact_type: 'expert' | 'collaborator' | 'reviewer' | 'funder';
}

export interface ResearchBrief {
  id?: string;
  session_id?: string;

  title: string;
  audience: AudienceType;

  key_takeaways: string[];
  summary: string;
  background?: string;

  supporting_data?: Record<string, unknown>;
  source_references?: string[];

  recommended_actions?: string[];
  contact_suggestions?: ContactSuggestion[];

  status?: ReportStatus;
}

export interface SynthesisSession {
  id?: string;
  status: 'running' | 'completed' | 'failed';
  started_at?: string;
  ended_at?: string;

  domains_analyzed?: string[];
  synthesis_types?: string[];

  deep_dives_generated: number;
  syntheses_generated: number;
  briefs_generated: number;

  key_findings?: Array<{ finding: string; domains: string[] }>;

  summary?: string;
}

export interface SynthesisAgentConfig {
  domains: string[];
  synthesis_types: ('domain_deep_dive' | 'cross_domain' | 'research_brief')[];
  target_audience?: AudienceType;
}
