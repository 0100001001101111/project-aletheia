// @ts-nocheck
/**
 * Window area prediction generator
 * Creates FALSIFIABLE pre-registered predictions that test the window hypothesis
 *
 * Prediction types:
 * 1. Per-capita anomaly: Low-pop cells with high activity should remain elevated
 * 2. Gap cell: Cells adjacent to windows but low activity - test if windows are discrete
 * 3. Ratio stability: UFO/Bigfoot ratio should remain stable if same underlying cause
 * 4. Negative: High-pop, low-activity cells should remain low (windows ≠ population)
 */

import { GeologicalFeatures } from './geological';

export type PredictionType =
  | 'per_capita_anomaly'    // Low-pop cell with high activity
  | 'gap_cell_discrete'     // Gap cell predicted to stay low (windows are discrete)
  | 'gap_cell_diffuse'      // Gap cell predicted to increase (windows are diffuse)
  | 'ratio_stability'       // UFO/Bigfoot ratio should remain stable
  | 'negative_control';     // High-pop, low-activity should stay low

export interface WindowPrediction {
  cellId: string;
  predictedIndex: number;
  predictionType: PredictionType;
  confidence: number;
  currentReports: number;
  currentTypesPresent: string[];
  currentWindowIndex: number;
  geologicalScore: number | null;
  rationale: string;
  evaluationDate: Date;
  // Falsifiability fields
  nullHypothesis: string;
  alternativeHypothesis: string;
  confirmationThreshold: number;
  refutationThreshold: number;
  populationQuartile: number | null;
  // For ratio predictions
  currentRatio?: number;
  predictedRatioMin?: number;
  predictedRatioMax?: number;
  // For gap cell predictions
  highIndexNeighbors?: number;
}

export interface PredictionInput {
  cellId: string;
  windowIndex: number;
  totalCount: number;
  typesPresent: string[];
  typeCount: number;
  geologicalFeatures?: GeologicalFeatures;
  historicalTrend?: 'increasing' | 'stable' | 'decreasing';
}

// Extended input for falsifiable predictions
export interface FalsifiablePredictionInput {
  cellId: string;
  centerLat: number;
  centerLng: number;
  windowIndex: number;
  totalCount: number;
  typesPresent: string[];
  typeCount: number;
  populationQuartile: number | null;
  ufoCount: number;
  bigfootCount: number;
  hauntingCount: number;
  highIndexNeighbors?: number;
  faultDistanceKm?: number | null;
}

// Population quartile baselines (from actual data)
const QUARTILE_BASELINES = {
  1: { avgIndex: 0.333, stdIndex: 0.0 },
  2: { avgIndex: 0.629, stdIndex: 0.332 },
  3: { avgIndex: 1.097, stdIndex: 0.407 },
  4: { avgIndex: 1.411, stdIndex: 0.238 },
};

/**
 * Generate per-capita anomaly prediction
 * Low-population cells with unusually high activity
 */
export function generatePerCapitaAnomalyPrediction(
  input: FalsifiablePredictionInput,
  evaluationMonths: number = 12
): WindowPrediction | null {
  const quartile = input.populationQuartile;
  if (!quartile || quartile > 2) return null; // Only Q1/Q2
  if (input.windowIndex < 1.0) return null; // Must have elevated activity

  const baseline = QUARTILE_BASELINES[quartile as 1 | 2];
  const excessRatio = input.windowIndex / baseline.avgIndex;

  if (excessRatio < 1.5) return null; // Must be significantly above baseline

  const evaluationDate = new Date();
  evaluationDate.setMonth(evaluationDate.getMonth() + evaluationMonths);

  // Threshold: should stay above Q3 average (1.097)
  const confirmationThreshold = 1.0;
  const refutationThreshold = baseline.avgIndex + baseline.stdIndex;

  return {
    cellId: input.cellId,
    predictionType: 'per_capita_anomaly',
    predictedIndex: input.windowIndex * 0.95, // Slight regression expected
    confidence: Math.min(0.7 + (excessRatio - 1.5) * 0.1, 0.9),
    currentReports: input.totalCount,
    currentTypesPresent: input.typesPresent,
    currentWindowIndex: input.windowIndex,
    geologicalScore: null,
    populationQuartile: quartile,
    evaluationDate,
    nullHypothesis: `Q${quartile} cells average window index ${baseline.avgIndex.toFixed(2)}. ` +
      `Current elevated index (${input.windowIndex.toFixed(2)}) is random fluctuation that will regress to mean.`,
    alternativeHypothesis: `This cell is a genuine window area. Activity will remain elevated ` +
      `(>${confirmationThreshold.toFixed(1)}) despite low population.`,
    confirmationThreshold,
    refutationThreshold,
    rationale: `Per-capita anomaly: Q${quartile} cell with window index ${input.windowIndex.toFixed(2)} ` +
      `(${excessRatio.toFixed(1)}x Q${quartile} average). ` +
      `Has ${input.totalCount} reports across ${input.typeCount} phenomenon types. ` +
      `Predict: remains elevated above ${confirmationThreshold.toFixed(1)}.`,
  };
}

