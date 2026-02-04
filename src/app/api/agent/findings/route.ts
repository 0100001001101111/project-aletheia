/**
 * Agent Findings API
 * GET /api/agent/findings - List findings with filters
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAgentReadClient } from '@/lib/agent/supabase-admin';

// Strip markdown syntax from text for clean preview display
function stripMarkdown(text: string): string {
  if (!text) return '';
  return text
    .replace(/^#{1,6}\s+/gm, '') // Remove # ## ### etc heading markers
    .replace(/\*\*([^*]+)\*\*/g, '$1') // Remove **bold**
    .replace(/\*([^*]+)\*/g, '$1') // Remove *italic*
    .replace(/__([^_]+)__/g, '$1') // Remove __bold__
    .replace(/_([^_]+)_/g, '$1') // Remove _italic_
    .replace(/^[-*+]\s+/gm, '') // Remove list markers (- * +)
    .replace(/^[-*_]{3,}\s*$/gm, '') // Remove horizontal rules (--- *** ___)
    .replace(/^\s*-\s*\[[x ]\]\s*/gmi, '') // Remove checkboxes (- [ ] - [x])
    .replace(/^\d+\.\s+/gm, '') // Remove numbered list markers
    .replace(/`{1,3}[^`]*`{1,3}/g, '') // Remove inline and block code
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove links, keep text
    .replace(/^>\s+/gm, '') // Remove blockquotes
    .replace(/[\uD83C-\uDBFF\uDC00-\uDFFF]+/g, '') // Remove emojis (surrogate pairs)
    .replace(/\s{2,}/g, ' ') // Collapse multiple spaces
    .replace(/\n{2,}/g, '\n') // Collapse multiple newlines
    .trim();
}

// Clean preview text: skip preamble that restates the title
function cleanPreview(summary: string, title: string): string {
  if (!summary) return '';
  const stripped = stripMarkdown(summary);
  // If preview starts with "Analysis found..." skip to next meaningful line
  const lines = stripped.split('\n').filter(l => l.trim());
  if (lines.length > 1 && lines[0].toLowerCase().includes('analysis found')) {
    return lines.slice(1).join(' ').substring(0, 300);
  }
  return stripped.substring(0, 300);
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createAgentReadClient();
    const { searchParams } = new URL(request.url);

    // Get filter params
    const status = searchParams.get('status'); // pending, approved, rejected, needs_info
    const agentId = searchParams.get('agent_id'); // filter by specific agent
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build query
    let query = supabase
      .from('aletheia_agent_findings')
      .select(`
        id,
        hypothesis_id,
        session_id,
        title,
        display_title,
        summary,
        confidence,
        review_status,
        destination_status,
        rejection_reason,
        reviewed_by,
        reviewed_at,
        review_notes,
        created_prediction_id,
        created_at,
        technical_details,
        agent_id
      `)
      .order('created_at', { ascending: false });

    // Apply agent_id filter if specified
    if (agentId) {
      query = query.eq('agent_id', agentId);
    }

    // Apply status filter - map 'approved' to destination_status='published'
    if (status && status !== 'all') {
      if (status === 'approved') {
        query = query.eq('destination_status', 'published');
      } else if (status === 'rejected') {
        query = query.eq('destination_status', 'rejected');
      } else {
        query = query.eq('review_status', status);
      }
    } else if (!status || status === 'all') {
      // By default, exclude rejected findings from the public feed
      query = query.neq('destination_status', 'rejected');
    }

    const { data: rawFindings, error } = await query;

    if (error) {
      console.error('Error fetching findings:', error);
      return NextResponse.json(
        { error: 'Failed to fetch findings' },
        { status: 500 }
      );
    }

    // Deduplicate by title - keep highest confidence or most recent
    const seen = new Map<string, typeof rawFindings[0]>();
    for (const f of rawFindings || []) {
      const existing = seen.get(f.title);
      if (!existing || (f.confidence || 0) > (existing.confidence || 0)) {
        seen.set(f.title, f);
      }
    }
    const dedupedFindings = Array.from(seen.values())
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(offset, offset + limit);

    // Get counts - use destination_status for approved count
    let countsQuery = supabase
      .from('aletheia_agent_findings')
      .select('review_status, destination_status, title, agent_id');

    // Apply same agent_id filter to counts
    if (agentId) {
      countsQuery = countsQuery.eq('agent_id', agentId);
    }

    const { data: allFindings } = await countsQuery;

    // Dedupe for counting too
    interface FindingForCount {
      review_status: string | null;
      destination_status: string | null;
      title: string;
      agent_id: string | null;
    }
    const uniqueForCounts = new Map<string, FindingForCount>();
    for (const f of (allFindings || []) as FindingForCount[]) {
      if (!uniqueForCounts.has(f.title)) {
        uniqueForCounts.set(f.title, f);
      }
    }
    const uniqueFindings = Array.from(uniqueForCounts.values());

    const counts = {
      total: uniqueFindings.length,
      pending: uniqueFindings.filter(f => f.destination_status === 'pending').length,
      approved: uniqueFindings.filter(f => f.destination_status === 'published').length,
      rejected: uniqueFindings.filter(f => f.destination_status === 'rejected').length,
      needs_info: uniqueFindings.filter(f => f.review_status === 'needs_info').length,
    };

    // Extract domains and clean preview text for each finding
    const findingsWithDomains = dedupedFindings.map(f => {
      const details = f.technical_details as Record<string, unknown> | null;
      let domains: string[] = [];

      // Try to extract domains from the test results or source pattern
      if (details?.test_results) {
        const testResults = details.test_results as Array<{ domains?: string[] }>;
        if (testResults[0]?.domains) {
          domains = testResults[0].domains;
        }
      }

      return {
        ...f,
        summary: cleanPreview(f.summary || '', f.title),
        domains,
      };
    });

    return NextResponse.json({
      findings: findingsWithDomains,
      counts,
      pagination: {
        limit,
        offset,
        hasMore: dedupedFindings.length === limit,
      },
    });
  } catch (error) {
    console.error('Findings list error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch findings' },
      { status: 500 }
    );
  }
}
