'use client';

/**
 * PredictionCard
 * Display a single prediction with its status and details
 */

import { SCHEMA_METADATA } from '@/schemas';
import { JARGON_TOOLTIPS } from '@/components/ui/Tooltip';
import { generateDisplayTitle } from '@/lib/prediction-display';
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

interface PredictionCardProps {
  prediction: Prediction;
  onClick?: () => void;
  compact?: boolean;
}

const STATUS_STYLES: Record<string, { bg: string; text: string; border: string; icon: React.ReactNode }> = {
  open: {
    bg: 'bg-blue-500/10',
    text: 'text-blue-400',
    border: 'border-blue-500/30',
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
  },
  pending: {
    bg: 'bg-zinc-500/10',
    text: 'text-zinc-400',
    border: 'border-zinc-500/30',
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  testing: {
    bg: 'bg-amber-500/10',
    text: 'text-amber-400',
    border: 'border-amber-500/30',
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
      </svg>
    ),
  },
  confirmed: {
    bg: 'bg-green-500/10',
    text: 'text-green-400',
    border: 'border-green-500/30',
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    ),
  },
  refuted: {
    bg: 'bg-red-500/10',
    text: 'text-red-400',
    border: 'border-red-500/30',
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    ),
  },
  inconclusive: {
    bg: 'bg-zinc-500/10',
    text: 'text-zinc-400',
    border: 'border-zinc-500/30',
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
};

const DEFAULT_STATUS_STYLE = {
  bg: 'bg-zinc-500/10',
  text: 'text-zinc-400',
  border: 'border-zinc-500/30',
  icon: null,
};

