/**
 * Prediction Results API
 * Submit and view test results for predictions
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase-server';

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
    } = body;

    // Validate required fields
    if (effect_observed === undefined) {
      return NextResponse.json({ error: 'effect_observed is required' }, { status: 400 });
    }
    if (!methodology) {
      return NextResponse.json({ error: 'methodology is required' }, { status: 400 });
    }

    // Insert result
    const { data: result, error: insertError } = await (supabase
      .from('aletheia_prediction_results') as ReturnType<typeof supabase.from>)
      .insert({
        prediction_id: id,
        submitted_by: profile.id,
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

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('Results POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
