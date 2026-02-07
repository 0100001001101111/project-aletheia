/**
 * Reject Finding API
 * POST /api/agent/findings/[id]/reject
 * Rejects a finding with reason
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase-server';

const VALID_REJECTION_REASONS = [
  'duplicate',
  'methodology',
  'insufficient_evidence',
  'already_known',
  'not_actionable',
  'other',
] as const;

type RejectionReason = typeof VALID_REJECTION_REASONS[number];

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

    // Check finding exists and is pending (cast to any for untyped table)
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
      return NextResponse.json({ error: 'Cannot reject an approved finding' }, { status: 400 });
    }

    // Parse request body
    const body = await request.json();
    const { reason, notes } = body as {
      reason: RejectionReason;
      notes?: string;
    };

    // Validate reason
    if (!reason || !VALID_REJECTION_REASONS.includes(reason)) {
      return NextResponse.json(
        { error: `Invalid rejection reason. Must be one of: ${VALID_REJECTION_REASONS.join(', ')}` },
        { status: 400 }
      );
    }

    // Require notes for "other" reason
    if (reason === 'other' && !notes) {
      return NextResponse.json(
        { error: 'Notes required when reason is "other"' },
        { status: 400 }
      );
    }

    // Build review notes
    const reviewNotes = `Rejection reason: ${reason}${notes ? `\n\nNotes: ${notes}` : ''}`;

    // Update the finding (cast to any for untyped table)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateError } = await (supabase as any)
      .from('aletheia_agent_findings')
      .update({
        review_status: 'rejected',
        destination_status: 'rejected',
        rejection_reason: reason,
        reviewed_by: profile.id,
        reviewed_at: new Date().toISOString(),
        review_notes: reviewNotes,
      })
      .eq('id', id);

    if (updateError) {
      console.error('Error updating finding:', updateError);
      return NextResponse.json(
        { error: 'Failed to reject finding' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Finding rejected',
    });
  } catch (error) {
    console.error('Reject finding error:', error);
    return NextResponse.json(
      { error: 'Failed to reject finding' },
      { status: 500 }
    );
  }
}
