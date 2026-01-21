// @ts-nocheck
/**
 * Geological feature extraction and analysis
 * Tests whether window areas have distinct geological signatures
 */

import { haversineDistance } from './grid';

export interface GeologicalFeatures {
  faultDistanceKm: number | null;
  bedrockType: string | null;
  quartzContent: number | null;
  aquiferPresent: boolean | null;
  elevationM: number | null;
}

export interface FaultSegment {
  lat1: number;
  lng1: number;
  lat2: number;
  lng2: number;
}

export interface Fault {
  name: string;
  type: string;
  segments: FaultSegment[];
}

export interface FaultData {
  metadata: {
    source: string;
    description: string;
    lastUpdated: string;
  };
  faults: Fault[];
}

// Cache for loaded fault data
let cachedFaultData: FaultData | null = null;

/**
 * Load fault data from JSON file
 */
export async function loadFaultData(): Promise<FaultData> {
  if (cachedFaultData) {
    return cachedFaultData;
  }

  // In server context, read from file system
  const fs = await import('fs/promises');
  const path = await import('path');

  const filePath = path.join(process.cwd(), 'public', 'data', 'geological', 'us_faults.json');
  const content = await fs.readFile(filePath, 'utf-8');
  cachedFaultData = JSON.parse(content) as FaultData;

  return cachedFaultData;
}

/**
 * Calculate perpendicular distance from a point to a line segment
 * Returns distance in km using haversine for accuracy
 */
export function distanceToSegment(
  pointLat: number,
  pointLng: number,
  seg: FaultSegment
): number {
  const { lat1, lng1, lat2, lng2 } = seg;

  // Vector from segment start to end
  const dx = lat2 - lat1;
  const dy = lng2 - lng1;

  // If segment is a point, return distance to that point
  if (dx === 0 && dy === 0) {
    return haversineDistance(pointLat, pointLng, lat1, lng1);
  }

  // Calculate projection parameter t
  // t = 0 means closest point is at segment start
  // t = 1 means closest point is at segment end
  // 0 < t < 1 means closest point is along the segment
  const t = Math.max(0, Math.min(1,
    ((pointLat - lat1) * dx + (pointLng - lng1) * dy) / (dx * dx + dy * dy)
  ));

  // Calculate closest point on segment
  const closestLat = lat1 + t * dx;
  const closestLng = lng1 + t * dy;

  // Return haversine distance to closest point
  return haversineDistance(pointLat, pointLng, closestLat, closestLng);
}

/**
 * Calculate minimum distance from a point to any fault
 * Returns { distance, nearestFault }
 */
export async function distanceToNearestFault(
  lat: number,
  lng: number
): Promise<{ distance: number; nearestFault: string }> {
  const faultData = await loadFaultData();

  let minDistance = Infinity;
  let nearestFault = '';

  for (const fault of faultData.faults) {
    for (const segment of fault.segments) {
      const dist = distanceToSegment(lat, lng, segment);
      if (dist < minDistance) {
        minDistance = dist;
        nearestFault = fault.name;
      }
    }
  }

  return { distance: minDistance, nearestFault };
}

/**
 * Batch calculate fault distances for multiple points
 * More efficient than calling distanceToNearestFault repeatedly
 */
export async function batchDistanceToFaults(
  points: Array<{ lat: number; lng: number; id: string }>
): Promise<Map<string, { distance: number; nearestFault: string }>> {
  const faultData = await loadFaultData();
  const results = new Map<string, { distance: number; nearestFault: string }>();

  for (const point of points) {
    let minDistance = Infinity;
    let nearestFault = '';

    for (const fault of faultData.faults) {
      for (const segment of fault.segments) {
        const dist = distanceToSegment(point.lat, point.lng, segment);
        if (dist < minDistance) {
          minDistance = dist;
          nearestFault = fault.name;
        }
      }
    }

    results.set(point.id, { distance: minDistance, nearestFault });
  }

  return results;
}

/**
 * Stratify cells by fault distance
 * Returns cells grouped by distance bins
 */
