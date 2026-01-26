/**
 * Aletheia Research Agent - Pattern Scanner
 * Phase 2: Analysis Engine
 *
 * Scans investigation data for anomalous patterns:
 * - Cross-domain co-location
 * - Temporal clustering
 * - Geographic anomalies
 * - Attribute correlations
 */

import { createAgentReadClient } from './supabase-admin';
import type { PatternCandidate, GridCellData, InvestigationRecord } from './types';
import { mean, stdDev, zScore } from './statistics';

// ============================================
// Scanner Configuration
// ============================================

const MIN_CELL_COUNT = 5; // Minimum events in a cell to consider
const MIN_COLOCATION_TYPES = 2; // Minimum phenomenon types for co-location
const ZSCORE_THRESHOLD = 2.0; // Z-score threshold for temporal anomalies
const MIN_TEMPORAL_CLUSTER = 10; // Minimum events in a month to flag

// ============================================
// Cross-Domain Co-location Scanner
// ============================================

/**
 * Scan for grid cells with multiple phenomenon types co-occurring
 */
export async function scanCoLocation(): Promise<PatternCandidate[]> {
  const supabase = createAgentReadClient();
  const patterns: PatternCandidate[] = [];

  // Get grid cells with multiple phenomenon types
  const { data: cells, error } = await supabase
    .from('aletheia_grid_cells')
    .select('*')
    .gte('type_count', MIN_COLOCATION_TYPES)
    .gte('total_count', MIN_CELL_COUNT)
    .order('window_index', { ascending: false, nullsFirst: false })
    .limit(100);

  if (error) {
    console.error('Error fetching grid cells:', error);
    return patterns;
  }

  if (!cells || cells.length === 0) {
    return patterns;
  }

  // Group cells by phenomenon type combinations
  const comboCounts: Record<
    string,
    { cells: GridCellData[]; types: string[]; totalEvents: number }
  > = {};

  for (const cell of cells as GridCellData[]) {
    const types = cell.types_present?.sort() || [];
    if (types.length < 2) continue;

    const key = types.join('+');
    if (!comboCounts[key]) {
      comboCounts[key] = { cells: [], types, totalEvents: 0 };
    }
    comboCounts[key].cells.push(cell);
    comboCounts[key].totalEvents += cell.total_count;
  }

  // Generate patterns for significant combinations
  for (const [combo, data] of Object.entries(comboCounts)) {
    if (data.cells.length < 3) continue; // Need at least 3 cells

    // Calculate average window index for these cells
    const windowIndices = data.cells
      .map((c) => c.window_index)
      .filter((w): w is number => w != null);
    const avgWindowIndex = windowIndices.length > 0 ? mean(windowIndices) : 0;

    // Strength based on cell count and window index
    const strength = Math.min(1, (data.cells.length / 20) * (avgWindowIndex / 2 + 0.5));

    patterns.push({
      type: 'co-location',
      description: `${data.types.join(' + ')} co-occurrence in ${data.cells.length} geographic cells`,
      domains: data.types,
      evidence: {
        cell_count: data.cells.length,
        total_events: data.totalEvents,
        average_window_index: avgWindowIndex,
        top_cells: data.cells.slice(0, 5).map((c) => ({
          cell_id: c.cell_id,
          lat: c.center_lat,
          lng: c.center_lng,
          total: c.total_count,
          window_index: c.window_index,
        })),
      },
      preliminary_strength: strength,
    });
  }

  // Sort by strength
  return patterns.sort((a, b) => b.preliminary_strength - a.preliminary_strength);
}

// ============================================
// Temporal Clustering Scanner
// ============================================

/**
 * Scan for time periods with elevated activity
 */
