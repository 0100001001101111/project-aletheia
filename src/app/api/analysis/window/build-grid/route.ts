// @ts-nocheck

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import {
  assignToGrid,
  DEFAULT_CELL_SIZE,
  Investigation,
  RESOLUTIONS,
  assignPopulationQuartiles,
} from '@/lib/window-analysis/grid';
import {
  rankWindowAreas,
  cellToDbFormat,
} from '@/lib/window-analysis/window-index';

export async function POST(request: Request) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  // Optional parameters from request body
  const body = await request.json().catch(() => ({}));
  const cellSize = body.cellSize ?? DEFAULT_CELL_SIZE;
  const multiResolution = body.multiResolution ?? false;
  const resolutions = multiResolution ? [...RESOLUTIONS] : [cellSize];

  // Fetch all geolocated investigations in batches (Supabase default limit is 1000)
  const allInvestigations: Array<{ id: string; investigation_type: string; raw_data: Record<string, unknown> }> = [];
  const batchSize = 1000;
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const { data: batch, error: fetchError } = await supabase
      .from('aletheia_investigations')
      .select('id, investigation_type, raw_data')
      .in('investigation_type', ['ufo', 'bigfoot', 'haunting'])
      .range(offset, offset + batchSize - 1);

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (batch && batch.length > 0) {
      allInvestigations.push(...batch);
      offset += batchSize;
      hasMore = batch.length === batchSize;
    } else {
      hasMore = false;
    }
  }

  const investigations = allInvestigations;

  // Parse coordinates from raw_data
  const parsed: Investigation[] = [];
  for (const inv of investigations ?? []) {
    const location = inv.raw_data?.location as Record<string, unknown> | undefined;
    if (!location) continue;

    // Handle both latitude/longitude and lat/lng formats
    const lat = location.latitude ?? location.lat;
    const lng = location.longitude ?? location.lng;

    if (lat !== null && lat !== undefined && lng !== null && lng !== undefined) {
      const parsedLat = parseFloat(String(lat));
      const parsedLng = parseFloat(String(lng));

      // Validate coordinates are within valid ranges
      if (parsedLat >= -90 && parsedLat <= 90 && parsedLng >= -180 && parsedLng <= 180) {
        parsed.push({
          id: inv.id,
          investigationType: inv.investigation_type as 'ufo' | 'bigfoot' | 'haunting',
          latitude: parsedLat,
          longitude: parsedLng,
        });
      }
    }
  }

  if (parsed.length === 0) {
    return NextResponse.json(
      { error: 'No geolocated investigations found' },
      { status: 400 }
    );
  }

  // Clear existing grid cells
  // Also try to get coordinates from top-level columns for new imported data
  const { data: withCoords } = await supabase
    .from('aletheia_investigations')
    .select('id, investigation_type, latitude, longitude')
    .in('investigation_type', ['ufo', 'bigfoot', 'haunting'])
    .not('latitude', 'is', null)
    .not('longitude', 'is', null);

  // Add records with top-level coordinates
  for (const inv of withCoords ?? []) {
    if (inv.latitude && inv.longitude) {
      const lat = parseFloat(String(inv.latitude));
      const lng = parseFloat(String(inv.longitude));
      if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        // Check if already added
        if (!parsed.find(p => p.id === inv.id)) {
          parsed.push({
            id: inv.id,
            investigationType: inv.investigation_type as 'ufo' | 'bigfoot' | 'haunting',
            latitude: lat,
            longitude: lng,
          });
        }
      }
    }
  }

  const { error: deleteError } = await supabase
    .from('aletheia_grid_cells')
    .delete()
    .neq('cell_id', ''); // Delete all

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  // Build grids at each resolution
  const allStats: Array<{
    resolution: number;
    cellsCreated: number;
    topWindowAreas: Array<{ cellId: string; windowIndex: number; rank?: number }>;
    statistics: { meanIndex: number; medianIndex: number; stdDev: number };
    populationQuartiles: { q1: number; q2: number; q3: number; q4: number };
  }> = [];

  for (const resolution of resolutions) {
    // Build grid at this resolution
    const cells = assignToGrid(parsed, resolution);

    // Assign population quartiles (using total reports as proxy)
    assignPopulationQuartiles(cells);

    // Calculate window indices
    const ranking = rankWindowAreas(cells);

    // Count cells by quartile
    const quartileCounts = { q1: 0, q2: 0, q3: 0, q4: 0 };
    for (const cell of cells.values()) {
      if (cell.populationQuartile === 1) quartileCounts.q1++;
      else if (cell.populationQuartile === 2) quartileCounts.q2++;
      else if (cell.populationQuartile === 3) quartileCounts.q3++;
      else if (cell.populationQuartile === 4) quartileCounts.q4++;
    }

    // Prepare records for insert with resolution and quartile
    const records = [];
    for (const cell of cells.values()) {
      const windowResult = ranking.cells.find(r => r.cellId === cell.cellId);
      if (windowResult) {
        const baseRecord = cellToDbFormat(cell, windowResult);
        records.push({
          ...baseRecord,
          // Make cell_id unique per resolution by appending resolution
          cell_id: `${cell.cellId}_r${resolution}`,
          resolution,
          population_quartile: cell.populationQuartile,
        });
      }
    }

    // Batch insert in chunks
    const chunkSize = 100;
    for (let i = 0; i < records.length; i += chunkSize) {
      const chunk = records.slice(i, i + chunkSize);
      const { error: insertError } = await supabase
        .from('aletheia_grid_cells')
        .insert(chunk);

      if (insertError) {
        // Find the problematic record
        for (const record of chunk) {
          const { error: singleError } = await supabase
            .from('aletheia_grid_cells')
            .insert(record);
          if (singleError) {
            return NextResponse.json({
              error: singleError.message,
              problematicRecord: record,
              recordIndex: records.indexOf(record)
            }, { status: 500 });
          }
        }
      }
    }

    allStats.push({
      resolution,
      cellsCreated: cells.size,
      topWindowAreas: ranking.topWindowAreas.slice(0, 5).map(w => ({
        cellId: w.cellId,
        windowIndex: w.windowIndex,
        rank: w.rank,
      })),
      statistics: {
        meanIndex: ranking.meanIndex,
        medianIndex: ranking.medianIndex,
        stdDev: ranking.stdDev,
      },
      populationQuartiles: quartileCounts,
    });
  }

  return NextResponse.json({
    success: true,
    stats: {
      investigationsProcessed: parsed.length,
      multiResolution,
      resolutions: allStats,
    },
  });
}
