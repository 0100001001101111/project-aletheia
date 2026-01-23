/**
 * Grid system for window analysis
 * Uses simple lat/lng squares (~25km at mid-latitudes)
 */

export const DEFAULT_CELL_SIZE = 0.25; // degrees, approximately 25km

// Supported resolutions for multi-scale analysis
export const RESOLUTIONS = [0.25, 0.5, 1.0, 2.0] as const;
export type Resolution = typeof RESOLUTIONS[number];

// Approximate km per resolution
export const RESOLUTION_KM: Record<Resolution, number> = {
  0.25: 25,
  0.5: 50,
  1.0: 100,
  2.0: 200,
};

export interface GridCell {
  cellId: string;
  centerLat: number;
  centerLng: number;
  ufoCount: number;
  bigfootCount: number;
  hauntingCount: number;
  totalCount: number;
  typesPresent: string[];
  typeCount: number;
  resolution?: number;
  populationQuartile?: number; // 1-4, based on total reports as population proxy
}

export interface Investigation {
  id: string;
  investigationType: 'ufo' | 'bigfoot' | 'haunting';
  latitude: number;
  longitude: number;
}

/**
 * Generate a cell ID from coordinates
 * Format: "lat_lng" with values snapped to grid
 */
export function getCellId(lat: number, lng: number, cellSize: number = DEFAULT_CELL_SIZE): string {
  const snappedLat = Math.floor(lat / cellSize) * cellSize + cellSize / 2;
  const snappedLng = Math.floor(lng / cellSize) * cellSize + cellSize / 2;
  return `${snappedLat.toFixed(2)}_${snappedLng.toFixed(2)}`;
}

/**
 * Get the center coordinates for a cell
 */
export function getCellCenter(lat: number, lng: number, cellSize: number = DEFAULT_CELL_SIZE): { lat: number; lng: number } {
  const snappedLat = Math.floor(lat / cellSize) * cellSize + cellSize / 2;
  const snappedLng = Math.floor(lng / cellSize) * cellSize + cellSize / 2;
  return { lat: snappedLat, lng: snappedLng };
}

/**
 * Haversine distance between two points in km
 */
export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Assign investigations to grid cells
 */
export function assignToGrid(
  investigations: Investigation[],
  cellSize: number = DEFAULT_CELL_SIZE
): Map<string, GridCell> {
  const cells = new Map<string, GridCell>();

  for (const inv of investigations) {
    const cellId = getCellId(inv.latitude, inv.longitude, cellSize);
    const center = getCellCenter(inv.latitude, inv.longitude, cellSize);

    let cell = cells.get(cellId);
    if (!cell) {
      cell = {
        cellId,
        centerLat: center.lat,
        centerLng: center.lng,
        ufoCount: 0,
        bigfootCount: 0,
        hauntingCount: 0,
        totalCount: 0,
        typesPresent: [],
        typeCount: 0,
      };
      cells.set(cellId, cell);
    }

    // Increment counts
    cell.totalCount++;
    switch (inv.investigationType) {
      case 'ufo':
        cell.ufoCount++;
        break;
      case 'bigfoot':
        cell.bigfootCount++;
        break;
      case 'haunting':
        cell.hauntingCount++;
        break;
    }
  }

  // Calculate types present for each cell
  Array.from(cells.values()).forEach((cell) => {
    const types: string[] = [];
    if (cell.ufoCount > 0) types.push('ufo');
    if (cell.bigfootCount > 0) types.push('bigfoot');
    if (cell.hauntingCount > 0) types.push('haunting');
    cell.typesPresent = types;
    cell.typeCount = types.length;
  });

  return cells;
}

/**
 * Get approximate cell area in sq km
 * Varies by latitude due to Earth's curvature
 */
export function getCellArea(centerLat: number, cellSize: number = DEFAULT_CELL_SIZE): number {
  // At the equator, 1 degree = ~111km
  // Width decreases with latitude: width = 111 * cos(lat)
  const latKm = cellSize * 111;
  const lngKm = cellSize * 111 * Math.cos(toRadians(centerLat));
  return latKm * lngKm;
}

/**
 * Parse cell ID back to coordinates
 */
export function parseCellId(cellId: string): { lat: number; lng: number } {
  const [lat, lng] = cellId.split('_').map(parseFloat);
  return { lat, lng };
}

/**
 * Get neighboring cell IDs
 */