export async function scanTemporalClusters(): Promise<PatternCandidate[]> {
  const supabase = createAgentReadClient();
  const patterns: PatternCandidate[] = [];

  // Get investigations with dates
  const { data: investigations, error } = await supabase
    .from('aletheia_investigations')
    .select('id, investigation_type, raw_data, created_at')
    .limit(50000);

  if (error) {
    console.error('Error fetching investigations:', error);
    return patterns;
  }

  if (!investigations || investigations.length === 0) {
    return patterns;
  }

  // Extract dates and group by month
  interface MonthData {
    count: number;
    types: Record<string, number>;
    ids: string[];
  }

  const monthlyByType: Record<string, Record<string, MonthData>> = {};

  for (const inv of investigations) {
    const type = inv.investigation_type;
    if (!type) continue;

    // Try to extract date from raw_data
    const rawData = inv.raw_data as Record<string, unknown> | null;
    let dateStr: string | null = null;

    if (rawData) {
      // Check common date fields
      dateStr =
        (rawData.date_time as string) ||
        (rawData.experience_date as string) ||
        (rawData.observation_date as string) ||
        (rawData.session_date as string) ||
        (rawData.apparition_date as string);
    }

    if (!dateStr) {
      // Fall back to created_at
      dateStr = inv.created_at;
    }

    if (!dateStr) continue;

    // Parse to month key (YYYY-MM)
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) continue;

    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    // Initialize structures
    if (!monthlyByType[type]) {
      monthlyByType[type] = {};
    }
    if (!monthlyByType[type][monthKey]) {
      monthlyByType[type][monthKey] = { count: 0, types: {}, ids: [] };
    }

    monthlyByType[type][monthKey].count++;
    monthlyByType[type][monthKey].ids.push(inv.id);
  }

  // Analyze each investigation type for temporal anomalies
  for (const [type, monthlyData] of Object.entries(monthlyByType)) {
    const months = Object.keys(monthlyData).sort();
    if (months.length < 12) continue; // Need at least a year of data

    const counts = months.map((m) => monthlyData[m].count);
    const avgCount = mean(counts);
    const sd = stdDev(counts);

    if (sd === 0) continue; // No variation

    // Find months with z-score > threshold
    const anomalousMonths: { month: string; count: number; zScore: number }[] = [];

    for (let i = 0; i < months.length; i++) {
      const z = zScore(counts[i], avgCount, sd);
      if (z > ZSCORE_THRESHOLD && counts[i] >= MIN_TEMPORAL_CLUSTER) {
        anomalousMonths.push({
          month: months[i],
          count: counts[i],
          zScore: z,
        });
      }
    }

    if (anomalousMonths.length > 0) {
      // Sort by z-score
      anomalousMonths.sort((a, b) => b.zScore - a.zScore);

      patterns.push({
        type: 'temporal',
        description: `${type} activity spike: ${anomalousMonths.length} months with z>${ZSCORE_THRESHOLD.toFixed(1)}`,
        domains: [type],
        evidence: {
          investigation_type: type,
          baseline_mean: avgCount,
          baseline_std: sd,
          anomalous_months: anomalousMonths.slice(0, 10),
          total_months_analyzed: months.length,
        },
        preliminary_strength: Math.min(
          1,
          (anomalousMonths[0]?.zScore || 0) / 5 // Normalize z-score to 0-1
        ),
      });
    }
  }

  return patterns.sort((a, b) => b.preliminary_strength - a.preliminary_strength);
}

// ============================================
// Geographic Anomaly Scanner
// ============================================

/**
 * Scan for unexpected spatial patterns
 */
