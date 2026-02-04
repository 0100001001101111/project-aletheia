/**
 * Discovery Agent v2 - Replication Tracking API
 * GET: List replication entries
 * POST: Add a replication attempt
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getReplicationEntries,
  getReplicationEntry,
  addReplicationAttempt,
  addAletheiaReplication,
} from '@/lib/agent/discovery-v2/replication-tracker';
import type { ReplicationAttempt, AletheiaReplication } from '@/lib/agent/discovery-v2/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const domain = searchParams.get('domain') || undefined;
    const status = searchParams.get('status') || undefined;
    const limit = parseInt(searchParams.get('limit') || '50');

    // Get single entry by ID
    if (id) {
      const entry = await getReplicationEntry(id);
      if (!entry) {
        return NextResponse.json(
          { error: 'Replication entry not found' },
          { status: 404 }
        );
      }
      return NextResponse.json({ entry });
    }

    // Get entries with filters
    const entries = await getReplicationEntries({ domain, status, limit });
    return NextResponse.json({ entries });
  } catch (error) {
    console.error('Replication tracking API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tracking_id, type, attempt } = body;

    if (!tracking_id || !type) {
      return NextResponse.json(
        { error: 'tracking_id and type are required' },
        { status: 400 }
      );
    }

    // Add external replication attempt
    if (type === 'external') {
      const replicationAttempt: ReplicationAttempt = {
        paper: attempt.paper,
        citation: attempt.citation,
        n: attempt.n,
        effect: attempt.effect,
        successful: attempt.successful,
        notes: attempt.notes,
      };

      const success = await addReplicationAttempt(tracking_id, replicationAttempt);

      if (!success) {
        return NextResponse.json(
          { error: 'Failed to add replication attempt' },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true });
    }

    // Add Aletheia's own replication
    if (type === 'aletheia') {
      const aletheiaReplication: AletheiaReplication = {
        n: attempt.n,
        effect: attempt.effect,
        replicated: attempt.successful,
        notes: attempt.notes,
      };

      const success = await addAletheiaReplication(tracking_id, aletheiaReplication);

      if (!success) {
        return NextResponse.json(
          { error: 'Failed to add Aletheia replication' },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { error: 'Invalid type. Must be "external" or "aletheia"' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Replication tracking API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