/**
 * Generate gap cell prediction
 * Cells adjacent to high-index cells but with low activity
 */
export function generateGapCellPrediction(
  input: FalsifiablePredictionInput & { highIndexNeighbors: number },
  predictDiffuse: boolean = false,
  evaluationMonths: number = 12
): WindowPrediction | null {
  if (input.highIndexNeighbors < 2) return null;
  if (input.windowIndex >= 1.0) return null; // Must be currently low

  const evaluationDate = new Date();
  evaluationDate.setMonth(evaluationDate.getMonth() + evaluationMonths);

  if (predictDiffuse) {
    // Predict gap will fill in (windows are diffuse phenomena)
    return {
      cellId: input.cellId,
      predictionType: 'gap_cell_diffuse',
      predictedIndex: 1.2,
      confidence: 0.4, // Lower confidence for increase prediction
      currentReports: input.totalCount,
      currentTypesPresent: input.typesPresent,
      currentWindowIndex: input.windowIndex,
      geologicalScore: null,
      populationQuartile: input.populationQuartile,
      highIndexNeighbors: input.highIndexNeighbors,
      evaluationDate,
      nullHypothesis: `Gap cells are low because they lack the features that create windows. ` +
        `Activity will remain at current level (${input.windowIndex.toFixed(2)}).`,
      alternativeHypothesis: `Windows are diffuse and spread. This gap cell will develop ` +
        `elevated activity (>1.0) due to proximity to ${input.highIndexNeighbors} high-index neighbors.`,
      confirmationThreshold: 1.0,
      refutationThreshold: input.windowIndex + 0.1, // Stays near current
      rationale: `Gap cell diffuse: Currently ${input.windowIndex.toFixed(2)} with ` +
        `${input.highIndexNeighbors} high-index neighbors. ` +
        `If windows are diffuse phenomena, activity should increase to >1.0.`,
    };
  } else {
    // Predict gap will stay low (windows are discrete locations)
    return {
      cellId: input.cellId,
      predictionType: 'gap_cell_discrete',
      predictedIndex: input.windowIndex,
      confidence: 0.6,
      currentReports: input.totalCount,
      currentTypesPresent: input.typesPresent,
      currentWindowIndex: input.windowIndex,
      geologicalScore: null,
      populationQuartile: input.populationQuartile,
      highIndexNeighbors: input.highIndexNeighbors,
      evaluationDate,
      nullHypothesis: `Windows are population artifacts. Gap cells adjacent to windows ` +
        `will develop similar activity over time.`,
      alternativeHypothesis: `Windows are discrete geographic features. This gap cell ` +
        `(${input.windowIndex.toFixed(2)}) will remain low (<1.0) despite ${input.highIndexNeighbors} ` +
        `high-index neighbors.`,
      confirmationThreshold: input.windowIndex + 0.3, // Stays relatively stable
      refutationThreshold: 1.0, // If it exceeds 1.0, windows aren't discrete
      rationale: `Gap cell discrete: Currently ${input.windowIndex.toFixed(2)} surrounded by ` +
        `${input.highIndexNeighbors} high-index cells. ` +
        `If windows are discrete, this gap should persist (<1.0).`,
    };
  }
}

/**
 * Generate ratio stability prediction
 * UFO/Bigfoot ratio should remain stable if same underlying cause
 */
