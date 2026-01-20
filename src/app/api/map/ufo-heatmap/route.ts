/**
 * UFO Heatmap API Endpoint
 * Returns aggregated point data for heatmap rendering
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Type for rows from the materialized view (not in generated Supabase types)
interface HeatmapDataRow {
  id: string;
  title: string;
  lat: number;
  lng: number;
  triage_score: number;
  triage_status: string | null;
  year: number | null;
  physiological_effects: boolean;
  em_interference: boolean;
  shape: string | null;
  city: string | null;
  state: string | null;
}

interface HeatmapPoint {
  lat: number;
  lng: number;
  weight: number;
  id: string;
  title: string;
  year: number | null;
  physiological_effects: boolean;
  em_interference: boolean;
  triage_status: string | null;
  shape: string | null;
  city: string | null;
  state: string | null;
}

interface HeatmapResponse {
  points: HeatmapPoint[];
  total: number;
  filters_applied: string[];
  stats: {
    physio_count: number;
    em_count: number;
    verified_count: number;
    year_range: [number | null, number | null];
  };
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Parse filter parameters
    const signals = searchParams.getAll('signals');
    const minScore = parseInt(searchParams.get('minScore') || '0');
    const yearStart = searchParams.get('yearStart') ? parseInt(searchParams.get('yearStart')!) : null;
    const yearEnd = searchParams.get('yearEnd') ? parseInt(searchParams.get('yearEnd')!) : null;

    // Bounding box for viewport culling (optional)
    const minLat = searchParams.get('minLat') ? parseFloat(searchParams.get('minLat')!) : null;
    const maxLat = searchParams.get('maxLat') ? parseFloat(searchParams.get('maxLat')!) : null;
    const minLng = searchParams.get('minLng') ? parseFloat(searchParams.get('minLng')!) : null;
    const maxLng = searchParams.get('maxLng') ? parseFloat(searchParams.get('maxLng')!) : null;

    // Build the query - use type assertion since materialized view isn't in generated types
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabase as any)
      .from('ufo_heatmap_data')
      .select('id, title, lat, lng, triage_score, triage_status, year, physiological_effects, em_interference, shape, city, state');

    // Apply signal filters (OR logic - show if ANY signal is present)
    if (signals.length > 0) {
      const conditions: string[] = [];

      if (signals.includes('verified')) {
        conditions.push("triage_status.eq.verified");
      }
      if (signals.includes('physiological')) {
        conditions.push("physiological_effects.eq.true");
      }
      if (signals.includes('em')) {
        conditions.push("em_interference.eq.true");
      }

      if (conditions.length > 0) {
        query = query.or(conditions.join(','));
      }
    }

    // Apply score filter
    if (minScore > 0) {
      query = query.gte('triage_score', minScore);
    }

    // Apply year range filter
    if (yearStart !== null) {
      query = query.gte('year', yearStart);
    }
    if (yearEnd !== null) {
      query = query.lte('year', yearEnd);
    }

    // Apply bounding box filter if provided
    if (minLat !== null && maxLat !== null && minLng !== null && maxLng !== null) {
      query = query
        .gte('lat', minLat)
        .lte('lat', maxLat)
        .gte('lng', minLng)
        .lte('lng', maxLng);
    }

    const { data, error } = await query as { data: HeatmapDataRow[] | null; error: Error | null };

    if (error) {
      console.error('Heatmap query error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch heatmap data', details: error.message },
        { status: 500 }
      );
    }

    // Transform to heatmap points
    const points: HeatmapPoint[] = (data || []).map((row: HeatmapDataRow) => ({
      lat: row.lat,
      lng: row.lng,
      weight: Math.max(1, row.triage_score || 1), // Minimum weight of 1
      id: row.id,
      title: row.title,
      year: row.year,
      physiological_effects: row.physiological_effects,
      em_interference: row.em_interference,
      triage_status: row.triage_status,
      shape: row.shape,
      city: row.city,
      state: row.state,
    }));

    // Calculate stats
    const physioCount = points.filter(p => p.physiological_effects).length;
    const emCount = points.filter(p => p.em_interference).length;
    const verifiedCount = points.filter(p => p.triage_status === 'verified').length;
    const years = points.map(p => p.year).filter((y): y is number => y !== null);
    const yearRange: [number | null, number | null] = years.length > 0
      ? [Math.min(...years), Math.max(...years)]
      : [null, null];

    const response: HeatmapResponse = {
      points,
      total: points.length,
      filters_applied: signals.length > 0 ? signals : ['all'],
      stats: {
        physio_count: physioCount,
        em_count: emCount,
        verified_count: verifiedCount,
        year_range: yearRange,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Heatmap API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
