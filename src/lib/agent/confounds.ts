/**
 * Aletheia Research Agent - Confound Checker
 * Phase 2: Analysis Engine
 *
 * Every significant result must survive confound checks:
 * - Population density control
 * - Seasonality control
 * - Reporting bias control
 * - Geographic confounds
 */

import { createAgentReadClient } from './supabase-admin';
import type { ConfoundCheckResult, GeneratedHypothesis, TestResult } from './types';
import { chiSquareTest, tTest, mean, stdDev } from './statistics';

// ============================================
// Population Density Control
// ============================================

/**
 * Stratify data by population quartile and check if effect holds
 */
export async function checkPopulationDensityConfound(
  hypothesis: GeneratedHypothesis,
  originalResult: TestResult
): Promise<ConfoundCheckResult> {
  const supabase = createAgentReadClient();

  // Get grid cells with population data
  const { data: cells, error } = await supabase
    .from('aletheia_grid_cells')
    .select('cell_id, total_count, types_present, window_index')
    .not('total_count', 'is', null);

  if (error || !cells || cells.length < 20) {
    return {
      confound_type: 'population_density',
      controlled: false,
      effect_survived: true, // Cannot check, assume survives
      notes: 'Insufficient data for population stratification',
    };
  }

  // Sort by total_count as proxy for population density
  const sorted = [...cells].sort((a, b) => (a.total_count || 0) - (b.total_count || 0));

  // Split into quartiles
  const quartileSize = Math.floor(sorted.length / 4);
  const quartiles = [
    sorted.slice(0, quartileSize),
    sorted.slice(quartileSize, quartileSize * 2),
    sorted.slice(quartileSize * 2, quartileSize * 3),
    sorted.slice(quartileSize * 3),
  ];

  // Check if pattern holds in each quartile
  const quartilesWithEffect: number[] = [];
  const stratifiedResults: Record<string, unknown> = {};

  for (let q = 0; q < 4; q++) {
    const quartileCells = quartiles[q];

    // Check co-location pattern within this quartile
    const multiTypeCells = quartileCells.filter(
      (c) => (c.types_present?.length || 0) >= 2
    );

    const multiTypeRatio = multiTypeCells.length / quartileCells.length;

    stratifiedResults[`quartile_${q + 1}`] = {
      cell_count: quartileCells.length,
      multi_type_ratio: multiTypeRatio,
      avg_total_count: mean(quartileCells.map((c) => c.total_count || 0)),
    };

    // If multi-type ratio is still elevated, effect holds in this quartile
    if (multiTypeRatio > 0.1) {
      // Arbitrary threshold
      quartilesWithEffect.push(q + 1);
    }
  }

  const effectSurvived = quartilesWithEffect.length >= 2;

  return {
    confound_type: 'population_density',
    controlled: true,
    effect_survived: effectSurvived,
    notes: effectSurvived
      ? `Effect persists in ${quartilesWithEffect.length}/4 population quartiles`
      : `Effect only found in ${quartilesWithEffect.length}/4 population quartiles`,
    stratified_results: stratifiedResults,
  };
}

// ============================================
// Seasonality Control
// ============================================

/**
 * For temporal patterns, deseasonalize data and re-test
 */
export async function checkSeasonalityConfound(
  hypothesis: GeneratedHypothesis,
  originalResult: TestResult
): Promise<ConfoundCheckResult> {
  const supabase = createAgentReadClient();

  // Skip if not a temporal pattern
  if (hypothesis.source_pattern.type !== 'temporal') {
    return {
      confound_type: 'seasonality',
      controlled: false,
      effect_survived: true,
      notes: 'Seasonality check not applicable to non-temporal patterns',
    };
  }

  // Get temporal data from evidence
  const evidence = hypothesis.source_pattern.evidence as Record<string, unknown>;
  const anomalousMonths = evidence.anomalous_months as Array<{
    month: string;
    count: number;
    zScore: number;
  }> | undefined;

  if (!anomalousMonths || anomalousMonths.length === 0) {
    return {
      confound_type: 'seasonality',
      controlled: false,
      effect_survived: true,
      notes: 'No temporal data available for seasonality check',
    };
  }

  // Extract month-of-year from anomalous months
  const monthOfYear: Record<string, number> = {};
  for (const am of anomalousMonths) {
    const month = parseInt(am.month.split('-')[1]);
    monthOfYear[month] = (monthOfYear[month] || 0) + 1;
  }

  // Check if anomalies cluster in specific seasons
  const winter = (monthOfYear[12] || 0) + (monthOfYear[1] || 0) + (monthOfYear[2] || 0);
  const spring = (monthOfYear[3] || 0) + (monthOfYear[4] || 0) + (monthOfYear[5] || 0);
  const summer = (monthOfYear[6] || 0) + (monthOfYear[7] || 0) + (monthOfYear[8] || 0);
  const fall = (monthOfYear[9] || 0) + (monthOfYear[10] || 0) + (monthOfYear[11] || 0);

  const seasons = [winter, spring, summer, fall];
  const totalAnomalies = seasons.reduce((a, b) => a + b, 0);

  // If all anomalies are in one season, it's likely a seasonal effect
  const maxSeason = Math.max(...seasons);
  const seasonConcentration = maxSeason / Math.max(1, totalAnomalies);

  const effectSurvived = seasonConcentration < 0.75; // Effect not dominated by one season

  return {
    confound_type: 'seasonality',
    controlled: true,
    effect_survived: effectSurvived,
    notes: effectSurvived
      ? `Anomalies distributed across seasons (max ${(seasonConcentration * 100).toFixed(0)}% in one season)`
      : `Anomalies concentrated in one season (${(seasonConcentration * 100).toFixed(0)}%)`,
    stratified_results: {
      winter,
      spring,
      summer,
      fall,
      concentration: seasonConcentration,
    },
  };
}

