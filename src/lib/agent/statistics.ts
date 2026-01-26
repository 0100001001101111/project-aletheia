/**
 * Aletheia Research Agent - Statistical Test Suite
 * Phase 2: Analysis Engine
 *
 * Implements rigorous statistical tests for hypothesis validation
 */

import type { TestResult } from './types';

// ============================================
// Constants
// ============================================

const DEFAULT_SIGNIFICANCE = 0.01;
const DEFAULT_EFFECT_SIZE = 0.3;

// ============================================
// Helper Functions
// ============================================

/**
 * Calculate mean of an array
 */
export function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

/**
 * Calculate variance of an array
 */
export function variance(arr: number[]): number {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  return arr.reduce((acc, val) => acc + Math.pow(val - m, 2), 0) / (arr.length - 1);
}

/**
 * Calculate standard deviation
 */
export function stdDev(arr: number[]): number {
  return Math.sqrt(variance(arr));
}

/**
 * Calculate z-score
 */
export function zScore(value: number, m: number, sd: number): number {
  if (sd === 0) return 0;
  return (value - m) / sd;
}

/**
 * Standard normal CDF approximation (Abramowitz and Stegun)
 */
export function normalCDF(z: number): number {
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
 * Chi-square CDF approximation using Wilson-Hilferty transformation
 */
export function chiSquareCDF(x: number, df: number): number {
  if (x <= 0) return 0;
  if (df <= 0) return 1;

  // Wilson-Hilferty transformation for approximation
  const z = Math.pow(x / df, 1 / 3) - (1 - 2 / (9 * df));
  const se = Math.sqrt(2 / (9 * df));
  return normalCDF(z / se);
}

/**
 * Gamma function approximation (Stirling's approximation for large values)
 */
function gamma(n: number): number {
  if (n <= 0) return Infinity;
  if (n < 0.5) {
    return Math.PI / (Math.sin(Math.PI * n) * gamma(1 - n));
  }

  n -= 1;
  const g = 7;
  const c = [
    0.99999999999980993,
    676.5203681218851,
    -1259.1392167224028,
    771.32342877765313,
    -176.61502916214059,
    12.507343278686905,
    -0.13857109526572012,
    9.9843695780195716e-6,
    1.5056327351493116e-7,
  ];

  let x = c[0];
  for (let i = 1; i < g + 2; i++) {
    x += c[i] / (n + i);
  }

  const t = n + g + 0.5;
  return Math.sqrt(2 * Math.PI) * Math.pow(t, n + 0.5) * Math.exp(-t) * x;
}

/**
 * Incomplete beta function (regularized)
 */
function incompleteBeta(x: number, a: number, b: number): number {
  if (x === 0) return 0;
  if (x === 1) return 1;

  // Use continued fraction approximation
  const bt =
    x === 0 || x === 1
      ? 0
      : Math.exp(
          a * Math.log(x) +
            b * Math.log(1 - x) -
            Math.log(a) -
            (Math.log(gamma(a)) + Math.log(gamma(b)) - Math.log(gamma(a + b)))
        );

  if (x < (a + 1) / (a + b + 2)) {
    return (bt * betaCF(x, a, b)) / a;
  } else {
    return 1 - (bt * betaCF(1 - x, b, a)) / b;
  }
}

/**
 * Continued fraction for incomplete beta
 */
function betaCF(x: number, a: number, b: number): number {
  const maxIterations = 100;
  const eps = 3e-7;

  const qab = a + b;
  const qap = a + 1;
  const qam = a - 1;

  let c = 1;
  let d = 1 - (qab * x) / qap;
  if (Math.abs(d) < 1e-30) d = 1e-30;
  d = 1 / d;
  let h = d;

  for (let m = 1; m <= maxIterations; m++) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < 1e-30) d = 1e-30;
    c = 1 + aa / c;
    if (Math.abs(c) < 1e-30) c = 1e-30;
    d = 1 / d;
    h *= d * c;

    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < 1e-30) d = 1e-30;
    c = 1 + aa / c;
    if (Math.abs(c) < 1e-30) c = 1e-30;
    d = 1 / d;
    const del = d * c;
    h *= del;

    if (Math.abs(del - 1) < eps) break;
  }

  return h;
}

/**
 * T-distribution CDF using incomplete beta function
 */
export function tDistCDF(t: number, df: number): number {
  const x = df / (df + t * t);
  return 1 - 0.5 * incompleteBeta(x, df / 2, 0.5);
}

// ============================================
// Statistical Tests
// ============================================

/**
 * Chi-square test for categorical comparisons
 * Tests if observed frequencies differ from expected frequencies
 */
