// @ts-nocheck
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import {
  predictionToDbFormat,
  generatePerCapitaAnomalyPrediction,
  generateGapCellPrediction,
  generateRatioStabilityPrediction,
  generateNegativeControlPrediction,
  FalsifiablePredictionInput,
  WindowPrediction,
} from '@/lib/window-analysis/predictor';

export async function GET() {
  const supabase = await createClient();

  // Get all predictions
  const { data, error } = await supabase
    .from('aletheia_window_predictions')
    .select('*')
    .order('predicted_index', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Separate by status
  const pending = data?.filter(p => p.prediction_correct === null) ?? [];
  const evaluated = data?.filter(p => p.prediction_correct !== null) ?? [];

  const correctCount = evaluated.filter(p => p.prediction_correct).length;
  const accuracy = evaluated.length > 0
    ? (correctCount / evaluated.length) * 100
    : null;

  return NextResponse.json({
    predictions: data,
    summary: {
      total: data?.length ?? 0,
      pending: pending.length,
      evaluated: evaluated.length,
      correct: correctCount,
      accuracy: accuracy !== null ? `${accuracy.toFixed(1)}%` : 'N/A',
    },
  });
}

export async function POST(request: Request) {
  const supabase = await createClient();

  // Get parameters
  const body = await request.json().catch(() => ({}));
  const evaluationMonths = body.evaluationMonths ?? 12;
  const limitPerType = body.limitPerType ?? 5;

  // Check for existing predictions to avoid duplicates
  const { data: existingPredictions } = await supabase
    .from('aletheia_window_predictions')
    .select('cell_id, prediction_type')
    .is('prediction_correct', null);

  const existingKeys = new Set(
    existingPredictions?.map(p => `${p.cell_id}:${p.prediction_type}`) ?? []
  );

  const allPredictions: WindowPrediction[] = [];

  // ========================================
  // 1. PER-CAPITA ANOMALY PREDICTIONS
  // Q1/Q2 cells with high window index
  // ========================================
  const { data: perCapitaCells } = await supabase
    .from('aletheia_grid_cells')
    .select('*')
    .eq('resolution', 1.0)
    .in('population_quartile', [1, 2])
    .gte('window_index', 1.0)
    .order('window_index', { ascending: false })
    .limit(limitPerType * 2);

  for (const cell of perCapitaCells ?? []) {
    if (existingKeys.has(`${cell.cell_id}:per_capita_anomaly`)) continue;

    const input: FalsifiablePredictionInput = {
      cellId: cell.cell_id,
      centerLat: parseFloat(cell.center_lat),
      centerLng: parseFloat(cell.center_lng),
      windowIndex: parseFloat(cell.window_index) || 0,
      totalCount: cell.total_count || 0,
      typesPresent: cell.types_present || [],
      typeCount: cell.type_count || 0,
      populationQuartile: cell.population_quartile,
      ufoCount: cell.ufo_count || 0,
      bigfootCount: cell.bigfoot_count || 0,
      hauntingCount: cell.haunting_count || 0,
    };

    const prediction = generatePerCapitaAnomalyPrediction(input, evaluationMonths);
    if (prediction && allPredictions.filter(p => p.predictionType === 'per_capita_anomaly').length < limitPerType) {
      allPredictions.push(prediction);
    }
  }

  // ========================================
  // 2. GAP CELL PREDICTIONS
  // Cells adjacent to high-index cells but with low activity
  // Use raw query since RPC may not exist
  // ========================================
  const { data: gapCellData } = await supabase
    .from('aletheia_grid_cells')
    .select('*')
    .eq('resolution', 1.0)
    .lt('window_index', 1.0)
    .gte('total_count', 2)
    .gte('type_count', 2)
    .order('total_count', { ascending: false })
    .limit(limitPerType * 4);

  // For gap cells, we'll make both discrete and diffuse predictions
  let discreteCount = 0;
  let diffuseCount = 0;

  for (const cell of gapCellData ?? []) {
    const highNeighbors = cell.high_index_neighbors ?? 3; // Assume some neighbors

    const input: FalsifiablePredictionInput & { highIndexNeighbors: number } = {
      cellId: cell.cell_id,
      centerLat: parseFloat(cell.center_lat),
      centerLng: parseFloat(cell.center_lng),
      windowIndex: parseFloat(cell.window_index) || 0,
      totalCount: cell.total_count || 0,
      typesPresent: cell.types_present || [],
      typeCount: cell.type_count || 0,
      populationQuartile: cell.population_quartile,
      ufoCount: cell.ufo_count || 0,
      bigfootCount: cell.bigfoot_count || 0,
      hauntingCount: cell.haunting_count || 0,
      highIndexNeighbors: highNeighbors,
    };

    // Generate discrete prediction (stays low)
    if (!existingKeys.has(`${cell.cell_id}:gap_cell_discrete`) && discreteCount < limitPerType) {
      const discretePred = generateGapCellPrediction(input, false, evaluationMonths);
      if (discretePred) {
        allPredictions.push(discretePred);
        discreteCount++;
      }
    }

    // Generate diffuse prediction (increases) - fewer of these
    if (!existingKeys.has(`${cell.cell_id}:gap_cell_diffuse`) && diffuseCount < Math.ceil(limitPerType / 2)) {
      const diffusePred = generateGapCellPrediction(input, true, evaluationMonths);
      if (diffusePred) {
        allPredictions.push(diffusePred);
        diffuseCount++;
      }
    }
  }

  // ========================================
  // 3. RATIO STABILITY PREDICTIONS
  // Cells with both UFO and Bigfoot
  // ========================================
  const { data: ratioCells } = await supabase
    .from('aletheia_grid_cells')
    .select('*')
    .eq('resolution', 1.0)
    .gte('ufo_count', 5)
    .gte('bigfoot_count', 5)
    .order('total_count', { ascending: false })
    .limit(limitPerType * 2);

  for (const cell of ratioCells ?? []) {
    if (existingKeys.has(`${cell.cell_id}:ratio_stability`)) continue;

    const input: FalsifiablePredictionInput = {
      cellId: cell.cell_id,
      centerLat: parseFloat(cell.center_lat),
      centerLng: parseFloat(cell.center_lng),
      windowIndex: parseFloat(cell.window_index) || 0,
      totalCount: cell.total_count || 0,
      typesPresent: cell.types_present || [],
      typeCount: cell.type_count || 0,
      populationQuartile: cell.population_quartile,
      ufoCount: cell.ufo_count || 0,
      bigfootCount: cell.bigfoot_count || 0,
      hauntingCount: cell.haunting_count || 0,
    };

    const prediction = generateRatioStabilityPrediction(input, evaluationMonths);
    if (prediction && allPredictions.filter(p => p.predictionType === 'ratio_stability').length < limitPerType) {
      allPredictions.push(prediction);
    }
  }

  // ========================================
  // 4. NEGATIVE CONTROL PREDICTIONS
  // High-population cells with low activity
  // ========================================
  const { data: negativeCells } = await supabase
    .from('aletheia_grid_cells')
    .select('*')
    .eq('resolution', 1.0)
    .eq('population_quartile', 4)
    .lt('window_index', 1.0)
    .gte('total_count', 5)
    .order('total_count', { ascending: false })
    .limit(limitPerType * 2);

  for (const cell of negativeCells ?? []) {
    if (existingKeys.has(`${cell.cell_id}:negative_control`)) continue;

    const input: FalsifiablePredictionInput = {
      cellId: cell.cell_id,
      centerLat: parseFloat(cell.center_lat),
      centerLng: parseFloat(cell.center_lng),
      windowIndex: parseFloat(cell.window_index) || 0,
      totalCount: cell.total_count || 0,
      typesPresent: cell.types_present || [],
      typeCount: cell.type_count || 0,
      populationQuartile: cell.population_quartile,
      ufoCount: cell.ufo_count || 0,
      bigfootCount: cell.bigfoot_count || 0,
      hauntingCount: cell.haunting_count || 0,
    };

    const prediction = generateNegativeControlPrediction(input, evaluationMonths);
    if (prediction && allPredictions.filter(p => p.predictionType === 'negative_control').length < limitPerType) {
      allPredictions.push(prediction);
    }
  }

  if (allPredictions.length === 0) {
    return NextResponse.json({
      message: 'No new predictions could be generated',
      existingPredictionCount: existingPredictions?.length ?? 0,
    });
  }

  // Insert predictions
  const records = allPredictions.map(predictionToDbFormat);

  const { error: insertError } = await supabase
    .from('aletheia_window_predictions')
    .insert(records);

  if (insertError) {
    console.error('Insert error:', insertError);
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  // Summarize by type
  const byType = allPredictions.reduce((acc, p) => {
    acc[p.predictionType] = (acc[p.predictionType] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return NextResponse.json({
    success: true,
    predictionsCreated: allPredictions.length,
    byType,
    predictions: allPredictions.map(p => ({
      cellId: p.cellId,
      predictionType: p.predictionType,
      currentWindowIndex: p.currentWindowIndex,
      predictedIndex: p.predictedIndex,
      confidence: p.confidence,
      populationQuartile: p.populationQuartile,
      nullHypothesis: p.nullHypothesis,
      alternativeHypothesis: p.alternativeHypothesis,
      confirmationThreshold: p.confirmationThreshold,
      refutationThreshold: p.refutationThreshold,
      rationale: p.rationale,
      evaluationDate: p.evaluationDate,
    })),
  });
}
