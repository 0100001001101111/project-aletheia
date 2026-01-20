/**
 * Client-Side Statistics Library
 * Auto-calculate p-values and effect sizes for prediction testing
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface BinomialResult {
  observedProportion: number;
  expectedProportion: number;
  zScore: number;
  pValue: number;
  significant: boolean;
  effectObserved: boolean;
  effectSize: number;
  confidenceInterval: { lower: number; upper: number };
  plainEnglish: string;
}

export interface PoissonResult {
  observedEvents: number;
  expected: number;
  pValue: number;
  significant: boolean;
}

export interface QualitativeResult {
  type: 'qualitative';
  tags: string[];
  wordCount: number;
  hasVeridical: boolean;
  hasCorroboration: boolean;
  hasTimeline: boolean;
}

// ============================================================================
// BINOMIAL TEST
// ============================================================================

/**
 * Binomial test for proportion data (Ganzfeld, Stargate, etc.)
 * Tests whether observed hit rate differs from expected baseline
 */
export function binomialTest(
  hits: number,
  trials: number,
  expectedProp: number = 0.25
): BinomialResult {
  if (trials <= 0) {
    return {
      observedProportion: 0,
      expectedProportion: expectedProp,
      zScore: 0,
      pValue: 1,
      significant: false,
      effectObserved: false,
      effectSize: 0,
      confidenceInterval: { lower: 0, upper: 0 },
      plainEnglish: 'No trials conducted.',
    };
  }

  const observedProp = hits / trials;
  const se = Math.sqrt((expectedProp * (1 - expectedProp)) / trials);

  if (se === 0) {
    return {
      observedProportion: observedProp,
      expectedProportion: expectedProp,
      zScore: 0,
      pValue: 1,
      significant: false,
      effectObserved: false,
      effectSize: 0,
      confidenceInterval: { lower: observedProp, upper: observedProp },
      plainEnglish: 'Unable to calculate - check baseline.',
    };
  }

  const zScore = (observedProp - expectedProp) / se;
  const pValue = 2 * (1 - normalCDF(Math.abs(zScore))); // two-tailed
  const effectSize = cohensHInternal(observedProp, expectedProp);
  const ci = wilsonIntervalInternal(hits, trials);
  const significant = pValue < 0.05;
  const effectObserved = observedProp > expectedProp && significant;

  // Generate plain English summary
  const plainEnglish = generatePlainEnglish(
    hits, trials, observedProp, expectedProp, pValue, significant, effectObserved
  );

  return {
    observedProportion: observedProp,
    expectedProportion: expectedProp,
    zScore,
    pValue,
    significant,
    effectObserved,
    effectSize,
    confidenceInterval: ci,
    plainEnglish,
  };
}

/**
 * Generate plain English explanation of results
 */
function generatePlainEnglish(
  hits: number,
  trials: number,
  observed: number,
  expected: number,
  pValue: number,
  significant: boolean,
  effectObserved: boolean
): string {
  const percent = (observed * 100).toFixed(1);
  const expectedPercent = (expected * 100).toFixed(0);

  if (effectObserved) {
    return `${hits}/${trials} hits (${percent}%) vs ${expectedPercent}% expected. Statistically significant above chance (p = ${formatPValue(pValue)}).`;
  } else if (significant && observed < expected) {
    return `${hits}/${trials} hits (${percent}%) vs ${expectedPercent}% expected. Significantly below chance (p = ${formatPValue(pValue)}).`;
  } else {
    return `${hits}/${trials} hits (${percent}%) vs ${expectedPercent}% expected. Not statistically significant (p = ${formatPValue(pValue)}).`;
  }
}

/**
 * Internal Cohen's h for binomialTest
 */
function cohensHInternal(observed: number, expected: number): number {
  const phi1 = 2 * Math.asin(Math.sqrt(Math.max(0, Math.min(1, observed))));
  const phi2 = 2 * Math.asin(Math.sqrt(Math.max(0, Math.min(1, expected))));
  return Math.abs(phi1 - phi2);
}

