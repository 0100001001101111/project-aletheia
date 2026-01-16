/**
 * Individual Dispute API Route
 * View and manage a specific dispute
 *
 * Note: Type assertions used until migrations are applied and types regenerated
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase-server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = any;

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createServerClient() as AnyClient;

    const { data: dispute, error } = await supabase
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
          methodology,
          tester:aletheia_prediction_testers(
            display_name
          )
        ),
        flag:aletheia_result_flags(
          id,
          flaw_type,
          description,
          evidence,
          severity
        )
      `)
      .eq('id', id)
      .single();

    if (error || !dispute) {
      return NextResponse.json(
        { error: 'Dispute not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: dispute });
  } catch (error) {
    console.error('Dispute GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createServerClient() as AnyClient;

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get dispute
    const { data: dispute, error: fetchError } = await supabase
      .from('aletheia_disputes')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !dispute) {
      return NextResponse.json(
        { error: 'Dispute not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { status, nullification_reason } = body;

    // Validate status update
    const validStatuses = ['open', 'resolved', 'escalated', 'nullified'];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    // Build update object
    const updates: Record<string, unknown> = {};
    if (status) {
      updates.status = status;
      if (status === 'resolved' || status === 'nullified') {
        updates.resolved_at = new Date().toISOString();
      }
    }
    if (nullification_reason) {
      updates.nullification_reason = nullification_reason;
    }

    // Update dispute
    const { data: updated, error: updateError } = await supabase
      .from('aletheia_disputes')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Update error:', updateError);
      return NextResponse.json(
        { error: `Failed to update dispute: ${updateError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    console.error('Dispute PATCH error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
