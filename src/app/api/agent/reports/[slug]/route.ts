/**
 * Agent Report Detail API
 * GET /api/agent/reports/[slug] - Get report by slug
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAgentReadClient } from '@/lib/agent/supabase-admin';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const supabase = createAgentReadClient();

    // Try to find by slug first
    let query = supabase
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
      const idQuery = supabase
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
