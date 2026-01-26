/**
 * Publish Report API
 * POST /api/agent/reports/[slug]/publish - Publish a draft report
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase-server';
import { createAgentReadClient } from '@/lib/agent/supabase-admin';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const supabase = await createServerClient();

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use admin client for the update
    const adminClient = createAgentReadClient();

    // Find the report (by slug or ID)
    let report;
    const { data: bySlug } = await adminClient
      .from('aletheia_agent_reports')
      .select('id, status')
      .eq('slug', slug)
      .single();

    if (bySlug) {
      report = bySlug;
    } else {
      // Try by ID
      const { data: byId } = await adminClient
        .from('aletheia_agent_reports')
        .select('id, status')
        .eq('id', slug)
        .single();
      report = byId;
    }

    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    if (report.status === 'published') {
      return NextResponse.json(
        { error: 'Report is already published' },
        { status: 400 }
      );
    }

    // Publish the report
    const { error: updateError } = await adminClient
      .from('aletheia_agent_reports')
      .update({
        status: 'published',
        published_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', report.id);

    if (updateError) {
      console.error('Error publishing report:', updateError);
      return NextResponse.json(
        { error: 'Failed to publish report' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Report published successfully',
    });
  } catch (error) {
    console.error('Publish report error:', error);
    return NextResponse.json(
      { error: 'Failed to publish report' },
      { status: 500 }
    );
  }
}
