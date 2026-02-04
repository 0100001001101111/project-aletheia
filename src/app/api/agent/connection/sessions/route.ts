/**
 * Connection Agent - Sessions API
 * GET: List Connection Agent sessions
 */

import { NextRequest, NextResponse } from 'next/server';
import { getConnectionSessions, getConnectionSession } from '@/lib/agent/connection';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const limit = parseInt(searchParams.get('limit') || '20');

    if (id) {
      const session = await getConnectionSession(id);
      if (!session) {
        return NextResponse.json(
          { error: 'Session not found' },
          { status: 404 }
        );
      }
      return NextResponse.json({ session });
    }

    const sessions = await getConnectionSessions(limit);
    return NextResponse.json({ sessions });
  } catch (error) {
    console.error('Connection sessions API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
