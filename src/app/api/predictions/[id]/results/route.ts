/**
 * Prediction Results API
 * Submit and view test results for predictions
 * Supports Simple Mode (auto-stats) and Advanced Mode
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase-server';
import { binomialTest, wilsonInterval, cohensH } from '@/lib/statistics';

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface ResultRecord {
  id: string;
  effect_observed: boolean;
  p_value: number | null;
  sample_size: number | null;
  effect_size: number | null;
  confidence_interval_low: number | null;
  confidence_interval_high: number | null;
  methodology: string;
  deviations_from_protocol: string | null;
  raw_data_url: string | null;
  preregistration_url: string | null;
  publication_url: string | null;
  plain_summary: string | null;
  notes: string | null;
  verification_status: string;
  submitted_at: string;
  submitter: {
    id: string;
    display_name: string;
    identity_type: string;
  };
}

// GET - List all results for a prediction
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createServerClient();

    const { data: results, error } = await (supabase
      .from('aletheia_prediction_results') as ReturnType<typeof supabase.from>)
      .select(`
        id,
        effect_observed,
        p_value,
        sample_size,
        effect_size,
        confidence_interval_low,
        confidence_interval_high,
        methodology,
        deviations_from_protocol,
        raw_data_url,
        preregistration_url,
        publication_url,
        plain_summary,
        notes,
        verification_status,
        submitted_at,
        submitter:aletheia_users!submitted_by(
          id,
          display_name,
          identity_type
        )
      `)
      .eq('prediction_id', id)
      .order('submitted_at', { ascending: false }) as { data: ResultRecord[] | null; error: { message: string } | null };

    if (error) {
      console.error('Results query error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Calculate aggregate stats
    const verifiedResults = results?.filter(r => r.verification_status === 'verified') || [];
    const stats = {
      total_submissions: results?.length || 0,
      verified_count: verifiedResults.length,
      supporting_count: verifiedResults.filter(r => r.effect_observed).length,
      opposing_count: verifiedResults.filter(r => !r.effect_observed).length,
      total_sample_size: verifiedResults.reduce((sum, r) => sum + (r.sample_size || 0), 0),
      average_p_value: verifiedResults.length > 0
        ? verifiedResults.reduce((sum, r) => sum + (r.p_value || 0), 0) / verifiedResults.filter(r => r.p_value != null).length
        : null,
    };

    return NextResponse.json({ data: results, stats });
  } catch (error) {
    console.error('Results GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Submit new test results
// Supports Simple Mode (trials/hits) and Advanced Mode
export async function POST(request: NextRequest, { params }: RouteParams) {
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
      .select('id')
      .eq('auth_id', user.id)
      .single() as { data: { id: string } | null };

    if (!profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    const body = await request.json();
    const {
      // Simple Mode fields
      submission_mode = 'advanced',
      trials,
      hits,
      description,
      // Quality scores (multiplicative)
      isolation_score = 1.0,
      target_selection_score = 1.0,
      data_integrity_score = 1.0,
      baseline_score = 1.0,
      // Advanced Mode fields
      effect_observed: explicitEffectObserved,
      p_value: explicitPValue,
      sample_size: explicitSampleSize,
      effect_size: explicitEffectSize,
      confidence_interval_low,
      confidence_interval_high,
      methodology,
      deviations_from_protocol,
      raw_data_url,
      preregistration_url,
      publication_url,
      plain_summary,
      notes,
    } = body;

    // Calculate quality score (multiplicative - if any is 0, result is rejected)
    const qualityScore = isolation_score * target_selection_score * data_integrity_score * baseline_score * 10;

    // Handle Simple Mode - auto-calculate statistics
    let effect_observed = explicitEffectObserved;
    let p_value = explicitPValue;
    let sample_size = explicitSampleSize;
    let effect_size = explicitEffectSize;
    let autoSummary = plain_summary;

    if (submission_mode === 'simple') {
      // Validate Simple Mode fields
      if (trials === undefined || hits === undefined) {
        return NextResponse.json({ error: 'Simple mode requires trials and hits' }, { status: 400 });
      }
      if (hits > trials) {
        return NextResponse.json({ error: 'Hits cannot exceed trials' }, { status: 400 });
      }

      // Calculate statistics using binomial test (default 25% baseline for Ganzfeld/STARGATE)
      const stats = binomialTest(hits, trials, 0.25);
      const ci = wilsonInterval(hits, trials);
      const h = cohensH(stats.observedProportion, stats.expectedProportion);

      effect_observed = stats.effectObserved;
      p_value = stats.pValue;
      sample_size = trials;
      effect_size = h;

      // Generate plain summary
      autoSummary = `${hits}/${trials} hits (${(stats.observedProportion * 100).toFixed(1)}% vs ${(stats.expectedProportion * 100).toFixed(0)}% expected). ` +
        `p = ${stats.pValue.toFixed(4)}, ${stats.significant ? 'statistically significant' : 'not significant'}. ` +
        `95% CI: [${(ci.lower * 100).toFixed(1)}%, ${(ci.upper * 100).toFixed(1)}%].`;
    } else {
      // Validate Advanced Mode fields
      if (effect_observed === undefined) {
        return NextResponse.json({ error: 'effect_observed is required' }, { status: 400 });
      }
      if (!methodology) {
        return NextResponse.json({ error: 'methodology is required' }, { status: 400 });
      }
    }

    // Insert result
    const { data: result, error: insertError } = await (supabase
      .from('aletheia_prediction_results') as ReturnType<typeof supabase.from>)
      .insert({
        prediction_id: id,
        submitted_by: profile.id,
        submission_mode,
        trials,
        hits,
        description,
        effect_observed,
        p_value,
        sample_size,
        effect_size,
        confidence_interval_low,
        confidence_interval_high,
        methodology: methodology || `Simple mode submission: ${description || 'No description'}`,
        deviations_from_protocol,
        raw_data_url,
        preregistration_url,
        publication_url,
        plain_summary: autoSummary,
        notes,
        isolation_score,
        target_selection_score,
        data_integrity_score,
        baseline_score,
        quality_score: qualityScore,
      } as never)
      .select()
      .single() as { data: { id: string } | null; error: { message: string } | null };

    if (insertError) {
      console.error('Insert error:', insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // Mark tester as completed if they were testing
    await (supabase
      .from('aletheia_prediction_testers') as ReturnType<typeof supabase.from>)
      .update({ status: 'completed', updated_at: new Date().toISOString() } as never)
      .eq('prediction_id', id)
      .eq('user_id', profile.id);

    // Auto-update prediction status based on results
    await updatePredictionStatus(supabase, id);

    return NextResponse.json({
      success: true,
      data: result,
      calculated: submission_mode === 'simple' ? { p_value, effect_size, effect_observed } : undefined,
    });
  } catch (error) {
    console.error('Results POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Auto-update prediction status based on submitted results
 * - Open -> Testing when first result submitted
 * - Testing -> Confirmed when N >= 500, 80%+ support, p < 0.05
 * - Testing -> Refuted when N >= 500, 80%+ oppose, p < 0.05
 */
