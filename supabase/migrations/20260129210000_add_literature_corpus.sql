-- Literature Corpus with pgvector embeddings
-- Phase 3: RAG infrastructure for research agent

-- ============================================
-- 1. Enable pgvector extension
-- ============================================

CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================
-- 2. Literature Corpus Table
-- ============================================

CREATE TABLE aletheia_literature_corpus (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Document metadata
  title TEXT NOT NULL,
  authors TEXT[],
  source VARCHAR(100), -- 'nderf' | 'stargate' | 'journal' | 'book' | 'archive'
  domain VARCHAR(50), -- 'nde' | 'ganzfeld' | 'crisis' | 'stargate' | 'geophysical' | 'general'
  publication_year INTEGER,
  doi TEXT,
  url TEXT,

  -- Content
  content TEXT NOT NULL,
  content_hash VARCHAR(64) UNIQUE, -- SHA-256 hash to prevent duplicates

  -- Chunking info
  chunk_index INTEGER DEFAULT 0,
  parent_document_id UUID REFERENCES aletheia_literature_corpus(id),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  indexed_at TIMESTAMPTZ
);

CREATE INDEX idx_literature_domain ON aletheia_literature_corpus(domain);
CREATE INDEX idx_literature_source ON aletheia_literature_corpus(source);
CREATE INDEX idx_literature_parent ON aletheia_literature_corpus(parent_document_id);
CREATE INDEX idx_literature_hash ON aletheia_literature_corpus(content_hash);

-- ============================================
-- 3. Literature Embeddings Table
-- ============================================

CREATE TABLE aletheia_literature_embeddings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID REFERENCES aletheia_literature_corpus(id) ON DELETE CASCADE,

  -- Embedding vector (OpenAI ada-002 = 1536 dimensions)
  embedding vector(1536),

  -- Metadata for filtering
  domain VARCHAR(50),
  source VARCHAR(100),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- IVFFlat index for approximate nearest neighbor search
-- lists=100 is good for up to ~100k documents
CREATE INDEX idx_literature_embeddings_vector ON aletheia_literature_embeddings
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

CREATE INDEX idx_literature_embeddings_domain ON aletheia_literature_embeddings(domain);
CREATE INDEX idx_literature_embeddings_source ON aletheia_literature_embeddings(source);

-- ============================================
-- 4. Vector Search Function
-- ============================================

CREATE OR REPLACE FUNCTION search_literature(
  query_embedding vector(1536),
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 10,
  filter_domains TEXT[] DEFAULT NULL,
  filter_sources TEXT[] DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  document_id UUID,
  title TEXT,
  authors TEXT[],
  source VARCHAR,
  domain VARCHAR,
  content TEXT,
  doi TEXT,
  url TEXT,
  similarity FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id,
    d.id as document_id,
    d.title,
    d.authors,
    d.source,
    d.domain,
    d.content,
    d.doi,
    d.url,
    1 - (e.embedding <=> query_embedding) as similarity
  FROM aletheia_literature_embeddings e
  JOIN aletheia_literature_corpus d ON e.document_id = d.id
  WHERE
    1 - (e.embedding <=> query_embedding) > match_threshold
    AND (filter_domains IS NULL OR d.domain = ANY(filter_domains))
    AND (filter_sources IS NULL OR d.source = ANY(filter_sources))
  ORDER BY e.embedding <=> query_embedding
  LIMIT match_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 5. Helper Functions
-- ============================================

-- Check if document exists by hash
CREATE OR REPLACE FUNCTION document_exists_by_hash(p_hash VARCHAR(64))
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM aletheia_literature_corpus
    WHERE content_hash = p_hash
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get document count by domain
CREATE OR REPLACE FUNCTION get_literature_stats()
RETURNS TABLE (
  domain VARCHAR,
  source VARCHAR,
  document_count BIGINT,
  chunk_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.domain,
    d.source,
    COUNT(DISTINCT CASE WHEN d.parent_document_id IS NULL THEN d.id END) as document_count,
    COUNT(CASE WHEN d.parent_document_id IS NOT NULL THEN 1 END) as chunk_count
  FROM aletheia_literature_corpus d
  GROUP BY d.domain, d.source
  ORDER BY document_count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 6. RLS Policies
-- ============================================

-- Literature corpus is read-only for users
ALTER TABLE aletheia_literature_corpus ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read literature" ON aletheia_literature_corpus
  FOR SELECT USING (true);

-- Embeddings are read-only for users
ALTER TABLE aletheia_literature_embeddings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read embeddings" ON aletheia_literature_embeddings
  FOR SELECT USING (true);

-- Service role can insert/update (for indexing pipeline)
-- This is handled by using service role key
