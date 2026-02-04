/**
 * Deep Miner Trigger API
 * POST /api/agent/deep-miner/trigger
 */

import { NextRequest, NextResponse } from 'next/server';
import { runDeepMiner } from '@/lib/agent/deep-miner';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { domain } = body;

    if (!domain) {
      return NextResponse.json(
        { error: 'Domain is required' },
        { status: 400 }
      );
    }

    // Valid domains
    const validDomains = [
      'nde', 'ufo', 'ganzfeld', 'stargate', 'geophysical',
      'crisis_apparition', 'haunting', 'bigfoot', 'crop_circle'
    ];

    if (!validDomains.includes(domain)) {
      return NextResponse.json(
        { error: `Invalid domain. Must be one of: ${validDomains.join(', ')}` },
        { status: 400 }
      );
    }

    // Run Deep Miner asynchronously
    const sessionId = await runDeepMiner(domain);

    return NextResponse.json({
      success: true,
      session_id: sessionId,
      domain,
      message: `Deep Miner started for domain: ${domain}`,
    });
  } catch (error) {
    console.error('Deep Miner trigger error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to start Deep Miner' },
      { status: 500 }
    );
  }
}
