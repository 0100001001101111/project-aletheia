/**
 * Pre-Registration API Route
 * Create and list pre-registrations for prediction testing
 *
 * Note: Type assertions used until migrations are applied and types regenerated
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase-server';
import { createHash, randomBytes } from 'crypto';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = any;

/**
 * Generate a 12-character hash ID (no ambiguous characters)
 */
function generateHashId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = randomBytes(12);
  let result = '';
  for (let i = 0; i < 12; i++) {
    result += chars[bytes[i] % chars.length];
  }
  return result;
}

/**
 * Generate SHA-256 hash of protocol content
 */
function hashContent(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient() as AnyClient;
    const { searchParams } = new URL(request.url);

    // Parse query params
    const predictionId = searchParams.get('prediction_id');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // Build query
    let query = supabase
      .from('aletheia_preregistrations')
      .select('*', { count: 'exact' });

    // Apply filters
    if (predictionId) {
      query = query.eq('prediction_id', predictionId);
    }
    if (status) {
      query = query.eq('status', status);
    }

    // Apply sorting and pagination
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: preregistrations, error, count } = await query;

    if (error) {
      console.error('Query error:', error);
      return NextResponse.json(
        { error: `Failed to fetch pre-registrations: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: preregistrations,
      total: count,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Pre-registration API error:', error);
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
    const {
      prediction_id,
      protocol,
      hypothesis,
      methodology,
      expected_sample_size,
      analysis_plan,
      embargoed,
      embargo_until,
    } = body;

    // Validate required fields
    if (!prediction_id || !protocol || !hypothesis || !methodology) {
      return NextResponse.json(
        { error: 'Missing required fields: prediction_id, protocol, hypothesis, methodology' },
        { status: 400 }
      );
    }

    // Verify prediction exists
    const { data: prediction, error: predError } = await supabase
      .from('aletheia_predictions')
      .select('id')
      .eq('id', prediction_id)
      .single();

    if (predError || !prediction) {
      return NextResponse.json(
        { error: 'Prediction not found' },
        { status: 404 }
      );
    }

    // Generate unique hash ID (retry if collision)
    let hashId = generateHashId();
    let attempts = 0;
    while (attempts < 5) {
      const { data: existing } = await supabase
        .from('aletheia_preregistrations')
        .select('id')
        .eq('hash_id', hashId)
        .single();

      if (!existing) break;
      hashId = generateHashId();
      attempts++;
    }

    // Generate content hash for verification
    const contentToHash = JSON.stringify({
      protocol,
      hypothesis,
      methodology,
      expected_sample_size,
      analysis_plan,
      timestamp: new Date().toISOString(),
    });
    const contentHash = hashContent(contentToHash);

    // Insert pre-registration
    const { data: preregistration, error: insertError } = await supabase
      .from('aletheia_preregistrations')
      .insert({
        prediction_id,
        user_id: user.id,
        hash_id: hashId,
        content_hash: contentHash,
        protocol,
        hypothesis,
        methodology,
        expected_sample_size: expected_sample_size || null,
        analysis_plan: analysis_plan || null,
        embargoed: embargoed || false,
        embargo_until: embargo_until || null,
        status: 'active',
      })
      .select()
      .single();

    if (insertError) {
      console.error('Insert error:', insertError);
      return NextResponse.json(
        { error: `Failed to create pre-registration: ${insertError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: preregistration,
      hash_id: hashId,
      verification_url: `/preregister/${hashId}`,
    });
  } catch (error) {
    console.error('Pre-registration POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
