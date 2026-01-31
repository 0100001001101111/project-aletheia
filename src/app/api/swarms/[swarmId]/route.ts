/**
 * Individual Swarm API Route
 * Get swarm details from the central registry
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSwarmById } from '@/config/swarms';

interface RouteParams {
  params: Promise<{ swarmId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { swarmId } = await params;

    // Get swarm from registry
    const swarm = getSwarmById(swarmId);

    if (!swarm) {
      return NextResponse.json(
        { error: 'Swarm not found' },
        { status: 404 }
      );
    }

    // Transform to API format
    return NextResponse.json({
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
      discovery_count: 0,
      investigation_count: 0,
      agents: swarm.agents,
      schemas: swarm.schemas,
      dataSources: swarm.dataSources,
    });
  } catch (error) {
    console.error('Swarm GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
