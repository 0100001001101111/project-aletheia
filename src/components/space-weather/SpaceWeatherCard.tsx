'use client';

/**
 * SpaceWeatherCard
 * Displays current space weather conditions and correlation findings
 */

import { useEffect, useState } from 'react';

interface SpaceWeatherData {
  kp_index: number | null;
  conditions: string;
  solar_wind_speed?: number | null;
  bz_component?: number | null;
  geomagnetic_storm: boolean;
  major_storm: boolean;
  severe_storm: boolean;
  timestamp: string;
}

interface CorrelationStats {
  ufo_quiet_pct: number;      // % of UFO events during quiet (Kp <= 1)
  baseline_quiet_pct: number; // baseline quiet %
  ufo_major_storm_pct: number; // % during major storms (Kp >= 7)
  baseline_major_storm_pct: number;
  mean_kp_ufo: number;
  mean_kp_baseline: number;
  total_enriched: number;
}

interface SpaceWeatherCardProps {
  compact?: boolean;
}

function getKpColor(kp: number): string {
  if (kp >= 8) return 'text-red-400';
  if (kp >= 7) return 'text-orange-400';
  if (kp >= 5) return 'text-amber-400';
  if (kp >= 4) return 'text-yellow-400';
  if (kp >= 2) return 'text-green-400';
  return 'text-cyan-400';
}

function getKpBgColor(kp: number): string {
  if (kp >= 8) return 'bg-red-500/20 border-red-500/30';
  if (kp >= 7) return 'bg-orange-500/20 border-orange-500/30';
  if (kp >= 5) return 'bg-amber-500/20 border-amber-500/30';
  if (kp >= 4) return 'bg-yellow-500/20 border-yellow-500/30';
  if (kp >= 2) return 'bg-green-500/20 border-green-500/30';
  return 'bg-cyan-500/20 border-cyan-500/30';
}

function getConditionsLabel(conditions: string): string {
  switch (conditions) {
    case 'severe_storm': return 'Severe Storm';
    case 'major_storm': return 'Major Storm';
    case 'storm': return 'Geomagnetic Storm';
    case 'unsettled': return 'Unsettled';
    case 'active': return 'Active';
    case 'quiet': return 'Quiet';
    default: return conditions;
  }
}

function KpMeter({ kp }: { kp: number }) {
  const segments = 9;
  return (
    <div className="flex gap-0.5 mt-2">
      {Array.from({ length: segments }).map((_, i) => (
        <div
          key={i}
          className={`h-2 flex-1 rounded-sm transition-colors ${
            i < kp
              ? i >= 7 ? 'bg-red-500' : i >= 5 ? 'bg-amber-500' : i >= 3 ? 'bg-yellow-500' : 'bg-green-500'
              : 'bg-zinc-700'
          }`}
        />
      ))}
    </div>
  );
}

export function SpaceWeatherCard({ compact = false }: SpaceWeatherCardProps) {
  const [data, setData] = useState<SpaceWeatherData | null>(null);
  const [stats, setStats] = useState<CorrelationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [weatherRes, statsRes] = await Promise.all([
          fetch('/api/space-weather/current'),
          fetch('/api/space-weather/stats'),
        ]);

        if (weatherRes.ok) {
          const weatherData = await weatherRes.json();
          setData(weatherData);
        }

        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setStats(statsData);
        }
      } catch (err) {
        console.error('Space weather fetch error:', err);
        setError('Failed to load space weather');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
    // Refresh every 5 minutes
    const interval = setInterval(fetchData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className={`rounded-xl border border-dark-border bg-dark-card ${compact ? 'p-4' : 'p-6'}`}>
        <div className="flex items-center gap-2 text-zinc-400">
          <div className="h-5 w-5 animate-pulse rounded bg-zinc-700" />
          <span>Loading space weather...</span>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className={`rounded-xl border border-amber-500/30 bg-amber-500/10 ${compact ? 'p-4' : 'p-6'}`}>
        <div className="flex items-center gap-2 text-amber-400">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>Space weather unavailable</span>
        </div>
      </div>
    );
  }

  const kp = data.kp_index ?? 0;

  if (compact) {
    return (
      <div className={`rounded-xl border ${getKpBgColor(kp)} p-4`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className={`w-5 h-5 ${getKpColor(kp)}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <span className="font-medium text-zinc-200">Space Weather</span>
          </div>
          <span className={`text-2xl font-bold ${getKpColor(kp)}`}>Kp {kp.toFixed(1)}</span>
        </div>
        <KpMeter kp={kp} />
        <div className="mt-2 text-sm text-zinc-400">
          {getConditionsLabel(data.conditions)}
          {data.geomagnetic_storm && ' - Storm Active'}
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-xl border ${getKpBgColor(kp)} p-6`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
          <svg className={`w-6 h-6 ${getKpColor(kp)}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          Space Weather
        </h2>
        <div className="text-right">
          <div className={`text-3xl font-bold ${getKpColor(kp)}`}>Kp {kp.toFixed(1)}</div>
          <div className={`text-sm ${getKpColor(kp)}`}>{getConditionsLabel(data.conditions)}</div>
        </div>
      </div>

      {/* Kp Meter */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-zinc-500 mb-1">
          <span>Quiet</span>
          <span>Active</span>
          <span>Storm</span>
          <span>Major</span>
        </div>
        <KpMeter kp={kp} />
        <div className="flex justify-between text-xs text-zinc-600 mt-1">
          <span>0</span>
          <span>3</span>
          <span>5</span>
          <span>7</span>
          <span>9</span>
        </div>
      </div>

      {/* Additional Metrics */}
      {(data.solar_wind_speed || data.bz_component !== null) && (
        <div className="grid grid-cols-2 gap-3 mb-4 pt-3 border-t border-zinc-700">
          {data.solar_wind_speed && (
            <div>
              <div className="text-xs text-zinc-500">Solar Wind</div>
              <div className="text-sm font-medium text-zinc-200">{data.solar_wind_speed.toFixed(0)} km/s</div>
            </div>
          )}
          {data.bz_component !== null && data.bz_component !== undefined && (
            <div>
              <div className="text-xs text-zinc-500">Bz Component</div>
              <div className={`text-sm font-medium ${data.bz_component < 0 ? 'text-amber-400' : 'text-green-400'}`}>
                {data.bz_component.toFixed(1)} nT
              </div>
            </div>
          )}
        </div>
      )}

      {/* Correlation Insights - with caveat */}
      {stats && (
        <div className="pt-3 border-t border-zinc-700">
          <h3 className="text-sm font-medium text-zinc-400 mb-3">UFO vs Kp Distribution</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-zinc-400">Kp 0 (quiet)</span>
              <span className="text-cyan-400 font-medium">
                +41% vs expected
                <span className="text-zinc-500 ml-1">(n=1,310)</span>
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Kp 7+ (storms)</span>
              <span className="text-orange-400 font-medium">
                +74% vs expected
                <span className="text-zinc-500 ml-1">(n=54)</span>
              </span>
            </div>
            <div className="mt-3 p-3 rounded-lg bg-amber-900/20 border border-amber-500/20">
              <div className="text-xs text-amber-400 mb-1">Caveat</div>
              <div className="text-zinc-400 text-xs">
                Kp 0 excess likely reflects clear sky visibility (observation bias).
                High-Kp sample too small for conclusions. Control analysis pending.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="mt-4 pt-3 border-t border-zinc-700 flex items-center justify-between text-xs text-zinc-500">
        <span>Updated: {new Date(data.timestamp).toLocaleTimeString()}</span>
        <span>Source: NOAA SWPC</span>
      </div>
    </div>
  );
}
