'use client';

/**
 * DomainStatsCard
 * Card displaying statistics for a single research domain
 */

import Link from 'next/link';
import type { DomainStats } from '@/lib/domain-stats-calculator';
import {
  getDomainDisplayName,
  getDomainDescription,
  getDomainColor,
} from '@/lib/domain-stats-calculator';

interface DomainStatsCardProps {
  stats: DomainStats;
}

function getColorClasses(color: string) {
  const colorMap: Record<string, { bg: string; border: string; text: string; accent: string }> = {
    violet: {
      bg: 'bg-violet-500/10',
      border: 'border-violet-500/30',
      text: 'text-violet-400',
      accent: 'bg-violet-500',
    },
    cyan: {
      bg: 'bg-cyan-500/10',
      border: 'border-cyan-500/30',
      text: 'text-cyan-400',
      accent: 'bg-cyan-500',
    },
    rose: {
      bg: 'bg-rose-500/10',
      border: 'border-rose-500/30',
      text: 'text-rose-400',
      accent: 'bg-rose-500',
    },
    amber: {
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/30',
      text: 'text-amber-400',
      accent: 'bg-amber-500',
    },
    emerald: {
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/30',
      text: 'text-emerald-400',
      accent: 'bg-emerald-500',
    },
    blue: {
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/30',
      text: 'text-blue-400',
      accent: 'bg-blue-500',
    },
    zinc: {
      bg: 'bg-zinc-500/10',
      border: 'border-zinc-500/30',
      text: 'text-zinc-400',
      accent: 'bg-zinc-500',
    },
  };
  return colorMap[color] || colorMap.zinc;
}

export function DomainStatsCard({ stats }: DomainStatsCardProps) {
  const color = getDomainColor(stats.domain);
  const colors = getColorClasses(color);
  const displayName = getDomainDisplayName(stats.domain);
  const description = getDomainDescription(stats.domain);

  // Calculate verification ratio
  const verificationRate =
    stats.recordCount > 0
      ? ((stats.verifiedCount / stats.recordCount) * 100).toFixed(0)
      : '0';

  return (
    <Link
      href={`/statistics/${stats.domain}`}
      className={`block rounded-xl border ${colors.border} ${colors.bg} p-5 transition-all hover:border-opacity-60 hover:shadow-lg`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className={`text-lg font-semibold ${colors.text}`}>{displayName}</h3>
          <p className="text-xs text-zinc-500 mt-0.5 line-clamp-2">{description}</p>
        </div>
        <div className={`h-3 w-3 rounded-full ${colors.accent}`} />
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <div className="text-2xl font-bold text-zinc-100">{stats.recordCount}</div>
          <div className="text-xs text-zinc-500">Records</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-zinc-100">
            {stats.avgScore != null ? stats.avgScore.toFixed(1) : '—'}
          </div>
          <div className="text-xs text-zinc-500">Avg Score</div>
        </div>
      </div>

      {/* Status Breakdown */}
      <div className="flex gap-1 mb-4">
        {stats.verifiedCount > 0 && (
          <div
            className="h-1.5 rounded-full bg-emerald-500"
            style={{
              width: `${(stats.verifiedCount / stats.recordCount) * 100}%`,
            }}
            title={`${stats.verifiedCount} verified (passed quality check for methodology, not phenomenon)`}
          />
        )}
        {stats.provisionalCount > 0 && (
          <div
            className="h-1.5 rounded-full bg-amber-500"
            style={{
              width: `${(stats.provisionalCount / stats.recordCount) * 100}%`,
            }}
            title={`${stats.provisionalCount} provisional`}
          />
        )}
        {stats.pendingCount > 0 && (
          <div
            className="h-1.5 rounded-full bg-blue-500"
            style={{
              width: `${(stats.pendingCount / stats.recordCount) * 100}%`,
            }}
            title={`${stats.pendingCount} pending`}
          />
        )}
        {stats.rejectedCount > 0 && (
          <div
            className="h-1.5 rounded-full bg-red-500"
            style={{
              width: `${(stats.rejectedCount / stats.recordCount) * 100}%`,
            }}
            title={`${stats.rejectedCount} rejected`}
          />
        )}
      </div>

      {/* Mini Stats Row */}
      <div className="flex justify-between text-xs">
        <div className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          <span className="text-zinc-400">{verificationRate}% verified</span>
        </div>
        <div className="text-zinc-500">
          {stats.minScore != null && stats.maxScore != null
            ? `${stats.minScore}–${stats.maxScore} range`
            : 'No scores yet'}
        </div>
      </div>

      {/* Reliability Index */}
      <div className="mt-4 pt-4 border-t border-zinc-700/50">
        <div className="flex items-center justify-between">
          <span className="text-xs text-zinc-500">Reliability Index</span>
          <div className="flex items-center gap-2">
            <div className="w-20 h-1.5 bg-zinc-700 rounded-full overflow-hidden">
              <div
                className={`h-full ${colors.accent} rounded-full`}
                style={{ width: `${stats.reliabilityIndex * 100}%` }}
              />
            </div>
            <span className={`text-xs font-medium ${colors.text}`}>
              {(stats.reliabilityIndex * 100).toFixed(0)}%
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

/**
 * Loading skeleton for DomainStatsCard
 */
export function DomainStatsCardSkeleton() {
  return (
    <div className="rounded-xl border border-zinc-700 bg-zinc-800/50 p-5 animate-pulse">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="h-5 w-32 bg-zinc-700 rounded" />
          <div className="h-3 w-48 bg-zinc-700/50 rounded mt-2" />
        </div>
        <div className="h-3 w-3 rounded-full bg-zinc-700" />
      </div>
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <div className="h-7 w-16 bg-zinc-700 rounded" />
          <div className="h-3 w-12 bg-zinc-700/50 rounded mt-1" />
        </div>
        <div>
          <div className="h-7 w-12 bg-zinc-700 rounded" />
          <div className="h-3 w-16 bg-zinc-700/50 rounded mt-1" />
        </div>
      </div>
      <div className="h-1.5 bg-zinc-700 rounded-full mb-4" />
      <div className="flex justify-between">
        <div className="h-3 w-20 bg-zinc-700/50 rounded" />
        <div className="h-3 w-16 bg-zinc-700/50 rounded" />
      </div>
    </div>
  );
}
