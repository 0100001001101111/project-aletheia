'use client';

/**
 * Predictions Board Page
 * Display and manage testable predictions
 */

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PredictionsList } from '@/components/predictions/PredictionsList';
import { PageWrapper } from '@/components/layout/PageWrapper';
import type { InvestigationType } from '@/types/database';

type PredictionStatus = 'open' | 'pending' | 'testing' | 'confirmed' | 'refuted' | 'inconclusive';

interface Prediction {
  id: string;
  hypothesis: string;
  explainer?: string | null;
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

interface PredictionStats {
  total: number;
  open: number;
  testing: number;
  confirmed: number;
  refuted: number;
  inconclusive: number;
}

function StatBadge({
  value,
  label,
  color,
}: {
  value: number | string;
  label: string;
  color: 'gray' | 'blue' | 'amber' | 'green' | 'red' | 'purple';
}) {
  const colorClasses = {
    gray: 'bg-zinc-800/50 text-zinc-100 border-zinc-700',
    blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    green: 'bg-green-500/10 text-green-400 border-green-500/20',
    red: 'bg-red-500/10 text-red-400 border-red-500/20',
    purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  };

  return (
    <div className={`p-4 rounded-xl border ${colorClasses[color]} text-center transition-all hover:-translate-y-0.5`}>
      <div className="text-3xl font-bold">{value}</div>
      <div className={`text-sm mt-1 ${color === 'gray' ? 'text-zinc-500' : ''}`}>{label}</div>
    </div>
  );
}

export default function PredictionsPage() {
  const router = useRouter();
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [stats, setStats] = useState<PredictionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    async function fetchPredictions() {
      try {
        const response = await fetch('/api/predictions?limit=100');
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch predictions');
        }

        setPredictions(data.data || []);
        setStats(data.stats || null);
      } catch (err) {
        console.error('Fetch error:', err);
        setError(err instanceof Error ? err.message : 'Failed to load predictions');
      } finally {
        setLoading(false);
      }
    }

    fetchPredictions();
  }, []);

  const handlePredictionClick = useCallback((prediction: Prediction) => {
    router.push(`/predictions/${prediction.id}`);
  }, [router]);

  const accuracyRate = stats && stats.confirmed + stats.refuted > 0
    ? (stats.confirmed / (stats.confirmed + stats.refuted)) * 100
    : null;

  // Filter predictions by search query
  const filteredPredictions = useMemo(() => {
    if (!searchQuery.trim()) return predictions;
    const query = searchQuery.toLowerCase();
    return predictions.filter((p) =>
      p.hypothesis.toLowerCase().includes(query) ||
      p.domains_involved?.some((d) => d.toLowerCase().includes(query)) ||
      p.domains?.some((d) => d.toLowerCase().includes(query)) ||
      p.status.toLowerCase().includes(query)
    );
  }, [predictions, searchQuery]);

  if (loading) {
    return (
      <PageWrapper>
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="text-center">
            <div className="h-10 w-10 mx-auto animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
            <p className="mt-4 text-zinc-400">Loading predictions...</p>
          </div>
        </div>
      </PageWrapper>
    );
  }

  if (error) {
    return (
      <PageWrapper>
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="max-w-md rounded-xl border border-red-500/30 bg-red-500/10 p-8 text-center">
            <div className="w-12 h-12 mx-auto rounded-full bg-red-500/20 flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-red-400">Error Loading Predictions</h2>
            <p className="mt-2 text-red-300/80">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 rounded-lg bg-red-600/20 px-4 py-2 text-red-400 hover:bg-red-600/30 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Predictions Board"
      description="Testable predictions derived from cross-domain pattern analysis"
      headerAction={
        <Link
          href="/patterns"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-dark-border bg-dark-card text-sm font-medium text-zinc-300 hover:bg-dark-hover hover:border-brand-500/30 transition-all"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
          View Patterns
        </Link>
      }
    >
      {/* Intro */}
      <div className="mb-8 rounded-xl border border-violet-500/20 bg-violet-500/5 p-6">
        <h2 className="text-lg font-semibold text-violet-300 mb-2">What are Predictions?</h2>
        <p className="text-sm text-zinc-400 leading-relaxed">
          Predictions are testable hypotheses generated when our pattern matcher detects correlations across multiple research domains.
          Each prediction connects findings from NDEs, Ganzfeld experiments, crisis apparitions, remote viewing, and geophysical phenomena
          to propose specific, falsifiable claims. When a pattern achieves high confidence (&gt;85%), the system generates predictions
          that researchers can test. Results are tracked here—confirmed predictions strengthen the underlying pattern, while refuted
          predictions help refine our models.
        </p>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search predictions by hypothesis, domain, or status..."
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 pl-10 text-sm text-zinc-100 placeholder-zinc-500 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
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
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        {searchQuery && (
          <p className="mt-2 text-sm text-zinc-500">
            Found {filteredPredictions.length} prediction{filteredPredictions.length !== 1 ? 's' : ''} matching &quot;{searchQuery}&quot;
          </p>
        )}
      </div>

      {/* Stats Summary */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-8 animate-fade-in">
          <StatBadge value={stats.total} label="Total" color="gray" />
          <StatBadge value={stats.open} label="Open" color="blue" />
          <StatBadge value={stats.testing} label="Testing" color="amber" />
          <StatBadge value={stats.confirmed} label="Confirmed" color="green" />
          <StatBadge value={stats.refuted} label="Refuted" color="red" />
          <StatBadge
            value={accuracyRate !== null ? `${accuracyRate.toFixed(0)}%` : '-'}
            label="Accuracy"
            color="purple"
          />
        </div>
      )}

      {/* Predictions List */}
      {filteredPredictions.length > 0 ? (
        <div className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <PredictionsList
            predictions={filteredPredictions}
            onPredictionClick={handlePredictionClick}
          />
        </div>
      ) : (
        <div className="rounded-xl border border-zinc-700 bg-zinc-900/50 p-12 text-center animate-fade-in">
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
          <h3 className="text-lg font-medium text-zinc-300">No predictions found</h3>
          <p className="mt-1 text-sm text-zinc-500">
            {searchQuery ? 'Try adjusting your search query' : 'No predictions have been created yet'}
          </p>
        </div>
      )}
    </PageWrapper>
  );
}
