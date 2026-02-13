/**
 * Discovery Agent v2 - Literature Synthesis API
 * POST: Create a literature synthesis from paper extractions
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  synthesizeLiterature,
  saveLiteratureSynthesis,
} from '@/lib/agent/discovery-v2/literature-synthesis';
import { getPaperExtractionsByDomain } from '@/lib/agent/discovery-v2/paper-extractor';
import { createEntriesFromPapers } from '@/lib/agent/discovery-v2/replication-tracker';
import { createClient } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { topic, domain, paper_ids } = body;

    if (!topic || !domain) {
      return NextResponse.json(
        { error: 'Topic and domain are required' },
        { status: 400 }
      );
    }

    // Get paper extractions for this domain
    const allExtractions = await getPaperExtractionsByDomain(domain, 100);

    // Filter to specific papers if IDs provided
    const papers = paper_ids && paper_ids.length > 0
      ? allExtractions.filter(p => paper_ids.includes(p.id))
      : allExtractions;

    if (papers.length < 2) {
      return NextResponse.json(
        { error: 'Need at least 2 papers for synthesis' },
        { status: 400 }
      );
    }

    // Generate synthesis
    const synthesis = await synthesizeLiterature(topic, domain, papers);

    if (!synthesis) {
      return NextResponse.json(
        { error: 'Failed to generate synthesis' },
        { status: 500 }
      );
    }

    // Save synthesis
    const id = await saveLiteratureSynthesis(synthesis);

    if (!id) {
      return NextResponse.json(
        { error: 'Failed to save synthesis' },
        { status: 500 }
      );
    }

    // Also create replication tracking entries from these papers
    const replicationEntriesCreated = await createEntriesFromPapers(papers);

    return NextResponse.json({
      success: true,
      id,
      synthesis,
      replication_entries_created: replicationEntriesCreated,
    });
  } catch (error) {
    console.error('Literature synthesis API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
