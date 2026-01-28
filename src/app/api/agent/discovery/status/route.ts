/**
 * Discovery Agent Status API
 * GET /api/agent/discovery/status
 */

import { NextResponse } from 'next/server';
import { getDiscoveryStatus } from '@/lib/agent/discovery-manager';

export async function GET() {
  try {
    const status = await getDiscoveryStatus();
    return NextResponse.json(status);
  } catch (error) {
    console.error('Error fetching discovery status:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch status' },
      { status: 500 }
    );
  }
}