async function updatePredictionStatus(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  predictionId: string
) {
  try {
    // Get current prediction status
    const { data: prediction } = await supabase
      .from('aletheia_predictions')
      .select('status')
      .eq('id', predictionId)
      .single() as { data: { status: string } | null };

    if (!prediction) return;

    // Get verified results (quality_score >= 7)
    const { data: results } = await (supabase
      .from('aletheia_prediction_results') as ReturnType<typeof supabase.from>)
      .select('effect_observed, sample_size, p_value, quality_score')
      .eq('prediction_id', predictionId)
      .gte('quality_score', 7) as {
        data: Array<{
          effect_observed: boolean;
          sample_size: number | null;
          p_value: number | null;
          quality_score: number | null;
        }> | null
      };

    if (!results || results.length === 0) {
      // First result - transition from open to testing
      if (prediction.status === 'open') {
        await (supabase.from('aletheia_predictions') as ReturnType<typeof supabase.from>)
          .update({ status: 'testing', updated_at: new Date().toISOString() } as never)
          .eq('id', predictionId);
      }
      return;
    }

    // Calculate aggregates
    const totalSampleSize = results.reduce((sum, r) => sum + (r.sample_size || 0), 0);
    const supportingResults = results.filter(r => r.effect_observed);
    const opposingResults = results.filter(r => !r.effect_observed);
    const supportPercent = supportingResults.length / results.length;

    // Transition to testing if not already
    if (prediction.status === 'open') {
      await (supabase.from('aletheia_predictions') as ReturnType<typeof supabase.from>)
        .update({ status: 'testing', updated_at: new Date().toISOString() } as never)
        .eq('id', predictionId);
    }

    // Check for confirmation/refutation thresholds
    if (totalSampleSize >= 500) {
      // Get average p-value from significant results
      const significantResults = results.filter(r => r.p_value !== null && r.p_value < 0.05);
      const avgPValue = significantResults.length > 0
        ? significantResults.reduce((sum, r) => sum + (r.p_value || 0), 0) / significantResults.length
        : 1;

      if (supportPercent >= 0.8 && avgPValue < 0.05) {
        // Confirmed
        await (supabase.from('aletheia_predictions') as ReturnType<typeof supabase.from>)
          .update({
            status: 'confirmed',
            resolved_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          } as never)
          .eq('id', predictionId);
      } else if (supportPercent <= 0.2 && avgPValue < 0.05) {
        // Refuted
        await (supabase.from('aletheia_predictions') as ReturnType<typeof supabase.from>)
          .update({
            status: 'refuted',
            resolved_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          } as never)
          .eq('id', predictionId);
      }
    }
  } catch (error) {
    console.error('Error updating prediction status:', error);
  }
}
