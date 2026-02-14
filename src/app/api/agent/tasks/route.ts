/**
 * Agent Tasks API
 * GET /api/agent/tasks - List tasks with counts
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

    const supabaseAdmin = createAgentReadClient();

    const { data: tasks, error } = await supabaseAdmin
      .from('aletheia_agent_tasks')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Error fetching tasks:', error);
      return NextResponse.json(
        { error: 'Failed to fetch tasks' },
        { status: 500 }
      );
    }

    // Calculate counts
    const completed = (tasks || []).filter(
      t => t.status === 'completed' || t.status === 'done'
    ).length;
    const active = (tasks || []).filter(
      t => t.status === 'assigned' || t.status === 'in_progress' || t.status === 'pending'
    ).length;

    return NextResponse.json({
      tasks: tasks || [],
      counts: {
        completed,
        active,
        total: tasks?.length || 0,
      },
    });
  } catch (error) {
    console.error('Tasks list error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tasks' },
      { status: 500 }
    );
  }
}
