-- ============================================================================
-- Create Conflict Resolution Tables
-- Three-tier dispute system with blind jury voting
-- ============================================================================

-- Disputes table
CREATE TABLE IF NOT EXISTS aletheia_disputes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  result_id UUID NOT NULL REFERENCES aletheia_prediction_results(id) ON DELETE CASCADE,
  flag_id UUID REFERENCES aletheia_result_flags(id) ON DELETE SET NULL,

  initiator_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  tier INTEGER DEFAULT 1 CHECK (tier IN (1, 2, 3)),

  -- Tier 1: Data Request
  data_requested TEXT,
  data_provided TEXT,
  data_provided_at TIMESTAMPTZ,
  data_deadline TIMESTAMPTZ,

  -- Tier 2: Blind Jury
  jury_required INTEGER DEFAULT 5,
  jury_decision TEXT CHECK (jury_decision IN ('uphold', 'overturn', 'partial', 'deadlock')),
  jury_votes JSONB DEFAULT '{"uphold": 0, "overturn": 0, "abstain": 0}',

  -- Tier 3: Nullification
  nullification_reason TEXT,
  nullified_by UUID REFERENCES auth.users(id),

  -- Status
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'awaiting_data', 'voting', 'resolved', 'escalated', 'nullified')),
  resolved_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Jury votes table (blind voting)
CREATE TABLE IF NOT EXISTS aletheia_jury_votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dispute_id UUID NOT NULL REFERENCES aletheia_disputes(id) ON DELETE CASCADE,
  juror_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vote TEXT NOT NULL CHECK (vote IN ('uphold', 'overturn', 'abstain')),
  reasoning TEXT,
  anonymous_id TEXT, -- For display purposes
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(dispute_id, juror_id)
);

-- Jury pool (qualified jurors)
CREATE TABLE IF NOT EXISTS aletheia_jury_pool (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  qualified_at TIMESTAMPTZ DEFAULT NOW(),
  cases_served INTEGER DEFAULT 0,
  last_served_at TIMESTAMPTZ,
  opted_out BOOLEAN DEFAULT false
);

-- Indexes for disputes
CREATE INDEX IF NOT EXISTS idx_disputes_result_id ON aletheia_disputes(result_id);
CREATE INDEX IF NOT EXISTS idx_disputes_flag_id ON aletheia_disputes(flag_id);
CREATE INDEX IF NOT EXISTS idx_disputes_initiator_id ON aletheia_disputes(initiator_id);
CREATE INDEX IF NOT EXISTS idx_disputes_tier ON aletheia_disputes(tier);
CREATE INDEX IF NOT EXISTS idx_disputes_status ON aletheia_disputes(status);
CREATE INDEX IF NOT EXISTS idx_disputes_created_at ON aletheia_disputes(created_at DESC);

-- Indexes for jury votes
CREATE INDEX IF NOT EXISTS idx_jury_votes_dispute_id ON aletheia_jury_votes(dispute_id);
CREATE INDEX IF NOT EXISTS idx_jury_votes_juror_id ON aletheia_jury_votes(juror_id);

-- Indexes for jury pool
CREATE INDEX IF NOT EXISTS idx_jury_pool_user_id ON aletheia_jury_pool(user_id);
CREATE INDEX IF NOT EXISTS idx_jury_pool_opted_out ON aletheia_jury_pool(opted_out);

-- Enable RLS
ALTER TABLE aletheia_disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE aletheia_jury_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE aletheia_jury_pool ENABLE ROW LEVEL SECURITY;

-- Disputes policies
CREATE POLICY "Disputes viewable by all"
  ON aletheia_disputes FOR SELECT
  USING (true);

CREATE POLICY "Disputes insertable by authenticated"
  ON aletheia_disputes FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Disputes updatable by participants or admin"
  ON aletheia_disputes FOR UPDATE
  USING (
    initiator_id = auth.uid()
    OR result_id IN (
      SELECT r.id FROM aletheia_prediction_results r
      JOIN aletheia_prediction_testers t ON r.tester_id = t.id
      WHERE t.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM aletheia_users
      WHERE id = auth.uid()
      AND verification_level = 'phd'
    )
  );