export function PredictionCard({ prediction, onClick, compact = false }: PredictionCardProps) {
  const statusStyle = STATUS_STYLES[prediction.status] || DEFAULT_STATUS_STYLE;
  const confidencePercent = (prediction.confidence_score * 100).toFixed(1);

  // Bulletproof domains array
  const domains = (prediction?.domains_involved || prediction?.domains || []).filter(Boolean);

  // Generate human-readable display title
  const displayTitle = generateDisplayTitle(prediction.hypothesis, domains);

  if (compact) {
    return (
      <div
        onClick={onClick}
        className={`rounded-xl border border-dark-border bg-dark-card p-4 transition-all ${
          onClick ? 'cursor-pointer hover:border-brand-500/30 hover:bg-dark-hover hover:-translate-y-0.5' : ''
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="line-clamp-2 text-sm font-medium text-zinc-200 leading-relaxed">{displayTitle.title}</p>
            <p className="line-clamp-1 text-xs text-zinc-500 mt-1">{displayTitle.subtitle}</p>
          </div>
          <span
            className={`shrink-0 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium capitalize ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}
          >
            {statusStyle.icon}
            {prediction.status}
          </span>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-16 rounded-full bg-dark-border overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-brand-600 to-brand-400 transition-all"
                style={{ width: `${confidencePercent}%` }}
              />
            </div>
            <span className="text-xs text-zinc-500">{confidencePercent}%</span>
          </div>
          <div className="flex gap-1">
            {domains.slice(0, 3).map((domain) => {
              const meta = SCHEMA_METADATA[domain as keyof typeof SCHEMA_METADATA];
              return (
                <span
                  key={domain}
                  className={`text-sm ${meta?.color || 'text-zinc-400'}`}
                  title={meta?.name || domain}
                >
                  {meta?.icon || '❓'}
                </span>
              );
            })}
            {domains.length > 3 && (
              <span className="text-xs text-zinc-500">+{domains.length - 3}</span>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className={`rounded-xl border border-dark-border bg-dark-card p-6 transition-all ${
        onClick ? 'cursor-pointer hover:border-brand-500/30 hover:bg-dark-hover hover:-translate-y-1' : ''
      }`}
    >
      {/* Header */}
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-zinc-100 leading-relaxed">{displayTitle.title}</h3>
          <p className="mt-1 text-sm text-zinc-500">{displayTitle.subtitle}</p>
          {prediction.explainer && (
            <p className="mt-2 text-sm text-zinc-400 italic leading-relaxed">{prediction.explainer}</p>
          )}
        </div>
        <span
          className={`shrink-0 inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium capitalize ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}
        >
          {statusStyle.icon}
          {prediction.status}
        </span>
      </div>

      {/* Confidence bar */}
      <div className="mb-5">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="text-zinc-500 flex items-center gap-1">
            Confidence Score
            <span
              title={JARGON_TOOLTIPS.confidence_score}
              className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-zinc-700/50 text-[10px] text-zinc-400 hover:bg-zinc-600/50 hover:text-zinc-300 cursor-help"
            >
              ?
            </span>
          </span>
          <span className="font-semibold text-brand-400">{confidencePercent}%</span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-dark-border">
          <div
            className="h-full bg-gradient-to-r from-brand-600 to-brand-400 transition-all duration-500 ease-out"
            style={{ width: `${confidencePercent}%` }}
          />
        </div>
      </div>

      {/* Domains */}
      <div className="mb-5 flex flex-wrap gap-2">
        {domains.map((domain) => {
          const meta = SCHEMA_METADATA[domain as keyof typeof SCHEMA_METADATA];
          return (
            <span
              key={domain}
              className={`flex items-center gap-1.5 rounded-lg bg-dark-hover border border-dark-border px-3 py-1.5 text-sm ${meta?.color || 'text-zinc-400'} transition-colors hover:border-brand-500/30`}
            >
              <span>{meta?.icon || '❓'}</span>
              <span>{meta?.name || domain}</span>
            </span>
          );
        })}
      </div>

      {/* Results (if resolved) */}
      {(prediction.p_value != null || prediction.brier_score != null) && (
        <div className="mb-5 grid grid-cols-2 gap-4 rounded-xl bg-dark-hover border border-dark-border p-4">
          {prediction.p_value != null && (
            <div>
              <div className="text-xs text-zinc-500 mb-1 flex items-center gap-1">
                P-Value
                <span
                  title={JARGON_TOOLTIPS.p_value}
                  className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-zinc-700/50 text-[10px] text-zinc-400 hover:bg-zinc-600/50 hover:text-zinc-300 cursor-help"
                >
                  ?
                </span>
              </div>
              <div
                className={`text-xl font-bold ${
                  prediction.p_value < 0.05
                    ? 'text-green-400'
                    : prediction.p_value < 0.1
                    ? 'text-amber-400'
                    : 'text-zinc-400'
                }`}
              >
                {prediction.p_value.toFixed(4)}
              </div>
              <div className="text-xs text-zinc-600 mt-0.5">
                {prediction.p_value < 0.05 ? 'Significant' : prediction.p_value < 0.1 ? 'Marginal' : 'Not significant'}
              </div>
            </div>
          )}
          {prediction.brier_score != null && (
            <div>
              <div className="text-xs text-zinc-500 mb-1 flex items-center gap-1">
                Brier Score
                <span
                  title={JARGON_TOOLTIPS.brier_score}
                  className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-zinc-700/50 text-[10px] text-zinc-400 hover:bg-zinc-600/50 hover:text-zinc-300 cursor-help"
                >
                  ?
                </span>
              </div>
              <div
                className={`text-xl font-bold ${
                  prediction.brier_score < 0.25
                    ? 'text-green-400'
                    : prediction.brier_score < 0.5
                    ? 'text-amber-400'
                    : 'text-red-400'
                }`}
              >
                {prediction.brier_score.toFixed(3)}
              </div>
              <div className="text-xs text-zinc-600 mt-0.5">
                {prediction.brier_score < 0.25 ? 'Excellent' : prediction.brier_score < 0.5 ? 'Good' : 'Poor'}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Source pattern */}
      {prediction.pattern && (
        <div className="mb-5 rounded-xl border border-dark-border bg-dark-hover p-4">
          <div className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Source Pattern</div>
          <div className="text-sm text-zinc-300 leading-relaxed">
            {prediction.pattern.pattern_description || prediction.pattern.description}
          </div>
          {prediction.pattern.variable && (
            <div className="mt-2 inline-flex items-center gap-1.5 text-xs text-brand-400 bg-brand-500/10 rounded-md px-2 py-1">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              {prediction.pattern.variable}
            </div>
          )}
        </div>
      )}

      {/* Testing protocol (if available) */}
      {prediction.testing_protocol && (
        <details className="group mb-5">
          <summary className="cursor-pointer text-sm text-zinc-400 hover:text-zinc-200 transition-colors flex items-center gap-2">
            <svg className="w-4 h-4 transition-transform group-open:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            View Testing Protocol
          </summary>
          <div className="mt-3 whitespace-pre-wrap rounded-xl bg-dark-hover border border-dark-border p-4 text-sm text-zinc-400 leading-relaxed">
            {prediction.testing_protocol}
          </div>
        </details>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-dark-border pt-4 text-xs text-zinc-500">
        <span className="flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          Created {new Date(prediction.created_at).toLocaleDateString()}
        </span>
        {prediction.resolved_at && (
          <span className="flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Resolved {new Date(prediction.resolved_at).toLocaleDateString()}
          </span>
        )}
        {onClick && !prediction.resolved_at && (
          <span className="text-brand-400 hover:text-brand-300 font-medium transition-colors flex items-center gap-1">
            View details
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </span>
        )}
      </div>
    </div>
  );
}
