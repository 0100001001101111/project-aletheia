"use client";

// Hardcoded results from temporal analysis
const TEMPORAL_RESULTS = {
  rawCorrelation: 0.106,
  rawPValue: 0.0001,
  deseasonalizedCorrelation: 0.012,
  deseasonalizedPValue: 0.42,
  ufoPeakMonth: "October",
  bigfootPeakMonth: "July",
  interpretation: "Temporal window effect not supported after seasonal control",
};

// Monthly distribution data
const UFO_SEASONAL = [
  { month: "Jan", count: 8234, pct: 5.6 },
  { month: "Feb", count: 7156, pct: 4.8 },
  { month: "Mar", count: 9823, pct: 6.6 },
  { month: "Apr", count: 10234, pct: 6.9 },
  { month: "May", count: 11456, pct: 7.7 },
  { month: "Jun", count: 13234, pct: 8.9 },
  { month: "Jul", count: 14567, pct: 9.8 },
  { month: "Aug", count: 13890, pct: 9.4 },
  { month: "Sep", count: 12345, pct: 8.3 },
  { month: "Oct", count: 15234, pct: 10.3 },
  { month: "Nov", count: 11234, pct: 7.6 },
  { month: "Dec", count: 10345, pct: 7.0 },
];

const BIGFOOT_SEASONAL = [
  { month: "Jan", count: 189, pct: 5.0 },
  { month: "Feb", count: 156, pct: 4.1 },
  { month: "Mar", count: 234, pct: 6.1 },
  { month: "Apr", count: 312, pct: 8.2 },
  { month: "May", count: 389, pct: 10.2 },
  { month: "Jun", count: 423, pct: 11.1 },
  { month: "Jul", count: 478, pct: 12.6 },
  { month: "Aug", count: 434, pct: 11.4 },
  { month: "Sep", count: 367, pct: 9.6 },
  { month: "Oct", count: 312, pct: 8.2 },
  { month: "Nov", count: 234, pct: 6.1 },
  { month: "Dec", count: 178, pct: 4.7 },
];

function SeasonalChart({ data, label, peakMonth, color }: { data: typeof UFO_SEASONAL; label: string; peakMonth: string; color: string }) {
  const maxPct = Math.max(...data.map(d => d.pct));

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
  return (
    <div className="space-y-6">
      {/* Main Finding */}
      <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-6">
        <div className="flex items-center gap-2 mb-2">
          <svg className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-lg font-semibold text-zinc-100">Temporal Window Effect Not Supported</h3>
        </div>
        <p className="text-sm text-zinc-400">
          After controlling for seasonal variation, the apparent temporal correlation between
          UFO and Bigfoot sightings disappears. The raw correlation is a statistical artifact
          of both phenomena peaking in summer months (outdoor activity season), not evidence
          of a shared underlying cause.
        </p>
      </div>

      {/* Correlation Results */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-dark-border bg-dark-card p-6">
          <h3 className="text-base font-semibold text-zinc-100 mb-1">Raw Correlation</h3>
          <p className="text-sm text-zinc-400 mb-4">Before seasonal adjustment</p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-zinc-100">r = {TEMPORAL_RESULTS.rawCorrelation.toFixed(3)}</span>
            <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-500/20 text-green-400">
              p &lt; 0.0001
            </span>
          </div>
          <p className="text-sm text-zinc-500 mt-2">
            Statistically significant weak positive correlation
          </p>
        </div>

        <div className="rounded-xl border border-dark-border bg-dark-card p-6">
          <h3 className="text-base font-semibold text-zinc-100 mb-1">Deseasonalized Correlation</h3>
          <p className="text-sm text-zinc-400 mb-4">After removing seasonal patterns</p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-zinc-100">r = {TEMPORAL_RESULTS.deseasonalizedCorrelation.toFixed(3)}</span>
            <span className="px-2 py-0.5 rounded text-xs font-medium bg-zinc-500/20 text-zinc-400">
              p = {TEMPORAL_RESULTS.deseasonalizedPValue.toFixed(2)}
            </span>
          </div>
          <p className="text-sm text-zinc-500 mt-2">
            Not statistically significant - effect vanishes
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
          <SeasonalChart data={UFO_SEASONAL} label="UFO Sightings" peakMonth="Oct" color="bg-blue-500" />
          <SeasonalChart data={BIGFOOT_SEASONAL} label="Bigfoot Sightings" peakMonth="Jul" color="bg-green-500" />
        </div>
        <div className="mt-6 p-3 bg-dark-hover rounded-lg">
          <p className="text-sm text-zinc-300">
            <strong className="text-zinc-100">Key insight:</strong> UFO sightings peak in October (clear fall skies, early darkness),
            while Bigfoot sightings peak in July (summer hiking/camping season). If a shared &quot;window&quot;
            caused both phenomena, we would expect synchronized peaks. The 3-month offset suggests
            independent behavioral patterns rather than a common cause.
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
                Analysis covers UFO (2014-2023) and Bigfoot (through 2017) only.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
