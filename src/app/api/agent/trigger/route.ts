/**
 * Agent Trigger API
 * POST /api/agent/trigger - Manually trigger an agent run
 */

import { NextRequest, NextResponse } from 'next/server';
import { AletheiaAgent, isAgentEnabled } from '@/lib/agent/runner';

export async function POST(request: NextRequest) {
  try {
    // Check if agent is enabled
    const enabled = await isAgentEnabled();
    if (!enabled) {
      return NextResponse.json(
        { error: 'Agent is disabled' },
        { status: 403 }
      );
    }

    // Parse request body for trigger type
    let triggerType = 'manual';
    try {
      const body = await request.json();
      if (body.triggerType) {
        triggerType = body.triggerType;
      }
    } catch {
      // No body or invalid JSON, use default
    }

    // Create and run agent
    const agent = new AletheiaAgent();

    // Run the demo session (non-blocking)
    // In a real implementation, this would be handled by a background job
    const sessionIdPromise = agent.runDemo(triggerType);

    // Return immediately with session ID
    // The client can then subscribe to logs via Realtime
    const sessionId = await agent.currentSessionId;

    // Wait for the demo to start (get session ID)
    const finalSessionId = await sessionIdPromise;

    return NextResponse.json({
      success: true,
      sessionId: finalSessionId,
      message: 'Agent run started',
    });
  } catch (error) {
    console.error('Agent trigger error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to trigger agent' },
      { status: 500 }
    );
  }
}
