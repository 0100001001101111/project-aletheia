/**
 * Discovery Agent v2 - Literature Syntheses API
 * GET: List literature syntheses
 */

import { NextRequest, NextResponse } from 'next/server';
import { getLiteratureSyntheses } from '@/lib/agent/discovery-v2/literature-synthesis';
import { getAdminClient } from '@/lib/agent/supabase-admin';


export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const domain = searchParams.get('domain') || undefined;
    const id = searchParams.get('id');
    const limit = parseInt(searchParams.get('limit') || '20');

    // Get single synthesis by ID
    if (id) {
      const { data, error } = await getAdminClient()
        .from('aletheia_literature_syntheses')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        return NextResponse.json(
          { error: 'Synthesis not found' },
          { status: 404 }
        );
      }
      return NextResponse.json({ synthesis: data });
    }

    // Get syntheses with optional domain filter
    const syntheses = await getLiteratureSyntheses(domain, limit);
    return NextResponse.json({ syntheses });
  } catch (error) {
    console.error('Literature syntheses API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
