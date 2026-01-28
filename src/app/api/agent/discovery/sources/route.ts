/**
 * Discovery Sources API
 * GET /api/agent/discovery/sources - List monitored sources
 * POST /api/agent/discovery/sources - Add new source
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDiscoverySources, createDiscoverySource } from '@/lib/agent/discovery-manager';
import type { DiscoverySourceType, MonitorFrequency, QualityEstimate } from '@/lib/agent/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const source_type = searchParams.get('type');
    const activeOnly = searchParams.get('active') !== 'false';

    const sources = await getDiscoverySources({
      active: activeOnly,
      source_type: source_type || undefined,
    });

    // Group by type for UI
    const grouped = sources.reduce((acc, source) => {
      const type = source.source_type || 'other';
      if (!acc[type]) acc[type] = [];
      acc[type].push(source);
      return acc;
    }, {} as Record<string, typeof sources>);

    return NextResponse.json({
      sources,
      grouped,
      count: sources.length,
    });
  } catch (error) {
    console.error('Error fetching sources:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch sources' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      url,
      source_type,
      monitor_frequency,
      quality_tier,
      notes,
    } = body;

    if (!name || !source_type) {
      return NextResponse.json(
        { error: 'Name and source_type are required' },
        { status: 400 }
      );
    }

    const source = await createDiscoverySource({
      name,
      url,
      source_type: source_type as DiscoverySourceType,
      monitor_frequency: (monitor_frequency || 'weekly') as MonitorFrequency,
      quality_tier: (quality_tier || 'medium') as QualityEstimate,
      notes,
      leads_found: 0,
      leads_approved: 0,
      active: true,
    });

    return NextResponse.json({
      success: true,
      source,
    });
  } catch (error) {
    console.error('Error creating source:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create source' },
      { status: 500 }
    );
  }
}
