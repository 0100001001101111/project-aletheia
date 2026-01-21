// @ts-nocheck
/**
 * Temporal analysis - cross-correlation between phenomenon types over time
 * Tests whether sightings of one type predict sightings of another
 */

export interface TemporalBin {
  startDate: Date;
  endDate: Date;
  ufoCount: number;
  bigfootCount: number;
  hauntingCount: number;
}

export interface CrossCorrelationResult {
  lag: number; // Positive = first phenomenon leads
  correlation: number;
}

export interface TemporalAnalysisResult {
  analysisDate: Date;
  timeBinDays: number;
  lagRangeDays: number;

  // Cross-correlation results
  ufoBigfoot: {
    correlation: number;
    optimalLag: number;
    pValue: number;
    correlationCurve: CrossCorrelationResult[];
  };
  ufoHaunting: {
    correlation: number;
    optimalLag: number;
    pValue: number;
    correlationCurve: CrossCorrelationResult[];
  };
  bigfootHaunting: {
    correlation: number;
    optimalLag: number;
    pValue: number;
    correlationCurve: CrossCorrelationResult[];
  };

  // Interpretation
  temporalPatternDetected: boolean;
  interpretation: string;
  dataQualityNotes: string;
}

/**
 * Bin events into time periods
 */
export function binEventsByTime(
  events: Array<{ date: Date; type: 'ufo' | 'bigfoot' | 'haunting' }>,
  binSizeDays: number,
  startDate: Date,
  endDate: Date
): TemporalBin[] {
  const bins: TemporalBin[] = [];
  const binSizeMs = binSizeDays * 24 * 60 * 60 * 1000;

  let currentStart = new Date(startDate);

  while (currentStart < endDate) {
    const currentEnd = new Date(currentStart.getTime() + binSizeMs);

    const bin: TemporalBin = {
      startDate: new Date(currentStart),
      endDate: currentEnd,
      ufoCount: 0,
      bigfootCount: 0,
      hauntingCount: 0,
    };

    // Count events in this bin
    for (const event of events) {
      if (event.date >= currentStart && event.date < currentEnd) {
        switch (event.type) {
          case 'ufo':
            bin.ufoCount++;
            break;
          case 'bigfoot':
            bin.bigfootCount++;
            break;
          case 'haunting':
            bin.hauntingCount++;
            break;
        }
      }
    }

    bins.push(bin);
    currentStart = currentEnd;
  }

  return bins;
}

/**
 * Calculate Pearson correlation coefficient
 */
function pearsonCorrelation(x: number[], y: number[]): number {
  const n = x.length;
  if (n === 0 || n !== y.length) return 0;

  const meanX = x.reduce((a, b) => a + b, 0) / n;
  const meanY = y.reduce((a, b) => a + b, 0) / n;

  let num = 0;
  let denomX = 0;
  let denomY = 0;

  for (let i = 0; i < n; i++) {
    const dx = x[i] - meanX;
    const dy = y[i] - meanY;
    num += dx * dy;
    denomX += dx * dx;
    denomY += dy * dy;
  }

  const denom = Math.sqrt(denomX * denomY);
  if (denom === 0) return 0;

  return num / denom;
}

/**
 * Calculate cross-correlation at various lags
 */
export function crossCorrelation(
  series1: number[],
  series2: number[],
  maxLag: number
): CrossCorrelationResult[] {
  const results: CrossCorrelationResult[] = [];

  for (let lag = -maxLag; lag <= maxLag; lag++) {
    let x: number[], y: number[];

    if (lag >= 0) {
      // series1 leads series2
      x = series1.slice(0, series1.length - lag);
      y = series2.slice(lag);
    } else {
      // series2 leads series1
      x = series1.slice(-lag);
      y = series2.slice(0, series2.length + lag);
    }

    const correlation = pearsonCorrelation(x, y);
    results.push({ lag, correlation });
  }

  return results;
}

/**
 * Find optimal lag (highest absolute correlation)
 */
function findOptimalLag(correlations: CrossCorrelationResult[]): { lag: number; correlation: number } {
  return correlations.reduce((best, curr) =>
    Math.abs(curr.correlation) > Math.abs(best.correlation) ? curr : best
  );
}

/**
 * Approximate p-value for correlation coefficient
 */
