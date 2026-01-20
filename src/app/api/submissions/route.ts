/**
 * Submissions API Route
 * Handle creation and listing of investigation submissions
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase-server';
import { validateData } from '@/schemas';
import { calculateTriageScore } from '@/lib/triage';
import { sanitizeString, sanitizeJSON } from '@/lib/sanitize';
import { checkRateLimit, getClientId, RATE_LIMITS, rateLimitResponse } from '@/lib/rate-limit';
import type { InvestigationType, TriageStatus } from '@/types/database';

export async function POST(request: NextRequest) {
  // Rate limiting for submissions
  const clientId = getClientId(request);
  const rateLimit = checkRateLimit(`submission:${clientId}`, RATE_LIMITS.SUBMISSION);
  if (!rateLimit.success) {
    return rateLimitResponse(rateLimit);
  }

  try {
    const supabase = await createServerClient();

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { type, title: rawTitle, raw_data: rawData, triage_score, triage_status } = body as {
      type: InvestigationType;
      title: string;
      raw_data: Record<string, unknown>;
      triage_score?: number;
      triage_status?: TriageStatus;
    };

    // Sanitize user inputs
    const title = sanitizeString(rawTitle);
    const raw_data = sanitizeJSON(rawData) as Record<string, unknown>;

    // Validate required fields
    if (!type || !title || !raw_data) {
      return NextResponse.json(
        { error: 'Missing required fields: type, title, raw_data' },
        { status: 400 }
      );
    }

    // Validate investigation type
    const validTypes: InvestigationType[] = [
      'nde',
      'ganzfeld',
      'crisis_apparition',
      'stargate',
      'geophysical',
      'ufo',
    ];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: `Invalid investigation type. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate data against schema
    const validation = validateData(type, raw_data);
    if (!validation.success) {
      // Allow submission with validation errors, but log them
      console.warn('Submission has validation errors:', validation.errors);
    }

    // Calculate triage score if not provided
    let finalTriageScore = triage_score;
    let finalTriageStatus = triage_status;
    if (finalTriageScore === undefined) {
      const triage = calculateTriageScore(raw_data, type);
      finalTriageScore = triage.overall;
      finalTriageStatus = triage.status;
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('aletheia_users')
      .select('id')
      .eq('auth_id', user.id)
      .single() as { data: { id: string } | null };

    if (!profile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }

    // Create investigation record
    const { data: investigation, error: insertError } = await (supabase
      .from('aletheia_investigations') as ReturnType<typeof supabase.from>)
      .insert({
        title,
        investigation_type: type,
        raw_data,
        triage_score: finalTriageScore,
        triage_status: finalTriageStatus || 'pending',
        user_id: profile.id,
      } as never)
      .select()
      .single() as { data: { id: string } | null; error: { message?: string } | null };

    if (insertError) {
      console.error('Insert error:', insertError);
      return NextResponse.json(
        { error: `Failed to create submission: ${insertError.message}` },
        { status: 500 }
      );
    }

    // Create contribution record with credibility points
    // High-quality submissions (7+) earn more points
    const credibilityPoints = finalTriageScore >= 7 ? 5 : finalTriageScore >= 4 ? 2 : 0;

    await (supabase.from('aletheia_contributions') as ReturnType<typeof supabase.from>)
      .insert({
        user_id: profile.id,
        investigation_id: investigation?.id,
        contribution_type: 'submission',
        credibility_points_earned: credibilityPoints,
        notes: `Submitted: ${title} (${type}, score: ${finalTriageScore})`,
      } as never);

    // Auto-update user credibility score for verified submissions
    if (credibilityPoints > 0) {
      const { data: currentUser } = await supabase
        .from('aletheia_users')
        .select('credibility_score')
        .eq('id', profile.id)
        .single() as { data: { credibility_score: number } | null };

      if (currentUser) {
        // Cap at 100
        const newScore = Math.min(100, (currentUser.credibility_score || 0) + credibilityPoints);
        await (supabase.from('aletheia_users') as ReturnType<typeof supabase.from>)
          .update({ credibility_score: newScore } as never)
          .eq('id', profile.id);
      }
    }

    return NextResponse.json({
      success: true,
      id: investigation?.id,
      triage_score: finalTriageScore,
      triage_status: finalTriageStatus,
      credibility_earned: credibilityPoints,
    });
  } catch (error) {
    console.error('Submissions API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { searchParams } = new URL(request.url);

    // Parse query params
    const type = searchParams.get('type') as InvestigationType | null;
    const status = searchParams.get('status') as TriageStatus | null;
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const sortBy = searchParams.get('sort') || 'created_at';
    const sortOrder = searchParams.get('order') || 'desc';

    // Build query
    let query = supabase
      .from('aletheia_investigations')
      .select('id, title, type:investigation_type, triage_score, triage_status, created_at, user_id', { count: 'exact' });

    // Apply filters
    if (type) {
      query = query.eq('investigation_type', type);
    }
    if (status) {
      query = query.eq('triage_status', status);
    }

    // Apply sorting
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data: investigations, error, count } = await query;

    if (error) {
      console.error('Query error:', error);
      return NextResponse.json(
        { error: `Failed to fetch submissions: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: investigations,
      total: count,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Submissions API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
