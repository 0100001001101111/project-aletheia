/**
 * Aletheia Research Agent - Holdout Validation
 * Phase 2: Analysis Engine
 *
 * Before any finding is queued:
 * 1. Split data 80/20 (using consistent seed for reproducibility)
 * 2. Run initial test on 80% (training set)
 * 3. If significant, re-run on 20% (holdout)
 * 4. Both must pass for finding to be valid
 */

import { createAgentReadClient } from './supabase-admin';
import type { HoldoutSplit, TestResult, GeneratedHypothesis } from './types';
import {
  chiSquareTest,
  tTest,
  mannWhitneyTest,
  correlationTest,
  binomialTest,
  monteCarloTest,
  mean,
} from './statistics';

// ============================================
// Seeded Random Number Generator
// ============================================

/**
 * Simple seeded PRNG (Mulberry32)
 */
function seededRandom(seed: number): () => number {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Shuffle array with seeded random
 */
function shuffleArray<T>(array: T[], random: () => number): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// ============================================
// Data Splitting
// ============================================

/**
 * Split investigation IDs into training (80%) and holdout (20%) sets
 */
export function splitData(
  ids: string[],
  seed: number = 42
): HoldoutSplit {
  const random = seededRandom(seed);
  const shuffled = shuffleArray(ids, random);

  const splitIndex = Math.floor(shuffled.length * 0.8);

  return {
    training_ids: shuffled.slice(0, splitIndex),
    holdout_ids: shuffled.slice(splitIndex),
    seed,
  };
}

/**
 * Get relevant investigation IDs for a hypothesis
 */
export async function getRelevantInvestigationIds(
  hypothesis: GeneratedHypothesis
): Promise<string[]> {
  const supabase = createAgentReadClient();

  const { data, error } = await supabase
    .from('aletheia_investigations')
    .select('id')
    .in('investigation_type', hypothesis.domains)
    .limit(50000);

  if (error) {
    console.error('Error fetching investigation IDs:', error);
    return [];
  }

  return (data || []).map((d) => d.id);
}

// ============================================
// Test Execution on Data Subsets
// ============================================

interface TestData {
  ids: string[];
  hypothesis: GeneratedHypothesis;
}

/**
 * Run a statistical test on a subset of data
 */
export async function runTestOnSubset(
  testData: TestData,
  significanceThreshold = 0.01,
  effectThreshold = 0.3
): Promise<TestResult> {
  const supabase = createAgentReadClient();
  const { ids, hypothesis } = testData;

  if (ids.length === 0) {
    return {
      test_type: hypothesis.suggested_test,
      statistic: 0,
      p_value: 1,
      effect_size: 0,
      sample_size: 0,
      passed_threshold: false,
      interpretation: 'No data available for testing',
    };
  }

  // Fetch the actual data for these IDs
  const { data: investigations, error } = await supabase
    .from('aletheia_investigations')
    .select('id, investigation_type, raw_data, created_at')
    .in('id', ids.slice(0, 5000)); // Limit for performance

  if (error || !investigations) {
    return {
      test_type: hypothesis.suggested_test,
      statistic: 0,
      p_value: 1,
      effect_size: 0,
      sample_size: 0,
      passed_threshold: false,
      interpretation: `Error fetching data: ${error?.message || 'Unknown error'}`,
    };
  }

  // Route to appropriate test based on pattern type and suggested test
  switch (hypothesis.suggested_test) {
    case 'chi-square':
      return runChiSquareOnData(investigations, hypothesis, significanceThreshold, effectThreshold);
    case 't-test':
      return runTTestOnData(investigations, hypothesis, significanceThreshold, effectThreshold);
    case 'mann-whitney':
      return runMannWhitneyOnData(investigations, hypothesis, significanceThreshold, effectThreshold);
    case 'correlation':
      return runCorrelationOnData(investigations, hypothesis, significanceThreshold, effectThreshold);
    case 'binomial':
      return runBinomialOnData(investigations, hypothesis, significanceThreshold, effectThreshold);
    case 'monte-carlo':
      return runMonteCarloOnData(investigations, hypothesis, significanceThreshold, effectThreshold);
    default:
      return runChiSquareOnData(investigations, hypothesis, significanceThreshold, effectThreshold);
  }
}

/**
 * Chi-square test implementation for investigation data
 */
function runChiSquareOnData(
  investigations: Array<{ id: string; investigation_type: string; raw_data: Record<string, unknown> | null }>,
  hypothesis: GeneratedHypothesis,
  sigThreshold: number,
  effectThreshold: number
): TestResult {
  const patternType = hypothesis.source_pattern.type;

  if (patternType === 'co-location') {
    // Test if co-occurrence is more frequent than expected
    const typeCounts: Record<string, number> = {};
    for (const inv of investigations) {
      typeCounts[inv.investigation_type] = (typeCounts[inv.investigation_type] || 0) + 1;
    }

    const types = Object.keys(typeCounts);
    const observed = types.map((t) => typeCounts[t]);
    const total = observed.reduce((a, b) => a + b, 0);
    const expected = types.map(() => total / types.length); // Uniform expectation

    return chiSquareTest(observed, expected, sigThreshold, effectThreshold);
  }

  // Default: compare type distribution to uniform
  const typeCounts: Record<string, number> = {};
  for (const inv of investigations) {
    typeCounts[inv.investigation_type] = (typeCounts[inv.investigation_type] || 0) + 1;
  }

  const types = Object.keys(typeCounts);
  if (types.length < 2) {
    return {
      test_type: 'chi-square',
      statistic: 0,
      p_value: 1,
      effect_size: 0,
      sample_size: investigations.length,
      passed_threshold: false,
      interpretation: 'Insufficient categories for chi-square test',
    };
  }

  const observed = types.map((t) => typeCounts[t]);
  const total = observed.reduce((a, b) => a + b, 0);
  const expected = types.map(() => total / types.length);

  return chiSquareTest(observed, expected, sigThreshold, effectThreshold);
}

/**
 * T-test implementation for investigation data
 */
function runTTestOnData(
  investigations: Array<{ id: string; investigation_type: string; raw_data: Record<string, unknown> | null }>,
  hypothesis: GeneratedHypothesis,
  sigThreshold: number,
  effectThreshold: number
): TestResult {
  // For attribute patterns, compare a numeric variable across groups
  const domains = hypothesis.domains;
  if (domains.length < 2) {
    return {
      test_type: 't-test',
      statistic: 0,
      p_value: 1,
      effect_size: 0,
      sample_size: investigations.length,
      passed_threshold: false,
      interpretation: 'Need at least 2 domains for t-test comparison',
    };
  }

  // Try to find a common numeric field (e.g., witness_count, kp_index)
  const group1: number[] = [];
  const group2: number[] = [];

  for (const inv of investigations) {
    if (!inv.raw_data) continue;
    const raw = inv.raw_data;

    // Look for witness_count or similar
    const value =
      (raw.witness_count as number) ||
      ((raw.geomagnetic as Record<string, unknown>)?.kp_index as number) ||
      (raw.duration_seconds as number);

    if (value == null || isNaN(value)) continue;

    if (inv.investigation_type === domains[0]) {
      group1.push(value);
    } else if (inv.investigation_type === domains[1]) {
      group2.push(value);
    }
  }

  if (group1.length < 10 || group2.length < 10) {
    return {
      test_type: 't-test',
      statistic: 0,
      p_value: 1,
      effect_size: 0,
      sample_size: group1.length + group2.length,
      passed_threshold: false,
      interpretation: 'Insufficient numeric data for t-test',
    };
  }

  return tTest(group1, group2, sigThreshold, effectThreshold);
}

/**
 * Mann-Whitney test implementation
 */
function runMannWhitneyOnData(
  investigations: Array<{ id: string; investigation_type: string; raw_data: Record<string, unknown> | null }>,
  hypothesis: GeneratedHypothesis,
  sigThreshold: number,
  effectThreshold: number
): TestResult {
  // Similar to t-test but non-parametric
  const domains = hypothesis.domains;
  const group1: number[] = [];
  const group2: number[] = [];

  for (const inv of investigations) {
    if (!inv.raw_data) continue;
    const raw = inv.raw_data;

    const value =
      (raw.witness_count as number) ||
      ((raw.geomagnetic as Record<string, unknown>)?.kp_index as number) ||
      (raw.duration_seconds as number);

    if (value == null || isNaN(value)) continue;

    if (domains.length >= 2) {
      if (inv.investigation_type === domains[0]) {
        group1.push(value);
      } else if (inv.investigation_type === domains[1]) {
        group2.push(value);
      }
    } else {
      // Single domain: split by some attribute
      if (group1.length < investigations.length / 2) {
        group1.push(value);
      } else {
        group2.push(value);
      }
    }
  }

  if (group1.length < 10 || group2.length < 10) {
    return {
      test_type: 'mann-whitney',
      statistic: 0,
      p_value: 1,
      effect_size: 0,
      sample_size: group1.length + group2.length,
      passed_threshold: false,
      interpretation: 'Insufficient data for Mann-Whitney test',
    };
  }

  return mannWhitneyTest(group1, group2, sigThreshold, effectThreshold);
}

/**
 * Correlation test implementation
 */
function runCorrelationOnData(
  investigations: Array<{ id: string; investigation_type: string; raw_data: Record<string, unknown> | null }>,
  hypothesis: GeneratedHypothesis,
  sigThreshold: number,
  effectThreshold: number
): TestResult {
  // Look for two numeric variables to correlate
  const x: number[] = [];
  const y: number[] = [];

  for (const inv of investigations) {
    if (!inv.raw_data) continue;
    const raw = inv.raw_data;

    // Try to find two correlated variables
    const geomag = raw.geomagnetic as Record<string, unknown> | null;
    const witnessCount = raw.witness_count as number | undefined;
    const kpIndex = geomag?.kp_index as number | undefined;
    const durationSeconds = raw.duration_seconds as number | undefined;

    if (witnessCount != null && kpIndex != null) {
      x.push(witnessCount);
      y.push(kpIndex);
    } else if (witnessCount != null && durationSeconds != null) {
      x.push(witnessCount);
      y.push(durationSeconds);
    }
  }

  if (x.length < 20) {
    return {
      test_type: 'correlation',
      statistic: 0,
      p_value: 1,
      effect_size: 0,
      sample_size: x.length,
      passed_threshold: false,
      interpretation: 'Insufficient paired data for correlation test',
    };
  }

  return correlationTest(x, y, sigThreshold, effectThreshold);
}

/**
 * Binomial test implementation
 */
function runBinomialOnData(
  investigations: Array<{ id: string; investigation_type: string; raw_data: Record<string, unknown> | null }>,
  hypothesis: GeneratedHypothesis,
  sigThreshold: number,
  effectThreshold: number
): TestResult {
  const patternType = hypothesis.source_pattern.type;

  if (patternType === 'temporal') {
    // Test if anomalous months occur more often than expected
    const evidence = hypothesis.source_pattern.evidence as Record<string, unknown>;
    const anomalousMonths = evidence.anomalous_months as Array<{ month: string }> | undefined;
    const totalMonths = (evidence.total_months_analyzed as number) || 60;

    if (!anomalousMonths) {
      return {
        test_type: 'binomial',
        statistic: 0,
        p_value: 1,
        effect_size: 0,
        sample_size: investigations.length,
        passed_threshold: false,
        interpretation: 'No temporal data for binomial test',
      };
    }

    const successes = anomalousMonths.length;
    const expectedProportion = 0.05; // 5% of months would have z>2 by chance

    return binomialTest(successes, totalMonths, expectedProportion, sigThreshold, effectThreshold);
  }

  // Default: test proportion of multi-witness events
  let multiWitness = 0;
  let totalWithData = 0;

  for (const inv of investigations) {
    if (!inv.raw_data) continue;
    const witnessCount = inv.raw_data.witness_count as number | undefined;
    if (witnessCount != null) {
      totalWithData++;
      if (witnessCount >= 3) {
        multiWitness++;
      }
    }
  }

  if (totalWithData < 50) {
    return {
      test_type: 'binomial',
      statistic: 0,
      p_value: 1,
      effect_size: 0,
      sample_size: totalWithData,
      passed_threshold: false,
      interpretation: 'Insufficient data for binomial test',
    };
  }

  // Expected: ~10% have 3+ witnesses by baseline
  return binomialTest(multiWitness, totalWithData, 0.1, sigThreshold, effectThreshold);
}

/**
 * Monte Carlo test implementation
 */
function runMonteCarloOnData(
  investigations: Array<{ id: string; investigation_type: string; raw_data: Record<string, unknown> | null }>,
  hypothesis: GeneratedHypothesis,
  sigThreshold: number,
  effectThreshold: number
): TestResult {
  const patternType = hypothesis.source_pattern.type;

  if (patternType === 'geographic' || patternType === 'co-location') {
    // Test if clustering exceeds random expectation
    const evidence = hypothesis.source_pattern.evidence as Record<string, unknown>;
    const cellCount = (evidence.cell_count as number) || 0;
    const avgWindowIndex = (evidence.average_window_index as number) || 0;

    if (cellCount < 5) {
      return {
        test_type: 'monte-carlo',
        statistic: 0,
        p_value: 1,
        effect_size: 0,
        sample_size: investigations.length,
        passed_threshold: false,
        interpretation: 'Insufficient geographic data for Monte Carlo test',
      };
    }

    // Simulate random distribution of events
    const observedStatistic = avgWindowIndex;
    const nullGenerator = () => {
      // Generate random window index (sum of random co-occurrences)
      let randomIndex = 0;
      for (let i = 0; i < cellCount; i++) {
        if (Math.random() < 0.15) {
          // 15% chance of multi-type cell
          randomIndex += Math.random() * 2;
        }
      }
      return randomIndex / cellCount;
    };

    return monteCarloTest(
      observedStatistic,
      nullGenerator,
      5000, // 5000 iterations
      sigThreshold,
      effectThreshold
    );
  }

  // Default: return non-significant result
  return {
    test_type: 'monte-carlo',
    statistic: 0,
    p_value: 0.5,
    effect_size: 0,
    sample_size: investigations.length,
    passed_threshold: false,
    interpretation: 'No applicable Monte Carlo test for this pattern type',
  };
}

// ============================================
// Main Validation Function
// ============================================

/**
 * Run full holdout validation for a hypothesis
 * Returns both training and holdout results
 */
export async function validateWithHoldout(
  hypothesis: GeneratedHypothesis,
  significanceThreshold = 0.01,
  effectThreshold = 0.3
): Promise<{
  training: TestResult;
  holdout: TestResult;
  validated: boolean;
}> {
  // Get all relevant investigation IDs
  const allIds = await getRelevantInvestigationIds(hypothesis);

  if (allIds.length < hypothesis.required_sample_size) {
    return {
      training: {
        test_type: hypothesis.suggested_test,
        statistic: 0,
        p_value: 1,
        effect_size: 0,
        sample_size: allIds.length,
        passed_threshold: false,
        interpretation: `Insufficient sample size (${allIds.length} < ${hypothesis.required_sample_size} required)`,
      },
      holdout: {
        test_type: hypothesis.suggested_test,
        statistic: 0,
        p_value: 1,
        effect_size: 0,
        sample_size: 0,
        passed_threshold: false,
        interpretation: 'Holdout test not run due to insufficient data',
      },
      validated: false,
    };
  }

  // Split data
  const split = splitData(allIds, 42);

  // Run on training set
  const training = await runTestOnSubset(
    { ids: split.training_ids, hypothesis },
    significanceThreshold,
    effectThreshold
  );

  // If training doesn't pass, skip holdout
  if (!training.passed_threshold) {
    return {
      training,
      holdout: {
        test_type: hypothesis.suggested_test,
        statistic: 0,
        p_value: 1,
        effect_size: 0,
        sample_size: 0,
        passed_threshold: false,
        interpretation: 'Holdout test not run - training set did not pass threshold',
      },
      validated: false,
    };
  }

  // Run on holdout set
  const holdout = await runTestOnSubset(
    { ids: split.holdout_ids, hypothesis },
    significanceThreshold,
    effectThreshold
  );

  return {
    training,
    holdout,
    validated: training.passed_threshold && holdout.passed_threshold,
  };
}
