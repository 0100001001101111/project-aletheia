import { NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

type CookieToSet = { name: string; value: string; options: CookieOptions };

interface UserStats {
  submissionCount: number;
  verifiedCount: number;
  methodologyPoints: number;
  percentileRank: number;
  credibilityScore: number;
}

interface Investigation {
  id: string;
  title: string;
  investigationType: string;
  triageScore: number;
  triageStatus: string;
  viewCount: number;
  patternMatchCount: number;
  activeChallenges: number;
  createdAt: string;
  updatedAt: string;
}

interface Draft {
  id: string;
  investigationType: string | null;
  title: string | null;
  currentStep: number;
  updatedAt: string;
}

interface ActivityItem {
  id: string;
  type: string;
  description: string;
  link?: string;
  createdAt: string;
}

interface PatternMatch {
  patternId: string;
  patternName: string;
  investigationCount: number;
  predictionCount: number;
  matchStrength: number;
}

interface DashboardResponse {
  userStats: UserStats;
  investigations: Investigation[];
  drafts: Draft[];
  activityFeed: ActivityItem[];
  patternMatches: PatternMatch[];
}

// GET /api/user/dashboard - Get user dashboard data
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

    if (!user && !sessionId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Fetch user stats
    const userStats: UserStats = {
      submissionCount: 0,
      verifiedCount: 0,
      methodologyPoints: 0,
      percentileRank: 50,
      credibilityScore: 5.0,
    };

    if (user) {
      const { data: userData } = await supabase
        .from('aletheia_users')
        .select('credibility_score')
        .eq('id', user.id)
        .single();

      if (userData) {
        userStats.credibilityScore = userData.credibility_score || 5.0;
      }

      // Count investigations
      const { count: investigationCount } = await supabase
        .from('aletheia_investigations')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      userStats.submissionCount = investigationCount || 0;

      // Count verified
      const { count: verifiedCount } = await supabase
        .from('aletheia_investigations')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('triage_status', 'verified');

      userStats.verifiedCount = verifiedCount || 0;

      // Calculate methodology points from contributions
      const { data: contributions } = await supabase
        .from('aletheia_contributions')
        .select('credibility_points_earned')
        .eq('user_id', user.id);

      if (contributions) {
        userStats.methodologyPoints = contributions.reduce(
          (sum, c) => sum + (c.credibility_points_earned || 0),
          0
        );
      }
    }

    // Fetch user's investigations
    const investigations: Investigation[] = [];
    if (user) {
      const { data: invData } = await supabase
        .from('aletheia_investigations')
        .select('id, title, investigation_type, triage_score, triage_status, created_at, updated_at')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(10);

      if (invData) {
        for (const inv of invData) {
          // Count pattern matches for this investigation
          const { count: patternCount } = await supabase
            .from('aletheia_pattern_matches')
            .select('*', { count: 'exact', head: true })
            .contains('matching_investigation_ids', [inv.id]);

          investigations.push({
            id: inv.id,
            title: inv.title || 'Untitled',
            investigationType: inv.investigation_type || 'unknown',
            triageScore: inv.triage_score || 0,
            triageStatus: inv.triage_status || 'pending',
            viewCount: 0, // Would need view tracking
            patternMatchCount: patternCount || 0,
            activeChallenges: 0, // Would need disputes table check
            createdAt: inv.created_at,
            updatedAt: inv.updated_at,
          });
        }
      }
    }

    // Fetch drafts
    const drafts: Draft[] = [];
    const draftQuery = supabase
      .from('aletheia_submission_drafts')
      .select('id, investigation_type, title, current_step, updated_at')
      .eq('status', 'in_progress')
      .order('updated_at', { ascending: false })
      .limit(5);

    if (user) {
      draftQuery.eq('user_id', user.id);
    } else if (sessionId) {
      draftQuery.eq('session_id', sessionId);
    }

    const { data: draftData } = await draftQuery;
    if (draftData) {
      for (const draft of draftData) {
        drafts.push({
          id: draft.id,
          investigationType: draft.investigation_type,
          title: draft.title,
          currentStep: draft.current_step,
          updatedAt: draft.updated_at,
        });
      }
    }

    // Fetch recent activity (notifications)
    const activityFeed: ActivityItem[] = [];
    if (user) {
      const { data: notifications } = await supabase
        .from('aletheia_notifications')
        .select('id, notification_type, title, body, link, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (notifications) {
        for (const notif of notifications) {
          activityFeed.push({
            id: notif.id,
            type: notif.notification_type,
            description: notif.title,
            link: notif.link || undefined,
            createdAt: notif.created_at,
          });
        }
      }
    }

    // Fetch pattern matches involving user's investigations
    const patternMatches: PatternMatch[] = [];
    if (user && investigations.length > 0) {
      const investigationIds = investigations.map(i => i.id);

      const { data: patterns } = await supabase
        .from('aletheia_pattern_matches')
        .select('*')
        .limit(5);

      if (patterns) {
        for (const pattern of patterns) {
          const matchingIds = pattern.matching_investigation_ids || [];
          const userMatches = matchingIds.filter((id: string) => investigationIds.includes(id));

          if (userMatches.length > 0) {
            patternMatches.push({
              patternId: pattern.id,
              patternName: pattern.pattern_description || 'Unnamed Pattern',
              investigationCount: matchingIds.length,
              predictionCount: 0, // Would need prediction linking
              matchStrength: pattern.confidence_score || 0,
            });
          }
        }
      }
    }

    const response: DashboardResponse = {
      userStats,
      investigations,
      drafts,
      activityFeed,
      patternMatches,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Dashboard fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
