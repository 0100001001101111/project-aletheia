/**
 * Mechanism Agent - Trigger API
 * POST: Start a new Mechanism Agent session
 */

import { NextRequest, NextResponse } from 'next/server';
import { runMechanismAgent } from '@/lib/agent/mechanism';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { domains, focus_areas } = body;

    const sessionId = await runMechanismAgent(domains, focus_areas);

    return NextResponse.json({
      success: true,
      sessionId,
    });
  } catch (error) {
    console.error('Mechanism Agent trigger error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to trigger Mechanism Agent' },
      { status: 500 }
    );
  }
}
