// @ts-nocheck
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import {
  batchDistanceToFaults,
  batchDistanceToCoastlines,
  stratifyByFaultDistance,
  analyzeWindowIndexByFaultDistance,
  welchTTest,
  runWithinCaliforniaControl,
  runPopulationStratifiedControl,
  runRegionControlledAnalysis,
  runCoastlineNullComparison,
  runRegionCorrelationAnalysis,
} from '@/lib/window-analysis/geological';

export async function GET() {
  const supabase = await createClient();

  // Get most recent geological analysis result
  const { data, error } = await supabase
    .from('aletheia_geological_signature')
    .select('*')
    .order('analysis_date', { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json(
      { message: 'No geological analysis results yet. Run POST to generate.' },
      { status: 404 }
    );
  }

  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const supabase = await createClient();

  // Get parameters from request
  const body = await request.json().catch(() => ({}));
  const resolution = body.resolution ?? 0.25;
  const updateFaultDistances = body.updateFaultDistances ?? true;

  // Fetch grid cells at the specified resolution in batches
  const allCells: Array<{
    cell_id: string;
    center_lat: number;
    center_lng: number;
    window_index: number | null;
    nearest_fault_km: number | null;
    type_count: number | null;
    population_quartile: number | null;
  }> = [];
  const batchSize = 1000;
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const { data: batch, error: fetchError } = await supabase
      .from('aletheia_grid_cells')
      .select('cell_id, center_lat, center_lng, window_index, nearest_fault_km, type_count, population_quartile')
      .eq('resolution', resolution)
      .range(offset, offset + batchSize - 1);

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (batch && batch.length > 0) {
      allCells.push(...batch);
      offset += batchSize;
      hasMore = batch.length === batchSize;
    } else {
      hasMore = false;
    }
  }

  const cells = allCells;

  if (cells.length === 0) {
    return NextResponse.json(
      { error: 'No grid cells found. Run build-grid first.' },
      { status: 400 }
    );
  }

  // Calculate fault distances if needed
  let cellsWithFaults = cells;

  if (updateFaultDistances) {
    // Prepare points for batch calculation
    const points = cells.map(c => ({
      lat: c.center_lat,
      lng: c.center_lng,
      id: c.cell_id,
    }));

    // Calculate distances
    const faultDistances = await batchDistanceToFaults(points);

    // Update cells with fault distances
    const updates: Array<{ cell_id: string; nearest_fault_km: number }> = [];
    for (const cell of cells) {
      const result = faultDistances.get(cell.cell_id);
      if (result) {
        updates.push({
          cell_id: cell.cell_id,
          nearest_fault_km: Math.round(result.distance * 100) / 100,
        });
      }
    }

    // Batch update in chunks
    const chunkSize = 100;
    for (let i = 0; i < updates.length; i += chunkSize) {
      const chunk = updates.slice(i, i + chunkSize);
      for (const update of chunk) {
        await supabase
          .from('aletheia_grid_cells')
          .update({ nearest_fault_km: update.nearest_fault_km })
          .eq('cell_id', update.cell_id);
      }
    }

    // Re-fetch with updated distances in batches
    const updatedCells: typeof allCells = [];
    let refetchOffset = 0;
    let refetchMore = true;

    while (refetchMore) {
      const { data: batch, error: refetchError } = await supabase
        .from('aletheia_grid_cells')
        .select('cell_id, center_lat, center_lng, window_index, nearest_fault_km, type_count, population_quartile')
        .eq('resolution', resolution)
        .range(refetchOffset, refetchOffset + batchSize - 1);

      if (refetchError) {
        return NextResponse.json({ error: refetchError.message }, { status: 500 });
      }

      if (batch && batch.length > 0) {
        updatedCells.push(...batch);
        refetchOffset += batchSize;
        refetchMore = batch.length === batchSize;
      } else {
        refetchMore = false;
      }
    }

    cellsWithFaults = updatedCells.length > 0 ? updatedCells : cells;
  }

  // Prepare data for stratification and control analyses
  const cellData = cellsWithFaults.map(c => ({
    cellId: c.cell_id,
    lat: c.center_lat,
    lng: c.center_lng,
    faultDistanceKm: c.nearest_fault_km,
    windowIndex: c.window_index ?? 0,
    populationQuartile: c.population_quartile,
  }));

  // Calculate coastline distances for null comparison
  const coastlinePoints = cellsWithFaults.map(c => ({
    lat: c.center_lat,
    lng: c.center_lng,
    id: c.cell_id,
  }));
  const coastlineDistances = await batchDistanceToCoastlines(coastlinePoints);

  // Add coastline distances to cell data
  const cellDataWithCoastline = cellData.map(c => ({
    ...c,
    coastlineDistanceKm: coastlineDistances.get(c.cellId)?.distance ?? null,
  }));

  // Stratify by fault distance
  const stratified = stratifyByFaultDistance(cellData);

  // Analyze window index by fault distance
  const faultAnalysis = analyzeWindowIndexByFaultDistance(stratified);

  // Compare high-index vs low-index cells
  const windowIndices = cellData.map(c => c.windowIndex);
  const mean = windowIndices.reduce((a, b) => a + b, 0) / windowIndices.length;
  const stdDev = Math.sqrt(
    windowIndices.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0) / windowIndices.length
  );

  const highThreshold = mean + stdDev;
  const lowThreshold = mean - stdDev;

  const highIndexCells = cellData.filter(c => c.windowIndex > highThreshold && c.faultDistanceKm !== null);
  const lowIndexCells = cellData.filter(c => c.windowIndex < lowThreshold && c.faultDistanceKm !== null);

  // T-test comparing fault distances
  const highFaultDist = highIndexCells.map(c => c.faultDistanceKm!);
  const lowFaultDist = lowIndexCells.map(c => c.faultDistanceKm!);

  let faultDistanceComparison = null;
  if (highFaultDist.length > 5 && lowFaultDist.length > 5) {
    const { tStat, pValue } = welchTTest(highFaultDist, lowFaultDist);
    faultDistanceComparison = {
      highIndexMean: highFaultDist.reduce((a, b) => a + b, 0) / highFaultDist.length,
      lowIndexMean: lowFaultDist.reduce((a, b) => a + b, 0) / lowFaultDist.length,
      tStat,
      pValue,
      significant: pValue < 0.05,
    };
  }

  // ========================================
  // RUN CONTROL ANALYSES
  // ========================================

  // Control 1: Within-California test
  const withinCaliforniaControl = runWithinCaliforniaControl(cellData);

  // Control 2: Population-stratified comparison
  const populationStratifiedControl = runPopulationStratifiedControl(cellData);

  // Control 3: Region-controlled comparison
  const regionControlledAnalysis = runRegionControlledAnalysis(cellData);

  // Control 4: Null comparison with coastline
  const coastlineNullComparison = runCoastlineNullComparison(cellDataWithCoastline);

  // Bonus: Region correlation analysis
  const regionCorrelations = runRegionCorrelationAnalysis(cellData);

  // Summarize control results
  const controlSummary = {
    withinCalifornia: withinCaliforniaControl,
    populationStratified: populationStratifiedControl,
    regionControlled: regionControlledAnalysis,
    coastlineNull: coastlineNullComparison,
    regionCorrelations,
  };

  // Determine if effect survives controls
  const effectSurvivesControls = {
    withinCalifornia: withinCaliforniaControl.effectHolds,
    populationQ1: populationStratifiedControl.find(p => p.comparison.includes('Q1'))?.effectHolds ?? false,
    populationQ4: populationStratifiedControl.find(p => p.comparison.includes('Q4'))?.effectHolds ?? false,
    pacific: regionControlledAnalysis.find(r => r.comparison.includes('Pacific'))?.effectHolds ?? false,
    central: regionControlledAnalysis.find(r => r.comparison.includes('Central'))?.effectHolds ?? false,
    eastern: regionControlledAnalysis.find(r => r.comparison.includes('Eastern'))?.effectHolds ?? false,
    coastlineNullRejected: !coastlineNullComparison.effectHolds, // We WANT this to be false
  };

  const robustFaultEffect =
    effectSurvivesControls.withinCalifornia ||
    (effectSurvivesControls.pacific && (effectSurvivesControls.central || effectSurvivesControls.eastern));

  // Save results to database
  const result = {
    analysis_date: new Date().toISOString(),
    resolution,
    total_cells: cellData.length,
    cells_with_fault_data: cellData.filter(c => c.faultDistanceKm !== null).length,
    high_index_threshold: highThreshold,
    low_index_threshold: lowThreshold,
    high_index_cell_count: highIndexCells.length,
    low_index_cell_count: lowIndexCells.length,
    fault_distance_high_mean: faultDistanceComparison?.highIndexMean ?? null,
    fault_distance_low_mean: faultDistanceComparison?.lowIndexMean ?? null,
    fault_distance_t_stat: faultDistanceComparison?.tStat ?? null,
    fault_distance_p_value: faultDistanceComparison?.pValue ?? null,
    geological_signature_detected: faultDistanceComparison?.significant ?? false,
    robust_fault_effect: robustFaultEffect,
    stratified_analysis: faultAnalysis,
    control_analyses: controlSummary,
    detailed_results: {
      faultDistanceComparison,
      faultAnalysis,
      controlSummary,
      effectSurvivesControls,
    },
  };

  const { error: insertError } = await supabase
    .from('aletheia_geological_signature')
    .insert(result);

  if (insertError) {
    console.error('Insert error:', insertError);
    // Continue anyway, return results
  }

  return NextResponse.json({
    success: true,
    result: {
      totalCells: result.total_cells,
      cellsWithFaultData: result.cells_with_fault_data,
      highIndexCellCount: result.high_index_cell_count,
      lowIndexCellCount: result.low_index_cell_count,
      faultDistanceComparison,
      faultAnalysis,
      geologicalSignatureDetected: result.geological_signature_detected,
      robustFaultEffect,
      controlAnalyses: {
        withinCalifornia: withinCaliforniaControl,
        populationStratified: populationStratifiedControl,
        regionControlled: regionControlledAnalysis,
        coastlineNull: coastlineNullComparison,
        regionCorrelations,
      },
      effectSurvivesControls,
    },
  });
}
