/**
 * Synthesis Agent - Results API
 * GET: Retrieve deep dives, syntheses, and briefs
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDomainDeepDives } from '@/lib/agent/synthesis/domain-deep-dive';
import { getCrossDomainSyntheses } from '@/lib/agent/synthesis/cross-domain-synthesizer';
import { getResearchBriefs } from '@/lib/agent/synthesis/research-brief-generator';
import type { AudienceType } from '@/lib/agent/synthesis/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // deep_dives, syntheses, briefs
    const domain = searchParams.get('domain') || undefined;
    const status = searchParams.get('status') || undefined;
    const limit = parseInt(searchParams.get('limit') || '20');

    if (!type) {
      return NextResponse.json(
        { error: 'type parameter required (deep_dives, syntheses, briefs)' },
        { status: 400 }
      );
    }

    switch (type) {
      case 'deep_dives': {
        const deepDives = await getDomainDeepDives({ domain, status, limit });
        return NextResponse.json({ deep_dives: deepDives });
      }

      case 'syntheses': {
        const theme = searchParams.get('theme') || undefined;
        const syntheses = await getCrossDomainSyntheses({ theme, status, limit });
        return NextResponse.json({ syntheses });
      }

      case 'briefs': {
        const audience = searchParams.get('audience') as AudienceType | undefined;
        const briefs = await getResearchBriefs({ audience, status, limit });
        return NextResponse.json({ briefs });
      }

      default:
        return NextResponse.json(
          { error: 'Invalid type. Must be deep_dives, syntheses, or briefs' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Synthesis results API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