function correlationPValue(r: number, n: number): number {
  if (n < 3) return 1;

  const t = r * Math.sqrt((n - 2) / (1 - r * r));
  const absT = Math.abs(t);

  // Two-tailed p-value using normal approximation
  const z = absT / Math.sqrt(1 + absT * absT / (2 * (n - 2)));
  return 2 * (1 - normalCDF(z));
}

function normalCDF(x: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989423 * Math.exp(-x * x / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return x > 0 ? 1 - p : p;
}

/**
 * Run temporal analysis on binned data
 */
export function analyzeTemporalPatterns(
  bins: TemporalBin[],
  binSizeDays: number,
  maxLagBins: number = 6
): TemporalAnalysisResult {
  const ufo = bins.map(b => b.ufoCount);
  const bigfoot = bins.map(b => b.bigfootCount);
  const haunting = bins.map(b => b.hauntingCount);

  const n = bins.length;

  // Cross-correlations
  const ufoBigfootCorr = crossCorrelation(ufo, bigfoot, maxLagBins);
  const ufoHauntingCorr = crossCorrelation(ufo, haunting, maxLagBins);
  const bigfootHauntingCorr = crossCorrelation(bigfoot, haunting, maxLagBins);

  const ufoBigfootOptimal = findOptimalLag(ufoBigfootCorr);
  const ufoHauntingOptimal = findOptimalLag(ufoHauntingCorr);
  const bigfootHauntingOptimal = findOptimalLag(bigfootHauntingCorr);

  // Calculate p-values
  const effectiveN = Math.max(n - Math.abs(ufoBigfootOptimal.lag), 3);
  const pUfoBigfoot = correlationPValue(ufoBigfootOptimal.correlation, effectiveN);
  const pUfoHaunting = correlationPValue(ufoHauntingOptimal.correlation, effectiveN);
  const pBigfootHaunting = correlationPValue(bigfootHauntingOptimal.correlation, effectiveN);

  // Determine if pattern detected (any correlation significant at p < 0.05)
  const temporalPatternDetected =
    pUfoBigfoot < 0.05 || pUfoHaunting < 0.05 || pBigfootHaunting < 0.05;

  // Generate interpretation
  let interpretation = '';
  if (!temporalPatternDetected) {
    interpretation = 'No significant temporal correlations detected between phenomenon types.';
  } else {
    const patterns: string[] = [];
    if (pUfoBigfoot < 0.05) {
      const direction = ufoBigfootOptimal.lag > 0 ? 'UFO sightings precede' : 'UFO sightings follow';
      patterns.push(`${direction} Bigfoot sightings by ~${Math.abs(ufoBigfootOptimal.lag * binSizeDays)} days (r=${ufoBigfootOptimal.correlation.toFixed(3)})`);
    }
    if (pUfoHaunting < 0.05) {
      const direction = ufoHauntingOptimal.lag > 0 ? 'UFO sightings precede' : 'UFO sightings follow';
      patterns.push(`${direction} Haunting reports by ~${Math.abs(ufoHauntingOptimal.lag * binSizeDays)} days (r=${ufoHauntingOptimal.correlation.toFixed(3)})`);
    }
    if (pBigfootHaunting < 0.05) {
      const direction = bigfootHauntingOptimal.lag > 0 ? 'Bigfoot sightings precede' : 'Bigfoot sightings follow';
      patterns.push(`${direction} Haunting reports by ~${Math.abs(bigfootHauntingOptimal.lag * binSizeDays)} days (r=${bigfootHauntingOptimal.correlation.toFixed(3)})`);
    }
    interpretation = patterns.join('; ');
  }

  // Data quality notes
  const dataQualityNotes = n < 24
    ? 'Warning: Limited time bins may reduce statistical power.'
    : n < 52
      ? 'Moderate sample size; interpret with caution.'
      : 'Adequate sample size for temporal analysis.';

  return {
    analysisDate: new Date(),
    timeBinDays: binSizeDays,
    lagRangeDays: maxLagBins * binSizeDays,
    ufoBigfoot: {
      correlation: ufoBigfootOptimal.correlation,
      optimalLag: ufoBigfootOptimal.lag * binSizeDays,
      pValue: pUfoBigfoot,
      correlationCurve: ufoBigfootCorr.map(c => ({
        lag: c.lag * binSizeDays,
        correlation: c.correlation,
      })),
    },
    ufoHaunting: {
      correlation: ufoHauntingOptimal.correlation,
      optimalLag: ufoHauntingOptimal.lag * binSizeDays,
      pValue: pUfoHaunting,
      correlationCurve: ufoHauntingCorr.map(c => ({
        lag: c.lag * binSizeDays,
        correlation: c.correlation,
      })),
    },
    bigfootHaunting: {
      correlation: bigfootHauntingOptimal.correlation,
      optimalLag: bigfootHauntingOptimal.lag * binSizeDays,
      pValue: pBigfootHaunting,
      correlationCurve: bigfootHauntingCorr.map(c => ({
        lag: c.lag * binSizeDays,
        correlation: c.correlation,
      })),
    },
    temporalPatternDetected,
    interpretation,
    dataQualityNotes,
  };
}

/**
 * Convert result to database format
 */
export function temporalResultToDbFormat(result: TemporalAnalysisResult): Record<string, unknown> {
  return {
    analysis_date: result.analysisDate.toISOString(),
    time_bin_days: result.timeBinDays,
    lag_range_days: result.lagRangeDays,
    ufo_bigfoot_correlation: result.ufoBigfoot.correlation,
    ufo_bigfoot_optimal_lag: result.ufoBigfoot.optimalLag,
    ufo_haunting_correlation: result.ufoHaunting.correlation,
    ufo_haunting_optimal_lag: result.ufoHaunting.optimalLag,
    bigfoot_haunting_correlation: result.bigfootHaunting.correlation,
    bigfoot_haunting_optimal_lag: result.bigfootHaunting.optimalLag,
    p_ufo_bigfoot: result.ufoBigfoot.pValue,
    p_ufo_haunting: result.ufoHaunting.pValue,
    p_bigfoot_haunting: result.bigfootHaunting.pValue,
    correlation_data: {
      ufoBigfoot: result.ufoBigfoot.correlationCurve,
      ufoHaunting: result.ufoHaunting.correlationCurve,
      bigfootHaunting: result.bigfootHaunting.correlationCurve,
    },
    temporal_pattern_detected: result.temporalPatternDetected,
    interpretation: result.interpretation,
    data_quality_notes: result.dataQualityNotes,
  };
}

// ============================================================================
// WITHIN-CELL TEMPORAL CORRELATION ANALYSIS
// ============================================================================

export interface CellTemporalData {
  cellId: string;
  lat: number;
  lng: number;
  events: Array<{
    date: Date;
    type: 'ufo' | 'bigfoot' | 'haunting';
  }>;
  monthlyTimeSeries: {
    months: string[]; // YYYY-MM format
    ufo: number[];
    bigfoot: number[];
    haunting: number[];
  };
  dateRange: {
    earliest: Date;
    latest: Date;
    spanMonths: number;
  };
  totalCount: number;
  typeCount: number;
}

export interface CellCorrelationResult {
  cellId: string;
  lat: number;
  lng: number;
  totalEvents: number;
  spanMonths: number;
  typesPresent: string[];
  correlations: {
    ufoBigfoot?: {
      r: number;
      pValue: number;
      optimalLag: number;
      lagCorrelations: Array<{ lag: number; r: number }>;
    };
    ufoHaunting?: {
      r: number;
      pValue: number;
      optimalLag: number;
      lagCorrelations: Array<{ lag: number; r: number }>;
    };
    bigfootHaunting?: {
      r: number;
      pValue: number;
      optimalLag: number;
      lagCorrelations: Array<{ lag: number; r: number }>;
    };
  };
  maxCorrelation: number;
  isTemporalWindow: boolean; // r > 0.5 for any pair
}

export interface WithinCellTemporalAnalysis {
  analysisDate: Date;
  resolution: number;
  qualifyingCellCount: number;
  excludedCells: {
    insufficientTypes: number;
    insufficientReports: number;
    insufficientTimespan: number;
  };
  aggregateStats: {
    ufoBigfoot: {
      meanR: number;
      stdR: number;
      tStat: number;
      pValue: number;
      strongPositive: number; // count with r > 0.3
      strongNegative: number; // count with r < -0.3
      cellCount: number;
    };
    ufoHaunting: {
      meanR: number;
      stdR: number;
      tStat: number;
      pValue: number;
      strongPositive: number;
      strongNegative: number;
      cellCount: number;
    };
    bigfootHaunting: {
      meanR: number;
      stdR: number;
      tStat: number;
      pValue: number;
      strongPositive: number;
      strongNegative: number;
      cellCount: number;
    };
  };
  topFlapCells: CellCorrelationResult[];
  temporalWindowEffectDetected: boolean;
  interpretation: string;
}

/**
 * Convert a date to YYYY-MM format
 */
function toMonthKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * Generate all months between two dates
 */
function generateMonthRange(start: Date, end: Date): string[] {
  const months: string[] = [];
  const current = new Date(start.getFullYear(), start.getMonth(), 1);
  const endMonth = new Date(end.getFullYear(), end.getMonth(), 1);

  while (current <= endMonth) {
    months.push(toMonthKey(current));
    current.setMonth(current.getMonth() + 1);
  }

  return months;
}

/**
 * Build monthly time series for a cell
 */
export function buildCellTimeSeries(
  cellId: string,
  lat: number,
  lng: number,
  events: Array<{ date: Date; type: 'ufo' | 'bigfoot' | 'haunting' }>,
  globalMonthRange: string[]
): CellTemporalData {
  // Count events by month and type
  const monthlyCounts: Map<string, { ufo: number; bigfoot: number; haunting: number }> = new Map();

  // Initialize all months with zeros
  for (const month of globalMonthRange) {
    monthlyCounts.set(month, { ufo: 0, bigfoot: 0, haunting: 0 });
  }

  // Count events
  let earliest: Date | null = null;
  let latest: Date | null = null;
  const typesPresent = new Set<string>();

  for (const event of events) {
    const monthKey = toMonthKey(event.date);
    const counts = monthlyCounts.get(monthKey);
    if (counts) {
      counts[event.type]++;
      typesPresent.add(event.type);

      if (!earliest || event.date < earliest) earliest = event.date;
      if (!latest || event.date > latest) latest = event.date;
    }
  }

  // Build arrays
  const ufo: number[] = [];
  const bigfoot: number[] = [];
  const haunting: number[] = [];

  for (const month of globalMonthRange) {
    const counts = monthlyCounts.get(month)!;
    ufo.push(counts.ufo);
    bigfoot.push(counts.bigfoot);
    haunting.push(counts.haunting);
  }

  // Calculate span in months
  const spanMonths = earliest && latest
    ? (latest.getFullYear() - earliest.getFullYear()) * 12 + (latest.getMonth() - earliest.getMonth()) + 1
    : 0;

  return {
    cellId,
    lat,
    lng,
    events,
    monthlyTimeSeries: {
      months: globalMonthRange,
      ufo,
      bigfoot,
      haunting,
    },
    dateRange: {
      earliest: earliest || new Date(),
      latest: latest || new Date(),
      spanMonths,
    },
    totalCount: events.length,
    typeCount: typesPresent.size,
  };
}

/**
 * Calculate correlation with lag for two series
 */
function correlationWithLag(
  series1: number[],
  series2: number[],
  maxLagMonths: number = 6
): { r: number; pValue: number; optimalLag: number; lagCorrelations: Array<{ lag: number; r: number }> } {
  const lagCorrelations: Array<{ lag: number; r: number }> = [];

  for (let lag = -maxLagMonths; lag <= maxLagMonths; lag++) {
    let x: number[], y: number[];

    if (lag >= 0) {
      x = series1.slice(0, series1.length - lag || undefined);
      y = series2.slice(lag);
    } else {
      x = series1.slice(-lag);
      y = series2.slice(0, series2.length + lag || undefined);
    }

    if (x.length < 6) continue; // Need at least 6 points

    const r = pearsonCorrelation(x, y);
    lagCorrelations.push({ lag, r });
  }

  if (lagCorrelations.length === 0) {
    return { r: 0, pValue: 1, optimalLag: 0, lagCorrelations: [] };
  }

  // Find optimal lag (highest absolute correlation)
  const optimal = lagCorrelations.reduce((best, curr) =>
    Math.abs(curr.r) > Math.abs(best.r) ? curr : best
  );

  // Calculate p-value for optimal correlation
  const n = Math.max(series1.length - Math.abs(optimal.lag), 6);
  const pValue = correlationPValue(optimal.r, n);

  return {
    r: optimal.r,
    pValue,
    optimalLag: optimal.lag,
    lagCorrelations,
  };
}

/**
 * Calculate within-cell correlations
 */
export function calculateCellCorrelations(
  cellData: CellTemporalData,
  maxLagMonths: number = 6
): CellCorrelationResult {
  const { ufo, bigfoot, haunting } = cellData.monthlyTimeSeries;

  const hasUfo = ufo.some(c => c > 0);
  const hasBigfoot = bigfoot.some(c => c > 0);
  const hasHaunting = haunting.some(c => c > 0);

  const typesPresent: string[] = [];
  if (hasUfo) typesPresent.push('ufo');
  if (hasBigfoot) typesPresent.push('bigfoot');
  if (hasHaunting) typesPresent.push('haunting');

  const correlations: CellCorrelationResult['correlations'] = {};

  // UFO vs Bigfoot
  if (hasUfo && hasBigfoot) {
    correlations.ufoBigfoot = correlationWithLag(ufo, bigfoot, maxLagMonths);
  }

  // UFO vs Haunting
  if (hasUfo && hasHaunting) {
    correlations.ufoHaunting = correlationWithLag(ufo, haunting, maxLagMonths);
  }

  // Bigfoot vs Haunting
  if (hasBigfoot && hasHaunting) {
    correlations.bigfootHaunting = correlationWithLag(bigfoot, haunting, maxLagMonths);
  }

  // Find max correlation
  const allCorrs = [
    correlations.ufoBigfoot?.r ?? 0,
    correlations.ufoHaunting?.r ?? 0,
    correlations.bigfootHaunting?.r ?? 0,
  ];
  const maxCorrelation = Math.max(...allCorrs.map(Math.abs));

  return {
    cellId: cellData.cellId,
    lat: cellData.lat,
    lng: cellData.lng,
    totalEvents: cellData.totalCount,
    spanMonths: cellData.dateRange.spanMonths,
    typesPresent,
    correlations,
    maxCorrelation,
    isTemporalWindow: maxCorrelation > 0.5,
  };
}

/**
 * One-sample t-test for mean different from zero
 */
function oneSampleTTest(values: number[]): { tStat: number; pValue: number } {
  const n = values.length;
  if (n < 2) return { tStat: 0, pValue: 1 };

  const mean = values.reduce((a, b) => a + b, 0) / n;
  const variance = values.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0) / (n - 1);
  const se = Math.sqrt(variance / n);

  if (se === 0) return { tStat: 0, pValue: 1 };

  const tStat = mean / se;
  const pValue = 2 * (1 - normalCDF(Math.abs(tStat)));

  return { tStat, pValue };
}

