/**
 * Pattern Analysis API
 * Triggers pattern matching across investigations
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase-server';
import {
  findCrossdomainPatterns,
  shouldGeneratePrediction,
  generatePrediction,
  type Investigation,
} from '@/lib/pattern-matcher';

// POST /api/patterns/analyze - Trigger pattern analysis
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();

    const body = await request.json();
    const { investigationId, fullScan, adminKey } = body as {
      investigationId?: string;
      fullScan?: boolean;
      adminKey?: string;
    };

    // Check authentication - allow admin key bypass for CLI/scripts
    const isAdminBypass = adminKey === process.env.ADMIN_API_KEY;

    let userId: string | null = null;
    if (!isAdminBypass) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      userId = user.id;
    }

    // Fetch qualified investigations
    const { data: investigationsRaw, error: fetchError } = await supabase
      .from('aletheia_investigations')
      .select('id, investigation_type, raw_data, triage_score, triage_status')
      .in('triage_status', ['verified', 'provisional'])
      .limit(fullScan ? 10000 : 1000);

    if (fetchError) {
      console.error('Pattern analysis fetch error:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch investigations' }, { status: 500 });
    }

    // Define type for DB results
    type InvestigationRow = {
      id: string;
      investigation_type: string;
      raw_data: Record<string, unknown>;
      triage_score: number;
      triage_status: string;
    };

    // Map to Investigation type
    const investigations: Investigation[] = ((investigationsRaw as InvestigationRow[]) || []).map((inv) => ({
      id: inv.id,
      type: inv.investigation_type as Investigation['type'],
      raw_data: inv.raw_data,
      triage_score: inv.triage_score,
      triage_status: inv.triage_status,
    }));

    if (investigations.length < 10) {
      return NextResponse.json({
        message: 'Not enough qualified investigations for pattern analysis (minimum 10)',
        investigationCount: investigations.length,
        patterns: [],
        predictions: [],
      });
    }

    // Run pattern detection
    const patterns = findCrossdomainPatterns(investigations);

    // Save detected patterns to database
    const savedPatterns: string[] = [];
    const generatedPredictions: string[] = [];

    for (const pattern of patterns) {
      try {
        // Check if pattern already exists (by variable)
        const { data: existingRows } = await supabase
          .from('aletheia_pattern_matches')
          .select('id')
          .eq('variable', pattern.variable);

        const existing = existingRows && existingRows.length > 0 ? existingRows[0] as { id: string } : null;

      if (existing) {
        // Update existing pattern
        await (supabase
          .from('aletheia_pattern_matches') as ReturnType<typeof supabase.from>)
          .update({
            pattern_description: pattern.description,
            domains_matched: pattern.domains,
            confidence_score: pattern.confidenceScore,
            prevalence_score: pattern.prevalence,
            reliability_score: pattern.reliability,
            volatility_score: pattern.volatility,
            correlations: pattern.correlations,
            sample_size: pattern.sampleSize,
            detected_at: pattern.detectedAt,
            status: 'active',
          } as never)
          .eq('id', existing.id);
        savedPatterns.push(existing.id);
      } else {
        // Insert new pattern
        const { data: newPattern, error: insertError } = await (supabase
          .from('aletheia_pattern_matches') as ReturnType<typeof supabase.from>)
          .insert({
            variable: pattern.variable,
            pattern_description: pattern.description,
            domains_matched: pattern.domains,
            confidence_score: pattern.confidenceScore,
            prevalence_score: pattern.prevalence,
            reliability_score: pattern.reliability,
            volatility_score: pattern.volatility,
            correlations: pattern.correlations,
            sample_size: pattern.sampleSize,
            detected_at: pattern.detectedAt,
            status: 'active',
          } as never)
          .select('id')
          .single() as { data: { id: string } | null; error: { message: string } | null };

        if (insertError) {
          console.error('Pattern insert error:', insertError);
        }

        if (newPattern) {
          savedPatterns.push(newPattern.id);

          // Check if should generate prediction
          if (shouldGeneratePrediction(pattern)) {
            const prediction = generatePrediction(pattern);

            const { data: newPrediction } = await (supabase
              .from('aletheia_predictions') as ReturnType<typeof supabase.from>)
              .insert({
                pattern_id: newPattern.id,
                hypothesis: prediction.hypothesis,
                domains_involved: prediction.domains,
                confidence_score: prediction.confidenceScore,
                testing_protocol: prediction.testingProtocol,
                status: 'open',
              } as never)
              .select('id')
              .single() as { data: { id: string } | null };

            if (newPrediction) {
              generatedPredictions.push(newPrediction.id);
            }
          }
        }
      }
      } catch (patternError) {
        console.error('Error saving pattern:', pattern.variable, patternError);
      }
    }

    // Create audit log entry (skip if no user)
    if (userId) {
      await (supabase.from('aletheia_audit_log') as ReturnType<typeof supabase.from>)
        .insert({
          user_id: userId,
          action: 'pattern_analysis',
          details: {
            investigationCount: investigations.length,
            patternsFound: patterns.length,
            patternsSaved: savedPatterns.length,
            predictionsGenerated: generatedPredictions.length,
            triggeredBy: investigationId ? `submission:${investigationId}` : 'manual',
          },
        } as never);
    }

    return NextResponse.json({
      success: true,
      investigationCount: investigations.length,
      patternsFound: patterns.length,
      patternsSaved: savedPatterns,
      predictionsGenerated: generatedPredictions,
      patterns: patterns.map((p) => ({
        variable: p.variable,
        description: p.description,
        domains: p.domains,
        confidenceScore: p.confidenceScore,
        sampleSize: p.sampleSize,
      })),
    });
  } catch (error) {
    console.error('Pattern analysis error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET /api/patterns/analyze - Get analysis stats
export async function GET() {
  try {
    const supabase = await createServerClient();

    // Get investigation counts by domain
    const { data: counts } = await supabase
      .from('aletheia_investigations')
      .select('investigation_type, triage_status')
      .in('triage_status', ['verified', 'provisional']) as {
        data: Array<{ investigation_type: string; triage_status: string }> | null
      };

    const byDomain: Record<string, number> = {};
    for (const inv of counts || []) {
      const type = inv.investigation_type;
      byDomain[type] = (byDomain[type] || 0) + 1;
    }

    // Get pattern count
    const { count: patternCount } = await supabase
      .from('aletheia_pattern_matches')
      .select('*', { count: 'exact', head: true });

    // Get prediction count
    const { count: predictionCount } = await supabase
      .from('aletheia_predictions')
      .select('*', { count: 'exact', head: true });

    return NextResponse.json({
      qualifiedInvestigations: Object.values(byDomain).reduce((a, b) => a + b, 0),
      byDomain,
      patterns: patternCount || 0,
      predictions: predictionCount || 0,
      minimumRequired: 10,
      canAnalyze: Object.values(byDomain).reduce((a, b) => a + b, 0) >= 10,
    });
  } catch (error) {
    console.error('Pattern stats error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
