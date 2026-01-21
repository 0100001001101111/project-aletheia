#!/usr/bin/env npx tsx
/**
 * Generate Predictions Script
 * Creates falsifiable predictions for window hypothesis testing
 *
 * Usage: npx tsx scripts/generate-predictions.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      process.env[match[1]] = match[2];
    }
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

interface GridCell {
  cell_id: string;
  center_lat: number;
  center_lng: number;
  ufo_count: number;
  bigfoot_count: number;
  haunting_count: number;
  total_count: number;
  type_count: number;
  population_quartile: number;
  window_index: number;
}

interface Prediction {
  cell_id: string;
  prediction_type: string;
  predicted_index: number;
  current_window_index: number;
  confidence: number;
  evaluation_date: string;
  parameters: Record<string, unknown>;
}

async function main() {
  console.log('=== Generate Predictions ===\n');

  // Fetch all grid cells
  const { data: cells, error } = await supabase
    .from('aletheia_grid_cells')
    .select('*')
    .order('window_index', { ascending: false });

  if (error || !cells) {
    console.error('Failed to fetch cells:', error);
    process.exit(1);
  }

  console.log(`Loaded ${cells.length} grid cells\n`);

  // Clear existing predictions
  const { error: deleteError } = await supabase
    .from('aletheia_window_predictions')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');

  if (deleteError) {
    console.error('Failed to clear predictions:', deleteError);
  }

  const predictions: Prediction[] = [];
  const evaluationDate = new Date();
  evaluationDate.setFullYear(evaluationDate.getFullYear() + 1); // 1 year from now

  // 1. PER-CAPITA ANOMALIES
  // Find cells with ALL 3 types but relatively low total count (Q1/Q2)
  // These are genuine window candidates - diverse phenomena despite low activity
  console.log('Generating per-capita anomaly predictions...');
  const lowCountHighDiversity = cells.filter(
    c => c.population_quartile <= 2 && c.type_count === 3 && c.window_index > 1.5
  );

  for (const cell of lowCountHighDiversity.slice(0, 5)) {
    predictions.push({
      cell_id: cell.cell_id,
      prediction_type: 'per_capita_anomaly',
      predicted_index: cell.window_index * 0.8, // Predict 80% retention
      current_window_index: cell.window_index,
      confidence: 0.7,
      evaluation_date: evaluationDate.toISOString(),
      parameters: {
        nullHypothesis: 'Random fluctuation: index will regress to mean (<1.0)',
        alternativeHypothesis: 'Genuine window: index will remain elevated (>1.2)',
        confirmationThreshold: 1.2,
        refutationThreshold: 1.0,
        currentQuartile: cell.population_quartile,
        currentTypeCount: cell.type_count,
      },
    });
  }
  console.log(`  Created ${lowCountHighDiversity.slice(0, 5).length} per-capita anomaly predictions`);

  // 2. GAP CELLS (Discrete vs Diffuse)
  // Find cells adjacent to high-index cells but currently low activity
  console.log('Generating gap cell predictions...');
  const highIndexCells = cells.filter(c => c.window_index > 2.5);

  for (const highCell of highIndexCells.slice(0, 3)) {
    // Parse cell_id to find adjacent cells
    const match = highCell.cell_id.match(/^(-?\d+)_(-?\d+)/);
    if (!match) continue;

    const lat = parseInt(match[1]);
    const lng = parseInt(match[2]);

    // Find adjacent cells
    for (const [dLat, dLng] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const adjCellId = `${lat + dLat}_${lng + dLng}_r1`;
      const adjCell = cells.find(c => c.cell_id === adjCellId);

      if (adjCell && adjCell.window_index < 0.5 && adjCell.total_count < 10) {
        // Discrete prediction: stays low
        predictions.push({
          cell_id: adjCell.cell_id,
          prediction_type: 'gap_cell_discrete',
          predicted_index: 0.3,
          current_window_index: adjCell.window_index,
          confidence: 0.6,
          evaluation_date: evaluationDate.toISOString(),
          parameters: {
            nullHypothesis: 'Windows are diffuse: adjacent cell will gain activity (index > 0.5)',
            alternativeHypothesis: 'Windows are discrete: cell remains low (index < 0.5)',
            confirmationThreshold: 0.5,
            refutationThreshold: 0.8,
            adjacentTo: highCell.cell_id,
            adjacentWindowIndex: highCell.window_index,
          },
        });

        // Diffuse prediction: gains activity
        predictions.push({
          cell_id: adjCell.cell_id,
          prediction_type: 'gap_cell_diffuse',
          predicted_index: 0.8,
          current_window_index: adjCell.window_index,
          confidence: 0.4,
          evaluation_date: evaluationDate.toISOString(),
          parameters: {
            nullHypothesis: 'Windows are discrete: cell stays low (index < 0.5)',
            alternativeHypothesis: 'Windows are diffuse: adjacent cell gains activity (index > 0.5)',
            confirmationThreshold: 0.5,
            refutationThreshold: 0.3,
            adjacentTo: highCell.cell_id,
            adjacentWindowIndex: highCell.window_index,
          },
        });
        break; // One gap cell per high-index cell
      }
    }
  }
  console.log(`  Created gap cell predictions`);

  // 3. RATIO STABILITY
  // Find cells with both UFO and Bigfoot - predict ratio stability
  console.log('Generating ratio stability predictions...');
  const dualTypeCells = cells.filter(
    c => c.ufo_count > 5 && c.bigfoot_count > 2
  );

  for (const cell of dualTypeCells.slice(0, 5)) {
    const currentRatio = cell.ufo_count / cell.bigfoot_count;
    const ratioMin = currentRatio * 0.5;
    const ratioMax = currentRatio * 2.0;

    predictions.push({
      cell_id: cell.cell_id,
      prediction_type: 'ratio_stability',
      predicted_index: cell.window_index,
      current_window_index: cell.window_index,
      confidence: 0.65,
      evaluation_date: evaluationDate.toISOString(),
      parameters: {
        nullHypothesis: `Phenomena are independent: UFO/Bigfoot ratio will drift outside ${ratioMin.toFixed(1)}-${ratioMax.toFixed(1)}`,
        alternativeHypothesis: `Shared cause: ratio remains within ${ratioMin.toFixed(1)}-${ratioMax.toFixed(1)}`,
        currentRatio,
        predictedRatioMin: ratioMin,
        predictedRatioMax: ratioMax,
        currentUfoCount: cell.ufo_count,
        currentBigfootCount: cell.bigfoot_count,
      },
    });
  }
  console.log(`  Created ${dualTypeCells.slice(0, 5).length} ratio stability predictions`);

  // 4. NEGATIVE CONTROLS
  // High activity single-type cells - if window hypothesis is correct, should develop other types
  // If they stay single-type, that challenges the "window" concept
  console.log('Generating negative control predictions...');
  const highActivitySingleType = cells.filter(
    c => c.population_quartile === 4 && c.type_count === 1 && c.total_count > 100
  );

  for (const cell of highActivitySingleType.slice(0, 5)) {
    predictions.push({
      cell_id: cell.cell_id,
      prediction_type: 'negative_control',
      predicted_index: cell.window_index,
      current_window_index: cell.window_index,
      confidence: 0.6,
      evaluation_date: evaluationDate.toISOString(),
      parameters: {
        nullHypothesis: 'Window hypothesis: high-activity areas attract ALL phenomena (will gain 2nd type)',
        alternativeHypothesis: 'Phenomena are independent: single-type cell stays single-type',
        confirmationThreshold: 1, // stays at 1 type
        refutationThreshold: 2, // gains 2nd type
        currentQuartile: cell.population_quartile,
        currentTypeCount: cell.type_count,
        currentTotalCount: cell.total_count,
        primaryType: cell.ufo_count > 0 ? 'ufo' : cell.bigfoot_count > 0 ? 'bigfoot' : 'haunting',
      },
    });
  }
  console.log(`  Created ${highActivitySingleType.slice(0, 5).length} negative control predictions`);

  // Insert predictions
  console.log('\nInserting predictions...');
  const { error: insertError } = await supabase
    .from('aletheia_window_predictions')
    .insert(predictions);

  if (insertError) {
    console.error('Insert error:', insertError);
    process.exit(1);
  }

  // Summary
  console.log('\n=== Prediction Summary ===');
  const byType: Record<string, number> = {};
  for (const p of predictions) {
    byType[p.prediction_type] = (byType[p.prediction_type] || 0) + 1;
  }
  for (const [type, count] of Object.entries(byType)) {
    console.log(`  ${type}: ${count}`);
  }
  console.log(`\nTotal predictions: ${predictions.length}`);
  console.log(`Evaluation date: ${evaluationDate.toISOString().split('T')[0]}`);

  console.log('\n=== Prediction Details ===');
  for (const p of predictions) {
    console.log(`\n[${p.prediction_type}] Cell ${p.cell_id}`);
    console.log(`  H₀: ${p.parameters.nullHypothesis}`);
    console.log(`  H₁: ${p.parameters.alternativeHypothesis}`);
    console.log(`  Current index: ${p.current_window_index.toFixed(3)}`);
    console.log(`  Confidence: ${(p.confidence * 100).toFixed(0)}%`);
  }

  console.log('\n=== Done ===');
}

main().catch(console.error);