export function stratifyByFaultDistance(
  cells: Array<{ cellId: string; faultDistanceKm: number | null; windowIndex: number }>,
  bins: number[] = [25, 50, 100, 200, 500]
): Map<string, typeof cells> {
  const stratified = new Map<string, typeof cells>();

  // Initialize bins
  stratified.set('0-25km', []);
  stratified.set('25-50km', []);
  stratified.set('50-100km', []);
  stratified.set('100-200km', []);
  stratified.set('200-500km', []);
  stratified.set('>500km', []);

  for (const cell of cells) {
    if (cell.faultDistanceKm === null) continue;

    const dist = cell.faultDistanceKm;
    if (dist < 25) {
      stratified.get('0-25km')!.push(cell);
    } else if (dist < 50) {
      stratified.get('25-50km')!.push(cell);
    } else if (dist < 100) {
      stratified.get('50-100km')!.push(cell);
    } else if (dist < 200) {
      stratified.get('100-200km')!.push(cell);
    } else if (dist < 500) {
      stratified.get('200-500km')!.push(cell);
    } else {
      stratified.get('>500km')!.push(cell);
    }
  }

  return stratified;
}

/**
 * Analyze window index by fault distance
 */
export function analyzeWindowIndexByFaultDistance(
  stratified: Map<string, Array<{ cellId: string; faultDistanceKm: number | null; windowIndex: number }>>
): Array<{
  bin: string;
  cellCount: number;
  meanWindowIndex: number;
  stdDev: number;
  minWindowIndex: number;
  maxWindowIndex: number;
}> {
  const results: Array<{
    bin: string;
    cellCount: number;
    meanWindowIndex: number;
    stdDev: number;
    minWindowIndex: number;
    maxWindowIndex: number;
  }> = [];

  for (const [bin, cells] of stratified) {
    if (cells.length === 0) {
      results.push({
        bin,
        cellCount: 0,
        meanWindowIndex: 0,
        stdDev: 0,
        minWindowIndex: 0,
        maxWindowIndex: 0,
      });
      continue;
    }

    const indices = cells.map(c => c.windowIndex);
    const mean = indices.reduce((a, b) => a + b, 0) / indices.length;
    const variance = indices.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0) / indices.length;

    results.push({
      bin,
      cellCount: cells.length,
      meanWindowIndex: mean,
      stdDev: Math.sqrt(variance),
      minWindowIndex: Math.min(...indices),
      maxWindowIndex: Math.max(...indices),
    });
  }

  return results;
}

export interface GeologicalComparison {
  feature: string;
  highIndexMean: number;
  lowIndexMean: number;
  tStat: number;
  pValue: number;
  significant: boolean;
}

export interface GeologicalSignatureResult {
  analysisDate: Date;
  highIndexThreshold: number;
  lowIndexThreshold: number;
  highIndexCellCount: number;
  lowIndexCellCount: number;
  comparisons: GeologicalComparison[];
  significantFeatures: string[];
  geologicalSignatureDetected: boolean;
}

/**
 * Calculate Welch's t-test (unequal variance t-test)
 */
export function welchTTest(
  group1: number[],
  group2: number[]
): { tStat: number; pValue: number } {
  const n1 = group1.length;
  const n2 = group2.length;

  if (n1 < 2 || n2 < 2) {
    return { tStat: 0, pValue: 1 };
  }

  const mean1 = group1.reduce((a, b) => a + b, 0) / n1;
  const mean2 = group2.reduce((a, b) => a + b, 0) / n2;

  const var1 = group1.reduce((sum, x) => sum + Math.pow(x - mean1, 2), 0) / (n1 - 1);
  const var2 = group2.reduce((sum, x) => sum + Math.pow(x - mean2, 2), 0) / (n2 - 1);

  const se = Math.sqrt(var1 / n1 + var2 / n2);

  if (se === 0) {
    return { tStat: 0, pValue: 1 };
  }

  const tStat = (mean1 - mean2) / se;

  // Welch-Satterthwaite degrees of freedom
  const num = Math.pow(var1 / n1 + var2 / n2, 2);
  const denom = Math.pow(var1 / n1, 2) / (n1 - 1) + Math.pow(var2 / n2, 2) / (n2 - 1);
  const df = num / denom;

  // Approximate p-value using normal distribution for large df
  const pValue = 2 * (1 - normalCDF(Math.abs(tStat)));

  return { tStat, pValue };
}

