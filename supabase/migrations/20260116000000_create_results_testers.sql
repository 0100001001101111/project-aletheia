-- ============================================================================
-- Create Prediction Results and Testers Tables
-- Enables Simple Mode submission and result tracking for predictions
-- ============================================================================

-- Create testers table first (results references it)
CREATE TABLE IF NOT EXISTS aletheia_prediction_testers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  display_name TEXT,
  anonymous BOOLEAN DEFAULT false,
  methodology_points INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create results table
CREATE TABLE IF NOT EXISTS aletheia_prediction_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  prediction_id UUID NOT NULL REFERENCES aletheia_predictions(id) ON DELETE CASCADE,
  tester_id UUID REFERENCES aletheia_prediction_testers(id) ON DELETE SET NULL,

  -- Simple Mode fields
  submission_mode TEXT NOT NULL DEFAULT 'advanced' CHECK (submission_mode IN ('simple', 'advanced')),
  trials INTEGER,
  hits INTEGER,
  description TEXT,

  -- Calculated/submitted fields
  effect_observed BOOLEAN NOT NULL,
  p_value DECIMAL,
  sample_size INTEGER,
  effect_size DECIMAL,

  -- Advanced Mode fields
  methodology TEXT,
  deviations_from_protocol TEXT,
  plain_summary TEXT,
  preregistration_url TEXT,
  publication_url TEXT,
  raw_data JSONB,

  -- Quality scoring (multiplicative: I x T x D x B x 10)
  isolation_score DECIMAL DEFAULT 1.0 CHECK (isolation_score >= 0 AND isolation_score <= 1),
  target_selection_score DECIMAL DEFAULT 1.0 CHECK (target_selection_score >= 0 AND target_selection_score <= 1),
  data_integrity_score DECIMAL DEFAULT 1.0 CHECK (data_integrity_score >= 0 AND data_integrity_score <= 1),
  baseline_score DECIMAL DEFAULT 1.0 CHECK (baseline_score >= 0 AND baseline_score <= 1),
  quality_score DECIMAL GENERATED ALWAYS AS (
    isolation_score * target_selection_score * data_integrity_score * baseline_score * 10
  ) STORED,

  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected', 'contested')),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for results
CREATE INDEX IF NOT EXISTS idx_prediction_results_prediction_id ON aletheia_prediction_results(prediction_id);
CREATE INDEX IF NOT EXISTS idx_prediction_results_tester_id ON aletheia_prediction_results(tester_id);
CREATE INDEX IF NOT EXISTS idx_prediction_results_created_at ON aletheia_prediction_results(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_prediction_results_quality_score ON aletheia_prediction_results(quality_score DESC);

-- Indexes for testers
CREATE INDEX IF NOT EXISTS idx_prediction_testers_user_id ON aletheia_prediction_testers(user_id);
CREATE INDEX IF NOT EXISTS idx_prediction_testers_methodology_points ON aletheia_prediction_testers(methodology_points DESC);

-- Enable RLS
ALTER TABLE aletheia_prediction_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE aletheia_prediction_testers ENABLE ROW LEVEL SECURITY;

-- Results policies: public read, authenticated insert, owner update
CREATE POLICY "Results viewable by all"
  ON aletheia_prediction_results FOR SELECT
  USING (true);

CREATE POLICY "Results insertable by authenticated"
  ON aletheia_prediction_results FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Results updatable by tester"
  ON aletheia_prediction_results FOR UPDATE
  USING (
    tester_id IN (
      SELECT id FROM aletheia_prediction_testers WHERE user_id = auth.uid()
    )
  );

-- Testers policies: public read, authenticated insert/update own
CREATE POLICY "Testers viewable by all"
  ON aletheia_prediction_testers FOR SELECT
  USING (true);

CREATE POLICY "Testers insertable by authenticated"
  ON aletheia_prediction_testers FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Testers updatable by owner"
  ON aletheia_prediction_testers FOR UPDATE
  USING (user_id = auth.uid());

-- Auto-update trigger for results
CREATE TRIGGER trigger_prediction_results_updated_at
  BEFORE UPDATE ON aletheia_prediction_results
  FOR EACH ROW EXECUTE FUNCTION aletheia_update_updated_at();
