/**
 * Agent Reports API
 * GET /api/agent/reports - List reports with filtering
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAgentReadClient } from '@/lib/agent/supabase-admin';

export async function GET(request: NextRequest) {
  try {
    const supabase = createAgentReadClient();
    const searchParams = request.nextUrl.searchParams;

    // Parse query parameters
    const status = searchParams.get('status') || 'published';
    const verdict = searchParams.get('verdict');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build query
    let query = supabase
      .from('aletheia_agent_reports')
      .select('*')
      .order('created_at', { ascending: false });

    // Apply filters
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    if (verdict && verdict !== 'all') {
      query = query.eq('verdict', verdict);
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data: reports, error } = await query;

    if (error) {
      console.error('Error fetching reports:', error);
      return NextResponse.json(
        { error: 'Failed to fetch reports' },
        { status: 500 }
      );
    }

    // Get counts for filters
    const { data: countData } = await supabase
      .from('aletheia_agent_reports')
      .select('status, verdict');

    const counts = {
      total: countData?.length || 0,
      published: 0,
      draft: 0,
      byVerdict: {} as Record<string, number>,
    };

    for (const report of countData || []) {
      if (report.status === 'published') {
        counts.published++;
      } else {
        counts.draft++;
      }

      const v = report.verdict || 'unknown';
      counts.byVerdict[v] = (counts.byVerdict[v] || 0) + 1;
    }

    return NextResponse.json({
      reports: reports || [],
      counts,
      pagination: {
        limit,
        offset,
        total: counts.total,
      },
    });
  } catch (error) {
    console.error('Reports API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reports' },
      { status: 500 }
    );
  }
}
