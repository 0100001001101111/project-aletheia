import { NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

type CookieToSet = { name: string; value: string; options: CookieOptions };

// POST /api/submissions/drafts - Create new draft
export async function POST(request: Request) {
  try {
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
    const body = await request.json();

    // Generate session ID for anonymous users
    const sessionId = !user ? crypto.randomUUID() : null;

    const draftData = {
      user_id: user?.id || null,
      session_id: sessionId,
      current_step: body.current_step || 1,
      investigation_type: body.investigation_type || null,
      domain_ai_suggestion: body.domain_ai_suggestion || null,
      title: body.title || null,
      event_date: body.event_date || null,
      event_date_approximate: body.event_date_approximate || false,
      event_location: body.event_location || null,
      latitude: body.latitude || null,
      longitude: body.longitude || null,
      summary: body.summary || null,
      witnesses: body.witnesses || [],
      domain_data: body.domain_data || {},
      evidence: body.evidence || [],
      environmental_data: body.environmental_data || {},
      status: 'in_progress',
    };

    const { data, error } = await supabase
      .from('aletheia_submission_drafts')
      .insert(draftData)
      .select()
      .single();

    if (error) {
      console.error('Draft creation error:', error);
      return NextResponse.json({ error: 'Failed to create draft' }, { status: 500 });
    }

    // Set session cookie for anonymous users
    if (sessionId) {
      cookieStore.set('draft_session', sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30, // 30 days
      });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Draft creation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET /api/submissions/drafts - List user's drafts
export async function GET() {
  try {
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
      .eq('status', 'in_progress')
      .order('updated_at', { ascending: false });

    if (user) {
      query = query.eq('user_id', user.id);
    } else if (sessionId) {
      query = query.eq('session_id', sessionId);
    } else {
      return NextResponse.json([]);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Draft list error:', error);
      return NextResponse.json({ error: 'Failed to fetch drafts' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Draft list error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
