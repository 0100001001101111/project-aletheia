'use client';

/**
 * KpCorrelationChart
 * Visualizes the bimodal distribution of UFO events vs Kp index
 */

import { useEffect, useState } from 'react';

interface KpDistributionData {
  kp_level: number;
  ufo_pct: number;
  baseline_pct: number;
  deviation_pct: number;
}

// Pre-computed analysis results for display (validated Jan 20, 2026)
// Using FLOOR binning for Kp values
const ANALYSIS_DATA: KpDistributionData[] = [
  { kp_level: 0, ufo_pct: 26.38, baseline_pct: 18.68, deviation_pct: 41.2 },
  { kp_level: 1, ufo_pct: 24.99, baseline_pct: 26.16, deviation_pct: -4.5 },
  { kp_level: 2, ufo_pct: 21.45, baseline_pct: 24.06, deviation_pct: -10.8 },
  { kp_level: 3, ufo_pct: 15.00, baseline_pct: 17.16, deviation_pct: -12.6 },
  { kp_level: 4, ufo_pct: 7.07, baseline_pct: 8.73, deviation_pct: -19.0 },
  { kp_level: 5, ufo_pct: 3.16, baseline_pct: 3.39, deviation_pct: -6.8 },
  { kp_level: 6, ufo_pct: 0.87, baseline_pct: 1.19, deviation_pct: -26.9 },
  { kp_level: 7, ufo_pct: 0.62, baseline_pct: 0.44, deviation_pct: 43.2 },
  { kp_level: 8, ufo_pct: 0.38, baseline_pct: 0.17, deviation_pct: 120.9 },
  { kp_level: 9, ufo_pct: 0.08, baseline_pct: 0.01, deviation_pct: 571.3 },
];

// Validated bucket analysis (Jan 20, 2026)
// Note: High-Kp buckets have small sample sizes (n=54 for Kp 7+)
const BUCKET_ANALYSIS = [
  { category: 'Kp 0', observed: 1310, expected: 928, deviation: 41.2, sampleNote: 'n=1,310', color: 'bg-cyan-500' },
  { category: 'Kp 1-3', observed: 3051, expected: 3346, deviation: -8.8, sampleNote: 'n=3,051', color: 'bg-green-500' },
  { category: 'Kp 4-6', observed: 551, expected: 661, deviation: -16.6, sampleNote: 'n=551', color: 'bg-yellow-500' },
  { category: 'Kp 7+', observed: 54, expected: 31, deviation: 74.2, sampleNote: 'n=54 (small)', color: 'bg-red-500' },
];

interface KpCorrelationChartProps {
  showDetailed?: boolean;
}

