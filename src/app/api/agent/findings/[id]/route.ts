/**
 * Agent Finding Detail API
 * GET /api/agent/findings/[id] - Get full finding details
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { createAgentReadClient } from '@/lib/agent/supabase-admin';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id } = await params;
    const agentClient = createAgentReadClient();

    // Get the finding with related hypothesis
    const { data: finding, error } = await agentClient
      .from('aletheia_agent_findings')
      .select(`
        *,
        hypothesis:aletheia_agent_hypotheses(
          id,
          hypothesis_text,
          display_title,
          domains,
          source_pattern,
          confidence,
          status
        ),
        session:aletheia_agent_sessions(
          id,
          started_at,
          ended_at,
          status,
          hypotheses_generated,
          tests_run,
          findings_queued
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching finding:', error);
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Finding not found' },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: 'Failed to fetch finding' },
        { status: 500 }
      );
    }

    // Extract structured data from technical_details
    const technicalDetails = finding.technical_details as {
      test_results?: Array<{
        test_type: string;
        statistic: number;
        p_value: number;
        effect_size: number;
        sample_size: number;
        passed_threshold: boolean;
        interpretation: string;
      }>;
      confound_checks?: Array<{
        confound_type: string;
        controlled: boolean;
        effect_survived: boolean;
        notes: string;
        stratified_results?: Record<string, unknown>;
      }>;
      holdout_validation?: {
        test_type: string;
        statistic: number;
        p_value: number;
        effect_size: number;
        sample_size: number;
        passed_threshold: boolean;
        interpretation: string;
      };
    } | null;

    // Get hypothesis domains
    const hypothesis = finding.hypothesis as {
      id: string;
      hypothesis_text: string;
      display_title: string;
      domains: string[];
      source_pattern: Record<string, unknown>;
      confidence: number;
      status: string;
    } | null;

    return NextResponse.json({
      finding: {
        ...finding,
        domains: hypothesis?.domains || [],
        test_results: technicalDetails?.test_results || [],
        confound_checks: technicalDetails?.confound_checks || [],
        holdout_validation: technicalDetails?.holdout_validation || null,
        source_pattern: hypothesis?.source_pattern || null,
      },
    });
  } catch (error) {
    console.error('Finding detail error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch finding' },
      { status: 500 }
    );
  }
}
