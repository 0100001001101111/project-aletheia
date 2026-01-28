/**
 * Discovery Leads API
 * GET /api/agent/discovery/leads - List leads with filters
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDiscoveryLeads, getLeadStats } from '@/lib/agent/discovery-manager';
import type { LeadStatus, LeadPriority } from '@/lib/agent/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const status = searchParams.get('status') as LeadStatus | null;
    const lead_type = searchParams.get('type');
    const priority = searchParams.get('priority') as LeadPriority | null;
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const leads = await getDiscoveryLeads({
      status: status || undefined,
      lead_type: lead_type || undefined,
      priority: priority || undefined,
      limit,
    });

    const stats = await getLeadStats();

    return NextResponse.json({
      leads,
      stats,
      count: leads.length,
    });
  } catch (error) {
    console.error('Error fetching leads:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch leads' },
      { status: 500 }
    );
  }
}
