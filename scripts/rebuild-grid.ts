#!/usr/bin/env npx tsx
/**
 * Rebuild Grid Script
 * Rebuilds the analysis grid with all investigation data
 *
 * Usage: npx tsx scripts/rebuild-grid.ts
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

const DEFAULT_CELL_SIZE = 1.0;

interface Investigation {
  id: string;
  investigationType: 'ufo' | 'bigfoot' | 'haunting';
  latitude: number;
  longitude: number;
}

interface GridCell {
  cellId: string;
  centerLat: number;
  centerLng: number;
  ufoCount: number;
  bigfootCount: number;
  hauntingCount: number;
  totalCount: number;
  typesPresent: string[];
  typeCount: number;
  populationQuartile?: number;
}

function getCellId(lat: number, lng: number, cellSize: number): string {
  const latCell = Math.floor(lat / cellSize);
  const lngCell = Math.floor(lng / cellSize);
  return `${latCell}_${lngCell}`;
}

function assignToGrid(investigations: Investigation[], cellSize: number): Map<string, GridCell> {
  const grid = new Map<string, GridCell>();

  for (const inv of investigations) {
    const cellId = getCellId(inv.latitude, inv.longitude, cellSize);

    if (!grid.has(cellId)) {
      const latCell = Math.floor(inv.latitude / cellSize);
      const lngCell = Math.floor(inv.longitude / cellSize);
      grid.set(cellId, {
        cellId,
        centerLat: (latCell + 0.5) * cellSize,
        centerLng: (lngCell + 0.5) * cellSize,
        ufoCount: 0,
        bigfootCount: 0,
        hauntingCount: 0,
        totalCount: 0,
        typesPresent: [],
        typeCount: 0,
      });
    }

    const cell = grid.get(cellId)!;
    cell.totalCount++;

    if (inv.investigationType === 'ufo') {
      cell.ufoCount++;
      if (!cell.typesPresent.includes('ufo')) cell.typesPresent.push('ufo');
    } else if (inv.investigationType === 'bigfoot') {
      cell.bigfootCount++;
      if (!cell.typesPresent.includes('bigfoot')) cell.typesPresent.push('bigfoot');
    } else if (inv.investigationType === 'haunting') {
      cell.hauntingCount++;
      if (!cell.typesPresent.includes('haunting')) cell.typesPresent.push('haunting');
    }
    cell.typeCount = cell.typesPresent.length;
  }

  return grid;
}

function assignPopulationQuartiles(cells: Map<string, GridCell>): void {
  const sorted = [...cells.values()].sort((a, b) => a.totalCount - b.totalCount);
  const n = sorted.length;

  for (let i = 0; i < n; i++) {
    const cell = sorted[i];
    if (i < n * 0.25) cell.populationQuartile = 1;
    else if (i < n * 0.5) cell.populationQuartile = 2;
    else if (i < n * 0.75) cell.populationQuartile = 3;
    else cell.populationQuartile = 4;
  }
}

function calculateWindowIndex(cell: GridCell): number {
  const typeDiversity = cell.typeCount / 3;
  const avgCount = cell.totalCount / 3;
  const excessRatio = Math.max(1, avgCount);
  const rarityBonus = cell.typesPresent.includes('bigfoot') ? 1.2 : 1.0;
  return typeDiversity * Math.log(excessRatio + 1) * rarityBonus;
}

async function main() {
  console.log('=== Rebuild Grid ===\n');

  const parsed: Investigation[] = [];
  const seenIds = new Set<string>();

  // First get records with top-level coordinates (new imports)
  console.log('Fetching records with top-level coordinates...');
  const batchSize = 1000;
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const { data: batch, error } = await supabase
      .from('aletheia_investigations')
      .select('id, investigation_type, latitude, longitude')
      .in('investigation_type', ['ufo', 'bigfoot', 'haunting'])
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)
      .range(offset, offset + batchSize - 1);

    if (error) {
      console.error('Fetch error:', error);
      break;
    }

    for (const inv of batch || []) {
      if (inv.latitude && inv.longitude && !seenIds.has(inv.id)) {
        const lat = parseFloat(String(inv.latitude));
        const lng = parseFloat(String(inv.longitude));

        if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
          parsed.push({
            id: inv.id,
            investigationType: inv.investigation_type as 'ufo' | 'bigfoot' | 'haunting',
            latitude: lat,
            longitude: lng,
          });
          seenIds.add(inv.id);
        }
      }
    }

    offset += batchSize;
    hasMore = (batch?.length || 0) === batchSize;

    if (offset % 50000 === 0) {
      console.log(`  Processed ${offset} records...`);
    }
  }
  console.log(`  Found ${parsed.length.toLocaleString()} with top-level coords`);

  // Now get legacy records by data source (more specific queries avoid timeout)
  for (const source of ['bfro_legacy', 'haunted_places_legacy', 'nuforc_legacy']) {
    console.log(`Fetching ${source} records...`);
    offset = 0;
    hasMore = true;
    let sourceCount = 0;

    while (hasMore) {
      const { data: batch, error } = await supabase
        .from('aletheia_investigations')
        .select('id, investigation_type, raw_data')
        .eq('data_source', source)
        .range(offset, offset + batchSize - 1);

      if (error) {
        console.error(`Fetch error for ${source}:`, error);
        break;
      }

      for (const inv of batch || []) {
        if (seenIds.has(inv.id)) continue;

        const location = inv.raw_data?.location as Record<string, unknown> | undefined;
        if (!location) continue;

        const lat = location.latitude ?? location.lat;
        const lng = location.longitude ?? location.lng;

        if (lat != null && lng != null) {
          const parsedLat = parseFloat(String(lat));
          const parsedLng = parseFloat(String(lng));

          if (parsedLat >= -90 && parsedLat <= 90 && parsedLng >= -180 && parsedLng <= 180) {
            parsed.push({
              id: inv.id,
              investigationType: inv.investigation_type as 'ufo' | 'bigfoot' | 'haunting',
              latitude: parsedLat,
              longitude: parsedLng,
            });
            seenIds.add(inv.id);
            sourceCount++;
          }
        }
      }

      offset += batchSize;
      hasMore = (batch?.length || 0) === batchSize;
    }
    console.log(`  Found ${sourceCount.toLocaleString()} geolocated from ${source}`);
  }

  console.log(`Total geolocated investigations: ${parsed.length.toLocaleString()}\n`);

  if (parsed.length === 0) {
    console.error('No geolocated investigations found');
    process.exit(1);
  }

  // Count by type
  const byCounts = {
    ufo: parsed.filter(p => p.investigationType === 'ufo').length,
    bigfoot: parsed.filter(p => p.investigationType === 'bigfoot').length,
    haunting: parsed.filter(p => p.investigationType === 'haunting').length,
  };
  console.log('By type:');
  console.log(`  UFO: ${byCounts.ufo.toLocaleString()}`);
  console.log(`  Bigfoot: ${byCounts.bigfoot.toLocaleString()}`);
  console.log(`  Haunting: ${byCounts.haunting.toLocaleString()}\n`);

  // Clear existing grid cells
  console.log('Clearing existing grid...');
  const { error: deleteError } = await supabase
    .from('aletheia_grid_cells')
    .delete()
    .neq('cell_id', '');

  if (deleteError) {
    console.error('Delete error:', deleteError);
    process.exit(1);
  }

  // Build grid
  console.log('Building grid...');
  const cells = assignToGrid(parsed, DEFAULT_CELL_SIZE);
  console.log(`Created ${cells.size.toLocaleString()} cells\n`);

  // Assign population quartiles
  assignPopulationQuartiles(cells);

  // Calculate window indices and prepare records
  const records: Array<Record<string, unknown>> = [];
  let maxIndex = 0;
  let topCell: GridCell | null = null;

  for (const cell of cells.values()) {
    const windowIndex = calculateWindowIndex(cell);
    if (windowIndex > maxIndex) {
      maxIndex = windowIndex;
      topCell = cell;
    }

    records.push({
      cell_id: `${cell.cellId}_r${DEFAULT_CELL_SIZE}`,
      center_lat: cell.centerLat,
      center_lng: cell.centerLng,
      ufo_count: cell.ufoCount,
      bigfoot_count: cell.bigfootCount,
      haunting_count: cell.hauntingCount,
      total_count: cell.totalCount,
      types_present: cell.typesPresent,
      type_count: cell.typeCount,
      population_quartile: cell.populationQuartile,
      window_index: windowIndex,
      resolution: DEFAULT_CELL_SIZE,
    });
  }

  // Batch insert
  console.log('Inserting grid cells...');
  const chunkSize = 100;
  let inserted = 0;

  for (let i = 0; i < records.length; i += chunkSize) {
    const chunk = records.slice(i, i + chunkSize);
    const { error: insertError } = await supabase
      .from('aletheia_grid_cells')
      .insert(chunk);

    if (insertError) {
      console.error(`Insert error at ${i}:`, insertError.message);
    } else {
      inserted += chunk.length;
    }

    if (inserted % 500 === 0) {
      console.log(`  Inserted ${inserted}/${records.length} cells...`);
    }
  }

  // Statistics
  const indices = records.map(r => r.window_index as number);
  const mean = indices.reduce((a, b) => a + b, 0) / indices.length;
  const sorted = [...indices].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];

  // Count cells with multiple types
  const multiTypeCells = records.filter(r => (r.type_count as number) >= 2).length;
  const tripleCells = records.filter(r => (r.type_count as number) === 3).length;

  console.log('\n=== Grid Statistics ===');
  console.log(`Total cells: ${cells.size.toLocaleString()}`);
  console.log(`Multi-type cells (2+): ${multiTypeCells.toLocaleString()}`);
  console.log(`Triple-type cells: ${tripleCells.toLocaleString()}`);
  console.log(`Mean window index: ${mean.toFixed(3)}`);
  console.log(`Median window index: ${median.toFixed(3)}`);
  console.log(`Max window index: ${maxIndex.toFixed(3)}`);

  if (topCell) {
    console.log(`\nTop window area: ${topCell.cellId}`);
    console.log(`  Location: ${topCell.centerLat.toFixed(2)}, ${topCell.centerLng.toFixed(2)}`);
    console.log(`  UFO: ${topCell.ufoCount}, Bigfoot: ${topCell.bigfootCount}, Haunting: ${topCell.hauntingCount}`);
  }

  console.log('\n=== Done ===');
}

main().catch(console.error);
