/**
 * Prediction Testers API
 * Manage who is testing a prediction
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase-server';

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface TesterRecord {
  id: string;
  status: string;
  institution: string | null;
  methodology_notes: string | null;
  expected_completion: string | null;
  claimed_at: string;
  user: {
    id: string;
    display_name: string;
    identity_type: string;
  };
}

// GET - List all testers for a prediction
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createServerClient();

    const { data: testers, error } = await (supabase
      .from('aletheia_prediction_testers') as ReturnType<typeof supabase.from>)
      .select(`
        id,
        status,
        institution,
        methodology_notes,
        expected_completion,
        claimed_at,
        user:aletheia_users!user_id(
          id,
          display_name,
          identity_type
        )
      `)
      .eq('prediction_id', id)
      .order('claimed_at', { ascending: false }) as { data: TesterRecord[] | null; error: { message: string } | null };

    if (error) {
      console.error('Testers query error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get counts by status
    const counts = {
      active: testers?.filter(t => t.status === 'active').length || 0,
      completed: testers?.filter(t => t.status === 'completed').length || 0,
      total: testers?.length || 0,
    };

    return NextResponse.json({ data: testers, counts });
  } catch (error) {
    console.error('Testers GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Claim/join testing for a prediction
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createServerClient();

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('aletheia_users')
      .select('id')
      .eq('auth_id', user.id)
      .single() as { data: { id: string } | null };

    if (!profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    const body = await request.json();
    const { institution, methodology_notes, expected_completion } = body;

    // Check if already claimed
    const { data: existing } = await (supabase
      .from('aletheia_prediction_testers') as ReturnType<typeof supabase.from>)
      .select('id, status')
      .eq('prediction_id', id)
      .eq('user_id', profile.id)
      .single() as { data: { id: string; status: string } | null };

    if (existing) {
      if (existing.status === 'withdrawn') {
        // Reactivate
        const { error: updateError } = await (supabase
          .from('aletheia_prediction_testers') as ReturnType<typeof supabase.from>)
          .update({
            status: 'active',
            institution,
            methodology_notes,
            expected_completion,
            updated_at: new Date().toISOString()
          } as never)
          .eq('id', existing.id);

        if (updateError) {
          return NextResponse.json({ error: updateError.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: 'Rejoined testing' });
      }
      return NextResponse.json({ error: 'Already testing this prediction' }, { status: 400 });
    }

    // Create new tester record
    const { error: insertError } = await (supabase
      .from('aletheia_prediction_testers') as ReturnType<typeof supabase.from>)
      .insert({
        prediction_id: id,
        user_id: profile.id,
        institution,
        methodology_notes,
        expected_completion,
      } as never);

    if (insertError) {
      console.error('Insert error:', insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // Update prediction status to 'testing' if it was 'open'
    await supabase
      .from('aletheia_predictions')
      .update({ status: 'testing' } as never)
      .eq('id', id)
      .eq('status', 'open');

    return NextResponse.json({ success: true, message: 'Joined testing' });
  } catch (error) {
    console.error('Testers POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH - Update tester status (withdraw, complete)
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createServerClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('aletheia_users')
      .select('id')
      .eq('auth_id', user.id)
      .single() as { data: { id: string } | null };

    if (!profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    const body = await request.json();
    const { status, methodology_notes, expected_completion } = body;

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (status) updates.status = status;
    if (methodology_notes !== undefined) updates.methodology_notes = methodology_notes;
    if (expected_completion !== undefined) updates.expected_completion = expected_completion;

    const { error: updateError } = await (supabase
      .from('aletheia_prediction_testers') as ReturnType<typeof supabase.from>)
      .update(updates as never)
      .eq('prediction_id', id)
      .eq('user_id', profile.id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Testers PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
