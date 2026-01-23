
/**
 * Monte Carlo simulation engine for co-occurrence analysis
 * Tests null hypothesis: phenomenon types are randomly distributed
 */

import {
  GridCell,
  countCooccurrences,
  assignPopulationQuartiles,
  getCellsByQuartile,
  RESOLUTION_KM,
  Resolution,
} from './grid';
import {
  CooccurrenceResult,
  createPairingResult,
  detectWindowEffect,
  findStrongestPairing,
  StratifiedPairingResult,
  MultiResolutionResult,
} from './cooccurrence';

export interface MonteCarloOptions {
  shuffleCount: number;
  gridResolution: number;
  onProgress?: (iteration: number, total: number) => void;
}

/**
 * Shuffle phenomenon labels across cells while preserving geography
 * This tests if co-occurrence exceeds random chance
 */
function shuffleLabels(cells: Map<string, GridCell>): Map<string, GridCell> {
  const cellArray = Array.from(cells.values());

  // Collect all phenomenon assignments
  const ufoAssignments: number[] = [];
  const bigfootAssignments: number[] = [];
  const hauntingAssignments: number[] = [];

  for (const cell of cellArray) {
    ufoAssignments.push(cell.ufoCount);
    bigfootAssignments.push(cell.bigfootCount);
    hauntingAssignments.push(cell.hauntingCount);
  }

  // Fisher-Yates shuffle each array independently
  shuffleArray(ufoAssignments);
  shuffleArray(bigfootAssignments);
  shuffleArray(hauntingAssignments);

  // Create new cells with shuffled assignments
  const shuffledCells = new Map<string, GridCell>();

  cellArray.forEach((cell, i) => {
    const shuffledCell: GridCell = {
      ...cell,
      ufoCount: ufoAssignments[i],
      bigfootCount: bigfootAssignments[i],
      hauntingCount: hauntingAssignments[i],
      totalCount: ufoAssignments[i] + bigfootAssignments[i] + hauntingAssignments[i],
      typesPresent: [],
      typeCount: 0,
    };

    // Recalculate types present
    const types: string[] = [];
    if (shuffledCell.ufoCount > 0) types.push('ufo');
    if (shuffledCell.bigfootCount > 0) types.push('bigfoot');
    if (shuffledCell.hauntingCount > 0) types.push('haunting');
    shuffledCell.typesPresent = types;
    shuffledCell.typeCount = types.length;

    shuffledCells.set(cell.cellId, shuffledCell);
  });

  return shuffledCells;
}

/**
 * Fisher-Yates shuffle in place
 */