/**
 * Standard normal CDF approximation
 */
function normalCDF(x: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989423 * Math.exp(-x * x / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return x > 0 ? 1 - p : p;
}

/**
 * Calculate Chi-square test for categorical data
 */
export function chiSquareTest(
  observed1: Map<string, number>,
  observed2: Map<string, number>
): { chiSquare: number; pValue: number } {
  const total1 = Array.from(observed1.values()).reduce((a, b) => a + b, 0);
  const total2 = Array.from(observed2.values()).reduce((a, b) => a + b, 0);
  const grandTotal = total1 + total2;

  if (grandTotal === 0) {
    return { chiSquare: 0, pValue: 1 };
  }

  // Get all categories
  const categories = new Set([...observed1.keys(), ...observed2.keys()]);

  let chiSquare = 0;
  let df = 0;

  for (const cat of categories) {
    const o1 = observed1.get(cat) ?? 0;
    const o2 = observed2.get(cat) ?? 0;
    const colTotal = o1 + o2;

    if (colTotal === 0) continue;

    const e1 = (total1 * colTotal) / grandTotal;
    const e2 = (total2 * colTotal) / grandTotal;

    if (e1 > 0) chiSquare += Math.pow(o1 - e1, 2) / e1;
    if (e2 > 0) chiSquare += Math.pow(o2 - e2, 2) / e2;
    df++;
  }

  df = Math.max(df - 1, 1);

  // Approximate p-value using chi-square distribution
  const pValue = 1 - chiSquareCDF(chiSquare, df);

  return { chiSquare, pValue };
}

/**
 * Chi-square CDF approximation
 */
function chiSquareCDF(x: number, df: number): number {
  if (x <= 0) return 0;

  // Use normal approximation for large df
  if (df > 100) {
    const z = Math.pow(x / df, 1 / 3) - (1 - 2 / (9 * df));
    const se = Math.sqrt(2 / (9 * df));
    return normalCDF(z / se);
  }

  // Wilson-Hilferty approximation
  const z = Math.pow(x / df, 1 / 3) - (1 - 2 / (9 * df));
  const se = Math.sqrt(2 / (9 * df));
  return normalCDF(z / se);
}

/**
 * Compare geological features between high-index and low-index cells
 */
export function compareGeologicalSignatures(
  highIndexCells: Array<{ cellId: string; features: GeologicalFeatures }>,
  lowIndexCells: Array<{ cellId: string; features: GeologicalFeatures }>,
  highThreshold: number,
  lowThreshold: number
): GeologicalSignatureResult {
  const comparisons: GeologicalComparison[] = [];
  const significantFeatures: string[] = [];

  // Compare fault distance
  const highFaultDist = highIndexCells
    .map(c => c.features.faultDistanceKm)
    .filter((d): d is number => d !== null);
  const lowFaultDist = lowIndexCells
    .map(c => c.features.faultDistanceKm)
    .filter((d): d is number => d !== null);

  if (highFaultDist.length > 5 && lowFaultDist.length > 5) {
    const { tStat, pValue } = welchTTest(highFaultDist, lowFaultDist);
    const comparison: GeologicalComparison = {
      feature: 'Fault Distance (km)',
      highIndexMean: highFaultDist.reduce((a, b) => a + b, 0) / highFaultDist.length,
      lowIndexMean: lowFaultDist.reduce((a, b) => a + b, 0) / lowFaultDist.length,
      tStat,
      pValue,
      significant: pValue < 0.05,
    };
    comparisons.push(comparison);
    if (comparison.significant) significantFeatures.push('fault_distance');
  }

  // Compare elevation
  const highElevation = highIndexCells
    .map(c => c.features.elevationM)
    .filter((e): e is number => e !== null);
  const lowElevation = lowIndexCells
    .map(c => c.features.elevationM)
    .filter((e): e is number => e !== null);

  if (highElevation.length > 5 && lowElevation.length > 5) {
    const { tStat, pValue } = welchTTest(highElevation, lowElevation);
    const comparison: GeologicalComparison = {
      feature: 'Elevation (m)',
      highIndexMean: highElevation.reduce((a, b) => a + b, 0) / highElevation.length,
      lowIndexMean: lowElevation.reduce((a, b) => a + b, 0) / lowElevation.length,
      tStat,
      pValue,
      significant: pValue < 0.05,
    };
    comparisons.push(comparison);
    if (comparison.significant) significantFeatures.push('elevation');
  }

  // Compare quartz content
  const highQuartz = highIndexCells
    .map(c => c.features.quartzContent)
    .filter((q): q is number => q !== null);
  const lowQuartz = lowIndexCells
    .map(c => c.features.quartzContent)
    .filter((q): q is number => q !== null);

  if (highQuartz.length > 5 && lowQuartz.length > 5) {
    const { tStat, pValue } = welchTTest(highQuartz, lowQuartz);
    const comparison: GeologicalComparison = {
      feature: 'Quartz Content',
      highIndexMean: highQuartz.reduce((a, b) => a + b, 0) / highQuartz.length,
      lowIndexMean: lowQuartz.reduce((a, b) => a + b, 0) / lowQuartz.length,
      tStat,
      pValue,
      significant: pValue < 0.05,
    };
    comparisons.push(comparison);
    if (comparison.significant) significantFeatures.push('quartz_content');
  }

  return {
    analysisDate: new Date(),
    highIndexThreshold: highThreshold,
    lowIndexThreshold: lowThreshold,
    highIndexCellCount: highIndexCells.length,
    lowIndexCellCount: lowIndexCells.length,
    comparisons,
    significantFeatures,
    geologicalSignatureDetected: significantFeatures.length > 0,
  };
}

/**
 * Convert result to database format
 */
export function geologicalResultToDbFormat(result: GeologicalSignatureResult): Record<string, unknown> {
  const faultComp = result.comparisons.find(c => c.feature === 'Fault Distance (km)');
  const elevComp = result.comparisons.find(c => c.feature === 'Elevation (m)');
  const quartzComp = result.comparisons.find(c => c.feature === 'Quartz Content');

  return {
    analysis_date: result.analysisDate.toISOString(),
    high_index_threshold: result.highIndexThreshold,
    low_index_threshold: result.lowIndexThreshold,
    high_index_cell_count: result.highIndexCellCount,
    low_index_cell_count: result.lowIndexCellCount,
    fault_distance_high_mean: faultComp?.highIndexMean ?? null,
    fault_distance_low_mean: faultComp?.lowIndexMean ?? null,
    fault_distance_t_stat: faultComp?.tStat ?? null,
    fault_distance_p_value: faultComp?.pValue ?? null,
    elevation_high_mean: elevComp?.highIndexMean ?? null,
    elevation_low_mean: elevComp?.lowIndexMean ?? null,
    elevation_t_stat: elevComp?.tStat ?? null,
    elevation_p_value: elevComp?.pValue ?? null,
    quartz_high_mean: quartzComp?.highIndexMean ?? null,
    quartz_low_mean: quartzComp?.lowIndexMean ?? null,
    quartz_t_stat: quartzComp?.tStat ?? null,
    quartz_p_value: quartzComp?.pValue ?? null,
    significant_features: result.significantFeatures,
    geological_signature_detected: result.geologicalSignatureDetected,
    detailed_results: result,
  };
}

// ============================================================================
// CONTROL ANALYSES - Rule out confounds
// ============================================================================

export interface ControlAnalysisResult {
  controlType: string;
  comparison: string;
  nearFaultCount: number;
  farFaultCount: number;
  nearFaultMeanIndex: number;
  farFaultMeanIndex: number;
  tStat: number;
  pValue: number;
  effectHolds: boolean;
}

export interface RegionDefinition {
  name: string;
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

// Geographic regions for control analysis
export const REGIONS: RegionDefinition[] = [
  { name: 'Pacific', minLat: 32, maxLat: 49, minLng: -125, maxLng: -114 },      // CA, OR, WA
  { name: 'Mountain', minLat: 31, maxLat: 49, minLng: -114, maxLng: -102 },     // NV, UT, AZ, CO, NM, WY, MT, ID
  { name: 'Central', minLat: 26, maxLat: 49, minLng: -102, maxLng: -89 },       // TX, OK, KS, NE, MO, etc.
  { name: 'Eastern', minLat: 25, maxLat: 47, minLng: -89, maxLng: -67 },        // East of Mississippi
];

// California bounding box for within-state test
export const CALIFORNIA_BOUNDS = {
  minLat: 32.5,
  maxLat: 42.0,
  minLng: -124.5,
  maxLng: -114.0,
};

/**
 * Check if a point is within a region
 */
export function isInRegion(lat: number, lng: number, region: RegionDefinition): boolean {
  return lat >= region.minLat && lat <= region.maxLat &&
         lng >= region.minLng && lng <= region.maxLng;
}

/**
 * Check if a point is in California
 */
export function isInCalifornia(lat: number, lng: number): boolean {
  return lat >= CALIFORNIA_BOUNDS.minLat && lat <= CALIFORNIA_BOUNDS.maxLat &&
         lng >= CALIFORNIA_BOUNDS.minLng && lng <= CALIFORNIA_BOUNDS.maxLng;
}

/**
 * Get region for a point
 */
export function getRegion(lat: number, lng: number): string | null {
  for (const region of REGIONS) {
    if (isInRegion(lat, lng, region)) {
      return region.name;
    }
  }
  return null;
}

/**
 * Load coastline data for null comparison
 */
let cachedCoastlineData: FaultData | null = null;

export async function loadCoastlineData(): Promise<FaultData> {
  if (cachedCoastlineData) {
    return cachedCoastlineData;
  }

  const fs = await import('fs/promises');
  const path = await import('path');

  const filePath = path.join(process.cwd(), 'public', 'data', 'geological', 'us_coastline.json');
  const content = await fs.readFile(filePath, 'utf-8');
  const data = JSON.parse(content);

  // Convert coastline format to fault format for reuse
  cachedCoastlineData = {
    metadata: data.metadata,
    faults: data.coastlines.map((c: { name: string; segments: FaultSegment[] }) => ({
      name: c.name,
      type: 'coastline',
      segments: c.segments,
    })),
  };

  return cachedCoastlineData;
}

/**
 * Calculate distance to nearest coastline
 */
export async function distanceToNearestCoastline(
  lat: number,
  lng: number
): Promise<{ distance: number; nearestCoastline: string }> {
  const coastlineData = await loadCoastlineData();

  let minDistance = Infinity;
  let nearestCoastline = '';

  for (const coastline of coastlineData.faults) {
    for (const segment of coastline.segments) {
      const dist = distanceToSegment(lat, lng, segment);
      if (dist < minDistance) {
        minDistance = dist;
        nearestCoastline = coastline.name;
      }
    }
  }

  return { distance: minDistance, nearestCoastline };
}

/**
 * Batch calculate coastline distances
 */
export async function batchDistanceToCoastlines(
  points: Array<{ lat: number; lng: number; id: string }>
): Promise<Map<string, { distance: number; nearestCoastline: string }>> {
  const coastlineData = await loadCoastlineData();
  const results = new Map<string, { distance: number; nearestCoastline: string }>();

  for (const point of points) {
    let minDistance = Infinity;
    let nearestCoastline = '';

    for (const coastline of coastlineData.faults) {
      for (const segment of coastline.segments) {
        const dist = distanceToSegment(point.lat, point.lng, segment);
        if (dist < minDistance) {
          minDistance = dist;
          nearestCoastline = coastline.name;
        }
      }
    }

    results.set(point.id, { distance: minDistance, nearestCoastline });
  }

  return results;
}

/**
 * Control Analysis 1: Within-California test
 * Tests if fault effect holds within California only
 */
export function runWithinCaliforniaControl(
  cells: Array<{
    cellId: string;
    lat: number;
    lng: number;
    faultDistanceKm: number | null;
    windowIndex: number;
  }>,
  nearThreshold: number = 50,
  farThreshold: number = 100
): ControlAnalysisResult {
  // Filter to California only
  const caCells = cells.filter(c => isInCalifornia(c.lat, c.lng) && c.faultDistanceKm !== null);

  const nearFault = caCells.filter(c => c.faultDistanceKm! < nearThreshold);
  const farFault = caCells.filter(c => c.faultDistanceKm! > farThreshold);

  const nearIndices = nearFault.map(c => c.windowIndex);
  const farIndices = farFault.map(c => c.windowIndex);

  const { tStat, pValue } = welchTTest(nearIndices, farIndices);

  const nearMean = nearIndices.length > 0
    ? nearIndices.reduce((a, b) => a + b, 0) / nearIndices.length
    : 0;
  const farMean = farIndices.length > 0
    ? farIndices.reduce((a, b) => a + b, 0) / farIndices.length
    : 0;

  return {
    controlType: 'within_california',
    comparison: `CA cells <${nearThreshold}km vs >${farThreshold}km from fault`,
    nearFaultCount: nearFault.length,
    farFaultCount: farFault.length,
    nearFaultMeanIndex: nearMean,
    farFaultMeanIndex: farMean,
    tStat,
    pValue,
    effectHolds: pValue < 0.05 && nearMean > farMean,
  };
}

/**
 * Control Analysis 2: Population-stratified comparison
 * Tests fault effect within each population quartile
 */
export function runPopulationStratifiedControl(
  cells: Array<{
    cellId: string;
    faultDistanceKm: number | null;
    windowIndex: number;
    populationQuartile: number | null;
  }>,
  faultThreshold: number = 100
): ControlAnalysisResult[] {
  const results: ControlAnalysisResult[] = [];

  for (let q = 1; q <= 4; q++) {
    const quartileCells = cells.filter(
      c => c.populationQuartile === q && c.faultDistanceKm !== null
    );

    const nearFault = quartileCells.filter(c => c.faultDistanceKm! < faultThreshold);
    const farFault = quartileCells.filter(c => c.faultDistanceKm! >= faultThreshold);

    const nearIndices = nearFault.map(c => c.windowIndex);
    const farIndices = farFault.map(c => c.windowIndex);

    const { tStat, pValue } = welchTTest(nearIndices, farIndices);

    const nearMean = nearIndices.length > 0
      ? nearIndices.reduce((a, b) => a + b, 0) / nearIndices.length
      : 0;
    const farMean = farIndices.length > 0
      ? farIndices.reduce((a, b) => a + b, 0) / farIndices.length
      : 0;

    results.push({
      controlType: 'population_stratified',
      comparison: `Population Q${q}: <${faultThreshold}km vs >=${faultThreshold}km`,
      nearFaultCount: nearFault.length,
      farFaultCount: farFault.length,
      nearFaultMeanIndex: nearMean,
      farFaultMeanIndex: farMean,
      tStat,
      pValue,
      effectHolds: pValue < 0.05 && nearMean > farMean,
    });
  }

  return results;
}

/**
 * Control Analysis 3: Region-controlled comparison
 * Tests fault effect within each geographic region
 */
export function runRegionControlledAnalysis(
  cells: Array<{
    cellId: string;
    lat: number;
    lng: number;
    faultDistanceKm: number | null;
    windowIndex: number;
  }>,
  faultThreshold: number = 100
): ControlAnalysisResult[] {
  const results: ControlAnalysisResult[] = [];

  for (const region of REGIONS) {
    const regionCells = cells.filter(
      c => isInRegion(c.lat, c.lng, region) && c.faultDistanceKm !== null
    );

    const nearFault = regionCells.filter(c => c.faultDistanceKm! < faultThreshold);
    const farFault = regionCells.filter(c => c.faultDistanceKm! >= faultThreshold);

    const nearIndices = nearFault.map(c => c.windowIndex);
    const farIndices = farFault.map(c => c.windowIndex);

    const { tStat, pValue } = welchTTest(nearIndices, farIndices);

    const nearMean = nearIndices.length > 0
      ? nearIndices.reduce((a, b) => a + b, 0) / nearIndices.length
      : 0;
    const farMean = farIndices.length > 0
      ? farIndices.reduce((a, b) => a + b, 0) / farIndices.length
      : 0;

    results.push({
      controlType: 'region_controlled',
      comparison: `${region.name}: <${faultThreshold}km vs >=${faultThreshold}km`,
      nearFaultCount: nearFault.length,
      farFaultCount: farFault.length,
      nearFaultMeanIndex: nearMean,
      farFaultMeanIndex: farMean,
      tStat,
      pValue,
      effectHolds: pValue < 0.05 && nearMean > farMean,
    });
  }

  return results;
}

/**
 * Control Analysis 4: Null comparison with coastline
 * Tests if window areas cluster near coastlines (should NOT if fault effect is real)
 */
export function runCoastlineNullComparison(
  cells: Array<{
    cellId: string;
    coastlineDistanceKm: number | null;
    windowIndex: number;
  }>,
  nearThreshold: number = 50,
  farThreshold: number = 200
): ControlAnalysisResult {
  const validCells = cells.filter(c => c.coastlineDistanceKm !== null);

  const nearCoast = validCells.filter(c => c.coastlineDistanceKm! < nearThreshold);
  const farCoast = validCells.filter(c => c.coastlineDistanceKm! > farThreshold);

  const nearIndices = nearCoast.map(c => c.windowIndex);
  const farIndices = farCoast.map(c => c.windowIndex);

  const { tStat, pValue } = welchTTest(nearIndices, farIndices);

  const nearMean = nearIndices.length > 0
    ? nearIndices.reduce((a, b) => a + b, 0) / nearIndices.length
    : 0;
  const farMean = farIndices.length > 0
    ? farIndices.reduce((a, b) => a + b, 0) / farIndices.length
    : 0;

  // For null comparison, we WANT the effect to NOT hold
  // If it does hold, that suggests our fault finding might be spurious
  return {
    controlType: 'null_coastline',
    comparison: `<${nearThreshold}km vs >${farThreshold}km from coastline`,
    nearFaultCount: nearCoast.length,
    farFaultCount: farCoast.length,
    nearFaultMeanIndex: nearMean,
    farFaultMeanIndex: farMean,
    tStat,
    pValue,
    effectHolds: pValue < 0.05 && nearMean > farMean,
  };
}

/**
 * Calculate Pearson correlation coefficient
 */
export function pearsonCorrelation(x: number[], y: number[]): { r: number; pValue: number } {
  if (x.length !== y.length || x.length < 3) {
    return { r: 0, pValue: 1 };
  }

  const n = x.length;
  const meanX = x.reduce((a, b) => a + b, 0) / n;
  const meanY = y.reduce((a, b) => a + b, 0) / n;

  let sumXY = 0;
  let sumX2 = 0;
  let sumY2 = 0;

  for (let i = 0; i < n; i++) {
    const dx = x[i] - meanX;
    const dy = y[i] - meanY;
    sumXY += dx * dy;
    sumX2 += dx * dx;
    sumY2 += dy * dy;
  }

  if (sumX2 === 0 || sumY2 === 0) {
    return { r: 0, pValue: 1 };
  }

  const r = sumXY / Math.sqrt(sumX2 * sumY2);

  // Calculate t-statistic for correlation
  const t = r * Math.sqrt((n - 2) / (1 - r * r));
  const pValue = 2 * (1 - normalCDF(Math.abs(t)));

  return { r, pValue };
}

/**
 * Run correlation analysis by region
 */
export function runRegionCorrelationAnalysis(
  cells: Array<{
    cellId: string;
    lat: number;
    lng: number;
    faultDistanceKm: number | null;
    windowIndex: number;
  }>
): Array<{
  region: string;
  cellCount: number;
  correlation: number;
  pValue: number;
  significantNegative: boolean;
}> {
  const results: Array<{
    region: string;
    cellCount: number;
    correlation: number;
    pValue: number;
    significantNegative: boolean;
  }> = [];

  for (const region of REGIONS) {
    const regionCells = cells.filter(
      c => isInRegion(c.lat, c.lng, region) && c.faultDistanceKm !== null
    );

    if (regionCells.length < 10) {
      results.push({
        region: region.name,
        cellCount: regionCells.length,
        correlation: 0,
        pValue: 1,
        significantNegative: false,
      });
      continue;
    }

    const faultDist = regionCells.map(c => c.faultDistanceKm!);
    const windowIdx = regionCells.map(c => c.windowIndex);

    const { r, pValue } = pearsonCorrelation(faultDist, windowIdx);

    // We expect NEGATIVE correlation (closer to fault = higher index)
    results.push({
      region: region.name,
      cellCount: regionCells.length,
      correlation: r,
      pValue,
      significantNegative: pValue < 0.05 && r < 0,
    });
  }

  return results;
}
