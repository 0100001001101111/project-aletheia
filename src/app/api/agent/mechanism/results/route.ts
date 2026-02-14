/**
 * Mechanism Agent - Results API
 * GET: Retrieve mechanisms, tests, and theories
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { getAllMechanisms, getMechanismsByDomain } from '@/lib/agent/mechanism/mechanism-catalog';
import { getDiscriminatingTests } from '@/lib/agent/mechanism/test-designer';
import { getUnifiedTheories } from '@/lib/agent/mechanism/theory-builder';
import type { MechanismType, SupportLevel, Priority, Plausibility } from '@/lib/agent/mechanism/types';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // mechanisms, tests, theories
    const domain = searchParams.get('domain') || undefined;
    const sessionId = searchParams.get('session_id') || undefined;
    const limit = parseInt(searchParams.get('limit') || '50');

    if (!type) {
      return NextResponse.json(
        { error: 'type parameter required (mechanisms, tests, theories)' },
        { status: 400 }
      );
    }

    switch (type) {
      case 'mechanisms': {
        if (domain) {
          const mechanisms = await getMechanismsByDomain(domain);
          return NextResponse.json({ mechanisms: mechanisms.slice(0, limit) });
        } else {
          const mechanisms = await getAllMechanisms({
            type: searchParams.get('mechanism_type') as MechanismType | undefined,
            support: searchParams.get('support') as SupportLevel | undefined,
            limit,
          });
          return NextResponse.json({ mechanisms });
        }
      }

      case 'tests': {
        const tests = await getDiscriminatingTests({
          sessionId,
          status: searchParams.get('status') || undefined,
          priority: searchParams.get('priority') as Priority | undefined,
          limit,
        });
        return NextResponse.json({ tests });
      }

      case 'theories': {
        const theories = await getUnifiedTheories({
          sessionId,
          plausibility: searchParams.get('plausibility') as Plausibility | undefined,
          limit,
        });
        return NextResponse.json({ theories });
      }

      default:
        return NextResponse.json(
          { error: 'Invalid type. Must be mechanisms, tests, or theories' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Mechanism results API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
