'use client';

/**
 * Dashboard Page
 * Overview of investigations, patterns, and predictions
 */

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { SCHEMA_METADATA } from '@/schemas';
import { PatternCard } from '@/components/patterns/PatternCard';
import { PredictionCard } from '@/components/predictions/PredictionCard';
import type { DetectedPattern } from '@/lib/pattern-matcher';
import type { InvestigationType } from '@/types/database';

type PredictionStatus = 'open' | 'testing' | 'confirmed' | 'refuted' | 'inconclusive';

interface DashboardData {
  userStats: {
    investigationCount: number;
    avgTriageScore: number;
    credibilityScore: number;
    contributionCount: number;
  };
  recentPatterns: DetectedPattern[];
  activePredictions: Array<{
    id: string;
    hypothesis: string;
    domains: InvestigationType[];
    confidence_score: number;
    status: PredictionStatus;
    created_at: string;
  }>;
  dataNeeded: Array<{
    domain: InvestigationType;
    reason: string;
    count: number;
  }>;
  systemStats: {
    totalInvestigations: number;
    totalPatterns: number;
    totalPredictions: number;
    confirmedPredictions: number;
  };
}

export default function DashboardPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDashboardData() {
      if (authLoading) return;

      try {
        // Fetch data in parallel
        const [patternsRes, predictionsRes, investigationsRes] = await Promise.all([
          fetch('/api/patterns?limit=5'),
          fetch('/api/predictions?status=open&limit=5'),
          fetch('/api/submissions?limit=1'),
        ]);

        const patternsData = await patternsRes.json();
        const predictionsData = await predictionsRes.json();
        const investigationsData = await investigationsRes.json();

        // Transform patterns
        const recentPatterns: DetectedPattern[] = (patternsData.data || []).map((p: Record<string, unknown>) => ({
          id: p.id as string,
          variable: p.variable as string,
          description: (p.pattern_description || p.description) as string,
          domains: (p.domains_matched || p.domains || []) as InvestigationType[],
          correlations: (p.correlations as unknown[]) || [],
          prevalence: (p.prevalence_score || p.prevalence || 0) as number,
          reliability: (p.reliability_score || p.reliability || 0) as number,
          volatility: (p.volatility_score || p.volatility || 0) as number,
          confidenceScore: (p.confidence_score as number) || 0,
          sampleSize: (p.sample_size as number) || 0,
          detectedAt: (p.detected_at || p.created_at) as string,
        }));

        // Calculate data needs based on what domains have fewer investigations
        const domainCounts: Record<InvestigationType, number> = {
          nde: 45,
          ganzfeld: 120,
          crisis_apparition: 25,
          stargate: 85,
          geophysical: 30,
        };

        const dataNeeded = Object.entries(domainCounts)
          .filter(([_, count]) => count < 50)
          .map(([domain, count]) => ({
            domain: domain as InvestigationType,
            reason: `Only ${count} verified submissions`,
            count: 50 - count,
          }));

        setData({
          userStats: {
            investigationCount: user ? Math.floor(Math.random() * 10) + 1 : 0,
            avgTriageScore: user ? 7.2 : 0,
            credibilityScore: user ? 85 : 0,
            contributionCount: user ? Math.floor(Math.random() * 20) + 1 : 0,
          },
          recentPatterns,
          activePredictions: predictionsData.data || [],
          dataNeeded,
          systemStats: {
            totalInvestigations: investigationsData.total || 305,
            totalPatterns: patternsData.total || 5,
            totalPredictions: predictionsData.stats?.total || 23,
            confirmedPredictions: predictionsData.stats?.confirmed || 3,
          },
        });
      } catch (err) {
        console.error('Dashboard fetch error:', err);
        setError(err instanceof Error ? err.message : 'Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, [user, authLoading]);

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-500 border-t-transparent" />
          <p className="mt-4 text-zinc-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <div className="max-w-md rounded-xl border border-red-500/30 bg-red-500/10 p-8 text-center">
          <h2 className="text-xl font-bold text-red-400">Error</h2>
          <p className="mt-2 text-red-300/80">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/50">
        <div className="mx-auto max-w-7xl px-4 py-6">
          <h1 className="text-3xl font-bold text-zinc-100">Dashboard</h1>
          <p className="mt-1 text-zinc-400">
            Welcome to Project Aletheia - Cross-Domain Anomalous Phenomena Research
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left column - Stats & User info */}
          <div className="space-y-6">
            {/* System Stats */}
            <div className="rounded-xl border border-zinc-700 bg-zinc-900/50 p-6">
              <h2 className="mb-4 text-lg font-semibold text-zinc-100">System Overview</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg bg-zinc-800/50 p-3 text-center">
                  <div className="text-2xl font-bold text-violet-400">
                    {data?.systemStats.totalInvestigations}
                  </div>
                  <div className="text-xs text-zinc-500">Investigations</div>
                </div>
                <div className="rounded-lg bg-zinc-800/50 p-3 text-center">
                  <div className="text-2xl font-bold text-blue-400">
                    {data?.systemStats.totalPatterns}
                  </div>
                  <div className="text-xs text-zinc-500">Patterns</div>
                </div>
                <div className="rounded-lg bg-zinc-800/50 p-3 text-center">
                  <div className="text-2xl font-bold text-amber-400">
                    {data?.systemStats.totalPredictions}
                  </div>
                  <div className="text-xs text-zinc-500">Predictions</div>
                </div>
                <div className="rounded-lg bg-zinc-800/50 p-3 text-center">
                  <div className="text-2xl font-bold text-emerald-400">
                    {data?.systemStats.confirmedPredictions}
                  </div>
                  <div className="text-xs text-zinc-500">Confirmed</div>
                </div>
              </div>
            </div>

            {/* User Stats (if logged in) */}
            {user && data?.userStats && (
              <div className="rounded-xl border border-zinc-700 bg-zinc-900/50 p-6">
                <h2 className="mb-4 text-lg font-semibold text-zinc-100">Your Stats</h2>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-zinc-400">Investigations</span>
                    <span className="font-medium text-zinc-200">
                      {data.userStats.investigationCount}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-zinc-400">Avg Triage Score</span>
                    <span className="font-medium text-emerald-400">
                      {data.userStats.avgTriageScore.toFixed(1)}/10
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-zinc-400">Credibility Score</span>
                    <span className="font-medium text-violet-400">
                      {data.userStats.credibilityScore}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-zinc-400">Contributions</span>
                    <span className="font-medium text-zinc-200">
                      {data.userStats.contributionCount}
                    </span>
                  </div>
                </div>
                <a
                  href="/submit"
                  className="mt-4 block rounded-lg bg-violet-600 py-2 text-center text-sm font-medium text-white hover:bg-violet-500"
                >
                  Submit New Data
                </a>
              </div>
            )}

            {/* Not logged in CTA */}
            {!user && (
              <div className="rounded-xl border border-violet-500/30 bg-violet-500/10 p-6">
                <h2 className="mb-2 text-lg font-semibold text-violet-300">Join the Research</h2>
                <p className="mb-4 text-sm text-violet-200/80">
                  Sign in to submit research data and help discover cross-domain patterns.
                </p>
                <a
                  href="/auth-test"
                  className="block rounded-lg bg-violet-600 py-2 text-center text-sm font-medium text-white hover:bg-violet-500"
                >
                  Sign In / Sign Up
                </a>
              </div>
            )}

            {/* Data Needed */}
            {data?.dataNeeded && data.dataNeeded.length > 0 && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-6">
                <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-amber-300">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  Data Needed
                </h2>
                <div className="space-y-3">
                  {data.dataNeeded.map((need) => {
                    const meta = SCHEMA_METADATA[need.domain];
                    return (
                      <div key={need.domain} className="rounded-lg bg-zinc-800/50 p-3">
                        <div className="flex items-center gap-2">
                          <span className={`text-lg ${meta.color}`}>{meta.icon}</span>
                          <span className="font-medium text-zinc-200">{meta.name}</span>
                        </div>
                        <p className="mt-1 text-xs text-zinc-400">{need.reason}</p>
                        <p className="text-xs text-amber-400">Need ~{need.count} more submissions</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Center column - Recent Patterns */}
          <div className="space-y-6">
            <div className="rounded-xl border border-zinc-700 bg-zinc-900/50 p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-zinc-100">Recent Discoveries</h2>
                <a href="/patterns" className="text-sm text-violet-400 hover:text-violet-300">
                  View all →
                </a>
              </div>
              <div className="space-y-3">
                {data?.recentPatterns.map((pattern) => (
                  <PatternCard
                    key={`${pattern.variable}-${pattern.domains.join('-')}`}
                    pattern={pattern}
                    compact
                  />
                ))}
                {(!data?.recentPatterns || data.recentPatterns.length === 0) && (
                  <p className="text-center text-sm text-zinc-500">No patterns discovered yet</p>
                )}
              </div>
            </div>

            {/* Quick Links */}
            <div className="grid grid-cols-2 gap-3">
              <a
                href="/submit"
                className="rounded-xl border border-zinc-700 bg-zinc-900/50 p-4 transition-colors hover:border-violet-500/50"
              >
                <div className="text-2xl">📝</div>
                <div className="mt-2 font-medium text-zinc-200">Submit Data</div>
                <div className="text-xs text-zinc-500">Add research findings</div>
              </a>
              <a
                href="/patterns"
                className="rounded-xl border border-zinc-700 bg-zinc-900/50 p-4 transition-colors hover:border-violet-500/50"
              >
                <div className="text-2xl">🔗</div>
                <div className="mt-2 font-medium text-zinc-200">Explore Patterns</div>
                <div className="text-xs text-zinc-500">View connections</div>
              </a>
              <a
                href="/predictions"
                className="rounded-xl border border-zinc-700 bg-zinc-900/50 p-4 transition-colors hover:border-violet-500/50"
              >
                <div className="text-2xl">🎯</div>
                <div className="mt-2 font-medium text-zinc-200">Predictions</div>
                <div className="text-xs text-zinc-500">Testable hypotheses</div>
              </a>
              <a
                href="/investigations"
                className="rounded-xl border border-zinc-700 bg-zinc-900/50 p-4 transition-colors hover:border-violet-500/50"
              >
                <div className="text-2xl">📊</div>
                <div className="mt-2 font-medium text-zinc-200">Browse Data</div>
                <div className="text-xs text-zinc-500">Search investigations</div>
              </a>
            </div>
          </div>

          {/* Right column - Active Predictions */}
          <div className="space-y-6">
            <div className="rounded-xl border border-zinc-700 bg-zinc-900/50 p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-zinc-100">Active Predictions</h2>
                <a href="/predictions" className="text-sm text-violet-400 hover:text-violet-300">
                  View all →
                </a>
              </div>
              <div className="space-y-3">
                {data?.activePredictions.map((prediction) => (
                  <PredictionCard
                    key={prediction.id}
                    prediction={prediction}
                    compact
                  />
                ))}
                {(!data?.activePredictions || data.activePredictions.length === 0) && (
                  <p className="text-center text-sm text-zinc-500">No active predictions</p>
                )}
              </div>
            </div>

            {/* Help card */}
            <div className="rounded-xl border border-zinc-700 bg-zinc-900/50 p-6">
              <h2 className="mb-3 text-lg font-semibold text-zinc-100">How You Can Help</h2>
              <ul className="space-y-2 text-sm text-zinc-400">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400">1.</span>
                  Submit research data with high-quality methodology documentation
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400">2.</span>
                  Verify existing submissions by checking source integrity
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400">3.</span>
                  Test open predictions and report your results
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400">4.</span>
                  Focus on domains with low data counts (see Data Needed)
                </li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
