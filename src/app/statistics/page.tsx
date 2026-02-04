'use client';

/**
 * Domain Statistics Dashboard
 * Overview of data quality and reliability across research domains
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { DomainStatsCard, DomainStatsCardSkeleton } from '@/components/statistics/DomainStatsCard';
import { QualityDistributionBar } from '@/components/statistics/QualityDistributionChart';
import type { DomainComparison } from '@/lib/domain-stats-calculator';

// Extended type with API response properties
interface DomainComparisonResponse extends DomainComparison {
  cached?: boolean;
}
import { RESEARCH_DOMAINS, getDomainDisplayName } from '@/lib/domain-stats-calculator';

export default function StatisticsPage() {
  const [data, setData] = useState<DomainComparisonResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStatistics();
  }, []);

  const fetchStatistics = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/statistics/domains');
      if (!response.ok) throw new Error('Failed to fetch statistics');
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load statistics');
    } finally {
      setIsLoading(false);
    }
  };

  // Aggregate score distribution across all domains
  const aggregateDistribution =
    data?.domains.reduce(
      (acc, domain) => {
        domain.scoreDistribution?.forEach((bucket, i) => {
          acc[i] = {
            ...acc[i],
            count: (acc[i]?.count || 0) + bucket.count,
          };
        });
        return acc;
      },
      [
        { range: '0-2', count: 0, percentage: 0 },
        { range: '2-4', count: 0, percentage: 0 },
        { range: '4-6', count: 0, percentage: 0 },
        { range: '6-8', count: 0, percentage: 0 },
        { range: '8-10', count: 0, percentage: 0 },
      ]
    ) || [];

  // Calculate percentages for aggregate
  const totalRecords = aggregateDistribution.reduce((sum, b) => sum + b.count, 0);
  aggregateDistribution.forEach((bucket) => {
    bucket.percentage = totalRecords > 0 ? (bucket.count / totalRecords) * 100 : 0;
  });

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <div className="border-b border-zinc-800 bg-zinc-900/50">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-zinc-100">Domain Statistics</h1>
              <p className="mt-1 text-sm text-zinc-400">
                Data quality and reliability metrics across research domains
              </p>
            </div>
            <div className="flex items-center gap-3">
              {data?.cached && (
                <span className="text-xs text-zinc-500">
                  Cached • Updated {new Date(data.lastUpdated).toLocaleTimeString()}
                </span>
              )}
              <button
                onClick={fetchStatistics}
                disabled={isLoading}
                className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-zinc-300 hover:bg-zinc-700 disabled:opacity-50"
              >
                {isLoading ? 'Loading...' : 'Refresh'}
              </button>
            </div>
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
        {/* Tier Overview Banner */}
        <div className="rounded-xl border border-violet-500/20 bg-violet-900/10 p-5 mb-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-violet-200">Data Quality Overview</h2>
              <p className="text-sm text-violet-300/70 mt-1">
                Statistics below are from <span className="font-medium text-emerald-400">Research tier</span> only.
                Predictions and pattern analysis use this quality-scored data.
              </p>
            </div>
            <div className="flex gap-4 text-sm">
              <div className="text-center px-4 py-2 rounded-lg bg-emerald-600/20 border border-emerald-500/30">
                <div className="text-2xl font-bold text-emerald-400">
                  {isLoading ? '—' : data?.totalRecords.toLocaleString()}
                </div>
                <div className="text-emerald-300/70">Research</div>
              </div>
              <div className="text-center px-4 py-2 rounded-lg bg-zinc-600/20 border border-zinc-500/30">
                <div className="text-2xl font-bold text-zinc-300">173k+</div>
                <div className="text-zinc-400">Exploratory</div>
              </div>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-900/10 p-5">
            <div className="text-sm text-emerald-300/70 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              Research Records
            </div>
            <div className="text-3xl font-bold text-emerald-400 mt-1">
              {isLoading ? '—' : data?.totalRecords.toLocaleString()}
            </div>
          </div>
          <div className="rounded-xl border border-zinc-700 bg-zinc-900/50 p-5">
            <div className="text-sm text-zinc-400">Average Reliability</div>
            <div className="text-3xl font-bold text-zinc-100 mt-1">
              {isLoading ? '—' : `${((data?.avgReliability || 0) * 100).toFixed(0)}%`}
            </div>
          </div>
          <div className="rounded-xl border border-zinc-700 bg-zinc-900/50 p-5">
            <div className="text-sm text-zinc-400">Active Domains</div>
            <div className="text-3xl font-bold text-zinc-100 mt-1">
              {isLoading ? '—' : data?.domains.filter((d) => d.recordCount > 0).length}
            </div>
          </div>
          <div className="rounded-xl border border-zinc-700 bg-zinc-900/50 p-5">
            <div className="text-sm text-zinc-400">Verified Records</div>
            <div className="text-3xl font-bold text-emerald-400 mt-1">
              {isLoading
                ? '—'
                : data?.domains.reduce((sum, d) => sum + d.verifiedCount, 0).toLocaleString()}
            </div>
          </div>
        </div>

        {/* Global Score Distribution */}
        <div className="rounded-xl border border-zinc-700 bg-zinc-900/50 p-6 mb-8">
          <h2 className="text-lg font-semibold text-zinc-200 mb-4">
            Overall Quality Distribution
          </h2>
          {isLoading ? (
            <div className="h-4 bg-zinc-700 rounded-full animate-pulse" />
          ) : (
            <QualityDistributionBar distribution={aggregateDistribution} showLegend />
          )}
        </div>

        {/* Domain Cards Grid */}
        <h2 className="text-lg font-semibold text-zinc-200 mb-4">Research Domains</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-8">
          {isLoading
            ? RESEARCH_DOMAINS.map((domain) => <DomainStatsCardSkeleton key={domain} />)
            : data?.domains.map((stats) => (
                <DomainStatsCard key={stats.domain} stats={stats} />
              ))}
        </div>

        {/* Comparison Table */}
        {!isLoading && data && (
          <div className="rounded-xl border border-zinc-700 bg-zinc-900/50 overflow-hidden">
            <div className="p-4 border-b border-zinc-700">
              <h2 className="text-lg font-semibold text-zinc-200">Cross-Domain Comparison</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-700 bg-zinc-800/50">
                    <th className="px-4 py-3 text-left font-medium text-zinc-400">Domain</th>
                    <th className="px-4 py-3 text-right font-medium text-zinc-400">Records</th>
                    <th className="px-4 py-3 text-right font-medium text-zinc-400">Avg Score</th>
                    <th className="px-4 py-3 text-right font-medium text-zinc-400">Verified</th>
                    <th className="px-4 py-3 text-right font-medium text-zinc-400">Provisional</th>
                    <th className="px-4 py-3 text-right font-medium text-zinc-400">Reliability</th>
                    <th className="px-4 py-3 text-center font-medium text-zinc-400">Distribution</th>
                  </tr>
                </thead>
                <tbody>
                  {data.domains
                    .sort((a, b) => b.recordCount - a.recordCount)
                    .map((stats) => (
                      <tr
                        key={stats.domain}
                        className="border-b border-zinc-800 hover:bg-zinc-800/30"
                      >
                        <td className="px-4 py-3">
                          <Link
                            href={`/statistics/${stats.domain}`}
                            className="text-zinc-200 hover:text-violet-400"
                          >
                            {getDomainDisplayName(stats.domain)}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-right text-zinc-300">
                          {stats.recordCount.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {stats.avgScore != null ? (
                            <span
                              className={
                                stats.avgScore >= 7
                                  ? 'text-emerald-400'
                                  : stats.avgScore >= 4
                                    ? 'text-amber-400'
                                    : 'text-red-400'
                              }
                            >
                              {stats.avgScore.toFixed(1)}
                            </span>
                          ) : (
                            <span className="text-zinc-500">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right text-emerald-400">
                          {stats.verifiedCount}
                        </td>
                        <td className="px-4 py-3 text-right text-amber-400">
                          {stats.provisionalCount}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span
                            className={
                              stats.reliabilityIndex >= 0.7
                                ? 'text-emerald-400'
                                : stats.reliabilityIndex >= 0.4
                                  ? 'text-amber-400'
                                  : 'text-red-400'
                            }
                          >
                            {(stats.reliabilityIndex * 100).toFixed(0)}%
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="w-32 mx-auto">
                            <QualityDistributionBar distribution={stats.scoreDistribution} />
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Footer Links */}
        <div className="mt-8 flex justify-center gap-4 text-sm">
          <Link href="/dashboard" className="text-zinc-500 hover:text-zinc-300">
            ← Back to Dashboard
          </Link>
          <Link href="/investigations" className="text-zinc-500 hover:text-zinc-300">
            Browse Investigations →
          </Link>
        </div>
      </div>
    </div>
  );
}
