/**
 * Client-Side Statistics Library
 * Calculates p-values, effect sizes, and confidence intervals for prediction results
 * All calculations run in the browser - no server round-trip needed
 */

// ============================================================================
// NORMAL DISTRIBUTION
// ============================================================================

/**
 * Normal CDF approximation using Abramowitz & Stegun formula
 * Accurate to 6 decimal places
 */
function normalCDF(z: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = z < 0 ? -1 : 1;
  const absZ = Math.abs(z) / Math.sqrt(2);
  const t = 1.0 / (1.0 + p * absZ);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-absZ * absZ);

  return 0.5 * (1.0 + sign * y);
}

// ============================================================================
// BINOMIAL TEST
// ============================================================================

export interface BinomialResult {
  observedProportion: number;
  expectedProportion: number;
  zScore: number;
  pValue: number;
  significant: boolean;
  effectObserved: boolean;
  effectSize: number; // Cohen's h
  confidenceInterval: { lower: number; upper: number };
  plainEnglish: string;
}

/**
 * Binomial test for proportion data
 * Used for Ganzfeld (25% baseline) and Stargate (25% baseline) domains
 *
 * @param hits - Number of successful trials (correct guesses)
 * @param trials - Total number of trials
 * @param expectedProp - Expected proportion under null hypothesis (default: 0.25 for 4-choice)
 */
export function binomialTest(
  hits: number,
  trials: number,
  expectedProp: number = 0.25
): BinomialResult {
  if (trials <= 0) {
    throw new Error('Trials must be greater than 0');
  }
  if (hits < 0 || hits > trials) {
    throw new Error('Hits must be between 0 and trials');
  }
  if (expectedProp <= 0 || expectedProp >= 1) {
    throw new Error('Expected proportion must be between 0 and 1');
  }

  const observedProp = hits / trials;

  // Standard error for proportion
  const se = Math.sqrt((expectedProp * (1 - expectedProp)) / trials);

  // Z-score
  const zScore = se > 0 ? (observedProp - expectedProp) / se : 0;

  // Two-tailed p-value
  const pValue = 2 * (1 - normalCDF(Math.abs(zScore)));

  // Effect size (Cohen's h)
  const effectSize = cohensH(observedProp, expectedProp);

  // Wilson score confidence interval
  const confidenceInterval = wilsonInterval(hits, trials);

  // Determine if effect is observed (above chance AND significant)
  const significant = pValue < 0.05;
  const effectObserved = observedProp > expectedProp && significant;

  // Generate plain English explanation
  const plainEnglish = generateBinomialExplanation(
    hits,
    trials,
    observedProp,
    expectedProp,
    pValue,
    significant,
    effectObserved
  );

  return {
    observedProportion: observedProp,
    expectedProportion: expectedProp,
    zScore,
    pValue,
    significant,
    effectObserved,
    effectSize,
    confidenceInterval,
    plainEnglish,
  };
}

/**
 * Generate plain English explanation for binomial test results
 */
function generateBinomialExplanation(
  hits: number,
  trials: number,
  observed: number,
  expected: number,
  pValue: number,
  significant: boolean,
  effectObserved: boolean
): string {
  const hitRate = (observed * 100).toFixed(1);
  const chanceRate = (expected * 100).toFixed(0);

  if (effectObserved) {
    if (pValue < 0.001) {
      return `Strong evidence of an effect: ${hits}/${trials} hits (${hitRate}%) vs ${chanceRate}% expected by chance. This result is extremely unlikely to occur randomly (p < 0.001).`;
    } else if (pValue < 0.01) {
      return `Good evidence of an effect: ${hits}/${trials} hits (${hitRate}%) vs ${chanceRate}% expected by chance. This result is very unlikely to be random (p < 0.01).`;
    } else {
      return `Suggestive evidence of an effect: ${hits}/${trials} hits (${hitRate}%) vs ${chanceRate}% expected by chance. This result is unlikely to be random (p < 0.05).`;
    }
  } else if (observed > expected && !significant) {
    return `Above chance but not statistically significant: ${hits}/${trials} hits (${hitRate}%) vs ${chanceRate}% expected. Could be a real effect or random variation - more trials needed.`;
  } else if (observed < expected && significant) {
    return `Below chance: ${hits}/${trials} hits (${hitRate}%) vs ${chanceRate}% expected. Performance was significantly worse than random guessing.`;
  } else {
    return `Consistent with chance: ${hits}/${trials} hits (${hitRate}%) vs ${chanceRate}% expected. No evidence of an effect in this sample.`;
  }
}

