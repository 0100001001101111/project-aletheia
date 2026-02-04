/**
 * Connection Agent - Trigger API
 * POST: Start a new Connection Agent session
 */

import { NextRequest, NextResponse } from 'next/server';
import { runConnectionAgent } from '@/lib/agent/connection';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { domains, analysis_types } = body;

    // Run the Connection Agent
    const sessionId = await runConnectionAgent(domains, analysis_types);

    return NextResponse.json({
      success: true,
      sessionId,
    });
  } catch (error) {
    console.error('Connection Agent trigger error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to trigger Connection Agent' },
      { status: 500 }
    );
  }
}
