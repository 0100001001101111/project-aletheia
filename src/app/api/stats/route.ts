/**
 * Stats API Route
 * Returns real statistics from the database
 */

import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase-server';

export async function GET() {
  try {
    const supabase = await createServerClient();

    // Fetch domain counts in parallel
    const [
      { count: ndeCount },
      { count: ganzfeldCount },
      { count: crisisCount },
      { count: stargateCount },
      { count: geophysicalCount },
      { count: ufoCount },
      { count: bigfootCount },
      { count: hauntingCount },
    ] = await Promise.all([
      supabase.from('aletheia_investigations').select('*', { count: 'exact', head: true }).eq('investigation_type', 'nde'),
      supabase.from('aletheia_investigations').select('*', { count: 'exact', head: true }).eq('investigation_type', 'ganzfeld'),
      supabase.from('aletheia_investigations').select('*', { count: 'exact', head: true }).eq('investigation_type', 'crisis_apparition'),
      supabase.from('aletheia_investigations').select('*', { count: 'exact', head: true }).eq('investigation_type', 'stargate'),
      supabase.from('aletheia_investigations').select('*', { count: 'exact', head: true }).eq('investigation_type', 'geophysical'),
      supabase.from('aletheia_investigations').select('*', { count: 'exact', head: true }).eq('investigation_type', 'ufo'),
      supabase.from('aletheia_investigations').select('*', { count: 'exact', head: true }).eq('investigation_type', 'bigfoot'),
      supabase.from('aletheia_investigations').select('*', { count: 'exact', head: true }).eq('investigation_type', 'haunting'),
    ]);

    const domainCounts = {
      nde: ndeCount || 0,
      ganzfeld: ganzfeldCount || 0,
      crisis_apparition: crisisCount || 0,
      stargate: stargateCount || 0,
      geophysical: geophysicalCount || 0,
      ufo: ufoCount || 0,
      bigfoot: bigfootCount || 0,
      haunting: hauntingCount || 0,
    };

    return NextResponse.json({
      domainCounts,
      totalInvestigations: Object.values(domainCounts).reduce((a, b) => a + b, 0),
    });
  } catch (error) {
    console.error('Stats API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}
