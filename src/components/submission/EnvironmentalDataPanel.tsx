'use client';

/**
 * EnvironmentalDataPanel
 * Displays auto-populated environmental context from authoritative sources
 * User cannot override these values - they're fetched from USGS, NOAA, etc.
 */

import { useState, useEffect } from 'react';

interface GeologyData {
  bedrockType: string;
  piezoelectricContent: number;
  piezoelectricCategory: string;
  nearestFaultKm: number | null;
  faultName: string | null;
  source: string;
  error?: string;
}

interface SeismicData {
  eventsBefore7Days: number;
  eventsAfter7Days: number;
  largestMagnitude: number | null;
  eventCount: number;
  radiusKm: number;
  minMagnitude: number;
  source: string;
  error?: string;
}

interface GeomagneticData {
  kpIndex: number | null;
  kpCategory: string;
  solarWindSpeed: number | null;
  dstIndex: number | null;
  source: string;
  error?: string;
}

interface AstronomicalData {
  localSiderealTime: string;
  lstDecimalHours: number;
  inLstWindow: boolean;
  lstWindowNote: string;
  source: string;
  error?: string;
}

interface EnvironmentalModifier {
  type: string;
  factor: string;
  value: number;
  reason: string;
}

interface EnvironmentalData {
  coordinates: { latitude: number; longitude: number };
  eventDate: string | null;
  autoPopulated: boolean;
  populatedAt: string;
  sources: string[];
  geology: GeologyData;
  seismic: SeismicData;
  geomagnetic: GeomagneticData;
  astronomical: AstronomicalData;
  environmentalModifiers: EnvironmentalModifier[];
}

interface EnvironmentalDataPanelProps {
  latitude: number | null;
  longitude: number | null;
  eventDate: string | null;
  onDataLoaded?: (data: EnvironmentalData) => void;
}

