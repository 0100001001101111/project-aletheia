/**
 * Window Index calculation
 * Measures how "window-like" a geographic cell is
 *
 * Formula: window_index = (type_diversity / 3) × excess_ratio × rarity_bonus
 * - type_diversity: number of phenomenon types present (1-3)
 * - excess_ratio: observed_reports / expected_reports (population-based)
 * - rarity_bonus: boost for cells with rare combinations
 */

import { GridCell } from './grid';

export interface WindowIndexResult {
  cellId: string;
  windowIndex: number;
  typeDiversity: number;
  excessRatio: number;
  rarityBonus: number;
  rank?: number;
}

export interface WindowRanking {
  cells: WindowIndexResult[];
  topWindowAreas: WindowIndexResult[];
  medianIndex: number;
  meanIndex: number;
  stdDev: number;
}

/**
 * Calculate window index for a single cell
 */
export function calculateWindowIndex(
  cell: GridCell,
  expectedReports: number | null
): WindowIndexResult {
  // Type diversity (0-1 scale, normalized from 1-3 types)
  const typeDiversity = cell.typeCount / 3;

  // Excess ratio (observed vs expected based on population)
  // If no population data, use 1.0 as neutral
  let excessRatio = 1.0;
  if (expectedReports && expectedReports > 0) {
    excessRatio = cell.totalCount / expectedReports;
    // Cap at 10x to prevent outliers from dominating
    excessRatio = Math.min(excessRatio, 10);
  }

  // Rarity bonus - triple occurrences are rarer
  let rarityBonus = 1.0;
  if (cell.typeCount === 3) {
    rarityBonus = 1.5; // 50% bonus for all three types
  } else if (cell.typeCount === 2) {
    rarityBonus = 1.2; // 20% bonus for two types
  }

  // Calculate window index
  const windowIndex = typeDiversity * excessRatio * rarityBonus;

  return {
    cellId: cell.cellId,
    windowIndex,
    typeDiversity,
    excessRatio,
    rarityBonus,
  };
}

/**
 * Calculate window index for all cells and rank them
 */
export function rankWindowAreas(
  cells: Map<string, GridCell>,
  expectedReportsMap?: Map<string, number>
): WindowRanking {
  const results: WindowIndexResult[] = [];

  Array.from(cells.values()).forEach((cell) => {
    // Skip empty cells
    if (cell.totalCount === 0) return;

    const expected = expectedReportsMap?.get(cell.cellId) ?? null;
    const result = calculateWindowIndex(cell, expected);
    results.push(result);
  });

  // Sort by window index descending
  results.sort((a, b) => b.windowIndex - a.windowIndex);

  // Add ranks
  results.forEach((r, i) => {
    r.rank = i + 1;
  });

  // Calculate statistics
  const indices = results.map(r => r.windowIndex);
  const mean = indices.reduce((a, b) => a + b, 0) / indices.length;
  const variance = indices.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / indices.length;
  const stdDev = Math.sqrt(variance);

  // Median
  const sorted = [...indices].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];

  // Top window areas (z > 2 or top 20, whichever is more restrictive)
  const threshold = mean + 2 * stdDev;
  const topWindowAreas = results.filter(r => r.windowIndex > threshold).slice(0, 50);

  return {
    cells: results,
    topWindowAreas,
    medianIndex: median,
    meanIndex: mean,
    stdDev,
  };
}

/**
 * Estimate expected reports based on population
 * Uses simple model: reports proportional to sqrt(population)
 * This accounts for diminishing returns in populated areas
 */
export function estimateExpectedReports(
  totalReports: number,
  totalPopulation: number,
  cellPopulation: number
): number {
  if (totalPopulation === 0 || cellPopulation === 0) return 0;

  // Calculate reports per sqrt(population) nationally
  const reportsPerSqrtPop = totalReports / Math.sqrt(totalPopulation);

  // Expected reports for this cell
  return reportsPerSqrtPop * Math.sqrt(cellPopulation);
}

/**
 * Interpret window index value
 */
export function interpretWindowIndex(index: number, mean: number, stdDev: number): string {
  const zScore = (index - mean) / stdDev;

  if (zScore < 0) return 'Below average activity';
  if (zScore < 1) return 'Average activity';
  if (zScore < 2) return 'Elevated activity';
  if (zScore < 3) return 'High activity - potential window area';
  return 'Exceptional activity - strong window candidate';
}

/**
 * Convert cell to database format for aletheia_grid_cells
 */
export function cellToDbFormat(
  cell: GridCell,
  windowResult: WindowIndexResult,
  population?: number,
  expectedReports?: number
): Record<string, unknown> {
  return {
    cell_id: cell.cellId,
    center_lat: Math.round(cell.centerLat * 1000000) / 1000000, // 6 decimal places
    center_lng: Math.round(cell.centerLng * 1000000) / 1000000, // 6 decimal places
    ufo_count: cell.ufoCount,
    bigfoot_count: cell.bigfootCount,
    haunting_count: cell.hauntingCount,
    total_count: cell.totalCount,
    types_present: cell.typesPresent,
    type_count: cell.typeCount,
    population: population ?? null,
    expected_reports: expectedReports ?? null,
    excess_ratio: Math.round(windowResult.excessRatio * 10000) / 10000, // 4 decimal places
    window_index: Math.round(windowResult.windowIndex * 10000) / 10000, // 4 decimal places
  };
}