/**
 * Calculate aggregate statistics for a set of correlations
 */
function calculateAggregateStats(
  correlations: number[]
): { meanR: number; stdR: number; tStat: number; pValue: number; strongPositive: number; strongNegative: number; cellCount: number } {
  if (correlations.length === 0) {
    return {
      meanR: 0,
      stdR: 0,
      tStat: 0,
      pValue: 1,
      strongPositive: 0,
      strongNegative: 0,
      cellCount: 0,
    };
  }

  const n = correlations.length;
  const meanR = correlations.reduce((a, b) => a + b, 0) / n;
  const variance = correlations.reduce((sum, x) => sum + Math.pow(x - meanR, 2), 0) / (n - 1 || 1);
  const stdR = Math.sqrt(variance);

  const { tStat, pValue } = oneSampleTTest(correlations);

  const strongPositive = correlations.filter(r => r > 0.3).length;
  const strongNegative = correlations.filter(r => r < -0.3).length;

  return {
    meanR,
    stdR,
    tStat,
    pValue,
    strongPositive,
    strongNegative,
    cellCount: n,
  };
}

/**
 * Run full within-cell temporal analysis
 */
// ============================================================================
// SEASONAL CONFOUND ANALYSIS
// ============================================================================

export interface SeasonalDistribution {
  monthCounts: number[]; // Index 0 = January, 11 = December
  totalCount: number;
  chiSquare: number;
  pValue: number;
  isSeasonallyDistributed: boolean; // p < 0.05 means NOT uniform
  peakMonth: number; // 0-11
  troughMonth: number;
  peakToTroughRatio: number;
}

