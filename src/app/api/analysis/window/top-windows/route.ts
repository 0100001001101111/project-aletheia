// @ts-nocheck

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { interpretWindowIndex } from '@/lib/window-analysis/window-index';

export async function GET(request: Request) {
  const supabase = await createClient();

  // Parse query params
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') ?? '50');
  const minTypeCount = parseInt(searchParams.get('minTypeCount') ?? '1');

  // Get top window areas
  const { data: cells, error } = await supabase
    .from('aletheia_grid_cells')
    .select('*')
    .gte('type_count', minTypeCount)
    .order('window_index', { ascending: false, nullsFirst: false })
    .limit(limit);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Calculate stats for interpretation
  const allCells = cells ?? [];
  const indices = allCells.map(c => c.window_index ?? 0);
  const mean = indices.length > 0
    ? indices.reduce((a, b) => a + b, 0) / indices.length
    : 0;
  const variance = indices.length > 0
    ? indices.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / indices.length
    : 0;
  const stdDev = Math.sqrt(variance);

  // Enrich cells with interpretation
  const enrichedCells = allCells.map((cell, index) => ({
    ...cell,
    rank: index + 1,
    interpretation: interpretWindowIndex(cell.window_index ?? 0, mean, stdDev),
    zScore: stdDev > 0 ? ((cell.window_index ?? 0) - mean) / stdDev : 0,
  }));

  return NextResponse.json({
    cells: enrichedCells,
    statistics: {
      totalCells: allCells.length,
      meanWindowIndex: mean,
      stdDev,
      topCell: enrichedCells[0] ?? null,
    },
  });
}
