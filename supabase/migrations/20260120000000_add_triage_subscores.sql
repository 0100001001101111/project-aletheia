-- ============================================================================
-- Add Triage Subscores and Quality Scoring Columns
-- Supports multiplicative quality scoring and detailed breakdown
-- ============================================================================

-- Add triage subscore columns to investigations table
ALTER TABLE aletheia_investigations
ADD COLUMN IF NOT EXISTS triage_source_integrity INTEGER DEFAULT 0 CHECK (triage_source_integrity >= 0 AND triage_source_integrity <= 3),
ADD COLUMN IF NOT EXISTS triage_methodology INTEGER DEFAULT 0 CHECK (triage_methodology >= 0 AND triage_methodology <= 3),
ADD COLUMN IF NOT EXISTS triage_variable_capture INTEGER DEFAULT 0 CHECK (triage_variable_capture >= 0 AND triage_variable_capture <= 2),
ADD COLUMN IF NOT EXISTS triage_data_quality INTEGER DEFAULT 0 CHECK (triage_data_quality >= 0 AND triage_data_quality <= 2),
ADD COLUMN IF NOT EXISTS triage_recommendations TEXT[];

-- Add quality score columns to prediction_results if not exist
DO $$
BEGIN
  -- submission_mode
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'aletheia_prediction_results' AND column_name = 'submission_mode'
  ) THEN
    ALTER TABLE aletheia_prediction_results
    ADD COLUMN submission_mode TEXT DEFAULT 'advanced' CHECK (submission_mode IN ('simple', 'advanced'));
  END IF;

  -- trials (for Simple Mode)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'aletheia_prediction_results' AND column_name = 'trials'
  ) THEN
    ALTER TABLE aletheia_prediction_results ADD COLUMN trials INTEGER;
  END IF;

  -- hits (for Simple Mode)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'aletheia_prediction_results' AND column_name = 'hits'
  ) THEN
    ALTER TABLE aletheia_prediction_results ADD COLUMN hits INTEGER;
  END IF;

  -- description
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'aletheia_prediction_results' AND column_name = 'description'
  ) THEN
    ALTER TABLE aletheia_prediction_results ADD COLUMN description TEXT;
  END IF;

  -- Quality scores (multiplicative)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'aletheia_prediction_results' AND column_name = 'isolation_score'
  ) THEN
    ALTER TABLE aletheia_prediction_results
    ADD COLUMN isolation_score DECIMAL DEFAULT 1.0 CHECK (isolation_score >= 0 AND isolation_score <= 1);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'aletheia_prediction_results' AND column_name = 'target_selection_score'
  ) THEN
    ALTER TABLE aletheia_prediction_results
    ADD COLUMN target_selection_score DECIMAL DEFAULT 1.0 CHECK (target_selection_score >= 0 AND target_selection_score <= 1);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'aletheia_prediction_results' AND column_name = 'data_integrity_score'
  ) THEN
    ALTER TABLE aletheia_prediction_results
    ADD COLUMN data_integrity_score DECIMAL DEFAULT 1.0 CHECK (data_integrity_score >= 0 AND data_integrity_score <= 1);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'aletheia_prediction_results' AND column_name = 'baseline_score'
  ) THEN
    ALTER TABLE aletheia_prediction_results
    ADD COLUMN baseline_score DECIMAL DEFAULT 1.0 CHECK (baseline_score >= 0 AND baseline_score <= 1);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'aletheia_prediction_results' AND column_name = 'quality_score'
  ) THEN
    ALTER TABLE aletheia_prediction_results ADD COLUMN quality_score DECIMAL;
  END IF;
END $$;

-- Add submitted_by column if not exists (for older tables)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'aletheia_prediction_results' AND column_name = 'submitted_by'
  ) THEN
    ALTER TABLE aletheia_prediction_results
    ADD COLUMN submitted_by UUID REFERENCES aletheia_users(id);
  END IF;
END $$;

-- Add submitted_at column if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'aletheia_prediction_results' AND column_name = 'submitted_at'
  ) THEN
    ALTER TABLE aletheia_prediction_results
    ADD COLUMN submitted_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- Add verification_status column if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'aletheia_prediction_results' AND column_name = 'verification_status'
  ) THEN
    ALTER TABLE aletheia_prediction_results
    ADD COLUMN verification_status TEXT DEFAULT 'pending'
    CHECK (verification_status IN ('pending', 'verified', 'rejected'));
  END IF;
END $$;

-- Create index for quality score filtering
CREATE INDEX IF NOT EXISTS idx_prediction_results_quality_score
ON aletheia_prediction_results(quality_score);

-- Create index for triage status filtering
CREATE INDEX IF NOT EXISTS idx_investigations_triage_status
ON aletheia_investigations(triage_status);

-- Create index for triage score filtering
CREATE INDEX IF NOT EXISTS idx_investigations_triage_score
ON aletheia_investigations(triage_score);

-- Add trigger to auto-calculate quality_score on insert/update
CREATE OR REPLACE FUNCTION calculate_quality_score()
RETURNS TRIGGER AS $$
BEGIN
  NEW.quality_score := COALESCE(NEW.isolation_score, 1.0)
                     * COALESCE(NEW.target_selection_score, 1.0)
                     * COALESCE(NEW.data_integrity_score, 1.0)
                     * COALESCE(NEW.baseline_score, 1.0)
                     * 10;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS trigger_calculate_quality_score ON aletheia_prediction_results;
CREATE TRIGGER trigger_calculate_quality_score
  BEFORE INSERT OR UPDATE OF isolation_score, target_selection_score, data_integrity_score, baseline_score
  ON aletheia_prediction_results
  FOR EACH ROW EXECUTE FUNCTION calculate_quality_score();

-- Add credibility_points_earned column to contributions if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'aletheia_contributions' AND column_name = 'credibility_points_earned'
  ) THEN
    ALTER TABLE aletheia_contributions ADD COLUMN credibility_points_earned INTEGER DEFAULT 0;
  END IF;
END $$;

-- Create function to increment credibility (if not exists)
CREATE OR REPLACE FUNCTION increment_credibility(p_user_id UUID, p_points INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE aletheia_users
  SET credibility_score = LEAST(100, GREATEST(0, credibility_score + p_points)),
      updated_at = NOW()
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION increment_credibility(UUID, INTEGER) TO authenticated;