export function EnvironmentalDataPanel({
  latitude,
  longitude,
  eventDate,
  onDataLoaded,
}: EnvironmentalDataPanelProps) {
  const [data, setData] = useState<EnvironmentalData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!latitude || !longitude) {
      setData(null);
      return;
    }

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/environmental/lookup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ latitude, longitude, date: eventDate }),
        });

        if (!response.ok) {
          throw new Error('Failed to fetch environmental data');
        }

        const envData = await response.json();
        setData(envData);
        onDataLoaded?.(envData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [latitude, longitude, eventDate, onDataLoaded]);

  if (!latitude || !longitude) {
    return (
      <div className="rounded-xl border border-zinc-700 bg-zinc-900/50 p-6">
        <h3 className="font-semibold text-zinc-200 mb-2">Environmental Context</h3>
        <p className="text-sm text-zinc-500">
          Enter coordinates above to auto-populate environmental data from USGS, NOAA, and other sources.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="rounded-xl border border-zinc-700 bg-zinc-900/50 p-6">
        <h3 className="font-semibold text-zinc-200 mb-4">Environmental Context</h3>
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
          <span className="text-sm text-zinc-400">Fetching environmental data...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-6">
        <h3 className="font-semibold text-red-300 mb-2">Environmental Context</h3>
        <p className="text-sm text-red-400">Failed to load: {error}</p>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="rounded-xl border border-zinc-700 bg-zinc-900/50 p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-zinc-200">Environmental Context</h3>
        <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-1 rounded">
          Auto-populated
        </span>
      </div>

      {/* Geology Section */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-violet-400 flex items-center gap-2">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Geology
        </h4>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="bg-zinc-800/50 rounded-lg p-3">
            <div className="text-zinc-500 text-xs">Bedrock Type</div>
            <div className="text-zinc-200">{data.geology.bedrockType}</div>
          </div>
          <div className="bg-zinc-800/50 rounded-lg p-3">
            <div className="text-zinc-500 text-xs">Piezoelectric Content</div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 rounded-full bg-zinc-700 overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    data.geology.piezoelectricContent >= 0.7 ? 'bg-emerald-500' :
                    data.geology.piezoelectricContent >= 0.4 ? 'bg-amber-500' : 'bg-zinc-500'
                  }`}
                  style={{ width: `${data.geology.piezoelectricContent * 100}%` }}
                />
              </div>
              <span className="text-zinc-200 text-xs">
                {(data.geology.piezoelectricContent * 100).toFixed(0)}%
              </span>
            </div>
            <div className="text-xs text-zinc-500 mt-1">{data.geology.piezoelectricCategory}</div>
          </div>
        </div>
      </div>

      {/* Seismic Section */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-amber-400 flex items-center gap-2">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Seismic Activity ({data.seismic.radiusKm}km radius)
        </h4>
        <div className="grid grid-cols-3 gap-3 text-sm">
          <div className="bg-zinc-800/50 rounded-lg p-3">
            <div className="text-zinc-500 text-xs">7 Days Before</div>
            <div className={`text-xl font-bold ${data.seismic.eventsBefore7Days > 0 ? 'text-amber-400' : 'text-zinc-400'}`}>
              {data.seismic.eventsBefore7Days}
            </div>
            <div className="text-xs text-zinc-500">events M{data.seismic.minMagnitude}+</div>
          </div>
          <div className="bg-zinc-800/50 rounded-lg p-3">
            <div className="text-zinc-500 text-xs">7 Days After</div>
            <div className={`text-xl font-bold ${data.seismic.eventsAfter7Days > 0 ? 'text-amber-400' : 'text-zinc-400'}`}>
              {data.seismic.eventsAfter7Days}
            </div>
            <div className="text-xs text-zinc-500">events M{data.seismic.minMagnitude}+</div>
          </div>
          <div className="bg-zinc-800/50 rounded-lg p-3">
            <div className="text-zinc-500 text-xs">Largest Magnitude</div>
            <div className="text-xl font-bold text-zinc-200">
              {data.seismic.largestMagnitude?.toFixed(1) || 'N/A'}
            </div>
          </div>
        </div>
      </div>

      {/* Geomagnetic Section */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-blue-400 flex items-center gap-2">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          Geomagnetic Conditions
        </h4>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="bg-zinc-800/50 rounded-lg p-3">
            <div className="text-zinc-500 text-xs">Kp Index</div>
            <div className="flex items-center gap-2">
              <span className={`text-xl font-bold ${
                data.geomagnetic.kpIndex !== null && data.geomagnetic.kpIndex >= 5 ? 'text-red-400' :
                data.geomagnetic.kpIndex !== null && data.geomagnetic.kpIndex >= 4 ? 'text-amber-400' : 'text-zinc-200'
              }`}>
                {data.geomagnetic.kpIndex?.toFixed(1) || 'N/A'}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded ${
                data.geomagnetic.kpCategory === 'quiet' ? 'bg-emerald-500/20 text-emerald-400' :
                data.geomagnetic.kpCategory === 'unsettled' ? 'bg-blue-500/20 text-blue-400' :
                data.geomagnetic.kpCategory === 'active' ? 'bg-amber-500/20 text-amber-400' :
                data.geomagnetic.kpCategory.includes('storm') ? 'bg-red-500/20 text-red-400' :
                'bg-zinc-700 text-zinc-400'
              }`}>
                {data.geomagnetic.kpCategory.replace('_', ' ')}
              </span>
            </div>
          </div>
          <div className="bg-zinc-800/50 rounded-lg p-3">
            <div className="text-zinc-500 text-xs">Source</div>
            <div className="text-zinc-200">{data.geomagnetic.source}</div>
          </div>
        </div>
      </div>

      {/* Astronomical Section */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-purple-400 flex items-center gap-2">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
          </svg>
          Astronomical
        </h4>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="bg-zinc-800/50 rounded-lg p-3">
            <div className="text-zinc-500 text-xs">Local Sidereal Time</div>
            <div className="text-xl font-bold text-zinc-200">
              {data.astronomical.localSiderealTime}
            </div>
          </div>
          <div className={`rounded-lg p-3 ${
            data.astronomical.inLstWindow
              ? 'bg-purple-500/10 border border-purple-500/30'
              : 'bg-zinc-800/50'
          }`}>
            <div className="text-zinc-500 text-xs">LST Window (13:00-14:30)</div>
            <div className={`font-medium ${data.astronomical.inLstWindow ? 'text-purple-400' : 'text-zinc-400'}`}>
              {data.astronomical.inLstWindow ? 'In Window' : 'Outside Window'}
            </div>
            <div className="text-xs text-zinc-500 mt-1">Spottiswoode correlation</div>
          </div>
        </div>
      </div>

      {/* Environmental Modifiers */}
      {data.environmentalModifiers.length > 0 && (
        <div className="border-t border-zinc-700 pt-4">
          <h4 className="text-sm font-medium text-emerald-400 mb-3">Score Modifiers Applied</h4>
          <div className="space-y-2">
            {data.environmentalModifiers.map((mod, i) => (
              <div key={i} className="flex justify-between items-center text-sm bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-2">
                <span className="text-zinc-300">{mod.reason}</span>
                <span className="text-emerald-400 font-medium">+{mod.value.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Data Sources */}
      <div className="text-xs text-zinc-500 pt-2 border-t border-zinc-800">
        <span className="font-medium">Sources:</span> {data.sources.join(', ')}
      </div>
    </div>
  );
}
