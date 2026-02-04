/**
 * Mechanism Agent - Test Designer
 * Design discriminating tests between competing mechanisms
 */

import { getAdminClient } from '../supabase-admin';
import Anthropic from '@anthropic-ai/sdk';
import type { Mechanism, DiscriminatingTest, TestType, Priority, MechanismPredictionMap } from './types';


/**
 * Design a discriminating test between two mechanisms
 */
export function designDiscriminatingTest(
  mechanism1: Mechanism,
  mechanism2: Mechanism
): DiscriminatingTest | null {
  // Find conflicting predictions
  const preds1 = mechanism1.predictions || [];
  const preds2 = mechanism2.predictions || [];

  // Look for testable predictions that differ
  const testable1 = preds1.filter(p => p.testable);
  const testable2 = preds2.filter(p => p.testable);

  if (testable1.length === 0 || testable2.length === 0) {
    return null;
  }

  // Try to find opposite predictions
  for (const pred1 of testable1) {
    for (const pred2 of testable2) {
      // Check if predictions conflict
      const conflict = detectPredictionConflict(pred1.prediction, pred2.prediction);
      if (conflict) {
        const predictions: MechanismPredictionMap = {
          [mechanism1.name]: { predicts: pred1.prediction, confidence: 0.7 },
          [mechanism2.name]: { predicts: pred2.prediction, confidence: 0.7 },
        };

        return {
          test_name: `${mechanism1.name} vs ${mechanism2.name}`,
          test_description: `Test comparing predictions of ${mechanism1.name} and ${mechanism2.name} regarding ${conflict.topic}`,
          test_type: 'prediction_comparison',
          mechanism_names: [mechanism1.name, mechanism2.name],
          predictions,
          data_requirements: `Data needed to evaluate: ${pred1.prediction} vs ${pred2.prediction}`,
          priority: 'medium',
        };
      }
    }
  }

  // If no direct conflict, design a boundary test
  const boundaryTest = designBoundaryTest(mechanism1, mechanism2);
  if (boundaryTest) return boundaryTest;

  return null;
}

/**
 * Detect if two predictions conflict
 */
function detectPredictionConflict(
  pred1: string,
  pred2: string
): { topic: string; type: 'opposite' | 'incompatible' } | null {
  const p1 = pred1.toLowerCase();
  const p2 = pred2.toLowerCase();

  // Check for opposite assertions
  const negationWords = ['not', 'no', 'never', 'absent', 'without'];
  const hasNegation1 = negationWords.some(w => p1.includes(w));
  const hasNegation2 = negationWords.some(w => p2.includes(w));

  // If one has negation and they discuss same topic, it's a conflict
  if (hasNegation1 !== hasNegation2) {
    // Extract common topic words
    const words1 = new Set(p1.split(/\W+/).filter(w => w.length > 4));
    const words2 = new Set(p2.split(/\W+/).filter(w => w.length > 4));
    const commonWords = Array.from(words1).filter(w => words2.has(w));

    if (commonWords.length > 0) {
      return { topic: commonWords.join(', '), type: 'opposite' };
    }
  }

  // Check for quantitative incompatibility
  const quantWords = ['correlate', 'increase', 'decrease', 'higher', 'lower', 'more', 'less'];
  const hasQuant1 = quantWords.some(w => p1.includes(w));
  const hasQuant2 = quantWords.some(w => p2.includes(w));

  if (hasQuant1 && hasQuant2) {
    // Check for opposite directions
    const increasing = ['increase', 'higher', 'more', 'positive'];
    const decreasing = ['decrease', 'lower', 'less', 'negative'];

    const dir1 = increasing.some(w => p1.includes(w)) ? 'up' :
                 decreasing.some(w => p1.includes(w)) ? 'down' : null;
    const dir2 = increasing.some(w => p2.includes(w)) ? 'up' :
                 decreasing.some(w => p2.includes(w)) ? 'down' : null;

    if (dir1 && dir2 && dir1 !== dir2) {
      return { topic: 'effect direction', type: 'incompatible' };
    }
  }

  return null;
}

/**
 * Design a boundary condition test
 */
function designBoundaryTest(
  mechanism1: Mechanism,
  mechanism2: Mechanism
): DiscriminatingTest | null {
  // Find where mechanisms should behave differently
  const boundaries: string[] = [];

  // Check mechanism types for natural boundaries
  if (mechanism1.mechanism_type === 'neurological' &&
      mechanism2.mechanism_type === 'consciousness') {
    boundaries.push('flat EEG cases');
  }

  if (mechanism1.mechanism_type === 'physical' &&
      mechanism2.mechanism_type === 'interdimensional') {
    boundaries.push('physical evidence');
  }

  if (boundaries.length === 0) {
    return null;
  }

  const predictions: MechanismPredictionMap = {
    [mechanism1.name]: {
      predicts: `Should show specific ${mechanism1.mechanism_type} signatures`,
      confidence: 0.6,
    },
    [mechanism2.name]: {
      predicts: `Should show ${mechanism2.mechanism_type} characteristics`,
      confidence: 0.6,
    },
  };

  return {
    test_name: `Boundary Test: ${boundaries[0]}`,
    test_description: `Test behavior at boundary condition: ${boundaries[0]}`,
    test_type: 'boundary_condition',
    mechanism_names: [mechanism1.name, mechanism2.name],
    predictions,
    data_requirements: `Cases with clear ${boundaries[0]} documentation`,
    priority: 'high',
  };
}

