/**
 * Aletheia Research Agent - Finding Generator
 * Phase 2: Analysis Engine
 *
 * When a hypothesis:
 * - Passes statistical threshold (p < 0.01, effect > 0.3)
 * - Survives confound checks
 * - Replicates on holdout
 *
 * Generate and save a finding for human review
 */

import Anthropic from '@anthropic-ai/sdk';
import { createAgentReadClient } from './supabase-admin';
import type {
  FindingData,
  GeneratedHypothesis,
  TestResult,
  ConfoundCheckResult,
  AgentFinding,
} from './types';

// ============================================
// Claude API Client
// ============================================

let anthropicClient: Anthropic | null = null;

function getAnthropicClient(): Anthropic {
  if (!anthropicClient) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable is required');
    }
    anthropicClient = new Anthropic({ apiKey });
  }
  return anthropicClient;
}

// ============================================
// Confidence Calculation
// ============================================

/**
 * Calculate composite confidence score for a finding
 * Based on:
 * - Statistical significance (p-value)
 * - Effect size
 * - Confound check survival rate
 * - Holdout replication
 */
export function calculateConfidence(
  trainingResult: TestResult,
  holdoutResult: TestResult,
  confoundChecks: ConfoundCheckResult[]
): number {
  // Base: effect size (0-1, capped at 0.8 to leave room for interpretation)
  // Effect sizes above 0.5 are very large in social science
  const effectScore = Math.min(0.8, trainingResult.effect_size * 0.8);

  // P-value contribution (stronger signal = lower p-value)
  // Use sigmoid-like transformation: p=0.05 → 0.5, p=0.001 → 0.8, p=0.0001 → 0.9
  const pValue = Math.max(trainingResult.p_value, 1e-10);
  const pScore = pValue < 0.05
    ? 0.5 + 0.4 * (1 - pValue / 0.05) // 0.05 → 0.5, approaching 0.9 at p→0
    : 0.3 * (1 - Math.min(1, (pValue - 0.05) / 0.45)); // Above 0.05, drops toward 0

  // Confound survival rate (penalize heavily if confounds explain the effect)
  const controlledChecks = confoundChecks.filter((c) => c.controlled);
  const survivedChecks = controlledChecks.filter((c) => c.effect_survived);
  const confoundScore =
    controlledChecks.length > 0
      ? survivedChecks.length / controlledChecks.length
      : 0.3; // No checks = low confidence, not neutral

  // Holdout replication (critical - if doesn't replicate, major penalty)
  const holdoutScore = holdoutResult.passed_threshold ? 0.8 : 0.2;

  // Sample size bonus (capped lower)
  const sampleBonus = Math.min(0.1, trainingResult.sample_size / 50000);

  // Weighted combination - max possible now ~0.75 instead of 1.0+
  const confidence =
    effectScore * 0.25 +
    pScore * 0.25 +
    confoundScore * 0.25 +
    holdoutScore * 0.25;

  // Add small sample bonus but cap total at 0.85 (leave room for skepticism)
  return Math.min(0.85, Math.max(0.1, confidence + sampleBonus));
}

// ============================================
// Finding Generation
// ============================================

/**
 * Generate a finding from a validated hypothesis
 * Falls back to template-based generation if API key not available
 */
export async function generateFinding(
  hypothesis: GeneratedHypothesis,
  trainingResult: TestResult,
  holdoutResult: TestResult,
  confoundChecks: ConfoundCheckResult[]
): Promise<FindingData> {
  const confidence = calculateConfidence(trainingResult, holdoutResult, confoundChecks);

  // Use fallback if no API key
  if (!process.env.ANTHROPIC_API_KEY) {
    console.log('No ANTHROPIC_API_KEY - using fallback finding generator');
    return createFallbackFinding(hypothesis, trainingResult, holdoutResult, confoundChecks, confidence);
  }

  // Generate summary and prediction using Claude
  const client = getAnthropicClient();

  const prompt = buildFindingPrompt(
    hypothesis,
    trainingResult,
    holdoutResult,
    confoundChecks,
    confidence
  );

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      return createFallbackFinding(
        hypothesis,
        trainingResult,
        holdoutResult,
        confoundChecks,
        confidence
      );
    }

    return parseFindingResponse(
      content.text,
      hypothesis,
      trainingResult,
      holdoutResult,
      confoundChecks,
      confidence
    );
  } catch (error) {
    console.error('Error generating finding with Claude:', error);
    return createFallbackFinding(
      hypothesis,
      trainingResult,
      holdoutResult,
      confoundChecks,
      confidence
    );
  }
}

