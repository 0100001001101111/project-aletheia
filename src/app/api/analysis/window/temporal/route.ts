// @ts-nocheck

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { getCellId } from '@/lib/window-analysis/grid';
import {
  buildCellTimeSeries,
  calculateCellCorrelations,
  runWithinCellTemporalAnalysis,
  runSeasonalConfoundAnalysis,
  CellTemporalData,
  CellCorrelationResult,
} from '@/lib/window-analysis/temporal';

export async function GET() {
  const supabase = await createClient();

  // Get most recent temporal analysis result
  const { data, error } = await supabase
    .from('aletheia_temporal_analysis')
    .select('*')
    .order('analysis_date', { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json(
      { message: 'No temporal analysis results yet. Run POST to generate.' },
      { status: 404 }
    );
  }

  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const supabase = await createClient();

  // Get parameters from request
  const body = await request.json().catch(() => ({}));
  const resolution = body.resolution ?? 1.0;
  const minReports = body.minReports ?? 20;
  const minMonths = body.minMonths ?? 24;
  const maxLagMonths = body.maxLagMonths ?? 6;

  // Fetch all investigations with dates
  // Note: Bigfoot dates are in created_at column, UFO dates in raw_data->>'date_time'
  // Haunting has no temporal data, so we exclude it
  type InvestigationRow = {
    id: string;
    investigation_type: string;
    raw_data: Record<string, unknown>;
    created_at: string | null;
  };

  const allInvestigations: InvestigationRow[] = [];
  const batchSize = 1000;
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const { data: batch, error: fetchError } = await supabase
      .from('aletheia_investigations')
      .select('id, investigation_type, raw_data, created_at')
      .in('investigation_type', ['ufo', 'bigfoot'])
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

  // Parse coordinates and dates
  interface ParsedEvent {
    id: string;
    type: 'ufo' | 'bigfoot';
    lat: number;
    lng: number;
    date: Date;
    cellId: string;
  }

  const events: ParsedEvent[] = [];
  let globalEarliest: Date | null = null;
  let globalLatest: Date | null = null;

  for (const inv of allInvestigations) {
    const rawData = inv.raw_data as Record<string, unknown>;
    const location = rawData?.location as Record<string, unknown> | undefined;
    if (!location) continue;

    const lat = location.latitude ?? location.lat;
    const lng = location.longitude ?? location.lng;

    if (lat === null || lat === undefined || lng === null || lng === undefined) continue;

    const parsedLat = parseFloat(String(lat));
    const parsedLng = parseFloat(String(lng));

    if (parsedLat < -90 || parsedLat > 90 || parsedLng < -180 || parsedLng > 180) continue;

    // Parse date based on investigation type
    // Bigfoot: dates are in created_at column (repurposed to store event date)
    // UFO: dates are in raw_data->>'date_time'
    let eventDate: Date | null = null;

    if (inv.investigation_type === 'bigfoot') {
      // Bigfoot dates are in created_at
      if (inv.created_at) {
        const parsed = new Date(inv.created_at);
        if (!isNaN(parsed.getTime()) && parsed.getFullYear() > 1900 && parsed.getFullYear() < 2100) {
          eventDate = parsed;
        }
      }
    } else if (inv.investigation_type === 'ufo') {
      // UFO dates are in raw_data.date_time
      const dateValue = rawData?.date_time;
      if (dateValue) {
        const parsed = new Date(String(dateValue));
        if (!isNaN(parsed.getTime()) && parsed.getFullYear() > 1900 && parsed.getFullYear() < 2100) {
          eventDate = parsed;
        }
      }
    }

    if (!eventDate) continue;

    // Track global date range
    if (!globalEarliest || eventDate < globalEarliest) globalEarliest = eventDate;
    if (!globalLatest || eventDate > globalLatest) globalLatest = eventDate;

    const cellId = getCellId(parsedLat, parsedLng, resolution);

    events.push({
      id: inv.id,
      type: inv.investigation_type as 'ufo' | 'bigfoot',
      lat: parsedLat,
      lng: parsedLng,
      date: eventDate,
      cellId,
    });
  }

  if (events.length === 0 || !globalEarliest || !globalLatest) {
    return NextResponse.json(
      { error: 'No events with valid dates found' },
      { status: 400 }
    );
  }

  // Generate global month range
  const months: string[] = [];
  const current = new Date(globalEarliest.getFullYear(), globalEarliest.getMonth(), 1);
  const endMonth = new Date(globalLatest.getFullYear(), globalLatest.getMonth(), 1);

  while (current <= endMonth) {
    const year = current.getFullYear();
    const month = String(current.getMonth() + 1).padStart(2, '0');
    months.push(`${year}-${month}`);
    current.setMonth(current.getMonth() + 1);
  }

  // Group events by cell
  const cellEvents = new Map<string, {
    cellId: string;
    lat: number;
    lng: number;
    events: Array<{ date: Date; type: 'ufo' | 'bigfoot' }>;
  }>();

  for (const event of events) {
    let cell = cellEvents.get(event.cellId);
    if (!cell) {
      cell = {
        cellId: event.cellId,
        lat: event.lat,
        lng: event.lng,
        events: [],
      };
      cellEvents.set(event.cellId, cell);
    }
    cell.events.push({ date: event.date, type: event.type });
  }

  // Filter qualifying cells and calculate correlations
  const excludedCounts = {
    insufficientTypes: 0,
    insufficientReports: 0,
    insufficientTimespan: 0,
  };

  const qualifyingCells: CellTemporalData[] = [];
  const cellResults: CellCorrelationResult[] = [];

  for (const [, cell] of cellEvents) {
    // Check type diversity
    const types = new Set(cell.events.map(e => e.type));
    if (types.size < 2) {
      excludedCounts.insufficientTypes++;
      continue;
    }

    // Check minimum reports
    if (cell.events.length < minReports) {
      excludedCounts.insufficientReports++;
      continue;
    }

    // Build time series
    const timeSeries = buildCellTimeSeries(
      cell.cellId,
      cell.lat,
      cell.lng,
      cell.events,
      months
    );

    // Check minimum timespan
    if (timeSeries.dateRange.spanMonths < minMonths) {
      excludedCounts.insufficientTimespan++;
      continue;
    }

    qualifyingCells.push(timeSeries);

    // Calculate correlations
    const correlations = calculateCellCorrelations(timeSeries, maxLagMonths);
    cellResults.push(correlations);
  }

  if (cellResults.length === 0) {
    return NextResponse.json({
      success: true,
      result: {
        message: 'No cells qualified for temporal analysis',
        totalEvents: events.length,
        totalCells: cellEvents.size,
        qualifyingCells: 0,
        excludedCells: excludedCounts,
        dateRange: {
          earliest: globalEarliest.toISOString(),
          latest: globalLatest.toISOString(),
          totalMonths: months.length,
        },
      },
    });
  }

  // Run aggregate analysis
  const analysis = runWithinCellTemporalAnalysis(cellResults, resolution, excludedCounts);

  // Run seasonal confound analysis
  const seasonalAnalysis = runSeasonalConfoundAnalysis(qualifyingCells, cellResults);

  // Save to database
  const dbResult = {
    analysis_date: analysis.analysisDate.toISOString(),
    resolution,
    qualifying_cell_count: analysis.qualifyingCellCount,
    excluded_insufficient_types: excludedCounts.insufficientTypes,
    excluded_insufficient_reports: excludedCounts.insufficientReports,
    excluded_insufficient_timespan: excludedCounts.insufficientTimespan,
    mean_r_ufo_bigfoot: analysis.aggregateStats.ufoBigfoot.meanR,
    mean_r_ufo_haunting: analysis.aggregateStats.ufoHaunting.meanR,
    mean_r_bigfoot_haunting: analysis.aggregateStats.bigfootHaunting.meanR,
    p_ufo_bigfoot: analysis.aggregateStats.ufoBigfoot.pValue,
    p_ufo_haunting: analysis.aggregateStats.ufoHaunting.pValue,
    p_bigfoot_haunting: analysis.aggregateStats.bigfootHaunting.pValue,
    temporal_window_detected: analysis.temporalWindowEffectDetected,
    interpretation: analysis.interpretation,
    // Seasonal confound analysis
    seasonal_confound_detected: seasonalAnalysis.seasonalConfoundDetected,
    raw_correlation: seasonalAnalysis.rawCorrelation.meanR,
    deseasonalized_correlation: seasonalAnalysis.deseasonalizedCorrelation.meanR,
    deseasonalized_p_value: seasonalAnalysis.deseasonalizedCorrelation.pValue,
    ufo_peak_month: seasonalAnalysis.ufoSeasonality.peakMonth,
    bigfoot_peak_month: seasonalAnalysis.bigfootSeasonality.peakMonth,
    seasonal_interpretation: seasonalAnalysis.interpretation,
    detailed_results: {
      aggregateStats: analysis.aggregateStats,
      topFlapCells: analysis.topFlapCells.map(c => ({
        cellId: c.cellId,
        lat: c.lat,
        lng: c.lng,
        maxCorrelation: c.maxCorrelation,
        correlations: c.correlations,
      })),
      seasonalAnalysis,
    },
  };

  const { error: insertError } = await supabase
    .from('aletheia_temporal_analysis')
    .insert(dbResult);

  if (insertError) {
    console.error('Insert error:', insertError);
  }

  return NextResponse.json({
    success: true,
    result: {
      totalEvents: events.length,
      totalCells: cellEvents.size,
      qualifyingCells: analysis.qualifyingCellCount,
      excludedCells: excludedCounts,
      dateRange: {
        earliest: globalEarliest.toISOString(),
        latest: globalLatest.toISOString(),
        totalMonths: months.length,
      },
      aggregateStats: analysis.aggregateStats,
      temporalWindowEffectDetected: analysis.temporalWindowEffectDetected,
      interpretation: analysis.interpretation,
      topFlapCells: analysis.topFlapCells.slice(0, 10).map(c => ({
        cellId: c.cellId,
        lat: c.lat,
        lng: c.lng,
        totalEvents: c.totalEvents,
        spanMonths: c.spanMonths,
        maxCorrelation: c.maxCorrelation,
        isTemporalWindow: c.isTemporalWindow,
        correlations: c.correlations,
      })),
      correlationDistribution: {
        ufoBigfoot: {
          strongPositive: analysis.aggregateStats.ufoBigfoot.strongPositive,
          strongNegative: analysis.aggregateStats.ufoBigfoot.strongNegative,
          total: analysis.aggregateStats.ufoBigfoot.cellCount,
        },
        ufoHaunting: {
          strongPositive: analysis.aggregateStats.ufoHaunting.strongPositive,
          strongNegative: analysis.aggregateStats.ufoHaunting.strongNegative,
          total: analysis.aggregateStats.ufoHaunting.cellCount,
        },
        bigfootHaunting: {
          strongPositive: analysis.aggregateStats.bigfootHaunting.strongPositive,
          strongNegative: analysis.aggregateStats.bigfootHaunting.strongNegative,
          total: analysis.aggregateStats.bigfootHaunting.cellCount,
        },
      },
      // Seasonal confound analysis
      seasonalAnalysis: {
        ufoSeasonality: {
          monthCounts: seasonalAnalysis.ufoSeasonality.monthCounts,
          isSeasonallyDistributed: seasonalAnalysis.ufoSeasonality.isSeasonallyDistributed,
          peakMonth: seasonalAnalysis.ufoSeasonality.peakMonth,
          troughMonth: seasonalAnalysis.ufoSeasonality.troughMonth,
          peakToTroughRatio: seasonalAnalysis.ufoSeasonality.peakToTroughRatio,
          chiSquare: seasonalAnalysis.ufoSeasonality.chiSquare,
          pValue: seasonalAnalysis.ufoSeasonality.pValue,
        },
        bigfootSeasonality: {
          monthCounts: seasonalAnalysis.bigfootSeasonality.monthCounts,
          isSeasonallyDistributed: seasonalAnalysis.bigfootSeasonality.isSeasonallyDistributed,
          peakMonth: seasonalAnalysis.bigfootSeasonality.peakMonth,
          troughMonth: seasonalAnalysis.bigfootSeasonality.troughMonth,
          peakToTroughRatio: seasonalAnalysis.bigfootSeasonality.peakToTroughRatio,
          chiSquare: seasonalAnalysis.bigfootSeasonality.chiSquare,
          pValue: seasonalAnalysis.bigfootSeasonality.pValue,
        },
        rawCorrelation: seasonalAnalysis.rawCorrelation,
        deseasonalizedCorrelation: seasonalAnalysis.deseasonalizedCorrelation,
        seasonalConfoundDetected: seasonalAnalysis.seasonalConfoundDetected,
        interpretation: seasonalAnalysis.interpretation,
      },
    },
  });
}
