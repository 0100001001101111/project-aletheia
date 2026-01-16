/**
 * Jury Pool API Route
 * List all jury assignments for the current user
 *
 * Note: Type assertions used until migrations are applied and types regenerated
 */

import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase-server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = any;

export async function GET() {
  try {
    const supabase = await createServerClient() as AnyClient;

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ disputes: [] });
    }

    // Get all jury pool assignments for this user
    const { data: assignments, error } = await supabase
      .from('aletheia_jury_pool')
      .select(`
        dispute_id,
        selected_at,
        voted_at,
        dispute:aletheia_disputes(
          id,
          tier,
          status,
          created_at
        )
      `)
      .eq('juror_id', user.id);

    if (error) {
      console.error('Query error:', error);
      return NextResponse.json({ disputes: [] });
    }

    // Filter to only open Tier 2 disputes
    const activeAssignments = (assignments || []).filter((a: { dispute: { tier: number; status: string } | null }) => {
      const dispute = a.dispute;
      return dispute && dispute.tier === 2 && dispute.status === 'open';
    });

    // Get user's votes to check which disputes they've voted on
    const disputeIds = activeAssignments.map((a: { dispute_id: string }) => a.dispute_id);

    const { data: votes } = await supabase
      .from('aletheia_jury_votes')
      .select('dispute_id')
      .eq('juror_id', user.id)
      .in('dispute_id', disputeIds.length > 0 ? disputeIds : ['00000000-0000-0000-0000-000000000000']);

    const votedDisputeIds = new Set((votes || []).map((v: { dispute_id: string }) => v.dispute_id));

    // Filter to disputes user hasn't voted on yet
    const pendingAssignments = activeAssignments
      .filter((a: { dispute_id: string }) => !votedDisputeIds.has(a.dispute_id))
      .map((a: { dispute_id: string; selected_at: string }) => ({
        dispute_id: a.dispute_id,
        selected_at: a.selected_at,
      }));

    return NextResponse.json({
      disputes: pendingAssignments,
      total_pending: pendingAssignments.length,
    });
  } catch (error) {
    console.error('Jury pool error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
