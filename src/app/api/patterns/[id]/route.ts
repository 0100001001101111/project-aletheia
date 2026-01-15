/**
 * Individual Pattern API Route
 * Get and update single pattern
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase-server';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createServerClient();

    const { data: pattern, error } = await supabase
      .from('aletheia_pattern_matches')
      .select(`
        *,
        predictions:aletheia_predictions(
          id,
          hypothesis,
          status,
          confidence_score,
          created_at
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Pattern not found' },
          { status: 404 }
        );
      }
      console.error('Query error:', error);
      return NextResponse.json(
        { error: `Failed to fetch pattern: ${error.message}` },
        { status: 500 }
      );
    }

    // Get investigations that contributed to this pattern
    const patternData = pattern as { domains_matched?: string[] };
    const { data: investigations } = await supabase
      .from('aletheia_investigations')
      .select('id, title, type, triage_score, created_at')
      .in('type', patternData.domains_matched || [])
      .eq('triage_status', 'verified')
      .limit(20);

    return NextResponse.json({
      ...(pattern as Record<string, unknown>),
      source_investigations: investigations || [],
    });
  } catch (error) {
    console.error('Pattern GET error:', error);
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

    // Check if user is admin
    const { data: profile } = await supabase
      .from('aletheia_users')
      .select('id, credibility_score')
      .eq('auth_id', user.id)
      .single() as { data: { id: string; credibility_score: number } | null };

    if (!profile || profile.credibility_score < 100) {
      return NextResponse.json(
        { error: 'Insufficient permissions to update patterns' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const allowedFields = [
      'description',
      'confidence_score',
      'prevalence',
      'reliability',
      'volatility',
      'sample_size',
      'status',
    ];

    // Filter to allowed fields
    const updates: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    updates.updated_at = new Date().toISOString();

    const { data: pattern, error: updateError } = await (supabase
      .from('aletheia_pattern_matches') as ReturnType<typeof supabase.from>)
      .update(updates as never)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Update error:', updateError);
      return NextResponse.json(
        { error: `Failed to update pattern: ${updateError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: pattern,
    });
  } catch (error) {
    console.error('Pattern PATCH error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