/**
 * Build prompt for finding generation
 */
function buildFindingPrompt(
  hypothesis: GeneratedHypothesis,
  trainingResult: TestResult,
  holdoutResult: TestResult,
  confoundChecks: ConfoundCheckResult[],
  confidence: number
): string {
  const confoundSummary = confoundChecks
    .map((c) => `- ${c.confound_type}: ${c.effect_survived ? 'PASSED' : 'FAILED'} - ${c.notes}`)
    .join('\n');

  return `You are a research scientist writing up a finding from an automated anomaly research system.

HYPOTHESIS:
${hypothesis.hypothesis_text}

DISPLAY TITLE: ${hypothesis.display_title}

DOMAINS INVOLVED: ${hypothesis.domains.join(', ')}

TRAINING SET RESULTS:
- Test: ${trainingResult.test_type}
- p-value: ${trainingResult.p_value.toFixed(6)}
- Effect size: ${trainingResult.effect_size.toFixed(3)}
- Sample size: ${trainingResult.sample_size}
- ${trainingResult.interpretation}

HOLDOUT VALIDATION:
- p-value: ${holdoutResult.p_value.toFixed(6)}
- Effect size: ${holdoutResult.effect_size.toFixed(3)}
- ${holdoutResult.interpretation}

CONFOUND CHECKS:
${confoundSummary}

CONFIDENCE SCORE: ${(confidence * 100).toFixed(0)}%

Write a finding summary and suggest a falsifiable prediction. Response must be in this exact JSON format:

{
  "title": "Technical title for the finding",
  "display_title": "Plain English title that a layperson would understand",
  "summary": "2-3 paragraph summary explaining the finding, its significance, and caveats",
  "suggested_prediction": "A specific, falsifiable prediction that would further validate this finding if true"
}

GUIDELINES:
- Be scientifically accurate and conservative
- Acknowledge limitations and potential alternative explanations
- The prediction should be testable with future data
- Keep summary under 300 words
- Don't overstate significance

Respond ONLY with the JSON object, no other text.`;
}

/**
 * Parse Claude's response into FindingData
 */
function parseFindingResponse(
  responseText: string,
  hypothesis: GeneratedHypothesis,
  trainingResult: TestResult,
  holdoutResult: TestResult,
  confoundChecks: ConfoundCheckResult[],
  confidence: number
): FindingData {
  try {
    // Extract JSON from response
    let jsonStr = responseText.trim();
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
    }

    const parsed = JSON.parse(jsonStr);

    return {
      title: parsed.title || hypothesis.hypothesis_text,
      display_title: parsed.display_title || hypothesis.display_title,
      summary: parsed.summary || 'Finding summary not available',
      technical_details: {
        test_results: [trainingResult],
        confound_checks: confoundChecks,
        holdout_validation: holdoutResult,
      },
      confidence,
      suggested_prediction: parsed.suggested_prediction || 'No prediction suggested',
    };
  } catch (error) {
    console.error('Error parsing finding response:', error);
    return createFallbackFinding(
      hypothesis,
      trainingResult,
      holdoutResult,
      confoundChecks,
      confidence
    );
  }
}

/**
 * Create fallback finding when Claude API fails
 */
