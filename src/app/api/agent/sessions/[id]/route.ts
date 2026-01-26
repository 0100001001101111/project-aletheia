/**
 * Agent Session Detail API
 * GET /api/agent/sessions/[id] - Get session with all logs
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAgentReadClient } from '@/lib/agent/supabase-admin';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createAgentReadClient();

    // Get session
    const { data: session, error: sessionError } = await supabase
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
    const { data: logs, error: logsError } = await supabase
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
