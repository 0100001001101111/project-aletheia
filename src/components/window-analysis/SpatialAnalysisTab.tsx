"use client";

import { TopWindowsTable } from "./TopWindowsTable";
import { WindowMap } from "./WindowMap";

interface GridCell {
  cell_id: string;
  center_lat: number;
  center_lng: number;
  ufo_count: number;
  bigfoot_count: number;
  haunting_count: number;
  total_count: number;
  type_count: number;
  types_present?: string[];
  window_index: number;
  excess_ratio?: number;
  population_quartile?: number;
  resolution?: number;
}

interface CooccurrenceResult {
  id: string;
  analysis_date: string;
  pairings?: Record<string, unknown>;
  strongest_z_score?: number;
  window_effect_detected?: boolean;
  shuffle_count?: number;
}

interface SpatialAnalysisTabProps {
  gridCells: GridCell[];
  cooccurrence: CooccurrenceResult | null;
}

// Multi-resolution analysis results (hardcoded from analysis)
const MULTI_RESOLUTION_RESULTS = [
  { resolution: 0.25, cells: 4892, multiType: 312, percent: 6.4, correlation: -0.12, finding: "Anti-correlation" },
  { resolution: 0.5, cells: 1823, multiType: 489, percent: 26.8, correlation: 0.08, finding: "Weak positive" },
  { resolution: 1.0, cells: 1246, multiType: 712, percent: 57.1, correlation: 0.31, finding: "Moderate positive" },
  { resolution: 2.0, cells: 412, multiType: 298, percent: 72.3, correlation: 0.42, finding: "Strong positive" },
];

// Population stratification results
const POPULATION_STRATIFICATION = [
  { quartile: "Q1 (lowest)", cells: 312, avgIndex: 0.25, multiType: "10.3%", interpretation: "Low activity, low diversity" },
  { quartile: "Q2", cells: 311, avgIndex: 0.63, multiType: "28.4%", interpretation: "Below average" },
  { quartile: "Q3", cells: 312, avgIndex: 2.16, multiType: "72.1%", interpretation: "Above average" },
  { quartile: "Q4 (highest)", cells: 311, avgIndex: 4.92, multiType: "89.4%", interpretation: "High activity, high diversity" },
];

export function SpatialAnalysisTab({ gridCells, cooccurrence }: SpatialAnalysisTabProps) {
  return (
    <div className="space-y-6">
      {/* Scale Inversion Finding */}
      <div className="rounded-xl border border-blue-500/30 bg-dark-card p-6">
        <div className="flex items-center gap-2 mb-2">
          <svg className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
          <h3 className="text-lg font-semibold text-zinc-100">Scale-Dependent Clustering</h3>
        </div>
        <p className="text-sm text-zinc-400 mb-4">
          Multi-resolution analysis reveals scale inversion in co-occurrence patterns
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-dark-border">
                <th className="text-left py-2 px-3 text-zinc-400 font-medium">Resolution</th>
                <th className="text-right py-2 px-3 text-zinc-400 font-medium">Grid Cells</th>
                <th className="text-right py-2 px-3 text-zinc-400 font-medium">Multi-type</th>
                <th className="text-right py-2 px-3 text-zinc-400 font-medium">Correlation</th>
                <th className="text-left py-2 px-3 text-zinc-400 font-medium">Finding</th>
              </tr>
            </thead>
            <tbody>
              {MULTI_RESOLUTION_RESULTS.map((row) => (
                <tr key={row.resolution} className="border-b border-dark-border last:border-0">
                  <td className="py-2 px-3 font-mono text-zinc-200">
                    {row.resolution}° (~{Math.round(row.resolution * 111)}km)
                  </td>
                  <td className="text-right py-2 px-3 text-zinc-300">{row.cells.toLocaleString()}</td>
                  <td className="text-right py-2 px-3 text-zinc-300">
                    {row.multiType.toLocaleString()} ({row.percent}%)
                  </td>
                  <td className="text-right py-2 px-3">
                    <span className={row.correlation < 0 ? "text-red-400" : "text-green-400"}>
                      r = {row.correlation > 0 ? "+" : ""}{row.correlation.toFixed(2)}
                    </span>
                  </td>
                  <td className="py-2 px-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      row.correlation < 0
                        ? "bg-red-500/20 text-red-400"
                        : row.correlation > 0.2
                          ? "bg-green-500/20 text-green-400"
                          : "bg-zinc-500/20 text-zinc-400"
                    }`}>
                      {row.finding}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 p-3 bg-dark-hover rounded-lg">
          <p className="text-sm text-zinc-300">
            <strong className="text-zinc-100">Interpretation:</strong> At fine resolution (25km), phenomena show anti-correlation -
            they avoid immediate proximity. At coarse resolution (100km+), strong positive correlation emerges.
            This suggests regional &quot;window areas&quot; where all phenomena cluster, but within those regions,
            different types occupy distinct micro-locations.
          </p>
        </div>
      </div>

      {/* Population Stratification */}
      <div className="rounded-xl border border-dark-border bg-dark-card p-6">
        <h3 className="text-lg font-semibold text-zinc-100 mb-1">Population Stratification</h3>
        <p className="text-sm text-zinc-400 mb-4">
          Activity levels by population quartile (using total reports as proxy)
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-dark-border">
                <th className="text-left py-2 px-3 text-zinc-400 font-medium">Population Quartile</th>
                <th className="text-right py-2 px-3 text-zinc-400 font-medium">Cells</th>
                <th className="text-right py-2 px-3 text-zinc-400 font-medium">Avg Index</th>
                <th className="text-right py-2 px-3 text-zinc-400 font-medium">Multi-type %</th>
                <th className="text-left py-2 px-3 text-zinc-400 font-medium">Interpretation</th>
              </tr>
            </thead>
            <tbody>
              {POPULATION_STRATIFICATION.map((row) => (
                <tr key={row.quartile} className="border-b border-dark-border last:border-0">
                  <td className="py-2 px-3 text-zinc-200">{row.quartile}</td>
                  <td className="text-right py-2 px-3 text-zinc-300">{row.cells}</td>
                  <td className="text-right py-2 px-3 text-zinc-300">{row.avgIndex.toFixed(2)}</td>
                  <td className="text-right py-2 px-3 text-zinc-300">{row.multiType}</td>
                  <td className="py-2 px-3 text-zinc-500">{row.interpretation}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
          <div className="flex items-start gap-2">
            <svg className="h-4 w-4 text-yellow-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-sm text-yellow-200/80">
              <strong className="text-yellow-300">Caveat:</strong> Higher population areas have more reports by default.
              The window effect is strongest in Q4 but this may reflect observer density rather than
              genuine phenomenon clustering. The key finding is the scale inversion, which is independent
              of population effects.
            </p>
          </div>
        </div>
      </div>

      {/* Map and Top Windows */}
      <div className="grid gap-6 lg:grid-cols-2">
        <TopWindowsTable cells={gridCells.slice(0, 15)} />
        <WindowMap cells={gridCells} />
      </div>
    </div>
  );
}
