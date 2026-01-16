'use client';

/**
 * Patterns Visualization Page
 * Network graph and list view of cross-domain patterns
 */

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { PatternGraph } from '@/components/patterns/PatternGraph';
import { PatternList } from '@/components/patterns/PatternList';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { SCHEMA_METADATA } from '@/schemas';
import type { DetectedPattern } from '@/lib/pattern-matcher';
import type { InvestigationType } from '@/types/database';

type ViewMode = 'graph' | 'list';

export default function PatternsPage() {
  const router = useRouter();
  const [patterns, setPatterns] = useState<DetectedPattern[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedDomain, setSelectedDomain] = useState<InvestigationType | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    async function fetchPatterns() {
      try {
        const response = await fetch('/api/patterns?limit=100');
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch patterns');
        }

        // Transform API response to DetectedPattern format
        const transformedPatterns: DetectedPattern[] = (data.data || []).map((p: Record<string, unknown>) => ({
          id: p.id,
          variable: p.variable,
          description: p.pattern_description || p.description,
          domains: p.domains_matched || p.domains || [],
          correlations: p.correlations || [],
          prevalence: p.prevalence_score || p.prevalence || 0,
          reliability: p.reliability_score || p.reliability || 0,
          volatility: p.volatility_score || p.volatility || 0,
          confidenceScore: p.confidence_score || 0,
          sampleSize: p.sample_size || 0,
          detectedAt: p.detected_at || p.created_at,
        }));

        setPatterns(transformedPatterns);
      } catch (err) {
        console.error('Fetch error:', err);
        setError(err instanceof Error ? err.message : 'Failed to load patterns');
      } finally {
        setLoading(false);
      }
    }

    fetchPatterns();
  }, []);

  const handleScanPatterns = useCallback(async () => {
    setIsScanning(true);
    try {
      const response = await fetch('/api/patterns/scan', {
        method: 'POST',
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to run pattern scan');
      }

      // Refresh patterns
      const refreshResponse = await fetch('/api/patterns?limit=100');
      const refreshData = await refreshResponse.json();

      if (refreshResponse.ok && refreshData.data) {
        const transformedPatterns: DetectedPattern[] = refreshData.data.map((p: Record<string, unknown>) => ({
          id: p.id,
          variable: p.variable,
          description: p.description,
          domains: p.domains,
          correlations: p.correlations || [],
          prevalence: p.prevalence || 0,
          reliability: p.reliability || 0,
          volatility: p.volatility || 0,
          confidenceScore: p.confidence_score || 0,
          sampleSize: p.sample_size || 0,
          detectedAt: p.detected_at || p.created_at,
        }));
        setPatterns(transformedPatterns);
      }

      alert(`Scan complete!\nNew patterns found: ${data.new_patterns_found}\nPredictions generated: ${data.predictions_generated}`);
    } catch (err) {
      console.error('Scan error:', err);
      alert(err instanceof Error ? err.message : 'Scan failed');
    } finally {
      setIsScanning(false);
    }
  }, []);

  const handleNodeClick = useCallback((domain: InvestigationType) => {
    setSelectedDomain(domain === selectedDomain ? null : domain);
  }, [selectedDomain]);

  const handlePatternClick = useCallback((pattern: DetectedPattern) => {
    if (pattern.id) {
      router.push(`/patterns/${pattern.id}`);
    }
  }, [router]);

  // Filter patterns by selected domain
  const displayedPatterns = selectedDomain
    ? patterns.filter((p) => p.domains.includes(selectedDomain))
    : patterns;

  // Calculate domain stats
  const domainStats = patterns.reduce((acc, pattern) => {
    pattern.domains.forEach((domain) => {
      acc[domain] = (acc[domain] || 0) + 1;
    });
    return acc;
  }, {} as Record<InvestigationType, number>);

  if (loading) {
    return (
      <PageWrapper>
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="text-center">
            <div className="h-10 w-10 mx-auto animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
            <p className="mt-4 text-zinc-400">Loading patterns...</p>
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
            <h2 className="text-xl font-bold text-red-400">Error Loading Patterns</h2>
            <p className="mt-2 text-red-300/80">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 rounded-lg bg-red-600/20 px-4 py-2 text-red-400 hover:bg-red-600/30"
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
      title="Pattern Discovery"
      description={`Cross-domain correlations detected across ${patterns.length} patterns`}
      headerAction={
        <div className="flex items-center gap-3">
          <button
            onClick={handleScanPatterns}
            disabled={isScanning}
            className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-50"
          >
            {isScanning ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Scanning...
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Run Pattern Scan
              </>
            )}
          </button>
          <a
            href="/predictions"
            className="rounded-lg border border-dark-border bg-dark-card px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-dark-hover"
          >
            View Predictions →
          </a>
        </div>
      }
    >

      {/* Domain stats bar */}
      <div className="border-b border-dark-border bg-dark-card/30 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8">
        <div className="py-4">
          <div className="flex items-center gap-4">
            <span className="text-sm text-zinc-500">Domains:</span>
            {Object.entries(SCHEMA_METADATA).map(([domain, meta]) => {
              const count = domainStats[domain as InvestigationType] || 0;
              const isActive = selectedDomain === domain;

              return (
                <button
                  key={domain}
                  onClick={() => handleNodeClick(domain as InvestigationType)}
                  className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors ${
                    isActive
                      ? 'bg-violet-600 text-white'
                      : 'bg-zinc-800/50 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                  }`}
                >
                  <span>{meta.icon}</span>
                  <span className="hidden md:inline">{meta.name.split(' ')[0]}</span>
                  <span className={`rounded-full px-1.5 py-0.5 text-xs ${
                    isActive ? 'bg-white/20' : 'bg-zinc-700'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
            {selectedDomain && (
              <button
                onClick={() => setSelectedDomain(null)}
                className="text-sm text-zinc-500 hover:text-zinc-300"
              >
                Clear filter
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Intro text */}
      <div className="py-6 border-b border-dark-border -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <p className="text-zinc-300 leading-relaxed">
            When the same variable predicts success across completely different research areas,
            it&apos;s unlikely to be coincidence. These are the patterns our system has detected
            across <span className="font-semibold text-violet-400">{patterns.length} cross-domain correlations</span>.
          </p>
        </div>
      </div>

      {/* View mode toggle - List View first */}
      <div className="border-b border-dark-border -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8">
        <div className="flex">
          <button
            onClick={() => setViewMode('list')}
            className={`border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
              viewMode === 'list'
                ? 'border-brand-500 text-brand-400'
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <span className="flex items-center gap-2">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
              List View
            </span>
          </button>
          <button
            onClick={() => setViewMode('graph')}
            className={`border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
              viewMode === 'graph'
                ? 'border-brand-500 text-brand-400'
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <span className="flex items-center gap-2">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Network Graph
            </span>
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="py-8">
        {displayedPatterns.length === 0 ? (
          /* Empty state */
          <div className="rounded-xl border border-zinc-700 bg-zinc-900/50 p-12 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-800">
              <svg className="h-6 w-6 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-zinc-300">
              {selectedDomain
                ? `No patterns found for ${SCHEMA_METADATA[selectedDomain]?.name || selectedDomain}`
                : 'No patterns found'}
            </h3>
            <p className="mt-1 text-sm text-zinc-500">
              {selectedDomain
                ? 'Try selecting a different domain or clear the filter'
                : 'Run a pattern scan to discover cross-domain correlations'}
            </p>
            {selectedDomain && (
              <button
                onClick={() => setSelectedDomain(null)}
                className="mt-4 inline-block rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500"
              >
                Clear Filter
              </button>
            )}
          </div>
        ) : viewMode === 'graph' ? (
          <div className="space-y-6">
            {/* Graph intro text */}
            <div className="rounded-lg border border-zinc-700/50 bg-zinc-800/30 p-4">
              <p className="text-sm text-zinc-300 leading-relaxed">
                This map shows which research areas share patterns. <strong className="text-zinc-100">Each node</strong> represents
                a domain (NDE, Ganzfeld, etc.). <strong className="text-zinc-100">Lines between nodes</strong> indicate patterns
                that appear in both domains. <strong className="text-zinc-100">Thicker lines</strong> = more shared patterns.
                Click a node to filter by domain, or click a line to see the connecting pattern.
              </p>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              {/* Graph visualization */}
              <div className="lg:col-span-2">
                <div className="rounded-xl border border-zinc-700 bg-zinc-900/50 p-4">
                  <h2 className="mb-4 text-lg font-semibold text-zinc-100">Domain Connections</h2>
                  <PatternGraph
                  patterns={displayedPatterns}
                  onNodeClick={handleNodeClick}
                  onEdgeClick={handlePatternClick}
                />
              </div>
            </div>

            {/* Side panel */}
            <div className="space-y-4">
              <div className="rounded-xl border border-zinc-700 bg-zinc-900/50 p-4">
                <h3 className="mb-3 text-sm font-medium text-zinc-300">
                  {selectedDomain
                    ? `${SCHEMA_METADATA[selectedDomain]?.name || selectedDomain} Patterns`
                    : 'All Patterns'}
                </h3>
                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {displayedPatterns.slice(0, 10).map((pattern) => (
                    <div
                      key={`${pattern.variable}-${pattern.domains.join('-')}`}
                      onClick={() => handlePatternClick(pattern)}
                      className="cursor-pointer rounded-lg border border-zinc-700 bg-zinc-800/50 p-3 transition-colors hover:border-violet-500/50"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm text-zinc-200 line-clamp-2">
                          {pattern.description}
                        </p>
                        <span className="shrink-0 text-xs font-medium text-violet-400">
                          {(pattern.confidenceScore * 100).toFixed(0)}%
                        </span>
                      </div>
                      <div className="mt-2 flex gap-1">
                        {pattern.domains.map((domain) => {
                          const meta = SCHEMA_METADATA[domain] || { name: domain, icon: '❓', color: 'text-zinc-400' };
                          return (
                            <span key={domain} className="text-sm" title={meta.name}>
                              {meta.icon}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                  {displayedPatterns.length > 10 && (
                    <button
                      onClick={() => setViewMode('list')}
                      className="w-full rounded-lg bg-zinc-800/50 py-2 text-sm text-violet-400 hover:bg-zinc-800"
                    >
                      View all {displayedPatterns.length} patterns →
                    </button>
                  )}
                </div>
              </div>

              {/* Info card */}
              <div className="rounded-xl border border-zinc-700 bg-zinc-900/50 p-4">
                <h3 className="mb-2 text-sm font-medium text-zinc-300">How It Works</h3>
                <p className="text-xs text-zinc-500">
                  The pattern matcher scans all verified investigations to find variables that
                  correlate with success across multiple domains. When a pattern exceeds 85%
                  confidence, it automatically generates a testable prediction.
                </p>
              </div>
            </div>
          </div>
        </div>
        ) : (
          <PatternList patterns={displayedPatterns} onPatternClick={handlePatternClick} />
        )}
      </div>
    </PageWrapper>
  );
}
