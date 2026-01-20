import { NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

type CookieToSet = { name: string; value: string; options: CookieOptions };

// PATCH /api/admin/gaming-flags/[id] - Update gaming flag status
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { outcome } = body;

    // Validate outcome
    const validOutcomes = ['dismissed', 'warning', 'submission_blocked'];
    if (!outcome || !validOutcomes.includes(outcome)) {
      return NextResponse.json(
        { error: 'Invalid outcome. Must be: dismissed, warning, or submission_blocked' },
        { status: 400 }
      );
    }

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

    // TODO: Add admin check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Update the flag
    const { data, error } = await supabase
      .from('aletheia_gaming_flags')
      .update({
        reviewed: true,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        outcome,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Gaming flag update error:', error);
      return NextResponse.json({ error: 'Failed to update flag' }, { status: 500 });
    }

    // If outcome is warning or submission_blocked, create a notification
    if (outcome === 'warning' || outcome === 'submission_blocked') {
      const flagData = data as { user_id?: string; draft_id?: string };
      if (flagData.user_id) {
        await supabase.from('aletheia_notifications').insert({
          user_id: flagData.user_id,
          notification_type: outcome === 'warning' ? 'gaming_warning' : 'submission_blocked',
          title: outcome === 'warning'
            ? 'Review Notice: Submission Pattern Flagged'
            : 'Submission Blocked',
          body: outcome === 'warning'
            ? 'One of your submissions was flagged for unusual patterns. Please review our guidelines.'
            : 'A submission has been blocked due to policy violations. Please contact support if you believe this is an error.',
          link: flagData.draft_id ? `/submissions/${flagData.draft_id}` : undefined,
        });
      }
    }

    return NextResponse.json({ success: true, flag: data });
  } catch (error) {
    console.error('Gaming flag action error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET /api/admin/gaming-flags/[id] - Get single flag details
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
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('aletheia_gaming_flags')
      .select(`
        *,
        aletheia_users!user_id (display_name, email),
        aletheia_submission_drafts!draft_id (title, created_at)
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Gaming flag fetch error:', error);
      return NextResponse.json({ error: 'Flag not found' }, { status: 404 });
    }

    return NextResponse.json({ flag: data });
  } catch (error) {
    console.error('Gaming flag error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
