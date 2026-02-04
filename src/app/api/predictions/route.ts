/**
 * Predictions API Route
 * List and create predictions
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase-server';
import type { InvestigationType } from '@/types/database';

type PredictionStatus = 'open' | 'testing' | 'confirmed' | 'refuted' | 'inconclusive';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { searchParams } = new URL(request.url);

    // Parse query params
    const status = searchParams.get('status') as PredictionStatus | null;
    const domain = searchParams.get('domain') as InvestigationType | null;
    const minConfidence = parseFloat(searchParams.get('min_confidence') || '0');
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const sortBy = searchParams.get('sort') || 'created_at';
    const sortOrder = searchParams.get('order') || 'desc';

    // Build query - use explicit foreign key to avoid ambiguity
    let query = supabase
      .from('aletheia_predictions')
      .select(`
        *,
        pattern:aletheia_pattern_matches!aletheia_predictions_pattern_id_fkey(
          id,
          pattern_description,
          confidence_score
        )
      `, { count: 'exact' })
      .gte('confidence_score', minConfidence);

    // Apply filters
    if (status) {
      query = query.eq('status', status);
    }
    if (domain) {
      query = query.contains('domains_involved', [domain]);
    }

    // Apply sorting
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data: predictions, error, count } = await query;

    if (error) {
      console.error('Query error:', error);
      return NextResponse.json(
        { error: `Failed to fetch predictions: ${error.message}` },
        { status: 500 }
      );
    }

    // Get summary stats
    const { data: statsData } = await supabase
      .from('aletheia_predictions')
      .select('status') as { data: Array<{ status: string }> | null };

    const stats = {
      total: statsData?.length || 0,
      open: 0,
      testing: 0,
      confirmed: 0,
      refuted: 0,
      inconclusive: 0,
    };
    statsData?.forEach((p) => {
      // Count 'open' status as 'testing' since that's what users expect to see
      if (p.status === 'open') {
        stats.testing++;
      } else if (p.status in stats) {
        stats[p.status as keyof typeof stats]++;
      }
    });

    return NextResponse.json({
      data: predictions,
      stats,
      total: count,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Predictions API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
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
        { error: 'Insufficient permissions to create predictions' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      hypothesis,
      pattern_id,
      domains,
      confidence_score,
      testing_protocol,
    } = body;

    // Validate required fields
    if (!hypothesis || !domains || domains.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields: hypothesis, domains' },
        { status: 400 }
      );
    }

    // Insert prediction (map to actual column names)
    const { data: prediction, error: insertError } = await (supabase
      .from('aletheia_predictions') as ReturnType<typeof supabase.from>)
      .insert({
        hypothesis,
        pattern_id: pattern_id || null,
        domains_involved: domains,
        confidence_score: confidence_score || 0.5,
        testing_protocol,
        status: 'open',
        created_by: profile.id,
      } as never)
      .select()
      .single() as { data: { id: string } | null; error: { message?: string } | null };

    if (insertError) {
      console.error('Insert error:', insertError);
      return NextResponse.json(
        { error: `Failed to create prediction: ${insertError.message}` },
        { status: 500 }
      );
    }

    // Log contribution
    await (supabase.from('aletheia_contributions') as ReturnType<typeof supabase.from>)
      .insert({
        user_id: profile.id,
        contribution_type: 'submission',
        details: {
          type: 'prediction',
          prediction_id: prediction?.id,
          hypothesis: hypothesis.substring(0, 100),
        },
      } as never);

    return NextResponse.json({
      success: true,
      data: prediction,
    });
  } catch (error) {
    console.error('Predictions POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
