/**
 * Aletheia Research Agent - Hypothesis Generator
 * Phase 2: Analysis Engine
 *
 * Uses Claude API to transform pattern candidates into testable hypotheses
 */

import Anthropic from '@anthropic-ai/sdk';
import { createAgentReadClient } from './supabase-admin';
import type { PatternCandidate, GeneratedHypothesis } from './types';

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
// Hypothesis Generation
// ============================================

/**
 * Generate a testable hypothesis from a pattern candidate using Claude
 * Falls back to rule-based generation if API key not available
 */
export async function generateHypothesis(
  pattern: PatternCandidate
): Promise<GeneratedHypothesis> {
  // Check if API key is available - use fallback if not
  if (!process.env.ANTHROPIC_API_KEY) {
    console.log('No ANTHROPIC_API_KEY - using fallback hypothesis generator');
    return createFallbackHypothesis(pattern);
  }

  const client = getAnthropicClient();
  const prompt = buildHypothesisPrompt(pattern);

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
      throw new Error('Unexpected response type from Claude');
    }

    return parseHypothesisResponse(content.text, pattern);
  } catch (error) {
    console.error('Error generating hypothesis:', error);
    // Return a fallback hypothesis
    return createFallbackHypothesis(pattern);
  }
}

/**
 * Build the prompt for hypothesis generation
 */
function buildHypothesisPrompt(pattern: PatternCandidate): string {
  const evidenceSummary = JSON.stringify(pattern.evidence, null, 2);

  return `You are a research scientist analyzing anomalous phenomena data. Generate a testable hypothesis based on the following pattern.

PATTERN TYPE: ${pattern.type}
DESCRIPTION: ${pattern.description}
DOMAINS INVOLVED: ${pattern.domains.join(', ')}
PRELIMINARY STRENGTH: ${(pattern.preliminary_strength * 100).toFixed(0)}%

EVIDENCE:
${evidenceSummary}

Generate a falsifiable hypothesis that could explain this pattern. Your response must be in this exact JSON format:

{
  "hypothesis_text": "A technical, falsifiable statement that can be statistically tested",
  "display_title": "A plain English question that a layperson would understand",
  "testable": true/false,
  "suggested_test": "chi-square" | "t-test" | "mann-whitney" | "correlation" | "binomial" | "monte-carlo",
  "required_sample_size": minimum N needed for statistical power,
  "reasoning": "Brief explanation of why this test is appropriate"
}

GUIDELINES:
- The hypothesis must be falsifiable (can be proven wrong with data)
- Choose the statistical test that best matches the data type:
  - chi-square: comparing categorical frequencies
  - t-test: comparing means of continuous data (normal distribution assumed)
  - mann-whitney: comparing groups when data is non-normal
  - correlation: testing relationship between two continuous variables
  - binomial: testing if proportion differs from expected
  - monte-carlo: complex hypotheses requiring simulation
- Set testable=false if the pattern cannot be rigorously tested with available data
- Required sample size should be realistic (typically 30-1000)

Respond ONLY with the JSON object, no other text.`;
}

/**
 * Parse Claude's response into a GeneratedHypothesis
 */
function parseHypothesisResponse(
  responseText: string,
  pattern: PatternCandidate
): GeneratedHypothesis {
  try {
    // Extract JSON from response (handle potential markdown code blocks)
    let jsonStr = responseText.trim();
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
    }

    const parsed = JSON.parse(jsonStr);

    return {
      hypothesis_text: parsed.hypothesis_text || 'Unable to generate hypothesis',
      display_title: parsed.display_title || pattern.description,
      testable: parsed.testable !== false,
      suggested_test: validateTestType(parsed.suggested_test),
      required_sample_size: Math.max(30, parseInt(parsed.required_sample_size) || 100),
      domains: pattern.domains,
      source_pattern: pattern,
    };
  } catch (error) {
    console.error('Error parsing hypothesis response:', error);
    return createFallbackHypothesis(pattern);
  }
}

/**
 * Validate and normalize test type
 */
