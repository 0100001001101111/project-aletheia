/**
 * Patterns API Route
 * List and manage detected patterns
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase-server';
import type { InvestigationType } from '@/types/database';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { searchParams } = new URL(request.url);

    // Parse query params
    const domain = searchParams.get('domain') as InvestigationType | null;
    const minConfidence = parseFloat(searchParams.get('min_confidence') || '0');
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // Build query
    let query = supabase
      .from('aletheia_pattern_matches')
      .select('*', { count: 'exact' })
      .gte('confidence_score', minConfidence)
      .order('confidence_score', { ascending: false });

    // Filter by domain if specified
    if (domain) {
      query = query.contains('domains_matched', [domain]);
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data: patterns, error, count } = await query;

    if (error) {
      console.error('Query error:', error);
      return NextResponse.json(
        { error: `Failed to fetch patterns: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: patterns,
      total: count,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Patterns API error:', error);
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

    // Check if user is admin
    const { data: profile } = await supabase
      .from('aletheia_users')
      .select('id, credibility_score')
      .eq('auth_id', user.id)
      .single() as { data: { id: string; credibility_score: number } | null };

    if (!profile || profile.credibility_score < 100) {
      return NextResponse.json(
        { error: 'Insufficient permissions to create patterns' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      variable,
      description,
      domains,
      correlations,
      prevalence,
      reliability,
      volatility,
      confidence_score,
      sample_size,
    } = body;

    // Validate required fields
    if (!variable || !description || !domains || !confidence_score) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Insert pattern (map to actual column names)
    const { data: pattern, error: insertError } = await (supabase
      .from('aletheia_pattern_matches') as ReturnType<typeof supabase.from>)
      .insert({
        variable,
        pattern_description: description,
        domains_matched: domains,
        correlations,
        prevalence_score: prevalence,
        reliability_score: reliability,
        volatility_score: volatility,
        confidence_score,
        sample_size,
        detected_at: new Date().toISOString(),
      } as never)
      .select()
      .single();

    if (insertError) {
      console.error('Insert error:', insertError);
      return NextResponse.json(
        { error: `Failed to create pattern: ${insertError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: pattern,
    });
  } catch (error) {
    console.error('Patterns POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
