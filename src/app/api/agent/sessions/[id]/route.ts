/**
 * Agent Session Detail API
 * GET /api/agent/sessions/[id] - Get session with all logs
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { createAgentReadClient } from '@/lib/agent/supabase-admin';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id } = await params;
    const agentClient = createAgentReadClient();

    // Get session
    const { data: session, error: sessionError } = await agentClient
      .from('aletheia_agent_sessions')
      .select('*')
      .eq('id', id)
      .single();

    if (sessionError) {
      if (sessionError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Session not found' },
          { status: 404 }
        );
      }
      throw sessionError;
    }

    // Get logs for this session
    const { data: logs, error: logsError } = await agentClient
      .from('aletheia_agent_logs')
      .select('*')
      .eq('session_id', id)
      .order('timestamp', { ascending: true });

    if (logsError) {
      throw logsError;
    }

    return NextResponse.json({
      session,
      logs: logs || [],
    });
  } catch (error) {
    console.error('Agent session detail error:', error);
    return NextResponse.json(
      { error: 'Failed to get agent session' },
      { status: 500 }
    );
  }
}
