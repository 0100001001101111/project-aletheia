/**
 * Aletheia Research Agent Types
 */

export type AgentSessionStatus = 'running' | 'completed' | 'failed' | 'cancelled';

export type LogType = 'info' | 'hypothesis' | 'test' | 'result' | 'warning' | 'error' | 'system';

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
