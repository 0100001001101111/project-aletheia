'use client';

/**
 * PredictionsList
 * Filterable, sortable list of predictions
 */

import { useState, useMemo } from 'react';
import type { InvestigationType } from '@/types/database';
import { SCHEMA_METADATA } from '@/schemas';
import { PredictionCard } from './PredictionCard';

type PredictionStatus = 'open' | 'pending' | 'testing' | 'confirmed' | 'refuted' | 'inconclusive';

interface Prediction {
  id: string;
  hypothesis: string;
  domains_involved?: InvestigationType[];
  domains?: InvestigationType[];
  confidence_score: number;
  status: PredictionStatus;
  testing_protocol?: string;
  p_value?: number | null;
  brier_score?: number | null;
  created_at: string;
  resolved_at?: string;
  pattern?: {
    id: string;
    variable?: string;
    pattern_description?: string;
    description?: string;
    confidence_score: number;
  } | null;
}

interface PredictionsListProps {
  predictions: Prediction[];
  onPredictionClick?: (prediction: Prediction) => void;
}

type SortField = 'confidence' | 'status' | 'date' | 'p_value';

export function PredictionsList({ predictions, onPredictionClick }: PredictionsListProps) {
  const [filterStatus, setFilterStatus] = useState<PredictionStatus | 'all'>('all');
  const [filterDomain, setFilterDomain] = useState<InvestigationType | 'all'>('all');
  const [sortField, setSortField] = useState<SortField>('confidence');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  const filteredPredictions = useMemo(() => {
    let result = [...predictions];

    // Filter by status
    if (filterStatus !== 'all') {
      result = result.filter((p) => p.status === filterStatus);
    }

    // Filter by domain
    if (filterDomain !== 'all') {
      result = result.filter((p) => (p.domains_involved || p.domains || []).includes(filterDomain));
    }

    // Filter by search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.hypothesis.toLowerCase().includes(query) ||
          p.pattern?.variable?.toLowerCase().includes(query)
      );
    }

    // Sort
    result.sort((a, b) => {
      let aVal: number;
      let bVal: number;

      switch (sortField) {
        case 'confidence':
          aVal = a.confidence_score;
          bVal = b.confidence_score;
          break;
        case 'status':
          const statusOrder: Record<string, number> = { confirmed: 6, testing: 5, open: 4, pending: 3, inconclusive: 2, refuted: 1 };
          aVal = statusOrder[a.status] ?? 0;
          bVal = statusOrder[b.status] ?? 0;
          break;
        case 'date':
          aVal = new Date(a.created_at).getTime();
          bVal = new Date(b.created_at).getTime();
          break;
        case 'p_value':
          aVal = a.p_value ?? 1;
          bVal = b.p_value ?? 1;
          break;
        default:
          aVal = 0;
          bVal = 0;
      }

      return sortOrder === 'desc' ? bVal - aVal : aVal - bVal;
    });

    return result;
  }, [predictions, filterStatus, filterDomain, sortField, sortOrder, searchQuery]);

  const statusCounts = useMemo(() => {
    const counts: Record<PredictionStatus | 'all', number> = {
      all: predictions.length,
      open: 0,
      pending: 0,
      testing: 0,
      confirmed: 0,
      refuted: 0,
      inconclusive: 0,
    };
    predictions.forEach((p) => {
      if (counts[p.status] !== undefined) {
        counts[p.status]++;
      }
    });
    return counts;
  }, [predictions]);

  const statuses: PredictionStatus[] = ['open', 'pending', 'testing', 'confirmed', 'refuted', 'inconclusive'];
  const domains: (InvestigationType | 'all')[] = [
    'all',
    'nde',
    'ganzfeld',
    'crisis_apparition',
    'stargate',
    'geophysical',
  ];

  return (
    <div className="space-y-6">
      {/* Status tabs */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilterStatus('all')}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            filterStatus === 'all'
              ? 'bg-violet-600 text-white'
              : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
          }`}
        >
          All ({statusCounts.all})
        </button>
        {statuses.map((status) => {
          const isActive = filterStatus === status;
          const colors: Record<PredictionStatus, string> = {
            open: isActive ? 'bg-blue-600 text-white' : 'bg-blue-500/10 text-blue-400 hover:bg-blue-500/20',
            pending: isActive ? 'bg-zinc-600 text-white' : 'bg-zinc-500/10 text-zinc-400 hover:bg-zinc-500/20',
            testing: isActive ? 'bg-amber-600 text-white' : 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20',
            confirmed: isActive ? 'bg-emerald-600 text-white' : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20',
            refuted: isActive ? 'bg-red-600 text-white' : 'bg-red-500/10 text-red-400 hover:bg-red-500/20',
            inconclusive: isActive ? 'bg-zinc-600 text-white' : 'bg-zinc-500/10 text-zinc-400 hover:bg-zinc-500/20',
          };

          return (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`rounded-lg px-4 py-2 text-sm font-medium capitalize transition-colors ${colors[status]}`}
            >
              {status} ({statusCounts[status]})
            </button>
          );
        })}
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap items-center gap-4">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search predictions..."
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

        {/* Domain filter */}
        <select
          value={filterDomain}
          onChange={(e) => setFilterDomain(e.target.value as InvestigationType | 'all')}
          className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-300 focus:border-violet-500 focus:outline-none"
        >
          {domains.map((domain) => (
            <option key={domain} value={domain}>
              {domain === 'all' ? 'All Domains' : SCHEMA_METADATA[domain].name}
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
          }}
          className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-300 focus:border-violet-500 focus:outline-none"
        >
          <option value="confidence-desc">Confidence (High to Low)</option>
          <option value="confidence-asc">Confidence (Low to High)</option>
          <option value="status-desc">Status (Active First)</option>
          <option value="date-desc">Newest First</option>
          <option value="date-asc">Oldest First</option>
          <option value="p_value-asc">P-Value (Low to High)</option>
        </select>

        {/* View mode toggle */}
        <div className="flex rounded-lg border border-zinc-700 bg-zinc-800">
          <button
            onClick={() => setViewMode('cards')}
            className={`px-3 py-2 text-sm ${
              viewMode === 'cards' ? 'bg-violet-600 text-white' : 'text-zinc-400 hover:text-zinc-200'
            } rounded-l-lg`}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`px-3 py-2 text-sm ${
              viewMode === 'table' ? 'bg-violet-600 text-white' : 'text-zinc-400 hover:text-zinc-200'
            } rounded-r-lg`}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Results count */}
      <div className="text-sm text-zinc-500">
        {filteredPredictions.length} prediction{filteredPredictions.length !== 1 ? 's' : ''} found
      </div>

      {/* Content */}
      {filteredPredictions.length > 0 ? (
        viewMode === 'cards' ? (
          <div className="grid gap-4 md:grid-cols-2">
            {filteredPredictions.map((prediction) => (
              <PredictionCard
                key={prediction.id}
                prediction={prediction}
                onClick={onPredictionClick ? () => onPredictionClick(prediction) : undefined}
              />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-zinc-700">
            <table className="w-full">
              <thead className="border-b border-zinc-700 bg-zinc-800/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-zinc-400">
                    Hypothesis
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-zinc-400">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-zinc-400">
                    Confidence
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-zinc-400">
                    Domains
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-zinc-400">
                    P-Value
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-zinc-400">
                    Created
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-700">
                {filteredPredictions.map((prediction) => {
                  const statusColors: Record<PredictionStatus, string> = {
                    open: 'text-blue-400 bg-blue-500/10',
                    pending: 'text-zinc-400 bg-zinc-500/10',
                    testing: 'text-amber-400 bg-amber-500/10',
                    confirmed: 'text-emerald-400 bg-emerald-500/10',
                    refuted: 'text-red-400 bg-red-500/10',
                    inconclusive: 'text-zinc-400 bg-zinc-500/10',
                  };

                  return (
                    <tr
                      key={prediction.id}
                      onClick={() => onPredictionClick?.(prediction)}
                      className="cursor-pointer hover:bg-zinc-800/50"
                    >
                      <td className="px-4 py-3">
                        <div className="max-w-md truncate text-sm text-zinc-200">
                          {prediction.hypothesis}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2 py-1 text-xs capitalize ${statusColors[prediction.status]}`}
                        >
                          {prediction.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-violet-400">
                        {(prediction.confidence_score * 100).toFixed(1)}%
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          {(prediction.domains_involved || prediction.domains || []).slice(0, 3).map((domain) => (
                            <span key={domain} title={SCHEMA_METADATA[domain]?.name || domain}>
                              {SCHEMA_METADATA[domain]?.icon || '?'}
                            </span>
                          ))}
                          {(prediction.domains_involved || prediction.domains || []).length > 3 && (
                            <span className="text-xs text-zinc-500">
                              +{(prediction.domains_involved || prediction.domains || []).length - 3}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-zinc-400">
                        {prediction.p_value != null ? prediction.p_value.toFixed(4) : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-zinc-500">
                        {new Date(prediction.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      ) : (
        <div className="rounded-xl border border-zinc-700 bg-zinc-900/50 p-12 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-800">
            <svg className="h-6 w-6 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-zinc-300">No predictions found</h3>
          <p className="mt-1 text-sm text-zinc-500">
            Try adjusting your filters or search query
          </p>
        </div>
      )}
    </div>
  );
}
