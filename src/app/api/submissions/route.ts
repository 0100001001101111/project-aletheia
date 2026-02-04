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

    // Get user profile with credibility score (single query instead of N+1)
    const { data: profile } = await supabase
      .from('aletheia_users')
      .select('id, credibility_score')
      .eq('auth_id', user.id)
      .single() as { data: { id: string; credibility_score: number } | null };

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
      // Use credibility_score from initial profile fetch (no extra query needed)
      const newScore = Math.min(100, (profile.credibility_score || 0) + credibilityPoints);
      await (supabase.from('aletheia_users') as ReturnType<typeof supabase.from>)
        .update({ credibility_score: newScore } as never)
        .eq('id', profile.id);
    }

    // Trigger pattern analysis asynchronously (fire and forget)
    // Only for verified/provisional submissions
    if (finalTriageStatus === 'verified' || finalTriageStatus === 'provisional') {
      // Get host from request headers for internal API call
      const host = request.headers.get('host') || 'localhost:3000';
      const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';

      // Fire async pattern analysis - don't await
      fetch(`${protocol}://${host}/api/patterns/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': request.headers.get('cookie') || '',
        },
        body: JSON.stringify({ investigationId: investigation?.id }),
      }).catch((err) => {
        console.error('Pattern analysis trigger failed:', err);
      });
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
    const tier = searchParams.get('tier') as 'all' | 'research' | 'exploratory' | null;
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const sortBy = searchParams.get('sort') || 'created_at';
    const sortOrder = searchParams.get('order') || 'desc';

    const effectiveTier = tier || 'all'; // Default to showing all

    // Use optimized database function to bypass RLS overhead
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.rpc as any)('get_investigations_page', {
      p_tier: effectiveTier,
      p_type: type || null,
      p_status: status || null,
      p_sort: sortBy,
      p_order: sortOrder,
      p_limit: limit + 1, // Fetch one extra to know if there are more
      p_offset: offset,
    }) as { data: Array<{ id: string; title: string; type: string; triage_score: number; triage_status: string; created_at: string; user_id: string; tier: string }> | null; error: { message: string } | null };

    if (error) {
      console.error('Query error:', error);
      return NextResponse.json(
        { error: `Failed to fetch submissions: ${error.message}` },
        { status: 500 }
      );
    }

    // Calculate if there are more results
    const hasMore = data && data.length > limit;
    const results = hasMore ? data.slice(0, limit) : (data || []);

    // Get actual count using SECURITY DEFINER function (bypasses RLS overhead)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: totalCount, error: countError } = await (supabase.rpc as any)('get_investigations_count', {
      p_tier: effectiveTier,
      p_type: type || null,
      p_status: status || null,
    }) as { data: number | null; error: { message: string } | null };

    if (countError) {
      console.warn('Count query failed, using hasMore only:', countError.message);
    }

    // Get separate tier counts for UI badges
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [researchCountResult, exploratoryCountResult] = await Promise.all([
      (supabase.rpc as any)('get_investigations_count', {
        p_tier: 'research',
        p_type: type || null,
        p_status: status || null,
      }),
      (supabase.rpc as any)('get_investigations_count', {
        p_tier: 'exploratory',
        p_type: type || null,
        p_status: status || null,
      }),
    ]);

    return NextResponse.json({
      data: results,
      total: totalCount || 0,
      researchCount: researchCountResult.data || 0,
      exploratoryCount: exploratoryCountResult.data || 0,
      hasMore,
      limit,
      offset,
      tier: effectiveTier,
    });
  } catch (error) {
    console.error('Submissions API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
