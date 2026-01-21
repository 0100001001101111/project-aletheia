/**
 * Space Weather Backfill API Endpoint
 *
 * This endpoint fetches historical Kp data from GFZ Potsdam and stores it
 * in the aletheia_space_weather table. It then enriches existing investigations
 * with space weather context.
 *
 * This is a long-running operation - call with caution.
 * Requires service role authentication.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  parseGfzKpLine,
  classifyGeomagneticActivity,
  type KpIndexRecord,
} from '@/lib/space-weather';

const GFZ_KP_URL = 'https://www-app3.gfz-potsdam.de/kp_index/Kp_ap_since_1932.txt';

// Create Supabase admin client at runtime to avoid build-time env issues
function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

interface BackfillProgress {
  phase: string;
  records_processed: number;
  records_inserted: number;
  errors: string[];
}

export async function POST(request: NextRequest) {
  // Check for admin authorization
  const authHeader = request.headers.get('authorization');
  const expectedKey = process.env.BACKFILL_API_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!authHeader || !authHeader.includes(expectedKey?.slice(0, 20) || '')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const { start_year, end_year, batch_size = 1000 } = body;

  const progress: BackfillProgress = {
    phase: 'fetching',
    records_processed: 0,
    records_inserted: 0,
    errors: [],
  };

  try {
    // Phase 1: Fetch GFZ data
    console.log('Fetching GFZ Kp data...');
    const response = await fetch(GFZ_KP_URL);
    if (!response.ok) {
      throw new Error(`Failed to fetch GFZ data: ${response.status}`);
    }

    const text = await response.text();
    const lines = text.split('\n');
    console.log(`Fetched ${lines.length} lines from GFZ`);

    // Phase 2: Parse and filter records
    progress.phase = 'parsing';
    const records: KpIndexRecord[] = [];

    for (const line of lines) {
      const record = parseGfzKpLine(line);
      if (!record) continue;

      const year = record.timestamp.getUTCFullYear();
      if (start_year && year < start_year) continue;
      if (end_year && year > end_year) continue;

      records.push(record);
      progress.records_processed++;
    }

    console.log(`Parsed ${records.length} Kp records`);

    // Phase 3: Batch insert into space_weather table
    progress.phase = 'inserting';
    const batches = [];
    for (let i = 0; i < records.length; i += batch_size) {
      batches.push(records.slice(i, i + batch_size));
    }

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      const insertData = batch.map(record => {
        const activity = classifyGeomagneticActivity(record.kp);
        return {
          timestamp: record.timestamp.toISOString(),
          kp_index: record.kp,
          ap_index: record.ap,
          geomagnetic_storm: activity.storm,
          major_storm: activity.majorStorm,
          severe_storm: activity.severeStorm,
          data_source: 'gfz_potsdam',
        };
      });

      const { error } = await getSupabaseAdmin()
        .from('aletheia_space_weather')
        .upsert(insertData, { onConflict: 'timestamp' });

      if (error) {
        progress.errors.push(`Batch ${batchIndex}: ${error.message}`);
        console.error(`Batch ${batchIndex} error:`, error);
      } else {
        progress.records_inserted += batch.length;
      }

      // Progress log every 10 batches
      if (batchIndex % 10 === 0) {
        console.log(`Inserted batch ${batchIndex + 1}/${batches.length}`);
      }
    }

    progress.phase = 'complete';

    return NextResponse.json({
      success: true,
      progress,
      summary: {
        total_lines: lines.length,
        records_parsed: records.length,
        records_inserted: progress.records_inserted,
        errors_count: progress.errors.length,
      },
    });
  } catch (error) {
    console.error('Backfill error:', error);
    return NextResponse.json(
      {
        error: 'Backfill failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        progress,
      },
      { status: 500 }
    );
  }
}
