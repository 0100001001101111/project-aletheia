/**
 * Provide Data API Route
 * Submit data response for Tier 1 disputes
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

export async function POST(request: NextRequest, { params }: RouteParams) {
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

    // Get dispute with result
    const { data: dispute, error: fetchError } = await supabase
      .from('aletheia_disputes')
      .select(`
        *,
        result:aletheia_prediction_results(
          id,
          tester_id,
          tester:aletheia_prediction_testers(
            user_id
          )
        )
      `)
      .eq('id', id)
      .single();

    if (fetchError || !dispute) {
      return NextResponse.json(
        { error: 'Dispute not found' },
        { status: 404 }
      );
    }

    // Verify dispute is Tier 1 and open
    if (dispute.tier !== 1) {
      return NextResponse.json(
        { error: 'Data can only be provided for Tier 1 disputes' },
        { status: 400 }
      );
    }

    if (dispute.status !== 'open') {
      return NextResponse.json(
        { error: 'This dispute is no longer open' },
        { status: 400 }
      );
    }

    // Check if data already provided
    if (dispute.data_provided) {
      return NextResponse.json(
        { error: 'Data has already been provided for this dispute' },
        { status: 400 }
      );
    }

    // Verify user is the result submitter (owner check)
    const result = dispute.result;
    if (result?.tester?.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Only the result submitter can provide data' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { data: dataContent } = body;

    if (!dataContent || dataContent.trim().length < 10) {
      return NextResponse.json(
        { error: 'Please provide a substantive response (at least 10 characters)' },
        { status: 400 }
      );
    }

    // Update dispute with provided data
    const { data: updated, error: updateError } = await supabase
      .from('aletheia_disputes')
      .update({
        data_provided: dataContent,
        data_provided_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Update error:', updateError);
      return NextResponse.json(
        { error: `Failed to submit data: ${updateError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updated,
      message: 'Data submitted successfully. The dispute initiator will review your response.',
    });
  } catch (error) {
    console.error('Provide data error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
