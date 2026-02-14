import { NextRequest, NextResponse } from 'next/server';
import { createAgentReadClient } from '@/lib/agent/supabase-admin';
import { createClient } from '@/lib/supabase-server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const agent = searchParams.get('agent');
  const minConfidence = searchParams.get('minConfidence');
  const destinationType = searchParams.get('type');
  const sort = searchParams.get('sort') || 'newest';
  const limit = parseInt(searchParams.get('limit') || '50');
  const offset = parseInt(searchParams.get('offset') || '0');

  try {
    const authClient = await createClient();
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const supabase = createAgentReadClient();

    let query = supabase
      .from('aletheia_agent_findings')
      .select('id, title, display_title, summary, confidence, review_status, destination_type, destination_status, agent_id, created_at, rejection_reason, technical_details, supporting_tests, suggested_prediction');

    if (agent) query = query.eq('agent_id', agent);
    if (minConfidence) query = query.gte('confidence', parseFloat(minConfidence));
    if (destinationType) query = query.eq('destination_type', destinationType);

    if (sort === 'confidence') {
      query = query.order('confidence', { ascending: false, nullsFirst: false });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    query = query.range(offset, offset + limit - 1);

    const { data, error } = await query;
    if (error) throw error;

    // Count with same filters
    let countQuery = supabase
      .from('aletheia_agent_findings')
      .select('*', { count: 'exact', head: true });

    if (agent) countQuery = countQuery.eq('agent_id', agent);
    if (minConfidence) countQuery = countQuery.gte('confidence', parseFloat(minConfidence));
    if (destinationType) countQuery = countQuery.eq('destination_type', destinationType);

    const { count } = await countQuery;

    return NextResponse.json({ findings: data || [], total: count || 0 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch findings';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
