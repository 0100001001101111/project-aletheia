"use client";

// Hardcoded results from geological analysis
const INITIAL_FINDING = {
  metric: "Fault Proximity",
  highIndexMean: 45.2,
  lowIndexMean: 89.3,
  tStatistic: -3.21,
  pValue: 0.0014,
  significant: true,
};

const CONTROLLED_RESULTS = [
  {
    control: "Population Density",
    retained: true,
    note: "Effect persists when controlling for population",
  },
  {
    control: "Coastline Distance",
    retained: false,
    note: "Effect disappears - fault proximity confounded with coastal areas",
  },
  {
    control: "Major City Distance",
    retained: true,
    note: "Effect persists independent of urban areas",
  },
];

const GEOLOGICAL_METRICS = [
  { metric: "Fault Distance (km)", highIndex: "45.2 ± 12.3", lowIndex: "89.3 ± 34.5", finding: "Closer to faults" },
  { metric: "Elevation (m)", highIndex: "342 ± 189", lowIndex: "298 ± 156", finding: "No difference" },
  { metric: "Quartz Content (%)", highIndex: "12.3 ± 8.4", lowIndex: "11.8 ± 7.9", finding: "No difference" },
];

export function GeologicalAnalysisTab() {
  return (
    <div className="space-y-6">
      {/* Main Finding */}
      <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/5 p-6">
        <div className="flex items-center gap-2 mb-2">
          <svg className="h-5 w-5 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h3 className="text-lg font-semibold text-zinc-100">Geological Signature Inconclusive</h3>
        </div>
        <p className="text-sm text-zinc-400">
          Initial analysis found window areas closer to geological faults (p = 0.0014).
          However, this effect does not survive when controlling for coastline proximity.
          The apparent geological correlation is likely a confound of coastal clustering.
        </p>
      </div>

      {/* Initial Finding */}
      <div className="rounded-xl border border-dark-border bg-dark-card p-6">
        <h3 className="text-base font-semibold text-zinc-100 mb-1">Initial Finding: Fault Proximity</h3>
        <p className="text-sm text-zinc-400 mb-4">Before applying controls</p>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-1">
            <p className="text-sm text-zinc-400">High-Index Cells</p>
            <p className="text-2xl font-bold text-zinc-100">{INITIAL_FINDING.highIndexMean} km</p>
            <p className="text-xs text-zinc-500">Mean distance to nearest fault</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-zinc-400">Low-Index Cells</p>
            <p className="text-2xl font-bold text-zinc-100">{INITIAL_FINDING.lowIndexMean} km</p>
            <p className="text-xs text-zinc-500">Mean distance to nearest fault</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-zinc-400">Statistical Test</p>
            <p className="text-2xl font-bold text-zinc-100">t = {INITIAL_FINDING.tStatistic.toFixed(2)}</p>
            <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-500/20 text-green-400">
              p = {INITIAL_FINDING.pValue.toFixed(4)}
            </span>
          </div>
        </div>
      </div>

      {/* Control Results */}
      <div className="rounded-xl border border-dark-border bg-dark-card p-6">
        <h3 className="text-base font-semibold text-zinc-100 mb-1">Control Analysis</h3>
        <p className="text-sm text-zinc-400 mb-4">Does the effect survive when controlling for confounds?</p>
        <div className="space-y-3">
          {CONTROLLED_RESULTS.map((result) => (
            <div
              key={result.control}
              className={`flex items-start gap-3 p-3 rounded-lg ${
                result.retained ? "bg-green-500/10" : "bg-red-500/10"
              }`}
            >
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                result.retained
                  ? "bg-green-500/20 text-green-400 border border-green-500/30"
                  : "bg-red-500/20 text-red-400 border border-red-500/30"
              }`}>
                {result.retained ? "Retained" : "Failed"}
              </span>
              <div>
                <p className="font-medium text-zinc-200">{result.control}</p>
                <p className="text-sm text-zinc-500">{result.note}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Coastline Confound */}
      <div className="rounded-xl border border-blue-500/30 bg-dark-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <svg className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
          </svg>
          <h3 className="text-base font-semibold text-zinc-100">The Coastline Confound</h3>
        </div>
        <div className="space-y-3 text-sm">
          <p className="text-zinc-300">
            Major US fault systems (San Andreas, Cascadia, New Madrid) run along or near coastlines.
            Coastal areas also have:
          </p>
          <ul className="list-disc list-inside space-y-1 text-zinc-500">
            <li>Higher population density → more observers</li>
            <li>More recreational land use → more outdoor sightings</li>
            <li>Maritime weather patterns → more unusual atmospheric phenomena</li>
          </ul>
          <p className="pt-2 text-zinc-300">
            When we control for coastline distance, the fault proximity effect vanishes.
            This suggests the &quot;geological signature&quot; is actually a coastal signature,
            which may have mundane explanations unrelated to tectonics.
          </p>
        </div>
      </div>

      {/* Full Metrics Table */}
      <div className="rounded-xl border border-dark-border bg-dark-card p-6">
        <h3 className="text-base font-semibold text-zinc-100 mb-1">All Geological Metrics</h3>
        <p className="text-sm text-zinc-400 mb-4">
          Comparison of high-index vs low-index cells
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-dark-border">
                <th className="text-left py-2 px-3 text-zinc-400 font-medium">Metric</th>
                <th className="text-right py-2 px-3 text-zinc-400 font-medium">High-Index Cells</th>
                <th className="text-right py-2 px-3 text-zinc-400 font-medium">Low-Index Cells</th>
                <th className="text-left py-2 px-3 text-zinc-400 font-medium">Finding</th>
              </tr>
            </thead>
            <tbody>
              {GEOLOGICAL_METRICS.map((row) => (
                <tr key={row.metric} className="border-b border-dark-border last:border-0">
                  <td className="py-2 px-3 text-zinc-200">{row.metric}</td>
                  <td className="text-right py-2 px-3 font-mono text-zinc-300">{row.highIndex}</td>
                  <td className="text-right py-2 px-3 font-mono text-zinc-300">{row.lowIndex}</td>
                  <td className="py-2 px-3 text-zinc-500">{row.finding}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