export function chiSquareTest(
  observed: number[],
  expected: number[],
  significanceThreshold = DEFAULT_SIGNIFICANCE,
  effectThreshold = DEFAULT_EFFECT_SIZE
): TestResult {
  if (observed.length !== expected.length) {
    throw new Error('Observed and expected arrays must have same length');
  }

  const n = observed.reduce((a, b) => a + b, 0);
  if (n === 0) {
    return {
      test_type: 'chi-square',
      statistic: 0,
      p_value: 1,
      effect_size: 0,
      sample_size: 0,
      passed_threshold: false,
      interpretation: 'No data available for chi-square test',
    };
  }

  // Calculate chi-square statistic
  let chiSquare = 0;
  for (let i = 0; i < observed.length; i++) {
    if (expected[i] > 0) {
      chiSquare += Math.pow(observed[i] - expected[i], 2) / expected[i];
    }
  }

  const df = observed.length - 1;

  // Calculate p-value
  const pValue = 1 - chiSquareCDF(chiSquare, df);

  // Calculate Cramer's V (effect size)
  const k = observed.length;
  const cramersV = Math.sqrt(chiSquare / (n * (k - 1)));

  const passed = pValue < significanceThreshold && cramersV > effectThreshold;

  return {
    test_type: 'chi-square',
    statistic: chiSquare,
    p_value: pValue,
    effect_size: cramersV,
    sample_size: n,
    passed_threshold: passed,
    interpretation: passed
      ? `Significant difference found (χ²=${chiSquare.toFixed(2)}, p=${pValue.toFixed(4)}, V=${cramersV.toFixed(3)})`
      : `No significant difference (χ²=${chiSquare.toFixed(2)}, p=${pValue.toFixed(4)}, V=${cramersV.toFixed(3)})`,
  };
}

/**
 * Independent samples t-test
 * Tests if two groups have different means
 */
export function tTest(
  group1: number[],
  group2: number[],
  significanceThreshold = DEFAULT_SIGNIFICANCE,
  effectThreshold = DEFAULT_EFFECT_SIZE
): TestResult {
  const n1 = group1.length;
  const n2 = group2.length;

  if (n1 < 2 || n2 < 2) {
    return {
      test_type: 't-test',
      statistic: 0,
      p_value: 1,
      effect_size: 0,
      sample_size: n1 + n2,
      passed_threshold: false,
      interpretation: 'Insufficient sample size for t-test (need at least 2 per group)',
    };
  }

  const mean1 = mean(group1);
  const mean2 = mean(group2);
  const var1 = variance(group1);
  const var2 = variance(group2);

  // Welch's t-test (doesn't assume equal variances)
  const se = Math.sqrt(var1 / n1 + var2 / n2);
  if (se === 0) {
    return {
      test_type: 't-test',
      statistic: 0,
      p_value: 1,
      effect_size: 0,
      sample_size: n1 + n2,
      passed_threshold: false,
      interpretation: 'No variance in data',
    };
  }

  const t = (mean1 - mean2) / se;

  // Welch-Satterthwaite degrees of freedom
  const df =
    Math.pow(var1 / n1 + var2 / n2, 2) /
    (Math.pow(var1 / n1, 2) / (n1 - 1) + Math.pow(var2 / n2, 2) / (n2 - 1));

  // Two-tailed p-value
  const pValue = 2 * (1 - tDistCDF(Math.abs(t), df));

  // Cohen's d (effect size)
  const pooledStd = Math.sqrt(((n1 - 1) * var1 + (n2 - 1) * var2) / (n1 + n2 - 2));
  const cohensD = pooledStd > 0 ? Math.abs(mean1 - mean2) / pooledStd : 0;

  const passed = pValue < significanceThreshold && cohensD > effectThreshold;

  return {
    test_type: 't-test',
    statistic: t,
    p_value: pValue,
    effect_size: cohensD,
    sample_size: n1 + n2,
    passed_threshold: passed,
    interpretation: passed
      ? `Significant difference found (t=${t.toFixed(2)}, p=${pValue.toFixed(4)}, d=${cohensD.toFixed(3)})`
      : `No significant difference (t=${t.toFixed(2)}, p=${pValue.toFixed(4)}, d=${cohensD.toFixed(3)})`,
  };
}

/**
 * Mann-Whitney U test (non-parametric alternative to t-test)
 * Tests if one group tends to have larger values than the other
 */
