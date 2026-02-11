'use client';

/**
 * Space Weather Analysis Page
 * Documents the refuted UFO-Kp correlation and data limitations
 */

import { PageWrapper } from '@/components/layout/PageWrapper';
import { SpaceWeatherCard } from '@/components/space-weather/SpaceWeatherCard';
import { KpCorrelationChart } from '@/components/space-weather/KpCorrelationChart';
import Link from 'next/link';

export default function SpaceWeatherPage() {
  return (
    <PageWrapper
      title="Space Weather Analysis"
      description="Testing geomagnetic correlations with anomalous experiences"
    >
      {/* Status Banner - Hypothesis Refuted */}
      <div className="mb-8 rounded-xl bg-gradient-to-r from-red-900/30 via-zinc-900 to-red-900/30 border border-red-500/30 p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center flex-shrink-0">
            <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-red-300 mb-2">Hypothesis Refuted</h2>
            <p className="text-zinc-400">
              The UFO-Kp correlation is explained by observation and reporting bias, not geomagnetic
              effects on perception. Control analysis using physiological effects showed the
              <strong className="text-zinc-200"> opposite pattern</strong> from what the hypothesis predicts.
            </p>
          </div>
        </div>
      </div>

      {/* What We Tested */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-zinc-100 mb-4 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center text-sm text-purple-400">1</span>
          What We Tested
        </h2>
        <div className="rounded-xl border border-dark-border bg-dark-card p-6">
          <p className="text-zinc-400 mb-4">
            <strong className="text-zinc-200">Hypothesis:</strong> Human anomalous experiences correlate with
            geomagnetic activity (Kp index), independent of local factors. This is the Persinger/Krippner
            hypothesis applied to UFO sightings.
          </p>
          <div className="grid sm:grid-cols-3 gap-4 text-sm">
            <div className="p-3 rounded-lg bg-zinc-800/50">
              <div className="text-zinc-500">Dataset</div>
              <div className="text-zinc-200 font-medium">4,966 UFO sightings</div>
            </div>
            <div className="p-3 rounded-lg bg-zinc-800/50">
              <div className="text-zinc-500">Kp Data</div>
              <div className="text-zinc-200 font-medium">242,528 measurements (1932-2014)</div>
            </div>
            <div className="p-3 rounded-lg bg-zinc-800/50">
              <div className="text-zinc-500">Control Variable</div>
              <div className="text-zinc-200 font-medium">Physiological effects (n=2,231)</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3 mb-8">
        {/* Left Column */}
        <div className="space-y-6">
          <SpaceWeatherCard />
        </div>

        {/* Center & Right - Results */}
        <div className="lg:col-span-2 space-y-6">
          {/* What We Found */}
          <div>
            <h2 className="text-lg font-semibold text-zinc-100 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center text-sm text-purple-400">2</span>
              What We Found
            </h2>
            <KpCorrelationChart showDetailed={false} />
          </div>

          {/* Control Analysis Results */}
          <div className="rounded-xl border border-red-500/20 bg-dark-card p-6">
            <h3 className="text-lg font-semibold text-zinc-100 mb-4">Control Analysis: The Decisive Test</h3>
            <p className="text-zinc-400 mb-4">
              If geomagnetic activity affects perception, sightings WITH physiological effects
              (nausea, tingling, paralysis) should show MORE extreme Kp patterns. They show LESS.
            </p>
            <div className="grid sm:grid-cols-2 gap-4 mb-4">
              <div className="p-4 rounded-lg bg-zinc-800/50">
                <div className="text-sm text-zinc-500 mb-2">WITH Physiological Effects (n=2,231)</div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Kp 0 events</span>
                  <span className="text-zinc-200">25.4%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Kp 7+ events</span>
                  <span className="text-zinc-200">0.63%</span>
                </div>
              </div>
              <div className="p-4 rounded-lg bg-zinc-800/50 border border-amber-500/20">
                <div className="text-sm text-amber-400 mb-2">WITHOUT Physiological Effects (n=2,735)</div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Kp 0 events</span>
                  <span className="text-amber-300 font-medium">27.2% (higher)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Kp 7+ events</span>
                  <span className="text-amber-300 font-medium">1.46% (2.3x higher)</span>
                </div>
              </div>
            </div>
            <div className="p-4 rounded-lg bg-red-900/20 border border-red-500/20">
              <div className="font-medium text-red-300 mb-2">Conclusion</div>
              <div className="text-sm text-zinc-400">
                The high-Kp excess is driven by NON-physiological sightings - people reporting during
                media-covered storms without experiencing anything unusual. The Kp 0 excess reflects
                clear sky visibility (observation bias), not geomagnetic sensitivity.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* What We Can't Test Yet */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-zinc-100 mb-4 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center text-sm text-purple-400">3</span>
          What We Can&apos;t Test Yet
        </h2>
        <div className="rounded-xl border border-amber-500/20 bg-gradient-to-br from-amber-900/10 to-transparent p-6">
          <p className="text-zinc-400 mb-4">
            UFO data has heavy observation/reporting bias. The hypothesis might hold in controlled domains
            like Ganzfeld or STARGATE, but our current data doesn&apos;t support testing.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-lg bg-zinc-800/50">
              <div className="font-medium text-zinc-200 mb-1">Ganzfeld</div>
              <div className="text-xs text-amber-400 mb-2">Cannot test</div>
              <div className="text-xs text-zinc-500">52 study summaries, no individual trial timestamps</div>
            </div>
            <div className="p-4 rounded-lg bg-zinc-800/50">
              <div className="font-medium text-zinc-200 mb-1">STARGATE</div>
              <div className="text-xs text-amber-400 mb-2">Cannot test</div>
              <div className="text-xs text-zinc-500">104 program summaries, no session timestamps</div>
            </div>
            <div className="p-4 rounded-lg bg-zinc-800/50">
              <div className="font-medium text-zinc-200 mb-1">Crisis Apparitions</div>
              <div className="text-xs text-amber-400 mb-2">Cannot test</div>
              <div className="text-xs text-zinc-500">18 case summaries, no precise timing</div>
            </div>
            <div className="p-4 rounded-lg bg-zinc-800/50">
              <div className="font-medium text-zinc-200 mb-1">NDE</div>
              <div className="text-xs text-amber-400 mb-2">Insufficient data</div>
              <div className="text-xs text-zinc-500">Only 2 records</div>
            </div>
          </div>
          <p className="mt-4 text-sm text-zinc-500">
            To test Spottiswoode/Persinger findings would require raw session logs with precise
            timestamps and binary outcomes - not meta-analysis summaries.
          </p>
        </div>
      </div>

      {/* What's Being Built */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-zinc-100 mb-4 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center text-sm text-purple-400">4</span>
          What&apos;s Being Built
        </h2>
        <div className="rounded-xl border border-green-500/20 bg-gradient-to-br from-green-900/10 to-transparent p-6">
          <div className="flex items-start gap-4">
            <svg className="w-6 h-6 text-green-400 mt-1 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <div className="font-medium text-green-300 mb-2">Automatic Kp Enrichment</div>
              <p className="text-zinc-400 text-sm">
                All new investigations submitted to Aletheia are automatically enriched with Kp index
                at event time. As individual-level data accumulates (particularly for Ganzfeld and
                controlled experiments), the hypothesis can be properly tested in domains with less
                observation bias.
              </p>
              <div className="mt-4 p-3 rounded-lg bg-zinc-800/50">
                <div className="text-xs text-zinc-500 mb-2">Requirements for testable Ganzfeld data:</div>
                <ul className="text-xs text-zinc-400 space-y-1">
                  <li>• Individual session records (not study summaries)</li>
                  <li>• Precise timestamp (date + time to the hour)</li>
                  <li>• Binary outcome (hit/miss) per trial</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Related Links */}
      <div className="pt-8 border-t border-dark-border">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <Link
            href="/methodology"
            className="text-brand-400 hover:text-brand-300 text-sm"
          >
            Full Analysis Documentation →
          </Link>
          <div className="flex gap-4">
            <Link href="/investigations?type=ufo" className="text-zinc-400 hover:text-zinc-300 text-sm">
              Browse UFO Data
            </Link>
            <Link href="/submit" className="text-zinc-400 hover:text-zinc-300 text-sm">
              Submit Research Data
            </Link>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
