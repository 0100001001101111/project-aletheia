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
  runMonteCarloSimulation,
  runStratifiedMonteCarlo,
  runMultiResolutionAnalysis,
  toDbFormat,
} from '@/lib/window-analysis/monte-carlo';

export async function GET() {
  const supabase = await createClient();

  // Get most recent co-occurrence result
  const { data, error } = await supabase
    .from('aletheia_cooccurrence_results')
    .select('*')
    .order('analysis_date', { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') {
    // PGRST116 = no rows returned
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json(
      { result: null, message: 'No analysis results yet. Run POST to generate.' },
      { status: 404 }
    );
  }

  return NextResponse.json({ result: data });
}

export async function POST(request: Request) {
  const supabase = await createClient();

  // Get parameters from request
  const body = await request.json().catch(() => ({}));
  const shuffleCount = body.shuffleCount ?? 1000;
  const cellSize = body.cellSize ?? DEFAULT_CELL_SIZE;
  const multiResolution = body.multiResolution ?? false;
  const includeStratified = body.includeStratified ?? true;

  // Fetch all geolocated investigations in batches
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

  // Parse coordinates with validation
  const parsed: Investigation[] = [];
  for (const inv of allInvestigations) {
    const location = inv.raw_data?.location as Record<string, unknown> | undefined;
    if (!location) continue;

    const lat = location.latitude ?? location.lat;
    const lng = location.longitude ?? location.lng;

    if (lat !== null && lat !== undefined && lng !== null && lng !== undefined) {
      const parsedLat = parseFloat(String(lat));
      const parsedLng = parseFloat(String(lng));

      // Validate coordinates
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

  // If multi-resolution requested, run analysis at all resolutions
  if (multiResolution) {
    const multiResults = await runMultiResolutionAnalysis(
      parsed,
      [...RESOLUTIONS],
      { shuffleCount }
    );

    // Save results for each resolution
    for (const resResult of multiResults) {
      const dbRecord = toDbFormat(resResult.result);
      // Add stratified data as JSONB
      const fullRecord = {
        ...dbRecord,
        stratified_results: includeStratified ? resResult.stratifiedResults : null,
      };

      const { error: insertError } = await supabase
        .from('aletheia_cooccurrence_results')
        .insert(fullRecord);

      if (insertError) {
        console.error('Insert error for resolution', resResult.resolution, insertError);
      }
    }

    return NextResponse.json({
      success: true,
      multiResolution: true,
      resolutions: multiResults.map(r => ({
        resolution: r.resolution,
        resolutionKm: r.resolutionKm,
        totalCells: r.totalCells,
        pairings: r.result.pairings,
        strongestPairing: r.result.strongestPairing,
        strongestZScore: r.result.strongestZScore,
        windowEffectDetected: r.result.windowEffectDetected,
        stratifiedResults: includeStratified ? r.stratifiedResults : undefined,
      })),
    });
  }

  // Single resolution analysis
  const cells = assignToGrid(parsed, cellSize);
  assignPopulationQuartiles(cells);

  // Run Monte Carlo simulation
  const result = await runMonteCarloSimulation(cells, {
    shuffleCount,
    gridResolution: cellSize,
  });

  // Run stratified analysis if requested
  let stratifiedResults = null;
  if (includeStratified) {
    stratifiedResults = await runStratifiedMonteCarlo(cells, {
      shuffleCount,
      gridResolution: cellSize,
    });
  }

  // Save to database
  const dbRecord = toDbFormat(result);
  const fullRecord = {
    ...dbRecord,
    stratified_results: stratifiedResults,
  };

  const { error: insertError } = await supabase
    .from('aletheia_cooccurrence_results')
    .insert(fullRecord);

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    result: {
      analysisDate: result.analysisDate,
      totalCells: result.totalCells,
      shuffleCount: result.shuffleCount,
      pairings: result.pairings,
      strongestPairing: result.strongestPairing,
      strongestZScore: result.strongestZScore,
      windowEffectDetected: result.windowEffectDetected,
      computationTimeMs: result.computationTimeMs,
      stratifiedResults,
    },
  });
}
