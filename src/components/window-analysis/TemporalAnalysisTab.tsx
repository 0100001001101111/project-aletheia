"use client";

import { useEffect, useState } from "react";

interface SeasonalData {
  month: string;
  count: number;
  pct: number;
}

interface TemporalData {
  rawCorrelation: number;
  rawPValue: number;
  deseasonalizedCorrelation: number;
  deseasonalizedPValue: number;
  ufoPeakMonth: string;
  bigfootPeakMonth: string;
  interpretation: string;
  ufoSeasonal: SeasonalData[];
  bigfootSeasonal: SeasonalData[];
}

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function parseMonthCounts(monthCounts: number[] | undefined): SeasonalData[] {
  if (!monthCounts || monthCounts.length !== 12) {
    return MONTH_NAMES.map(month => ({ month, count: 0, pct: 0 }));
  }
  const total = monthCounts.reduce((a, b) => a + b, 0);
  return MONTH_NAMES.map((month, i) => ({
    month,
    count: monthCounts[i],
    pct: total > 0 ? Math.round((monthCounts[i] / total) * 1000) / 10 : 0,
  }));
}

function SeasonalChart({ data, label, peakMonth, color }: { data: SeasonalData[]; label: string; peakMonth: string; color: string }) {
  const maxPct = Math.max(...data.map(d => d.pct), 1);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-zinc-200">{label}</span>
        <span className="px-2 py-0.5 rounded text-xs font-medium bg-zinc-700 text-zinc-300">
          Peak: {peakMonth}
        </span>
      </div>
      <div className="flex items-end gap-1 h-32 pt-2">
        {data.map((d) => {
          const heightPct = (d.pct / maxPct) * 100;
          const isPeak = d.month === peakMonth;
          return (
            <div key={d.month} className="flex-1 flex flex-col items-center justify-end h-full">
              <div className="flex-1 flex items-end w-full px-0.5">
                <div
                  className={`w-full rounded-t transition-all ${isPeak ? color : "bg-zinc-600"}`}
                  style={{ height: `${Math.max(heightPct, 4)}%`, minHeight: "4px" }}
                  title={`${d.month}: ${d.count.toLocaleString()} (${d.pct}%)`}
                />
              </div>
              <span className="text-[10px] text-zinc-500 mt-1">{d.month.slice(0, 1)}</span>
            </div>
          );
        })}
      </div>
      <div className="flex justify-between text-[10px] text-zinc-600 px-1">
        <span>Jan</span>
        <span>Dec</span>
      </div>
    </div>
  );
}

