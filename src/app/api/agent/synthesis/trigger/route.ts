/**
 * Synthesis Agent - Trigger API
 * POST: Start a new Synthesis Agent session
 */

import { NextRequest, NextResponse } from 'next/server';
import { runSynthesisAgent } from '@/lib/agent/synthesis';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { domains, synthesis_types } = body;

    const sessionId = await runSynthesisAgent(domains, synthesis_types);

    return NextResponse.json({
      success: true,
      sessionId,
    });
  } catch (error) {
    console.error('Synthesis Agent trigger error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to trigger Synthesis Agent' },
      { status: 500 }
    );
  }
}
