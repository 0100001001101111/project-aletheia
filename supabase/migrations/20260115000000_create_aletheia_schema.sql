-- =====================================================
-- Project Aletheia Database Schema
-- Cross-domain anomalous phenomena research platform
-- =====================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- ENUM TYPES
-- =====================================================

-- User identity classification
CREATE TYPE aletheia_identity_type AS ENUM (
  'public',
  'anonymous_verified',
  'anonymous_unverified'
);

-- Verification/credential levels
CREATE TYPE aletheia_verification_level AS ENUM (
  'none',
  'phd',
  'researcher',
  'lab_tech',
  'independent'
);

-- Investigation domains (the 5 schema types)
CREATE TYPE aletheia_investigation_type AS ENUM (
  'nde',                -- Near-death experiences
  'ganzfeld',           -- Ganzfeld/psi experiments
  'crisis_apparition',  -- Crisis apparitions
  'stargate',           -- Remote viewing (Stargate-style)
  'geophysical'         -- Geophysical anomalies
);

-- Triage workflow status
CREATE TYPE aletheia_triage_status AS ENUM (
  'pending',
  'provisional',
  'verified',
  'rejected'
);

-- Prediction lifecycle status
CREATE TYPE aletheia_prediction_status AS ENUM (
  'open',
  'testing',
  'confirmed',
  'refuted',
  'pending'
);

-- Contribution types
CREATE TYPE aletheia_contribution_type AS ENUM (
  'submission',
  'validation',
  'refutation',
  'replication'
);

-- =====================================================
-- CORE TABLES
-- =====================================================

-- Users table (supports anonymous + verified researchers)
CREATE TABLE aletheia_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE, -- Nullable for anonymous users
  display_name TEXT NOT NULL,
  identity_type aletheia_identity_type NOT NULL DEFAULT 'anonymous_unverified',
  verification_level aletheia_verification_level NOT NULL DEFAULT 'none',
  credibility_score FLOAT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Investigations - the core data submissions
CREATE TABLE aletheia_investigations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES aletheia_users(id) ON DELETE CASCADE,
  investigation_type aletheia_investigation_type NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  raw_data JSONB NOT NULL DEFAULT '{}', -- Schema-validated structured data
  raw_narrative TEXT, -- Original narrative if submitted
  triage_score INTEGER CHECK (triage_score >= 0 AND triage_score <= 10),
  triage_status aletheia_triage_status NOT NULL DEFAULT 'pending',
  triage_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Predictions - hypotheses generated from pattern analysis
CREATE TABLE aletheia_predictions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hypothesis TEXT NOT NULL,
  confidence_score FLOAT NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),
  status aletheia_prediction_status NOT NULL DEFAULT 'open',
  source_investigations UUID[] NOT NULL DEFAULT '{}', -- Array of investigation IDs
  domains_involved aletheia_investigation_type[] NOT NULL DEFAULT '{}',
  p_value FLOAT CHECK (p_value >= 0 AND p_value <= 1),
  brier_score FLOAT CHECK (brier_score >= 0 AND brier_score <= 1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Pattern matches - cross-domain correlations discovered
CREATE TABLE aletheia_pattern_matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pattern_description TEXT NOT NULL,
  investigations_matched UUID[] NOT NULL DEFAULT '{}',
  domains_matched aletheia_investigation_type[] NOT NULL DEFAULT '{}',
  prevalence_score FLOAT NOT NULL DEFAULT 0, -- Appears in how many domains
  reliability_score FLOAT NOT NULL DEFAULT 0, -- P-value consistency
  volatility_score FLOAT NOT NULL DEFAULT 0, -- Stability with new data
  confidence_score FLOAT NOT NULL DEFAULT 0, -- Combined C_s
  generated_prediction_id UUID REFERENCES aletheia_predictions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Contributions - tracks user participation and credibility
CREATE TABLE aletheia_contributions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES aletheia_users(id) ON DELETE CASCADE,
  investigation_id UUID NOT NULL REFERENCES aletheia_investigations(id) ON DELETE CASCADE,
  contribution_type aletheia_contribution_type NOT NULL,
  credibility_points_earned FLOAT NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Triage reviews - quality scoring for investigations
CREATE TABLE aletheia_triage_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  investigation_id UUID NOT NULL REFERENCES aletheia_investigations(id) ON DELETE CASCADE,
  reviewer_id UUID REFERENCES aletheia_users(id) ON DELETE SET NULL, -- Nullable for system reviews
  source_integrity_score INTEGER NOT NULL CHECK (source_integrity_score >= 0 AND source_integrity_score <= 3),
  methodology_score INTEGER NOT NULL CHECK (methodology_score >= 0 AND methodology_score <= 3),
  variable_capture_score INTEGER NOT NULL CHECK (variable_capture_score >= 0 AND variable_capture_score <= 2),
  overall_score INTEGER NOT NULL CHECK (overall_score >= 0 AND overall_score <= 10),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- INDEXES
-- =====================================================

-- Investigations indexes
CREATE INDEX idx_aletheia_investigations_user_id ON aletheia_investigations(user_id);
CREATE INDEX idx_aletheia_investigations_type ON aletheia_investigations(investigation_type);
CREATE INDEX idx_aletheia_investigations_triage_status ON aletheia_investigations(triage_status);
CREATE INDEX idx_aletheia_investigations_created_at ON aletheia_investigations(created_at DESC);

-- Predictions indexes
CREATE INDEX idx_aletheia_predictions_status ON aletheia_predictions(status);
CREATE INDEX idx_aletheia_predictions_confidence ON aletheia_predictions(confidence_score DESC);
CREATE INDEX idx_aletheia_predictions_created_at ON aletheia_predictions(created_at DESC);

-- Pattern matches indexes
CREATE INDEX idx_aletheia_pattern_matches_confidence ON aletheia_pattern_matches(confidence_score DESC);
CREATE INDEX idx_aletheia_pattern_matches_created_at ON aletheia_pattern_matches(created_at DESC);

-- Contributions indexes
CREATE INDEX idx_aletheia_contributions_user_id ON aletheia_contributions(user_id);
CREATE INDEX idx_aletheia_contributions_investigation_id ON aletheia_contributions(investigation_id);

-- Triage reviews indexes
CREATE INDEX idx_aletheia_triage_reviews_investigation_id ON aletheia_triage_reviews(investigation_id);

-- GIN indexes for array columns (for efficient containment queries)
CREATE INDEX idx_aletheia_predictions_domains ON aletheia_predictions USING GIN(domains_involved);
CREATE INDEX idx_aletheia_pattern_matches_domains ON aletheia_pattern_matches USING GIN(domains_matched);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE aletheia_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE aletheia_investigations ENABLE ROW LEVEL SECURITY;
ALTER TABLE aletheia_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE aletheia_pattern_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE aletheia_contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE aletheia_triage_reviews ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view their own profile"
  ON aletheia_users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON aletheia_users FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all users"
  ON aletheia_users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM aletheia_users
      WHERE id = auth.uid()
      AND verification_level = 'phd'
    )
  );