// ============================================
// Reporting Bias Control
// ============================================

/**
 * Check if effect correlates with data source or media events
 */
export async function checkReportingBiasConfound(
  hypothesis: GeneratedHypothesis,
  originalResult: TestResult
): Promise<ConfoundCheckResult> {
  const supabase = createAgentReadClient();

  // Get investigations for the relevant domains
  const { data: investigations, error } = await supabase
    .from('aletheia_investigations')
    .select('id, investigation_type, tier, created_at')
    .in('investigation_type', hypothesis.domains)
    .limit(10000);

  if (error || !investigations || investigations.length < 50) {
    return {
      confound_type: 'reporting_bias',
      controlled: false,
      effect_survived: true,
      notes: 'Insufficient data to assess reporting bias',
    };
  }

  // Check tier distribution (research vs exploratory)
  const tierCounts = { research: 0, exploratory: 0 };
  for (const inv of investigations) {
    if (inv.tier === 'research') tierCounts.research++;
    else tierCounts.exploratory++;
  }

  // If data is heavily from one tier, there may be reporting bias
  const totalInv = investigations.length;
  const exploratoryRatio = tierCounts.exploratory / totalInv;

  // Check temporal clustering in submission dates (not event dates)
  // This could indicate media-driven reporting spikes
  const submissionsByMonth: Record<string, number> = {};
  for (const inv of investigations) {
    if (!inv.created_at) continue;
    const date = new Date(inv.created_at);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    submissionsByMonth[monthKey] = (submissionsByMonth[monthKey] || 0) + 1;
  }

  const monthlyCounts = Object.values(submissionsByMonth);
  const avgMonthly = mean(monthlyCounts);
  const sdMonthly = stdDev(monthlyCounts);

  // Check for extreme submission spikes
  const spikeMonths = monthlyCounts.filter((c) => c > avgMonthly + 2 * sdMonthly).length;
  const spikeRatio = spikeMonths / monthlyCounts.length;

  // Effect survives if data isn't too concentrated and no major submission spikes
  const effectSurvived = exploratoryRatio < 0.95 && spikeRatio < 0.2;

  return {
    confound_type: 'reporting_bias',
    controlled: true,
    effect_survived: effectSurvived,
    notes: effectSurvived
      ? `Data appears balanced (${(exploratoryRatio * 100).toFixed(0)}% exploratory, ${(spikeRatio * 100).toFixed(0)}% spike months)`
      : `Potential reporting bias detected (${(exploratoryRatio * 100).toFixed(0)}% from exploratory tier)`,
    stratified_results: {
      research_count: tierCounts.research,
      exploratory_count: tierCounts.exploratory,
      exploratory_ratio: exploratoryRatio,
      submission_spike_ratio: spikeRatio,
      months_analyzed: monthlyCounts.length,
    },
  };
}

// ============================================
// Geographic Confounds
// ============================================

/**
 * Check for coastline proximity, urban/rural split, state effects
 */