/**
 * Internal Wilson interval for binomialTest
 */
function wilsonIntervalInternal(hits: number, trials: number): { lower: number; upper: number } {
  if (trials <= 0) return { lower: 0, upper: 0 };
  const z = 1.96;
  const p = hits / trials;
  const denominator = 1 + (z * z) / trials;
  const center = p + (z * z) / (2 * trials);
  const margin = z * Math.sqrt((p * (1 - p) + (z * z) / (4 * trials)) / trials);
  return {
    lower: Math.max(0, (center - margin) / denominator),
    upper: Math.min(1, (center + margin) / denominator),
  };
}

/**
 * Normal CDF approximation (Abramowitz & Stegun)
 * Used for p-value calculations
 */
function normalCDF(z: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = z < 0 ? -1 : 1;
  z = Math.abs(z) / Math.sqrt(2);

  const t = 1.0 / (1.0 + p * z);
  const y = 1.0 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-z * z);

  return 0.5 * (1.0 + sign * y);
}

/**
 * Wilson score interval for confidence bounds
 * More accurate than normal approximation for small samples
 */
export function wilsonInterval(
  hits: number,
  trials: number,
  confidence: number = 0.95
): {
  lower: number;
  upper: number;
} {
  if (trials <= 0) {
    return { lower: 0, upper: 0 };
  }

  // z-score for 95% CI
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

/**
 * Cohen's h effect size for proportions
 * Measures the magnitude of difference between observed and expected
 * h = 0.2 small, h = 0.5 medium, h = 0.8 large
 */
export function cohensH(observed: number, expected: number): number {
  const phi1 = 2 * Math.asin(Math.sqrt(Math.max(0, Math.min(1, observed))));
  const phi2 = 2 * Math.asin(Math.sqrt(Math.max(0, Math.min(1, expected))));
  return Math.abs(phi1 - phi2);
}

/**
 * Poisson test for temporal clustering (geophysical anomalies)
 * Tests whether observed events exceed expected rate
 */
export function poissonTest(
  observedEvents: number,
  expectedRate: number,
  timeWindow: number
): {
  observedEvents: number;
  expected: number;
  pValue: number;
  significant: boolean;
} {
  const expected = expectedRate * timeWindow;

  if (expected <= 0) {
    return {
      observedEvents,
      expected: 0,
      pValue: 1,
      significant: false,
    };
  }

  // P(X >= k) for Poisson distribution
  const pValue = 1 - poissonCDF(observedEvents - 1, expected);

  return {
    observedEvents,
    expected,
    pValue,
    significant: pValue < 0.05,
  };
}

/**
 * Poisson CDF approximation
 */
function poissonCDF(k: number, lambda: number): number {
  if (k < 0) return 0;

  let sum = 0;
  for (let i = 0; i <= k; i++) {
    sum += poissonPMF(i, lambda);
  }
  return Math.min(1, sum);
}

/**
 * Poisson probability mass function
 */
function poissonPMF(k: number, lambda: number): number {
  if (k < 0 || lambda <= 0) return 0;
  return (Math.pow(lambda, k) * Math.exp(-lambda)) / factorial(k);
}

/**
 * Factorial with memoization
 */
const factorialCache: Record<number, number> = { 0: 1, 1: 1 };
function factorial(n: number): number {
  if (n < 0) return 1;
  if (n in factorialCache) return factorialCache[n];

  let result = 1;
  for (let i = 2; i <= n; i++) {
    result *= i;
    factorialCache[i] = result;
  }
  return result;
}

/**
 * Format p-value for display
 */
export function formatPValue(p: number): string {
  if (p < 0.001) return '< 0.001';
  if (p < 0.01) return p.toFixed(3);
  if (p < 0.05) return p.toFixed(3);
  return p.toFixed(2);
}

/**
 * Get significance interpretation
 */
export function getSignificanceLevel(p: number): {
  level: 'highly_significant' | 'significant' | 'marginally_significant' | 'not_significant';
  label: string;
} {
  if (p < 0.001) {
    return { level: 'highly_significant', label: 'Highly Significant' };
  }
  if (p < 0.01) {
    return { level: 'significant', label: 'Significant' };
  }
  if (p < 0.05) {
    return { level: 'marginally_significant', label: 'Marginally Significant' };
  }
  return { level: 'not_significant', label: 'Not Significant' };
}

/**
 * Get effect size interpretation for Cohen's h
 */
export function getEffectSizeInterpretation(h: number): {
  level: 'negligible' | 'small' | 'medium' | 'large';
  label: string;
} {
  if (h < 0.2) {
    return { level: 'negligible', label: 'Negligible' };
  }
  if (h < 0.5) {
    return { level: 'small', label: 'Small' };
  }
  if (h < 0.8) {
    return { level: 'medium', label: 'Medium' };
  }
  return { level: 'large', label: 'Large' };
}

// ============================================================================
// QUALITATIVE ANALYSIS
// ============================================================================

/**
 * Qualitative coding for NDE/Crisis Apparition reports
 * Returns structured tags rather than p-values
 */
export function qualitativeCoding(description: string): QualitativeResult {
  const lowerDesc = description.toLowerCase();
  const tags: string[] = [];

  // Check for veridical perception
  const hasVeridical = /veridical|verified|confirmed|accurate/i.test(description) ||
    /saw.*that.*later.*confirmed/i.test(description);
  if (hasVeridical) tags.push('veridical');

  // Check for corroboration
  const hasCorroboration = /witness|corroborate|independent|multiple/i.test(description) ||
    /others.*also.*saw/i.test(description);
  if (hasCorroboration) tags.push('corroborated');

  // Check for timeline matching
  const hasTimeline = /same.*time|exact.*moment|time.*of.*death|simultaneously/i.test(description);
  if (hasTimeline) tags.push('timeline-match');

  // Additional feature tags
  if (/out.*of.*body|obe|floating|above/i.test(lowerDesc)) tags.push('obe-reported');
  if (/tunnel|light|bright/i.test(lowerDesc)) tags.push('light-encounter');
  if (/deceased|dead.*relative|loved.*one/i.test(lowerDesc)) tags.push('deceased-contact');
  if (/life.*review|entire.*life/i.test(lowerDesc)) tags.push('life-review');
  if (/peace|calm|love|warmth/i.test(lowerDesc)) tags.push('positive-affect');
  if (/fear|terror|dark|negative/i.test(lowerDesc)) tags.push('negative-affect');

  return {
    type: 'qualitative',
    tags,
    wordCount: description.split(/\s+/).filter(Boolean).length,
    hasVeridical,
    hasCorroboration,
    hasTimeline,
  };
}

// ============================================================================
// UI HELPER FUNCTIONS
// ============================================================================

/**
 * Get p-value explanation with color for UI
 */
export function getPValueExplanation(p: number): {
  text: string;
  color: string;
} {
  if (p < 0.001) {
    return { text: 'Highly significant', color: 'text-emerald-400' };
  }
  if (p < 0.01) {
    return { text: 'Very significant', color: 'text-emerald-400' };
  }
  if (p < 0.05) {
    return { text: 'Significant', color: 'text-amber-400' };
  }
  if (p < 0.10) {
    return { text: 'Marginally significant', color: 'text-orange-400' };
  }
  return { text: 'Not significant', color: 'text-zinc-400' };
}

/**
 * Get effect size label for display
 */
export function getEffectSizeLabel(h: number): string {
  if (h < 0.2) return 'Negligible';
  if (h < 0.5) return 'Small';
  if (h < 0.8) return 'Medium';
  return 'Large';
}
