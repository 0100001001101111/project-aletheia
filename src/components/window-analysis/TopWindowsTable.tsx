"use client";

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
}

interface Props {
  cells: GridCell[];
}

export function TopWindowsTable({ cells }: Props) {
  // Calculate stats for interpretation
  const indices = cells.map(c => c.window_index ?? 0);
  const mean = indices.length > 0 ? indices.reduce((a, b) => a + b, 0) / indices.length : 0;
  const variance = indices.length > 0
    ? indices.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / indices.length
    : 0;
  const stdDev = Math.sqrt(variance);

  const getInterpretation = (index: number) => {
    const zScore = stdDev > 0 ? (index - mean) / stdDev : 0;
    if (zScore >= 3) return { label: "Strong candidate", color: "bg-green-500/20 text-green-400" };
    if (zScore >= 2) return { label: "High activity", color: "bg-green-500/20 text-green-400" };
    if (zScore >= 1) return { label: "Elevated", color: "bg-zinc-500/20 text-zinc-400" };
    return { label: "Average", color: "bg-zinc-700 text-zinc-500" };
  };

  const getTypeBadges = (types: string[]) => {
    return types.map(type => {
      const colors: Record<string, string> = {
        ufo: "bg-blue-500/20 text-blue-400",
        bigfoot: "bg-green-500/20 text-green-400",
        haunting: "bg-purple-500/20 text-purple-400",
      };
      return (
        <span
          key={type}
          className={`inline-flex px-1.5 py-0.5 text-xs rounded ${colors[type] ?? ""}`}
        >
          {type.charAt(0).toUpperCase()}
        </span>
      );
    });
  };

  return (
    <div className="rounded-xl border border-dark-border bg-dark-card p-6">
      <h3 className="text-base font-semibold text-zinc-100 mb-1">Top 20 Window Areas</h3>
      <p className="text-sm text-zinc-400 mb-4">
        Ranked by window index (type diversity × excess ratio)
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-dark-border">
              <th className="text-left py-2 font-medium text-zinc-400">#</th>
              <th className="text-left py-2 font-medium text-zinc-400">Location</th>
              <th className="text-left py-2 font-medium text-zinc-400">Types</th>
              <th className="text-right py-2 font-medium text-zinc-400">Reports</th>
              <th className="text-right py-2 font-medium text-zinc-400">Index</th>
              <th className="text-left py-2 font-medium text-zinc-400">Status</th>
            </tr>
          </thead>
          <tbody>
            {cells.map((cell, index) => {
              const interp = getInterpretation(cell.window_index ?? 0);
              return (
                <tr key={cell.cell_id} className="border-b border-dark-border last:border-0">
                  <td className="py-2 text-zinc-500">{index + 1}</td>
                  <td className="py-2">
                    <span className="font-mono text-xs text-zinc-300">
                      {cell.center_lat?.toFixed(2)}, {cell.center_lng?.toFixed(2)}
                    </span>
                  </td>
                  <td className="py-2">
                    <div className="flex gap-1">
                      {getTypeBadges(cell.types_present ?? [])}
                    </div>
                  </td>
                  <td className="py-2 text-right text-zinc-300">{cell.total_count}</td>
                  <td className="py-2 text-right font-mono text-zinc-300">
                    {(cell.window_index ?? 0).toFixed(3)}
                  </td>
                  <td className="py-2">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${interp.color}`}>
                      {interp.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex gap-4 text-xs text-zinc-500">
        <div className="flex items-center gap-1">
          <span className="bg-blue-500/20 text-blue-400 px-1 rounded">U</span>
          <span>UFO</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="bg-green-500/20 text-green-400 px-1 rounded">B</span>
          <span>Bigfoot</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="bg-purple-500/20 text-purple-400 px-1 rounded">H</span>
          <span>Haunting</span>
        </div>
      </div>
    </div>
  );
}
