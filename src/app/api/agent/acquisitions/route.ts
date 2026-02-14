/**
 * Acquisition Requests API
 * GET /api/agent/acquisitions - List acquisition requests
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import {
  getAcquisitionRequests,
  getAcquisitionStats,
} from '@/lib/agent/acquisition-manager';
import type { AcquisitionStatus } from '@/lib/agent/types';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as AcquisitionStatus | null;
    const domain = searchParams.get('domain');
    const limit = searchParams.get('limit');

    // Get requests with filters
    const requests = await getAcquisitionRequests({
      status: status || undefined,
      domain: domain || undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });

    // Get stats
    const stats = await getAcquisitionStats();

    return NextResponse.json({
      requests,
      stats,
    });
  } catch (error) {
    console.error('Acquisitions API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch acquisitions' },
      { status: 500 }
    );
  }
}
