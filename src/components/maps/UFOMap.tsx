'use client';

/**
 * UFO Heatmap Visualization
 * Interactive map showing 4,968 UFO reports with signal quality filters
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import Map, { Source, Layer, Popup, NavigationControl } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';

// Types
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

interface HeatmapData {
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

interface SignalFilters {
  verified: boolean;
  physiological: boolean;
  em: boolean;
}

interface ViewState {
  latitude: number;
  longitude: number;
  zoom: number;
}

// Convert points to GeoJSON
function pointsToGeoJSON(points: HeatmapPoint[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: points.map((point) => ({
      type: 'Feature' as const,
      geometry: {
        type: 'Point' as const,
        coordinates: [point.lng, point.lat],
      },
      properties: {
        id: point.id,
        title: point.title,
        weight: point.weight,
        year: point.year,
        physiological_effects: point.physiological_effects,
        em_interference: point.em_interference,
        triage_status: point.triage_status,
        shape: point.shape,
        city: point.city,
        state: point.state,
      },
    })),
  };
}

// Layer styles (typed as any to avoid Mapbox expression type complexity)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const heatmapLayerStyle: any = {
  id: 'ufo-heatmap',
  type: 'heatmap',
  source: 'ufo-points',
  maxzoom: 15,
  paint: {
    'heatmap-weight': ['interpolate', ['linear'], ['get', 'weight'], 0, 0, 10, 1],
    'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 0, 1, 15, 3],
    'heatmap-color': [
      'interpolate',
      ['linear'],
      ['heatmap-density'],
      0, 'rgba(33, 102, 172, 0)',
      0.2, 'rgb(103, 169, 207)',
      0.4, 'rgb(209, 229, 240)',
      0.6, 'rgb(253, 219, 199)',
      0.8, 'rgb(239, 138, 98)',
      1, 'rgb(178, 24, 43)',
    ],
    'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 0, 2, 15, 20],
    'heatmap-opacity': ['interpolate', ['linear'], ['zoom'], 12, 1, 15, 0],
  },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const pointLayerStyle: any = {
  id: 'ufo-points-circle',
  type: 'circle',
  source: 'ufo-points',
  minzoom: 12,
  paint: {
    'circle-radius': ['interpolate', ['linear'], ['zoom'], 12, 3, 15, 8],
    'circle-color': [
      'case',
      ['all', ['get', 'physiological_effects'], ['get', 'em_interference']],
      '#ffffff',
      ['get', 'physiological_effects'],
      '#ef4444',
      ['get', 'em_interference'],
      '#3b82f6',
      ['==', ['get', 'triage_status'], 'verified'],
      '#22c55e',
      '#6b7280',
    ],
    'circle-stroke-width': 1,
    'circle-stroke-color': '#000000',
    'circle-opacity': ['interpolate', ['linear'], ['zoom'], 12, 0, 13, 1],
  },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const faultLinesLayerStyle: any = {
  id: 'fault-lines',
  type: 'line',
  source: 'fault-lines',
  paint: {
    'line-color': '#ff2222',
    'line-width': 2,
    'line-opacity': 0.85,
  },
};

// USGS Quaternary Fault Database - limited to 2000 most significant faults
// Full database has 112,809 segments; this gets a manageable subset
const FAULT_LINES_URL = 'https://earthquake.usgs.gov/arcgis/rest/services/haz/Qfaults/MapServer/21/query?where=1%3D1&outFields=fault_name&f=geojson&outSR=4326&resultRecordCount=2000';

export default function UFOMap() {
  const mapRef = useRef(null);
  const [viewState, setViewState] = useState<ViewState>({
    latitude: 39.8283,
    longitude: -98.5795,
    zoom: 3.5,
  });

  const [data, setData] = useState<HeatmapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [signals, setSignals] = useState<SignalFilters>({
    verified: false,
    physiological: false,
    em: false,
  });
  const [yearRange, setYearRange] = useState<[number, number]>([1931, 2014]);
  const [showFaultLines, setShowFaultLines] = useState(false);
  const [faultLinesData, setFaultLinesData] = useState<GeoJSON.FeatureCollection | null>(null);
  const [faultLinesLoading, setFaultLinesLoading] = useState(false);
  const [faultLinesError, setFaultLinesError] = useState(false);

  // Popup
  const [popupInfo, setPopupInfo] = useState<HeatmapPoint | null>(null);

  // Fetch heatmap data
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();

      if (signals.verified) params.append('signals', 'verified');
      if (signals.physiological) params.append('signals', 'physiological');
      if (signals.em) params.append('signals', 'em');

      params.set('yearStart', String(yearRange[0]));
      params.set('yearEnd', String(yearRange[1]));

      const response = await fetch(`/api/map/ufo-heatmap?${params}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch data');
      }

      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load map data');
    } finally {
      setLoading(false);
    }
  }, [signals, yearRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Fetch fault lines when toggled on (only once)
  useEffect(() => {
    if (showFaultLines && !faultLinesData && !faultLinesLoading && !faultLinesError) {
      setFaultLinesLoading(true);
      fetch(FAULT_LINES_URL)
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json();
        })
        .then((data) => {
          setFaultLinesData(data);
          setFaultLinesLoading(false);
        })
        .catch((err) => {
          console.error('Failed to load fault lines:', err);
          setFaultLinesLoading(false);
          setFaultLinesError(true);
        });
    }
  }, [showFaultLines, faultLinesData, faultLinesLoading, faultLinesError]);

  // Handle map click for popup
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleMapClick = useCallback((event: any) => {
    const features = event.features;
    if (features && features.length > 0 && features[0].properties) {
      const props = features[0].properties;
      setPopupInfo({
        lat: event.lngLat.lat,
        lng: event.lngLat.lng,
        id: props.id as string,
        title: props.title as string,
        weight: props.weight as number,
        year: props.year as number | null,
        physiological_effects: props.physiological_effects as boolean,
        em_interference: props.em_interference as boolean,
        triage_status: props.triage_status as string | null,
        shape: props.shape as string | null,
        city: props.city as string | null,
        state: props.state as string | null,
      });
    }
  }, []);

  const toggleSignal = (signal: keyof SignalFilters) => {
    setSignals((prev) => ({ ...prev, [signal]: !prev[signal] }));
  };

  const hasActiveFilters = signals.verified || signals.physiological || signals.em;
  const geojsonData = data ? pointsToGeoJSON(data.points) : null;

  return (
    <div className="relative h-full w-full">
      {/* Map */}
      <Map
        ref={mapRef}
        {...viewState}
        onMove={(evt: { viewState: ViewState }) => setViewState(evt.viewState)}
        onClick={handleMapClick}
        interactiveLayerIds={['ufo-points-circle']}
        mapStyle="mapbox://styles/mapbox/dark-v11"
        mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
        style={{ width: '100%', height: '100%' }}
      >
        <NavigationControl position="top-right" />

        {/* UFO Heatmap Layer */}
        {geojsonData && (
          <Source id="ufo-points" type="geojson" data={geojsonData}>
            <Layer {...heatmapLayerStyle} />
            <Layer {...pointLayerStyle} />
          </Source>
        )}

        {/* Fault Lines Layer */}
        {showFaultLines && faultLinesData && (
          <Source id="fault-lines" type="geojson" data={faultLinesData}>
            <Layer {...faultLinesLayerStyle} />
          </Source>
        )}

        {/* Popup */}
        {popupInfo && (
          <Popup
            latitude={popupInfo.lat}
            longitude={popupInfo.lng}
            onClose={() => setPopupInfo(null)}
            closeOnClick={false}
          >
            <div className="max-w-xs p-2 text-sm">
              <h3 className="font-semibold text-zinc-900 truncate">{popupInfo.title}</h3>
              <div className="mt-1 space-y-0.5 text-zinc-600">
                {popupInfo.city && popupInfo.state && (
                  <p>{popupInfo.city}, {popupInfo.state}</p>
                )}
                {popupInfo.year && <p>Year: {popupInfo.year}</p>}
                {popupInfo.shape && <p>Shape: {popupInfo.shape}</p>}
                <div className="flex gap-2 mt-2">
                  {popupInfo.physiological_effects && (
                    <span className="px-1.5 py-0.5 bg-red-100 text-red-700 text-xs rounded">Physio</span>
                  )}
                  {popupInfo.em_interference && (
                    <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">EM</span>
                  )}
                  {popupInfo.triage_status === 'verified' && (
                    <span className="px-1.5 py-0.5 bg-green-100 text-green-700 text-xs rounded" title="This submission passed our 4-stage quality check for methodology, source integrity, and data completeness. This verifies the research process, not the phenomenon itself.">Verified</span>
                  )}
                </div>
              </div>
              <a
                href={`/investigations/${popupInfo.id}`}
                className="mt-2 inline-block text-violet-600 hover:underline text-xs"
              >
                View Details →
              </a>
            </div>
          </Popup>
        )}
      </Map>

      {/* Controls Panel */}
      <div className="absolute top-4 left-4 z-10 bg-zinc-900/95 rounded-xl border border-zinc-700 p-4 max-w-xs">
        <h2 className="text-lg font-semibold text-zinc-100 mb-3">UFO Heatmap</h2>

        {/* Stats */}
        {data && (
          <div className="mb-4 text-sm text-zinc-400">
            <p className="text-zinc-100 font-medium">{data.total.toLocaleString()} sightings</p>
            <p>{data.stats.verified_count.toLocaleString()} verified</p>
            <p>{data.stats.physio_count.toLocaleString()} with physical effects</p>
            <p>{data.stats.em_count.toLocaleString()} with EM interference</p>
          </div>
        )}

        {/* Signal Filters */}
        <div className="mb-4">
          <h3 className="text-sm font-medium text-zinc-300 mb-2">Signal Quality Filters</h3>
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={signals.verified}
                onChange={() => toggleSignal('verified')}
                className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-green-500 focus:ring-green-500"
              />
              <span className="text-sm text-zinc-300">
                <span className="inline-block w-3 h-3 rounded-full bg-green-500 mr-1" />
                Verified only
              </span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={signals.physiological}
                onChange={() => toggleSignal('physiological')}
                className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-red-500 focus:ring-red-500"
              />
              <span className="text-sm text-zinc-300">
                <span className="inline-block w-3 h-3 rounded-full bg-red-500 mr-1" />
                Physiological effects
              </span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={signals.em}
                onChange={() => toggleSignal('em')}
                className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-blue-500 focus:ring-blue-500"
              />
              <span className="text-sm text-zinc-300">
                <span className="inline-block w-3 h-3 rounded-full bg-blue-500 mr-1" />
                EM interference
              </span>
            </label>
          </div>
          {hasActiveFilters && (
            <button
              onClick={() => setSignals({ verified: false, physiological: false, em: false })}
              className="mt-2 text-xs text-zinc-500 hover:text-zinc-300"
            >
              Clear filters
            </button>
          )}
        </div>

        {/* Year Range Slider */}
        <div className="mb-4">
          <h3 className="text-sm font-medium text-zinc-300 mb-2">
            Year Range: {yearRange[0]} - {yearRange[1]}
          </h3>
          <div className="flex gap-2">
            <input
              type="range"
              min={1931}
              max={2014}
              value={yearRange[0]}
              onChange={(e) => setYearRange([parseInt(e.target.value), yearRange[1]])}
              className="flex-1 accent-violet-500"
            />
            <input
              type="range"
              min={1931}
              max={2014}
              value={yearRange[1]}
              onChange={(e) => setYearRange([yearRange[0], parseInt(e.target.value)])}
              className="flex-1 accent-violet-500"
            />
          </div>
        </div>

        {/* Geology Overlay Toggle */}
        <div className="border-t border-zinc-700 pt-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showFaultLines}
              onChange={() => setShowFaultLines(!showFaultLines)}
              className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-red-500 focus:ring-red-500"
            />
            <span className="text-sm text-zinc-300">
              <span className="inline-block w-4 h-0.5 bg-red-500 mr-1" style={{ verticalAlign: 'middle' }} />
              Show fault lines
            </span>
          </label>
          {faultLinesLoading && (
            <p className="text-xs text-zinc-500 mt-1">Loading USGS fault data...</p>
          )}
          {faultLinesError && (
            <p className="text-xs text-red-400 mt-1">Failed to load data</p>
          )}
        </div>

        {/* Geology Disclaimer */}
        {showFaultLines && !faultLinesError && (
          <div className="mt-3 p-2 bg-amber-900/30 border border-amber-700/50 rounded text-xs text-amber-200">
            <strong>Note:</strong> Fault line overlay is for visual exploration.
            The SPECTER hypothesis (UFO-seismic correlation) was tested with statistical
            controls and did not show significant correlation at meaningful magnitudes (M≥4.0).
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 z-10 bg-zinc-900/95 rounded-xl border border-zinc-700 p-3">
        <h3 className="text-xs font-medium text-zinc-400 mb-2">Point Colors (zoom in)</h3>
        <div className="space-y-1 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-white border border-zinc-600" />
            <span className="text-zinc-300">Multiple signals</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-500" />
            <span className="text-zinc-300">Physiological effects</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-blue-500" />
            <span className="text-zinc-300">EM interference</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-zinc-300">Verified</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-gray-500" />
            <span className="text-zinc-300">Unfiltered</span>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/50 z-20">
          <div className="text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-500 border-t-transparent mx-auto" />
            <p className="mt-2 text-zinc-300">Loading map data...</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="absolute top-4 right-4 z-20 bg-red-900/90 border border-red-700 rounded-lg p-4 max-w-sm">
          <p className="text-red-200 text-sm">{error}</p>
          <button
            onClick={fetchData}
            className="mt-2 text-xs text-red-300 hover:text-red-100"
          >
            Retry
          </button>
        </div>
      )}
    </div>
  );
}
