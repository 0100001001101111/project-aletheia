/**
 * Tracked Researchers API
 * GET /api/agent/discovery/researchers - List tracked researchers
 * POST /api/agent/discovery/researchers - Add new researcher
 */

import { NextRequest, NextResponse } from 'next/server';
import { getTrackedResearchers, createTrackedResearcher } from '@/lib/agent/discovery-manager';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const domain = searchParams.get('domain');
    const activeOnly = searchParams.get('active') !== 'false';

    const researchers = await getTrackedResearchers({
      active: activeOnly,
      domain: domain || undefined,
    });

    // Group by primary domain for UI
    const grouped = researchers.reduce((acc, researcher) => {
      const domain = researcher.domains?.[0] || 'other';
      if (!acc[domain]) acc[domain] = [];
      acc[domain].push(researcher);
      return acc;
    }, {} as Record<string, typeof researchers>);

    return NextResponse.json({
      researchers,
      grouped,
      count: researchers.length,
    });
  } catch (error) {
    console.error('Error fetching researchers:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch researchers' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      affiliations,
      domains,
      email,
      website,
      google_scholar,
      credibility_score,
      notes,
    } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    const researcher = await createTrackedResearcher({
      name,
      affiliations: affiliations || [],
      domains: domains || [],
      email,
      website,
      google_scholar,
      credibility_score: credibility_score || 50,
      notes,
      active: true,
    });

    return NextResponse.json({
      success: true,
      researcher,
    });
  } catch (error) {
    console.error('Error creating researcher:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create researcher' },
      { status: 500 }
    );
  }
}