export function mannWhitneyTest(
  group1: number[],
  group2: number[],
  significanceThreshold = DEFAULT_SIGNIFICANCE,
  effectThreshold = DEFAULT_EFFECT_SIZE
): TestResult {
  const n1 = group1.length;
  const n2 = group2.length;

  if (n1 < 2 || n2 < 2) {
    return {
      test_type: 'mann-whitney',
      statistic: 0,
      p_value: 1,
      effect_size: 0,
      sample_size: n1 + n2,
      passed_threshold: false,
      interpretation: 'Insufficient sample size for Mann-Whitney test',
    };
  }

  // Combine and rank
  const combined = [
    ...group1.map((v) => ({ value: v, group: 1 })),
    ...group2.map((v) => ({ value: v, group: 2 })),
  ].sort((a, b) => a.value - b.value);

  // Assign ranks (handling ties)
  const ranks: number[] = [];
  let i = 0;
  while (i < combined.length) {
    let j = i;
    while (j < combined.length && combined[j].value === combined[i].value) {
      j++;
    }
    const avgRank = (i + 1 + j) / 2;
    for (let k = i; k < j; k++) {
      ranks[k] = avgRank;
    }
    i = j;
  }

  // Sum of ranks for group 1
  let R1 = 0;
  for (let k = 0; k < combined.length; k++) {
    if (combined[k].group === 1) {
      R1 += ranks[k];
    }
  }

  // Calculate U statistic
  const U1 = R1 - (n1 * (n1 + 1)) / 2;
  const U2 = n1 * n2 - U1;
  const U = Math.min(U1, U2);

  // Normal approximation for large samples
  const meanU = (n1 * n2) / 2;
  const sigmaU = Math.sqrt((n1 * n2 * (n1 + n2 + 1)) / 12);

  const z = sigmaU > 0 ? (U - meanU) / sigmaU : 0;
  const pValue = 2 * normalCDF(-Math.abs(z));

  // Effect size: rank-biserial correlation
  const effectSize = 1 - (2 * U) / (n1 * n2);

  const passed = pValue < significanceThreshold && Math.abs(effectSize) > effectThreshold;

  return {
    test_type: 'mann-whitney',
    statistic: U,
    p_value: pValue,
    effect_size: Math.abs(effectSize),
    sample_size: n1 + n2,
    passed_threshold: passed,
    interpretation: passed
      ? `Significant difference found (U=${U.toFixed(0)}, p=${pValue.toFixed(4)}, r=${effectSize.toFixed(3)})`
      : `No significant difference (U=${U.toFixed(0)}, p=${pValue.toFixed(4)}, r=${effectSize.toFixed(3)})`,
  };
}

/**
 * Pearson correlation coefficient
 * Tests linear relationship between two continuous variables
 */
export function correlationTest(
  x: number[],
  y: number[],
  significanceThreshold = DEFAULT_SIGNIFICANCE,
  effectThreshold = DEFAULT_EFFECT_SIZE
): TestResult {
  if (x.length !== y.length) {
    throw new Error('Arrays must have same length');
  }

  const n = x.length;
  if (n < 3) {
    return {
      test_type: 'correlation',
      statistic: 0,
      p_value: 1,
      effect_size: 0,
      sample_size: n,
      passed_threshold: false,
      interpretation: 'Insufficient sample size for correlation test',
    };
  }

  const meanX = mean(x);
  const meanY = mean(y);
  const sdX = stdDev(x);
  const sdY = stdDev(y);

  if (sdX === 0 || sdY === 0) {
    return {
      test_type: 'correlation',
      statistic: 0,
      p_value: 1,
      effect_size: 0,
      sample_size: n,
      passed_threshold: false,
      interpretation: 'No variance in one or both variables',
    };
  }

  // Pearson r
  let sumProduct = 0;
  for (let i = 0; i < n; i++) {
    sumProduct += (x[i] - meanX) * (y[i] - meanY);
  }
  const r = sumProduct / ((n - 1) * sdX * sdY);

  // T-statistic for significance
  const t = (r * Math.sqrt(n - 2)) / Math.sqrt(1 - r * r);
  const df = n - 2;

  // Two-tailed p-value
  const pValue = 2 * (1 - tDistCDF(Math.abs(t), df));

  const passed = pValue < significanceThreshold && Math.abs(r) > effectThreshold;

  return {
    test_type: 'correlation',
    statistic: r,
    p_value: pValue,
    effect_size: Math.abs(r),
    sample_size: n,
    passed_threshold: passed,
    interpretation: passed
      ? `Significant correlation found (r=${r.toFixed(3)}, p=${pValue.toFixed(4)})`
      : `No significant correlation (r=${r.toFixed(3)}, p=${pValue.toFixed(4)})`,
  };
}

/**
 * Binomial test
 * Tests if observed proportion differs from expected proportion
 */