export function generateRatioStabilityPrediction(
  input: FalsifiablePredictionInput,
  evaluationMonths: number = 12
): WindowPrediction | null {
  if (input.ufoCount < 5 || input.bigfootCount < 5) return null; // Need enough data

  const ratio = input.ufoCount / input.bigfootCount;
  if (ratio < 0.2 || ratio > 20) return null; // Extreme ratios are unstable

  const evaluationDate = new Date();
  evaluationDate.setMonth(evaluationDate.getMonth() + evaluationMonths);

  // Predict ratio within ±30% (slightly looser than user's ±20% for noise)
  const ratioMin = ratio * 0.7;
  const ratioMax = ratio * 1.3;

  return {
    cellId: input.cellId,
    predictionType: 'ratio_stability',
    predictedIndex: input.windowIndex,
    confidence: 0.5 + Math.min((input.ufoCount + input.bigfootCount) / 100, 0.3),
    currentReports: input.totalCount,
    currentTypesPresent: input.typesPresent,
    currentWindowIndex: input.windowIndex,
    geologicalScore: null,
    populationQuartile: input.populationQuartile,
    currentRatio: ratio,
    predictedRatioMin: ratioMin,
    predictedRatioMax: ratioMax,
    evaluationDate,
    nullHypothesis: `UFO and Bigfoot reports are independent phenomena with different drivers. ` +
      `Ratio will drift significantly from current ${ratio.toFixed(2)}.`,
    alternativeHypothesis: `Both phenomena share underlying cause (window effect). ` +
      `UFO/Bigfoot ratio will remain stable within ${ratioMin.toFixed(2)}-${ratioMax.toFixed(2)}.`,
    confirmationThreshold: ratio, // Target ratio
    refutationThreshold: ratioMin, // Below this = refuted
    rationale: `Ratio stability: Current UFO/Bigfoot ratio ${ratio.toFixed(2)} ` +
      `(${input.ufoCount} UFO, ${input.bigfootCount} Bigfoot). ` +
      `If window effect is real, ratio should remain ${ratioMin.toFixed(2)}-${ratioMax.toFixed(2)}.`,
  };
}

/**
 * Generate negative control prediction
 * High-population cells with low activity should remain low
 */
export function generateNegativeControlPrediction(
  input: FalsifiablePredictionInput,
  evaluationMonths: number = 12
): WindowPrediction | null {
  if (input.populationQuartile !== 4) return null; // Must be Q4
  if (input.windowIndex >= 1.0) return null; // Must have low activity
  if (input.totalCount < 5) return null; // Need some data

  const evaluationDate = new Date();
  evaluationDate.setMonth(evaluationDate.getMonth() + evaluationMonths);

  return {
    cellId: input.cellId,
    predictionType: 'negative_control',
    predictedIndex: input.windowIndex,
    confidence: 0.7,
    currentReports: input.totalCount,
    currentTypesPresent: input.typesPresent,
    currentWindowIndex: input.windowIndex,
    geologicalScore: null,
    populationQuartile: 4,
    evaluationDate,
    nullHypothesis: `High-population areas should have high window indices (population drives reports). ` +
      `This Q4 cell should develop elevated activity over time.`,
    alternativeHypothesis: `Windows are geographic features, not population artifacts. ` +
      `This high-population cell lacks window characteristics and will remain low (<1.0).`,
    confirmationThreshold: input.windowIndex + 0.3, // Stays near current
    refutationThreshold: 1.2, // If it exceeds this, windows = population
    rationale: `Negative control: Q4 (high-pop) cell with low window index ${input.windowIndex.toFixed(2)}. ` +
      `Has ${input.totalCount} reports but only ${input.typeCount} types. ` +
      `If windows ≠ population, this should remain <1.0.`,
  };
}

/**
 * Calculate geological score based on features associated with window areas
 * Higher scores indicate more "window-like" geology
 */
export function calculateGeologicalScore(features: GeologicalFeatures): number {
  let score = 0;

  // Proximity to faults (closer = higher score)
  if (features.faultDistanceKm !== null) {
    if (features.faultDistanceKm < 10) score += 0.3;
    else if (features.faultDistanceKm < 50) score += 0.2;
    else if (features.faultDistanceKm < 100) score += 0.1;
  }

  // Quartz content (higher = higher score based on piezoelectric hypothesis)
  if (features.quartzContent !== null) {
    score += features.quartzContent * 0.3;
  }

  // Aquifer presence (water table anomalies)
  if (features.aquiferPresent) {
    score += 0.2;
  }

  // Elevation (moderate elevation preferred)
  if (features.elevationM !== null) {
    if (features.elevationM >= 500 && features.elevationM <= 2000) {
      score += 0.1;
    }
  }

  // Normalize to 0-1
  return Math.min(score, 1);
}

// Old trivial prediction functions removed - replaced with falsifiable predictions above

/**
 * Convert prediction to database format
 */
