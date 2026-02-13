// @ts-nocheck

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { evaluatePrediction } from '@/lib/window-analysis/predictor';

interface PredictionRecord {
  id: string;
  cell_id: string;
  prediction_type: string;
  predicted_index: number;
  current_window_index: number;
  confidence: number;
  evaluation_date: string;
  prediction_correct: boolean | null;
  parameters: {
    nullHypothesis?: string;
    alternativeHypothesis?: string;
    confirmationThreshold?: number;
    refutationThreshold?: number;
    currentRatio?: number;
    predictedRatioMin?: number;
    predictedRatioMax?: number;
  };
}

/**
 * GET /api/analysis/window/predictions/evaluate
 * Get evaluation status for all predictions
 */
export async function GET() {
  const supabase = await createClient();

  // Get all predictions
  const { data: predictions, error } = await supabase
    .from('aletheia_window_predictions')
    .select('*')
    .order('evaluation_date', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const now = new Date();
  const pending: PredictionRecord[] = [];
  const ready: PredictionRecord[] = [];
  const evaluated: PredictionRecord[] = [];

  for (const pred of predictions ?? []) {
    const evalDate = new Date(pred.evaluation_date);

    if (pred.prediction_correct !== null) {
      evaluated.push(pred);
    } else if (evalDate <= now) {
      ready.push(pred);
    } else {
      pending.push(pred);
    }
  }

  return NextResponse.json({
    summary: {
      total: predictions?.length ?? 0,
      pending: pending.length,
      readyForEvaluation: ready.length,
      evaluated: evaluated.length,
    },
    readyForEvaluation: ready.map(p => ({
      id: p.id,
      cellId: p.cell_id,
      predictionType: p.prediction_type,
      evaluationDate: p.evaluation_date,
    })),
    evaluatedResults: evaluated.map(p => ({
      id: p.id,
      cellId: p.cell_id,
      predictionType: p.prediction_type,
      correct: p.prediction_correct,
    })),
    nextEvaluation: pending.length > 0 ? pending[0].evaluation_date : null,
  });
}

/**
 * POST /api/analysis/window/predictions/evaluate
 * Evaluate predictions that are ready
 *
 * Body:
 * - predictionIds: specific IDs to evaluate (optional, defaults to all ready)
 * - forceEvaluate: evaluate even if before evaluation date (default: false)
 */
export async function POST(request: Request) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const { predictionIds, forceEvaluate = false } = body as {
    predictionIds?: string[];
    forceEvaluate?: boolean;
  };

  // Get predictions to evaluate
  let query = supabase
    .from('aletheia_window_predictions')
    .select('*')
    .is('prediction_correct', null);

  if (predictionIds && predictionIds.length > 0) {
    query = query.in('id', predictionIds);
  } else if (!forceEvaluate) {
    // Only get predictions past their evaluation date
    query = query.lte('evaluation_date', new Date().toISOString());
  }

  const { data: predictions, error: fetchError } = await query;

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  if (!predictions || predictions.length === 0) {
    return NextResponse.json({
      message: 'No predictions ready for evaluation',
      hint: forceEvaluate
        ? 'No unevaluated predictions found'
        : 'Use forceEvaluate: true to evaluate predictions before their evaluation date',
    });
  }

  // Get unique cell IDs
  const cellIds = [...new Set(predictions.map(p => p.cell_id))];

  // Fetch current grid cell data
  const { data: cells, error: cellError } = await supabase
    .from('aletheia_grid_cells')
    .select('cell_id, window_index, ufo_count, bigfoot_count, total_count')
    .in('cell_id', cellIds);

  if (cellError) {
    return NextResponse.json({ error: cellError.message }, { status: 500 });
  }

  // Create lookup map
  const cellMap = new Map(cells?.map(c => [c.cell_id, c]) ?? []);

  // Evaluate each prediction
  const results: Array<{
    id: string;
    cellId: string;
    predictionType: string;
    confirmed: boolean;
    refuted: boolean;
    notes: string;
    actualIndex: number | null;
    actualRatio: number | null;
  }> = [];

  for (const pred of predictions) {
    const cell = cellMap.get(pred.cell_id);

    if (!cell) {
      results.push({
        id: pred.id,
        cellId: pred.cell_id,
        predictionType: pred.prediction_type,
        confirmed: false,
        refuted: false,
        notes: 'Cell not found in grid',
        actualIndex: null,
        actualRatio: null,
      });
      continue;
    }

    const actualIndex = parseFloat(cell.window_index) || 0;
    const actualRatio = cell.bigfoot_count > 0
      ? cell.ufo_count / cell.bigfoot_count
      : undefined;

    // Build prediction object for evaluation
    const predForEval = {
      ...pred,
      predictionType: pred.prediction_type as 'per_capita_anomaly' | 'gap_cell_discrete' | 'gap_cell_diffuse' | 'ratio_stability' | 'negative_control',
      confirmationThreshold: pred.parameters?.confirmationThreshold ?? pred.predicted_threshold ?? 1.0,
      refutationThreshold: pred.parameters?.refutationThreshold ?? 0.5,
      predictedRatioMin: pred.parameters?.predictedRatioMin,
      predictedRatioMax: pred.parameters?.predictedRatioMax,
    };

    const evalResult = evaluatePrediction(predForEval, actualIndex, actualRatio);

    results.push({
      id: pred.id,
      cellId: pred.cell_id,
      predictionType: pred.prediction_type,
      confirmed: evalResult.confirmed,
      refuted: evalResult.refuted,
      notes: evalResult.notes,
      actualIndex,
      actualRatio: actualRatio ?? null,
    });

    // Update prediction in database
    const isCorrect = evalResult.confirmed && !evalResult.refuted;
    await supabase
      .from('aletheia_window_predictions')
      .update({
        prediction_correct: isCorrect,
        result_supported: evalResult.confirmed,
        actual_value: actualIndex,
        tested_at: new Date().toISOString(),
        notes: evalResult.notes,
      })
      .eq('id', pred.id);
  }

  // Calculate summary statistics
  const confirmed = results.filter(r => r.confirmed && !r.refuted).length;
  const refuted = results.filter(r => r.refuted).length;
  const inconclusive = results.filter(r => !r.confirmed && !r.refuted).length;

  // Group by prediction type
  const byType: Record<string, { confirmed: number; refuted: number; inconclusive: number }> = {};
  for (const r of results) {
    if (!byType[r.predictionType]) {
      byType[r.predictionType] = { confirmed: 0, refuted: 0, inconclusive: 0 };
    }
    if (r.confirmed && !r.refuted) byType[r.predictionType].confirmed++;
    else if (r.refuted) byType[r.predictionType].refuted++;
    else byType[r.predictionType].inconclusive++;
  }

  return NextResponse.json({
    success: true,
    evaluated: results.length,
    summary: {
      confirmed,
      refuted,
      inconclusive,
      accuracy: results.length > 0 ? `${((confirmed / results.length) * 100).toFixed(1)}%` : 'N/A',
    },
    byType,
    results,
    interpretation: generateInterpretation(byType),
  });
}

