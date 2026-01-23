/**
 * User Stats API Route
 * Returns real statistics for the authenticated user
 */

import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase-server';

export async function GET() {
  try {
    const supabase = await createServerClient();

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({
        investigationCount: 0,
        avgTriageScore: 0,
        credibilityScore: 0,
        contributionCount: 0,
      });
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('aletheia_users')
      .select('id, credibility_score')
      .eq('auth_id', user.id)
      .single() as { data: { id: string; credibility_score: number } | null };

    if (!profile) {
      return NextResponse.json({
        investigationCount: 0,
        avgTriageScore: 0,
        credibilityScore: 0,
        contributionCount: 0,
      });
    }

    // Fetch user's investigations count and average triage score
    const { data: investigations, count: investigationCount } = await supabase
      .from('aletheia_investigations')
      .select('triage_score', { count: 'exact' })
      .eq('user_id', profile.id) as { data: Array<{ triage_score: number | null }> | null; count: number | null };

    // Calculate average triage score
    const validScores = (investigations || [])
      .map(i => i.triage_score)
      .filter((s): s is number => s !== null && s !== undefined);
    const avgTriageScore = validScores.length > 0
      ? validScores.reduce((a, b) => a + b, 0) / validScores.length
      : 0;

    // Fetch contribution count
    const { count: contributionCount } = await supabase
      .from('aletheia_contributions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', profile.id) as { count: number | null };

    return NextResponse.json({
      investigationCount: investigationCount || 0,
      avgTriageScore: Math.round(avgTriageScore * 10) / 10,
      credibilityScore: profile.credibility_score || 0,
      contributionCount: contributionCount || 0,
    });
  } catch (error) {
    console.error('User stats API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user stats' },
      { status: 500 }
    );
  }
}
