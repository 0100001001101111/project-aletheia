/**
 * Flags API Route
 * Create and list methodology flags (red-team system)
 * Methodology Points (MP) awarded/deducted based on flag outcomes
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase-server';
import type { FlawType, FlagSeverity } from '@/types/database';

// GET - List flags with optional filters
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { searchParams } = new URL(request.url);

    // Parse query params
    const resultId = searchParams.get('result_id');
    const status = searchParams.get('status');
    const flawType = searchParams.get('flaw_type') as FlawType | null;
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // Build query
    let query = supabase
      .from('aletheia_result_flags')
      .select(`
        *,
        flagger:aletheia_users!flagger_id(
          id,
          display_name,
          verification_level
        )
      `, { count: 'exact' });

    // Apply filters
    if (resultId) {
      query = query.eq('result_id', resultId);
    }
    if (status) {
      query = query.eq('status', status);
    }
    if (flawType) {
      query = query.eq('flaw_type', flawType);
    }

    // Apply pagination
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: flags, error, count } = await query;

    if (error) {
      console.error('Flags query error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      data: flags,
      total: count,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Flags GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create a new flag
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile with methodology points
    const { data: profile } = await supabase
      .from('aletheia_users')
      .select('id, credibility_score')
      .eq('auth_id', user.id)
      .single() as { data: { id: string; credibility_score: number } | null };

    if (!profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    const body = await request.json();
    const {
      result_id,
      flaw_type,
      description,
      evidence,
      severity = 'minor',
    } = body as {
      result_id: string;
      flaw_type: FlawType;
      description: string;
      evidence?: string;
      severity?: FlagSeverity;
    };

    // Validate required fields
    if (!result_id || !flaw_type || !description) {
      return NextResponse.json(
        { error: 'Missing required fields: result_id, flaw_type, description' },
        { status: 400 }
      );
    }

    // Validate flaw type
    const validFlawTypes: FlawType[] = [
      'sensory_leakage',
      'selection_bias',
      'statistical_error',
      'protocol_violation',
      'data_integrity',
      'other',
    ];
    if (!validFlawTypes.includes(flaw_type)) {
      return NextResponse.json(
        { error: `Invalid flaw_type. Must be one of: ${validFlawTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // Verify the result exists
    const { data: resultExists } = await (supabase
      .from('aletheia_prediction_results') as ReturnType<typeof supabase.from>)
      .select('id')
      .eq('id', result_id)
      .single() as { data: { id: string } | null };

    if (!resultExists) {
      return NextResponse.json({ error: 'Result not found' }, { status: 404 });
    }

    // Check for duplicate flags from same user on same result
    const { data: existingFlag } = await supabase
      .from('aletheia_result_flags')
      .select('id')
      .eq('result_id', result_id)
      .eq('flagger_id', user.id)
      .eq('flaw_type', flaw_type)
      .single() as { data: { id: string } | null };

    if (existingFlag) {
      return NextResponse.json(
        { error: 'You have already flagged this result for the same flaw type' },
        { status: 409 }
      );
    }

    // Create the flag
    const { data: flag, error: insertError } = await (supabase
      .from('aletheia_result_flags') as ReturnType<typeof supabase.from>)
      .insert({
        result_id,
        flagger_id: user.id,
        flaw_type,
        description,
        evidence,
        severity,
        status: 'open',
      } as never)
      .select()
      .single() as { data: { id: string } | null; error: { message: string } | null };

    if (insertError) {
      console.error('Flag insert error:', insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // Log contribution
    await (supabase.from('aletheia_contributions') as ReturnType<typeof supabase.from>)
      .insert({
        user_id: profile.id,
        contribution_type: 'validation',
        details: {
          type: 'flag_created',
          flag_id: flag?.id,
          result_id,
          flaw_type,
          severity,
        },
      } as never);

    return NextResponse.json({
      success: true,
      data: flag,
      message: 'Flag created successfully. It will be reviewed by the result submitter or moderators.',
    });
  } catch (error) {
    console.error('Flags POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