export async function scanGeographicAnomalies(): Promise<PatternCandidate[]> {
  const supabase = createAgentReadClient();
  const patterns: PatternCandidate[] = [];

  // Get grid cells with window index data
  const { data: cells, error } = await supabase
    .from('aletheia_grid_cells')
    .select('*')
    .not('window_index', 'is', null)
    .gte('total_count', MIN_CELL_COUNT)
    .order('window_index', { ascending: false })
    .limit(200);

  if (error) {
    console.error('Error fetching grid cells:', error);
    return patterns;
  }

  if (!cells || cells.length === 0) {
    return patterns;
  }

  const gridCells = cells as GridCellData[];

  // Calculate window index statistics
  const windowIndices = gridCells.map((c) => c.window_index!);
  const avgIndex = mean(windowIndices);
  const sdIndex = stdDev(windowIndices);

  // Find high-index cells (potential "window" areas)
  const highIndexCells = gridCells.filter((c) => {
    const z = zScore(c.window_index!, avgIndex, sdIndex);
    return z > 2;
  });

  if (highIndexCells.length > 0) {
    patterns.push({
      type: 'geographic',
      description: `${highIndexCells.length} geographic "window" areas with elevated multi-phenomenon activity`,
      domains: Array.from(new Set(highIndexCells.flatMap((c) => c.types_present || []))),
      evidence: {
        cell_count: highIndexCells.length,
        average_window_index: avgIndex,
        std_window_index: sdIndex,
        top_cells: highIndexCells.slice(0, 10).map((c) => ({
          cell_id: c.cell_id,
          lat: c.center_lat,
          lng: c.center_lng,
          window_index: c.window_index,
          types: c.types_present,
          total: c.total_count,
        })),
      },
      preliminary_strength: Math.min(1, highIndexCells.length / 10),
    });
  }

  // Look for cells with excess ratio (observed/expected > 1)
  const excessCells = gridCells.filter((c) => (c.excess_ratio || 0) > 1.5);

  if (excessCells.length > 0) {
    patterns.push({
      type: 'geographic',
      description: `${excessCells.length} cells with excess phenomena (>1.5x expected based on population)`,
      domains: Array.from(new Set(excessCells.flatMap((c) => c.types_present || []))),
      evidence: {
        cell_count: excessCells.length,
        average_excess_ratio: mean(excessCells.map((c) => c.excess_ratio || 0)),
        top_cells: excessCells.slice(0, 10).map((c) => ({
          cell_id: c.cell_id,
          lat: c.center_lat,
          lng: c.center_lng,
          excess_ratio: c.excess_ratio,
          types: c.types_present,
          total: c.total_count,
        })),
      },
      preliminary_strength: Math.min(1, excessCells.length / 15),
    });
  }

  return patterns.sort((a, b) => b.preliminary_strength - a.preliminary_strength);
}

// ============================================
// Attribute Correlation Scanner
// ============================================

/**
 * Scan for patterns in investigation metadata
 */