export function TemporalAnalysisTab() {
  const [data, setData] = useState<TemporalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTemporalData() {
      try {
        const response = await fetch('/api/analysis/window/temporal');

        if (response.status === 404) {
          setError('No temporal analysis has been run yet. Click "Run Analysis" to generate results.');
          return;
        }

        if (!response.ok) {
          throw new Error('Failed to fetch temporal analysis');
        }

        const result = await response.json();

        // Parse the API response into our component format
        const detailedResults = result.detailed_results || {};
        const seasonalAnalysis = detailedResults.seasonalAnalysis || {};

        setData({
          rawCorrelation: result.raw_correlation ?? seasonalAnalysis.rawCorrelation?.meanR ?? 0,
          rawPValue: seasonalAnalysis.rawCorrelation?.pValue ?? 0.0001,
          deseasonalizedCorrelation: result.deseasonalized_correlation ?? seasonalAnalysis.deseasonalizedCorrelation?.meanR ?? 0,
          deseasonalizedPValue: result.deseasonalized_p_value ?? seasonalAnalysis.deseasonalizedCorrelation?.pValue ?? 0.5,
          ufoPeakMonth: result.ufo_peak_month ?? seasonalAnalysis.ufoSeasonality?.peakMonth ?? "Unknown",
          bigfootPeakMonth: result.bigfoot_peak_month ?? seasonalAnalysis.bigfootSeasonality?.peakMonth ?? "Unknown",
          interpretation: result.seasonal_interpretation ?? seasonalAnalysis.interpretation ?? result.interpretation ?? "",
          ufoSeasonal: parseMonthCounts(seasonalAnalysis.ufoSeasonality?.monthCounts),
          bigfootSeasonal: parseMonthCounts(seasonalAnalysis.bigfootSeasonality?.monthCounts),
        });
      } catch (err) {
        console.error('Temporal analysis fetch error:', err);
        setError(err instanceof Error ? err.message : 'Failed to load temporal analysis');
      } finally {
        setLoading(false);
      }
    }

    fetchTemporalData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent mx-auto" />
          <p className="mt-4 text-zinc-400">Loading temporal analysis...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-6 text-center">
        <svg className="h-8 w-8 text-amber-500 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <p className="text-zinc-300">{error}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-xl border border-zinc-700 bg-zinc-800/50 p-6 text-center">
        <p className="text-zinc-400">No temporal analysis data available.</p>
      </div>
    );
  }

  const effectDetected = Math.abs(data.deseasonalizedCorrelation) > 0.05 && data.deseasonalizedPValue < 0.05;

  return (
    <div className="space-y-6">
      {/* Main Finding */}
      <div className={`rounded-xl border p-6 ${effectDetected ? 'border-green-500/30 bg-green-500/5' : 'border-red-500/30 bg-red-500/5'}`}>
        <div className="flex items-center gap-2 mb-2">
          {effectDetected ? (
            <svg className="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ) : (
            <svg className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
          <h3 className="text-lg font-semibold text-zinc-100">
            {effectDetected ? 'Temporal Window Effect Detected' : 'Temporal Window Effect Not Supported'}
          </h3>
        </div>
        <p className="text-sm text-zinc-400">
          {data.interpretation || (effectDetected
            ? 'Statistical analysis supports a temporal correlation between phenomena after controlling for seasonal variation.'
            : 'After controlling for seasonal variation, the apparent temporal correlation between UFO and Bigfoot sightings disappears. The raw correlation is likely a statistical artifact of both phenomena peaking in summer months.'
          )}
        </p>
      </div>

      {/* Correlation Results */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-dark-border bg-dark-card p-6">
          <h3 className="text-base font-semibold text-zinc-100 mb-1">Raw Correlation</h3>
          <p className="text-sm text-zinc-400 mb-4">Before seasonal adjustment</p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-zinc-100">r = {data.rawCorrelation.toFixed(3)}</span>
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${data.rawPValue < 0.05 ? 'bg-green-500/20 text-green-400' : 'bg-zinc-500/20 text-zinc-400'}`}>
              p {data.rawPValue < 0.0001 ? '< 0.0001' : `= ${data.rawPValue.toFixed(4)}`}
            </span>
          </div>
          <p className="text-sm text-zinc-500 mt-2">
            {Math.abs(data.rawCorrelation) > 0.3 ? 'Moderate' : Math.abs(data.rawCorrelation) > 0.1 ? 'Weak' : 'Very weak'} {data.rawCorrelation >= 0 ? 'positive' : 'negative'} correlation
          </p>
        </div>

        <div className="rounded-xl border border-dark-border bg-dark-card p-6">
          <h3 className="text-base font-semibold text-zinc-100 mb-1">Deseasonalized Correlation</h3>
          <p className="text-sm text-zinc-400 mb-4">After removing seasonal patterns</p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-zinc-100">r = {data.deseasonalizedCorrelation.toFixed(3)}</span>
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${data.deseasonalizedPValue < 0.05 ? 'bg-green-500/20 text-green-400' : 'bg-zinc-500/20 text-zinc-400'}`}>
              p = {data.deseasonalizedPValue.toFixed(2)}
            </span>
          </div>
          <p className="text-sm text-zinc-500 mt-2">
            {data.deseasonalizedPValue < 0.05 ? 'Statistically significant' : 'Not statistically significant'}
          </p>
        </div>
      </div>

      {/* Seasonal Distributions */}
      <div className="rounded-xl border border-dark-border bg-dark-card p-6">
        <h3 className="text-lg font-semibold text-zinc-100 mb-1">Seasonal Distribution</h3>
        <p className="text-sm text-zinc-400 mb-6">
          Monthly distribution shows different peak seasons for each phenomenon
        </p>
        <div className="grid gap-6 md:grid-cols-2">
          <SeasonalChart data={data.ufoSeasonal} label="UFO Sightings" peakMonth={data.ufoPeakMonth.slice(0, 3)} color="bg-blue-500" />
          <SeasonalChart data={data.bigfootSeasonal} label="Bigfoot Sightings" peakMonth={data.bigfootPeakMonth.slice(0, 3)} color="bg-green-500" />
        </div>
        <div className="mt-6 p-3 bg-dark-hover rounded-lg">
          <p className="text-sm text-zinc-300">
            <strong className="text-zinc-100">Key insight:</strong> UFO sightings peak in {data.ufoPeakMonth},
            while Bigfoot sightings peak in {data.bigfootPeakMonth}. {data.ufoPeakMonth === data.bigfootPeakMonth
              ? 'The synchronized peaks may suggest a common underlying cause worth investigating.'
              : 'The offset in peaks suggests independent behavioral patterns rather than a common cause.'}
          </p>
        </div>
      </div>

      {/* Methodology Note */}
      <div className="rounded-xl border border-dark-border bg-dark-card p-6">
        <h3 className="text-base font-semibold text-zinc-100 mb-4">Methodology</h3>
        <div className="space-y-3 text-sm">
          <div className="flex items-start gap-2">
            <svg className="h-4 w-4 mt-0.5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <div>
              <p className="font-medium text-zinc-200">Deseasonalization Process</p>
              <p className="text-zinc-500">
                Monthly averages calculated and subtracted from each observation to remove
                predictable seasonal patterns. Residuals then correlated.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <svg className="h-4 w-4 mt-0.5 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <p className="font-medium text-zinc-200">Data Limitation</p>
              <p className="text-zinc-500">
                Haunting data excluded from temporal analysis due to lack of reliable event dates.
                Analysis covers UFO and Bigfoot data only.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