function generateInterpretation(
  byType: Record<string, { confirmed: number; refuted: number; inconclusive: number }>
): string {
  const parts: string[] = [];

  // Per-capita anomalies
  const pca = byType['per_capita_anomaly'];
  if (pca) {
    const total = pca.confirmed + pca.refuted + pca.inconclusive;
    if (pca.confirmed > pca.refuted) {
      parts.push(`Per-capita anomalies: ${pca.confirmed}/${total} confirmed. Low-population high-activity cells maintained elevation - supports window hypothesis.`);
    } else {
      parts.push(`Per-capita anomalies: ${pca.refuted}/${total} refuted. Activity regressed to mean - suggests random fluctuation, not genuine windows.`);
    }
  }

  // Gap cells
  const discrete = byType['gap_cell_discrete'];
  const diffuse = byType['gap_cell_diffuse'];
  if (discrete || diffuse) {
    const discreteConfirmed = discrete?.confirmed ?? 0;
    const diffuseConfirmed = diffuse?.confirmed ?? 0;
    if (discreteConfirmed > diffuseConfirmed) {
      parts.push(`Gap cells: Discrete model confirmed. Windows appear to be localized phenomena, not diffuse.`);
    } else if (diffuseConfirmed > discreteConfirmed) {
      parts.push(`Gap cells: Diffuse model confirmed. Window activity spreads to adjacent areas.`);
    } else {
      parts.push(`Gap cells: Inconclusive. Neither discrete nor diffuse model clearly supported.`);
    }
  }

  // Ratio stability
  const ratio = byType['ratio_stability'];
  if (ratio) {
    const total = ratio.confirmed + ratio.refuted + ratio.inconclusive;
    if (ratio.confirmed > ratio.refuted) {
      parts.push(`Ratio stability: ${ratio.confirmed}/${total} confirmed. UFO/Bigfoot ratios remained stable - suggests shared underlying cause.`);
    } else {
      parts.push(`Ratio stability: ${ratio.refuted}/${total} refuted. Ratios drifted significantly - phenomena may be independent.`);
    }
  }

  // Negative controls
  const neg = byType['negative_control'];
  if (neg) {
    const total = neg.confirmed + neg.refuted + neg.inconclusive;
    if (neg.confirmed > neg.refuted) {
      parts.push(`Negative controls: ${neg.confirmed}/${total} confirmed. High-pop/low-activity cells remained low - windows ≠ population.`);
    } else {
      parts.push(`Negative controls: ${neg.refuted}/${total} refuted. Cells developed activity - windows may correlate with population.`);
    }
  }

  return parts.join('\n\n');
}
