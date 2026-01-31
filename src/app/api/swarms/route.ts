/**
 * Swarms API Route
 * Returns swarm data from the central registry
 */

import { NextResponse } from 'next/server';
import { getActiveSwarms, SWARMS } from '@/config/swarms';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('active') === 'true';

    // Return swarms from registry
    const swarms = activeOnly ? getActiveSwarms() : SWARMS;

    // Transform to API format for backwards compatibility
    const response = swarms.map(swarm => ({
      id: swarm.id,
      name: swarm.name,
      tagline: swarm.tagline,
      description: swarm.description,
      icon: swarm.icon,
      color: swarm.color,
      status: swarm.status,
      tier: swarm.tier,
      domain: swarm.domain,
      agent_count: swarm.agents.length,
      discovery_count: 0, // Would be fetched from DB in production
      investigation_count: 0, // Would be fetched from DB in production
    }));

    return NextResponse.json(response);
  } catch (error) {
    console.error('Swarms GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
