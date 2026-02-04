-- Conversational Research Agent - Phase 1: Foundation
-- Adds research sessions, chat messages, and credit tracking

-- ============================================
-- 1. Research Sessions (Conversation State)
-- ============================================

CREATE TABLE aletheia_research_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES aletheia_users(id) ON DELETE CASCADE,

  -- Session metadata
  title TEXT,
  mode VARCHAR(20) DEFAULT 'chat' CHECK (mode IN ('chat', 'deep_research')),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'abandoned')),

  -- Persistent research state
  current_objective TEXT,
  key_insights JSONB DEFAULT '[]',
  methodology TEXT,
  completed_tasks JSONB DEFAULT '[]',
  pending_tasks JSONB DEFAULT '[]',

  -- Domain focus (optional)
  domains TEXT[] DEFAULT '{}',

  -- Checkpoint state
  awaiting_checkpoint BOOLEAN DEFAULT false,
  checkpoint_type VARCHAR(50),
  checkpoint_options JSONB,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_activity_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_research_sessions_user ON aletheia_research_sessions(user_id);
CREATE INDEX idx_research_sessions_status ON aletheia_research_sessions(status);
CREATE INDEX idx_research_sessions_last_activity ON aletheia_research_sessions(last_activity_at DESC);

-- ============================================
-- 2. Chat Messages
-- ============================================

CREATE TABLE aletheia_chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES aletheia_research_sessions(id) ON DELETE CASCADE,

  -- Message content
  role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'checkpoint')),
  content TEXT NOT NULL,

  -- Metadata
  message_type VARCHAR(50) DEFAULT 'text' CHECK (message_type IN ('text', 'analysis', 'hypothesis', 'literature', 'query_result', 'checkpoint', 'error')),
  metadata JSONB DEFAULT '{}',

  -- Cost tracking (for analytics, not enforcement during free launch)
  credits_used INTEGER DEFAULT 0,
  tokens_input INTEGER,
  tokens_output INTEGER,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_chat_messages_session ON aletheia_chat_messages(session_id);
CREATE INDEX idx_chat_messages_created ON aletheia_chat_messages(created_at);
CREATE INDEX idx_chat_messages_role ON aletheia_chat_messages(role);

-- ============================================
-- 3. Credit System (User Balance)
-- ============================================

-- Add credit columns to users table
ALTER TABLE aletheia_users ADD COLUMN IF NOT EXISTS
  credits_balance INTEGER DEFAULT 999999; -- Effectively unlimited during free launch

ALTER TABLE aletheia_users ADD COLUMN IF NOT EXISTS
  credits_lifetime_purchased INTEGER DEFAULT 0;

ALTER TABLE aletheia_users ADD COLUMN IF NOT EXISTS
  credits_lifetime_used INTEGER DEFAULT 0;

-- ============================================
-- 4. Credit Transactions (Analytics)
-- ============================================

CREATE TABLE aletheia_credit_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES aletheia_users(id) ON DELETE CASCADE,

  -- Transaction details
  type VARCHAR(20) NOT NULL CHECK (type IN ('purchase', 'usage', 'grant', 'refund')),
  amount INTEGER NOT NULL, -- Positive for additions, negative for usage
  balance_after INTEGER NOT NULL,

  -- Context
  description TEXT,
  session_id UUID REFERENCES aletheia_research_sessions(id),
  message_id UUID REFERENCES aletheia_chat_messages(id),

  -- Payment info (for future purchases)
  payment_provider VARCHAR(50), -- 'stripe' | 'crypto' | null
  payment_reference TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_credit_transactions_user ON aletheia_credit_transactions(user_id);
CREATE INDEX idx_credit_transactions_type ON aletheia_credit_transactions(type);
CREATE INDEX idx_credit_transactions_created ON aletheia_credit_transactions(created_at DESC);

-- ============================================
-- 5. Credit Deduction Function
-- ============================================

CREATE OR REPLACE FUNCTION deduct_credits(
  p_user_id UUID,
  p_amount INTEGER,
  p_action TEXT,
  p_session_id UUID DEFAULT NULL,
  p_message_id UUID DEFAULT NULL
) RETURNS TABLE(success BOOLEAN, credits_used INTEGER, balance_after INTEGER) AS $$
DECLARE
  v_current_balance INTEGER;
  v_new_balance INTEGER;
  v_free_launch BOOLEAN := true; -- Set to false when monetization is enabled
