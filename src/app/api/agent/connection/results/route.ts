/**
 * Connection Agent - Results API
 * GET: Retrieve analysis results (mappings, correlations, Keel tests, profiles)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { getMappings } from '@/lib/agent/connection/variable-mapper';
import { getCorrelations } from '@/lib/agent/connection/correlation-finder';
import { getKeelTests } from '@/lib/agent/connection/keel-tester';
import { getWitnessProfiles } from '@/lib/agent/connection/witness-clusterer';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // mappings, correlations, keel, profiles
    const sessionId = searchParams.get('session_id') || undefined;
    const domain = searchParams.get('domain') || undefined;
    const limit = parseInt(searchParams.get('limit') || '50');

    if (!type) {
      return NextResponse.json(
        { error: 'type parameter required (mappings, correlations, keel, profiles)' },
        { status: 400 }
      );
    }

    switch (type) {
      case 'mappings': {
        const mappings = await getMappings(domain, undefined, 0);
        return NextResponse.json({ mappings: mappings.slice(0, limit) });
      }

      case 'correlations': {
        const correlations = await getCorrelations({
          domainA: domain,
          significantOnly: searchParams.get('significant') === 'true',
          limit,
        });
        return NextResponse.json({ correlations });
      }

      case 'keel': {
        const tests = await getKeelTests({
          sessionId,
          supportsKeel: searchParams.get('supports') === 'true' ? true : undefined,
          limit,
        });
        return NextResponse.json({ tests });
      }

      case 'profiles': {
        const profiles = await getWitnessProfiles({ sessionId, limit });
        return NextResponse.json({ profiles });
      }

      default:
        return NextResponse.json(
          { error: 'Invalid type. Must be mappings, correlations, keel, or profiles' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Connection results API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
