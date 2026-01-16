/**
 * Community Hypothesis Detail API
 * GET - Get a single hypothesis by ID
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import type { CommunityHypothesis } from '@/types/database';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET - Get single hypothesis with user info
export async function GET(
  request: Request,
  context: RouteContext
) {
  const params = await context.params;
  const supabase = await createClient();

  // Get the hypothesis - use type assertion for table not in generated types
  const { data: hypothesis, error } = await (supabase
    .from('aletheia_community_hypotheses') as ReturnType<typeof supabase.from>)
    .select('*')
    .eq('id', params.id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return NextResponse.json({ error: 'Hypothesis not found' }, { status: 404 });
    }
    console.error('Error fetching hypothesis:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const typedHypothesis = hypothesis as CommunityHypothesis;

  // Get the user info if available
  let user = null;
  if (typedHypothesis.user_id) {
    const { data: userData } = await supabase
      .from('aletheia_users')
      .select('id, display_name, verification_level')
      .eq('id', typedHypothesis.user_id)
      .single();

    user = userData;
  }

  return NextResponse.json({
    data: {
      ...typedHypothesis,
      user,
    },
  });
}