export function binomialTest(
  successes: number,
  trials: number,
  expectedProportion: number,
  significanceThreshold = DEFAULT_SIGNIFICANCE,
  effectThreshold = DEFAULT_EFFECT_SIZE
): TestResult {
  if (trials === 0) {
    return {
      test_type: 'binomial',
      statistic: 0,
      p_value: 1,
      effect_size: 0,
      sample_size: 0,
      passed_threshold: false,
      interpretation: 'No trials available',
    };
  }

  const observedProp = successes / trials;

  // Normal approximation for large samples
  const se = Math.sqrt((expectedProportion * (1 - expectedProportion)) / trials);
  if (se === 0) {
    return {
      test_type: 'binomial',
      statistic: observedProp,
      p_value: observedProp === expectedProportion ? 1 : 0,
      effect_size: Math.abs(observedProp - expectedProportion),
      sample_size: trials,
      passed_threshold: false,
      interpretation: 'Expected proportion at boundary',
    };
  }

  const z = (observedProp - expectedProportion) / se;
  const pValue = 2 * normalCDF(-Math.abs(z));

  // Effect size: Cohen's h
  const phi1 = 2 * Math.asin(Math.sqrt(observedProp));
  const phi2 = 2 * Math.asin(Math.sqrt(expectedProportion));
  const cohensH = Math.abs(phi1 - phi2);

  const passed = pValue < significanceThreshold && cohensH > effectThreshold;

  return {
    test_type: 'binomial',
    statistic: z,
    p_value: pValue,
    effect_size: cohensH,
    sample_size: trials,
    passed_threshold: passed,
    interpretation: passed
      ? `Significant deviation from expected (observed=${observedProp.toFixed(3)}, expected=${expectedProportion.toFixed(3)}, p=${pValue.toFixed(4)}, h=${cohensH.toFixed(3)})`
      : `No significant deviation (observed=${observedProp.toFixed(3)}, expected=${expectedProportion.toFixed(3)}, p=${pValue.toFixed(4)})`,
  };
}

/**
 * Monte Carlo simulation for complex hypotheses
 * Generates empirical p-value by comparing observed to null distribution
 */
export function monteCarloTest(
  observedStatistic: number,
  nullDistributionGenerator: () => number,
  iterations = 10000,
  significanceThreshold = DEFAULT_SIGNIFICANCE,
  effectThreshold = DEFAULT_EFFECT_SIZE
): TestResult {
  const nullDistribution: number[] = [];

  for (let i = 0; i < iterations; i++) {
    nullDistribution.push(nullDistributionGenerator());
  }

  // Count how many null values are as extreme as observed
  const moreExtreme = nullDistribution.filter(
    (v) => Math.abs(v) >= Math.abs(observedStatistic)
  ).length;

  const pValue = (moreExtreme + 1) / (iterations + 1); // Add 1 to avoid p=0

  // Effect size: standardized observed statistic
  const nullMean = mean(nullDistribution);
  const nullStd = stdDev(nullDistribution);
  const effectSize = nullStd > 0 ? Math.abs(observedStatistic - nullMean) / nullStd : 0;

  const passed = pValue < significanceThreshold && effectSize > effectThreshold;

  return {
    test_type: 'monte-carlo',
    statistic: observedStatistic,
    p_value: pValue,
    effect_size: effectSize,
    sample_size: iterations,
    passed_threshold: passed,
    interpretation: passed
      ? `Observed value significantly different from null (p=${pValue.toFixed(4)}, z=${effectSize.toFixed(3)})`
      : `Observed value consistent with null distribution (p=${pValue.toFixed(4)})`,
    raw_data: {
      null_mean: nullMean,
      null_std: nullStd,
      iterations,
    },
  };
}

/**
 * Select appropriate test based on data characteristics
 */
export function selectAndRunTest(
  testType: string,
  data: Record<string, unknown>,
  significanceThreshold = DEFAULT_SIGNIFICANCE,
  effectThreshold = DEFAULT_EFFECT_SIZE
): TestResult {
  switch (testType) {
    case 'chi-square':
      return chiSquareTest(
        data.observed as number[],
        data.expected as number[],
        significanceThreshold,
        effectThreshold
      );

    case 't-test':
      return tTest(
        data.group1 as number[],
        data.group2 as number[],
        significanceThreshold,
        effectThreshold
      );

    case 'mann-whitney':
      return mannWhitneyTest(
        data.group1 as number[],
        data.group2 as number[],
        significanceThreshold,
        effectThreshold
      );

    case 'correlation':
      return correlationTest(
        data.x as number[],
        data.y as number[],
        significanceThreshold,
        effectThreshold
      );

    case 'binomial':
      return binomialTest(
        data.successes as number,
        data.trials as number,
        data.expected_proportion as number,
        significanceThreshold,
        effectThreshold
      );

    default:
      throw new Error(`Unknown test type: ${testType}`);
  }
}