BEGIN
  -- Lock the user row
  SELECT credits_balance INTO v_current_balance
  FROM aletheia_users
  WHERE id = p_user_id
  FOR UPDATE;

  -- During free launch: always succeed, just track
  IF v_free_launch THEN
    -- Record transaction for analytics
    INSERT INTO aletheia_credit_transactions (
      user_id, type, amount, balance_after, description, session_id, message_id
    ) VALUES (
      p_user_id, 'usage', -p_amount, v_current_balance, p_action, p_session_id, p_message_id
    );

    -- Update lifetime used
    UPDATE aletheia_users
    SET credits_lifetime_used = credits_lifetime_used + p_amount
    WHERE id = p_user_id;

    RETURN QUERY SELECT true, p_amount, v_current_balance;
    RETURN;
  END IF;

  -- Future: Check sufficient balance
  IF v_current_balance < p_amount THEN
    RETURN QUERY SELECT false, 0, v_current_balance;
    RETURN;
  END IF;

  -- Deduct
  v_new_balance := v_current_balance - p_amount;

  UPDATE aletheia_users
  SET
    credits_balance = v_new_balance,
    credits_lifetime_used = credits_lifetime_used + p_amount
  WHERE id = p_user_id;

  -- Record transaction
  INSERT INTO aletheia_credit_transactions (
    user_id, type, amount, balance_after, description, session_id, message_id
  ) VALUES (
    p_user_id, 'usage', -p_amount, v_new_balance, p_action, p_session_id, p_message_id
  );

  RETURN QUERY SELECT true, p_amount, v_new_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 6. RLS Policies
-- ============================================

-- Research Sessions: Users can only access their own
ALTER TABLE aletheia_research_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sessions" ON aletheia_research_sessions
  FOR SELECT USING (
    user_id IN (SELECT id FROM aletheia_users WHERE auth_id = auth.uid())
  );

CREATE POLICY "Users can insert own sessions" ON aletheia_research_sessions
  FOR INSERT WITH CHECK (
    user_id IN (SELECT id FROM aletheia_users WHERE auth_id = auth.uid())
  );

CREATE POLICY "Users can update own sessions" ON aletheia_research_sessions
  FOR UPDATE USING (
    user_id IN (SELECT id FROM aletheia_users WHERE auth_id = auth.uid())
  );

CREATE POLICY "Users can delete own sessions" ON aletheia_research_sessions
  FOR DELETE USING (
    user_id IN (SELECT id FROM aletheia_users WHERE auth_id = auth.uid())
  );

-- Chat Messages: Users can only access messages in their sessions
ALTER TABLE aletheia_chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own messages" ON aletheia_chat_messages
  FOR SELECT USING (
    session_id IN (
      SELECT id FROM aletheia_research_sessions
      WHERE user_id IN (SELECT id FROM aletheia_users WHERE auth_id = auth.uid())
    )
  );

CREATE POLICY "Users can insert messages in own sessions" ON aletheia_chat_messages
  FOR INSERT WITH CHECK (
    session_id IN (
      SELECT id FROM aletheia_research_sessions
      WHERE user_id IN (SELECT id FROM aletheia_users WHERE auth_id = auth.uid())
    )
  );

-- Credit Transactions: Users can only view their own
ALTER TABLE aletheia_credit_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transactions" ON aletheia_credit_transactions
  FOR SELECT USING (
    user_id IN (SELECT id FROM aletheia_users WHERE auth_id = auth.uid())
  );

-- Service role can bypass RLS for agent operations
-- (Handled by using service role key in agent code)

-- ============================================
-- 7. Helper Functions
-- ============================================

-- Get session with message count
CREATE OR REPLACE FUNCTION get_research_session_summary(p_session_id UUID)
RETURNS TABLE(
  id UUID,
  title TEXT,
  mode VARCHAR(20),
  status VARCHAR(20),
  current_objective TEXT,
  domains TEXT[],
  message_count BIGINT,
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id,
    s.title,
    s.mode,
    s.status,
    s.current_objective,
    s.domains,
    COUNT(m.id) as message_count,
    MAX(m.created_at) as last_message_at,
    s.created_at,
    s.updated_at
  FROM aletheia_research_sessions s
  LEFT JOIN aletheia_chat_messages m ON m.session_id = s.id
  WHERE s.id = p_session_id
  GROUP BY s.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
