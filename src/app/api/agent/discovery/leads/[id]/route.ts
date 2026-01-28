/**
 * Discovery Lead Detail API
 * GET /api/agent/discovery/leads/[id] - Get lead details
 * PATCH /api/agent/discovery/leads/[id] - Update lead status
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDiscoveryLead, updateLeadStatus, createHandoff } from '@/lib/agent/discovery-manager';
import { createAcquisitionRequest } from '@/lib/agent/acquisition-manager';
import type { LeadStatus, DataGap } from '@/lib/agent/types';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    const lead = await getDiscoveryLead(id);

    if (!lead) {
      return NextResponse.json(
        { error: 'Lead not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(lead);
  } catch (error) {
    console.error('Error fetching lead:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch lead' },
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
    const { action, notes } = body;

    const lead = await getDiscoveryLead(id);
    if (!lead) {
      return NextResponse.json(
        { error: 'Lead not found' },
        { status: 404 }
      );
    }

    let newStatus: LeadStatus;
    let message: string;

    switch (action) {
      case 'approve': {
        newStatus = 'approved';
        message = 'Lead approved';

        // If it's a paper/dataset lead, create acquisition request
        if (['paper', 'dataset', 'document', 'archive'].includes(lead.lead_type)) {
          const gap: DataGap = {
            type: 'domain',
            description: lead.description || lead.title,
            domain: lead.domains?.[0],
            severity: lead.priority === 'urgent' ? 'critical' : lead.priority === 'high' ? 'moderate' : 'minor',
            details: {},
          };

          await createAcquisitionRequest(
            gap,
            {
              name: lead.title,
              url: lead.source_url || '',
              type: 'scrape',
              domain: lead.domains?.[0] || 'unknown',
              coverage: {},
              estimated_records: 0,
              quality_estimate: lead.quality_score && lead.quality_score >= 70 ? 'high' : lead.quality_score && lead.quality_score >= 50 ? 'medium' : 'low',
              quality_reasoning: lead.quality_signals?.join(', ') || '',
              access_method: 'Web scraping (needs verification)',
            },
            lead.session_id
          );
          message = 'Lead approved and queued for acquisition';
        }

        // If it's a connection lead, hand off to Research Agent
        if (lead.lead_type === 'connection' && lead.potential_hypothesis) {
          await createHandoff({
            from_agent: 'discovery',
            to_agent: 'research',
            handoff_type: 'hypothesis',
            payload: {
              hypothesis: lead.potential_hypothesis,
              connection: lead.connection_sources,
              lead_id: lead.id,
            },
            status: 'pending',
          });
          message = 'Lead approved and hypothesis sent to Research Agent';
        }
        break;
      }

      case 'reject':
        newStatus = 'rejected';
        message = 'Lead rejected';
        break;

      case 'investigate':
        newStatus = 'investigating';
        message = 'Lead marked for investigation';
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: approve, reject, or investigate' },
          { status: 400 }
        );
    }

    await updateLeadStatus(id, newStatus, notes);

    return NextResponse.json({
      success: true,
      message,
      newStatus,
    });
  } catch (error) {
    console.error('Error updating lead:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update lead' },
      { status: 500 }
    );
  }
}
