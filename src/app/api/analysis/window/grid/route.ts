import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = any;

interface GridCell {
  cell_id: string;
  center_lat: number;
  center_lng: number;
  ufo_count: number;
  bigfoot_count: number;
  haunting_count: number;
  total_count: number;
  type_count: number;
  types_present?: string[];
  window_index: number;
  excess_ratio?: number;
}

export async function GET() {
  const supabase = await createClient() as AnyClient;

  const { data: cells, error } = await supabase
    .from('aletheia_grid_cells')
    .select('*')
    .order('window_index', { ascending: false, nullsFirst: false }) as { data: GridCell[] | null; error: Error | null };

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Calculate summary stats
  const totalCells = cells?.length ?? 0;
  const cellsWithMultipleTypes = cells?.filter((c: GridCell) => c.type_count >= 2).length ?? 0;
  const tripleCells = cells?.filter((c: GridCell) => c.type_count === 3).length ?? 0;

  const totalReports = cells?.reduce((sum: number, c: GridCell) => sum + (c.total_count ?? 0), 0) ?? 0;
  const ufoTotal = cells?.reduce((sum: number, c: GridCell) => sum + (c.ufo_count ?? 0), 0) ?? 0;
  const bigfootTotal = cells?.reduce((sum: number, c: GridCell) => sum + (c.bigfoot_count ?? 0), 0) ?? 0;
  const hauntingTotal = cells?.reduce((sum: number, c: GridCell) => sum + (c.haunting_count ?? 0), 0) ?? 0;

  return NextResponse.json({
    cells,
    summary: {
      totalCells,
      cellsWithMultipleTypes,
      tripleCells,
      totalReports,
      byType: {
        ufo: ufoTotal,
        bigfoot: bigfootTotal,
        haunting: hauntingTotal,
      },
    },
  });
}
