-- Synthesis Agent Tables (Phase 6e)
-- Research report generation and synthesis

-- Domain Deep Dives: Comprehensive reports on individual domains
CREATE TABLE IF NOT EXISTS aletheia_domain_deep_dives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID,

  -- Domain info
  domain TEXT NOT NULL,
  domain_name TEXT NOT NULL,

  -- Report content
  executive_summary TEXT NOT NULL,
  methodology_overview TEXT,

  -- Data summary
  total_records INTEGER,
  date_range_start DATE,
  date_range_end DATE,
  geographic_coverage TEXT[],

  -- Key findings
  key_statistics JSONB, -- [{name, value, context}]
  consensus_findings TEXT[],
  contested_findings TEXT[],
  novel_findings TEXT[],

  -- Mechanisms
  dominant_mechanisms TEXT[],
  mechanism_evidence JSONB,

  -- Gaps and recommendations
  data_gaps TEXT[],
  methodological_concerns TEXT[],
  future_research TEXT[],

  -- Quality metrics
  evidence_quality_score DECIMAL(3,2),
  replication_rate DECIMAL(3,2),

  -- Status
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'published')),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cross-Domain Syntheses: Overarching pattern reports
CREATE TABLE IF NOT EXISTS aletheia_cross_domain_syntheses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID,

  -- Synthesis info
  title TEXT NOT NULL,
  theme TEXT NOT NULL, -- e.g., "Stress-Signal Patterns", "Entity Encounters"

  -- Domains covered
  domains_covered TEXT[] NOT NULL,

  -- Content
  executive_summary TEXT NOT NULL,
  methodology TEXT,

  -- Patterns
  cross_cutting_patterns JSONB, -- [{pattern, domains, evidence, strength}]
  domain_specific_variations JSONB,
  unexplained_differences TEXT[],

  -- Theoretical implications
  supported_theories TEXT[],
  challenged_theories TEXT[],
  novel_hypotheses TEXT[],

  -- Statistical summary
  total_records_analyzed INTEGER,
  significant_correlations INTEGER,
  effect_sizes JSONB,

  -- Recommendations
  research_priorities TEXT[],
  data_collection_recommendations TEXT[],

  -- Status
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'published')),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Research Briefs: Actionable summaries for specific audiences
CREATE TABLE IF NOT EXISTS aletheia_research_briefs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID,

  -- Brief info
  title TEXT NOT NULL,
  audience TEXT NOT NULL CHECK (audience IN (
    'academic_researcher', 'funding_body', 'journalist',
    'policymaker', 'general_public', 'practitioner'
  )),

  -- Content
  key_takeaways TEXT[] NOT NULL,
  summary TEXT NOT NULL,
  background TEXT,

  -- Evidence
  supporting_data JSONB,
  source_references TEXT[],

  -- Actions
  recommended_actions TEXT[],
  contact_suggestions JSONB,

  -- Status
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'published')),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Synthesis Agent Sessions
CREATE TABLE IF NOT EXISTS aletheia_synthesis_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Session info
  status TEXT DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed')),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,

  -- Configuration
  domains_analyzed TEXT[],
  synthesis_types TEXT[], -- ['domain_deep_dive', 'cross_domain', 'research_brief']

  -- Results summary
  deep_dives_generated INTEGER DEFAULT 0,
  syntheses_generated INTEGER DEFAULT 0,
  briefs_generated INTEGER DEFAULT 0,

  -- Key outputs
  key_findings JSONB,

  summary TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_domain_deep_dives_domain ON aletheia_domain_deep_dives(domain);
CREATE INDEX IF NOT EXISTS idx_domain_deep_dives_status ON aletheia_domain_deep_dives(status);

CREATE INDEX IF NOT EXISTS idx_cross_domain_syntheses_theme ON aletheia_cross_domain_syntheses(theme);
CREATE INDEX IF NOT EXISTS idx_cross_domain_syntheses_status ON aletheia_cross_domain_syntheses(status);

CREATE INDEX IF NOT EXISTS idx_research_briefs_audience ON aletheia_research_briefs(audience);
CREATE INDEX IF NOT EXISTS idx_research_briefs_status ON aletheia_research_briefs(status);

CREATE INDEX IF NOT EXISTS idx_synthesis_sessions_status ON aletheia_synthesis_sessions(status);

-- RLS
ALTER TABLE aletheia_domain_deep_dives ENABLE ROW LEVEL SECURITY;
ALTER TABLE aletheia_cross_domain_syntheses ENABLE ROW LEVEL SECURITY;
ALTER TABLE aletheia_research_briefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE aletheia_synthesis_sessions ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Allow public read ddd" ON aletheia_domain_deep_dives FOR SELECT USING (true);
CREATE POLICY "Allow public read cds" ON aletheia_cross_domain_syntheses FOR SELECT USING (true);
CREATE POLICY "Allow public read rb" ON aletheia_research_briefs FOR SELECT USING (true);
CREATE POLICY "Allow public read ss" ON aletheia_synthesis_sessions FOR SELECT USING (true);