export interface SeasonalAnalysisResult {
  ufoSeasonality: SeasonalDistribution;
  bigfootSeasonality: SeasonalDistribution;
  rawCorrelation: {
    meanR: number;
    pValue: number;
    cellCount: number;
  };
  deseasonalizedCorrelation: {
    meanR: number;
    pValue: number;
    cellCount: number;
  };
  seasonalConfoundDetected: boolean;
  interpretation: string;
}

/**
 * Chi-square test for uniform distribution across 12 months
 */
function chiSquareUniformTest(observed: number[]): { chiSquare: number; pValue: number } {
  const total = observed.reduce((a, b) => a + b, 0);
  if (total === 0) return { chiSquare: 0, pValue: 1 };

  const expected = total / 12;
  let chiSquare = 0;

  for (const obs of observed) {
    chiSquare += Math.pow(obs - expected, 2) / expected;
  }

  // Chi-square p-value approximation (df = 11)
  // Using Wilson-Hilferty approximation
  const df = 11;
  const z = Math.pow(chiSquare / df, 1/3) - (1 - 2/(9*df));
  const denominator = Math.sqrt(2/(9*df));
  const zScore = z / denominator;

  const pValue = 1 - normalCDF(zScore);

  return { chiSquare, pValue };
}

/**
 * Calculate seasonal distribution for a set of events
 */