// ============================================================================
// CONFIDENCE INTERVALS
// ============================================================================

/**
 * Wilson score interval for proportions
 * More accurate than normal approximation, especially for small samples or extreme proportions
 */
export function wilsonInterval(
  hits: number,
  trials: number,
  confidence: number = 0.95
): { lower: number; upper: number } {
  // Z-score for desired confidence level
  const z = confidence === 0.95 ? 1.96 : confidence === 0.99 ? 2.576 : 1.645;

  const p = hits / trials;
  const denominator = 1 + (z * z) / trials;
  const center = p + (z * z) / (2 * trials);
  const margin = z * Math.sqrt((p * (1 - p) + (z * z) / (4 * trials)) / trials);

  return {
    lower: Math.max(0, (center - margin) / denominator),
    upper: Math.min(1, (center + margin) / denominator),
  };
}

// ============================================================================
// EFFECT SIZE
// ============================================================================

/**
 * Cohen's h effect size for proportions
 * Measures the standardized difference between two proportions
 *
 * Interpretation:
 * - Small: |h| ~ 0.2
 * - Medium: |h| ~ 0.5
 * - Large: |h| ~ 0.8
 */
export function cohensH(observed: number, expected: number): number {
  const phi1 = 2 * Math.asin(Math.sqrt(Math.max(0, Math.min(1, observed))));
  const phi2 = 2 * Math.asin(Math.sqrt(Math.max(0, Math.min(1, expected))));
  return Math.abs(phi1 - phi2);
}

/**
 * Get effect size label
 */
export function getEffectSizeLabel(h: number): string {
  const absH = Math.abs(h);
  if (absH >= 0.8) return 'Large';
  if (absH >= 0.5) return 'Medium';
  if (absH >= 0.2) return 'Small';
  return 'Negligible';
}

// ============================================================================
// POISSON TEST (for Geophysical domain)
// ============================================================================

export interface PoissonResult {
  observedEvents: number;
  expectedEvents: number;
  pValue: number;
  significant: boolean;
  ratio: number;
  plainEnglish: string;
}

/**
 * Poisson test for count data
 * Used for temporal clustering analysis (e.g., UFO sightings near earthquakes)
 *
 * @param observed - Number of events observed
 * @param expectedRate - Expected events per unit time under null
 * @param timeWindow - Duration of observation window
 */
export function poissonTest(
  observed: number,
  expectedRate: number,
  timeWindow: number = 1
): PoissonResult {
  if (observed < 0) {
    throw new Error('Observed events must be non-negative');
  }
  if (expectedRate <= 0) {
    throw new Error('Expected rate must be positive');
  }

  const expected = expectedRate * timeWindow;

  // Use normal approximation for large expected counts
  // Otherwise use exact Poisson
  let pValue: number;
  if (expected >= 10) {
    // Normal approximation
    const z = (observed - expected) / Math.sqrt(expected);
    pValue = observed > expected ? 1 - normalCDF(z) : normalCDF(z);
  } else {
    // Exact Poisson CDF
    pValue = 1 - poissonCDF(observed - 1, expected);
  }

  const significant = pValue < 0.05;
  const ratio = observed / expected;

  // Plain English
  let plainEnglish: string;
  if (ratio > 1 && significant) {
    plainEnglish = `Significant clustering: ${observed} events observed vs ${expected.toFixed(1)} expected (${ratio.toFixed(1)}x higher). This clustering is unlikely to be random.`;
  } else if (ratio > 1 && !significant) {
    plainEnglish = `Slight elevation: ${observed} events observed vs ${expected.toFixed(1)} expected. Not enough data to rule out random variation.`;
  } else {
    plainEnglish = `Normal or below: ${observed} events observed vs ${expected.toFixed(1)} expected. No unusual clustering detected.`;
  }

  return {
    observedEvents: observed,
    expectedEvents: expected,
    pValue,
    significant,
    ratio,
    plainEnglish,
  };
}

/**
 * Poisson CDF - probability of observing k or fewer events
 */
