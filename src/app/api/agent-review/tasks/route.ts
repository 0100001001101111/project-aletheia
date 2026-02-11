import { NextRequest, NextResponse } from 'next/server';
import { createAgentReadClient } from '@/lib/agent/supabase-admin';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const agent = searchParams.get('agent');

  try {
    const supabase = createAgentReadClient();

    let query = supabase
      .from('aletheia_agent_tasks')
      .select('id, title, description, assigned_to, status, priority, created_at')
      .neq('status', 'deleted')
      .order('created_at', { ascending: false });

    if (agent) query = query.eq('assigned_to', agent);

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ tasks: data || [] });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch tasks';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
