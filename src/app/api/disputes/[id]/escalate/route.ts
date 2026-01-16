/**
 * Escalate Dispute API Route
 * Move a dispute to the next tier
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

    // Verify dispute is open
    if (dispute.status !== 'open') {
      return NextResponse.json(
        { error: 'Only open disputes can be escalated' },
        { status: 400 }
      );
    }

    // Verify not already at Tier 3
    if (dispute.tier >= 3) {
      return NextResponse.json(
        { error: 'Dispute is already at the highest tier' },
        { status: 400 }
      );
    }

    const newTier = dispute.tier + 1;

    // Update dispute tier
    const { data: updated, error: updateError } = await supabase
      .from('aletheia_disputes')
      .update({
        tier: newTier,
        status: 'escalated',
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Update error:', updateError);
      return NextResponse.json(
        { error: `Failed to escalate dispute: ${updateError.message}` },
        { status: 500 }
      );
    }

    // If escalating to Tier 2, assign jury members
    if (newTier === 2) {
      // Get qualified jurors (users with methodology_points >= 10, excluding parties)
      const { data: jurors, error: jurorError } = await supabase
        .from('aletheia_prediction_testers')
        .select('user_id')
        .gte('methodology_points', 10)
        .neq('user_id', dispute.initiator_id)
        .limit(10);

      if (!jurorError && jurors && jurors.length >= 5) {
        // Randomly select 5 jurors
        const shuffled = jurors.sort(() => 0.5 - Math.random());
        const selected = shuffled.slice(0, 5);

        // Insert jury pool assignments
        const poolInserts = selected.map((j: { user_id: string }) => ({
          dispute_id: id,
          juror_id: j.user_id,
          selected_at: new Date().toISOString(),
        }));

        await supabase
          .from('aletheia_jury_pool')
          .insert(poolInserts);
      }

      // Reset status to open for Tier 2
      await supabase
        .from('aletheia_disputes')
        .update({ status: 'open' })
        .eq('id', id);
    }

    return NextResponse.json({
      success: true,
      data: updated,
      message: `Dispute escalated to Tier ${newTier}`,
    });
  } catch (error) {
    console.error('Escalate error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
