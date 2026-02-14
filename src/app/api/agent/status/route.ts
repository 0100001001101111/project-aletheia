/**
 * Agent Status API
 * GET /api/agent/status - Returns current agent status and stats
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { createAgentReadClient } from '@/lib/agent/supabase-admin';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const agentClient = createAgentReadClient();

    // Get config
    const { data: configData } = await agentClient
      .from('aletheia_agent_config')
      .select('key, value');

    const config: Record<string, unknown> = {};
    for (const row of configData || []) {
      config[row.key] = row.value;
    }

    // Get current running session if any
    const { data: currentSession } = await agentClient
      .from('aletheia_agent_sessions')
      .select('*')
      .eq('status', 'running')
      .order('started_at', { ascending: false })
      .limit(1)
      .single();

    // Get last completed session
    const { data: lastSession } = await agentClient
      .from('aletheia_agent_sessions')
      .select('*')
      .neq('status', 'running')
      .order('ended_at', { ascending: false })
      .limit(1)
      .single();

    // Get total sessions count (using select id for efficiency)
    const { data: sessionsData } = await agentClient
      .from('aletheia_agent_sessions')
      .select('id');
    const totalSessions = sessionsData?.length || 0;

    // Get total hypotheses
    const { data: hypothesesData } = await agentClient
      .from('aletheia_agent_hypotheses')
      .select('id');
    const totalHypotheses = hypothesesData?.length || 0;

    // Get total findings
    const { data: findingsData } = await agentClient
      .from('aletheia_agent_findings')
      .select('id, review_status');
    const totalFindings = findingsData?.length || 0;

    // Get approved findings
    const approvedFindings = findingsData?.filter(f => f.review_status === 'approved').length || 0;

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