export function KpCorrelationChart({ showDetailed = false }: KpCorrelationChartProps) {
  const [activeTab, setActiveTab] = useState<'distribution' | 'deviation'>('distribution');

  const maxPct = Math.max(...ANALYSIS_DATA.map(d => Math.max(d.ufo_pct, d.baseline_pct)));

  return (
    <div className="rounded-xl border border-dark-border bg-dark-card p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
          <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          Kp Index vs UFO Sightings
        </h2>
        <div className="flex gap-1 bg-zinc-800 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('distribution')}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              activeTab === 'distribution'
                ? 'bg-purple-500 text-white'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Distribution
          </button>
          <button
            onClick={() => setActiveTab('deviation')}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              activeTab === 'deviation'
                ? 'bg-purple-500 text-white'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Deviation
          </button>
        </div>
      </div>

      {activeTab === 'distribution' && (
        <>
          {/* Legend */}
          <div className="flex gap-4 mb-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-purple-500" />
              <span className="text-zinc-400">UFO Events</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-zinc-500" />
              <span className="text-zinc-400">Baseline (Expected)</span>
            </div>
          </div>

          {/* Bar Chart */}
          <div className="space-y-2">
            {ANALYSIS_DATA.map((row) => (
              <div key={row.kp_level} className="flex items-center gap-3">
                <div className="w-8 text-right text-sm text-zinc-400">Kp {row.kp_level}</div>
                <div className="flex-1 relative">
                  <div className="h-6 bg-zinc-800 rounded overflow-hidden">
                    {/* Baseline bar (background) */}
                    <div
                      className="absolute h-full bg-zinc-600/50 rounded"
                      style={{ width: `${(row.baseline_pct / maxPct) * 100}%` }}
                    />
                    {/* UFO bar (foreground) */}
                    <div
                      className={`absolute h-full rounded transition-all ${
                        row.deviation_pct > 10 ? 'bg-purple-500' :
                        row.deviation_pct < -10 ? 'bg-purple-500/50' : 'bg-purple-500/70'
                      }`}
                      style={{ width: `${(row.ufo_pct / maxPct) * 100}%` }}
                    />
                  </div>
                </div>
                <div className="w-20 text-right">
                  <span className={`text-sm font-medium ${
                    row.deviation_pct > 10 ? 'text-green-400' :
                    row.deviation_pct < -10 ? 'text-red-400' : 'text-zinc-400'
                  }`}>
                    {row.deviation_pct > 0 ? '+' : ''}{row.deviation_pct.toFixed(1)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {activeTab === 'deviation' && (
        <>
          {/* Bucket Analysis */}
          <div className="space-y-3">
            {BUCKET_ANALYSIS.map((bucket) => (
              <div key={bucket.category} className="p-3 rounded-lg bg-zinc-800/50">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded ${bucket.color}`} />
                    <span className="font-medium text-zinc-200">{bucket.category}</span>
                  </div>
                  <span className={`text-lg font-bold ${
                    bucket.deviation > 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {bucket.deviation > 0 ? '+' : ''}{bucket.deviation.toFixed(1)}%
                  </span>
                </div>
                <div className="flex gap-4 text-sm text-zinc-400">
                  <span>Observed: <span className="text-zinc-200">{bucket.observed}</span></span>
                  <span>Expected: <span className="text-zinc-200">{bucket.expected}</span></span>
                </div>
                <div className="mt-2 h-2 bg-zinc-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${bucket.color} transition-all`}
                    style={{
                      width: `${Math.min(Math.abs(bucket.deviation) * 2, 100)}%`,
                      opacity: bucket.deviation > 0 ? 1 : 0.5
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Finding with Caveat */}
      <div className="mt-4 pt-4 border-t border-zinc-700">
        <div className="p-4 rounded-lg bg-gradient-to-r from-amber-900/20 to-red-900/20 border border-amber-500/30">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-amber-400 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <div className="font-medium text-amber-300 mb-1">Likely Observation Bias</div>
              <div className="text-sm text-zinc-400">
                UFO sightings are <span className="text-cyan-400">+41% more frequent during Kp 0</span> (n=1,310).
                This most likely reflects <span className="text-amber-300">clear sky visibility</span>, not geomagnetic
                effects. High-Kp excess (n=54) may reflect reporting bias during publicized storms.
                <span className="text-zinc-500"> Control analysis pending.</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showDetailed && (
        <div className="mt-4 pt-4 border-t border-zinc-700">
          <h3 className="text-sm font-medium text-zinc-400 mb-3">Notable Storm Events</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between p-2 rounded bg-zinc-800/50">
              <span className="text-zinc-300">Bastille Day Storm (Jul 15, 2000)</span>
              <span className="text-red-400">Kp 9.0 - Multiple sightings</span>
            </div>
            <div className="flex justify-between p-2 rounded bg-zinc-800/50">
              <span className="text-zinc-300">Halloween Storms (Oct 29-30, 2003)</span>
              <span className="text-red-400">Kp 9.0 - 21 major storm events</span>
            </div>
            <div className="flex justify-between p-2 rounded bg-zinc-800/50">
              <span className="text-zinc-300">Solar Max 1991</span>
              <span className="text-orange-400">Avg Kp 4.27 - 19.2% during major storms</span>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="mt-4 flex items-center justify-between text-xs text-zinc-500">
        <span>Based on 4,966 enriched UFO records (1932-2014)</span>
        <span>vs 242,528 Kp measurements</span>
      </div>
    </div>
  );
}
