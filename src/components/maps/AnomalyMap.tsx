'use client';

/**
 * AnomalyMap - Multi-Phenomenon Visualization
 * Interactive map showing all anomaly types with layer controls
 */

import { useEffect, useState, useCallback, useMemo } from 'react';
import Map, { Source, Layer, Popup, NavigationControl } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import type { InvestigationType } from '@/types/database';

// Layer configuration for each investigation type
const LAYER_CONFIG: Record<string, { color: string; icon: string; label: string }> = {
  bigfoot: { color: '#f59e0b', icon: '🦶', label: 'Bigfoot' },
  haunting: { color: '#64748b', icon: '🏚️', label: 'Haunted Places' },
  ufo: { color: '#f43f5e', icon: '🛸', label: 'UFO/UAP' },
  crop_circle: { color: '#84cc16', icon: '🌾', label: 'Crop Circles' },
  bermuda_triangle: { color: '#14b8a6', icon: '🔺', label: 'Bermuda Triangle' },
  hotspot: { color: '#d946ef', icon: '📍', label: 'High Strangeness Hotspots' },
};

interface AnomalyPoint {
  id: string;
  lat: number;
  lng: number;
  type: InvestigationType;
  title: string;
  weirdness_score: number | null;
  year: number | null;
}

interface AnomalyMapProps {
  height?: string;
  initialCenter?: [number, number];
  initialZoom?: number;
}

// Convert points to GeoJSON for a specific type
function pointsToGeoJSON(points: AnomalyPoint[], type: string): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: points
      .filter(p => p.type === type)
      .map((point) => ({
        type: 'Feature' as const,
        geometry: {
          type: 'Point' as const,
          coordinates: [point.lng, point.lat],
        },
        properties: {
          id: point.id,
          title: point.title,
          type: point.type,
          weirdness_score: point.weirdness_score,
          year: point.year,
        },
      })),
  };
}

