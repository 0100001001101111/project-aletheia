import { NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

type CookieToSet = { name: string; value: string; options: CookieOptions };

// GET /api/admin/gaming-flags - List gaming flags
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const severity = searchParams.get('severity');
    const status = searchParams.get('status');

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
    // For now, just check if user is authenticated
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Build query
    let query = supabase
      .from('aletheia_gaming_flags')
      .select(`
        *,
        aletheia_users!user_id (display_name),
        aletheia_submission_drafts!draft_id (title)
      `)
      .order('created_at', { ascending: false })
      .limit(50);

    // Apply filters
    if (severity && severity !== 'all') {
      query = query.eq('severity', severity);
    }

    if (status === 'pending') {
      query = query.eq('reviewed', false);
    } else if (status === 'reviewed') {
      query = query.eq('reviewed', true);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Gaming flags fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch flags' }, { status: 500 });
    }

    // Transform data
    const flags = (data || []).map((flag) => ({
      id: flag.id,
      userId: flag.user_id,
      draftId: flag.draft_id,
      flagType: flag.flag_type,
      severity: flag.severity,
      details: flag.details,
      reviewed: flag.reviewed,
      reviewedBy: flag.reviewed_by,
      reviewedAt: flag.reviewed_at,
      outcome: flag.outcome,
      createdAt: flag.created_at,
      userName: (flag.aletheia_users as { display_name?: string })?.display_name,
      draftTitle: (flag.aletheia_submission_drafts as { title?: string })?.title,
    }));

    return NextResponse.json({ flags });
  } catch (error) {
    console.error('Gaming flags error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
