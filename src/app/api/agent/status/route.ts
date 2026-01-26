/**
 * Agent Status API
 * GET /api/agent/status - Returns current agent status and stats
 */

import { NextResponse } from 'next/server';
import { createAgentReadClient } from '@/lib/agent/supabase-admin';

export async function GET() {
  try {
    const supabase = createAgentReadClient();

    // Get config
    const { data: configData } = await supabase
      .from('aletheia_agent_config')
      .select('key, value');

    const config: Record<string, unknown> = {};
    for (const row of configData || []) {
      config[row.key] = row.value;
    }

    // Get current running session if any
    const { data: currentSession } = await supabase
      .from('aletheia_agent_sessions')
      .select('*')
      .eq('status', 'running')
      .order('started_at', { ascending: false })
      .limit(1)
      .single();

    // Get last completed session
    const { data: lastSession } = await supabase
      .from('aletheia_agent_sessions')
      .select('*')
      .neq('status', 'running')
      .order('ended_at', { ascending: false })
      .limit(1)
      .single();

    // Get total sessions count
    const { count: totalSessions } = await supabase
      .from('aletheia_agent_sessions')
      .select('*', { count: 'exact', head: true });

    // Get total hypotheses
    const { count: totalHypotheses } = await supabase
      .from('aletheia_agent_hypotheses')
      .select('*', { count: 'exact', head: true });

    // Get total findings
    const { count: totalFindings } = await supabase
      .from('aletheia_agent_findings')
      .select('*', { count: 'exact', head: true });

    // Get approved findings
    const { count: approvedFindings } = await supabase
      .from('aletheia_agent_findings')
      .select('*', { count: 'exact', head: true })
      .eq('review_status', 'approved');

    return NextResponse.json({
      enabled: config.enabled === true || config.enabled === 'true',
      config,
      currentSession: currentSession || null,
      lastSession: lastSession || null,
      stats: {
        totalSessions: totalSessions || 0,
        totalHypotheses: totalHypotheses || 0,
        totalFindings: totalFindings || 0,
        approvedFindings: approvedFindings || 0,
      },
    });
  } catch (error) {
    console.error('Agent status error:', error);
    return NextResponse.json(
      { error: 'Failed to get agent status' },
      { status: 500 }
    );
  }
}
