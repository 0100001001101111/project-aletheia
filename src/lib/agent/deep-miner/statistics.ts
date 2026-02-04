/**
 * Deep Miner Statistics Utilities
 * Pure statistical calculations for cross-tabs, effect sizes, etc.
 */

import type {
  ChiSquareResult,
  DescriptiveStats,
  DistributionShape,
  EffectSizeCategory,
  TemporalTrend,
} from './types';

/**
 * Calculate chi-square test for independence
 */
export function chiSquareTest(
  contingencyTable: Record<string, Record<string, number>>
): ChiSquareResult | null {
  const rows = Object.keys(contingencyTable);
  if (rows.length < 2) return null;

  const cols = new Set<string>();
  rows.forEach(row => {
    Object.keys(contingencyTable[row]).forEach(col => cols.add(col));
  });
  const colArray = Array.from(cols);
  if (colArray.length < 2) return null;

  // Calculate totals
  const rowTotals: Record<string, number> = {};
  const colTotals: Record<string, number> = {};
  let grandTotal = 0;

  rows.forEach(row => {
    rowTotals[row] = 0;
    colArray.forEach(col => {
      const count = contingencyTable[row]?.[col] || 0;
      rowTotals[row] += count;
      colTotals[col] = (colTotals[col] || 0) + count;
      grandTotal += count;
    });
  });

  if (grandTotal === 0) return null;

  // Calculate chi-square
  let chiSquare = 0;
  rows.forEach(row => {
    colArray.forEach(col => {
      const observed = contingencyTable[row]?.[col] || 0;
      const expected = (rowTotals[row] * colTotals[col]) / grandTotal;
      if (expected > 0) {
        chiSquare += Math.pow(observed - expected, 2) / expected;
      }
    });
  });

  const df = (rows.length - 1) * (colArray.length - 1);

  // Approximate p-value using chi-square distribution
  const pValue = chiSquarePValue(chiSquare, df);

  // Cramér's V
  const minDim = Math.min(rows.length, colArray.length) - 1;
  const cramersV = minDim > 0 ? Math.sqrt(chiSquare / (grandTotal * minDim)) : 0;

  return {
    chi_square: chiSquare,
    degrees_of_freedom: df,
    p_value: pValue,
    cramers_v: cramersV,
  };
}

/**
 * Approximate p-value for chi-square distribution
 * Using Wilson-Hilferty transformation
 */
function chiSquarePValue(x: number, df: number): number {
  if (df <= 0 || x < 0) return 1;
  if (x === 0) return 1;

  // Wilson-Hilferty approximation
  const z = Math.pow(x / df, 1 / 3) - (1 - 2 / (9 * df));
  const se = Math.sqrt(2 / (9 * df));
  const zScore = z / se;

  // Convert to p-value using normal CDF approximation
  return 1 - normalCDF(zScore);
}

/**
 * Standard normal CDF approximation
 */
function normalCDF(x: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x) / Math.sqrt(2);

  const t = 1.0 / (1.0 + p * x);
  const y =
    1.0 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

  return 0.5 * (1.0 + sign * y);
}

/**
 * Calculate descriptive statistics for numeric array
 */
export function calculateDescriptiveStats(values: number[]): DescriptiveStats | null {
  const filtered = values.filter(v => v !== null && v !== undefined && !isNaN(v));
  if (filtered.length === 0) return null;

  const sorted = [...filtered].sort((a, b) => a - b);
  const n = sorted.length;

  const sum = sorted.reduce((a, b) => a + b, 0);
  const mean = sum / n;

  const median =
    n % 2 === 0
      ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2
      : sorted[Math.floor(n / 2)];

  const variance = sorted.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / n;
  const std_dev = Math.sqrt(variance);

  const percentile_25 = sorted[Math.floor(n * 0.25)];
  const percentile_75 = sorted[Math.floor(n * 0.75)];

  return {
    n,
    mean,
    median,
    std_dev,
    min: sorted[0],
    max: sorted[n - 1],
    percentile_25,
    percentile_75,
  };
}

/**
 * Determine distribution shape from data
 */
export function determineDistributionShape(values: number[]): DistributionShape {
  const stats = calculateDescriptiveStats(values);
  if (!stats || stats.n < 10) return 'unknown';

  // Calculate skewness
  const { mean, std_dev, n } = stats;
  if (std_dev === 0) return 'uniform';

  let skewSum = 0;
  values.forEach(v => {
    if (v !== null && v !== undefined && !isNaN(v)) {
      skewSum += Math.pow((v - mean) / std_dev, 3);
    }
  });
  const skewness = (n / ((n - 1) * (n - 2))) * skewSum;

  // Simple classification
  if (Math.abs(skewness) < 0.5) return 'normal';
  if (skewness > 1) return 'skewed_right';
  if (skewness < -1) return 'skewed_left';
  return 'normal'; // Mild skew treated as approximately normal
}

/**
 * Categorize effect size (Cramér's V)
 */
