/**
 * Deep Miner Results API
 * GET /api/agent/deep-miner/results
 * Returns cross-tabs, subgroup analyses, temporal stability for a session or domain
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { getAdminClient } from '@/lib/agent/supabase-admin';


export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('session_id');
    const domain = searchParams.get('domain');
    const resultType = searchParams.get('type') || 'all'; // all, cross_tabs, subgroups, temporal, variables

    if (!sessionId && !domain) {
      return NextResponse.json(
        { error: 'Either session_id or domain is required' },
        { status: 400 }
      );
    }

    const results: Record<string, unknown> = {};

    // Build filter
    const filter = sessionId
      ? { column: 'session_id', value: sessionId }
      : { column: 'domain', value: domain };

    // Get variable census
    if (resultType === 'all' || resultType === 'variables') {
      const { data: variables } = await getAdminClient()
        .from('aletheia_variable_census')
        .select('*')
        .eq(filter.column, filter.value)
        .order('non_null_count', { ascending: false })
        .limit(100);

      results.variables = variables || [];
    }

    // Get cross-tabulations (significant ones first)
    if (resultType === 'all' || resultType === 'cross_tabs') {
      const { data: crossTabs } = await getAdminClient()
        .from('aletheia_cross_tabulations')
        .select('*')
        .eq(filter.column, filter.value)
        .order('cramers_v', { ascending: false })
        .limit(50);

      results.cross_tabs = crossTabs || [];
      results.significant_cross_tabs = (crossTabs || []).filter(
        (ct: { significant: boolean }) => ct.significant
      );
    }

    // Get subgroup analyses
    if (resultType === 'all' || resultType === 'subgroups') {
      const { data: subgroups } = await getAdminClient()
        .from('aletheia_subgroup_analyses')
        .select('*')
        .eq(filter.column, filter.value)
        .limit(50);

      results.subgroups = subgroups || [];
    }

    // Get temporal stability
    if (resultType === 'all' || resultType === 'temporal') {
      const { data: temporal } = await getAdminClient()
        .from('aletheia_temporal_stability')
        .select('*')
        .eq(filter.column, filter.value)
        .order('stability_score', { ascending: false })
        .limit(30);

      results.temporal_stability = temporal || [];
    }

    // Get session info if session_id provided
    if (sessionId) {
      const { data: session } = await getAdminClient()
        .from('aletheia_deep_miner_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      results.session = session;
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error('Deep Miner results error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch results' },
      { status: 500 }
    );
  }
}
