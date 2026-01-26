/**
 * Agent Sessions API
 * GET /api/agent/sessions - List sessions with pagination
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAgentReadClient } from '@/lib/agent/supabase-admin';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    const supabase = createAgentReadClient();

    // Get sessions with pagination
    const { data: sessions, error, count } = await supabase
      .from('aletheia_agent_sessions')
      .select('*', { count: 'exact' })
      .order('started_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw error;
    }

    return NextResponse.json({
      sessions: sessions || [],
      pagination: {
        total: count || 0,
        limit,
        offset,
        hasMore: (count || 0) > offset + limit,
      },
    });
  } catch (error) {
    console.error('Agent sessions error:', error);
    return NextResponse.json(
      { error: 'Failed to get agent sessions' },
      { status: 500 }
    );
  }
}
