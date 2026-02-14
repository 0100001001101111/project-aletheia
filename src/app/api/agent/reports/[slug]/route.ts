/**
 * Agent Report Detail API
 * GET /api/agent/reports/[slug] - Get report by slug
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { createAgentReadClient } from '@/lib/agent/supabase-admin';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { slug } = await params;
    const agentClient = createAgentReadClient();

    // Try to find by slug first
    let query = agentClient
      .from('aletheia_agent_reports')
      .select(`
        *,
        finding:aletheia_agent_findings(
          id,
          title,
          display_title,
          summary,
          confidence,
          review_status
        )
      `)
      .eq('slug', slug)
      .single();

    let { data: report, error } = await query;

    // If not found by slug, try by ID (for backward compatibility)
    if (error && error.code === 'PGRST116') {
      const idQuery = agentClient
        .from('aletheia_agent_reports')
        .select(`
          *,
          finding:aletheia_agent_findings(
            id,
            title,
            display_title,
            summary,
            confidence,
            review_status
          )
        `)
        .eq('id', slug)
        .single();

      const result = await idQuery;
      report = result.data;
      error = result.error;
    }

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Report not found' }, { status: 404 });
      }
      console.error('Error fetching report:', error);
      return NextResponse.json(
        { error: 'Failed to fetch report' },
        { status: 500 }
      );
    }

    return NextResponse.json({ report });
  } catch (error) {
    console.error('Report detail API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch report' },
      { status: 500 }
    );
  }
}