export function calculateSeasonalDistribution(
  events: Array<{ date: Date }>
): SeasonalDistribution {
  const monthCounts = new Array(12).fill(0);

  for (const event of events) {
    const month = event.date.getMonth(); // 0-11
    monthCounts[month]++;
  }

  const totalCount = events.length;
  const { chiSquare, pValue } = chiSquareUniformTest(monthCounts);

  // Find peak and trough
  let peakMonth = 0;
  let troughMonth = 0;
  let maxCount = monthCounts[0];
  let minCount = monthCounts[0];

  for (let i = 1; i < 12; i++) {
    if (monthCounts[i] > maxCount) {
      maxCount = monthCounts[i];
      peakMonth = i;
    }
    if (monthCounts[i] < minCount) {
      minCount = monthCounts[i];
      troughMonth = i;
    }
  }

  const peakToTroughRatio = minCount > 0 ? maxCount / minCount : maxCount > 0 ? Infinity : 1;

  return {
    monthCounts,
    totalCount,
    chiSquare,
    pValue,
    isSeasonallyDistributed: pValue < 0.05,
    peakMonth,
    troughMonth,
    peakToTroughRatio,
  };
}

/**
 * Calculate seasonal factors (average count per month-of-year across all years)
 */
function calculateSeasonalFactors(
  timeSeries: number[],
  months: string[]
): number[] {
  // months is array of "YYYY-MM" strings
  const monthTotals = new Array(12).fill(0);
  const monthCounts = new Array(12).fill(0);

  for (let i = 0; i < months.length; i++) {
    const monthOfYear = parseInt(months[i].split('-')[1]) - 1; // 0-11
    monthTotals[monthOfYear] += timeSeries[i];
    monthCounts[monthOfYear]++;
  }

  // Calculate average for each month-of-year
  const seasonalFactors: number[] = [];
  for (let m = 0; m < 12; m++) {
    seasonalFactors.push(monthCounts[m] > 0 ? monthTotals[m] / monthCounts[m] : 0);
  }

  return seasonalFactors;
}

