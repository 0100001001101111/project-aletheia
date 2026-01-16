/**
 * Jury Assignment API Route
 * Check if user is assigned as a juror for a dispute
 *
 * Note: Type assertions used until migrations are applied and types regenerated
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase-server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = any;

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createServerClient() as AnyClient;

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ assignment: null });
    }

    // Check jury pool assignment
    const { data: assignment, error } = await supabase
      .from('aletheia_jury_pool')
      .select('*')
      .eq('dispute_id', id)
      .eq('juror_id', user.id)
      .single();

    if (error || !assignment) {
      return NextResponse.json({ assignment: null });
    }

    // Check if user has voted
    const { data: vote } = await supabase
      .from('aletheia_jury_votes')
      .select('vote')
      .eq('dispute_id', id)
      .eq('juror_id', user.id)
      .single();

    return NextResponse.json({
      assignment: {
        dispute_id: id,
        has_voted: !!vote,
        my_vote: vote?.vote || null,
        selected_at: assignment.selected_at,
      },
    });
  } catch (error) {
    console.error('Jury check error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
