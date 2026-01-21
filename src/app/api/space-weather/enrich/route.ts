/**
 * Space Weather Enrichment API Endpoint
 *
 * Enriches existing investigations with space weather context
 * by matching event timestamps to historical Kp data.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { classifyGeomagneticActivity, buildSpaceWeatherContext } from '@/lib/space-weather';

// Create Supabase admin client at runtime to avoid build-time env issues
function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

interface EnrichmentResult {
  investigation_id: string;
  kp_at_event: number | null;
  during_storm: boolean;
  error?: string;
}

export async function POST(request: NextRequest) {
  // Check for admin authorization
  const authHeader = request.headers.get('authorization');
  const expectedKey = process.env.BACKFILL_API_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!authHeader || !authHeader.includes(expectedKey?.slice(0, 20) || '')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const {
    investigation_type,
    batch_size = 100,
    offset = 0,
    max_hours_offset = 3
  } = body;

  try {
    // Fetch investigations that need enrichment
    let query = getSupabaseAdmin()
      .from('aletheia_investigations')
      .select('id, raw_data, created_at')
      .is('kp_at_event', null)
      .order('created_at', { ascending: true })
      .range(offset, offset + batch_size - 1);

    if (investigation_type) {
      query = query.eq('investigation_type', investigation_type);
    }

    const { data: investigations, error: fetchError } = await query;

    if (fetchError) {
      throw new Error(`Failed to fetch investigations: ${fetchError.message}`);
    }

    if (!investigations || investigations.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No investigations to enrich',
        enriched: 0,
      });
    }

    console.log(`Enriching ${investigations.length} investigations...`);

    const results: EnrichmentResult[] = [];
    let enrichedCount = 0;
    let errorCount = 0;

    for (const investigation of investigations) {
      try {
        // Extract event timestamp from raw_data
        const rawData = investigation.raw_data as Record<string, unknown>;
        const dateTimeStr = rawData?.date_time as string || rawData?.event_date as string;

        if (!dateTimeStr) {
          results.push({
            investigation_id: investigation.id,
            kp_at_event: null,
            during_storm: false,
            error: 'No event timestamp found',
          });
          continue;
        }

        const eventTimestamp = new Date(dateTimeStr);
        if (isNaN(eventTimestamp.getTime())) {
          results.push({
            investigation_id: investigation.id,
            kp_at_event: null,
            during_storm: false,
            error: 'Invalid timestamp format',
          });
          continue;
        }

        // Find closest Kp record within max_hours_offset hours
        const maxOffsetMs = max_hours_offset * 60 * 60 * 1000;
        const minTime = new Date(eventTimestamp.getTime() - maxOffsetMs);
        const maxTime = new Date(eventTimestamp.getTime() + maxOffsetMs);

        const { data: kpRecords, error: kpError } = await getSupabaseAdmin()
          .from('aletheia_space_weather')
          .select('timestamp, kp_index, ap_index')
          .gte('timestamp', minTime.toISOString())
          .lte('timestamp', maxTime.toISOString())
          .order('timestamp', { ascending: true })
          .limit(10);

        if (kpError) {
          throw new Error(`Kp query failed: ${kpError.message}`);
        }

        let closestKp: { kp_index: number; ap_index: number } | null = null;
        let closestDiff = Infinity;

        for (const record of kpRecords || []) {
          const recordTime = new Date(record.timestamp).getTime();
          const diff = Math.abs(eventTimestamp.getTime() - recordTime);
          if (diff < closestDiff) {
            closestDiff = diff;
            closestKp = record;
          }
        }

        if (!closestKp) {
          results.push({
            investigation_id: investigation.id,
            kp_at_event: null,
            during_storm: false,
            error: 'No Kp data found for timestamp',
          });
          continue;
        }

        // Build enrichment data
        const activity = classifyGeomagneticActivity(closestKp.kp_index);
        const context = buildSpaceWeatherContext({
          timestamp: eventTimestamp,
          kp: closestKp.kp_index,
          ap: closestKp.ap_index,
        });

        // Update investigation
        const { error: updateError } = await getSupabaseAdmin()
          .from('aletheia_investigations')
          .update({
            kp_at_event: closestKp.kp_index,
            during_geomagnetic_storm: activity.storm,
            during_major_storm: activity.majorStorm,
            space_weather: context,
          })
          .eq('id', investigation.id);

        if (updateError) {
          results.push({
            investigation_id: investigation.id,
            kp_at_event: closestKp.kp_index,
            during_storm: activity.storm,
            error: `Update failed: ${updateError.message}`,
          });
          errorCount++;
        } else {
          results.push({
            investigation_id: investigation.id,
            kp_at_event: closestKp.kp_index,
            during_storm: activity.storm,
          });
          enrichedCount++;
        }
      } catch (err) {
        results.push({
          investigation_id: investigation.id,
          kp_at_event: null,
          during_storm: false,
          error: err instanceof Error ? err.message : 'Unknown error',
        });
        errorCount++;
      }
    }

    return NextResponse.json({
      success: true,
      total_processed: investigations.length,
      enriched: enrichedCount,
      errors: errorCount,
      results: results.slice(0, 20), // Return sample of results
      next_offset: offset + investigations.length,
    });
  } catch (error) {
    console.error('Enrichment error:', error);
    return NextResponse.json(
      {
        error: 'Enrichment failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
