/**
 * Pattern Detail Page
 */

import { createClient } from '@/lib/supabase-server';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SCHEMA_METADATA } from '@/schemas';
import type { InvestigationType } from '@/types/database';

interface Correlation {
  domain: InvestigationType;
  correlation: number;
  pValue: number;
  sampleSize: number;
  direction: 'positive' | 'negative' | 'none';
}

interface PageProps {
  params: Promise<{ id: string }>;
}

interface PatternData {
  id: string;
  variable?: string;
  pattern_description?: string;
  description?: string;
  confidence_score?: number;
  prevalence_score?: number;
  prevalence?: number;
  reliability_score?: number;
  reliability?: number;
  volatility_score?: number;
  volatility?: number;
  sample_size?: number;
  domains_matched?: string[];
  domains?: string[];
  correlations?: Correlation[];
  detected_at?: string;
  created_at?: string;
}

export default async function PatternDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: pattern, error } = await supabase
    .from('aletheia_pattern_matches')
    .select('*')
    .eq('id', id)
    .single() as { data: PatternData | null; error: { code?: string } | null };

  if (error || !pattern) {
    notFound();
  }

  const confidencePercent = ((pattern.confidence_score || 0) * 100).toFixed(1);
  const domains = (pattern.domains_matched || pattern.domains || []) as InvestigationType[];
  const correlations = (pattern.correlations || []) as Correlation[];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/50">
        <div className="mx-auto max-w-4xl px-4 py-6">
          <Link
            href="/patterns"
            className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200 mb-4"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Patterns
          </Link>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-zinc-100">
                {pattern.pattern_description || pattern.description}
              </h1>
              {pattern.variable && (
                <p className="mt-2 text-sm text-zinc-400">
                  Variable: <code className="text-violet-400">{pattern.variable}</code>
                </p>
              )}
            </div>
            <div className="text-right shrink-0" title="How certain we are this pattern is real, based on how many domains show it and how consistent the data is. Higher = more certain.">
              <div className="text-3xl font-bold text-violet-400">{confidencePercent}%</div>
              <div className="text-sm text-zinc-500 cursor-help">Confidence <span className="text-zinc-600">ⓘ</span></div>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-4xl px-4 py-8 space-y-8">
        {/* What This Means - Plain English Explanation */}
        <div className="rounded-xl border border-violet-500/30 bg-gradient-to-br from-violet-500/10 to-zinc-900 p-6">
          <h2 className="text-lg font-semibold text-violet-300 mb-3 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            What This Means
          </h2>
          <div className="space-y-4 text-zinc-300 leading-relaxed">
            <p>
              <strong className="text-zinc-100">The Discovery:</strong>{' '}
              {pattern.variable && domains.length > 0 ? (
                <>
                  When we analyzed studies across {domains.length > 1 ? 'multiple' : 'the'}{' '}
                  {domains.map((d, i) => {
                    const meta = SCHEMA_METADATA[d];
                    const name = meta?.name || d;
                    if (i === 0) return name;
                    if (i === domains.length - 1) return ` and ${name}`;
                    return `, ${name}`;
                  }).join('')}
                  {' '}research area{domains.length > 1 ? 's' : ''}, we found that the variable{' '}
                  <code className="text-violet-400 bg-violet-500/10 px-1.5 py-0.5 rounded">{pattern.variable}</code>{' '}
                  consistently predicts outcomes. This isn&apos;t a one-off finding—it appears reliably across{' '}
                  {pattern.sample_size || 'multiple'} data points.
                </>
              ) : (
                <>This pattern was detected through cross-domain analysis of research data.</>
              )}
            </p>

            {domains.length > 1 && (
              <p>
                <strong className="text-zinc-100">Why It Matters:</strong>{' '}
                Finding the same variable predicting success in completely different research areas suggests
                something fundamental is happening. It&apos;s unlikely to be coincidence when{' '}
                {domains.map((d, i) => {
                  const meta = SCHEMA_METADATA[d];
                  const name = meta?.name?.split(' ')[0] || d;
                  if (i === 0) return name;
                  if (i === domains.length - 1) return ` and ${name}`;
                  return `, ${name}`;
                }).join('')}
                {' '}research all point to the same conclusion.
              </p>
            )}

            <p>
              <strong className="text-zinc-100">Confidence Level:</strong>{' '}
              {(pattern.confidence_score || 0) >= 0.9 ? (
                <>
                  At {confidencePercent}% confidence, this is a <span className="text-emerald-400 font-medium">strong finding</span>.
                  The data is consistent enough that we&apos;ve generated testable predictions from it.
                </>
              ) : (pattern.confidence_score || 0) >= 0.75 ? (
                <>
                  At {confidencePercent}% confidence, this is a <span className="text-green-400 font-medium">promising signal</span>.
                  More data could strengthen or refine this finding.
                </>
              ) : (pattern.confidence_score || 0) >= 0.5 ? (
                <>
                  At {confidencePercent}% confidence, this is an <span className="text-yellow-400 font-medium">emerging pattern</span>.
                  The signal is there, but we need more samples to be certain.
                </>
              ) : (
                <>
                  At {confidencePercent}% confidence, this is a <span className="text-orange-400 font-medium">preliminary finding</span>.
                  Worth investigating, but requires additional verification.
                </>
              )}
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-xl bg-zinc-800/50 p-4 text-center">
            <div className="text-2xl font-bold text-emerald-400">
              {((pattern.prevalence_score || pattern.prevalence || 0) * 100).toFixed(0)}%
            </div>
            <div className="text-sm text-zinc-500">Prevalence</div>
          </div>
          <div className="rounded-xl bg-zinc-800/50 p-4 text-center">
            <div className="text-2xl font-bold text-blue-400">
              {((pattern.reliability_score || pattern.reliability || 0) * 100).toFixed(0)}%
            </div>
            <div className="text-sm text-zinc-500">Reliability</div>
          </div>
          <div className="rounded-xl bg-zinc-800/50 p-4 text-center">
            <div className="text-2xl font-bold text-amber-400">
              {((pattern.volatility_score || pattern.volatility || 0) * 100).toFixed(0)}%
            </div>
            <div className="text-sm text-zinc-500">Stability</div>
          </div>
          <div className="rounded-xl bg-zinc-800/50 p-4 text-center">
            <div className="text-2xl font-bold text-zinc-300">{pattern.sample_size || 0}</div>
            <div className="text-sm text-zinc-500">Sample Size</div>
          </div>
        </div>

        {/* Domains */}
        {domains.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-zinc-200 mb-3">Domains Matched</h2>
            <div className="flex flex-wrap gap-2">
              {domains.map((domain) => {
                const meta = SCHEMA_METADATA[domain];
                return (
                  <span
                    key={domain}
                    className={`flex items-center gap-2 rounded-full bg-zinc-800 px-4 py-2 ${meta?.color || 'text-zinc-300'}`}
                  >
                    <span className="text-lg">{meta?.icon || '?'}</span>
                    <span>{meta?.name || domain}</span>
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* Correlations */}
        {correlations.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-zinc-200 mb-3">How Strong Is the Connection?</h2>
            <p className="text-sm text-zinc-400 mb-4">
              Each card shows how strongly this pattern appears in different research areas.
            </p>
            <div className="space-y-4">
              {correlations.map((corr) => {
                const meta = SCHEMA_METADATA[corr.domain];
                const isPositive = corr.correlation > 0;
                const barWidth = Math.abs(corr.correlation) * 100;
                const absCorr = Math.abs(corr.correlation);

                // Plain English for correlation strength
                const strengthLabel = absCorr >= 0.7 ? 'Strong' : absCorr >= 0.4 ? 'Moderate' : absCorr >= 0.2 ? 'Weak' : 'Very Weak';
                const strengthColor = absCorr >= 0.7 ? 'text-emerald-400' : absCorr >= 0.4 ? 'text-green-400' : absCorr >= 0.2 ? 'text-yellow-400' : 'text-zinc-400';

                // Plain English for p-value
                const getPValueExplanation = (p: number) => {
                  if (p < 0.001) return { text: 'Extremely unlikely to be random', color: 'text-emerald-400', icon: '✓✓✓' };
                  if (p < 0.01) return { text: 'Very unlikely to be random', color: 'text-emerald-400', icon: '✓✓' };
                  if (p < 0.05) return { text: 'Unlikely to be random', color: 'text-green-400', icon: '✓' };
                  return { text: 'Could be random chance', color: 'text-yellow-400', icon: '?' };
                };
                const pExplanation = getPValueExplanation(corr.pValue);

                return (
                  <div key={corr.domain} className="rounded-xl bg-zinc-800/50 p-4">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className={`flex items-center gap-2 ${meta?.color || 'text-zinc-300'}`}>
                        <span className="text-lg">{meta?.icon || '?'}</span>
                        <span className="font-medium">{meta?.name || corr.domain}</span>
                      </div>
                      <div className={`text-sm font-medium ${strengthColor}`}>
                        {strengthLabel} connection
                      </div>
                    </div>

                    {/* Visual bar */}
                    <div className="relative h-8 bg-zinc-700 rounded-lg overflow-hidden mb-3">
                      <div
                        className={`absolute h-full transition-all ${
                          isPositive ? 'bg-gradient-to-r from-emerald-600 to-emerald-400' : 'bg-gradient-to-r from-red-600 to-red-400'
                        }`}
                        style={{ width: `${barWidth}%` }}
                      />
                      <span className="absolute inset-0 flex items-center justify-center text-sm text-white font-semibold">
                        {(absCorr * 100).toFixed(0)}% correlation
                      </span>
                    </div>

                    {/* Plain English stats with technical details */}
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="rounded-lg bg-zinc-900/50 p-2.5">
                        <div className="text-zinc-500 text-xs mb-1">Sample Size</div>
                        <div className="text-zinc-200">
                          <span className="font-medium">{corr.sampleSize}</span>
                          <span className="text-zinc-400 ml-1">cases analyzed</span>
                        </div>
                        <div className="text-zinc-500 text-xs mt-1">
                          n = {corr.sampleSize}
                        </div>
                      </div>
                      <div className="rounded-lg bg-zinc-900/50 p-2.5">
                        <div className="text-zinc-500 text-xs mb-1">Statistical Confidence</div>
                        <div className={`flex items-center gap-1.5 ${pExplanation.color}`}>
                          <span>{pExplanation.icon}</span>
                          <span className="text-xs">{pExplanation.text}</span>
                        </div>
                        <div className="text-zinc-500 text-xs mt-1">
                          p = {corr.pValue.toFixed(4)}
                        </div>
                      </div>
                    </div>

                    {/* Technical correlation value */}
                    <div className="mt-2 text-xs text-zinc-500 text-right">
                      r = {corr.correlation.toFixed(3)}
                    </div>

                    {/* Direction indicator */}
                    <div className="mt-3 pt-3 border-t border-zinc-700/50 text-xs text-zinc-400">
                      {isPositive ? (
                        <span className="text-emerald-400">↑ Positive correlation: When this variable increases, success increases</span>
                      ) : (
                        <span className="text-red-400">↓ Negative correlation: When this variable increases, success decreases</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Metadata */}
        <div className="border-t border-zinc-800 pt-6">
          <div className="grid grid-cols-2 gap-4 text-sm text-zinc-500">
            <div>
              <span className="text-zinc-600">Detected:</span>{' '}
              {new Date(pattern.detected_at || pattern.created_at || Date.now()).toLocaleDateString()}
            </div>
            <div>
              <span className="text-zinc-600">Pattern ID:</span>{' '}
              <code className="text-zinc-400">{pattern.id}</code>
            </div>
          </div>
        </div>

        {/* Related Predictions Link */}
        <div className="rounded-xl border border-violet-500/30 bg-violet-500/10 p-4">
          <p className="text-sm text-violet-300">
            This pattern may have generated testable predictions.{' '}
            <Link href="/predictions" className="underline hover:text-violet-200">
              View predictions
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
