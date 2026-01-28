/**
 * Agent Findings API
 * GET /api/agent/findings - List findings with filters
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAgentReadClient } from '@/lib/agent/supabase-admin';

export async function GET(request: NextRequest) {
  try {
    const supabase = createAgentReadClient();
    const { searchParams } = new URL(request.url);

    // Get filter params
    const status = searchParams.get('status'); // pending, approved, rejected, needs_info
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build query
    let query = supabase
      .from('aletheia_agent_findings')
      .select(`
        id,
        hypothesis_id,
        session_id,
        title,
        display_title,
        summary,
        confidence,
        review_status,
        rejection_reason,
        reviewed_by,
        reviewed_at,
        review_notes,
        created_prediction_id,
        created_at,
        technical_details
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply status filter
    if (status && status !== 'all') {
      query = query.eq('review_status', status);
    }

    const { data: findings, error } = await query;

    if (error) {
      console.error('Error fetching findings:', error);
      return NextResponse.json(
        { error: 'Failed to fetch findings' },
        { status: 500 }
      );
    }

    // Get counts by status
    const { data: allFindings } = await supabase
      .from('aletheia_agent_findings')
      .select('review_status');

    const counts = {
      total: allFindings?.length || 0,
      pending: allFindings?.filter(f => f.review_status === 'pending').length || 0,
      approved: allFindings?.filter(f => f.review_status === 'approved').length || 0,
      rejected: allFindings?.filter(f => f.review_status === 'rejected').length || 0,
      needs_info: allFindings?.filter(f => f.review_status === 'needs_info').length || 0,
    };

    // Extract domains from technical_details for each finding
    const findingsWithDomains = findings?.map(f => {
      const details = f.technical_details as Record<string, unknown> | null;
      let domains: string[] = [];

      // Try to extract domains from the test results or source pattern
      if (details?.test_results) {
        const testResults = details.test_results as Array<{ domains?: string[] }>;
        if (testResults[0]?.domains) {
          domains = testResults[0].domains;
        }
      }

      return {
        ...f,
        domains,
      };
    }) || [];

    return NextResponse.json({
      findings: findingsWithDomains,
      counts,
      pagination: {
        limit,
        offset,
        hasMore: (findings?.length || 0) === limit,
      },
    });
  } catch (error) {
    console.error('Findings list error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch findings' },
      { status: 500 }
    );
  }
}
