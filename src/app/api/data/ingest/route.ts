// @ts-nocheck
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import {
  createSyncRecord,
  updateSyncRecord,
  ingestRecords,
  getSyncStatus,
} from '@/lib/data-ingestion/ingest';
import { DataSource } from '@/lib/data-ingestion/types';

/**
 * GET /api/data/ingest
 * Returns sync status for all data sources
 */
export async function GET() {
  const supabase = await createClient();

  try {
    const statuses = await getSyncStatus(supabase);

    // Also get record counts by source
    const { data: counts } = await supabase
      .from('aletheia_investigations')
      .select('data_source')
      .not('data_source', 'is', null);

    const countBySource: Record<string, number> = {};
    for (const row of counts ?? []) {
      const src = row.data_source as string;
      countBySource[src] = (countBySource[src] || 0) + 1;
    }

    return NextResponse.json({
      statuses,
      recordCounts: countBySource,
      supportedSources: ['nuforc', 'bfro'],
      documentation: {
        nuforc: {
          description: 'National UFO Reporting Center',
          dataAccess: 'No official API. Use Hugging Face dataset (kcimc/NUFORC) or request data via email.',
          huggingFaceUrl: 'https://huggingface.co/datasets/kcimc/NUFORC',
          format: 'JSON or CSV with Sighting, Occurred, Location, Shape, Text, etc.',
        },
        bfro: {
          description: 'Bigfoot Field Researchers Organization',
          dataAccess: 'No official API. Use timothyrenner/bfro_sightings_data or data.world dataset.',
          dataWorldUrl: 'https://data.world/timothyrenner/bfro-sightings-data',
          format: 'CSV with date, county, state, latitude, longitude, observed_text, etc.',
        },
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/data/ingest
 * Ingest data from uploaded file or URL
 *
 * Body:
 * - source: 'nuforc' | 'bfro'
 * - data: array of records (JSON)
 * - OR url: URL to fetch JSON/CSV from
 */
export async function POST(request: Request) {
  const supabase = await createClient();

  try {
    const body = await request.json();
    const { source, data, url } = body as {
      source: DataSource;
      data?: Record<string, unknown>[];
      url?: string;
    };

    // Validate source
    if (!source || !['nuforc', 'bfro'].includes(source)) {
      return NextResponse.json(
        { error: 'Invalid source. Must be "nuforc" or "bfro".' },
        { status: 400 }
      );
    }

    let records: Record<string, unknown>[] = [];

    // Get records from data or URL
    if (data && Array.isArray(data)) {
      records = data;
    } else if (url) {
      // Fetch from URL
      const response = await fetch(url);
      if (!response.ok) {
        return NextResponse.json(
          { error: `Failed to fetch data from URL: ${response.statusText}` },
          { status: 400 }
        );
      }

      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('json')) {
        const json = await response.json();
        records = Array.isArray(json) ? json : [json];
      } else {
        // Assume CSV - basic parsing
        const text = await response.text();
        records = parseCSV(text);
      }
    } else {
      return NextResponse.json(
        { error: 'Must provide either "data" (array) or "url" to fetch from.' },
        { status: 400 }
      );
    }

    if (records.length === 0) {
      return NextResponse.json(
        { error: 'No records to ingest.' },
        { status: 400 }
      );
    }

    // Create sync record
    const syncId = await createSyncRecord(supabase, source, 'full');

    // Ingest records
    const result = await ingestRecords(supabase, records, source, syncId);

    return NextResponse.json({
      success: result.success,
      syncId: result.syncId,
      summary: {
        recordsProcessed: result.recordsProcessed,
        recordsAdded: result.recordsAdded,
        recordsSkipped: result.recordsSkipped,
        errorCount: result.errors.length,
      },
      errors: result.errors.slice(0, 20), // Limit error output
      nextSteps: result.recordsAdded > 0
        ? [
            'Run POST /api/analysis/window/build-grid to update grid cells',
            'Run POST /api/analysis/window/cooccurrence to update co-occurrence analysis',
            'Run GET /api/analysis/window/predictions/evaluate to check predictions',
          ]
        : [],
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * Basic CSV parser
 */
function parseCSV(text: string): Record<string, unknown>[] {
  const lines = text.split('\n').filter(line => line.trim());
  if (lines.length < 2) return [];

  // Parse header
  const headers = parseCSVLine(lines[0]);

  // Parse rows
  const records: Record<string, unknown>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length !== headers.length) continue;

    const record: Record<string, unknown> = {};
    for (let j = 0; j < headers.length; j++) {
      const value = values[j];
      // Try to parse numbers and booleans
      if (value === 'true') record[headers[j]] = true;
      else if (value === 'false') record[headers[j]] = false;
      else if (value !== '' && !isNaN(Number(value))) record[headers[j]] = Number(value);
      else record[headers[j]] = value;
    }
    records.push(record);
  }

  return records;
}

/**
 * Parse a single CSV line, handling quoted fields
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}
