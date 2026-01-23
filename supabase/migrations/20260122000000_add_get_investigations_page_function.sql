-- =====================================================
-- Add optimized pagination function for investigations
-- This function bypasses RLS overhead for efficient queries
-- =====================================================

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS get_investigations_page;

-- Create the optimized pagination function
CREATE FUNCTION get_investigations_page(
  p_tier TEXT DEFAULT 'research',
  p_type TEXT DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_sort TEXT DEFAULT 'triage_score',
  p_order TEXT DEFAULT 'desc',
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  type TEXT,
  triage_score INTEGER,
  triage_status TEXT,
  created_at TIMESTAMPTZ,
  user_id UUID,
  tier TEXT
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT
    i.id,
    i.title,
    i.investigation_type::TEXT,
    i.triage_score,
    i.triage_status::TEXT,
    i.created_at,
    i.user_id,
    i.tier::TEXT
  FROM aletheia_investigations i
  WHERE i.tier::TEXT = p_tier
    AND (p_type IS NULL OR i.investigation_type::TEXT = p_type)
    AND (p_status IS NULL OR i.triage_status::TEXT = p_status)
  ORDER BY i.triage_score DESC NULLS LAST
  LIMIT p_limit OFFSET p_offset;
$$;

-- Grant execute permission to anonymous and authenticated users
GRANT EXECUTE ON FUNCTION get_investigations_page TO anon;
GRANT EXECUTE ON FUNCTION get_investigations_page TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION get_investigations_page IS
'Optimized pagination function for investigations that bypasses RLS overhead.
Used by /api/submissions GET endpoint for efficient queries on 166k+ records.';

-- =====================================================
-- Add composite index for efficient tier-based queries
-- =====================================================

-- Index on tier column
CREATE INDEX IF NOT EXISTS idx_aletheia_investigations_tier
  ON aletheia_investigations(tier);

-- Composite index for common query pattern: tier + triage_score
CREATE INDEX IF NOT EXISTS idx_aletheia_investigations_tier_score
  ON aletheia_investigations(tier, triage_score DESC NULLS LAST);

-- Composite index for tier + created_at (for sorting by date)
CREATE INDEX IF NOT EXISTS idx_aletheia_investigations_tier_created
  ON aletheia_investigations(tier, created_at DESC);
