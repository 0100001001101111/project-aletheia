-- Trust Architecture Migration
-- Part 3: Simple Mode + Multiplicative Scoring + Domain Statistics

-- =====================================================
-- 1. Simple Mode Submissions
-- =====================================================

-- Add submission_mode column to investigations
ALTER TABLE aletheia_investigations
ADD COLUMN IF NOT EXISTS submission_mode TEXT DEFAULT 'full' CHECK (submission_mode IN ('simple', 'full'));

-- Add simple mode maximum score constraint is handled in application logic (cap at 6.0)

-- =====================================================
-- 2. Multiplicative Scoring Fields
-- =====================================================

-- Add multiplicative scoring breakdown columns
ALTER TABLE aletheia_investigations
ADD COLUMN IF NOT EXISTS multiplicative_source_integrity FLOAT,
ADD COLUMN IF NOT EXISTS multiplicative_methodology FLOAT,
ADD COLUMN IF NOT EXISTS multiplicative_data_quality FLOAT,
ADD COLUMN IF NOT EXISTS multiplicative_confound_control FLOAT,
ADD COLUMN IF NOT EXISTS multiplicative_fatal_factor TEXT;

-- =====================================================
-- 3. Domain Statistics Cache
-- =====================================================

CREATE TABLE IF NOT EXISTS aletheia_domain_statistics_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  domain TEXT NOT NULL UNIQUE,
  stats_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  record_count INTEGER DEFAULT 0,
  avg_score FLOAT,
  min_score FLOAT,
  max_score FLOAT,
  verified_count INTEGER DEFAULT 0,
  provisional_count INTEGER DEFAULT 0,
  rejected_count INTEGER DEFAULT 0,
  oldest_record TIMESTAMPTZ,
  newest_record TIMESTAMPTZ,
  score_distribution JSONB DEFAULT '[]'::jsonb,
  temporal_coverage JSONB DEFAULT '[]'::jsonb,
  computed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for domain lookups
CREATE INDEX IF NOT EXISTS idx_domain_stats_domain ON aletheia_domain_statistics_cache(domain);

-- Enable RLS
ALTER TABLE aletheia_domain_statistics_cache ENABLE ROW LEVEL SECURITY;

-- Allow public read access to statistics
CREATE POLICY "Public can read domain statistics"
  ON aletheia_domain_statistics_cache
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Only service role can modify statistics cache
CREATE POLICY "Service role can manage domain statistics"
  ON aletheia_domain_statistics_cache
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- 4. Comments
-- =====================================================

COMMENT ON COLUMN aletheia_investigations.submission_mode IS 'simple = 3-step wizard (max score 6.0), full = 7-step wizard (max score 10.0)';
COMMENT ON COLUMN aletheia_investigations.multiplicative_fatal_factor IS 'If not null, indicates which factor caused zero score (e.g., "no_source", "no_methodology")';
COMMENT ON TABLE aletheia_domain_statistics_cache IS 'Pre-computed statistics per research domain for dashboard performance';
