/**
 * Synthesis Agent - Sessions API
 * GET: List Synthesis Agent sessions
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSynthesisSessions, getSynthesisSession } from '@/lib/agent/synthesis';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const limit = parseInt(searchParams.get('limit') || '20');

    if (id) {
      const session = await getSynthesisSession(id);
      if (!session) {
        return NextResponse.json(
          { error: 'Session not found' },
          { status: 404 }
        );
      }
      return NextResponse.json({ session });
    }

    const sessions = await getSynthesisSessions(limit);
    return NextResponse.json({ sessions });
  } catch (error) {
    console.error('Synthesis sessions API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
