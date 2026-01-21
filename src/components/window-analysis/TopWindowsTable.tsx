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

// Approximate location lookup based on lat/lng
function getApproximateLocation(lat: number, lng: number): string {
  // US regions by approximate bounding boxes
  const regions: Array<{ name: string; minLat: number; maxLat: number; minLng: number; maxLng: number }> = [
    // West Coast
    { name: "Seattle area, WA", minLat: 47, maxLat: 48.5, minLng: -123, maxLng: -121 },
    { name: "Portland area, OR", minLat: 45, maxLat: 46, minLng: -123.5, maxLng: -122 },
    { name: "San Francisco Bay, CA", minLat: 37, maxLat: 38.5, minLng: -123, maxLng: -121.5 },
    { name: "Los Angeles area, CA", minLat: 33.5, maxLat: 34.5, minLng: -119, maxLng: -117 },
    { name: "San Diego area, CA", minLat: 32.5, maxLat: 33.5, minLng: -118, maxLng: -116 },
    { name: "Central Valley, CA", minLat: 35, maxLat: 37, minLng: -121, maxLng: -119 },
    { name: "Central Coast, CA", minLat: 34.5, maxLat: 36, minLng: -122, maxLng: -120 },
    // Pacific Northwest
    { name: "Olympic Peninsula, WA", minLat: 47, maxLat: 48.5, minLng: -125, maxLng: -123 },
    { name: "Cascade Range, WA/OR", minLat: 45, maxLat: 49, minLng: -122.5, maxLng: -120 },
    // Mountain West
    { name: "Denver area, CO", minLat: 39, maxLat: 40.5, minLng: -105.5, maxLng: -104 },
    { name: "Salt Lake area, UT", minLat: 40, maxLat: 41.5, minLng: -112.5, maxLng: -111 },
    { name: "Phoenix area, AZ", minLat: 33, maxLat: 34, minLng: -113, maxLng: -111 },
    { name: "Las Vegas area, NV", minLat: 35.5, maxLat: 36.5, minLng: -116, maxLng: -114.5 },
    // Texas
    { name: "Dallas-Fort Worth, TX", minLat: 32, maxLat: 33.5, minLng: -98, maxLng: -96 },
    { name: "Houston area, TX", minLat: 29, maxLat: 30.5, minLng: -96, maxLng: -94.5 },
    { name: "Austin area, TX", minLat: 29.5, maxLat: 31, minLng: -98.5, maxLng: -97 },
    { name: "San Antonio area, TX", minLat: 29, maxLat: 30, minLng: -99, maxLng: -98 },
    { name: "Texas Hill Country", minLat: 29.5, maxLat: 31, minLng: -100, maxLng: -97.5 },
    // Midwest
    { name: "Chicago area, IL", minLat: 41, maxLat: 42.5, minLng: -88.5, maxLng: -87 },
    { name: "Detroit area, MI", minLat: 42, maxLat: 43, minLng: -84, maxLng: -82.5 },
    { name: "Minneapolis area, MN", minLat: 44.5, maxLat: 45.5, minLng: -94, maxLng: -92.5 },
    { name: "St. Louis area, MO", minLat: 38, maxLat: 39, minLng: -91, maxLng: -89.5 },
    // Southeast
    { name: "Atlanta area, GA", minLat: 33, maxLat: 34.5, minLng: -85, maxLng: -83.5 },
    { name: "Tampa Bay, FL", minLat: 27.5, maxLat: 28.5, minLng: -83, maxLng: -82 },
    { name: "Miami area, FL", minLat: 25.5, maxLat: 26.5, minLng: -81, maxLng: -80 },
    { name: "Orlando area, FL", minLat: 28, maxLat: 29, minLng: -82, maxLng: -80.5 },
    { name: "North Carolina Piedmont", minLat: 35, maxLat: 36.5, minLng: -81, maxLng: -78 },
    // Northeast
    { name: "New York City area", minLat: 40, maxLat: 41.5, minLng: -74.5, maxLng: -73 },
    { name: "Boston area, MA", minLat: 42, maxLat: 43, minLng: -72, maxLng: -70.5 },
    { name: "Philadelphia area, PA", minLat: 39.5, maxLat: 40.5, minLng: -76, maxLng: -74.5 },
    { name: "Washington DC area", minLat: 38.5, maxLat: 39.5, minLng: -78, maxLng: -76.5 },
    { name: "Pittsburgh area, PA", minLat: 40, maxLat: 41, minLng: -80.5, maxLng: -79 },
  ];

  // Check for match
  for (const region of regions) {
    if (lat >= region.minLat && lat <= region.maxLat && lng >= region.minLng && lng <= region.maxLng) {
      return region.name;
    }
  }

  // State-level fallback based on approximate boundaries
  if (lat >= 32 && lat <= 42 && lng >= -125 && lng <= -114) return "California";
  if (lat >= 45 && lat <= 49 && lng >= -125 && lng <= -117) return "Washington State";
  if (lat >= 42 && lat <= 46 && lng >= -125 && lng <= -117) return "Oregon";
  if (lat >= 31 && lat <= 37 && lng >= -114 && lng <= -109) return "Arizona";
  if (lat >= 36 && lat <= 42 && lng >= -120 && lng <= -114) return "Nevada";
  if (lat >= 37 && lat <= 41 && lng >= -109 && lng <= -102) return "Colorado";
  if (lat >= 37 && lat <= 42 && lng >= -102 && lng <= -95) return "Kansas";
  if (lat >= 25 && lat <= 36 && lng >= -107 && lng <= -93) return "Texas";
  if (lat >= 24 && lat <= 31 && lng >= -88 && lng <= -80) return "Florida";
  if (lat >= 30 && lat <= 35 && lng >= -90 && lng <= -82) return "Georgia/Alabama";
  if (lat >= 33 && lat <= 36.5 && lng >= -84 && lng <= -75) return "North/South Carolina";
  if (lat >= 36.5 && lat <= 39.5 && lng >= -84 && lng <= -75) return "Virginia/West Virginia";
  if (lat >= 39 && lat <= 42 && lng >= -80.5 && lng <= -74.5) return "Pennsylvania/New Jersey";
  if (lat >= 40 && lat <= 45 && lng >= -80 && lng <= -71) return "New York State";
  if (lat >= 41 && lat <= 47 && lng >= -93 && lng <= -82) return "Great Lakes region";
  if (lat >= 43 && lat <= 49 && lng >= -97 && lng <= -89) return "Minnesota/Wisconsin";

  // Generic fallback
  if (lng < -100) return "Western US";
  if (lng < -85) return "Central US";
  return "Eastern US";
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
      <h3 className="text-base font-semibold text-zinc-100 mb-1">Top Window Areas</h3>
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
              const locationName = getApproximateLocation(cell.center_lat, cell.center_lng);
              return (
                <tr key={cell.cell_id} className="border-b border-dark-border last:border-0">
                  <td className="py-2 text-zinc-500">{index + 1}</td>
                  <td className="py-2">
                    <div className="flex flex-col">
                      <span className="text-sm text-zinc-200">{locationName}</span>
                      <span className="font-mono text-[10px] text-zinc-500">
                        {cell.center_lat?.toFixed(2)}°, {cell.center_lng?.toFixed(2)}°
                      </span>
                    </div>
                  </td>
                  <td className="py-2">
                    <div className="flex gap-1">
                      {getTypeBadges(cell.types_present ?? [])}
                    </div>
                  </td>
                  <td className="py-2 text-right text-zinc-300">{cell.total_count.toLocaleString()}</td>
                  <td className="py-2 text-right font-mono text-zinc-300">
                    {(cell.window_index ?? 0).toFixed(2)}
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