/**
 * Use AI to design a discriminating test
 */
export async function designTestWithAI(
  mechanisms: Mechanism[]
): Promise<DiscriminatingTest | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.log('ANTHROPIC_API_KEY not configured');
    return null;
  }

  const anthropic = new Anthropic({ apiKey });

  const mechDescriptions = mechanisms.map(m =>
    `${m.name} (${m.mechanism_type}): ${m.description}\nPredictions: ${(m.predictions || []).map(p => p.prediction).join('; ')}`
  ).join('\n\n');

  const prompt = `You are designing scientific tests to discriminate between competing explanatory mechanisms.

Given these mechanisms:
${mechDescriptions}

Design ONE discriminating test that would help determine which mechanism is more likely correct.

The test should:
1. Have different predicted outcomes for each mechanism
2. Be empirically testable with available data types (reports, surveys, physiological measures)
3. Not be trivially supportive of one mechanism

Return JSON with:
{
  "test_name": "short name",
  "test_description": "detailed description",
  "test_type": "prediction_comparison" | "exclusive_outcome" | "boundary_condition",
  "predictions": {"mechanism_name": {"predicts": "what it predicts", "confidence": 0.0-1.0}},
  "data_requirements": "what data is needed",
  "priority": "critical" | "high" | "medium" | "low"
}`;

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = message.content[0];
    if (content.type !== 'text') return null;

    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      test_name: parsed.test_name,
      test_description: parsed.test_description,
      test_type: parsed.test_type as TestType,
      mechanism_names: mechanisms.map(m => m.name),
      predictions: parsed.predictions,
      data_requirements: parsed.data_requirements,
      priority: parsed.priority as Priority,
    };
  } catch (error) {
    console.error('AI test design error:', error);
    return null;
  }
}

/**
 * Design tests for all competing mechanisms in a domain
 */
export function designTestsForDomain(mechanisms: Mechanism[]): DiscriminatingTest[] {
  const tests: DiscriminatingTest[] = [];

  // Generate pairwise tests
  for (let i = 0; i < mechanisms.length; i++) {
    for (let j = i + 1; j < mechanisms.length; j++) {
      const test = designDiscriminatingTest(mechanisms[i], mechanisms[j]);
      if (test) {
        tests.push(test);
      }
    }
  }

  return tests;
}

/**
 * Save discriminating tests to database
 */
export async function saveDiscriminatingTests(
  tests: DiscriminatingTest[],
  sessionId?: string
): Promise<number> {
  if (tests.length === 0) return 0;

  const toInsert = tests.map(t => ({
    session_id: sessionId,
    test_name: t.test_name,
    test_description: t.test_description,
    test_type: t.test_type,
    mechanism_ids: t.mechanism_ids,
    mechanism_names: t.mechanism_names,
    predictions: t.predictions,
    test_status: 'proposed',
    data_available: t.data_available || false,
    data_requirements: t.data_requirements,
    priority: t.priority || 'medium',
  }));

  const { data, error } = await getAdminClient()
    .from('aletheia_discriminating_tests')
    .insert(toInsert)
    .select('id');

  if (error) {
    console.error('Save discriminating tests error:', error);
    return 0;
  }

  return data?.length || 0;
}

/**
 * Get discriminating tests
 */
export async function getDiscriminatingTests(options: {
  sessionId?: string;
  status?: string;
  priority?: Priority;
  limit?: number;
}): Promise<DiscriminatingTest[]> {
  let query = getAdminClient()
    .from('aletheia_discriminating_tests')
    .select('*')
    .order('created_at', { ascending: false });

  if (options.sessionId) {
    query = query.eq('session_id', options.sessionId);
  }
  if (options.status) {
    query = query.eq('test_status', options.status);
  }
  if (options.priority) {
    query = query.eq('priority', options.priority);
  }

  const { data, error } = await query.limit(options.limit || 50);

  if (error) {
    console.error('Get discriminating tests error:', error);
    return [];
  }

  return data || [];
}

/**
 * Prioritize tests based on data availability and scientific value
 */
export function prioritizeTests(tests: DiscriminatingTest[]): DiscriminatingTest[] {
  return tests.sort((a, b) => {
    const priorityOrder: Record<Priority, number> = {
      critical: 4,
      high: 3,
      medium: 2,
      low: 1,
    };

    const aScore = priorityOrder[a.priority || 'medium'] + (a.data_available ? 2 : 0);
    const bScore = priorityOrder[b.priority || 'medium'] + (b.data_available ? 2 : 0);

    return bScore - aScore;
  });
}
