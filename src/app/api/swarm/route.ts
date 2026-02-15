/**
 * Swarm Dashboard API
 * GET /api/swarm - Returns all data for the swarm control room
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

    const db = createAgentReadClient();
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const [agentsRes, pendingTasksRes, findingsRes, triggersRes, completedRes, abandonedRes] = await Promise.all([
      db.from('agent_status').select('*').order('agent_name'),
      db.from('agent_tasks').select('id, title, assigned_agent, status, priority, created_at, task_type, claimed_by').in('status', ['pending', 'in_progress']).order('priority').order('created_at'),
      db.from('aletheia_agent_findings').select('id, title, display_title, confidence, review_status, agent_id, created_at').gte('created_at', weekAgo).order('created_at', { ascending: false }).limit(100),
      db.from('trigger_status').select('*').order('trigger_id'),
      db.from('agent_tasks').select('id', { count: 'exact', head: true }).eq('status', 'completed').gte('completed_at', weekAgo),
      db.from('agent_tasks').select('id', { count: 'exact', head: true }).eq('status', 'abandoned'),
    ]);

    if (agentsRes.error) throw agentsRes.error;

    const agents = agentsRes.data || [];
    const pendingTasks = pendingTasksRes.data || [];
    const findings = findingsRes.data || [];
    const triggers = triggersRes.data || [];

    // Stats
    const activeCount = agents.filter((a: { status: string }) => ['running', 'idle'].includes(a.status || '')).length;
    const approvedCount = findings.filter((f: { review_status: string }) => f.review_status === 'approved').length;
    const rejectedCount = findings.filter((f: { review_status: string }) => f.review_status === 'rejected').length;
    const reviewedCount = approvedCount + rejectedCount;
    const approvalRate = reviewedCount > 0 ? Math.round((approvedCount / reviewedCount) * 100) : 0;

    return NextResponse.json({
      stats: {
        activeAgents: activeCount,
        totalAgents: agents.length,
        pendingTasks: pendingTasks.filter((t: { status: string }) => t.status === 'pending').length,
        findingsThisWeek: findings.length,
        approvalRate,
      },
      agents,
      queue: {
        tasks: pendingTasks,
        totalPending: pendingTasks.filter((t: { status: string }) => t.status === 'pending').length,
        inProgress: pendingTasks.filter((t: { status: string }) => t.status === 'in_progress').length,
        completedThisWeek: completedRes.count || 0,
        abandoned: abandonedRes.count || 0,
        oldestPending: pendingTasks.length > 0 ? pendingTasks[0]?.created_at : null,
      },
      findings,
      triggers,
    });
  } catch (err) {
    console.error('Swarm fetch error:', err);
    return NextResponse.json({ error: 'Failed to fetch swarm data' }, { status: 500 });
  }
}
