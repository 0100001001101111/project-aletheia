'use client';

/**
 * Domain Detail Statistics Page
 * Detailed metrics and charts for a single research domain
 */

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { DomainStats, TemporalCoverageBucket } from '@/lib/domain-stats-calculator';
import {
  getDomainDisplayName,
  getDomainDescription,
  getDomainColor,
  RESEARCH_DOMAINS,
} from '@/lib/domain-stats-calculator';
import { QualityDistributionChart, QualityDistributionBar } from '@/components/statistics/QualityDistributionChart';
import type { InvestigationType } from '@/types/database';

interface DomainDetailPageProps {
  params: Promise<{ domain: string }>;
}

export default function DomainDetailPage({ params }: DomainDetailPageProps) {
  const resolvedParams = use(params);
  const domain = resolvedParams.domain as InvestigationType;
  const router = useRouter();

  const [stats, setStats] = useState<DomainStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Validate domain
    if (!RESEARCH_DOMAINS.includes(domain as typeof RESEARCH_DOMAINS[number])) {
      router.push('/statistics');
      return;
    }

    fetchDomainStats();
  }, [domain, router]);

  const fetchDomainStats = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/statistics/domains?domain=${domain}`);
      if (!response.ok) throw new Error('Failed to fetch domain statistics');
      const result = await response.json();
      setStats(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load statistics');
    } finally {
      setIsLoading(false);
    }
  };

  const color = getDomainColor(domain);
  const displayName = getDomainDisplayName(domain);
  const description = getDomainDescription(domain);

  // Color classes
  const colorClasses: Record<string, { bg: string; text: string; border: string }> = {
    violet: { bg: 'bg-violet-500', text: 'text-violet-400', border: 'border-violet-500/30' },
    cyan: { bg: 'bg-cyan-500', text: 'text-cyan-400', border: 'border-cyan-500/30' },
    rose: { bg: 'bg-rose-500', text: 'text-rose-400', border: 'border-rose-500/30' },
    amber: { bg: 'bg-amber-500', text: 'text-amber-400', border: 'border-amber-500/30' },
    emerald: { bg: 'bg-emerald-500', text: 'text-emerald-400', border: 'border-emerald-500/30' },
    blue: { bg: 'bg-blue-500', text: 'text-blue-400', border: 'border-blue-500/30' },
  };
  const domainColors = colorClasses[color] || colorClasses.violet;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <div className="border-b border-zinc-800 bg-zinc-900/50">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 text-sm text-zinc-400 mb-4">
            <Link href="/statistics" className="hover:text-zinc-200">
              Statistics
            </Link>
            <span>/</span>
            <span className={domainColors.text}>{displayName}</span>
          </div>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className={`h-4 w-4 rounded-full ${domainColors.bg}`} />
              <div>
                <h1 className="text-2xl font-bold text-zinc-100">{displayName}</h1>
                <p className="mt-1 text-sm text-zinc-400">{description}</p>
              </div>
            </div>
            <button
              onClick={fetchDomainStats}
              disabled={isLoading}
              className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-zinc-300 hover:bg-zinc-700 disabled:opacity-50"
            >
              {isLoading ? 'Loading...' : 'Refresh'}
            </button>
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {isLoading ? (
          <LoadingSkeleton />
        ) : stats ? (
          <div className="space-y-8">
            {/* Key Metrics */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard
                label="Total Records"
                value={stats.recordCount.toLocaleString()}
                color={domainColors.text}
              />
              <MetricCard
                label="Average Score"
                value={stats.avgScore != null ? stats.avgScore.toFixed(1) : '—'}
                subtext={
                  stats.minScore != null && stats.maxScore != null
                    ? `Range: ${stats.minScore}–${stats.maxScore}`
                    : undefined
                }
                color={
                  stats.avgScore != null && stats.avgScore >= 7
                    ? 'text-emerald-400'
                    : stats.avgScore != null && stats.avgScore >= 4
                      ? 'text-amber-400'
                      : 'text-red-400'
                }
              />
              <MetricCard
                label="Verified"
                value={stats.verifiedCount.toString()}
                subtext={
                  stats.recordCount > 0
                    ? `${((stats.verifiedCount / stats.recordCount) * 100).toFixed(0)}% of total`
                    : undefined
                }
                color="text-emerald-400"
              />
              <MetricCard
                label="Reliability Index"
                value={`${(stats.reliabilityIndex * 100).toFixed(0)}%`}
                color={
                  stats.reliabilityIndex >= 0.7
                    ? 'text-emerald-400'
                    : stats.reliabilityIndex >= 0.4
                      ? 'text-amber-400'
                      : 'text-red-400'
                }
              />
            </div>

            {/* Status Breakdown */}
            <div className="grid gap-4 lg:grid-cols-2">
              <div className={`rounded-xl border ${domainColors.border} bg-zinc-900/50 p-6`}>
                <h2 className="text-lg font-semibold text-zinc-200 mb-4">Status Breakdown</h2>
                <div className="space-y-4">
                  <StatusRow
                    label="Verified"
                    count={stats.verifiedCount}
                    total={stats.recordCount}
                    color="bg-emerald-500"
                  />
                  <StatusRow
                    label="Provisional"
                    count={stats.provisionalCount}
                    total={stats.recordCount}
                    color="bg-amber-500"
                  />
                  <StatusRow
                    label="Pending"
                    count={stats.pendingCount}
                    total={stats.recordCount}
                    color="bg-blue-500"
                  />
                  <StatusRow
                    label="Rejected"
                    count={stats.rejectedCount}
                    total={stats.recordCount}
                    color="bg-red-500"
                  />
                </div>
              </div>

              <div className={`rounded-xl border ${domainColors.border} bg-zinc-900/50 p-6`}>
                <h2 className="text-lg font-semibold text-zinc-200 mb-4">Score Distribution</h2>
                <QualityDistributionChart distribution={stats.scoreDistribution} height={160} />
              </div>
            </div>

            {/* Temporal Coverage */}
            {stats.temporalCoverage.length > 0 && (
              <div className={`rounded-xl border ${domainColors.border} bg-zinc-900/50 p-6`}>
                <h2 className="text-lg font-semibold text-zinc-200 mb-4">Temporal Coverage</h2>
                <TemporalCoverageChart coverage={stats.temporalCoverage} color={domainColors.bg} />
                <div className="mt-4 flex justify-between text-xs text-zinc-500">
                  <span>
                    Oldest: {stats.oldestRecord ? new Date(stats.oldestRecord).toLocaleDateString() : '—'}
                  </span>
                  <span>
                    Newest: {stats.newestRecord ? new Date(stats.newestRecord).toLocaleDateString() : '—'}
                  </span>
                </div>
              </div>
            )}

            {/* Data Quality Summary */}
            <div className={`rounded-xl border ${domainColors.border} bg-zinc-900/50 p-6`}>
              <h2 className="text-lg font-semibold text-zinc-200 mb-4">Data Quality Summary</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <div className="text-sm text-zinc-400 mb-2">Quality Index</div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-3 bg-zinc-700 rounded-full overflow-hidden">
                      <div
                        className={domainColors.bg}
                        style={{ width: `${stats.dataQualityIndex * 100}%`, height: '100%' }}
                      />
                    </div>
                    <span className={`text-sm font-medium ${domainColors.text}`}>
                      {(stats.dataQualityIndex * 100).toFixed(0)}%
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 mt-1">
                    Percentage of records with complete scoring data
                  </p>
                </div>
                <div>
                  <div className="text-sm text-zinc-400 mb-2">Score Coverage</div>
                  <QualityDistributionBar distribution={stats.scoreDistribution} />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-4">
              <Link
                href={`/investigations?type=${domain}`}
                className={`rounded-lg border ${domainColors.border} bg-zinc-800 px-4 py-2 text-sm font-medium ${domainColors.text} hover:bg-zinc-700`}
              >
                Browse {displayName} Investigations →
              </Link>
              <Link
                href="/submit"
                className="rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-700"
              >
                Submit New Investigation
              </Link>
            </div>
          </div>
        ) : null}

        {/* Footer */}
        <div className="mt-8 pt-8 border-t border-zinc-800 flex justify-center">
          <Link href="/statistics" className="text-sm text-zinc-500 hover:text-zinc-300">
            ← Back to All Domains
          </Link>
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  subtext,
  color = 'text-zinc-100',
}: {
  label: string;
  value: string;
  subtext?: string;
  color?: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-700 bg-zinc-900/50 p-5">
      <div className="text-sm text-zinc-400">{label}</div>
      <div className={`text-3xl font-bold mt-1 ${color}`}>{value}</div>
      {subtext && <div className="text-xs text-zinc-500 mt-1">{subtext}</div>}
    </div>
  );
}

function StatusRow({
  label,
  count,
  total,
  color,
}: {
  label: string;
  count: number;
  total: number;
  color: string;
}) {
  const percentage = total > 0 ? (count / total) * 100 : 0;

  return (
    <div className="flex items-center gap-3">
      <div className={`w-3 h-3 rounded-full ${color}`} />
      <div className="flex-1">
        <div className="flex justify-between mb-1">
          <span className="text-sm text-zinc-300">{label}</span>
          <span className="text-sm text-zinc-400">{count}</span>
        </div>
        <div className="h-1.5 bg-zinc-700 rounded-full overflow-hidden">
          <div
            className={`h-full ${color} rounded-full`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function TemporalCoverageChart({
  coverage,
  color,
}: {
  coverage: TemporalCoverageBucket[];
  color: string;
}) {
  const maxCount = Math.max(...coverage.map((c) => c.count), 1);

  return (
    <div className="flex items-end gap-1" style={{ height: 100 }}>
      {coverage.map((bucket) => (
        <div
          key={bucket.year}
          className="flex-1 flex flex-col items-center justify-end"
          title={`${bucket.year}: ${bucket.count} records`}
        >
          <div
            className={`w-full rounded-t ${color}`}
            style={{
              height: `${(bucket.count / maxCount) * 100}%`,
              minHeight: bucket.count > 0 ? 4 : 0,
            }}
          />
          {coverage.length <= 10 && (
            <span className="text-xs text-zinc-500 mt-1">{bucket.year}</span>
          )}
        </div>
      ))}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-xl border border-zinc-700 bg-zinc-800/50 p-5">
            <div className="h-4 w-20 bg-zinc-700 rounded" />
            <div className="h-8 w-16 bg-zinc-700 rounded mt-2" />
          </div>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {[1, 2].map((i) => (
          <div key={i} className="rounded-xl border border-zinc-700 bg-zinc-800/50 p-6 h-64" />
        ))}
      </div>
    </div>
  );
}
