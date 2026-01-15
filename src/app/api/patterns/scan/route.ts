/**
 * Pattern Scan API Route
 * Run full pattern detection scan
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase-server';
import {
  findCrossdomainPatterns,
  shouldGeneratePrediction,
  generatePrediction,
  type DetectedPattern,
  type Investigation,
} from '@/lib/pattern-matcher';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has permission (credibility score >= 50)
    const { data: profile } = await supabase
      .from('aletheia_users')
      .select('id, credibility_score')
      .eq('auth_id', user.id)
      .single() as { data: { id: string; credibility_score: number } | null };

    if (!profile || profile.credibility_score < 50) {
      return NextResponse.json(
        { error: 'Insufficient permissions to run pattern scan' },
        { status: 403 }
      );
    }

    // Get all qualified investigations
    const { data: investigations, error: fetchError } = await supabase
      .from('aletheia_investigations')
      .select('id, type, raw_data, triage_score, triage_status')
      .in('triage_status', ['verified', 'provisional']);

    if (fetchError) {
      console.error('Fetch error:', fetchError);
      return NextResponse.json(
        { error: `Failed to fetch investigations: ${fetchError.message}` },
        { status: 500 }
      );
    }

    if (!investigations || investigations.length < 10) {
      return NextResponse.json({
        success: true,
        message: 'Not enough qualified investigations for pattern detection',
        patterns_found: 0,
        predictions_generated: 0,
      });
    }

    // Run pattern detection
    const detectedPatterns = findCrossdomainPatterns(investigations as Investigation[]);

    // Get existing patterns to avoid duplicates
    const { data: existingPatterns } = await supabase
      .from('aletheia_pattern_matches')
      .select('variable, domains_matched') as { data: Array<{ variable: string; domains_matched: string[] }> | null };

    const existingKeys = new Set(
      (existingPatterns || []).map((p) => `${p.variable}-${(p.domains_matched || []).sort().join(',')}`)
    );

    // Filter to new patterns
    const newPatterns = detectedPatterns.filter((p) => {
      const key = `${p.variable}-${p.domains.sort().join(',')}`;
      return !existingKeys.has(key);
    });

    // Insert new patterns
    const insertedPatterns: DetectedPattern[] = [];
    const generatedPredictions: string[] = [];

    for (const pattern of newPatterns) {
      const { data: inserted, error: insertError } = await (supabase
        .from('aletheia_pattern_matches') as ReturnType<typeof supabase.from>)
        .insert({
          variable: pattern.variable,
          pattern_description: pattern.description,
          domains_matched: pattern.domains,
          correlations: pattern.correlations,
          prevalence_score: pattern.prevalence,
          reliability_score: pattern.reliability,
          volatility_score: pattern.volatility,
          confidence_score: pattern.confidenceScore,
          sample_size: pattern.sampleSize,
          detected_at: pattern.detectedAt,
        } as never)
        .select()
        .single() as { data: { id: string } | null; error: unknown };

      if (insertError || !inserted) {
        console.error('Insert pattern error:', insertError);
        continue;
      }

      insertedPatterns.push({ ...pattern, id: inserted.id });

      // Check if we should generate a prediction
      if (shouldGeneratePrediction(pattern)) {
        const prediction = generatePrediction(pattern);

        const { error: predError } = await (supabase
          .from('aletheia_predictions') as ReturnType<typeof supabase.from>)
          .insert({
            hypothesis: prediction.hypothesis,
            pattern_id: inserted.id,
            domains_involved: prediction.domains,
            confidence_score: prediction.confidenceScore,
            testing_protocol: prediction.testingProtocol,
            status: 'open',
          } as never);

        if (!predError) {
          generatedPredictions.push(prediction.hypothesis);
        }
      }
    }

    // Log scan activity
    await (supabase.from('aletheia_contributions') as ReturnType<typeof supabase.from>)
      .insert({
        user_id: profile.id,
        contribution_type: 'verification',
        details: {
          action: 'pattern_scan',
          patterns_found: newPatterns.length,
          predictions_generated: generatedPredictions.length,
        },
      } as never);

    return NextResponse.json({
      success: true,
      total_investigations_scanned: investigations.length,
      patterns_detected: detectedPatterns.length,
      new_patterns_found: newPatterns.length,
      predictions_generated: generatedPredictions.length,
      new_patterns: insertedPatterns.map((p) => ({
        id: p.id,
        variable: p.variable,
        description: p.description,
        confidence: p.confidenceScore,
      })),
      new_predictions: generatedPredictions,
    });
  } catch (error) {
    console.error('Pattern scan error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