export default function AnomalyMap({
  height = '700px',
  initialCenter = [-98, 39], // Center of US
  initialZoom = 4
}: AnomalyMapProps) {
  const [points, setPoints] = useState<AnomalyPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPoint, setSelectedPoint] = useState<AnomalyPoint | null>(null);
  const [visibleLayers, setVisibleLayers] = useState<Record<string, boolean>>({
    bigfoot: true,
    haunting: true,
    ufo: true,
    crop_circle: true,
    bermuda_triangle: true,
    hotspot: true,
  });
  const [viewState, setViewState] = useState({
    latitude: initialCenter[1],
    longitude: initialCenter[0],
    zoom: initialZoom,
  });
  const [counts, setCounts] = useState<Record<string, number>>({});

  // Fetch all anomaly data
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const response = await fetch('/api/anomaly-map');
        if (!response.ok) throw new Error('Failed to fetch anomaly data');
        const data = await response.json();
        setPoints(data.points);
        setCounts(data.counts);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Toggle layer visibility
  const toggleLayer = useCallback((type: string) => {
    setVisibleLayers(prev => ({ ...prev, [type]: !prev[type] }));
  }, []);

  // Generate GeoJSON for each type
  const geoJsonData = useMemo(() => {
    const data: Record<string, GeoJSON.FeatureCollection> = {};
    Object.keys(LAYER_CONFIG).forEach(type => {
      data[type] = pointsToGeoJSON(points, type);
    });
    return data;
  }, [points]);

  // Count visible points
  const visibleCount = useMemo(() => {
    return points.filter(p => visibleLayers[p.type]).length;
  }, [points, visibleLayers]);

  // Handle point click
  const handleClick = useCallback((event: mapboxgl.MapLayerMouseEvent) => {
    const feature = event.features?.[0];
    if (feature && feature.properties) {
      const point = points.find(p => p.id === feature.properties?.id);
      if (point) setSelectedPoint(point);
    }
  }, [points]);

  if (error) {
    return (
      <div className="flex items-center justify-center bg-zinc-900 rounded-xl p-8" style={{ height }}>
        <div className="text-center">
          <p className="text-red-400">Error loading map: {error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-red-600/20 rounded-lg text-red-400 hover:bg-red-600/30"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative rounded-xl overflow-hidden" style={{ height }}>
      {/* Layer Controls */}
      <div className="absolute top-4 left-4 z-10 bg-zinc-900/95 backdrop-blur-sm rounded-xl border border-zinc-700 p-4 max-w-xs">
        <h3 className="text-sm font-bold text-zinc-100 mb-3">Anomaly Layers</h3>
        <div className="space-y-2">
          {Object.entries(LAYER_CONFIG).map(([type, config]) => (
            <label
              key={type}
              className="flex items-center gap-3 cursor-pointer group"
            >
              <input
                type="checkbox"
                checked={visibleLayers[type]}
                onChange={() => toggleLayer(type)}
                className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-violet-500 focus:ring-violet-500"
              />
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: config.color }}
              />
              <span className="text-sm text-zinc-300 group-hover:text-zinc-100">
                {config.icon} {config.label}
              </span>
              <span className="text-xs text-zinc-500 ml-auto">
                {counts[type] || 0}
              </span>
            </label>
          ))}
        </div>
        <div className="mt-3 pt-3 border-t border-zinc-700">
          <p className="text-xs text-zinc-400">
            Showing <span className="text-violet-400 font-medium">{visibleCount.toLocaleString()}</span> of {points.length.toLocaleString()} points
          </p>
        </div>
      </div>

      {/* Stats Panel */}
      <div className="absolute top-4 right-4 z-10 bg-zinc-900/95 backdrop-blur-sm rounded-xl border border-zinc-700 p-4">
        <h3 className="text-sm font-bold text-zinc-100 mb-2">Pattern Hotspots</h3>
        <div className="space-y-1 text-xs">
          <p className="text-zinc-400">
            <span className="text-amber-400">San Diego:</span> 88 anomalies (3 types)
          </p>
          <p className="text-zinc-400">
            <span className="text-amber-400">Seattle:</span> 18 anomalies (3 types)
          </p>
          <p className="text-zinc-400">
            <span className="text-amber-400">Jacksonville:</span> 17 anomalies (3 types)
          </p>
        </div>
        <p className="text-xs text-zinc-500 mt-2">
          97 triple-overlap zones detected
        </p>
      </div>

      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-zinc-900/80">
          <div className="text-center">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-violet-500 border-t-transparent mx-auto" />
            <p className="mt-3 text-zinc-400">Loading {points.length > 0 ? points.length.toLocaleString() : ''} anomalies...</p>
          </div>
        </div>
      )}

      {/* Map */}
      <Map
        {...viewState}
        onMove={evt => setViewState(evt.viewState)}
        onClick={handleClick}
        interactiveLayerIds={Object.keys(LAYER_CONFIG).map(t => `${t}-points`)}
        mapStyle="mapbox://styles/mapbox/dark-v11"
        mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
        style={{ width: '100%', height: '100%' }}
      >
        <NavigationControl position="bottom-right" />

        {/* Render each layer */}
        {Object.entries(LAYER_CONFIG).map(([type, config]) => (
          visibleLayers[type] && (
            <Source key={type} id={type} type="geojson" data={geoJsonData[type]}>
              {/* Heatmap layer for dense areas */}
              <Layer
                id={`${type}-heat`}
                type="heatmap"
                paint={{
                  'heatmap-weight': ['interpolate', ['linear'], ['get', 'weirdness_score'], 0, 0, 10, 1],
                  'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 0, 1, 9, 3],
                  'heatmap-color': [
                    'interpolate',
                    ['linear'],
                    ['heatmap-density'],
                    0, 'rgba(0,0,0,0)',
                    0.2, config.color + '33',
                    0.4, config.color + '66',
                    0.6, config.color + '99',
                    0.8, config.color + 'cc',
                    1, config.color,
                  ],
                  'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 0, 2, 9, 20],
                  'heatmap-opacity': ['interpolate', ['linear'], ['zoom'], 7, 1, 9, 0],
                }}
              />
              {/* Circle layer for individual points at higher zoom */}
              <Layer
                id={`${type}-points`}
                type="circle"
                paint={{
                  'circle-radius': ['interpolate', ['linear'], ['zoom'], 4, 2, 10, 6, 15, 10],
                  'circle-color': config.color,
                  'circle-opacity': ['interpolate', ['linear'], ['zoom'], 7, 0, 9, 0.8],
                  'circle-stroke-width': 1,
                  'circle-stroke-color': '#fff',
                  'circle-stroke-opacity': 0.5,
                }}
              />
            </Source>
          )
        ))}

        {/* Popup for selected point */}
        {selectedPoint && (
          <Popup
            latitude={selectedPoint.lat}
            longitude={selectedPoint.lng}
            onClose={() => setSelectedPoint(null)}
            closeButton={true}
            closeOnClick={false}
            className="anomaly-popup"
          >
            <div className="p-2 max-w-xs">
              <div className="flex items-center gap-2 mb-2">
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: LAYER_CONFIG[selectedPoint.type]?.color || '#888' }}
                />
                <span className="text-xs font-medium text-zinc-600 uppercase">
                  {LAYER_CONFIG[selectedPoint.type]?.label || selectedPoint.type}
                </span>
              </div>
              <h4 className="font-bold text-sm text-zinc-900 mb-1">
                {selectedPoint.title}
              </h4>
              <div className="text-xs text-zinc-600 space-y-1">
                {selectedPoint.weirdness_score && (
                  <p>Weirdness: <span className="font-medium">{selectedPoint.weirdness_score}/10</span></p>
                )}
                {selectedPoint.year && (
                  <p>Year: <span className="font-medium">{selectedPoint.year}</span></p>
                )}
                <p className="text-zinc-400">
                  {selectedPoint.lat.toFixed(4)}, {selectedPoint.lng.toFixed(4)}
                </p>
              </div>
            </div>
          </Popup>
        )}
      </Map>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 z-10 bg-zinc-900/95 backdrop-blur-sm rounded-lg border border-zinc-700 px-3 py-2">
        <div className="flex items-center gap-4 text-xs">
          <span className="text-zinc-400">Zoom in for individual points</span>
          <span className="text-zinc-600">|</span>
          <span className="text-zinc-400">Click points for details</span>
        </div>
      </div>
    </div>
  );
}