function validateTestType(testType: string): string {
  const validTests = ['chi-square', 't-test', 'mann-whitney', 'correlation', 'binomial', 'monte-carlo'];
  const normalized = testType?.toLowerCase().replace('_', '-');
  return validTests.includes(normalized) ? normalized : 'chi-square';
}

/**
 * Create a fallback hypothesis when Claude API fails
 */
function createFallbackHypothesis(pattern: PatternCandidate): GeneratedHypothesis {
  let suggestedTest: string;
  let hypothesisText: string;
  let displayTitle: string;

  switch (pattern.type) {
    case 'co-location':
      suggestedTest = 'chi-square';
      hypothesisText = `The co-occurrence of ${pattern.domains.join(' and ')} phenomena in geographic clusters exceeds what would be expected by chance, suggesting a common underlying mechanism or reporting bias.`;
      displayTitle = `Are ${pattern.domains.join(' and ')} sightings clustered together?`;
      break;

    case 'temporal':
      suggestedTest = 'binomial';
      hypothesisText = `The temporal clustering observed in ${pattern.domains[0]} data represents a genuine increase in phenomena rather than variation in reporting rates.`;
      displayTitle = `Do ${pattern.domains[0]} reports spike during certain time periods?`;
      break;

    case 'geographic':
      suggestedTest = 'monte-carlo';
      hypothesisText = `Geographic "window" areas show elevated multi-phenomenon activity beyond population-adjusted expectations, suggesting location-specific factors.`;
      displayTitle = `Are there geographic hotspots for multiple phenomenon types?`;
      break;

    case 'attribute':
      suggestedTest = 'correlation';
      hypothesisText = `The observed correlation between attributes in ${pattern.domains.join(' and ')} data reflects a genuine relationship rather than confounding factors.`;
      displayTitle = `Is there a real connection between these characteristics?`;
      break;

    default:
      suggestedTest = 'chi-square';
      hypothesisText = pattern.description;
      displayTitle = pattern.description;
  }

  return {
    hypothesis_text: hypothesisText,
    display_title: displayTitle,
    testable: true,
    suggested_test: suggestedTest,
    required_sample_size: 100,
    domains: pattern.domains,
    source_pattern: pattern,
  };
}

// ============================================
// Database Operations
// ============================================

/**
 * Save a generated hypothesis to the database
 */
export async function saveHypothesis(
  hypothesis: GeneratedHypothesis,
  sessionId: string
): Promise<string> {
  const supabase = createAgentReadClient();

  const { data, error } = await supabase
    .from('aletheia_agent_hypotheses')
    .insert({
      session_id: sessionId,
      hypothesis_text: hypothesis.hypothesis_text,
      display_title: hypothesis.display_title,
      domains: hypothesis.domains,
      source_pattern: hypothesis.source_pattern as unknown as Record<string, unknown>,
      confidence: hypothesis.source_pattern.preliminary_strength,
      status: 'pending',
    })
    .select('id')
    .single();

  if (error) {
    throw new Error(`Failed to save hypothesis: ${error.message}`);
  }

  return data.id;
}

/**
 * Update hypothesis status
 */
export async function updateHypothesisStatus(
  hypothesisId: string,
  status: 'pending' | 'testing' | 'confirmed' | 'rejected'
): Promise<void> {
  const supabase = createAgentReadClient();

  const { error } = await supabase
    .from('aletheia_agent_hypotheses')
    .update({ status })
    .eq('id', hypothesisId);

  if (error) {
    console.error('Failed to update hypothesis status:', error);
  }
}

// ============================================
// Batch Processing
// ============================================

/**
 * Generate hypotheses for multiple patterns with rate limiting
 */
export async function generateHypothesesBatch(
  patterns: PatternCandidate[],
  maxConcurrent = 2,
  delayMs = 500
): Promise<GeneratedHypothesis[]> {
  const results: GeneratedHypothesis[] = [];

  // Process in batches to respect rate limits
  for (let i = 0; i < patterns.length; i += maxConcurrent) {
    const batch = patterns.slice(i, i + maxConcurrent);

    const batchResults = await Promise.all(batch.map((p) => generateHypothesis(p)));

    results.push(...batchResults);

    // Add delay between batches
    if (i + maxConcurrent < patterns.length) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return results;
}
