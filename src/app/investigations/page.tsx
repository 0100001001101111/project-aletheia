'use client';

/**
 * Investigations List Page
 * Browse and filter all investigation submissions
 */

import { useEffect, useState, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { SCHEMA_METADATA } from '@/schemas';
import { getTriageScoreColor, getTriageStatusColor } from '@/lib/triage';
import { ExploratoryDisclaimer, WeirdnessMini } from '@/components/exploratory';
import { Navigation } from '@/components/layout/Navigation';
import type { InvestigationType, TriageStatus } from '@/types/database';

type TierType = 'all' | 'research' | 'exploratory';

// Dynamically import map component to avoid SSR issues with Mapbox
const UFOMap = dynamic(() => import('@/components/maps/UFOMap'), {
  ssr: false,
  loading: () => (
    <div className="flex h-[600px] items-center justify-center bg-zinc-900 rounded-xl">
      <div className="text-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-500 border-t-transparent mx-auto" />
        <p className="mt-2 text-zinc-400">Loading map...</p>
      </div>
    </div>
  ),
});

interface Investigation {
  id: string;
  title: string;
  type: InvestigationType;
  triage_score: number;
  triage_status: TriageStatus;
  created_at: string;
  tier: 'research' | 'exploratory';
}

// Research tier domains (existing)
const RESEARCH_DOMAINS: InvestigationType[] = ['nde', 'ganzfeld', 'crisis_apparition', 'stargate', 'geophysical', 'ufo'];

// Exploratory tier domains
const EXPLORATORY_DOMAINS: InvestigationType[] = ['bigfoot', 'haunting', 'crop_circle', 'bermuda_triangle', 'hotspot', 'cryptid', 'cattle_mutilation', 'men_in_black'];

type SortField = 'created_at' | 'triage_score' | 'title';
type ViewMode = 'list' | 'map';

// Wrapper component to handle Suspense for useSearchParams
export default function InvestigationsPageWrapper() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-500 border-t-transparent" />
      </div>
    }>
      <InvestigationsPage />
    </Suspense>
  );
}

function InvestigationsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [investigations, setInvestigations] = useState<Investigation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  // View mode (list or map)
  const [viewMode, setViewMode] = useState<ViewMode>(
    (searchParams.get('view') as ViewMode) || 'list'
  );

  // Tier filter (all, research, or exploratory) - default to research for first-time visitors
  const [tier, setTier] = useState<TierType>(
    (searchParams.get('tier') as TierType) || 'research'
  );

  // Track separate counts for tier badges
  const [researchCount, setResearchCount] = useState(0);
  const [exploratoryCount, setExploratoryCount] = useState(0);

  // Filters
  const [filterType, setFilterType] = useState<InvestigationType | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<TriageStatus | 'all'>('all');
  const [sortField, setSortField] = useState<SortField>('triage_score');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);
  const limit = 20;

  useEffect(() => {
    async function fetchInvestigations() {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          limit: String(limit),
          offset: String(page * limit),
          sort: sortField,
          order: sortOrder,
          tier: tier,
        });

        if (filterType !== 'all') {
          params.set('type', filterType);
        }
        if (filterStatus !== 'all') {
          params.set('status', filterStatus);
        }

        const response = await fetch(`/api/submissions?${params}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch investigations');
        }

        setInvestigations(data.data || []);
        setTotal(data.total || 0);
        setResearchCount(data.researchCount || 0);
        setExploratoryCount(data.exploratoryCount || 0);
      } catch (err) {
        console.error('Fetch error:', err);
        setError(err instanceof Error ? err.message : 'Failed to load investigations');
      } finally {
        setLoading(false);
      }
    }

    fetchInvestigations();
  }, [filterType, filterStatus, sortField, sortOrder, page, tier]);

  // Client-side search filter
  const filteredInvestigations = useMemo(() => {
    if (!searchQuery.trim()) return investigations;
    const query = searchQuery.toLowerCase();
    return investigations.filter((inv) =>
      inv.title.toLowerCase().includes(query)
    );
  }, [investigations, searchQuery]);

  const handleInvestigationClick = (investigation: Investigation) => {
    router.push(`/investigations/${investigation.id}`);
  };

  // Dynamic types based on selected tier
  const types: (InvestigationType | 'all')[] = [
    'all',
    ...(tier === 'all'
      ? [...RESEARCH_DOMAINS, ...EXPLORATORY_DOMAINS]
      : tier === 'research'
        ? RESEARCH_DOMAINS
        : EXPLORATORY_DOMAINS),
  ];

  const statuses: (TriageStatus | 'all')[] = [
    'all',
    'pending',
    'provisional',
    'verified',
    'rejected',
  ];

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <div className="max-w-md rounded-xl border border-red-500/30 bg-red-500/10 p-8 text-center">
          <h2 className="text-xl font-bold text-red-400">Error Loading Investigations</h2>
          <p className="mt-2 text-red-300/80">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 rounded-lg bg-red-600/20 px-4 py-2 text-red-400 hover:bg-red-600/30"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <Navigation />

      {/* Tier Tabs */}
      <div className="pt-16 border-b border-zinc-800 bg-zinc-900/80">
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex">
            <button
              onClick={() => {
                setTier('all');
                setFilterType('all');
                setPage(0);
                router.push('/investigations?tier=all', { scroll: false });
              }}
              className={`relative px-6 py-4 text-sm font-medium transition-colors ${
                tier === 'all'
                  ? 'text-violet-400'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <span className="flex items-center gap-2">
                <span>📊</span>
                All
                <span className="text-xs bg-zinc-700 px-1.5 py-0.5 rounded-full">{total.toLocaleString()}</span>
              </span>
              {tier === 'all' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-500" />
              )}
            </button>
            <button
              onClick={() => {
                setTier('research');
                setFilterType('all');
                setPage(0);
                router.push('/investigations?tier=research', { scroll: false });
              }}
              className={`relative px-6 py-4 text-sm font-medium transition-colors ${
                tier === 'research'
                  ? 'text-emerald-400'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <span className="flex items-center gap-2">
                <span>🔬</span>
                Research
                <span className="text-xs bg-emerald-600/30 text-emerald-400 px-1.5 py-0.5 rounded-full">{researchCount.toLocaleString()}</span>
              </span>
              {tier === 'research' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500" />
              )}
            </button>
            <button
              onClick={() => {
                setTier('exploratory');
                setFilterType('all');
                setPage(0);
                router.push('/investigations?tier=exploratory', { scroll: false });
              }}
              className={`relative px-6 py-4 text-sm font-medium transition-colors ${
                tier === 'exploratory'
                  ? 'text-amber-400'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <span className="flex items-center gap-2">
                <span>📊</span>
                Pattern Analysis
                <span className="text-xs bg-amber-600/30 text-amber-400 px-1.5 py-0.5 rounded-full">{exploratoryCount.toLocaleString()}</span>
              </span>
              {tier === 'exploratory' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Tier Explanation Banner */}
      {tier === 'all' && (
        <div className="mx-auto max-w-7xl px-4 pt-4">
          <div className="rounded-lg border border-violet-500/20 bg-violet-900/10 p-4">
            <div className="flex items-start gap-4">
              <div className="flex-1">
                <p className="text-sm text-violet-200">
                  <span className="font-medium">Viewing All Data:</span>{' '}
                  Showing both quality-scored research and bulk-imported pattern analysis data.
                  Look for tier badges to distinguish data quality levels.
                </p>
              </div>
              <div className="flex gap-3 text-xs">
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-600/20 text-emerald-400 border border-emerald-500/30">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  Research = Quality Scored
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-600/20 text-amber-400 border border-amber-500/30">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  Pattern Only = Bulk Import
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
      {tier === 'research' && (
        <div className="mx-auto max-w-7xl px-4 pt-4">
          <div className="rounded-lg border border-emerald-500/20 bg-emerald-900/10 p-4">
            <p className="text-sm text-emerald-200">
              <span className="font-medium">🔬 Research-Grade Data:</span>{' '}
              Structured investigations with quality scoring (1-10). Each record supports falsifiable predictions
              and rigorous statistical analysis. This is the scientific core of Aletheia.
            </p>
          </div>
        </div>
      )}

      {/* Exploratory Disclaimer */}
      {tier === 'exploratory' && (
        <div className="mx-auto max-w-7xl px-4 pt-4">
          <ExploratoryDisclaimer />
        </div>
      )}

      {/* Header */}
      <header className={`border-b ${tier === 'exploratory' ? 'border-amber-500/20 bg-amber-900/10' : 'border-zinc-800 bg-zinc-900/50'}`}>
        <div className="mx-auto max-w-7xl px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className={`text-3xl font-bold ${tier === 'exploratory' ? 'text-amber-100' : 'text-zinc-100'}`}>
                {tier === 'exploratory' ? 'Pattern Analysis Data' : 'Research Investigations'}
              </h1>
              <p className={`mt-1 ${tier === 'exploratory' ? 'text-amber-300/70' : 'text-zinc-400'}`}>
                {tier === 'exploratory'
                  ? `Browse ${total.toLocaleString()} bulk-imported sightings — for pattern detection only, not scientific evidence`
                  : `Browse ${total} quality-scored research investigations`
                }
              </p>
            </div>
            <div className="flex items-center gap-4">
              {/* Full Anomaly Map Link */}
              {tier === 'exploratory' && (
                <a
                  href="/anomaly-map"
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-lg hover:from-violet-500 hover:to-purple-500 transition-all"
                >
                  <span>🗺️</span>
                  Full Anomaly Map
                </a>
              )}
              {/* View Mode Toggle */}
              <div className="flex rounded-lg border border-zinc-700 overflow-hidden">
                <button
                  onClick={() => {
                    setViewMode('list');
                    router.push('/investigations?view=list', { scroll: false });
                  }}
                  className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${
                    viewMode === 'list'
                      ? 'bg-violet-600 text-white'
                      : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  </svg>
                  List
                </button>
                <button
                  onClick={() => {
                    setViewMode('map');
                    router.push('/investigations?view=map', { scroll: false });
                  }}
                  className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${
                    viewMode === 'map'
                      ? 'bg-violet-600 text-white'
                      : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                  </svg>
                  Map
                </button>
              </div>
              <a
                href="/submit"
                className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500"
              >
                Submit New
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Map View */}
      {viewMode === 'map' && (
        <div className="h-[calc(100vh-140px)] min-h-[600px]">
          <UFOMap />
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <>
      {/* Domain Filter Chips - Prominent */}
      <div className="border-b border-zinc-800 bg-zinc-900/50">
        <div className="mx-auto max-w-7xl px-4 py-5">
          <div className="mb-2 text-sm font-medium text-zinc-400">Filter by Research Domain</div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => {
                setFilterType('all');
                setPage(0);
              }}
              className={`flex items-center gap-2 rounded-xl px-5 py-3 text-base font-medium transition-all ${
                filterType === 'all'
                  ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/25'
                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200'
              }`}
            >
              <span className="text-lg">📊</span>
              <span>All Domains</span>
              <span className={`ml-1 rounded-full px-2 py-0.5 text-sm ${
                filterType === 'all' ? 'bg-white/20' : 'bg-zinc-700'
              }`}>
                {total}
              </span>
            </button>
            {(tier === 'all'
              ? [...RESEARCH_DOMAINS, ...EXPLORATORY_DOMAINS]
              : tier === 'research'
                ? RESEARCH_DOMAINS
                : EXPLORATORY_DOMAINS
            ).map((type) => {
              const meta = SCHEMA_METADATA[type] || { name: type, icon: '❓', color: 'text-zinc-400' };
              const isActive = filterType === type;
              const colorMap: Partial<Record<InvestigationType, string>> = {
                // Research domains
                nde: 'bg-purple-600 shadow-purple-500/25',
                ganzfeld: 'bg-blue-600 shadow-blue-500/25',
                crisis_apparition: 'bg-amber-600 shadow-amber-500/25',
                stargate: 'bg-emerald-600 shadow-emerald-500/25',
                geophysical: 'bg-cyan-600 shadow-cyan-500/25',
                ufo: 'bg-rose-600 shadow-rose-500/25',
                // Exploratory domains
                bigfoot: 'bg-green-600 shadow-green-500/25',
                haunting: 'bg-purple-600 shadow-purple-500/25',
                crop_circle: 'bg-lime-600 shadow-lime-500/25',
                bermuda_triangle: 'bg-blue-600 shadow-blue-500/25',
                hotspot: 'bg-orange-600 shadow-orange-500/25',
                cryptid: 'bg-teal-600 shadow-teal-500/25',
                cattle_mutilation: 'bg-red-600 shadow-red-500/25',
                men_in_black: 'bg-zinc-600 shadow-zinc-500/25',
              };
              const hoverMap: Partial<Record<InvestigationType, string>> = {
                // Research domains
                nde: 'hover:bg-purple-600/20 hover:text-purple-300 hover:border-purple-500/50',
                ganzfeld: 'hover:bg-blue-600/20 hover:text-blue-300 hover:border-blue-500/50',
                crisis_apparition: 'hover:bg-amber-600/20 hover:text-amber-300 hover:border-amber-500/50',
                stargate: 'hover:bg-emerald-600/20 hover:text-emerald-300 hover:border-emerald-500/50',
                geophysical: 'hover:bg-cyan-600/20 hover:text-cyan-300 hover:border-cyan-500/50',
                ufo: 'hover:bg-rose-600/20 hover:text-rose-300 hover:border-rose-500/50',
                // Exploratory domains
                bigfoot: 'hover:bg-green-600/20 hover:text-green-300 hover:border-green-500/50',
                haunting: 'hover:bg-purple-600/20 hover:text-purple-300 hover:border-purple-500/50',
                crop_circle: 'hover:bg-lime-600/20 hover:text-lime-300 hover:border-lime-500/50',
                bermuda_triangle: 'hover:bg-blue-600/20 hover:text-blue-300 hover:border-blue-500/50',
                hotspot: 'hover:bg-orange-600/20 hover:text-orange-300 hover:border-orange-500/50',
                cryptid: 'hover:bg-teal-600/20 hover:text-teal-300 hover:border-teal-500/50',
                cattle_mutilation: 'hover:bg-red-600/20 hover:text-red-300 hover:border-red-500/50',
                men_in_black: 'hover:bg-zinc-600/20 hover:text-zinc-300 hover:border-zinc-500/50',
              };

              return (
                <button
                  key={type}
                  onClick={() => {
                    setFilterType(type);
                    setPage(0);
                  }}
                  className={`flex items-center gap-2 rounded-xl px-5 py-3 text-base font-medium transition-all border ${
                    isActive
                      ? `${colorMap[type] ?? 'bg-zinc-600'} text-white shadow-lg border-transparent`
                      : `bg-zinc-800/50 text-zinc-400 border-zinc-700 ${hoverMap[type] ?? ''}`
                  }`}
                >
                  <span className="text-lg">{meta.icon}</span>
                  <span>{meta.name.split(' ')[0]}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Secondary Filters */}
      <div className="border-b border-zinc-800 bg-zinc-900/30">
        <div className="mx-auto max-w-7xl px-4 py-3">
          <div className="flex flex-wrap items-center gap-4">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search investigations..."
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 pl-10 text-sm text-zinc-100 placeholder-zinc-500 focus:border-violet-500 focus:outline-none"
              />
              <svg
                className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>

            {/* Status filter */}
            <select
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value as TriageStatus | 'all');
                setPage(0);
              }}
              className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-300 focus:border-violet-500 focus:outline-none"
            >
              {statuses.map((status) => (
                <option key={status} value={status}>
                  {status === 'all' ? 'All Statuses' : status.charAt(0).toUpperCase() + status.slice(1)}
                </option>
              ))}
            </select>

            {/* Sort */}
            <select
              value={`${sortField}-${sortOrder}`}
              onChange={(e) => {
                const [field, order] = e.target.value.split('-');
                setSortField(field as SortField);
                setSortOrder(order as 'asc' | 'desc');
                setPage(0);
              }}
              className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-300 focus:border-violet-500 focus:outline-none"
            >
              <option value="triage_score-desc">Highest Score (Best Quality)</option>
              <option value="triage_score-asc">Lowest Score</option>
              <option value="created_at-desc">Newest First</option>
              <option value="created_at-asc">Oldest First</option>
              <option value="title-asc">Title A-Z</option>
              <option value="title-desc">Title Z-A</option>
            </select>
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="mx-auto max-w-7xl px-4 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-500 border-t-transparent" />
              <p className="mt-4 text-zinc-400">Loading investigations...</p>
            </div>
          </div>
        ) : filteredInvestigations.length > 0 ? (
          <>
            <div className="overflow-x-auto rounded-xl border border-zinc-700">
              <table className="w-full">
                <thead className="border-b border-zinc-700 bg-zinc-800/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-zinc-400">
                      Title
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-zinc-400">
                      Type
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-zinc-400">
                      Tier
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-zinc-400">
                      Score
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-zinc-400">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-zinc-400">
                      Created
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-700">
                  {filteredInvestigations.map((investigation) => {
                    const meta = SCHEMA_METADATA[investigation.type] || { name: investigation.type, icon: '❓', color: 'text-zinc-400' };
                    const scoreColor = getTriageScoreColor(investigation.triage_score);
                    const statusColor = getTriageStatusColor(investigation.triage_status);

                    return (
                      <tr
                        key={investigation.id}
                        onClick={() => handleInvestigationClick(investigation)}
                        className="cursor-pointer hover:bg-zinc-800/50"
                      >
                        <td className="px-4 py-3">
                          <div className="max-w-md truncate text-sm text-zinc-200">
                            {investigation.title}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`flex items-center gap-2 text-sm ${meta.color}`}>
                            <span>{meta.icon}</span>
                            <span className="hidden md:inline">{meta.name.split(' ')[0]}</span>
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {investigation.tier === 'research' ? (
                            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium bg-emerald-600/20 text-emerald-400 border border-emerald-500/30">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                              Research
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium bg-amber-600/20 text-amber-400 border border-amber-500/30">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                              Pattern Only
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-sm font-medium ${scoreColor}`}>
                            {investigation.triage_score != null ? `${investigation.triage_score}/10` : '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded-full border px-2 py-1 text-xs capitalize ${statusColor}`}
                            title={investigation.triage_status === 'verified'
                              ? 'This submission passed our 4-stage quality check for methodology, source integrity, and data completeness. This verifies the research process, not the phenomenon itself.'
                              : undefined}
                          >
                            {investigation.triage_status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-zinc-500">
                          {new Date(investigation.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="mt-6 flex items-center justify-between">
              <div className="text-sm text-zinc-500">
                Showing {page * limit + 1}-{Math.min((page + 1) * limit, total)} of {total}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-700 disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={(page + 1) * limit >= total}
                  className="rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-700 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="rounded-xl border border-zinc-700 bg-zinc-900/50 p-12 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-800">
              <svg className="h-6 w-6 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-zinc-300">No investigations found</h3>
            <p className="mt-1 text-sm text-zinc-500">
              Try adjusting your filters or search query
            </p>
            <a
              href="/submit"
              className="mt-4 inline-block rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500"
            >
              Submit New Investigation
            </a>
          </div>
        )}
      </main>
        </>
      )}
    </div>
  );
}
