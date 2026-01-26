-- Agent Tables for Aletheia Research Agent
-- Phase 1: Foundation

-- Agent session logs
CREATE TABLE aletheia_agent_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  status VARCHAR(20) DEFAULT 'running',
  hypotheses_generated INTEGER DEFAULT 0,
  tests_run INTEGER DEFAULT 0,
  findings_queued INTEGER DEFAULT 0,
  trigger_type VARCHAR(50),
  summary TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agent log entries (terminal output)
CREATE TABLE aletheia_agent_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES aletheia_agent_sessions(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  log_type VARCHAR(20),
  message TEXT NOT NULL,
  data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for efficient log retrieval
CREATE INDEX idx_agent_logs_session_timestamp ON aletheia_agent_logs(session_id, timestamp DESC);

-- Agent-generated hypotheses
CREATE TABLE aletheia_agent_hypotheses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES aletheia_agent_sessions(id) ON DELETE CASCADE,
  hypothesis_text TEXT NOT NULL,
  display_title TEXT,
  domains TEXT[],
  source_pattern JSONB,
  confidence DECIMAL(4,3),
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agent test results
CREATE TABLE aletheia_agent_tests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hypothesis_id UUID REFERENCES aletheia_agent_hypotheses(id) ON DELETE CASCADE,
  session_id UUID REFERENCES aletheia_agent_sessions(id) ON DELETE CASCADE,
  test_type VARCHAR(50),
  parameters JSONB,
  results JSONB,
  p_value DECIMAL(10,9),
  effect_size DECIMAL(6,4),
  sample_size INTEGER,
  passed_threshold BOOLEAN,
  confounds_checked TEXT[],
  confounds_survived BOOLEAN,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agent findings queue
CREATE TABLE aletheia_agent_findings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hypothesis_id UUID REFERENCES aletheia_agent_hypotheses(id) ON DELETE SET NULL,
  session_id UUID REFERENCES aletheia_agent_sessions(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  display_title TEXT NOT NULL,
  summary TEXT NOT NULL,
  technical_details JSONB,
  supporting_tests UUID[],
  effect_survived_controls BOOLEAN,
  confidence DECIMAL(4,3),
  suggested_prediction TEXT,
  review_status VARCHAR(20) DEFAULT 'pending',
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  created_prediction_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agent configuration
CREATE TABLE aletheia_agent_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key VARCHAR(100) UNIQUE NOT NULL,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Default config values
INSERT INTO aletheia_agent_config (key, value, description) VALUES
('run_interval_hours', '6', 'Hours between scheduled runs'),
('min_sample_size', '30', 'Minimum sample size for tests'),
('significance_threshold', '0.01', 'p-value threshold for significance'),
('effect_size_threshold', '0.3', 'Minimum effect size (Cohen''s d)'),
('max_hypotheses_per_session', '10', 'Limit hypotheses per run'),
('enabled', 'true', 'Agent active status');

-- RLS Policies

-- Enable RLS on all tables
ALTER TABLE aletheia_agent_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE aletheia_agent_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE aletheia_agent_hypotheses ENABLE ROW LEVEL SECURITY;
ALTER TABLE aletheia_agent_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE aletheia_agent_findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE aletheia_agent_config ENABLE ROW LEVEL SECURITY;

-- Public read access to sessions (for terminal UI)
CREATE POLICY "Public read access to agent sessions"
  ON aletheia_agent_sessions FOR SELECT
  USING (true);

-- Public read access to logs (for terminal UI)
CREATE POLICY "Public read access to agent logs"
  ON aletheia_agent_logs FOR SELECT
  USING (true);

-- Public read access to hypotheses
CREATE POLICY "Public read access to agent hypotheses"
  ON aletheia_agent_hypotheses FOR SELECT
  USING (true);

-- Public read access to tests
CREATE POLICY "Public read access to agent tests"
  ON aletheia_agent_tests FOR SELECT
  USING (true);

-- Public read access to findings
CREATE POLICY "Public read access to agent findings"
  ON aletheia_agent_findings FOR SELECT
  USING (true);

-- Public read access to config
CREATE POLICY "Public read access to agent config"
  ON aletheia_agent_config FOR SELECT
  USING (true);

-- Service role has full access (for agent runner)
CREATE POLICY "Service role full access to sessions"
  ON aletheia_agent_sessions FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to logs"
  ON aletheia_agent_logs FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to hypotheses"
  ON aletheia_agent_hypotheses FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to tests"
  ON aletheia_agent_tests FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to findings"
  ON aletheia_agent_findings FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to config"
  ON aletheia_agent_config FOR ALL
  USING (auth.role() = 'service_role');

-- Enable Realtime for logs table (for terminal streaming)
ALTER PUBLICATION supabase_realtime ADD TABLE aletheia_agent_logs;
