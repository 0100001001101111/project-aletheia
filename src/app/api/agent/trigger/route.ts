/**
 * Agent Trigger API
 * POST /api/agent/trigger - Manually trigger an agent run
 *
 * Body parameters:
 * - triggerType: 'manual' | 'scheduled' (default: 'manual')
 * - mode: 'demo' | 'full' (default: 'full')
 */

import { NextRequest, NextResponse } from 'next/server';
import { AletheiaAgent, isAgentEnabled } from '@/lib/agent/runner';
import { createClient } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  try {
    // Auth check: require authenticated user
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Check if agent is enabled
    const enabled = await isAgentEnabled();
    if (!enabled) {
      return NextResponse.json(
        { error: 'Agent is disabled' },
        { status: 403 }
      );
    }

    // Parse request body for trigger type and mode
    let triggerType = 'manual';
    let mode = 'full';

    try {
      const body = await request.json();
      if (body.triggerType) {
        triggerType = body.triggerType;
      }
      if (body.mode) {
        mode = body.mode;
      }
    } catch {
      // No body or invalid JSON, use defaults
    }

    // Create and run agent
    const agent = new AletheiaAgent();

    // Run the appropriate mode
    let sessionIdPromise: Promise<string>;

    if (mode === 'demo') {
      sessionIdPromise = agent.runDemo(triggerType);
    } else {
      sessionIdPromise = agent.run(triggerType);
    }

    // Wait for session to start and complete
    const sessionId = await sessionIdPromise;

    return NextResponse.json({
      success: true,
      sessionId,
      mode,
      message: mode === 'demo' ? 'Demo run completed' : 'Analysis run completed',
    });
  } catch (error) {
    console.error('Agent trigger error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to trigger agent' },
      { status: 500 }
    );
  }
}
