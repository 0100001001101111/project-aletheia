/**
 * Discovery Sessions API
 * GET /api/agent/discovery/sessions
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDiscoverySessions } from '@/lib/agent/discovery-manager';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    const sessions = await getDiscoverySessions(limit);

    return NextResponse.json({
      sessions,
      count: sessions.length,
    });
  } catch (error) {
    console.error('Error fetching discovery sessions:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch sessions' },
      { status: 500 }
    );
  }
}
