'use client';

/**
 * QualityDistributionChart
 * Bar chart showing score distribution across quality buckets
 */

import type { ScoreDistributionBucket } from '@/lib/domain-stats-calculator';

interface QualityDistributionChartProps {
  distribution: ScoreDistributionBucket[];
  height?: number;
  showLabels?: boolean;
  colorScheme?: 'standard' | 'monochrome';
}

const BUCKET_COLORS = {
  '0-2': { bg: 'bg-red-500', text: 'text-red-400', label: 'Rejected' },
  '2-4': { bg: 'bg-orange-500', text: 'text-orange-400', label: 'Low' },
  '4-6': { bg: 'bg-amber-500', text: 'text-amber-400', label: 'Pending' },
  '6-8': { bg: 'bg-lime-500', text: 'text-lime-400', label: 'Provisional' },
  '8-10': { bg: 'bg-emerald-500', text: 'text-emerald-400', label: 'Verified' },
};

export function QualityDistributionChart({
  distribution,
  height = 120,
  showLabels = true,
  colorScheme = 'standard',
}: QualityDistributionChartProps) {
  // Find max count for scaling
  const maxCount = Math.max(...distribution.map((b) => b.count), 1);

  return (
    <div className="space-y-2">
      {/* Bars */}
      <div className="flex items-end gap-2" style={{ height }}>
        {distribution.map((bucket) => {
          const bucketConfig = BUCKET_COLORS[bucket.range as keyof typeof BUCKET_COLORS];
          const barHeight = (bucket.count / maxCount) * 100;

          return (
            <div
              key={bucket.range}
              className="flex-1 flex flex-col items-center justify-end"
            >
              {/* Count label */}
              {bucket.count > 0 && (
                <span className="text-xs text-zinc-400 mb-1">{bucket.count}</span>
              )}
              {/* Bar */}
              <div
                className={`w-full rounded-t transition-all ${
                  colorScheme === 'standard' ? bucketConfig.bg : 'bg-violet-500'
                }`}
                style={{
                  height: `${Math.max(barHeight, bucket.count > 0 ? 4 : 0)}%`,
                  minHeight: bucket.count > 0 ? 4 : 0,
                }}
                title={`${bucket.range}: ${bucket.count} records (${bucket.percentage.toFixed(1)}%)`}
              />
            </div>
          );
        })}
      </div>

      {/* X-axis labels */}
      {showLabels && (
        <div className="flex gap-2">
          {distribution.map((bucket) => (
            <div key={bucket.range} className="flex-1 text-center">
              <div className="text-xs text-zinc-500">{bucket.range}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Compact horizontal bar chart variant
 */
export function QualityDistributionBar({
  distribution,
  showLegend = false,
}: {
  distribution: ScoreDistributionBucket[];
  showLegend?: boolean;
}) {
  const total = distribution.reduce((sum, b) => sum + b.count, 0);

  if (total === 0) {
    return (
      <div className="h-4 rounded-full bg-zinc-700 flex items-center justify-center">
        <span className="text-xs text-zinc-500">No data</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="h-4 rounded-full bg-zinc-700 overflow-hidden flex">
        {distribution.map((bucket) => {
          if (bucket.count === 0) return null;
          const bucketConfig = BUCKET_COLORS[bucket.range as keyof typeof BUCKET_COLORS];
          const width = (bucket.count / total) * 100;

          return (
            <div
              key={bucket.range}
              className={`${bucketConfig.bg} transition-all`}
              style={{ width: `${width}%` }}
              title={`${bucket.range}: ${bucket.count} records (${bucket.percentage.toFixed(1)}%)`}
            />
          );
        })}
      </div>

      {showLegend && (
        <div className="flex flex-wrap gap-3 text-xs">
          {distribution.map((bucket) => {
            const bucketConfig = BUCKET_COLORS[bucket.range as keyof typeof BUCKET_COLORS];
            return (
              <div key={bucket.range} className="flex items-center gap-1">
                <span className={`h-2 w-2 rounded-full ${bucketConfig.bg}`} />
                <span className="text-zinc-400">
                  {bucket.range} ({bucket.count})
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * Pie chart variant showing percentages
 */
export function QualityDistributionPie({
  distribution,
  size = 120,
}: {
  distribution: ScoreDistributionBucket[];
  size?: number;
}) {
  const total = distribution.reduce((sum, b) => sum + b.count, 0);

  if (total === 0) {
    return (
      <div
        className="rounded-full bg-zinc-700 flex items-center justify-center"
        style={{ width: size, height: size }}
      >
        <span className="text-xs text-zinc-500">No data</span>
      </div>
    );
  }

  // Calculate conic gradient stops
  let cumulative = 0;
  const gradientStops: string[] = [];

  distribution.forEach((bucket) => {
    if (bucket.count === 0) return;

    const bucketConfig = BUCKET_COLORS[bucket.range as keyof typeof BUCKET_COLORS];
    const colorVar = bucketConfig.bg.replace('bg-', '').replace('-500', '');
    const color = getComputedColor(colorVar);

    const start = cumulative;
    cumulative += bucket.percentage;
    const end = cumulative;

    gradientStops.push(`${color} ${start}% ${end}%`);
  });

  return (
    <div
      className="rounded-full"
      style={{
        width: size,
        height: size,
        background: `conic-gradient(${gradientStops.join(', ')})`,
      }}
    >
      <div
        className="rounded-full bg-zinc-900 flex items-center justify-center"
        style={{
          width: size * 0.6,
          height: size * 0.6,
          margin: size * 0.2,
        }}
      >
        <span className="text-sm font-bold text-zinc-200">{total}</span>
      </div>
    </div>
  );
}

// Helper to get computed color values
function getComputedColor(name: string): string {
  const colors: Record<string, string> = {
    red: '#ef4444',
    orange: '#f97316',
    amber: '#f59e0b',
    lime: '#84cc16',
    emerald: '#10b981',
  };
  return colors[name] || '#71717a';
}