function shuffleArray<T>(array: T[]): void {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

/**
 * Run Monte Carlo simulation
 */
export async function runMonteCarloSimulation(
  observedCells: Map<string, GridCell>,
  options: MonteCarloOptions
): Promise<CooccurrenceResult> {
  const startTime = Date.now();
  const { shuffleCount, gridResolution, onProgress } = options;

  // Get observed co-occurrences
  const observed = countCooccurrences(observedCells);

  // Run simulations
  const simResults = {
    ufoBigfoot: [] as number[],
    ufoHaunting: [] as number[],
    bigfootHaunting: [] as number[],
    triple: [] as number[],
  };

  for (let i = 0; i < shuffleCount; i++) {
    const shuffled = shuffleLabels(observedCells);
    const counts = countCooccurrences(shuffled);

    simResults.ufoBigfoot.push(counts.ufoBigfoot);
    simResults.ufoHaunting.push(counts.ufoHaunting);
    simResults.bigfootHaunting.push(counts.bigfootHaunting);
    simResults.triple.push(counts.triple);

    // Report progress periodically
    if (onProgress && (i + 1) % 100 === 0) {
      onProgress(i + 1, shuffleCount);
    }
  }

  // Create pairing results
  const pairings = {
    ufoBigfoot: createPairingResult('UFO + Bigfoot', observed.ufoBigfoot, simResults.ufoBigfoot),
    ufoHaunting: createPairingResult('UFO + Haunting', observed.ufoHaunting, simResults.ufoHaunting),
    bigfootHaunting: createPairingResult('Bigfoot + Haunting', observed.bigfootHaunting, simResults.bigfootHaunting),
    triple: createPairingResult('Triple (All Three)', observed.triple, simResults.triple),
  };

  const strongest = findStrongestPairing(pairings);
  const windowEffectDetected = detectWindowEffect(pairings);

  const computationTimeMs = Date.now() - startTime;

  return {
    analysisDate: new Date(),
    gridResolution,
    shuffleCount,
    totalCells: observedCells.size,
    cellsWithUfo: observed.cellsWithUfo,
    cellsWithBigfoot: observed.cellsWithBigfoot,
    cellsWithHaunting: observed.cellsWithHaunting,
    pairings,
    strongestPairing: strongest.name,
    strongestZScore: strongest.zScore,
    windowEffectDetected,
    computationTimeMs,
  };
}

/**
 * Convert CooccurrenceResult to database format
 */
export function toDbFormat(result: CooccurrenceResult): Record<string, unknown> {
  return {
    analysis_date: result.analysisDate.toISOString(),
    grid_resolution: result.gridResolution,
    shuffle_count: result.shuffleCount,
    total_cells: result.totalCells,
    cells_with_ufo: result.cellsWithUfo,
    cells_with_bigfoot: result.cellsWithBigfoot,
    cells_with_haunting: result.cellsWithHaunting,
    observed_ufo_bigfoot: result.pairings.ufoBigfoot.observed,
    observed_ufo_haunting: result.pairings.ufoHaunting.observed,
    observed_bigfoot_haunting: result.pairings.bigfootHaunting.observed,
    observed_triple: result.pairings.triple.observed,
    expected_ufo_bigfoot: result.pairings.ufoBigfoot.expected,
    expected_ufo_haunting: result.pairings.ufoHaunting.expected,
    expected_bigfoot_haunting: result.pairings.bigfootHaunting.expected,
    expected_triple: result.pairings.triple.expected,
    std_ufo_bigfoot: result.pairings.ufoBigfoot.stdDev,
    std_ufo_haunting: result.pairings.ufoHaunting.stdDev,
    std_bigfoot_haunting: result.pairings.bigfootHaunting.stdDev,
    std_triple: result.pairings.triple.stdDev,
    z_ufo_bigfoot: result.pairings.ufoBigfoot.zScore,
    z_ufo_haunting: result.pairings.ufoHaunting.zScore,
    z_bigfoot_haunting: result.pairings.bigfootHaunting.zScore,
    z_triple: result.pairings.triple.zScore,
    p_ufo_bigfoot: result.pairings.ufoBigfoot.pValue,
    p_ufo_haunting: result.pairings.ufoHaunting.pValue,
    p_bigfoot_haunting: result.pairings.bigfootHaunting.pValue,
    p_triple: result.pairings.triple.pValue,
    strongest_pairing: result.strongestPairing,
    strongest_z_score: result.strongestZScore,
    window_effect_detected: result.windowEffectDetected,
    pairings: result.pairings,
    computation_time_ms: result.computationTimeMs,
  };
}

/**
 * Run stratified Monte Carlo simulation by population quartile
 * This controls for population density effects
 */
export async function runStratifiedMonteCarlo(
  cells: Map<string, GridCell>,
  options: MonteCarloOptions
): Promise<StratifiedPairingResult[]> {
  const { shuffleCount } = options;

  // Ensure population quartiles are assigned
  assignPopulationQuartiles(cells);

  const results: StratifiedPairingResult[] = [];

  for (let quartile = 1; quartile <= 4; quartile++) {
    const quartileCells = getCellsByQuartile(cells, quartile);

    if (quartileCells.size < 10) {
      // Not enough cells for meaningful analysis
      continue;
    }

    // Get observed co-occurrences for this quartile
    const observed = countCooccurrences(quartileCells);

    // Run simulations within this quartile
    const simResults = {
      ufoBigfoot: [] as number[],
      ufoHaunting: [] as number[],
      bigfootHaunting: [] as number[],
      triple: [] as number[],
    };

    for (let i = 0; i < shuffleCount; i++) {
      const shuffled = shuffleLabelsWithinQuartile(quartileCells);
      const counts = countCooccurrences(shuffled);

      simResults.ufoBigfoot.push(counts.ufoBigfoot);
      simResults.ufoHaunting.push(counts.ufoHaunting);
      simResults.bigfootHaunting.push(counts.bigfootHaunting);
      simResults.triple.push(counts.triple);
    }

    // Create pairing results for this quartile
    const pairings = {
      ufoBigfoot: createPairingResult('UFO + Bigfoot', observed.ufoBigfoot, simResults.ufoBigfoot),
      ufoHaunting: createPairingResult('UFO + Haunting', observed.ufoHaunting, simResults.ufoHaunting),
      bigfootHaunting: createPairingResult('Bigfoot + Haunting', observed.bigfootHaunting, simResults.bigfootHaunting),
      triple: createPairingResult('Triple (All Three)', observed.triple, simResults.triple),
    };

    results.push({
      quartile,
      cellCount: quartileCells.size,
      pairings,
    });
  }

  return results;
}

/**
 * Shuffle labels within a subset of cells (preserves quartile structure)
 */
function shuffleLabelsWithinQuartile(cells: Map<string, GridCell>): Map<string, GridCell> {
  const cellArray = Array.from(cells.values());

  // Collect all phenomenon assignments
  const ufoAssignments: number[] = [];
  const bigfootAssignments: number[] = [];
  const hauntingAssignments: number[] = [];

  for (const cell of cellArray) {
    ufoAssignments.push(cell.ufoCount);
    bigfootAssignments.push(cell.bigfootCount);
    hauntingAssignments.push(cell.hauntingCount);
  }

  // Fisher-Yates shuffle each array independently
  shuffleArray(ufoAssignments);
  shuffleArray(bigfootAssignments);
  shuffleArray(hauntingAssignments);

  // Create new cells with shuffled assignments
  const shuffledCells = new Map<string, GridCell>();

  cellArray.forEach((cell, i) => {
    const shuffledCell: GridCell = {
      ...cell,
      ufoCount: ufoAssignments[i],
      bigfootCount: bigfootAssignments[i],
      hauntingCount: hauntingAssignments[i],
      totalCount: ufoAssignments[i] + bigfootAssignments[i] + hauntingAssignments[i],
      typesPresent: [],
      typeCount: 0,
    };

    // Recalculate types present
    const types: string[] = [];
    if (shuffledCell.ufoCount > 0) types.push('ufo');
    if (shuffledCell.bigfootCount > 0) types.push('bigfoot');
    if (shuffledCell.hauntingCount > 0) types.push('haunting');
    shuffledCell.typesPresent = types;
    shuffledCell.typeCount = types.length;

    shuffledCells.set(cell.cellId, shuffledCell);
  });

  return shuffledCells;
}

/**
 * Run Monte Carlo at multiple resolutions
 * Returns results for each resolution to test scale-dependency
 */
export async function runMultiResolutionAnalysis(
  investigations: { id: string; investigationType: 'ufo' | 'bigfoot' | 'haunting'; latitude: number; longitude: number }[],
  resolutions: number[],
  options: Omit<MonteCarloOptions, 'gridResolution'>
): Promise<MultiResolutionResult[]> {
  const { assignToGrid } = await import('./grid');
  const results: MultiResolutionResult[] = [];

  for (const resolution of resolutions) {
    // Build grid at this resolution
    const cells = assignToGrid(investigations, resolution);
    assignPopulationQuartiles(cells);

    // Run main Monte Carlo
    const mainResult = await runMonteCarloSimulation(cells, {
      ...options,
      gridResolution: resolution,
    });

    // Run stratified Monte Carlo
    const stratifiedResults = await runStratifiedMonteCarlo(cells, {
      ...options,
      gridResolution: resolution,
    });

    results.push({
      resolution,
      resolutionKm: RESOLUTION_KM[resolution as Resolution] ?? resolution * 111,
      totalCells: cells.size,
      result: mainResult,
      stratifiedResults,
    });
  }

  return results;
}
