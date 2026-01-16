/**
 * Community Hypotheses API
 * GET - List all community hypotheses
 * POST - Create a new hypothesis (generates evidence_needed via Claude)
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import Anthropic from '@anthropic-ai/sdk';
import { sanitizeString, sanitizeText, sanitizeStringArray } from '@/lib/sanitize';
import { checkRateLimit, getClientId, RATE_LIMITS, rateLimitResponse } from '@/lib/rate-limit';
import type { CommunityHypothesis } from '@/types/database';

// GET - List all community hypotheses
export async function GET(request: Request) {
  const supabase = await createClient();

  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
  const offset = parseInt(searchParams.get('offset') || '0');
  const status = searchParams.get('status');

  // Use type assertion for table not in generated types yet
  let query = (supabase.from('aletheia_community_hypotheses') as ReturnType<typeof supabase.from>)
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error, count } = await query;

  if (error) {
    console.error('Error fetching hypotheses:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    data: (data || []) as CommunityHypothesis[],
    total: count || 0,
    limit,
    offset,
  });
}

// POST - Create a new hypothesis
export async function POST(request: Request) {
  // Rate limiting for AI generation
  const clientId = getClientId(request);
  const rateLimit = checkRateLimit(`ai:${clientId}`, RATE_LIMITS.AI_GENERATION);
  if (!rateLimit.success) {
    return rateLimitResponse(rateLimit);
  }

  const supabase = await createClient();

  // Check authentication
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get the Aletheia user
  const { data: aletheiaUser } = await supabase
    .from('aletheia_users')
    .select('id')
    .eq('auth_id', authUser.id)
    .single() as { data: { id: string } | null; error: unknown };

  if (!aletheiaUser) {
    return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
  }

  const userId = aletheiaUser.id;

  // Parse request body
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { title: rawTitle, hypothesis: rawHypothesis, domains_referenced: rawDomains, user_evidence: rawEvidence } = body;

  // Sanitize user inputs
  const title = sanitizeString(rawTitle);
  const hypothesis = sanitizeText(rawHypothesis);
  const domains_referenced = sanitizeStringArray(rawDomains);
  const user_evidence = rawEvidence ? sanitizeText(rawEvidence) : null;

  // Validate required fields
  if (!title || !hypothesis) {
    return NextResponse.json(
      { error: 'Title and hypothesis are required' },
      { status: 400 }
    );
  }

  if (!domains_referenced || domains_referenced.length === 0) {
    return NextResponse.json(
      { error: 'At least one domain is required' },
      { status: 400 }
    );
  }

  // Generate evidence_needed using Claude
  let evidenceNeeded: string | null = null;

  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });

      const domainsText = domains_referenced.join(', ');

      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: `You are a scientific research advisor for Project Aletheia, a platform studying anomalous phenomena with rigorous methodology.

A community member has submitted the following hypothesis:

**Title:** ${title}

**Hypothesis:** ${hypothesis}

**Domains involved:** ${domainsText}

${user_evidence ? `**Evidence they have:** ${user_evidence}` : ''}

Your task is to outline what specific evidence would be needed to make this hypothesis testable. Be concrete and actionable. Consider:

1. What measurable variables would need to be tracked?
2. What experimental design could isolate the proposed effect?
3. What baseline data is needed for comparison?
4. What controls would rule out alternative explanations?
5. What sample size or replication would be convincing?

Keep your response focused and practical (2-3 paragraphs). Write in second person ("you would need...").`,
          },
        ],
      });

      // Extract text from response
      const textContent = response.content.find((block) => block.type === 'text');
      if (textContent && textContent.type === 'text') {
        evidenceNeeded = textContent.text;
      }
    } catch (err) {
      console.error('Claude API error:', err);
      // Continue without evidence_needed if Claude fails
    }
  }

  // Insert the hypothesis - use type assertion for table not in generated types
  const { data, error } = await (supabase
    .from('aletheia_community_hypotheses') as ReturnType<typeof supabase.from>)
    .insert({
      user_id: userId,
      title,
      hypothesis,
      domains_referenced,
      evidence_needed: evidenceNeeded,
      status: 'speculative',
      upvotes: 0,
    } as never)
    .select()
    .single();

  if (error) {
    console.error('Error creating hypothesis:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: data as CommunityHypothesis }, { status: 201 });
}
