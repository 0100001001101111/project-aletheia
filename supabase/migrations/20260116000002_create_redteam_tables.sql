-- ============================================================================
-- Create Red-Team / Flagging System Tables
-- Methodology scrutiny and skeptic dashboard
-- ============================================================================

-- Result flags table
CREATE TABLE IF NOT EXISTS aletheia_result_flags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  result_id UUID NOT NULL REFERENCES aletheia_prediction_results(id) ON DELETE CASCADE,
  flagger_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Flaw classification
  flaw_type TEXT NOT NULL CHECK (flaw_type IN (
    'sensory_leakage',    -- Could they have seen/heard the answer?
    'selection_bias',     -- Were targets cherry-picked?
    'statistical_error',  -- Math problem
    'protocol_violation', -- Broke the rules
    'data_integrity',     -- Data looks tampered
    'other'
  )),

  -- Details
  description TEXT NOT NULL,
  evidence TEXT,
  severity TEXT DEFAULT 'minor' CHECK (severity IN ('minor', 'major', 'fatal')),

  -- Resolution
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'acknowledged', 'disputed', 'resolved', 'rejected')),
  resolution_notes TEXT,
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add methodology points column to testers if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'aletheia_prediction_testers'
    AND column_name = 'methodology_points'
  ) THEN
    ALTER TABLE aletheia_prediction_testers
    ADD COLUMN methodology_points INTEGER DEFAULT 0;
  END IF;
END $$;

-- Methodology points history
CREATE TABLE IF NOT EXISTS aletheia_methodology_points_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tester_id UUID REFERENCES aletheia_prediction_testers(id) ON DELETE SET NULL,
  points INTEGER NOT NULL,
  reason TEXT NOT NULL,
  flag_id UUID REFERENCES aletheia_result_flags(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for flags
CREATE INDEX IF NOT EXISTS idx_result_flags_result_id ON aletheia_result_flags(result_id);
CREATE INDEX IF NOT EXISTS idx_result_flags_flagger_id ON aletheia_result_flags(flagger_id);
CREATE INDEX IF NOT EXISTS idx_result_flags_status ON aletheia_result_flags(status);
CREATE INDEX IF NOT EXISTS idx_result_flags_flaw_type ON aletheia_result_flags(flaw_type);
CREATE INDEX IF NOT EXISTS idx_result_flags_severity ON aletheia_result_flags(severity);
CREATE INDEX IF NOT EXISTS idx_result_flags_created_at ON aletheia_result_flags(created_at DESC);

-- Indexes for MP log
CREATE INDEX IF NOT EXISTS idx_mp_log_user_id ON aletheia_methodology_points_log(user_id);
CREATE INDEX IF NOT EXISTS idx_mp_log_created_at ON aletheia_methodology_points_log(created_at DESC);

-- Enable RLS
ALTER TABLE aletheia_result_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE aletheia_methodology_points_log ENABLE ROW LEVEL SECURITY;

-- Flags policies: public read, authenticated insert, admin update
CREATE POLICY "Flags viewable by all"
  ON aletheia_result_flags FOR SELECT
  USING (true);

CREATE POLICY "Flags insertable by authenticated"
  ON aletheia_result_flags FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Flags updatable by submitter owner or admin"
  ON aletheia_result_flags FOR UPDATE
  USING (
    -- Result submitter can acknowledge/dispute
    result_id IN (
      SELECT r.id FROM aletheia_prediction_results r
      JOIN aletheia_prediction_testers t ON r.tester_id = t.id
      WHERE t.user_id = auth.uid()
    )
    -- Or admin
    OR EXISTS (
      SELECT 1 FROM aletheia_users
      WHERE id = auth.uid()
      AND verification_level = 'phd'
    )
  );

-- MP log policies: user can see their own, all can see recent
CREATE POLICY "MP log viewable by owner"
  ON aletheia_methodology_points_log FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "MP log insertable by system"
  ON aletheia_methodology_points_log FOR INSERT
  WITH CHECK (true); -- Controlled by API

-- Function to award/deduct methodology points
CREATE OR REPLACE FUNCTION award_methodology_points(
  p_user_id UUID,
  p_points INTEGER,
  p_reason TEXT,
  p_flag_id UUID DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  v_tester_id UUID;
BEGIN
  -- Find or create tester record
  SELECT id INTO v_tester_id
  FROM aletheia_prediction_testers
  WHERE user_id = p_user_id
  LIMIT 1;

  IF v_tester_id IS NULL THEN
    INSERT INTO aletheia_prediction_testers (user_id, methodology_points)
    VALUES (p_user_id, GREATEST(0, p_points))
    RETURNING id INTO v_tester_id;
  ELSE
    UPDATE aletheia_prediction_testers
    SET methodology_points = GREATEST(0, methodology_points + p_points)
    WHERE id = v_tester_id;
  END IF;

  -- Log the change
  INSERT INTO aletheia_methodology_points_log (user_id, tester_id, points, reason, flag_id)
  VALUES (p_user_id, v_tester_id, p_points, p_reason, p_flag_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION award_methodology_points(UUID, INTEGER, TEXT, UUID) TO authenticated;

-- Auto-update trigger
CREATE TRIGGER trigger_result_flags_updated_at
  BEFORE UPDATE ON aletheia_result_flags
  FOR EACH ROW EXECUTE FUNCTION aletheia_update_updated_at();
