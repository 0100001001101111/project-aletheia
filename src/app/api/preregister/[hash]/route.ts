/**
 * Pre-Registration Verification API Route
 * Lookup and verify pre-registrations by hash ID
 *
 * Note: Type assertions used until migrations are applied and types regenerated
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase-server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = any;

interface RouteParams {
  params: Promise<{ hash: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { hash } = await params;
    const supabase = await createServerClient() as AnyClient;

    // Lookup by hash ID
    const { data: preregistration, error } = await supabase
      .from('aletheia_preregistrations')
      .select(`
        *,
        prediction:aletheia_predictions(
          id,
          hypothesis,
          status,
          domains_involved
        )
      `)
      .eq('hash_id', hash.toUpperCase())
      .single();

    if (error || !preregistration) {
      return NextResponse.json(
        { error: 'Pre-registration not found' },
        { status: 404 }
      );
    }

    // Check embargo
    const isEmbargoed = preregistration.embargoed &&
      preregistration.embargo_until &&
      new Date(preregistration.embargo_until) > new Date();

    // If embargoed and not the owner, return limited info
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (isEmbargoed && preregistration.user_id !== user?.id) {
      return NextResponse.json({
        hash_id: preregistration.hash_id,
        embargoed: true,
        embargo_until: preregistration.embargo_until,
        created_at: preregistration.created_at,
        status: preregistration.status,
        message: 'This pre-registration is under embargo until the specified date.',
      });
    }

    return NextResponse.json({
      data: preregistration,
      verified: true,
      verification_timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Pre-registration lookup error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { hash } = await params;
    const supabase = await createServerClient() as AnyClient;

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get pre-registration
    const { data: preregistration, error: fetchError } = await supabase
      .from('aletheia_preregistrations')
      .select('*')
      .eq('hash_id', hash.toUpperCase())
      .single();

    if (fetchError || !preregistration) {
      return NextResponse.json(
        { error: 'Pre-registration not found' },
        { status: 404 }
      );
    }

    // Check ownership
    if (preregistration.user_id !== user.id) {
      return NextResponse.json(
        { error: 'You can only update your own pre-registrations' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { status } = body;

    // Only allow status updates (completed, withdrawn)
    if (!status || !['completed', 'withdrawn'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be "completed" or "withdrawn"' },
        { status: 400 }
      );
    }

    // Update status
    const { data: updated, error: updateError } = await supabase
      .from('aletheia_preregistrations')
      .update({ status })
      .eq('id', preregistration.id)
      .select()
      .single();

    if (updateError) {
      console.error('Update error:', updateError);
      return NextResponse.json(
        { error: `Failed to update pre-registration: ${updateError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    console.error('Pre-registration PATCH error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
