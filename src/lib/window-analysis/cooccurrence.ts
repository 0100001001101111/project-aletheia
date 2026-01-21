// @ts-nocheck
/**
 * Co-occurrence analysis types and utilities
 */

export interface PairingResult {
  name: string;
  observed: number;
  expected: number;
  stdDev: number;
  zScore: number;
  pValue: number;
  ratio: number;
}

/**
 * Stratified result for a single population quartile
 */
export interface StratifiedPairingResult {
  quartile: number;
  cellCount: number;
  pairings: {
    ufoBigfoot: PairingResult;
    ufoHaunting: PairingResult;
    bigfootHaunting: PairingResult;
    triple: PairingResult;
  };
}

/**
 * Multi-resolution analysis result
 */
export interface MultiResolutionResult {
  resolution: number;
  resolutionKm: number;
  totalCells: number;
  result: CooccurrenceResult;
  stratifiedResults?: StratifiedPairingResult[];
}

export interface CooccurrenceResult {
  id?: string;
  analysisDate: Date;
  gridResolution: number;
  shuffleCount: number;

  // Raw counts
  totalCells: number;
  cellsWithUfo: number;
  cellsWithBigfoot: number;
  cellsWithHaunting: number;

  // Pairing results
  pairings: {
    ufoBigfoot: PairingResult;
    ufoHaunting: PairingResult;
    bigfootHaunting: PairingResult;
    triple: PairingResult;
  };

  // Summary
  strongestPairing: string;
  strongestZScore: number;
  windowEffectDetected: boolean;

  // Metadata
  computationTimeMs?: number;
  notes?: string;
}

/**
 * Calculate z-score from observed vs expected
 */
export function calculateZScore(observed: number, expected: number, stdDev: number): number {
  if (stdDev === 0) return 0;
  return (observed - expected) / stdDev;
}

/**
 * Calculate two-tailed p-value from z-score
 * Uses normal distribution approximation
 */
export function calculatePValue(zScore: number): number {
  // Standard normal CDF approximation
  const absZ = Math.abs(zScore);

  // Abramowitz and Stegun approximation
  const t = 1 / (1 + 0.2316419 * absZ);
  const d = 0.3989423 * Math.exp(-absZ * absZ / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));

  // Two-tailed p-value
  return 2 * p;
}

/**
 * Determine if window effect is detected based on z-scores
 * Threshold: z > 2 (roughly p < 0.05) for at least one pairing
 */
export function detectWindowEffect(pairings: CooccurrenceResult['pairings']): boolean {
  const threshold = 2.0;
  return (
    pairings.ufoBigfoot.zScore > threshold ||
    pairings.ufoHaunting.zScore > threshold ||
    pairings.bigfootHaunting.zScore > threshold ||
    pairings.triple.zScore > threshold
  );
}

/**
 * Find the strongest pairing by z-score
 */
export function findStrongestPairing(
  pairings: CooccurrenceResult['pairings']
): { name: string; zScore: number } {
  const entries = [
    { name: 'UFO + Bigfoot', zScore: pairings.ufoBigfoot.zScore },
    { name: 'UFO + Haunting', zScore: pairings.ufoHaunting.zScore },
    { name: 'Bigfoot + Haunting', zScore: pairings.bigfootHaunting.zScore },
    { name: 'Triple (All Three)', zScore: pairings.triple.zScore },
  ];

  return entries.reduce((max, curr) =>
    curr.zScore > max.zScore ? curr : max
  );
}

/**
 * Create a pairing result from Monte Carlo simulation data
 */
export function createPairingResult(
  name: string,
  observed: number,
  simulationResults: number[]
): PairingResult {
  const n = simulationResults.length;
  const expected = simulationResults.reduce((a, b) => a + b, 0) / n;

  // Calculate standard deviation
  const variance = simulationResults.reduce((sum, val) =>
    sum + Math.pow(val - expected, 2), 0
  ) / n;
  const stdDev = Math.sqrt(variance);

  const zScore = calculateZScore(observed, expected, stdDev);
  const pValue = calculatePValue(zScore);
  const ratio = expected > 0 ? observed / expected : 0;

  return {
    name,
    observed,
    expected,
    stdDev,
    zScore,
    pValue,
    ratio,
  };
}

/**
 * Interpret the effect size
 */
export function interpretEffectSize(ratio: number): string {
  if (ratio < 1.2) return 'No window effect';
  if (ratio < 1.5) return 'Weak effect, likely confounded';
  if (ratio < 2.0) return 'Moderate effect';
  return 'Strong clustering effect';
}
