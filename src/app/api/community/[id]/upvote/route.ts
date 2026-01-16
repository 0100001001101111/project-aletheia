/**
 * Community Hypothesis Upvote API
 * POST - Upvote a hypothesis
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import type { CommunityHypothesis } from '@/types/database';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// POST - Upvote a hypothesis
export async function POST(
  request: Request,
  context: RouteContext
) {
  try {
    const params = await context.params;
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get current hypothesis - use type assertion for table not in generated types
    const { data: hypothesis, error: fetchError } = await (supabase
      .from('aletheia_community_hypotheses') as ReturnType<typeof supabase.from>)
      .select('id, upvotes')
      .eq('id', params.id)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Hypothesis not found' }, { status: 404 });
      }
      console.error('Error fetching hypothesis:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch hypothesis' }, { status: 500 });
    }

    const typedHypothesis = hypothesis as Pick<CommunityHypothesis, 'id' | 'upvotes'>;

    // Increment upvotes
    const { data, error } = await (supabase
      .from('aletheia_community_hypotheses') as ReturnType<typeof supabase.from>)
      .update({ upvotes: (typedHypothesis.upvotes || 0) + 1 } as never)
      .eq('id', params.id)
      .select()
      .single();

    if (error) {
      console.error('Error upvoting hypothesis:', error);
      return NextResponse.json({ error: 'Failed to upvote hypothesis' }, { status: 500 });
    }

    return NextResponse.json({ data: data as CommunityHypothesis });
  } catch (error) {
    console.error('Upvote error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
