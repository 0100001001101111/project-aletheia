/**
 * Vote API Route
 * Submit jury vote for Tier 2 disputes
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

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createServerClient() as AnyClient;

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get dispute
    const { data: dispute, error: fetchError } = await supabase
      .from('aletheia_disputes')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !dispute) {
      return NextResponse.json(
        { error: 'Dispute not found' },
        { status: 404 }
      );
    }

    // Verify dispute is Tier 2 and open
    if (dispute.tier !== 2) {
      return NextResponse.json(
        { error: 'Voting is only available for Tier 2 disputes' },
        { status: 400 }
      );
    }

    if (dispute.status !== 'open') {
      return NextResponse.json(
        { error: 'This dispute is no longer open for voting' },
        { status: 400 }
      );
    }

    // Verify user is assigned as a juror
    const { data: assignment, error: assignmentError } = await supabase
      .from('aletheia_jury_pool')
      .select('*')
      .eq('dispute_id', id)
      .eq('juror_id', user.id)
      .single();

    if (assignmentError || !assignment) {
      return NextResponse.json(
        { error: 'You are not assigned as a juror for this dispute' },
        { status: 403 }
      );
    }

    // Check if already voted
    const { data: existingVote } = await supabase
      .from('aletheia_jury_votes')
      .select('id')
      .eq('dispute_id', id)
      .eq('juror_id', user.id)
      .single();

    if (existingVote) {
      return NextResponse.json(
        { error: 'You have already voted on this dispute' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { vote, reasoning } = body;

    // Validate vote
    const validVotes = ['uphold', 'overturn', 'abstain'];
    if (!vote || !validVotes.includes(vote)) {
      return NextResponse.json(
        { error: `Invalid vote. Must be one of: ${validVotes.join(', ')}` },
        { status: 400 }
      );
    }

    // Record vote
    const { error: voteError } = await supabase
      .from('aletheia_jury_votes')
      .insert({
        dispute_id: id,
        juror_id: user.id,
        vote,
        reasoning: reasoning || null,
      });

    if (voteError) {
      console.error('Vote error:', voteError);
      return NextResponse.json(
        { error: `Failed to record vote: ${voteError.message}` },
        { status: 500 }
      );
    }

    // Update jury pool assignment
    await supabase
      .from('aletheia_jury_pool')
      .update({ voted_at: new Date().toISOString() })
      .eq('dispute_id', id)
      .eq('juror_id', user.id);

    // Tally votes
    const { data: allVotes, error: tallyError } = await supabase
      .from('aletheia_jury_votes')
      .select('vote')
      .eq('dispute_id', id);

    if (!tallyError && allVotes) {
      const tally = {
        uphold: allVotes.filter((v: { vote: string }) => v.vote === 'uphold').length,
        overturn: allVotes.filter((v: { vote: string }) => v.vote === 'overturn').length,
        abstain: allVotes.filter((v: { vote: string }) => v.vote === 'abstain').length,
      };

      // Update dispute with vote counts
      const updates: Record<string, unknown> = {
        jury_votes: tally,
      };

      // Check if voting is complete (all 5 jurors voted or 3+ votes for one option)
      const totalVotes = tally.uphold + tally.overturn + tally.abstain;
      if (totalVotes >= 5 || tally.uphold >= 3 || tally.overturn >= 3) {
        // Determine decision
        if (tally.uphold >= 3) {
          updates.jury_decision = 'uphold';
          updates.status = 'resolved';
          updates.resolved_at = new Date().toISOString();
        } else if (tally.overturn >= 3) {
          updates.jury_decision = 'overturn';
          updates.status = 'resolved';
          updates.resolved_at = new Date().toISOString();
        } else if (totalVotes >= 5) {
          // No clear majority - partial/escalate
          updates.jury_decision = 'partial';
          updates.status = 'resolved';
          updates.resolved_at = new Date().toISOString();
        }
      }

      await supabase
        .from('aletheia_disputes')
        .update(updates)
        .eq('id', id);
    }

    return NextResponse.json({
      success: true,
      message: 'Vote recorded successfully',
    });
  } catch (error) {
    console.error('Vote error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