function createFallbackFinding(
  hypothesis: GeneratedHypothesis,
  trainingResult: TestResult,
  holdoutResult: TestResult,
  confoundChecks: ConfoundCheckResult[],
  confidence: number
): FindingData {
  const survivedChecks = confoundChecks.filter((c) => c.controlled && c.effect_survived);

  return {
    title: hypothesis.hypothesis_text,
    display_title: hypothesis.display_title,
    summary: `Analysis found a statistically significant pattern: ${hypothesis.display_title}

The hypothesis "${hypothesis.hypothesis_text}" was tested using a ${trainingResult.test_type} with a sample of ${trainingResult.sample_size} records. The training set showed significant results (p=${trainingResult.p_value.toFixed(4)}, effect size=${trainingResult.effect_size.toFixed(3)}).

The finding was validated on a holdout set (p=${holdoutResult.p_value.toFixed(4)}) and survived ${survivedChecks.length} of ${confoundChecks.filter((c) => c.controlled).length} confound checks. Overall confidence: ${(confidence * 100).toFixed(0)}%.

This finding warrants further investigation but should be interpreted with caution given the exploratory nature of the analysis.`,
    technical_details: {
      test_results: [trainingResult],
      confound_checks: confoundChecks,
      holdout_validation: holdoutResult,
    },
    confidence,
    suggested_prediction: `Future ${hypothesis.domains[0]} investigations in high-activity geographic cells will show ${
      confidence > 0.6 ? 'elevated' : 'similar'
    } rates of the observed pattern.`,
  };
}

// ============================================
// Database Operations
// ============================================

/**
 * Save a finding to the database
 */
export async function saveFinding(
  finding: FindingData,
  hypothesisId: string | null,
  sessionId: string
): Promise<string> {
  const supabase = createAgentReadClient();

  const { data, error } = await supabase
    .from('aletheia_agent_findings')
    .insert({
      hypothesis_id: hypothesisId,
      session_id: sessionId,
      title: finding.title,
      display_title: finding.display_title,
      summary: finding.summary,
      technical_details: finding.technical_details as Record<string, unknown>,
      supporting_tests: [],
      effect_survived_controls: true,
      confidence: finding.confidence,
      suggested_prediction: finding.suggested_prediction,
      review_status: 'pending',
    })
    .select('id')
    .single();

  if (error) {
    throw new Error(`Failed to save finding: ${error.message}`);
  }

  return data.id;
}

/**
 * Update finding review status
 */
export async function updateFindingStatus(
  findingId: string,
  status: 'pending' | 'approved' | 'rejected',
  reviewNotes?: string
): Promise<void> {
  const supabase = createAgentReadClient();

  const { error } = await supabase
    .from('aletheia_agent_findings')
    .update({
      review_status: status,
      review_notes: reviewNotes || null,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', findingId);

  if (error) {
    console.error('Failed to update finding status:', error);
  }
}

/**
 * Get pending findings for review
 */
export async function getPendingFindings(): Promise<
  Array<{
    id: string;
    title: string;
    display_title: string;
    summary: string;
    confidence: number;
    created_at: string;
  }>
> {
  const supabase = createAgentReadClient();

  const { data, error } = await supabase
    .from('aletheia_agent_findings')
    .select('id, title, display_title, summary, confidence, created_at')
    .eq('review_status', 'pending')
    .order('confidence', { ascending: false })
    .limit(50);

  if (error) {
    console.error('Failed to get pending findings:', error);
    return [];
  }

  return data || [];
}

/**
 * Get a finding by ID with full details
 */
export async function getFindingById(findingId: string): Promise<AgentFinding | null> {
  const supabase = createAgentReadClient();

  const { data, error } = await supabase
    .from('aletheia_agent_findings')
    .select('*')
    .eq('id', findingId)
    .single();

  if (error) {
    console.error('Failed to get finding:', error);
    return null;
  }

  return data as AgentFinding;
}

/**
 * Get findings that need additional information/research
 */
export async function getFindingsNeedingInfo(): Promise<AgentFinding[]> {
  const supabase = createAgentReadClient();

  const { data, error } = await supabase
    .from('aletheia_agent_findings')
    .select('*')
    .eq('review_status', 'needs_info')
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('Failed to get findings needing info:', error);
    return [];
  }

  return (data || []) as AgentFinding[];
}