/**
 * Deseasonalize a time series by subtracting the seasonal component
 */
export function deseasonalizeTimeSeries(
  timeSeries: number[],
  months: string[]
): number[] {
  const seasonalFactors = calculateSeasonalFactors(timeSeries, months);

  const deseasonalized: number[] = [];
  for (let i = 0; i < months.length; i++) {
    const monthOfYear = parseInt(months[i].split('-')[1]) - 1;
    deseasonalized.push(timeSeries[i] - seasonalFactors[monthOfYear]);
  }

  return deseasonalized;
}

/**
 * Run seasonal confound analysis on cell temporal data
 */
export function runSeasonalConfoundAnalysis(
  cellData: CellTemporalData[],
  rawCellCorrelations: CellCorrelationResult[]
): SeasonalAnalysisResult {
  // 1. Aggregate all events by phenomenon type
  const allUfoEvents: Array<{ date: Date }> = [];
  const allBigfootEvents: Array<{ date: Date }> = [];

  for (const cell of cellData) {
    for (const event of cell.events) {
      if (event.type === 'ufo') {
        allUfoEvents.push({ date: event.date });
      } else if (event.type === 'bigfoot') {
        allBigfootEvents.push({ date: event.date });
      }
    }
  }

  // 2. Calculate seasonal distributions
  const ufoSeasonality = calculateSeasonalDistribution(allUfoEvents);
  const bigfootSeasonality = calculateSeasonalDistribution(allBigfootEvents);

  // 3. Get raw correlation stats (already calculated)
  const rawCorrs = rawCellCorrelations
    .filter(c => c.correlations.ufoBigfoot)
    .map(c => c.correlations.ufoBigfoot!.r);

  const rawMeanR = rawCorrs.length > 0
    ? rawCorrs.reduce((a, b) => a + b, 0) / rawCorrs.length
    : 0;
  const rawTTest = oneSampleTTest(rawCorrs);

  // 4. Calculate deseasonalized correlations for each cell
  const deseasonalizedCorrs: number[] = [];

  for (const cell of cellData) {
    const { ufo, bigfoot } = cell.monthlyTimeSeries;
    const months = cell.monthlyTimeSeries.months;

    // Check if cell has both types
    const hasUfo = ufo.some(c => c > 0);
    const hasBigfoot = bigfoot.some(c => c > 0);
    if (!hasUfo || !hasBigfoot) continue;

    // Deseasonalize
    const ufoDeseasonalized = deseasonalizeTimeSeries(ufo, months);
    const bigfootDeseasonalized = deseasonalizeTimeSeries(bigfoot, months);

    // Calculate correlation on deseasonalized data
    const r = pearsonCorrelation(ufoDeseasonalized, bigfootDeseasonalized);
    if (!isNaN(r)) {
      deseasonalizedCorrs.push(r);
    }
  }

  const deseasonalizedMeanR = deseasonalizedCorrs.length > 0
    ? deseasonalizedCorrs.reduce((a, b) => a + b, 0) / deseasonalizedCorrs.length
    : 0;
  const deseasonalizedTTest = oneSampleTTest(deseasonalizedCorrs);

  // 5. Determine if seasonal confound exists
  // Confound detected if:
  // - Both phenomena show seasonality (p < 0.05)
  // - AND deseasonalized correlation is significantly lower than raw
  const bothSeasonal = ufoSeasonality.isSeasonallyDistributed && bigfootSeasonality.isSeasonallyDistributed;
  const correlationDrop = rawMeanR - deseasonalizedMeanR;
  const significantDrop = correlationDrop > 0.03 && deseasonalizedTTest.pValue > 0.05;
  const seasonalConfoundDetected = bothSeasonal && significantDrop;

  // 6. Generate interpretation
  let interpretation = '';

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                      'July', 'August', 'September', 'October', 'November', 'December'];

  if (!ufoSeasonality.isSeasonallyDistributed && !bigfootSeasonality.isSeasonallyDistributed) {
    interpretation = 'Neither phenomenon shows significant seasonality. Temporal correlation is not confounded by seasonal patterns.';
  } else if (ufoSeasonality.isSeasonallyDistributed && !bigfootSeasonality.isSeasonallyDistributed) {
    interpretation = `UFO sightings peak in ${monthNames[ufoSeasonality.peakMonth]} but Bigfoot shows no seasonality. Partial seasonal pattern present.`;
  } else if (!ufoSeasonality.isSeasonallyDistributed && bigfootSeasonality.isSeasonallyDistributed) {
    interpretation = `Bigfoot sightings peak in ${monthNames[bigfootSeasonality.peakMonth]} but UFO shows no seasonality. Partial seasonal pattern present.`;
  } else {
    // Both seasonal
    if (seasonalConfoundDetected) {
      interpretation = `SEASONAL CONFOUND DETECTED: UFO peaks in ${monthNames[ufoSeasonality.peakMonth]}, Bigfoot peaks in ${monthNames[bigfootSeasonality.peakMonth]}. ` +
        `Raw correlation (r=${rawMeanR.toFixed(3)}) drops to r=${deseasonalizedMeanR.toFixed(3)} after deseasonalization (no longer significant). ` +
        `The temporal correlation is explained by shared seasonality, not a window effect.`;
    } else {
      interpretation = `Both phenomena show seasonality (UFO peaks ${monthNames[ufoSeasonality.peakMonth]}, Bigfoot peaks ${monthNames[bigfootSeasonality.peakMonth]}), ` +
        `but deseasonalized correlation remains significant (r=${deseasonalizedMeanR.toFixed(3)}, p=${deseasonalizedTTest.pValue.toFixed(4)}). ` +
        `Temporal window effect SURVIVES seasonal control.`;
    }
  }

  return {
    ufoSeasonality,
    bigfootSeasonality,
    rawCorrelation: {
      meanR: rawMeanR,
      pValue: rawTTest.pValue,
      cellCount: rawCorrs.length,
    },
    deseasonalizedCorrelation: {
      meanR: deseasonalizedMeanR,
      pValue: deseasonalizedTTest.pValue,
      cellCount: deseasonalizedCorrs.length,
    },
    seasonalConfoundDetected,
    interpretation,
  };
}
export function runWithinCellTemporalAnalysis(
  cellResults: CellCorrelationResult[],
  resolution: number,
  excludedCounts: { insufficientTypes: number; insufficientReports: number; insufficientTimespan: number }
): WithinCellTemporalAnalysis {
  // Extract correlations by pair
  const ufoBigfootCorrs: number[] = [];
  const ufoHauntingCorrs: number[] = [];
  const bigfootHauntingCorrs: number[] = [];

  for (const cell of cellResults) {
    if (cell.correlations.ufoBigfoot) {
      ufoBigfootCorrs.push(cell.correlations.ufoBigfoot.r);
    }
    if (cell.correlations.ufoHaunting) {
      ufoHauntingCorrs.push(cell.correlations.ufoHaunting.r);
    }
    if (cell.correlations.bigfootHaunting) {
      bigfootHauntingCorrs.push(cell.correlations.bigfootHaunting.r);
    }
  }

  // Calculate aggregate stats
  const aggregateStats = {
    ufoBigfoot: calculateAggregateStats(ufoBigfootCorrs),
    ufoHaunting: calculateAggregateStats(ufoHauntingCorrs),
    bigfootHaunting: calculateAggregateStats(bigfootHauntingCorrs),
  };

  // Find top flap cells (highest max correlation)
  const topFlapCells = [...cellResults]
    .filter(c => c.isTemporalWindow)
    .sort((a, b) => b.maxCorrelation - a.maxCorrelation)
    .slice(0, 10);

  // Determine if temporal window effect detected
  const temporalWindowEffectDetected =
    aggregateStats.ufoBigfoot.pValue < 0.05 ||
    aggregateStats.ufoHaunting.pValue < 0.05 ||
    aggregateStats.bigfootHaunting.pValue < 0.05;

  // Generate interpretation
  let interpretation = '';
  if (!temporalWindowEffectDetected) {
    interpretation = 'No significant mean temporal correlation detected. Phenomena timing appears independent within cells.';
  } else {
    const patterns: string[] = [];
    if (aggregateStats.ufoBigfoot.pValue < 0.05) {
      const direction = aggregateStats.ufoBigfoot.meanR > 0 ? 'positively' : 'negatively';
      patterns.push(`UFO-Bigfoot ${direction} correlated (mean r=${aggregateStats.ufoBigfoot.meanR.toFixed(3)}, p=${aggregateStats.ufoBigfoot.pValue.toFixed(4)})`);
    }
    if (aggregateStats.ufoHaunting.pValue < 0.05) {
      const direction = aggregateStats.ufoHaunting.meanR > 0 ? 'positively' : 'negatively';
      patterns.push(`UFO-Haunting ${direction} correlated (mean r=${aggregateStats.ufoHaunting.meanR.toFixed(3)}, p=${aggregateStats.ufoHaunting.pValue.toFixed(4)})`);
    }
    if (aggregateStats.bigfootHaunting.pValue < 0.05) {
      const direction = aggregateStats.bigfootHaunting.meanR > 0 ? 'positively' : 'negatively';
      patterns.push(`Bigfoot-Haunting ${direction} correlated (mean r=${aggregateStats.bigfootHaunting.meanR.toFixed(3)}, p=${aggregateStats.bigfootHaunting.pValue.toFixed(4)})`);
    }
    interpretation = patterns.join('. ');
  }

  return {
    analysisDate: new Date(),
    resolution,
    qualifyingCellCount: cellResults.length,
    excludedCells: excludedCounts,
    aggregateStats,
    topFlapCells,
    temporalWindowEffectDetected,
    interpretation,
  };
}
