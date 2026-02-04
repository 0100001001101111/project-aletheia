/**
 * Mechanism Agent - Sessions API
 * GET: List Mechanism Agent sessions
 */

import { NextRequest, NextResponse } from 'next/server';
import { getMechanismSessions, getMechanismSession } from '@/lib/agent/mechanism';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const limit = parseInt(searchParams.get('limit') || '20');

    if (id) {
      const session = await getMechanismSession(id);
      if (!session) {
        return NextResponse.json(
          { error: 'Session not found' },
          { status: 404 }
        );
      }
      return NextResponse.json({ session });
    }

    const sessions = await getMechanismSessions(limit);
    return NextResponse.json({ sessions });
  } catch (error) {
    console.error('Mechanism sessions API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