export function categorizeEffectSize(cramersV: number, df: number): EffectSizeCategory {
  // Cohen's conventions adjusted for df
  // For df=1: small=0.1, medium=0.3, large=0.5
  // For df=2: small=0.07, medium=0.21, large=0.35
  // For df>=3: small=0.06, medium=0.17, large=0.29

  let small: number, medium: number, large: number;

  if (df === 1) {
    small = 0.1;
    medium = 0.3;
    large = 0.5;
  } else if (df === 2) {
    small = 0.07;
    medium = 0.21;
    large = 0.35;
  } else {
    small = 0.06;
    medium = 0.17;
    large = 0.29;
  }

  if (cramersV >= large) return 'large';
  if (cramersV >= medium) return 'medium';
  if (cramersV >= small) return 'small';
  return 'negligible';
}

/**
 * Detect outliers using IQR method
 */
export function detectOutliersIQR(values: number[]): { outliers: number[]; indices: number[] } {
  const stats = calculateDescriptiveStats(values);
  if (!stats) return { outliers: [], indices: [] };

  const iqr = stats.percentile_75 - stats.percentile_25;
  const lowerBound = stats.percentile_25 - 1.5 * iqr;
  const upperBound = stats.percentile_75 + 1.5 * iqr;

  const outliers: number[] = [];
  const indices: number[] = [];

  values.forEach((v, i) => {
    if (v !== null && v !== undefined && !isNaN(v)) {
      if (v < lowerBound || v > upperBound) {
        outliers.push(v);
        indices.push(i);
      }
    }
  });

  return { outliers, indices };
}

/**
 * Detect outliers using Z-score method
 */
export function detectOutliersZScore(
  values: number[],
  threshold: number = 3
): { outliers: number[]; indices: number[]; zScores: number[] } {
  const stats = calculateDescriptiveStats(values);
  if (!stats || stats.std_dev === 0) return { outliers: [], indices: [], zScores: [] };

  const outliers: number[] = [];
  const indices: number[] = [];
  const zScores: number[] = [];

  values.forEach((v, i) => {
    if (v !== null && v !== undefined && !isNaN(v)) {
      const z = Math.abs((v - stats.mean) / stats.std_dev);
      if (z > threshold) {
        outliers.push(v);
        indices.push(i);
        zScores.push(z);
      }
    }
  });

  return { outliers, indices, zScores };
}

/**
 * Determine temporal trend from time series
 */
export function determineTrend(periods: { period: string; value: number }[]): {
  trend: TemporalTrend;
  stability_score: number;
} {
  if (periods.length < 3) {
    return { trend: 'insufficient_data', stability_score: 0 };
  }

  const values = periods.map(p => p.value);
  const n = values.length;

  // Calculate linear regression slope
  const xMean = (n - 1) / 2;
  const yMean = values.reduce((a, b) => a + b, 0) / n;

  let numerator = 0;
  let denominator = 0;

  values.forEach((y, x) => {
    numerator += (x - xMean) * (y - yMean);
    denominator += Math.pow(x - xMean, 2);
  });

  const slope = denominator !== 0 ? numerator / denominator : 0;

  // Calculate R-squared for stability
  const yPredicted = values.map((_, x) => yMean + slope * (x - xMean));
  const ssRes = values.reduce((acc, y, i) => acc + Math.pow(y - yPredicted[i], 2), 0);
  const ssTot = values.reduce((acc, y) => acc + Math.pow(y - yMean, 2), 0);
  const rSquared = ssTot !== 0 ? 1 - ssRes / ssTot : 0;

  // Calculate coefficient of variation for stability
  const stats = calculateDescriptiveStats(values);
  const cv = stats ? stats.std_dev / Math.abs(stats.mean) : 1;

  // Stability score: 1 - CV, capped between 0 and 1
  const stability_score = Math.max(0, Math.min(1, 1 - cv));

  // Determine trend
  // Use slope magnitude relative to mean
  const relativeSlope = stats ? Math.abs(slope) / Math.abs(stats.mean) : 0;

  let trend: TemporalTrend;
  if (relativeSlope < 0.02 && cv < 0.15) {
    trend = 'stable';
  } else if (slope > 0 && relativeSlope > 0.05) {
    trend = 'increasing';
  } else if (slope < 0 && relativeSlope > 0.05) {
    trend = 'decreasing';
  } else if (cv > 0.3) {
    trend = 'fluctuating';
  } else {
    trend = 'stable';
  }

  return { trend, stability_score };
}

/**
 * Calculate confidence interval for a proportion
 */
export function proportionCI(
  successes: number,
  total: number,
  confidence: number = 0.95
): { lower: number; upper: number } {
  if (total === 0) return { lower: 0, upper: 0 };

  const p = successes / total;
  const z = confidence === 0.95 ? 1.96 : confidence === 0.99 ? 2.576 : 1.645;
  const se = Math.sqrt((p * (1 - p)) / total);

  return {
    lower: Math.max(0, p - z * se),
    upper: Math.min(1, p + z * se),
  };
}

/**
 * Format p-value for display
 */
export function formatPValue(p: number): string {
  if (p < 0.001) return '< 0.001';
  if (p < 0.01) return `${p.toFixed(3)}`;
  return p.toFixed(2);
}

/**
 * Significance stars
 */
export function significanceStars(p: number): string {
  if (p < 0.001) return '***';
  if (p < 0.01) return '**';
  if (p < 0.05) return '*';
  return '(ns)';
}
