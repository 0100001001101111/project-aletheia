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
}

interface Props {
  cells: GridCell[];
}

export function WindowMap({ cells }: Props) {
  // Filter to cells within continental US bounds for visualization
  const usCells = cells.filter(
    (c) =>
      c.center_lat >= 24 &&
      c.center_lat <= 50 &&
      c.center_lng >= -125 &&
      c.center_lng <= -66
  );

  // Calculate bounds
  const minLat = 24;
  const maxLat = 50;
  const minLng = -125;
  const maxLng = -66;

  // SVG dimensions
  const width = 400;
  const height = 250;

  // Scale functions
  const scaleX = (lng: number) => ((lng - minLng) / (maxLng - minLng)) * width;
  const scaleY = (lat: number) => height - ((lat - minLat) / (maxLat - minLat)) * height;

  // Get max window index for scaling
  const maxIndex = Math.max(...usCells.map((c) => c.window_index ?? 0), 0.001);

  // Get color based on type count
  const getColor = (typeCount: number) => {
    if (typeCount === 3) return "#22c55e"; // green - all three
    if (typeCount === 2) return "#eab308"; // yellow - two types
    return "#3b82f6"; // blue - single type
  };

  // Get radius based on window index
  const getRadius = (index: number) => {
    const normalized = index / maxIndex;
    return 3 + normalized * 8; // 3-11px radius
  };

  return (
    <div className="rounded-xl border border-dark-border bg-dark-card p-6">
      <h3 className="text-base font-semibold text-zinc-100 mb-1">Geographic Distribution</h3>
      <p className="text-sm text-zinc-400 mb-4">
        Continental US window areas (size = window index, color = type count)
      </p>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto bg-dark-hover rounded border border-dark-border"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Simple US outline - approximate */}
        <path
          d="M 50 150 L 80 180 L 120 190 L 160 185 L 200 175 L 240 180 L 280 170 L 320 160 L 360 155 L 380 140 L 370 120 L 360 100 L 340 80 L 300 70 L 260 65 L 220 60 L 180 55 L 140 60 L 100 70 L 60 90 L 40 120 Z"
          fill="none"
          stroke="currentColor"
          strokeOpacity={0.2}
          strokeWidth={1}
        />

        {/* Grid cells as circles */}
        {usCells.map((cell) => (
          <circle
            key={cell.cell_id}
            cx={scaleX(cell.center_lng)}
            cy={scaleY(cell.center_lat)}
            r={getRadius(cell.window_index ?? 0)}
            fill={getColor(cell.type_count)}
            fillOpacity={0.6}
            stroke={getColor(cell.type_count)}
            strokeWidth={1}
          >
            <title>
              {cell.center_lat.toFixed(2)}, {cell.center_lng.toFixed(2)}
              {"\n"}Window Index: {(cell.window_index ?? 0).toFixed(3)}
              {"\n"}Types: {cell.types_present?.join(", ")}
              {"\n"}Reports: {cell.total_count}
            </title>
          </circle>
        ))}
      </svg>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mt-4 text-xs text-zinc-500">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-blue-500" />
          <span>Single type</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-yellow-500" />
          <span>Two types</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span>All three types</span>
        </div>
      </div>

      <p className="text-xs text-zinc-500 mt-2">
        Showing {usCells.length} cells in continental US. Circle size indicates window index.
      </p>
    </div>
  );
}