export async function scanAttributeCorrelations(): Promise<PatternCandidate[]> {
  const supabase = createAgentReadClient();
  const patterns: PatternCandidate[] = [];

  // Get UFO investigations with rich metadata
  const { data: ufoData, error: ufoError } = await supabase
    .from('aletheia_investigations')
    .select('id, raw_data')
    .eq('investigation_type', 'ufo')
    .not('raw_data', 'is', null)
    .limit(10000);

  if (ufoError) {
    console.error('Error fetching UFO data:', ufoError);
  }

  if (ufoData && ufoData.length > 0) {
    // Analyze shape distribution
    const shapeCounts: Record<string, number> = {};
    const kmIndexByShape: Record<string, number[]> = {};

    for (const inv of ufoData) {
      const raw = inv.raw_data as Record<string, unknown> | null;
      if (!raw) continue;

      const shape = (raw.shape as string)?.toLowerCase();
      if (shape) {
        shapeCounts[shape] = (shapeCounts[shape] || 0) + 1;

        // Track geomagnetic Kp index by shape
        const geomag = raw.geomagnetic as Record<string, unknown> | null;
        if (geomag?.kp_index != null) {
          if (!kmIndexByShape[shape]) kmIndexByShape[shape] = [];
          kmIndexByShape[shape].push(geomag.kp_index as number);
        }
      }
    }

    // Find shapes with significant sample size
    const significantShapes = Object.entries(shapeCounts)
      .filter(([, count]) => count >= 50)
      .sort((a, b) => b[1] - a[1]);

    if (significantShapes.length > 0) {
      // Check if Kp index varies by shape
      const shapeKpMeans: Record<string, { mean: number; count: number }> = {};

      for (const [shape] of significantShapes) {
        const kps = kmIndexByShape[shape] || [];
        if (kps.length >= 30) {
          shapeKpMeans[shape] = {
            mean: mean(kps),
            count: kps.length,
          };
        }
      }

      if (Object.keys(shapeKpMeans).length >= 2) {
        const kpValues = Object.values(shapeKpMeans).map((v) => v.mean);
        const variation = stdDev(kpValues) / mean(kpValues);

        if (variation > 0.1) {
          // At least 10% variation
          patterns.push({
            type: 'attribute',
            description: `UFO shape correlates with geomagnetic Kp index (${Object.keys(shapeKpMeans).length} shapes analyzed)`,
            domains: ['ufo', 'geophysical'],
            evidence: {
              shape_kp_means: shapeKpMeans,
              coefficient_of_variation: variation,
              total_ufo_records: ufoData.length,
            },
            preliminary_strength: Math.min(1, variation * 2),
          });
        }
      }

      // Check time-of-day patterns
      const hourCounts: Record<string, number[]> = {};
      for (const inv of ufoData) {
        const raw = inv.raw_data as Record<string, unknown> | null;
        if (!raw?.date_time) continue;

        const dt = new Date(raw.date_time as string);
        if (isNaN(dt.getTime())) continue;

        const hour = dt.getHours();
        const shape = (raw.shape as string)?.toLowerCase();
        if (!shape) continue;

        if (!hourCounts[shape]) hourCounts[shape] = new Array(24).fill(0);
        hourCounts[shape][hour]++;
      }

      // Look for shapes with unusual time distributions
      for (const [shape, hours] of Object.entries(hourCounts)) {
        const total = hours.reduce((a, b) => a + b, 0);
        if (total < 100) continue;

        // Expected uniform distribution
        const expected = total / 24;
        const nighttime = hours.slice(20, 24).reduce((a, b) => a + b, 0) + hours.slice(0, 6).reduce((a, b) => a + b, 0);
        const nightRatio = nighttime / total;

        // UFOs are predominantly nocturnal (expected ~41% nighttime for uniform)
        if (nightRatio > 0.6) {
          patterns.push({
            type: 'attribute',
            description: `"${shape}" UFO shape is strongly nocturnal (${(nightRatio * 100).toFixed(0)}% nighttime)`,
            domains: ['ufo'],
            evidence: {
              shape,
              nighttime_percentage: nightRatio * 100,
              total_sightings: total,
              hourly_distribution: hours,
            },
            preliminary_strength: Math.min(1, (nightRatio - 0.41) * 2),
          });
        }
      }
    }
  }

  // Analyze witness count patterns
  const witnessData = ufoData?.filter((inv) => {
    const raw = inv.raw_data as Record<string, unknown> | null;
    return raw?.witness_count != null && (raw.witness_count as number) > 0;
  });

  if (witnessData && witnessData.length > 100) {
    const witnessCounts = witnessData.map((inv) => {
      const raw = inv.raw_data as Record<string, unknown>;
      return raw.witness_count as number;
    });

    const avgWitness = mean(witnessCounts);
    const sdWitness = stdDev(witnessCounts);

    // Find multi-witness events
    const multiWitness = witnessCounts.filter((w) => w >= 3);
    const multiWitnessRatio = multiWitness.length / witnessCounts.length;

    if (multiWitnessRatio > 0.15) {
      // More than 15% have 3+ witnesses
      patterns.push({
        type: 'attribute',
        description: `${(multiWitnessRatio * 100).toFixed(0)}% of UFO sightings have 3+ witnesses`,
        domains: ['ufo'],
        evidence: {
          average_witness_count: avgWitness,
          std_witness_count: sdWitness,
          multi_witness_percentage: multiWitnessRatio * 100,
          total_with_witness_data: witnessCounts.length,
        },
        preliminary_strength: Math.min(1, multiWitnessRatio * 2),
      });
    }
  }

  return patterns.sort((a, b) => b.preliminary_strength - a.preliminary_strength);
}

// ============================================
// Main Scanner Function
// ============================================

/**
 * Run all pattern scanners and combine results
 */
export async function scanForPatterns(): Promise<PatternCandidate[]> {
  const allPatterns: PatternCandidate[] = [];

  // Run all scanners in parallel
  const [coLocation, temporal, geographic, attribute] = await Promise.all([
    scanCoLocation(),
    scanTemporalClusters(),
    scanGeographicAnomalies(),
    scanAttributeCorrelations(),
  ]);

  allPatterns.push(...coLocation, ...temporal, ...geographic, ...attribute);

  // Sort by preliminary strength and return top candidates
  return allPatterns
    .sort((a, b) => b.preliminary_strength - a.preliminary_strength)
    .slice(0, 50); // Limit to top 50 patterns
}
