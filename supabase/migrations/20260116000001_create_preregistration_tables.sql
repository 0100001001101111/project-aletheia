-- ============================================================================
-- Create Pre-Registration Tables
-- Cryptographic timestamps for prediction testing with embargo support
-- ============================================================================

-- Pre-registrations table
CREATE TABLE IF NOT EXISTS aletheia_preregistrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  prediction_id UUID NOT NULL REFERENCES aletheia_predictions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Cryptographic timestamp
  hash_id VARCHAR(12) NOT NULL UNIQUE,
  content_hash TEXT NOT NULL, -- SHA-256 of protocol

  -- Protocol details
  protocol TEXT NOT NULL,
  hypothesis TEXT NOT NULL,
  methodology TEXT NOT NULL,
  expected_sample_size INTEGER,
  analysis_plan TEXT,

  -- Embargo
  embargoed BOOLEAN DEFAULT false,
  embargo_until TIMESTAMPTZ,

  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'withdrawn')),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add pre-registration link to results table
ALTER TABLE aletheia_prediction_results
ADD COLUMN IF NOT EXISTS preregistration_id UUID REFERENCES aletheia_preregistrations(id) ON DELETE SET NULL;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_preregistrations_hash_id ON aletheia_preregistrations(hash_id);
CREATE INDEX IF NOT EXISTS idx_preregistrations_prediction_id ON aletheia_preregistrations(prediction_id);
CREATE INDEX IF NOT EXISTS idx_preregistrations_user_id ON aletheia_preregistrations(user_id);
CREATE INDEX IF NOT EXISTS idx_preregistrations_status ON aletheia_preregistrations(status);
CREATE INDEX IF NOT EXISTS idx_preregistrations_created_at ON aletheia_preregistrations(created_at DESC);

-- Enable RLS
ALTER TABLE aletheia_preregistrations ENABLE ROW LEVEL SECURITY;

-- Policies: Public read (unless embargoed), authenticated insert, owner update
CREATE POLICY "Pre-registrations viewable when not embargoed"
  ON aletheia_preregistrations FOR SELECT
  USING (
    embargoed = false
    OR embargo_until < NOW()
    OR user_id = auth.uid()
  );

CREATE POLICY "Pre-registrations insertable by authenticated"
  ON aletheia_preregistrations FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Pre-registrations updatable by owner"
  ON aletheia_preregistrations FOR UPDATE
  USING (user_id = auth.uid());

-- Auto-update trigger
CREATE TRIGGER trigger_preregistrations_updated_at
  BEFORE UPDATE ON aletheia_preregistrations
  FOR EACH ROW EXECUTE FUNCTION aletheia_update_updated_at();

-- Function to generate unique hash ID
CREATE OR REPLACE FUNCTION generate_prereg_hash_id()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..12 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;
