-- Connection Agent Tables (Phase 6c)
-- Cross-domain variable mapping and correlation analysis

-- Variable Mappings: Cross-domain semantic links
CREATE TABLE IF NOT EXISTS aletheia_variable_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Source variable
  source_domain TEXT NOT NULL,
  source_variable TEXT NOT NULL,
  source_description TEXT,

  -- Target variable
  target_domain TEXT NOT NULL,
  target_variable TEXT NOT NULL,
  target_description TEXT,

  -- Mapping details
  mapping_type TEXT NOT NULL CHECK (mapping_type IN ('semantic', 'structural', 'temporal', 'experiential', 'physical')),
  mapping_strength DECIMAL(3,2) CHECK (mapping_strength >= 0 AND mapping_strength <= 1),
  mapping_rationale TEXT,

  -- Evidence
  supporting_evidence TEXT[],
  contradicting_evidence TEXT[],

  -- Metadata
  confidence_score DECIMAL(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
  created_by TEXT DEFAULT 'agent',
  verified BOOLEAN DEFAULT false,
  verified_by UUID REFERENCES aletheia_users(id),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cross-Domain Correlations: Statistical relationships across domains
CREATE TABLE IF NOT EXISTS aletheia_cross_domain_correlations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID,

  -- Domains involved
  domain_a TEXT NOT NULL,
  domain_b TEXT NOT NULL,

  -- Variables
  variable_a TEXT NOT NULL,
  variable_b TEXT NOT NULL,

  -- Correlation details
  correlation_type TEXT NOT NULL CHECK (correlation_type IN ('temporal', 'geographic', 'demographic', 'phenomenological', 'statistical')),
  correlation_coefficient DECIMAL(4,3),
  p_value DECIMAL(10,8),
  effect_size TEXT,
  sample_size_a INTEGER,
  sample_size_b INTEGER,

  -- Analysis details
  method TEXT,
  conditions TEXT,
  confounds_checked TEXT[],

  -- Results
  is_significant BOOLEAN DEFAULT false,
  interpretation TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Keel Tests: "The weird stuff correlates" hypothesis tests
CREATE TABLE IF NOT EXISTS aletheia_keel_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID,

  -- Test definition
  test_name TEXT NOT NULL,
  hypothesis TEXT NOT NULL,
  domains_tested TEXT[] NOT NULL,

  -- Variables tested
  variables_tested JSONB NOT NULL, -- [{domain, variable, weird_indicator}]

  -- Results
  correlation_matrix JSONB, -- pairwise correlations
  overall_correlation DECIMAL(4,3),
  p_value DECIMAL(10,8),
  effect_size TEXT,

  -- Interpretation
  supports_keel_hypothesis BOOLEAN,
  strength TEXT CHECK (strength IN ('strong', 'moderate', 'weak', 'none', 'inverse')),
  notes TEXT,

  -- Samples
  total_records INTEGER,
  records_per_domain JSONB,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Witness Profiles: Cluster analysis of experiencers
CREATE TABLE IF NOT EXISTS aletheia_witness_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID,

  -- Profile definition
  profile_name TEXT NOT NULL,
  profile_description TEXT,

  -- Cluster details
  clustering_method TEXT NOT NULL,
  features_used TEXT[] NOT NULL,
  n_clusters INTEGER,

  -- Cluster characteristics
  cluster_centers JSONB, -- {feature: value} for each cluster
  cluster_sizes INTEGER[], -- number in each cluster

  -- Cross-domain distribution
  domain_distribution JSONB, -- {domain: {cluster_id: count}}

  -- Quality metrics
  silhouette_score DECIMAL(4,3),
  inertia DECIMAL(12,2),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Individual Witness Cluster Assignments
CREATE TABLE IF NOT EXISTS aletheia_witness_cluster_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES aletheia_witness_profiles(id) ON DELETE CASCADE,
  investigation_id UUID REFERENCES aletheia_investigations(id) ON DELETE CASCADE,

  -- Assignment
  cluster_id INTEGER NOT NULL,
  cluster_label TEXT,
  distance_to_center DECIMAL(10,4),

  -- Probability (for soft clustering)
  membership_probability DECIMAL(4,3),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Connection Agent Sessions
CREATE TABLE IF NOT EXISTS aletheia_connection_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Session info
  status TEXT DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed')),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,

  -- Configuration
  domains_analyzed TEXT[],
  analysis_types TEXT[], -- ['variable_mapping', 'cross_correlation', 'keel_test', 'witness_profiles']

  -- Results summary
  mappings_discovered INTEGER DEFAULT 0,
  correlations_found INTEGER DEFAULT 0,
  keel_tests_run INTEGER DEFAULT 0,
  profiles_generated INTEGER DEFAULT 0,

  -- Notable findings
  significant_connections JSONB,

  summary TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_variable_mappings_domains
  ON aletheia_variable_mappings(source_domain, target_domain);
CREATE INDEX IF NOT EXISTS idx_variable_mappings_strength
  ON aletheia_variable_mappings(mapping_strength DESC);

CREATE INDEX IF NOT EXISTS idx_cross_domain_correlations_domains
  ON aletheia_cross_domain_correlations(domain_a, domain_b);
CREATE INDEX IF NOT EXISTS idx_cross_domain_correlations_significant
  ON aletheia_cross_domain_correlations(is_significant);

CREATE INDEX IF NOT EXISTS idx_keel_tests_session
  ON aletheia_keel_tests(session_id);
CREATE INDEX IF NOT EXISTS idx_keel_tests_supports
  ON aletheia_keel_tests(supports_keel_hypothesis);

CREATE INDEX IF NOT EXISTS idx_witness_profiles_session
  ON aletheia_witness_profiles(session_id);
CREATE INDEX IF NOT EXISTS idx_witness_cluster_assignments_profile
  ON aletheia_witness_cluster_assignments(profile_id);

CREATE INDEX IF NOT EXISTS idx_connection_sessions_status
  ON aletheia_connection_sessions(status);

-- RLS Policies
ALTER TABLE aletheia_variable_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE aletheia_cross_domain_correlations ENABLE ROW LEVEL SECURITY;
ALTER TABLE aletheia_keel_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE aletheia_witness_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE aletheia_witness_cluster_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE aletheia_connection_sessions ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Allow public read" ON aletheia_variable_mappings FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON aletheia_cross_domain_correlations FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON aletheia_keel_tests FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON aletheia_witness_profiles FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON aletheia_witness_cluster_assignments FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON aletheia_connection_sessions FOR SELECT USING (true);
