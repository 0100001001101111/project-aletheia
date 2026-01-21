'use client';

/**
 * Dashboard Page
 * Overview of investigations, patterns, and predictions
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { SCHEMA_METADATA } from '@/schemas';
import { PatternCard } from '@/components/patterns/PatternCard';
import { PredictionCard } from '@/components/predictions/PredictionCard';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { InfoTooltip, JARGON_TOOLTIPS } from '@/components/ui/Tooltip';
import { SpaceWeatherCard } from '@/components/space-weather/SpaceWeatherCard';
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

function StatCard({
  value,
  label,
  sublabel,
  color = 'brand',
}: {
  value: string | number;
  label: string;
  sublabel?: string;
  color?: 'brand' | 'purple' | 'green' | 'cyan' | 'amber';
}) {
  const colorClasses = {
    brand: 'from-brand-900/20 to-transparent border-brand-500/20 text-brand-400',
    purple: 'from-purple-900/20 to-transparent border-purple-500/20 text-purple-400',
    green: 'from-green-900/20 to-transparent border-green-500/20 text-green-400',
    cyan: 'from-cyan-900/20 to-transparent border-cyan-500/20 text-cyan-400',
    amber: 'from-amber-900/20 to-transparent border-amber-500/20 text-amber-400',
  };

  return (
    <div className={`p-5 rounded-xl bg-gradient-to-br ${colorClasses[color]} border text-center transition-all hover:-translate-y-0.5`}>
      <div className={`text-4xl font-bold ${colorClasses[color].split(' ').pop()}`}>{value}</div>
      <div className="text-zinc-400 font-medium mt-1">{label}</div>
      {sublabel && <div className="text-xs text-zinc-500 mt-0.5">{sublabel}</div>}
    </div>
  );
}

function QuickLinkCard({
  href,
  icon,
  title,
  description,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group p-5 rounded-xl bg-dark-card border border-dark-border hover:border-brand-500/30 transition-all hover:-translate-y-1"
    >
      <div className="w-12 h-12 rounded-xl bg-brand-500/10 flex items-center justify-center mb-3 group-hover:bg-brand-500/20 transition-colors">
        {icon}
      </div>
      <div className="font-semibold text-zinc-200 group-hover:text-white transition-colors">{title}</div>
      <div className="text-sm text-zinc-500 mt-1">{description}</div>
    </Link>
  );
}

export default function DashboardPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDashboardData() {
      // Don't block on auth - load data regardless

      try {
        // Fetch APIs independently so one failure doesn't block others
        const [patternsRes, predictionsRes, investigationsRes] = await Promise.all([
          fetch('/api/patterns?limit=5').catch(() => null),
          fetch('/api/predictions?status=open&limit=5').catch(() => null),
          fetch('/api/submissions?limit=1').catch(() => null),
        ]);

        const patternsData = patternsRes ? await patternsRes.json().catch(() => ({})) : {};
        const predictionsData = predictionsRes ? await predictionsRes.json().catch(() => ({})) : {};
        const investigationsData = investigationsRes ? await investigationsRes.json().catch(() => ({})) : {};

        const recentPatterns: DetectedPattern[] = (patternsData.data || []).map((p: Record<string, unknown>) => ({
          id: p.id as string,
          variable: p.variable as string,
          description: (p.pattern_description || p.description) as string,
          domains: (Array.isArray(p.domains_matched) ? p.domains_matched : Array.isArray(p.domains) ? p.domains : []).filter((d): d is InvestigationType => typeof d === 'string' && d.length > 0),
          correlations: (p.correlations as unknown[]) || [],
          prevalence: (p.prevalence_score || p.prevalence || 0) as number,
          reliability: (p.reliability_score || p.reliability || 0) as number,
          volatility: (p.volatility_score || p.volatility || 0) as number,
          confidenceScore: (p.confidence_score as number) || 0,
          sampleSize: (p.sample_size as number) || 0,
          detectedAt: (p.detected_at || p.created_at) as string,
        }));

        const domainCounts: Partial<Record<InvestigationType, number>> = {
          nde: 45,
          ganzfeld: 120,
          crisis_apparition: 25,
          stargate: 85,
          geophysical: 30,
          ufo: 15,
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
            totalInvestigations: investigationsData.total || 0,
            totalPatterns: patternsData.total || 0,
            totalPredictions: predictionsData.stats?.total || 0,
            confirmedPredictions: predictionsData.stats?.confirmed || 0,
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
  }, [user]);

  if (loading) {
    return (
      <PageWrapper>
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="text-center">
            <div className="h-10 w-10 mx-auto animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
            <p className="mt-4 text-zinc-400">Loading dashboard...</p>
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
            <h2 className="text-xl font-bold text-red-400">Error</h2>
            <p className="mt-2 text-red-300/80">{error}</p>
          </div>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Dashboard"
      description="Welcome to Project Aletheia - Cross-Domain Anomalous Phenomena Research"
    >
      {/* Stats Overview */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 animate-fade-in">
        <StatCard
          value={data?.systemStats.totalInvestigations || 0}
          label="Investigations"
          sublabel="Across all domains"
          color="brand"
        />
        <StatCard
          value={data?.systemStats.totalPatterns || 0}
          label="Patterns Found"
          sublabel="Cross-domain correlations"
          color="purple"
        />
        <StatCard
          value={`${data?.systemStats.confirmedPredictions || 0}/${data?.systemStats.totalPredictions || 0}`}
          label="Predictions"
          sublabel="Confirmed / Total"
          color="green"
        />
        <StatCard
          value="6"
          label="Domains"
          sublabel="Connected schemas"
          color="cyan"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column */}
        <div className="space-y-6">
          {/* User Stats (if logged in) */}
          {user && data?.userStats && (
            <div className="rounded-xl border border-dark-border bg-dark-card p-6 animate-fade-in" style={{ animationDelay: '0.1s' }}>
              <h2 className="mb-4 text-lg font-semibold text-zinc-100 flex items-center gap-2">
                <svg className="w-5 h-5 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Your Stats
              </h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-2 rounded-lg hover:bg-dark-hover transition-colors">
                  <span className="text-sm text-zinc-400">Investigations</span>
                  <span className="font-medium text-zinc-200">{data.userStats.investigationCount}</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg hover:bg-dark-hover transition-colors">
                  <span className="text-sm text-zinc-400">
                    Avg Triage Score
                    <InfoTooltip text={JARGON_TOOLTIPS.triage_score} />
                  </span>
                  <span className="font-medium text-green-400">{data.userStats.avgTriageScore.toFixed(1)}/10</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg hover:bg-dark-hover transition-colors">
                  <span className="text-sm text-zinc-400">Credibility Score</span>
                  <span className="font-medium text-brand-400">{data.userStats.credibilityScore}</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg hover:bg-dark-hover transition-colors">
                  <span className="text-sm text-zinc-400">Contributions</span>
                  <span className="font-medium text-zinc-200">{data.userStats.contributionCount}</span>
                </div>
              </div>
              <Link
                href="/submit"
                className="mt-4 block rounded-lg bg-gradient-to-r from-brand-600 to-brand-500 py-3 text-center text-sm font-medium text-white hover:from-brand-500 hover:to-brand-400 transition-all hover:shadow-lg hover:shadow-brand-600/25"
              >
                Submit New Data
              </Link>
            </div>
          )}

          {/* Not logged in CTA */}
          {!user && (
            <div className="rounded-xl border border-brand-500/30 bg-gradient-to-br from-brand-900/20 to-transparent p-6 animate-fade-in" style={{ animationDelay: '0.1s' }}>
              <h2 className="mb-2 text-lg font-semibold text-brand-300">Join the Research</h2>
              <p className="mb-4 text-sm text-brand-200/80">
                Sign in to submit research data and help discover cross-domain patterns.
              </p>
              <Link
                href="/auth-test"
                className="block rounded-lg bg-brand-600 py-3 text-center text-sm font-medium text-white hover:bg-brand-500 transition-all"
              >
                Sign In / Sign Up
              </Link>
            </div>
          )}

          {/* Space Weather */}
          <div className="animate-fade-in" style={{ animationDelay: '0.15s' }}>
            <SpaceWeatherCard compact />
          </div>

          {/* Data Needed */}
          {data?.dataNeeded && data.dataNeeded.length > 0 && (
            <div className="rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-900/10 to-transparent p-6 animate-fade-in" style={{ animationDelay: '0.2s' }}>
              <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-amber-300">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Data Needed
              </h2>
              <div className="space-y-3">
                {data.dataNeeded.map((need) => {
                  const meta = SCHEMA_METADATA[need.domain as keyof typeof SCHEMA_METADATA];
                  return (
                    <div key={need.domain} className="rounded-lg bg-dark-card border border-dark-border p-3 hover:border-amber-500/30 transition-colors">
                      <div className="flex items-center gap-2">
                        <span className={`text-lg ${meta?.color || 'text-zinc-400'}`}>{meta?.icon || '❓'}</span>
                        <span className="font-medium text-zinc-200">{meta?.name || need.domain}</span>
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

        {/* Center column */}
        <div className="space-y-6">
          <div className="rounded-xl border border-dark-border bg-dark-card p-6 animate-fade-in" style={{ animationDelay: '0.15s' }}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-zinc-100">Recent Discoveries</h2>
              <Link href="/patterns" className="text-sm text-brand-400 hover:text-brand-300 transition-colors">
                View all →
              </Link>
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
                <p className="text-center py-8 text-sm text-zinc-500">No patterns discovered yet</p>
              )}
            </div>
          </div>

          {/* Quick Links */}
          <div className="grid grid-cols-2 gap-3 animate-fade-in" style={{ animationDelay: '0.25s' }}>
            <QuickLinkCard
              href="/submit"
              icon={
                <svg className="w-6 h-6 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              }
              title="Submit Data"
              description="Add research findings"
            />
            <QuickLinkCard
              href="/patterns"
              icon={
                <svg className="w-6 h-6 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              }
              title="Explore Patterns"
              description="View connections"
            />
            <QuickLinkCard
              href="/predictions"
              icon={
                <svg className="w-6 h-6 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
              title="Predictions"
              description="Testable hypotheses"
            />
            <QuickLinkCard
              href="/investigations"
              icon={
                <svg className="w-6 h-6 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              }
              title="Browse Data"
              description="Search investigations"
            />
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          <div className="rounded-xl border border-dark-border bg-dark-card p-6 animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-zinc-100">Active Predictions</h2>
              <Link href="/predictions" className="text-sm text-brand-400 hover:text-brand-300 transition-colors">
                View all →
              </Link>
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
                <p className="text-center py-8 text-sm text-zinc-500">No active predictions</p>
              )}
            </div>
          </div>

          {/* Help card */}
          <div className="rounded-xl border border-dark-border bg-dark-card p-6 animate-fade-in" style={{ animationDelay: '0.3s' }}>
            <h2 className="mb-4 text-lg font-semibold text-zinc-100 flex items-center gap-2">
              <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              How You Can Help
            </h2>
            <ul className="space-y-3 text-sm text-zinc-400">
              <li className="flex items-start gap-3 p-2 rounded-lg hover:bg-dark-hover transition-colors">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center text-xs font-bold">1</span>
                <span>Submit research data with high-quality methodology documentation</span>
              </li>
              <li className="flex items-start gap-3 p-2 rounded-lg hover:bg-dark-hover transition-colors">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center text-xs font-bold">2</span>
                <span>Verify existing submissions by checking source integrity</span>
              </li>
              <li className="flex items-start gap-3 p-2 rounded-lg hover:bg-dark-hover transition-colors">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center text-xs font-bold">3</span>
                <span>Test open predictions and report your results</span>
              </li>
              <li className="flex items-start gap-3 p-2 rounded-lg hover:bg-dark-hover transition-colors">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center text-xs font-bold">4</span>
                <span>Focus on domains with low data counts (see Data Needed)</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
// deploy 1768602438
