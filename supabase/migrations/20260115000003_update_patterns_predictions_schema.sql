-- ============================================================================
-- Update Patterns and Predictions Schema
-- Adds additional columns needed for pattern detection and prediction tracking
-- ============================================================================

-- Add new columns to pattern_matches if they don't exist
DO $$
BEGIN
  -- Variable column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'aletheia_pattern_matches' AND column_name = 'variable') THEN
    ALTER TABLE aletheia_pattern_matches ADD COLUMN variable TEXT;
  END IF;

  -- Correlations column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'aletheia_pattern_matches' AND column_name = 'correlations') THEN
    ALTER TABLE aletheia_pattern_matches ADD COLUMN correlations JSONB;
  END IF;

  -- Prevalence column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'aletheia_pattern_matches' AND column_name = 'prevalence') THEN
    ALTER TABLE aletheia_pattern_matches ADD COLUMN prevalence REAL DEFAULT 0;
  END IF;

  -- Reliability column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'aletheia_pattern_matches' AND column_name = 'reliability') THEN
    ALTER TABLE aletheia_pattern_matches ADD COLUMN reliability REAL DEFAULT 0;
  END IF;

  -- Volatility column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'aletheia_pattern_matches' AND column_name = 'volatility') THEN
    ALTER TABLE aletheia_pattern_matches ADD COLUMN volatility REAL DEFAULT 0;
  END IF;

  -- Sample size column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'aletheia_pattern_matches' AND column_name = 'sample_size') THEN
    ALTER TABLE aletheia_pattern_matches ADD COLUMN sample_size INTEGER DEFAULT 0;
  END IF;

  -- Detected at column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'aletheia_pattern_matches' AND column_name = 'detected_at') THEN
    ALTER TABLE aletheia_pattern_matches ADD COLUMN detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;

  -- Status column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'aletheia_pattern_matches' AND column_name = 'status') THEN
    ALTER TABLE aletheia_pattern_matches ADD COLUMN status TEXT DEFAULT 'active';
  END IF;
END $$;

-- Add new columns to predictions if they don't exist
DO $$
BEGIN
  -- Testing protocol column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'aletheia_predictions' AND column_name = 'testing_protocol') THEN
    ALTER TABLE aletheia_predictions ADD COLUMN testing_protocol TEXT;
  END IF;

  -- Created by column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'aletheia_predictions' AND column_name = 'created_by') THEN
    ALTER TABLE aletheia_predictions ADD COLUMN created_by UUID REFERENCES aletheia_users(id);
  END IF;

  -- Resolved at column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'aletheia_predictions' AND column_name = 'resolved_at') THEN
    ALTER TABLE aletheia_predictions ADD COLUMN resolved_at TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;

-- Create function to increment credibility (if not exists)
CREATE OR REPLACE FUNCTION increment_credibility(user_id UUID, points INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE aletheia_users
  SET credibility_score = GREATEST(0, LEAST(1000, credibility_score + points)),
      updated_at = NOW()
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

-- Create indexes for pattern matching
CREATE INDEX IF NOT EXISTS idx_pattern_matches_variable ON aletheia_pattern_matches(variable);
CREATE INDEX IF NOT EXISTS idx_pattern_matches_confidence ON aletheia_pattern_matches(confidence_score DESC);
CREATE INDEX IF NOT EXISTS idx_pattern_matches_domains ON aletheia_pattern_matches USING GIN(domains);

-- Create indexes for predictions
CREATE INDEX IF NOT EXISTS idx_predictions_status ON aletheia_predictions(status);
CREATE INDEX IF NOT EXISTS idx_predictions_confidence ON aletheia_predictions(confidence_score DESC);
CREATE INDEX IF NOT EXISTS idx_predictions_domains ON aletheia_predictions USING GIN(domains);
CREATE INDEX IF NOT EXISTS idx_predictions_pattern ON aletheia_predictions(pattern_id);

-- Grant permissions
GRANT EXECUTE ON FUNCTION increment_credibility(UUID, INTEGER) TO authenticated;
