'use client';

/**
 * Predictions Board Page
 * Display and manage testable predictions
 */

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { PredictionsList } from '@/components/predictions/PredictionsList';
import type { InvestigationType } from '@/types/database';

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

interface PredictionStats {
  total: number;
  open: number;
  testing: number;
  confirmed: number;
  refuted: number;
  inconclusive: number;
}

export default function PredictionsPage() {
  const router = useRouter();
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [stats, setStats] = useState<PredictionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  // Calculate accuracy rate
  const accuracyRate = stats && stats.confirmed + stats.refuted > 0
    ? (stats.confirmed / (stats.confirmed + stats.refuted)) * 100
    : null;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-500 border-t-transparent" />
          <p className="mt-4 text-zinc-400">Loading predictions...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <div className="max-w-md rounded-xl border border-red-500/30 bg-red-500/10 p-8 text-center">
          <h2 className="text-xl font-bold text-red-400">Error Loading Predictions</h2>
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
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/50">
        <div className="mx-auto max-w-7xl px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-zinc-100">Predictions Board</h1>
              <p className="mt-1 text-zinc-400">
                Testable predictions derived from cross-domain pattern analysis
              </p>
            </div>
            <a
              href="/patterns"
              className="rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-700"
            >
              View Patterns →
            </a>
          </div>
        </div>
      </header>

      {/* Stats Summary */}
      {stats && (
        <div className="border-b border-zinc-800 bg-zinc-900/30">
          <div className="mx-auto max-w-7xl px-4 py-6">
            <div className="grid grid-cols-2 gap-4 md:grid-cols-6">
              <div className="rounded-xl bg-zinc-800/50 p-4 text-center">
                <div className="text-3xl font-bold text-zinc-100">{stats.total}</div>
                <div className="text-sm text-zinc-500">Total</div>
              </div>
              <div className="rounded-xl bg-blue-500/10 p-4 text-center">
                <div className="text-3xl font-bold text-blue-400">{stats.open}</div>
                <div className="text-sm text-blue-400/60">Open</div>
              </div>
              <div className="rounded-xl bg-amber-500/10 p-4 text-center">
                <div className="text-3xl font-bold text-amber-400">{stats.testing}</div>
                <div className="text-sm text-amber-400/60">Testing</div>
              </div>
              <div className="rounded-xl bg-emerald-500/10 p-4 text-center">
                <div className="text-3xl font-bold text-emerald-400">{stats.confirmed}</div>
                <div className="text-sm text-emerald-400/60">Confirmed</div>
              </div>
              <div className="rounded-xl bg-red-500/10 p-4 text-center">
                <div className="text-3xl font-bold text-red-400">{stats.refuted}</div>
                <div className="text-sm text-red-400/60">Refuted</div>
              </div>
              <div className="rounded-xl bg-violet-500/10 p-4 text-center">
                <div className="text-3xl font-bold text-violet-400">
                  {accuracyRate !== null ? `${accuracyRate.toFixed(0)}%` : '-'}
                </div>
                <div className="text-sm text-violet-400/60">Accuracy</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="mx-auto max-w-7xl px-4 py-8">
        <PredictionsList
          predictions={predictions}
          onPredictionClick={handlePredictionClick}
        />
      </main>
    </div>
  );
}
