'use client';

/**
 * Agent Research Reports Page
 * Browse and filter agent-generated research reports
 */

import { useEffect, useState, useCallback } from 'react';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { ReportCard } from '@/components/agent/ReportCard';
import Link from 'next/link';
import type { ReportVerdict } from '@/lib/agent/types';

interface Report {
  id: string;
  slug: string;
  title: string;
  display_title: string;
  summary: string;
  confidence_final: number | null;
  verdict: ReportVerdict | null;
  status: string;
  published_at: string | null;
  created_at: string | null;
}

interface Counts {
  total: number;
  published: number;
  draft: number;
  byVerdict: Record<string, number>;
}

type FilterVerdict = 'all' | 'supported' | 'refuted' | 'inconclusive' | 'needs_more_data';
type FilterStatus = 'all' | 'published' | 'draft';

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [counts, setCounts] = useState<Counts>({ total: 0, published: 0, draft: 0, byVerdict: {} });
  const [verdictFilter, setVerdictFilter] = useState<FilterVerdict>('all');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('published');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReports = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      // Always send status param - API defaults to 'published' without it
      params.set('status', statusFilter);
      if (verdictFilter !== 'all') {
        params.set('verdict', verdictFilter);
      }

      const res = await fetch(`/api/agent/reports?${params}`);
      if (!res.ok) throw new Error('Failed to fetch reports');

      const data = await res.json();
      setReports(data.reports || []);
      setCounts(data.counts || { total: 0, published: 0, draft: 0, byVerdict: {} });
    } catch (err) {
      console.error('Error fetching reports:', err);
      setError(err instanceof Error ? err.message : 'Failed to load reports');
    } finally {
      setIsLoading(false);
    }
  }, [verdictFilter, statusFilter]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const verdictTabs: { key: FilterVerdict; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'supported', label: 'Supported' },
    { key: 'refuted', label: 'Refuted' },
    { key: 'inconclusive', label: 'Inconclusive' },
    { key: 'needs_more_data', label: 'Needs Data' },
  ];

  return (
    <PageWrapper
      title="Agent Research Reports"
      description="Autonomous research into anomalous patterns"
      headerAction={
        <Link
          href="/agent"
          className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-sm font-medium transition-colors"
        >
          ← Agent Terminal
        </Link>
      }
    >
      {/* Stats bar */}
      <div className="mb-6 p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg">
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-zinc-500 text-sm">Total Reports:</span>
            <span className="font-medium text-zinc-200">{counts.total}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-zinc-500 text-sm">Published:</span>
            <span className="text-brand-400 font-medium">{counts.published}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-zinc-500 text-sm">Supported:</span>
            <span className="text-emerald-400 font-medium">{counts.byVerdict?.supported || 0}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-zinc-500 text-sm">Refuted:</span>
            <span className="text-red-400 font-medium">{counts.byVerdict?.refuted || 0}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-zinc-500 text-sm">Inconclusive:</span>
            <span className="text-amber-400 font-medium">{counts.byVerdict?.inconclusive || 0}</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap items-center gap-4">
        {/* Status filter */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-zinc-500">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as FilterStatus)}
            className="px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-300 focus:outline-none focus:border-brand-500"
          >
            <option value="all">All</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
          </select>
        </div>

        {/* Verdict filter tabs */}
        <div className="flex flex-wrap gap-2">
          {verdictTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setVerdictFilter(tab.key)}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                verdictFilter === tab.key
                  ? 'bg-brand-600 text-white'
                  : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="p-4 bg-red-900/20 border border-red-500/30 rounded-lg text-red-400">
          {error}
        </div>
      )}

      {/* Reports grid */}
      {!isLoading && !error && (
        <>
          {reports.length === 0 ? (
            <div className="py-12 text-center">
              <div className="text-6xl mb-4">📊</div>
              <h3 className="text-xl font-medium text-zinc-300 mb-2">No reports yet</h3>
              <p className="text-zinc-500 max-w-md mx-auto">
                {statusFilter === 'published'
                  ? 'No reports have been published yet. The agent generates reports when it conducts external research on findings.'
                  : verdictFilter !== 'all'
                  ? `No reports with verdict "${verdictFilter.replace('_', ' ')}".`
                  : 'The agent hasn\'t generated any research reports yet.'}
              </p>
              <Link
                href="/agent"
                className="inline-block mt-6 px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Go to Agent Terminal
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {reports.map((report) => (
                <ReportCard key={report.id} report={report} />
              ))}
            </div>
          )}
        </>
      )}

      {/* Methodology note */}
      <div className="mt-8 p-4 bg-zinc-900/30 border border-zinc-800 rounded-lg">
        <p className="text-sm text-zinc-500">
          <span className="font-medium text-zinc-400">About these reports:</span> Research reports
          are generated autonomously by the Aletheia Research Agent when it finds patterns that
          need external validation. The agent searches for prior research, alternative data sources,
          theoretical explanations, and critical perspectives to synthesize a comprehensive analysis.
        </p>
      </div>
    </PageWrapper>
  );
}