-- Jury votes policies (jurors can only see their own until resolved)
CREATE POLICY "Jury votes viewable after resolution or own"
  ON aletheia_jury_votes FOR SELECT
  USING (
    juror_id = auth.uid()
    OR dispute_id IN (
      SELECT id FROM aletheia_disputes WHERE status IN ('resolved', 'nullified')
    )
  );

CREATE POLICY "Jury votes insertable by selected jurors"
  ON aletheia_jury_votes FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM aletheia_jury_pool WHERE user_id = auth.uid() AND opted_out = false
    )
  );

-- Jury pool policies
CREATE POLICY "Jury pool viewable by admins"
  ON aletheia_jury_pool FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM aletheia_users
      WHERE id = auth.uid()
      AND verification_level = 'phd'
    )
  );

CREATE POLICY "Jury pool insertable by system"
  ON aletheia_jury_pool FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Jury pool updatable by owner"
  ON aletheia_jury_pool FOR UPDATE
  USING (user_id = auth.uid());

-- Function to generate anonymous juror ID
CREATE OR REPLACE FUNCTION generate_anonymous_juror_id()
RETURNS TEXT AS $$
BEGIN
  RETURN 'Juror-' || substr(md5(random()::text), 1, 6);
END;
$$ LANGUAGE plpgsql;

-- Function to escalate dispute
CREATE OR REPLACE FUNCTION escalate_dispute(p_dispute_id UUID)
RETURNS VOID AS $$
DECLARE
  v_current_tier INTEGER;
BEGIN
  SELECT tier INTO v_current_tier FROM aletheia_disputes WHERE id = p_dispute_id;

  IF v_current_tier < 3 THEN
    UPDATE aletheia_disputes
    SET tier = v_current_tier + 1,
        status = CASE
          WHEN v_current_tier + 1 = 2 THEN 'voting'
          WHEN v_current_tier + 1 = 3 THEN 'escalated'
        END,
        updated_at = NOW()
    WHERE id = p_dispute_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

-- Function to tally jury votes
CREATE OR REPLACE FUNCTION tally_jury_votes(p_dispute_id UUID)
RETURNS VOID AS $$
DECLARE
  v_uphold INTEGER;
  v_overturn INTEGER;
  v_abstain INTEGER;
  v_required INTEGER;
  v_decision TEXT;
BEGIN
  -- Count votes
  SELECT
    COUNT(*) FILTER (WHERE vote = 'uphold'),
    COUNT(*) FILTER (WHERE vote = 'overturn'),
    COUNT(*) FILTER (WHERE vote = 'abstain')
  INTO v_uphold, v_overturn, v_abstain
  FROM aletheia_jury_votes
  WHERE dispute_id = p_dispute_id;

  SELECT jury_required INTO v_required FROM aletheia_disputes WHERE id = p_dispute_id;

  -- Determine decision
  IF v_uphold + v_overturn + v_abstain >= v_required THEN
    IF v_uphold > v_overturn THEN
      v_decision := 'uphold';
    ELSIF v_overturn > v_uphold THEN
      v_decision := 'overturn';
    ELSE
      v_decision := 'deadlock';
    END IF;

    UPDATE aletheia_disputes
    SET jury_decision = v_decision,
        jury_votes = jsonb_build_object('uphold', v_uphold, 'overturn', v_overturn, 'abstain', v_abstain),
        status = CASE WHEN v_decision = 'deadlock' THEN 'escalated' ELSE 'resolved' END,
        resolved_at = CASE WHEN v_decision != 'deadlock' THEN NOW() END,
        updated_at = NOW()
    WHERE id = p_dispute_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

-- Grant execute
GRANT EXECUTE ON FUNCTION escalate_dispute(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION tally_jury_votes(UUID) TO authenticated;

-- Auto-update trigger
CREATE TRIGGER trigger_disputes_updated_at
  BEFORE UPDATE ON aletheia_disputes
  FOR EACH ROW EXECUTE FUNCTION aletheia_update_updated_at();