function poissonCDF(k: number, lambda: number): number {
  if (k < 0) return 0;

  let sum = 0;
  for (let i = 0; i <= Math.floor(k); i++) {
    sum += Math.exp(-lambda + i * Math.log(lambda) - logFactorial(i));
  }
  return Math.min(1, sum);
}

/**
 * Log factorial using Stirling's approximation for large n
 */
function logFactorial(n: number): number {
  if (n <= 1) return 0;
  if (n < 20) {
    // Direct calculation for small n
    let result = 0;
    for (let i = 2; i <= n; i++) {
      result += Math.log(i);
    }
    return result;
  }
  // Stirling's approximation
  return n * Math.log(n) - n + 0.5 * Math.log(2 * Math.PI * n);
}

// ============================================================================
// QUALITATIVE CODING (for NDE/Crisis Apparition domains)
// ============================================================================

export interface QualitativeResult {
  type: 'qualitative';
  wordCount: number;
  tags: string[];
  completeness: number; // 0-1 based on fields filled
  plainEnglish: string;
}

/**
 * Analyze qualitative description for NDE/Crisis Apparition domains
 * These domains don't use statistical testing - they use structured coding
 */
export function qualitativeCoding(description: string): QualitativeResult {
  const wordCount = description.trim().split(/\s+/).filter(Boolean).length;

  // Extract relevant tags based on keywords
  const tags: string[] = [];
  const lowerDesc = description.toLowerCase();

  // Veridical perception indicators
  if (/verifi|confirm|match|correct|accurate/i.test(lowerDesc)) {
    tags.push('veridical');
  }

  // Timeline indicators
  if (/same time|simultaneous|moment of|at the time/i.test(lowerDesc)) {
    tags.push('timeline-match');
  }

  // Corroboration indicators
  if (/witness|corroborat|independent|multiple|other people/i.test(lowerDesc)) {
    tags.push('corroborated');
  }

  // Documentation indicators
  if (/document|record|writ|log|photo|video/i.test(lowerDesc)) {
    tags.push('documented');
  }

  // Crisis/emergency indicators
  if (/death|dying|accident|emergency|crisis|hospital/i.test(lowerDesc)) {
    tags.push('crisis-event');
  }

  // Calculate completeness based on word count and tags
  const completeness = Math.min(1, (wordCount / 200) * 0.5 + (tags.length / 5) * 0.5);

  // Plain English summary
  let plainEnglish: string;
  if (tags.length >= 3) {
    plainEnglish = `Rich account with ${tags.length} quality indicators: ${tags.join(', ')}. Well-documented for qualitative analysis.`;
  } else if (tags.length >= 1) {
    plainEnglish = `Account includes ${tags.length} quality indicator(s): ${tags.join(', ')}. Additional corroboration would strengthen the case.`;
  } else {
    plainEnglish = `Narrative account without specific quality indicators. May benefit from follow-up questions about timing, witnesses, or documentation.`;
  }

  return {
    type: 'qualitative',
    wordCount,
    tags,
    completeness,
    plainEnglish,
  };
}

// ============================================================================
// P-VALUE HELPERS
// ============================================================================

/**
 * Get plain English explanation for p-value
 */
export function getPValueExplanation(pValue: number): {
  text: string;
  color: string;
  icon: string;
} {
  if (pValue < 0.001) {
    return {
      text: 'Extremely unlikely to be random',
      color: 'text-emerald-400',
      icon: '***',
    };
  }
  if (pValue < 0.01) {
    return {
      text: 'Very unlikely to be random',
      color: 'text-emerald-400',
      icon: '**',
    };
  }
  if (pValue < 0.05) {
    return {
      text: 'Unlikely to be random',
      color: 'text-green-400',
      icon: '*',
    };
  }
  if (pValue < 0.1) {
    return {
      text: 'Marginally significant',
      color: 'text-yellow-400',
      icon: '~',
    };
  }
  return {
    text: 'Could be random chance',
    color: 'text-zinc-400',
    icon: '',
  };
}

/**
 * Format p-value for display
 */
export function formatPValue(pValue: number): string {
  if (pValue < 0.001) return '< 0.001';
  if (pValue < 0.01) return pValue.toFixed(3);
  return pValue.toFixed(2);
}
