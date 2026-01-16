'use client';

/**
 * Community Hypotheses Page
 * Browse and explore speculative hypotheses from the community
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Navigation } from '@/components/layout/Navigation';
import { HypothesisCard } from '@/components/community/HypothesisCard';
import type { CommunityHypothesis } from '@/types/database';

export default function CommunityPage() {
  const [hypotheses, setHypotheses] = useState<CommunityHypothesis[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchHypotheses() {
      try {
        const response = await fetch('/api/community');
        if (!response.ok) {
          throw new Error('Failed to fetch hypotheses');
        }
        const data = await response.json();
        setHypotheses(data.data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    }

    fetchHypotheses();
  }, []);

  return (
    <div className="min-h-screen bg-dark-bg">
      <Navigation />

      <main className="pt-24 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-zinc-100 mb-2">
                Community Hypotheses
              </h1>
              <p className="text-zinc-400">
                Speculative ideas from the community. Help gather evidence to make these testable.
              </p>
            </div>
            <Link
              href="/community/new"
              className="inline-flex items-center justify-center px-5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white font-medium rounded-lg transition-all hover:shadow-lg hover:shadow-brand-600/25 hover:-translate-y-0.5"
            >
              <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Submit Hypothesis
            </Link>
          </div>
        </div>

        {/* Warning Banner */}
        <div className="mb-8 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <p className="text-amber-200 font-medium">Important Notice</p>
              <p className="text-amber-200/80 text-sm mt-1">
                These are unverified ideas, not confirmed patterns. They don&apos;t affect prediction scores.
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
          </div>
        ) : error ? (
          <div className="text-center py-16">
            <p className="text-red-400">{error}</p>
          </div>
        ) : hypotheses.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-dark-card flex items-center justify-center">
              <svg className="w-8 h-8 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-zinc-300 mb-2">No hypotheses yet</h3>
            <p className="text-zinc-500 mb-6">Be the first to share a speculative idea with the community.</p>
            <Link
              href="/community/new"
              className="inline-flex items-center px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white font-medium rounded-lg transition-colors"
            >
              Submit Hypothesis
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {hypotheses.map((hypothesis) => (
              <HypothesisCard key={hypothesis.id} hypothesis={hypothesis} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
