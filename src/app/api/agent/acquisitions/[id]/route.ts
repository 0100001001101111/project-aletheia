/**
 * Individual Acquisition Request API
 * GET /api/agent/acquisitions/[id] - Get single request
 * PATCH /api/agent/acquisitions/[id] - Update request (approve/reject)
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getAcquisitionRequest,
  approveRequest,
  rejectRequest,
} from '@/lib/agent/acquisition-manager';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;

    const acquisitionRequest = await getAcquisitionRequest(id);

    if (!acquisitionRequest) {
      return NextResponse.json(
        { error: 'Acquisition request not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(acquisitionRequest);
  } catch (error) {
    console.error('Acquisition request API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch request' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const { action, notes, reviewedBy } = body;

    // Verify request exists
    const existingRequest = await getAcquisitionRequest(id);
    if (!existingRequest) {
      return NextResponse.json(
        { error: 'Acquisition request not found' },
        { status: 404 }
      );
    }

    // Check if already processed
    if (existingRequest.status !== 'pending') {
      return NextResponse.json(
        { error: `Request already ${existingRequest.status}` },
        { status: 400 }
      );
    }

    // Process action
    switch (action) {
      case 'approve':
        await approveRequest(id, reviewedBy, notes);
        return NextResponse.json({
          success: true,
          message: 'Request approved',
          status: 'approved',
        });

      case 'reject':
        await rejectRequest(id, reviewedBy, notes);
        return NextResponse.json({
          success: true,
          message: 'Request rejected',
          status: 'rejected',
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use "approve" or "reject"' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Acquisition request update error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update request' },
      { status: 500 }
    );
  }
}
