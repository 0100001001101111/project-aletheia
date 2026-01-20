'use client';

/**
 * Space Weather Analysis Page
 * Displays correlation between UFO sightings and geomagnetic activity
 */

import { PageWrapper } from '@/components/layout/PageWrapper';
import { SpaceWeatherCard } from '@/components/space-weather/SpaceWeatherCard';
import { KpCorrelationChart } from '@/components/space-weather/KpCorrelationChart';
import Link from 'next/link';

export default function SpaceWeatherPage() {
  return (
    <PageWrapper
      title="Space Weather Analysis"
      description="Correlating UFO sightings with geomagnetic activity"
    >
      {/* Overview Banner */}
      <div className="mb-8 rounded-xl bg-gradient-to-r from-purple-900/30 via-cyan-900/20 to-purple-900/30 border border-purple-500/20 p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center flex-shrink-0">
            <svg className="w-6 h-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-zinc-100 mb-2">Space Weather Hypothesis</h2>
            <p className="text-zinc-400">
              Testing whether human anomalous experiences correlate with space weather conditions,
              independent of local geophysical stress. This analysis examines 4,966 UFO sightings
              enriched with historical Kp index data from 1932-2014.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Current Conditions */}
        <div className="space-y-6">
          <SpaceWeatherCard />

          {/* Methodology */}
          <div className="rounded-xl border border-dark-border bg-dark-card p-6">
            <h3 className="text-lg font-semibold text-zinc-100 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Methodology
            </h3>
            <div className="space-y-3 text-sm text-zinc-400">
              <div className="p-3 rounded-lg bg-zinc-800/50">
                <div className="font-medium text-zinc-200 mb-1">Data Source</div>
                <div>GFZ Potsdam definitive Kp index (1932-present), 3-hour intervals</div>
              </div>
              <div className="p-3 rounded-lg bg-zinc-800/50">
                <div className="font-medium text-zinc-200 mb-1">Matching Method</div>
                <div>LATERAL JOIN finding closest Kp measurement within ±3 hours of each UFO event</div>
              </div>
              <div className="p-3 rounded-lg bg-zinc-800/50">
                <div className="font-medium text-zinc-200 mb-1">Storm Classification</div>
                <div>Kp ≥ 5 = storm, Kp ≥ 7 = major storm, Kp ≥ 8 = severe storm</div>
              </div>
            </div>
          </div>
        </div>

        {/* Center & Right - Analysis */}
        <div className="lg:col-span-2 space-y-6">
          <KpCorrelationChart showDetailed />

          {/* Statistical Summary */}
          <div className="rounded-xl border border-dark-border bg-dark-card p-6">
            <h3 className="text-lg font-semibold text-zinc-100 mb-4">Statistical Summary</h3>
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-center">
                <div className="text-3xl font-bold text-cyan-400">+14.5%</div>
                <div className="text-sm text-zinc-400 mt-1">Quiet conditions (Kp 0-1)</div>
                <div className="text-xs text-zinc-500">vs expected baseline</div>
              </div>
              <div className="p-4 rounded-lg bg-zinc-800 text-center">
                <div className="text-3xl font-bold text-zinc-300">-15%</div>
                <div className="text-sm text-zinc-400 mt-1">Moderate activity (Kp 2-6)</div>
                <div className="text-xs text-zinc-500">average underrepresentation</div>
              </div>
              <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-center">
                <div className="text-3xl font-bold text-red-400">+74.2%</div>
                <div className="text-sm text-zinc-400 mt-1">Major storms (Kp 7+)</div>
                <div className="text-xs text-zinc-500">vs expected baseline</div>
              </div>
            </div>

            <div className="mt-4 grid sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-zinc-800/50">
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400">Mean Kp (UFO events)</span>
                  <span className="text-xl font-semibold text-zinc-200">2.03</span>
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-zinc-400">Mean Kp (baseline)</span>
                  <span className="text-xl font-semibold text-zinc-200">2.22</span>
                </div>
                <div className="mt-2 text-sm text-green-400">-8.6% lower during UFO events</div>
              </div>
              <div className="p-4 rounded-lg bg-zinc-800/50">
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400">Severe storms (Kp ≥ 8)</span>
                  <span className="text-xl font-semibold text-red-400">2.42x</span>
                </div>
                <div className="text-sm text-zinc-500 mt-1">UFO events vs baseline probability</div>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-zinc-400">Kp 9 events</span>
                  <span className="text-xl font-semibold text-red-400">5.33x</span>
                </div>
              </div>
            </div>
          </div>

          {/* Critical Caveat - Observation Bias */}
          <div className="rounded-xl border border-red-500/30 bg-gradient-to-br from-red-900/20 to-transparent p-6">
            <h3 className="text-lg font-semibold text-red-400 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Likely Observation Bias - Control Analysis Pending
            </h3>
            <div className="space-y-3 text-sm text-zinc-400">
              <p>
                <strong className="text-red-300">The Kp 0 correlation is most likely observation bias, not a causal relationship.</strong>
              </p>
              <p>
                Low geomagnetic activity correlates with stable atmospheric conditions and clear skies.
                People see more UFOs when visibility is good. The 41% excess at Kp 0 (n=1,310 vs 928 expected)
                is statistically significant but probably reflects <strong className="text-zinc-200">weather-related observation opportunity</strong>,
                not geomagnetic effects on perception.
              </p>
              <p>
                <strong className="text-amber-400">High-Kp findings are unreliable:</strong> The elevated ratios at Kp 7-9
                (1.43x to 6.71x) are based on only 54 total events. The Kp 9 cluster (n=4) coincides with
                famous storms that received media coverage, suggesting reporting bias.
              </p>
              <div className="mt-3 p-3 rounded-lg bg-zinc-800/50 border border-zinc-700">
                <div className="font-medium text-zinc-200 mb-2">Control analyses needed:</div>
                <ul className="list-disc list-inside space-y-1 text-zinc-400">
                  <li>Compare Kp patterns for sightings WITH vs WITHOUT physiological effects</li>
                  <li>Compare daytime vs nighttime sighting Kp distributions</li>
                  <li>Cross-reference with historical weather/visibility data</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Related Links */}
      <div className="mt-8 pt-8 border-t border-dark-border">
        <div className="flex items-center justify-between">
          <h3 className="text-zinc-400 font-medium">Related Analysis</h3>
          <div className="flex gap-4">
            <Link href="/investigations?type=ufo" className="text-brand-400 hover:text-brand-300 text-sm">
              Browse UFO Investigations →
            </Link>
            <Link href="/patterns" className="text-brand-400 hover:text-brand-300 text-sm">
              View Cross-Domain Patterns →
            </Link>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
