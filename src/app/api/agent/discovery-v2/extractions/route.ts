/**
 * Discovery Agent v2 - Paper Extractions API
 * GET: List paper extractions
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getPaperExtractionsByDomain,
  getPaperExtractionById,
} from '@/lib/agent/discovery-v2/paper-extractor';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const domain = searchParams.get('domain');
    const id = searchParams.get('id');
    const limit = parseInt(searchParams.get('limit') || '50');

    // Get single extraction by ID
    if (id) {
      const extraction = await getPaperExtractionById(id);
      if (!extraction) {
        return NextResponse.json(
          { error: 'Extraction not found' },
          { status: 404 }
        );
      }
      return NextResponse.json({ extraction });
    }

    // Get extractions by domain
    if (domain) {
      const extractions = await getPaperExtractionsByDomain(domain, limit);
      return NextResponse.json({ extractions });
    }

    // Return error if no filter specified
    return NextResponse.json(
      { error: 'Must specify domain or id parameter' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Paper extractions API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