-- Investigations policies
CREATE POLICY "Anyone can view verified investigations"
  ON aletheia_investigations FOR SELECT
  USING (triage_status = 'verified');

CREATE POLICY "Users can view their own investigations"
  ON aletheia_investigations FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own investigations"
  ON aletheia_investigations FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own investigations"
  ON aletheia_investigations FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own investigations"
  ON aletheia_investigations FOR DELETE
  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all investigations"
  ON aletheia_investigations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM aletheia_users
      WHERE id = auth.uid()
      AND verification_level = 'phd'
    )
  );

-- Predictions policies (public read, admin write)
CREATE POLICY "Anyone can view predictions"
  ON aletheia_predictions FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage predictions"
  ON aletheia_predictions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM aletheia_users
      WHERE id = auth.uid()
      AND verification_level = 'phd'
    )
  );

-- Pattern matches policies (public read, admin write)
CREATE POLICY "Anyone can view pattern matches"
  ON aletheia_pattern_matches FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage pattern matches"
  ON aletheia_pattern_matches FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM aletheia_users
      WHERE id = auth.uid()
      AND verification_level = 'phd'
    )
  );

-- Contributions policies
CREATE POLICY "Users can view their own contributions"
  ON aletheia_contributions FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create contributions"
  ON aletheia_contributions FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all contributions"
  ON aletheia_contributions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM aletheia_users
      WHERE id = auth.uid()
      AND verification_level = 'phd'
    )
  );

-- Triage reviews policies
CREATE POLICY "Users can view reviews on their investigations"
  ON aletheia_triage_reviews FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM aletheia_investigations
      WHERE id = investigation_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Verified researchers can create reviews"
  ON aletheia_triage_reviews FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM aletheia_users
      WHERE id = auth.uid()
      AND verification_level IN ('phd', 'researcher')
    )
  );

CREATE POLICY "Admins can manage all reviews"
  ON aletheia_triage_reviews FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM aletheia_users
      WHERE id = auth.uid()
      AND verification_level = 'phd'
    )
  );

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION aletheia_update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_aletheia_users_updated_at
  BEFORE UPDATE ON aletheia_users
  FOR EACH ROW EXECUTE FUNCTION aletheia_update_updated_at();

CREATE TRIGGER trigger_aletheia_investigations_updated_at
  BEFORE UPDATE ON aletheia_investigations
  FOR EACH ROW EXECUTE FUNCTION aletheia_update_updated_at();

CREATE TRIGGER trigger_aletheia_predictions_updated_at
  BEFORE UPDATE ON aletheia_predictions
  FOR EACH ROW EXECUTE FUNCTION aletheia_update_updated_at();

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Calculate overall triage score from individual components
CREATE OR REPLACE FUNCTION aletheia_calculate_triage_score(
  source_integrity INTEGER,
  methodology INTEGER,
  variable_capture INTEGER
) RETURNS INTEGER AS $$
BEGIN
  -- Weighted formula: source_integrity (3x) + methodology (3x) + variable_capture (2x)
  -- Max: 3*3 + 3*3 + 2*2 = 22, scaled to 0-10
  RETURN ROUND((source_integrity * 3 + methodology * 3 + variable_capture * 2) * 10.0 / 22);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Get cross-domain pattern prevalence
CREATE OR REPLACE FUNCTION aletheia_get_domain_prevalence(investigation_ids UUID[])
RETURNS TABLE (
  domain aletheia_investigation_type,
  count BIGINT,
  percentage NUMERIC
) AS $$
DECLARE
  total_count BIGINT;
BEGIN
  SELECT COUNT(*) INTO total_count FROM aletheia_investigations WHERE id = ANY(investigation_ids);

  RETURN QUERY
  SELECT
    i.investigation_type,
    COUNT(*),
    ROUND(COUNT(*) * 100.0 / NULLIF(total_count, 0), 2)
  FROM aletheia_investigations i
  WHERE i.id = ANY(investigation_ids)
  GROUP BY i.investigation_type
  ORDER BY COUNT(*) DESC;
END;
$$ LANGUAGE plpgsql STABLE;
