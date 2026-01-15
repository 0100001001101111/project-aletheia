/**
 * Individual Prediction API Route
 * Get and update single prediction
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase-server';

type PredictionStatus = 'open' | 'testing' | 'confirmed' | 'refuted' | 'inconclusive';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createServerClient();

    const { data: prediction, error } = await supabase
      .from('aletheia_predictions')
      .select(`
        *,
        pattern:aletheia_pattern_matches(
          id,
          variable,
          pattern_description,
          domains_matched,
          correlations,
          confidence_score,
          sample_size
        ),
        created_by_user:aletheia_users!created_by(
          id,
          display_name,
          identity_type,
          credibility_score
        )
      `)
      .eq('id', id)
      .single() as { data: { domains_involved?: string[] } | null; error: { code?: string; message?: string } | null };

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Prediction not found' },
          { status: 404 }
        );
      }
      console.error('Query error:', error);
      return NextResponse.json(
        { error: `Failed to fetch prediction: ${error.message}` },
        { status: 500 }
      );
    }

    // Get related investigations
    const predictionData = prediction as { domains_involved?: string[] } | null;
    const { data: investigations } = await supabase
      .from('aletheia_investigations')
      .select('id, title, type, triage_score, created_at')
      .in('type', predictionData?.domains_involved || [])
      .eq('triage_status', 'verified')
      .order('created_at', { ascending: false })
      .limit(10);

    // Get status history (from contributions)
    const { data: history } = await supabase
      .from('aletheia_contributions')
      .select('created_at, details')
      .eq('contribution_type', 'verification')
      .contains('details', { prediction_id: id })
      .order('created_at', { ascending: false })
      .limit(10);

    return NextResponse.json({
      ...prediction,
      related_investigations: investigations || [],
      status_history: history || [],
    });
  } catch (error) {
    console.error('Prediction GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createServerClient();

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    const { data: profile } = await supabase
      .from('aletheia_users')
      .select('id, credibility_score')
      .eq('auth_id', user.id)
      .single() as { data: { id: string; credibility_score: number } | null };

    if (!profile || profile.credibility_score < 75) {
      return NextResponse.json(
        { error: 'Insufficient permissions to update predictions' },
        { status: 403 }
      );
    }

    // Get current prediction
    const { data: current } = await supabase
      .from('aletheia_predictions')
      .select('status, p_value, brier_score')
      .eq('id', id)
      .single() as { data: { status: string; p_value: number | null; brier_score: number | null } | null };

    if (!current) {
      return NextResponse.json(
        { error: 'Prediction not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { status, p_value, brier_score, testing_protocol, notes } = body as {
      status?: PredictionStatus;
      p_value?: number;
      brier_score?: number;
      testing_protocol?: string;
      notes?: string;
    };

    // Build update object
    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (status !== undefined) {
      updates.status = status;

      // Set resolved_at when status changes to terminal state
      if (['confirmed', 'refuted', 'inconclusive'].includes(status) &&
          !['confirmed', 'refuted', 'inconclusive'].includes(current.status)) {
        updates.resolved_at = new Date().toISOString();
      }
    }

    if (p_value !== undefined) {
      if (p_value < 0 || p_value > 1) {
        return NextResponse.json(
          { error: 'p_value must be between 0 and 1' },
          { status: 400 }
        );
      }
      updates.p_value = p_value;
    }

    if (brier_score !== undefined) {
      if (brier_score < 0 || brier_score > 1) {
        return NextResponse.json(
          { error: 'brier_score must be between 0 and 1' },
          { status: 400 }
        );
      }
      updates.brier_score = brier_score;
    }

    if (testing_protocol !== undefined) {
      updates.testing_protocol = testing_protocol;
    }

    // Update prediction
    const { data: prediction, error: updateError } = await (supabase
      .from('aletheia_predictions') as ReturnType<typeof supabase.from>)
      .update(updates as never)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Update error:', updateError);
      return NextResponse.json(
        { error: `Failed to update prediction: ${updateError.message}` },
        { status: 500 }
      );
    }

    // Log status change
    if (status && status !== current.status) {
      await (supabase.from('aletheia_contributions') as ReturnType<typeof supabase.from>)
        .insert({
          user_id: profile.id,
          contribution_type: 'verification',
          details: {
            prediction_id: id,
            action: 'status_change',
            from_status: current.status,
            to_status: status,
            p_value,
            brier_score,
            notes,
          },
        } as never);

      // Award credibility points if prediction was confirmed
      if (status === 'confirmed') {
        // Award points to contributors
        await awardCredibilityPoints(supabase, id, profile.id);
      }
    }

    return NextResponse.json({
      success: true,
      data: prediction,
    });
  } catch (error) {
    console.error('Prediction PATCH error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function awardCredibilityPoints(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  predictionId: string,
  reviewerId: string
) {
  try {
    // Get prediction details
    const { data: prediction } = await supabase
      .from('aletheia_predictions')
      .select('pattern_id, confidence_score')
      .eq('id', predictionId)
      .single() as { data: { pattern_id: string | null; confidence_score: number } | null };

    if (!prediction?.pattern_id) return;

    // Get pattern to find source investigations
    const { data: pattern } = await supabase
      .from('aletheia_pattern_matches')
      .select('domains_matched')
      .eq('id', prediction.pattern_id)
      .single() as { data: { domains_matched?: string[] } | null };

    if (!pattern) return;

    // Find contributors who submitted related investigations
    const { data: investigations } = await supabase
      .from('aletheia_investigations')
      .select('submitted_by')
      .in('type', pattern.domains_matched || [])
      .eq('triage_status', 'verified') as { data: Array<{ submitted_by: string }> | null };

    if (!investigations) return;

    // Get unique contributors
    const contributors = Array.from(new Set(investigations.map((i) => i.submitted_by)));

    // Award points based on confidence score
    const pointsToAward = Math.round(prediction.confidence_score * 10);

    for (const contributorId of contributors) {
      if (contributorId === reviewerId) continue; // Don't award to reviewer

      await (supabase.rpc as unknown as (fn: string, params: Record<string, unknown>) => Promise<unknown>)(
        'increment_credibility',
        { user_id: contributorId, points: pointsToAward }
      );
    }
  } catch (error) {
    console.error('Error awarding credibility points:', error);
  }
}
