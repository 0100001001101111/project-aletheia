/**
 * Agent Stats API
 * GET /api/agent/stats - Returns aggregate stats for the agent hub page
 */

import { NextResponse } from 'next/server';
import { createAgentReadClient } from '@/lib/agent/supabase-admin';

const ALL_AGENT_IDS = [
  'argus', 'deep-miner', 'discovery', 'connection', 'mechanism',
  'synthesis', 'flora', 'helios', 'methuselah', 'vulcan',
  'asclepius', 'gaia', 'poseidon', 'chronos', 'daedalus',
  'hypnos', 'mnemosyne', 'hermes', 'thoth', 'orpheus',
];

export async function GET() {
  try {
    const supabase = createAgentReadClient();

    // Fetch all findings (agent_id, title, confidence, review_status, created_at)
    const { data: findings, error } = await supabase
      .from('aletheia_agent_findings')
      .select('id, agent_id, title, display_title, confidence, review_status, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Stats fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
    }

    const rows = findings || [];
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Total and pending counts
    const totalFindings = rows.length;
    const pendingReview = rows.filter(f => f.review_status === 'pending').length;

    // Agents active in last 24h
    const activeAgentIds = new Set<string>();
    for (const f of rows) {
      if (f.agent_id && new Date(f.created_at) > twentyFourHoursAgo) {
        activeAgentIds.add(f.agent_id);
      }
    }

    // 5 most recent findings for AGORA feed
    const recentFindings = rows.slice(0, 5).map(f => ({
      id: f.id,
      agent_id: f.agent_id,
      title: f.display_title || f.title,
      confidence: f.confidence,
      created_at: f.created_at,
    }));

    // Per-agent stats
    const agentStats: Record<string, { findings_count: number; last_active: string | null }> = {};
    for (const id of ALL_AGENT_IDS) {
      agentStats[id] = { findings_count: 0, last_active: null };
    }
    for (const f of rows) {
      const aid = f.agent_id;
      if (!aid) continue;
      if (!agentStats[aid]) {
        agentStats[aid] = { findings_count: 0, last_active: null };
      }
      agentStats[aid].findings_count++;
      if (!agentStats[aid].last_active || f.created_at > agentStats[aid].last_active!) {
        agentStats[aid].last_active = f.created_at;
      }
    }

    return NextResponse.json({
      total_findings: totalFindings,
      pending_review: pendingReview,
      agents_active_24h: activeAgentIds.size,
      recent_findings: recentFindings,
      agent_stats: agentStats,
    });
  } catch (err) {
    console.error('Agent stats error:', err);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
