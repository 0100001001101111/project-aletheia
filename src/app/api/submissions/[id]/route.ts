/**
 * Individual Submission API Route
 * Handle GET, PUT, DELETE for single submission
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase-server';
import { validateData } from '@/schemas';
import { calculateTriageScore } from '@/lib/triage';
import type { InvestigationType, TriageStatus } from '@/types/database';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createServerClient();

    const { data: investigation, error } = await supabase
      .from('aletheia_investigations')
      .select(`
        id,
        title,
        type:investigation_type,
        raw_data,
        triage_score,
        triage_status,
        created_at,
        updated_at,
        submitted_by_user:aletheia_users!user_id(
          id,
          display_name,
          identity_type
        ),
        contributions:aletheia_contributions(
          id,
          contribution_type,
          notes,
          created_at
        ),
        triage_reviews:aletheia_triage_reviews(
          id,
          overall_score,
          notes,
          created_at
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Submission not found' },
          { status: 404 }
        );
      }
      console.error('Query error:', error);
      return NextResponse.json(
        { error: `Failed to fetch submission: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json(investigation);
  } catch (error) {
    console.error('Submission GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
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

    // Check ownership (only owner can update)
    const { data: existing } = await supabase
      .from('aletheia_investigations')
      .select('user_id, investigation_type')
      .eq('id', id)
      .single() as { data: { user_id: string; investigation_type: string } | null };

    if (!existing) {
      return NextResponse.json(
        { error: 'Submission not found' },
        { status: 404 }
      );
    }

    if (existing.user_id !== profile.id) {
      return NextResponse.json(
        { error: 'You can only edit your own submissions' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { title, raw_data, recalculate_triage } = body as {
      title?: string;
      raw_data?: Record<string, unknown>;
      recalculate_triage?: boolean;
    };

    // Build update object
    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (title) {
      updates.title = title;
    }

    if (raw_data) {
      updates.raw_data = raw_data;

      // Validate updated data
      const validation = validateData(existing.investigation_type as InvestigationType, raw_data);
      if (!validation.success) {
        console.warn('Updated data has validation errors:', validation.errors);
      }

      // Recalculate triage if requested or if data changed
      if (recalculate_triage !== false) {
        const triage = calculateTriageScore(raw_data, existing.investigation_type as InvestigationType);
        updates.triage_score = triage.overall;
        updates.triage_status = triage.status;
      }
    }

    // Update record
    const { data: updated, error: updateError } = await (supabase
      .from('aletheia_investigations') as ReturnType<typeof supabase.from>)
      .update(updates as never)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Update error:', updateError);
      return NextResponse.json(
        { error: `Failed to update submission: ${updateError.message}` },
        { status: 500 }
      );
    }

    // Create edit contribution record
    await (supabase.from('aletheia_contributions') as ReturnType<typeof supabase.from>)
      .insert({
        user_id: profile.id,
        investigation_id: id,
        contribution_type: 'edit',
        notes: `Edited fields: ${Object.keys(updates).join(', ')}`,
      } as never);

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    console.error('Submission PUT error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
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

    // Check ownership
    const { data: existing } = await supabase
      .from('aletheia_investigations')
      .select('user_id')
      .eq('id', id)
      .single() as { data: { user_id: string } | null };

    if (!existing) {
      return NextResponse.json(
        { error: 'Submission not found' },
        { status: 404 }
      );
    }

    if (existing.user_id !== profile.id) {
      return NextResponse.json(
        { error: 'You can only delete your own submissions' },
        { status: 403 }
      );
    }

    // Delete the investigation (cascades to related records via FK)
    const { error: deleteError } = await (supabase
      .from('aletheia_investigations') as ReturnType<typeof supabase.from>)
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Delete error:', deleteError);
      return NextResponse.json(
        { error: `Failed to delete submission: ${deleteError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Submission DELETE error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
