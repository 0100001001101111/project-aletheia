/**
 * Disputes API Route
 * Create and list disputes for conflict resolution
 *
 * Note: Type assertions used until migrations are applied and types regenerated
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase-server';
import type { Dispute } from '@/types/database';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = any;

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient() as AnyClient;
    const { searchParams } = new URL(request.url);

    // Parse query params
    const status = searchParams.get('status');
    const userId = searchParams.get('user_id');
    const resultId = searchParams.get('result_id');
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // Build query
    let query = supabase
      .from('aletheia_disputes')
      .select(`
        *,
        result:aletheia_prediction_results(
          id,
          prediction_id,
          effect_observed,
          p_value,
          sample_size,
          description,
          methodology
        ),
        flag:aletheia_result_flags(
          id,
          flaw_type,
          description,
          evidence,
          severity
        )
      `, { count: 'exact' });

    // Apply filters
    if (status) {
      query = query.eq('status', status);
    }
    if (userId) {
      query = query.eq('initiator_id', userId);
    }
    if (resultId) {
      query = query.eq('result_id', resultId);
    }

    // Apply sorting and pagination
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: disputes, error, count } = await query;

    if (error) {
      console.error('Query error:', error);
      return NextResponse.json(
        { error: `Failed to fetch disputes: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: disputes,
      total: count,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Disputes API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient() as AnyClient;

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { result_id, flag_id, data_requested } = body;

    // Validate required fields
    if (!result_id) {
      return NextResponse.json(
        { error: 'Missing required field: result_id' },
        { status: 400 }
      );
    }

    // Verify result exists
    const { data: result, error: resultError } = await supabase
      .from('aletheia_prediction_results')
      .select('id')
      .eq('id', result_id)
      .single();

    if (resultError || !result) {
      return NextResponse.json(
        { error: 'Result not found' },
        { status: 404 }
      );
    }

    // Check for existing open dispute on this result
    const { data: existingDispute } = await supabase
      .from('aletheia_disputes')
      .select('id')
      .eq('result_id', result_id)
      .eq('status', 'open')
      .single();

    if (existingDispute) {
      return NextResponse.json(
        { error: 'An open dispute already exists for this result' },
        { status: 400 }
      );
    }

    // Create dispute
    const insertData: Partial<Dispute> = {
      result_id,
      flag_id: flag_id || null,
      initiator_id: user.id,
      tier: 1,
      status: 'open',
      data_requested: data_requested || 'Please provide the raw data or additional clarification for this result.',
    };

    const { data: dispute, error: insertError } = await supabase
      .from('aletheia_disputes')
      .insert(insertData)
      .select()
      .single();

    if (insertError) {
      console.error('Insert error:', insertError);
      return NextResponse.json(
        { error: `Failed to create dispute: ${insertError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: dispute,
    });
  } catch (error) {
    console.error('Dispute POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
