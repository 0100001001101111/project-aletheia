-- Add agent_id column to findings table for agent-specific filtering
ALTER TABLE aletheia_agent_findings
ADD COLUMN IF NOT EXISTS agent_id TEXT;

-- Create index for efficient filtering
CREATE INDEX IF NOT EXISTS idx_agent_findings_agent_id
ON aletheia_agent_findings(agent_id);

-- Comment for documentation
COMMENT ON COLUMN aletheia_agent_findings.agent_id IS
  'Identifier for the agent that created this finding (e.g., deep-miner, discovery, connection, mechanism, synthesis, flora, argus)';
