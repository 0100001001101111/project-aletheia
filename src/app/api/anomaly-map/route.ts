/**
 * Anomaly Map API
 * Returns all anomaly points for map visualization
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET() {
  try {
    // Fetch all exploratory investigations with location data
    const { data, error } = await supabase
      .from('aletheia_investigations')
      .select('id, title, investigation_type, weirdness_score, raw_data, created_at')
      .in('investigation_type', ['bigfoot', 'haunting', 'ufo', 'crop_circle', 'bermuda_triangle', 'hotspot'])
      .not('raw_data', 'is', null);

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Transform data to map points
    const points: Array<{
      id: string;
      lat: number;
      lng: number;
      type: string;
      title: string;
      weirdness_score: number | null;
      year: number | null;
    }> = [];

    const counts: Record<string, number> = {
      bigfoot: 0,
      haunting: 0,
      ufo: 0,
      crop_circle: 0,
      bermuda_triangle: 0,
      hotspot: 0,
    };

    for (const record of data || []) {
      const rawData = record.raw_data as Record<string, unknown>;
      const location = rawData?.location as Record<string, unknown> | undefined;

      if (!location) continue;

      // Extract coordinates based on data structure
      let lat: number | undefined;
      let lng: number | undefined;

      if (record.investigation_type === 'ufo') {
        lat = location.latitude as number;
        lng = location.longitude as number;
      } else {
        lat = location.lat as number;
        lng = location.lng as number;
      }

      // Skip if no valid coordinates
      if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) {
        continue;
      }

      // Extract year from created_at
      let year: number | null = null;
      if (record.created_at) {
        const date = new Date(record.created_at);
        year = date.getFullYear();
        // Filter out import dates (2026)
        if (year >= 2026) year = null;
      }

      points.push({
        id: record.id,
        lat,
        lng,
        type: record.investigation_type,
        title: record.title?.substring(0, 100) || 'Unknown',
        weirdness_score: record.weirdness_score,
        year,
      });

      counts[record.investigation_type] = (counts[record.investigation_type] || 0) + 1;
    }

    return NextResponse.json({
      points,
      counts,
      total: points.length,
    });
  } catch (err) {
    console.error('API error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch anomaly data' },
      { status: 500 }
    );
  }
}
