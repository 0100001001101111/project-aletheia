import { NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { validateSubmissionUpdate } from '@/lib/anti-gaming';
import type { Witness } from '@/components/submission/WitnessesForm';
import type { EvidenceItem } from '@/components/submission/EvidenceForm';

type CookieToSet = { name: string; value: string; options: CookieOptions };

// GET /api/submissions/drafts/[id] - Get specific draft
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet: CookieToSet[]) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    const sessionId = cookieStore.get('draft_session')?.value;

    let query = supabase
      .from('aletheia_submission_drafts')
      .select('*')
      .eq('id', id)
      .single();

    const { data, error } = await query;

    if (error || !data) {
      return NextResponse.json({ error: 'Draft not found' }, { status: 404 });
    }

    // Verify ownership
    const isOwner = (user && data.user_id === user.id) ||
                    (sessionId && data.session_id === sessionId);

    if (!isOwner) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Draft fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/submissions/drafts/[id] - Update draft
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet: CookieToSet[]) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    const sessionId = cookieStore.get('draft_session')?.value;

    // First verify ownership and get current state
    const { data: existing } = await supabase
      .from('aletheia_submission_drafts')
      .select('user_id, session_id, witnesses, evidence')
      .eq('id', id)
      .single();

    if (!existing) {
      return NextResponse.json({ error: 'Draft not found' }, { status: 404 });
    }

    const isOwner = (user && existing.user_id === user.id) ||
                    (sessionId && existing.session_id === sessionId);

    if (!isOwner) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();

    // Validate credential changes to prevent gaming
    if (body.witnesses && existing.witnesses) {
      const originalWitnesses = (existing.witnesses || []) as Witness[];
      const originalEvidence = (existing.evidence || []) as EvidenceItem[];
      const updatedWitnesses = body.witnesses as Witness[];
      const updatedEvidence = (body.evidence || originalEvidence) as EvidenceItem[];

      const validationErrors = validateSubmissionUpdate(
        originalWitnesses,
        originalEvidence,
        updatedWitnesses,
        updatedEvidence
      );

      if (validationErrors.length > 0) {
        return NextResponse.json(
          {
            error: 'Validation failed: credential changes require supporting evidence',
            validationErrors
          },
          { status: 400 }
        );
      }
    }

    // Build update object - only include fields that are present
    const updateData: Record<string, unknown> = {};
    const allowedFields = [
      'current_step',
      'investigation_type',
      'domain_ai_suggestion',
      'title',
      'event_date',
      'event_date_approximate',
      'event_location',
      'latitude',
      'longitude',
      'summary',
      'witnesses',
      'domain_data',
      'evidence',
      'environmental_data',
      'last_score_estimate',
    ];

    for (const field of allowedFields) {
      if (field in body) {
        updateData[field] = body[field];
      }
    }

    // Update the score calculation timestamp if score was updated
    if ('last_score_estimate' in body) {
      updateData.last_score_calculated_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('aletheia_submission_drafts')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Draft update error:', error);
      return NextResponse.json({ error: 'Failed to update draft' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Draft update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/submissions/drafts/[id] - Delete draft
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet: CookieToSet[]) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    const sessionId = cookieStore.get('draft_session')?.value;

    // First verify ownership
    const { data: existing } = await supabase
      .from('aletheia_submission_drafts')
      .select('user_id, session_id')
      .eq('id', id)
      .single();

    if (!existing) {
      return NextResponse.json({ error: 'Draft not found' }, { status: 404 });
    }

    const isOwner = (user && existing.user_id === user.id) ||
                    (sessionId && existing.session_id === sessionId);

    if (!isOwner) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { error } = await supabase
      .from('aletheia_submission_drafts')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Draft delete error:', error);
      return NextResponse.json({ error: 'Failed to delete draft' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Draft delete error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
