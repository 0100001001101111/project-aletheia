/**
 * Individual Flag API Route
 * Get, resolve, and dispute flags
 * Handles methodology points (MP) awards and deductions
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase-server';
import type { FlagStatus } from '@/types/database';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// Methodology points values
const MP_VALUES = {
  FLAG_UPHELD_MINOR: 5,
  FLAG_UPHELD_MAJOR: 15,
  FLAG_UPHELD_FATAL: 50,
  FLAG_REJECTED_FRIVOLOUS: -5,
  FLAG_DISPUTED: -2,
  RESULT_SURVIVED_CHALLENGE: 10,
};

// GET - Get a single flag with details
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createServerClient();

    const { data: flag, error } = await supabase
      .from('aletheia_result_flags')
      .select(`
        *,
        flagger:aletheia_users!flagger_id(
          id,
          display_name,
          verification_level,
          credibility_score
        ),
        result:aletheia_prediction_results!result_id(
          id,
          prediction_id,
          effect_observed,
          p_value,
          methodology,
          quality_score
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Flag not found' }, { status: 404 });
      }
      console.error('Flag query error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: flag });
  } catch (error) {
    console.error('Flag GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH - Update flag (resolve, dispute, acknowledge)
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createServerClient();

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('aletheia_users')
      .select('id, verification_level')
      .eq('auth_id', user.id)
      .single() as { data: { id: string; verification_level: string } | null };

    if (!profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    // Get the flag with result info
    const { data: flag } = await supabase
      .from('aletheia_result_flags')
      .select(`
        *,
        result:aletheia_prediction_results!result_id(
          id,
          submitted_by
        )
      `)
      .eq('id', id)
      .single() as {
        data: {
          id: string;
          flagger_id: string;
          status: FlagStatus;
          severity: string;
          result: { id: string; submitted_by: string };
        } | null
      };

    if (!flag) {
      return NextResponse.json({ error: 'Flag not found' }, { status: 404 });
    }

    const body = await request.json();
    const { action, resolution_notes } = body as {
      action: 'acknowledge' | 'dispute' | 'resolve' | 'reject';
      resolution_notes?: string;
    };

    // Determine who can take what actions
    const isFlagger = flag.flagger_id === user.id;
    const isResultOwner = flag.result?.submitted_by === profile.id;
    const isAdmin = profile.verification_level === 'phd';

    // Action permissions
    switch (action) {
      case 'acknowledge':
        // Result owner acknowledges the flag (accepts it)
        if (!isResultOwner && !isAdmin) {
          return NextResponse.json(
            { error: 'Only result owner or admin can acknowledge flags' },
            { status: 403 }
          );
        }
        if (flag.status !== 'open') {
          return NextResponse.json(
            { error: 'Can only acknowledge open flags' },
            { status: 400 }
          );
        }
        break;

      case 'dispute':
        // Result owner disputes the flag
        if (!isResultOwner) {
          return NextResponse.json(
            { error: 'Only result owner can dispute flags' },
            { status: 403 }
          );
        }
        if (flag.status !== 'open') {
          return NextResponse.json(
            { error: 'Can only dispute open flags' },
            { status: 400 }
          );
        }
        break;

      case 'resolve':
        // Admin resolves a disputed flag (upholds it)
        if (!isAdmin) {
          return NextResponse.json(
            { error: 'Only admins can resolve disputed flags' },
            { status: 403 }
          );
        }
        if (flag.status !== 'disputed' && flag.status !== 'open') {
          return NextResponse.json(
            { error: 'Can only resolve open or disputed flags' },
            { status: 400 }
          );
        }
        break;

      case 'reject':
        // Admin rejects a flag as frivolous
        if (!isAdmin) {
          return NextResponse.json(
            { error: 'Only admins can reject flags' },
            { status: 403 }
          );
        }
        if (flag.status === 'resolved' || flag.status === 'rejected') {
          return NextResponse.json(
            { error: 'Flag is already finalized' },
            { status: 400 }
          );
        }
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid action. Must be: acknowledge, dispute, resolve, or reject' },
          { status: 400 }
        );
    }

    // Perform the action
    let newStatus: FlagStatus;
    let mpAwarded = 0;
    let mpRecipient: string | null = null;

    switch (action) {
      case 'acknowledge':
        newStatus = 'acknowledged';
        // Award MP to flagger based on severity
        mpAwarded = flag.severity === 'fatal' ? MP_VALUES.FLAG_UPHELD_FATAL
          : flag.severity === 'major' ? MP_VALUES.FLAG_UPHELD_MAJOR
          : MP_VALUES.FLAG_UPHELD_MINOR;
        mpRecipient = flag.flagger_id;
        break;

      case 'dispute':
        newStatus = 'disputed';
        // No MP change yet - awaits resolution
        break;

      case 'resolve':
        newStatus = 'resolved';
        // Award MP to flagger - flag was upheld after dispute
        mpAwarded = flag.severity === 'fatal' ? MP_VALUES.FLAG_UPHELD_FATAL
          : flag.severity === 'major' ? MP_VALUES.FLAG_UPHELD_MAJOR
          : MP_VALUES.FLAG_UPHELD_MINOR;
        mpRecipient = flag.flagger_id;
        break;

      case 'reject':
        newStatus = 'rejected';
        // Deduct MP from flagger for frivolous flag
        mpAwarded = MP_VALUES.FLAG_REJECTED_FRIVOLOUS;
        mpRecipient = flag.flagger_id;
        // Award MP to result owner for surviving challenge
        if (flag.result?.submitted_by) {
          await awardMethodologyPoints(supabase, flag.result.submitted_by, MP_VALUES.RESULT_SURVIVED_CHALLENGE, 'Result survived frivolous flag challenge', id);
        }
        break;
    }

    // Update the flag
    const { data: updatedFlag, error: updateError } = await (supabase
      .from('aletheia_result_flags') as ReturnType<typeof supabase.from>)
      .update({
        status: newStatus,
        resolution_notes: resolution_notes || null,
        resolved_by: ['resolve', 'reject', 'acknowledge'].includes(action) ? user.id : null,
        resolved_at: ['resolve', 'reject', 'acknowledge'].includes(action) ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      } as never)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Flag update error:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Award/deduct methodology points
    if (mpRecipient && mpAwarded !== 0) {
      const reason = action === 'reject'
        ? 'Flag rejected as frivolous'
        : action === 'resolve'
        ? 'Flag upheld after dispute'
        : 'Flag acknowledged by result owner';

      await awardMethodologyPoints(supabase, mpRecipient, mpAwarded, reason, id);
    }

    return NextResponse.json({
      success: true,
      data: updatedFlag,
      mp_awarded: mpAwarded,
    });
  } catch (error) {
    console.error('Flag PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Award or deduct methodology points
 */
async function awardMethodologyPoints(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  userId: string,
  points: number,
  reason: string,
  flagId: string
) {
  try {
    // Call the database function
    await (supabase.rpc as unknown as (fn: string, params: Record<string, unknown>) => Promise<unknown>)(
      'award_methodology_points',
      {
        p_user_id: userId,
        p_points: points,
        p_reason: reason,
        p_flag_id: flagId,
      }
    );
  } catch (error) {
    console.error('Error awarding methodology points:', error);
    // Don't throw - MP award failure shouldn't break flag resolution
  }
}
