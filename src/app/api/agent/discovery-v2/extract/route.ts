/**
 * Discovery Agent v2 - Paper Extraction API
 * POST: Extract structured info from a paper
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  extractFromPaper,
  savePaperExtraction,
} from '@/lib/agent/discovery-v2/paper-extractor';
import type { PaperExtraction, ExtractionPrompt } from '@/lib/agent/discovery-v2/types';
import { createClient } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { title, abstract, full_text, url, lead_id, authors, doi, publication, publication_date } = body;

    if (!title) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      );
    }

    // Build extraction prompt
    const prompt: ExtractionPrompt = {
      title,
      abstract,
      full_text,
      url,
    };

    // Extract using Claude
    const extraction = await extractFromPaper(prompt);

    if (!extraction) {
      return NextResponse.json(
        { error: 'Failed to extract from paper' },
        { status: 500 }
      );
    }

    // Build full paper extraction record
    const paperExtraction: PaperExtraction = {
      lead_id,
      title,
      authors: authors || [],
      doi,
      publication,
      publication_date,
      url,
      sample_size: extraction.sample_size ?? undefined,
      methodology: extraction.methodology,
      population: extraction.population,
      statistics: extraction.statistics || [],
      correlations: extraction.correlations || [],
      comparisons_made: [],
      limitations: extraction.limitations || [],
      key_findings: extraction.key_findings || [],
      testable_with_aletheia: extraction.testable_with_aletheia || false,
      test_requirements: extraction.test_requirements,
      extraction_method: 'ai',
      extraction_confidence: 0.8,
    };

    // Save to database
    const id = await savePaperExtraction(paperExtraction);

    if (!id) {
      return NextResponse.json(
        { error: 'Failed to save extraction' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      id,
      extraction: paperExtraction,
    });
  } catch (error) {
    console.error('Paper extraction API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