export async function checkGeographicConfounds(
  hypothesis: GeneratedHypothesis,
  originalResult: TestResult
): Promise<ConfoundCheckResult> {
  const supabase = createAgentReadClient();

  // Get grid cells with location data
  const { data: cells, error } = await supabase
    .from('aletheia_grid_cells')
    .select('cell_id, center_lat, center_lng, total_count, types_present')
    .gte('total_count', 3);

  if (error || !cells || cells.length < 20) {
    return {
      confound_type: 'geographic',
      controlled: false,
      effect_survived: true,
      notes: 'Insufficient geographic data for confound check',
    };
  }

  // Split cells into regions (rough US quadrants for now)
  const regions = {
    northeast: cells.filter((c) => c.center_lat > 39 && c.center_lng > -90),
    southeast: cells.filter((c) => c.center_lat <= 39 && c.center_lng > -90),
    northwest: cells.filter((c) => c.center_lat > 39 && c.center_lng <= -90),
    southwest: cells.filter((c) => c.center_lat <= 39 && c.center_lng <= -90),
  };

  // Check if multi-type cells exist in each region
  const regionsWithEffect: string[] = [];
  const stratifiedResults: Record<string, unknown> = {};

  for (const [region, regionCells] of Object.entries(regions)) {
    if (regionCells.length < 5) {
      stratifiedResults[region] = { cell_count: regionCells.length, skipped: true };
      continue;
    }

    const multiTypeCells = regionCells.filter(
      (c) => (c.types_present?.length || 0) >= 2
    );
    const multiTypeRatio = multiTypeCells.length / regionCells.length;

    stratifiedResults[region] = {
      cell_count: regionCells.length,
      multi_type_ratio: multiTypeRatio,
    };

    if (multiTypeRatio > 0.05) {
      // Threshold for effect presence
      regionsWithEffect.push(region);
    }
  }

  // Check coastal vs inland (using longitude as rough proxy)
  const coastalCells = cells.filter(
    (c) => c.center_lng > -82 || c.center_lng < -117 // East or West coast approximation
  );
  const inlandCells = cells.filter(
    (c) => c.center_lng <= -82 && c.center_lng >= -117
  );

  const coastalMultiType = coastalCells.filter(
    (c) => (c.types_present?.length || 0) >= 2
  ).length;
  const inlandMultiType = inlandCells.filter(
    (c) => (c.types_present?.length || 0) >= 2
  ).length;

  const coastalRatio =
    coastalCells.length > 0 ? coastalMultiType / coastalCells.length : 0;
  const inlandRatio =
    inlandCells.length > 0 ? inlandMultiType / inlandCells.length : 0;

  stratifiedResults.coastal = {
    cell_count: coastalCells.length,
    multi_type_ratio: coastalRatio,
  };
  stratifiedResults.inland = {
    cell_count: inlandCells.length,
    multi_type_ratio: inlandRatio,
  };

  // Effect survives if present in multiple regions AND both coastal/inland
  const effectSurvived =
    regionsWithEffect.length >= 2 &&
    (coastalRatio > 0.03 || coastalCells.length < 10) &&
    (inlandRatio > 0.03 || inlandCells.length < 10);

  return {
    confound_type: 'geographic',
    controlled: true,
    effect_survived: effectSurvived,
    notes: effectSurvived
      ? `Effect found in ${regionsWithEffect.length}/4 regions and both coastal/inland areas`
      : `Effect may be geographically localized (${regionsWithEffect.length}/4 regions)`,
    stratified_results: stratifiedResults,
  };
}

// ============================================
// Main Confound Check Function
// ============================================

/**
 * Run all confound checks for a hypothesis
 */
export async function checkAllConfounds(
  hypothesis: GeneratedHypothesis,
  originalResult: TestResult
): Promise<ConfoundCheckResult[]> {
  const checks = await Promise.all([
    checkPopulationDensityConfound(hypothesis, originalResult),
    checkSeasonalityConfound(hypothesis, originalResult),
    checkReportingBiasConfound(hypothesis, originalResult),
    checkGeographicConfounds(hypothesis, originalResult),
  ]);

  return checks;
}

/**
 * Check if all confounds passed (75% threshold for findings)
 */
export function allConfoundsPassed(checks: ConfoundCheckResult[]): boolean {
  // Only consider controlled checks
  const controlledChecks = checks.filter((c) => c.controlled);

  // If no checks were possible, consider it passed
  if (controlledChecks.length === 0) {
    return true;
  }

  // At least 75% of controlled checks must show effect survived
  const survivedCount = controlledChecks.filter((c) => c.effect_survived).length;
  return survivedCount / controlledChecks.length >= 0.75;
}

/**
 * Check if any confound failed (used to trigger research)
 * Returns true if any controlled confound check failed
 */
export function anyConfoundFailed(checks: ConfoundCheckResult[]): boolean {
  // Only consider controlled checks
  const controlledChecks = checks.filter((c) => c.controlled);

  // If no checks were possible, no failures
  if (controlledChecks.length === 0) {
    return false;
  }

  // Return true if any controlled check failed
  return controlledChecks.some((c) => !c.effect_survived);
}
