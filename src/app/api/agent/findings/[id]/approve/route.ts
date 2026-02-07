/**
 * Approve Finding API
 * POST /api/agent/findings/[id]/approve
 * Creates a prediction from the approved finding
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase-server';

// Type for agent finding with hypothesis join
interface FindingWithHypothesis {
  id: string;
  title: string;
  display_title: string;
  confidence: number | null;
  review_status: string | null;
  suggested_prediction: string | null;
  hypothesis: {
    hypothesis_text: string;
    display_title: string;
    domains: string[];
  } | null;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServerClient();

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile (cast to any for untyped table)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: rawProfile } = await (supabase as any)
      .from('aletheia_users')
      .select('id')
      .eq('auth_id', user.id)
      .single();

    const profile = rawProfile as { id: string } | null;

    if (!profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    // Get the finding (cast to any for untyped table)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: rawFinding, error: findingError } = await (supabase as any)
      .from('aletheia_agent_findings')
      .select(`
        *,
        hypothesis:aletheia_agent_hypotheses(
          id,
          hypothesis_text,
          display_title,
          domains
        )
      `)
      .eq('id', id)
      .single();

    const finding = rawFinding as FindingWithHypothesis | null;

    if (findingError || !finding) {
      return NextResponse.json({ error: 'Finding not found' }, { status: 404 });
    }

    if (finding.review_status === 'approved') {
      return NextResponse.json({ error: 'Finding already approved' }, { status: 400 });
    }

    // Parse request body
    const body = await request.json();
    const {
      prediction_title,
      prediction_hypothesis,
      prediction_protocol,
    } = body as {
      prediction_title?: string;
      prediction_hypothesis?: string;
      prediction_protocol?: string;
    };

    // Get hypothesis data
    const hypothesis = finding.hypothesis;

    // Create the prediction (cast to any for untyped columns)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: prediction, error: predictionError } = await (supabase as any)
      .from('aletheia_predictions')
      .insert({
        hypothesis: prediction_hypothesis || finding.title,
        explainer: prediction_title || finding.display_title,
        confidence_score: finding.confidence || 0.5,
        status: 'testing',
        source_investigations: [],
        domains_involved: hypothesis?.domains || [],
        testing_protocol: prediction_protocol || finding.suggested_prediction || 'Pending community testing protocol',
        source: 'agent',
        agent_finding_id: id,
        created_by: profile.id,
        tier: 'exploratory',
      })
      .select('id')
      .single();

    if (predictionError) {
      console.error('Error creating prediction:', predictionError);
      return NextResponse.json(
        { error: 'Failed to create prediction' },
        { status: 500 }
      );
    }

    // Update the finding
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateError } = await (supabase as any)
      .from('aletheia_agent_findings')
      .update({
        review_status: 'approved',
        destination_status: 'published',
        reviewed_by: profile.id,
        reviewed_at: new Date().toISOString(),
        created_prediction_id: prediction.id,
      })
      .eq('id', id);

    if (updateError) {
      console.error('Error updating finding:', updateError);
      // Try to clean up the prediction
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from('aletheia_predictions').delete().eq('id', prediction.id);
      return NextResponse.json(
        { error: 'Failed to update finding status' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      prediction_id: prediction.id,
      message: 'Finding approved and prediction created',
    });
  } catch (error) {
    console.error('Approve finding error:', error);
    return NextResponse.json(
      { error: 'Failed to approve finding' },
      { status: 500 }
    );
  }
}
