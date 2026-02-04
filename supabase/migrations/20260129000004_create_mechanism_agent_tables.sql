-- Mechanism Agent Tables (Phase 6d)
-- Explanatory theory hunting and discriminating tests

-- Mechanism Inventory: Proposed explanations for phenomena
CREATE TABLE IF NOT EXISTS aletheia_mechanisms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Mechanism details
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  mechanism_type TEXT NOT NULL CHECK (mechanism_type IN (
    'neurological', 'psychological', 'physical', 'quantum',
    'informational', 'consciousness', 'interdimensional', 'unknown'
  )),

  -- Domain applicability
  primary_domain TEXT NOT NULL,
  applicable_domains TEXT[] NOT NULL,

  -- Scientific basis
  theoretical_basis TEXT,
  key_proponents TEXT[],
  key_papers TEXT[],

  -- Predictions
  predictions JSONB, -- [{prediction, testable, tested, supported}]

  -- Evaluation
  evidence_for TEXT[],
  evidence_against TEXT[],
  overall_support TEXT CHECK (overall_support IN ('strong', 'moderate', 'weak', 'mixed', 'untested')),

  -- Metadata
  created_by TEXT DEFAULT 'agent',
  verified BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Discriminating Tests: Tests that could distinguish between mechanisms
CREATE TABLE IF NOT EXISTS aletheia_discriminating_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID,

  -- Test definition
  test_name TEXT NOT NULL,
  test_description TEXT NOT NULL,
  test_type TEXT NOT NULL CHECK (test_type IN (
    'prediction_comparison', 'exclusive_outcome', 'boundary_condition',
    'quantitative_difference', 'temporal_sequence', 'correlation_pattern'
  )),

  -- Mechanisms being compared
  mechanism_ids UUID[],
  mechanism_names TEXT[] NOT NULL,

  -- What each mechanism predicts
  predictions JSONB NOT NULL, -- {mechanism_name: {predicts, confidence}}

  -- Test status
  test_status TEXT DEFAULT 'proposed' CHECK (test_status IN ('proposed', 'in_progress', 'completed', 'abandoned')),
  test_result TEXT,
  supported_mechanism TEXT,

  -- Data requirements
  data_available BOOLEAN DEFAULT false,
  data_requirements TEXT,

  -- Metadata
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('critical', 'high', 'medium', 'low')),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Unified Theories: Attempts to explain multiple domains with one mechanism
CREATE TABLE IF NOT EXISTS aletheia_unified_theories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID,

  -- Theory details
  theory_name TEXT NOT NULL,
  theory_description TEXT NOT NULL,
  core_mechanism TEXT NOT NULL,

  -- Domains explained
  domains_explained TEXT[] NOT NULL,
  explanation_per_domain JSONB, -- {domain: explanation}

  -- Predictions
  unique_predictions TEXT[],
  cross_domain_predictions TEXT[],

  -- Evaluation
  internal_consistency_score DECIMAL(3,2),
  empirical_support_score DECIMAL(3,2),
  parsimony_score DECIMAL(3,2),
  overall_plausibility TEXT CHECK (overall_plausibility IN ('high', 'medium', 'low', 'speculative')),

  -- Comparison to alternatives
  compared_to TEXT[],
  advantages TEXT[],
  disadvantages TEXT[],

  -- Status
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'under_review', 'published', 'deprecated')),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Mechanism-Evidence Links: Track evidence supporting/refuting mechanisms
CREATE TABLE IF NOT EXISTS aletheia_mechanism_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  mechanism_id UUID REFERENCES aletheia_mechanisms(id) ON DELETE CASCADE,
  evidence_type TEXT NOT NULL CHECK (evidence_type IN (
    'statistical', 'case_study', 'experimental', 'theoretical', 'replication'
  )),

  -- Evidence details
  description TEXT NOT NULL,
  source TEXT,
  source_url TEXT,

  -- Direction
  supports BOOLEAN NOT NULL, -- true = supports, false = refutes
  strength TEXT CHECK (strength IN ('strong', 'moderate', 'weak')),

  -- Quantitative
  effect_size DECIMAL(6,4),
  p_value DECIMAL(10,8),
  sample_size INTEGER,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Mechanism Agent Sessions
CREATE TABLE IF NOT EXISTS aletheia_mechanism_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Session info
  status TEXT DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed')),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,

  -- Configuration
  domains_analyzed TEXT[],
  focus_areas TEXT[], -- specific mechanism types to focus on

  -- Results summary
  mechanisms_cataloged INTEGER DEFAULT 0,
  tests_designed INTEGER DEFAULT 0,
  theories_proposed INTEGER DEFAULT 0,

  -- Key findings
  novel_mechanisms JSONB,
  critical_tests JSONB,

  summary TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_mechanisms_domain ON aletheia_mechanisms(primary_domain);
CREATE INDEX IF NOT EXISTS idx_mechanisms_type ON aletheia_mechanisms(mechanism_type);
CREATE INDEX IF NOT EXISTS idx_mechanisms_support ON aletheia_mechanisms(overall_support);

CREATE INDEX IF NOT EXISTS idx_discriminating_tests_status ON aletheia_discriminating_tests(test_status);
CREATE INDEX IF NOT EXISTS idx_discriminating_tests_priority ON aletheia_discriminating_tests(priority);

CREATE INDEX IF NOT EXISTS idx_unified_theories_plausibility ON aletheia_unified_theories(overall_plausibility);

CREATE INDEX IF NOT EXISTS idx_mechanism_evidence_mechanism ON aletheia_mechanism_evidence(mechanism_id);
CREATE INDEX IF NOT EXISTS idx_mechanism_evidence_supports ON aletheia_mechanism_evidence(supports);

CREATE INDEX IF NOT EXISTS idx_mechanism_sessions_status ON aletheia_mechanism_sessions(status);

-- RLS
ALTER TABLE aletheia_mechanisms ENABLE ROW LEVEL SECURITY;
ALTER TABLE aletheia_discriminating_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE aletheia_unified_theories ENABLE ROW LEVEL SECURITY;
ALTER TABLE aletheia_mechanism_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE aletheia_mechanism_sessions ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Allow public read mech" ON aletheia_mechanisms FOR SELECT USING (true);
CREATE POLICY "Allow public read dt" ON aletheia_discriminating_tests FOR SELECT USING (true);
CREATE POLICY "Allow public read ut" ON aletheia_unified_theories FOR SELECT USING (true);
CREATE POLICY "Allow public read me" ON aletheia_mechanism_evidence FOR SELECT USING (true);
CREATE POLICY "Allow public read ms" ON aletheia_mechanism_sessions FOR SELECT USING (true);