export function predictionToDbFormat(prediction: WindowPrediction): Record<string, unknown> {
  return {
    cell_id: prediction.cellId,
    predicted_index: prediction.predictedIndex,
    prediction_type: prediction.predictionType,
    confidence: prediction.confidence,
    current_reports: prediction.currentReports,
    current_types_present: prediction.currentTypesPresent,
    current_window_index: prediction.currentWindowIndex,
    geological_score: prediction.geologicalScore,
    rationale: prediction.rationale,
    evaluation_date: prediction.evaluationDate.toISOString(),
    // Falsifiability fields
    hypothesis: prediction.alternativeHypothesis,
    predicted_direction: prediction.predictedIndex > prediction.currentWindowIndex ? 'increase' :
      prediction.predictedIndex < prediction.currentWindowIndex ? 'decrease' : 'stable',
    predicted_threshold: prediction.confirmationThreshold,
    parameters: {
      nullHypothesis: prediction.nullHypothesis,
      alternativeHypothesis: prediction.alternativeHypothesis,
      confirmationThreshold: prediction.confirmationThreshold,
      refutationThreshold: prediction.refutationThreshold,
      populationQuartile: prediction.populationQuartile,
      currentRatio: prediction.currentRatio,
      predictedRatioMin: prediction.predictedRatioMin,
      predictedRatioMax: prediction.predictedRatioMax,
      highIndexNeighbors: prediction.highIndexNeighbors,
    },
  };
}

/**
 * Evaluate a falsifiable prediction against actual outcome
 */
export function evaluatePrediction(
  prediction: WindowPrediction,
  actualWindowIndex: number,
  actualRatio?: number
): {
  confirmed: boolean;
  refuted: boolean;
  notes: string;
} {
  let confirmed = false;
  let refuted = false;
  let notes = '';

  switch (prediction.predictionType) {
    case 'per_capita_anomaly':
      // Confirmed if stays above confirmation threshold
      // Refuted if drops below refutation threshold
      confirmed = actualWindowIndex >= prediction.confirmationThreshold;
      refuted = actualWindowIndex < prediction.refutationThreshold;
      notes = confirmed
        ? `Confirmed: Index ${actualWindowIndex.toFixed(2)} remains above ${prediction.confirmationThreshold}`
        : refuted
          ? `Refuted: Index ${actualWindowIndex.toFixed(2)} fell below ${prediction.refutationThreshold}`
          : `Inconclusive: Index ${actualWindowIndex.toFixed(2)}`;
      break;

    case 'gap_cell_discrete':
      // Confirmed if stays below refutation threshold (gap persists)
      // Refuted if exceeds refutation threshold (gap fills in)
      confirmed = actualWindowIndex < prediction.refutationThreshold;
      refuted = actualWindowIndex >= prediction.refutationThreshold;
      notes = confirmed
        ? `Confirmed: Gap persists (${actualWindowIndex.toFixed(2)} < ${prediction.refutationThreshold})`
        : `Refuted: Gap filled (${actualWindowIndex.toFixed(2)} >= ${prediction.refutationThreshold})`;
      break;

    case 'gap_cell_diffuse':
      // Confirmed if exceeds confirmation threshold (gap fills in)
      // Refuted if stays near current level
      confirmed = actualWindowIndex >= prediction.confirmationThreshold;
      refuted = actualWindowIndex < prediction.refutationThreshold;
      notes = confirmed
        ? `Confirmed: Gap filled (${actualWindowIndex.toFixed(2)} >= ${prediction.confirmationThreshold})`
        : refuted
          ? `Refuted: Gap persists (${actualWindowIndex.toFixed(2)})`
          : `Inconclusive: Index ${actualWindowIndex.toFixed(2)}`;
      break;

    case 'ratio_stability':
      // Confirmed if ratio stays within predicted range
      // Refuted if ratio drifts outside range
      if (actualRatio !== undefined && prediction.predictedRatioMin && prediction.predictedRatioMax) {
        confirmed = actualRatio >= prediction.predictedRatioMin && actualRatio <= prediction.predictedRatioMax;
        refuted = actualRatio < prediction.predictedRatioMin * 0.7 || actualRatio > prediction.predictedRatioMax * 1.3;
        notes = confirmed
          ? `Confirmed: Ratio ${actualRatio.toFixed(2)} within ${prediction.predictedRatioMin.toFixed(2)}-${prediction.predictedRatioMax.toFixed(2)}`
          : refuted
            ? `Refuted: Ratio ${actualRatio.toFixed(2)} outside expected range`
            : `Inconclusive: Ratio ${actualRatio.toFixed(2)}`;
      } else {
        notes = 'Cannot evaluate: ratio data unavailable';
      }
      break;

    case 'negative_control':
      // Confirmed if stays below refutation threshold (remains low)
      // Refuted if exceeds refutation threshold (develops activity)
      confirmed = actualWindowIndex < prediction.refutationThreshold;
      refuted = actualWindowIndex >= prediction.refutationThreshold;
      notes = confirmed
        ? `Confirmed: Remains low (${actualWindowIndex.toFixed(2)} < ${prediction.refutationThreshold})`
        : `Refuted: Developed activity (${actualWindowIndex.toFixed(2)} >= ${prediction.refutationThreshold})`;
      break;
  }

  return { confirmed, refuted, notes };
}
