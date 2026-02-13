/**
 * Execute Acquisition API
 * POST /api/agent/acquisitions/[id]/execute - Execute an approved acquisition
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getAcquisitionRequest,
  markInProgress,
  markCompleted,
  markFailed,
} from '@/lib/agent/acquisition-manager';
import { executeExtraction, formatExtractionResult } from '@/lib/agent/data-extractor';
import { createClient } from '@/lib/supabase-server';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id } = await context.params;

    // Get the acquisition request
    const acquisitionRequest = await getAcquisitionRequest(id);

    if (!acquisitionRequest) {
      return NextResponse.json(
        { error: 'Acquisition request not found' },
        { status: 404 }
      );
    }

    // Verify it's approved
    if (acquisitionRequest.status !== 'approved') {
      return NextResponse.json(
        { error: `Cannot execute request with status: ${acquisitionRequest.status}. Must be approved.` },
        { status: 400 }
      );
    }

    // Mark as in progress
    await markInProgress(id);

    // Execute the extraction
    const result = await executeExtraction(acquisitionRequest);

    // Update status based on result
    if (result.records_ingested > 0 || result.errors.length === 0) {
      await markCompleted(id, result);

      return NextResponse.json({
        success: true,
        message: 'Acquisition completed',
        result: {
          records_found: result.records_found,
          records_valid: result.records_valid,
          records_duplicate: result.records_duplicate,
          records_ingested: result.records_ingested,
          errors: result.errors,
          sample_records: result.sample_records,
        },
        summary: formatExtractionResult(result),
      });
    } else {
      const errorLog = result.errors.join('\n');
      await markFailed(id, errorLog);

      return NextResponse.json({
        success: false,
        message: 'Acquisition failed',
        errors: result.errors,
      });
    }
  } catch (error) {
    console.error('Execute acquisition error:', error);

    // Try to mark as failed
    try {
      const { id } = await context.params;
      await markFailed(id, error instanceof Error ? error.message : 'Unknown error');
    } catch {
      // Ignore secondary errors
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to execute acquisition' },
      { status: 500 }
    );
  }
}
