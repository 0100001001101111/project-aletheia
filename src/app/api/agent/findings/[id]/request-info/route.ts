/**
 * Request More Info API
 * POST /api/agent/findings/[id]/request-info
 * Flags a finding for additional agent analysis
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase-server';

const VALID_REQUESTED_CHECKS = [
  'additional_confounds',
  'different_statistical_method',
  'prior_research',
  'additional_data',
  'subcategory_breakdown',
] as const;

type RequestedCheck = typeof VALID_REQUESTED_CHECKS[number];

// Type for finding
interface Finding {
  id: string;
  review_status: string | null;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServerClient();

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile (cast to any for untyped table)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: rawProfile } = await (supabase as any)
      .from('aletheia_users')
      .select('id')
      .eq('auth_id', user.id)
      .single();

    const profile = rawProfile as { id: string } | null;

    if (!profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    // Check finding exists (cast to any for untyped table)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: rawFinding, error: findingError } = await (supabase as any)
      .from('aletheia_agent_findings')
      .select('id, review_status')
      .eq('id', id)
      .single();

    const finding = rawFinding as Finding | null;

    if (findingError || !finding) {
      return NextResponse.json({ error: 'Finding not found' }, { status: 404 });
    }

    if (finding.review_status === 'approved') {
      return NextResponse.json({ error: 'Cannot request info on an approved finding' }, { status: 400 });
    }

    // Parse request body
    const body = await request.json();
    const { notes, requested_checks } = body as {
      notes: string;
      requested_checks?: RequestedCheck[];
    };

    // Validate notes
    if (!notes || notes.trim().length === 0) {
      return NextResponse.json(
        { error: 'Notes are required' },
        { status: 400 }
      );
    }

    // Validate requested checks if provided
    if (requested_checks && requested_checks.length > 0) {
      const invalidChecks = requested_checks.filter(
        check => !VALID_REQUESTED_CHECKS.includes(check)
      );
      if (invalidChecks.length > 0) {
        return NextResponse.json(
          { error: `Invalid requested checks: ${invalidChecks.join(', ')}` },
          { status: 400 }
        );
      }
    }

    // Update the finding (cast to any for untyped table)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateError } = await (supabase as any)
      .from('aletheia_agent_findings')
      .update({
        review_status: 'needs_info',
        reviewed_by: profile.id,
        reviewed_at: new Date().toISOString(),
        review_notes: notes,
        requested_checks: requested_checks || [],
        info_request_notes: notes,
      })
      .eq('id', id);

    if (updateError) {
      console.error('Error updating finding:', updateError);
      return NextResponse.json(
        { error: 'Failed to update finding' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Finding flagged for additional analysis',
    });
  } catch (error) {
    console.error('Request info error:', error);
    return NextResponse.json(
      { error: 'Failed to request info' },
      { status: 500 }
    );
  }
}