export function getNeighborCellIds(cellId: string, cellSize: number = DEFAULT_CELL_SIZE): string[] {
  const { lat, lng } = parseCellId(cellId);
  const neighbors: string[] = [];

  for (let dLat = -1; dLat <= 1; dLat++) {
    for (let dLng = -1; dLng <= 1; dLng++) {
      if (dLat === 0 && dLng === 0) continue;
      const neighborLat = lat + dLat * cellSize;
      const neighborLng = lng + dLng * cellSize;
      neighbors.push(`${neighborLat.toFixed(2)}_${neighborLng.toFixed(2)}`);
    }
  }

  return neighbors;
}

/**
 * Count co-occurrences in grid
 */
export function countCooccurrences(cells: Map<string, GridCell>): {
  ufoBigfoot: number;
  ufoHaunting: number;
  bigfootHaunting: number;
  triple: number;
  cellsWithUfo: number;
  cellsWithBigfoot: number;
  cellsWithHaunting: number;
} {
  let ufoBigfoot = 0;
  let ufoHaunting = 0;
  let bigfootHaunting = 0;
  let triple = 0;
  let cellsWithUfo = 0;
  let cellsWithBigfoot = 0;
  let cellsWithHaunting = 0;

  Array.from(cells.values()).forEach((cell) => {
    const hasUfo = cell.ufoCount > 0;
    const hasBigfoot = cell.bigfootCount > 0;
    const hasHaunting = cell.hauntingCount > 0;

    if (hasUfo) cellsWithUfo++;
    if (hasBigfoot) cellsWithBigfoot++;
    if (hasHaunting) cellsWithHaunting++;

    if (hasUfo && hasBigfoot) ufoBigfoot++;
    if (hasUfo && hasHaunting) ufoHaunting++;
    if (hasBigfoot && hasHaunting) bigfootHaunting++;
    if (hasUfo && hasBigfoot && hasHaunting) triple++;
  });

  return {
    ufoBigfoot,
    ufoHaunting,
    bigfootHaunting,
    triple,
    cellsWithUfo,
    cellsWithBigfoot,
    cellsWithHaunting,
  };
}

/**
 * Assign population quartiles based on total report count (proxy for population)
 * Modifies cells in place
 */
export function assignPopulationQuartiles(cells: Map<string, GridCell>): void {
  const cellArray = Array.from(cells.values());
  const totalCounts = cellArray.map(c => c.totalCount).sort((a, b) => a - b);

  const q1 = totalCounts[Math.floor(totalCounts.length * 0.25)];
  const q2 = totalCounts[Math.floor(totalCounts.length * 0.5)];
  const q3 = totalCounts[Math.floor(totalCounts.length * 0.75)];

  Array.from(cells.values()).forEach((cell) => {
    if (cell.totalCount <= q1) {
      cell.populationQuartile = 1;
    } else if (cell.totalCount <= q2) {
      cell.populationQuartile = 2;
    } else if (cell.totalCount <= q3) {
      cell.populationQuartile = 3;
    } else {
      cell.populationQuartile = 4;
    }
  });
}

/**
 * Get cells by population quartile
 */
export function getCellsByQuartile(
  cells: Map<string, GridCell>,
  quartile: number
): Map<string, GridCell> {
  const filtered = new Map<string, GridCell>();
  Array.from(cells.entries()).forEach(([id, cell]) => {
    if (cell.populationQuartile === quartile) {
      filtered.set(id, cell);
    }
  });
  return filtered;
}

/**
 * Build grids at multiple resolutions
 */
export function buildMultiResolutionGrids(
  investigations: Investigation[],
  resolutions: number[] = [...RESOLUTIONS]
): Map<number, Map<string, GridCell>> {
  const grids = new Map<number, Map<string, GridCell>>();

  for (const resolution of resolutions) {
    const grid = assignToGrid(investigations, resolution);
    // Tag each cell with its resolution
    Array.from(grid.values()).forEach((cell) => {
      cell.resolution = resolution;
    });
    assignPopulationQuartiles(grid);
    grids.set(resolution, grid);
  }

  return grids;
}

/**
 * Stratified co-occurrence counts by population quartile
 */
export interface StratifiedCooccurrence {
  quartile: number;
  cellCount: number;
  ufoBigfoot: number;
  ufoHaunting: number;
  bigfootHaunting: number;
  triple: number;
  cellsWithUfo: number;
  cellsWithBigfoot: number;
  cellsWithHaunting: number;
}

export function countStratifiedCooccurrences(
  cells: Map<string, GridCell>
): StratifiedCooccurrence[] {
  const results: StratifiedCooccurrence[] = [];

  for (let quartile = 1; quartile <= 4; quartile++) {
    const quartileCells = getCellsByQuartile(cells, quartile);
    const counts = countCooccurrences(quartileCells);

    results.push({
      quartile,
      cellCount: quartileCells.size,
      ...counts,
    });
  }

  return results;
}
