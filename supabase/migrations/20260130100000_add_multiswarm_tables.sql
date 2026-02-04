-- Multi-Swarm Architecture Tables
-- Transform Aletheia into autonomous research infrastructure

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Swarm definitions
CREATE TABLE IF NOT EXISTS swarms (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  tagline TEXT,
  description TEXT,
  icon TEXT,
  color TEXT,
  status TEXT DEFAULT 'development',
  agent_count INTEGER DEFAULT 0,
  discovery_count INTEGER DEFAULT 0,
  investigation_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agent definitions
CREATE TABLE IF NOT EXISTS agents (
  id TEXT PRIMARY KEY,
  swarm_id TEXT REFERENCES swarms(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  description TEXT,
  personality TEXT,
  avatar TEXT,
  stats JSONB DEFAULT '{}',
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agora forum posts
CREATE TABLE IF NOT EXISTS agora_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  swarm_id TEXT REFERENCES swarms(id) ON DELETE CASCADE,
  agent_id TEXT REFERENCES agents(id) ON DELETE SET NULL,
  channel TEXT NOT NULL,
  title TEXT,
  content TEXT NOT NULL,
  attachments JSONB DEFAULT '[]',
  parent_id UUID REFERENCES agora_posts(id) ON DELETE CASCADE,
  reply_count INTEGER DEFAULT 0,
  reactions JSONB DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cross-swarm discoveries
CREATE TABLE IF NOT EXISTS discoveries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  full_report TEXT,
  swarms_involved TEXT[],
  primary_swarm TEXT REFERENCES swarms(id) ON DELETE SET NULL,
  contributing_agents TEXT[],
  evidence JSONB DEFAULT '[]',
  supporting_posts UUID[],
  related_investigations UUID[],
  confidence FLOAT,
  significance TEXT DEFAULT 'minor',
  status TEXT DEFAULT 'proposed',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  validated_at TIMESTAMPTZ
);

-- Indexes for agora_posts
CREATE INDEX IF NOT EXISTS idx_agora_swarm ON agora_posts(swarm_id);
CREATE INDEX IF NOT EXISTS idx_agora_channel ON agora_posts(channel);
CREATE INDEX IF NOT EXISTS idx_agora_created ON agora_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agora_parent ON agora_posts(parent_id);

-- Indexes for discoveries
CREATE INDEX IF NOT EXISTS idx_discoveries_status ON discoveries(status);
CREATE INDEX IF NOT EXISTS idx_discoveries_swarm ON discoveries(primary_swarm);

-- Add swarm_id to investigations if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'aletheia_investigations' AND column_name = 'swarm_id'
  ) THEN
    ALTER TABLE aletheia_investigations ADD COLUMN swarm_id TEXT DEFAULT 'anomaly';
  END IF;
END $$;

-- RLS Policies
ALTER TABLE swarms ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE agora_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE discoveries ENABLE ROW LEVEL SECURITY;

-- Public read access
DROP POLICY IF EXISTS "Public read swarms" ON swarms;
CREATE POLICY "Public read swarms" ON swarms FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read agents" ON agents;
CREATE POLICY "Public read agents" ON agents FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read agora" ON agora_posts;
CREATE POLICY "Public read agora" ON agora_posts FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read discoveries" ON discoveries;
CREATE POLICY "Public read discoveries" ON discoveries FOR SELECT USING (true);

-- Seed initial swarms (Core Four)
INSERT INTO swarms (id, name, tagline, description, icon, color, status, investigation_count) VALUES
('helios', 'HELIOS', 'Space Weather & Physics', 'Hunting for anomalies in astronomical data, solar-terrestrial correlations, and unexplained patterns in physics.', '☀️', '#F59E0B', 'development', 0),
('methuselah', 'METHUSELAH', 'Longevity Research', 'Investigating why some populations and individuals outlive actuarial predictions.', '🧬', '#10B981', 'development', 0),
('flora', 'FLORA', 'Plant Intelligence', 'Real-time monitoring of plant electrical signals and their correlations with environmental factors.', '🌱', '#22C55E', 'development', 0),
('anomaly', 'ANOMALY', 'Paranormal & Fringe Science', 'Rigorous investigation of NDEs, Ganzfeld experiments, crisis apparitions, remote viewing, and UFO phenomena.', '👁️', '#8B5CF6', 'active', 0)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tagline = EXCLUDED.tagline,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  color = EXCLUDED.color,
  status = EXCLUDED.status;

-- Seed anomaly swarm agents (existing agent system)
INSERT INTO agents (id, swarm_id, name, role, description, personality, avatar, status) VALUES
('anomaly-deep-miner', 'anomaly', 'Deep Miner', 'scout', 'Exhaustive within-domain statistical analysis. Enumerates variables, runs cross-tabulations, checks temporal stability.', 'Methodical, thorough, pattern-obsessed', '⛏️', 'active'),
('anomaly-discovery', 'anomaly', 'Discovery Agent', 'librarian', 'Hunts for external research and cross-domain connections. Monitors journals, archives, and tracks researchers.', 'Curious, well-read, connection-seeking', '🔍', 'active'),
('anomaly-connection', 'anomaly', 'Connection Agent', 'theorist', 'Finds cross-domain patterns. Maps variables across domains, tests Keel hypothesis, clusters witness profiles.', 'Pattern-hungry, cross-disciplinary, bold', '🔗', 'active'),
('anomaly-mechanism', 'anomaly', 'Mechanism Agent', 'theorist', 'Proposes explanatory mechanisms. Designs discriminating tests between competing theories.', 'Speculative but constrained, mechanistic', '⚙️', 'active'),
('anomaly-synthesis', 'anomaly', 'Synthesis Agent', 'judge', 'Generates research reports. Creates domain deep-dives, cross-domain syntheses, audience-specific briefs.', 'Integrative, big-picture, communicator', '📊', 'active')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  description = EXCLUDED.description,
  personality = EXCLUDED.personality,
  avatar = EXCLUDED.avatar;

-- Update agent counts
UPDATE swarms SET agent_count = (
  SELECT COUNT(*) FROM agents WHERE agents.swarm_id = swarms.id
);

-- Update investigation counts for anomaly swarm
UPDATE swarms SET investigation_count = (
  SELECT COUNT(*) FROM aletheia_investigations WHERE swarm_id = 'anomaly' OR swarm_id IS NULL
) WHERE id = 'anomaly';
