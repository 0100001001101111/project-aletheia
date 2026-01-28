/**
 * Discovery Agent Trigger API
 * POST /api/agent/discovery/trigger
 */

import { NextRequest, NextResponse } from 'next/server';
import { discoveryAgent } from '@/lib/agent/discovery-runner';
import { getCurrentDiscoverySession } from '@/lib/agent/discovery-manager';

export async function POST(request: NextRequest) {
  try {
    // Check for existing running session
    const currentSession = await getCurrentDiscoverySession();
    if (currentSession) {
      return NextResponse.json(
        { error: 'Discovery Agent is already running', sessionId: currentSession.id },
        { status: 409 }
      );
    }

    // Parse request body
    const body = await request.json().catch(() => ({}));
    const {
      triggerType = 'manual',
      mode = 'full',
      focusAreas = [],
    } = body;

    // Run agent (non-blocking for API response)
    const sessionPromise = discoveryAgent.run({
      triggerType,
      focusAreas,
      demoMode: mode === 'demo',
    });

    // Wait briefly to get session ID
    const session = await Promise.race([
      sessionPromise,
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 100)),
    ]);

    // If session started quickly, return it
    // Otherwise, the agent is running in background
    if (session) {
      return NextResponse.json({
        message: 'Discovery session started',
        sessionId: session.id,
        status: session.status,
      });
    }

    return NextResponse.json({
      message: 'Discovery session starting...',
    });
  } catch (error) {
    console.error('Error triggering discovery agent:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to trigger agent' },
      { status: 500 }
    );
  }
}
