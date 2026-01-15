'use client';

/**
 * PredictionCard
 * Display a single prediction with its status and details
 */

import { SCHEMA_METADATA } from '@/schemas';
import type { InvestigationType } from '@/types/database';

type PredictionStatus = 'open' | 'pending' | 'testing' | 'confirmed' | 'refuted' | 'inconclusive';

interface Prediction {
  id: string;
  hypothesis: string;
  domains_involved?: InvestigationType[];
  domains?: InvestigationType[]; // alias for compatibility
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

const STATUS_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  open: {
    bg: 'bg-blue-500/10',
    text: 'text-blue-400',
    border: 'border-blue-500/30',
  },
  pending: {
    bg: 'bg-zinc-500/10',
    text: 'text-zinc-400',
    border: 'border-zinc-500/30',
  },
  testing: {
    bg: 'bg-amber-500/10',
    text: 'text-amber-400',
    border: 'border-amber-500/30',
  },
  confirmed: {
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-400',
    border: 'border-emerald-500/30',
  },
  refuted: {
    bg: 'bg-red-500/10',
    text: 'text-red-400',
    border: 'border-red-500/30',
  },
  inconclusive: {
    bg: 'bg-zinc-500/10',
    text: 'text-zinc-400',
    border: 'border-zinc-500/30',
  },
};

const DEFAULT_STATUS_STYLE = { bg: 'bg-zinc-500/10', text: 'text-zinc-400', border: 'border-zinc-500/30' };

export function PredictionCard({ prediction, onClick, compact = false }: PredictionCardProps) {
  const statusStyle = STATUS_STYLES[prediction.status] || DEFAULT_STATUS_STYLE;
  const confidencePercent = (prediction.confidence_score * 100).toFixed(1);
  const domains = prediction.domains_involved || prediction.domains || [];

  if (compact) {
    return (
      <div
        onClick={onClick}
        className={`rounded-lg border border-zinc-700 bg-zinc-800/50 p-3 transition-colors ${
          onClick ? 'cursor-pointer hover:border-violet-500/50 hover:bg-zinc-800' : ''
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <p className="line-clamp-2 text-sm text-zinc-200">{prediction.hypothesis}</p>
          <span
            className={`shrink-0 rounded-full border px-2 py-0.5 text-xs capitalize ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}
          >
            {prediction.status}
          </span>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <span className="text-xs text-zinc-500">
            {confidencePercent}% confidence
          </span>
          <div className="flex">
            {domains.slice(0, 3).map((domain) => (
              <span key={domain} className="text-sm" title={SCHEMA_METADATA[domain].name}>
                {SCHEMA_METADATA[domain].icon}
              </span>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className={`rounded-xl border border-zinc-700 bg-zinc-900/50 p-5 transition-colors ${
        onClick ? 'cursor-pointer hover:border-violet-500/50 hover:bg-zinc-800/50' : ''
      }`}
    >
      {/* Header */}
      <div className="mb-3 flex items-start justify-between gap-4">
        <h3 className="flex-1 text-lg font-medium text-zinc-100">{prediction.hypothesis}</h3>
        <span
          className={`shrink-0 rounded-full border px-3 py-1 text-sm font-medium capitalize ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}
        >
          {prediction.status}
        </span>
      </div>

      {/* Confidence bar */}
      <div className="mb-4">
        <div className="mb-1 flex items-center justify-between text-xs">
          <span className="text-zinc-500">Confidence Score</span>
          <span className="font-medium text-violet-400">{confidencePercent}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
          <div
            className="h-full bg-gradient-to-r from-violet-600 to-violet-400 transition-all"
            style={{ width: `${confidencePercent}%` }}
          />
        </div>
      </div>

      {/* Domains */}
      <div className="mb-4 flex flex-wrap gap-2">
        {domains.map((domain) => {
          const meta = SCHEMA_METADATA[domain];
          return (
            <span
              key={domain}
              className={`flex items-center gap-1 rounded-full bg-zinc-800 px-3 py-1 text-sm ${meta.color}`}
            >
              <span>{meta.icon}</span>
              <span>{meta.name}</span>
            </span>
          );
        })}
      </div>

      {/* Results (if resolved) */}
      {(prediction.p_value != null || prediction.brier_score != null) && (
        <div className="mb-4 grid grid-cols-2 gap-3 rounded-lg bg-zinc-800/50 p-3">
          {prediction.p_value != null && (
            <div>
              <div className="text-xs text-zinc-500">P-Value</div>
              <div
                className={`text-lg font-semibold ${
                  prediction.p_value < 0.05
                    ? 'text-emerald-400'
                    : prediction.p_value < 0.1
                    ? 'text-amber-400'
                    : 'text-zinc-400'
                }`}
              >
                {prediction.p_value.toFixed(4)}
              </div>
            </div>
          )}
          {prediction.brier_score != null && (
            <div>
              <div className="text-xs text-zinc-500">Brier Score</div>
              <div
                className={`text-lg font-semibold ${
                  prediction.brier_score < 0.25
                    ? 'text-emerald-400'
                    : prediction.brier_score < 0.5
                    ? 'text-amber-400'
                    : 'text-red-400'
                }`}
              >
                {prediction.brier_score.toFixed(3)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Source pattern */}
      {prediction.pattern && (
        <div className="mb-4 rounded-lg border border-zinc-700 bg-zinc-800/30 p-3">
          <div className="text-xs text-zinc-500">Source Pattern</div>
          <div className="mt-1 text-sm text-zinc-300">
            {prediction.pattern.pattern_description || prediction.pattern.description}
          </div>
          {prediction.pattern.variable && (
            <div className="mt-1 text-xs text-violet-400">
              Variable: {prediction.pattern.variable}
            </div>
          )}
        </div>
      )}

      {/* Testing protocol (if available) */}
      {prediction.testing_protocol && (
        <details className="group">
          <summary className="cursor-pointer text-sm text-zinc-400 hover:text-zinc-200">
            View Testing Protocol
          </summary>
          <div className="mt-2 whitespace-pre-wrap rounded-lg bg-zinc-800/50 p-3 text-xs text-zinc-400">
            {prediction.testing_protocol}
          </div>
        </details>
      )}

      {/* Footer */}
      <div className="mt-4 flex items-center justify-between border-t border-zinc-700 pt-4 text-xs text-zinc-500">
        <span>Created: {new Date(prediction.created_at).toLocaleDateString()}</span>
        {prediction.resolved_at && (
          <span>Resolved: {new Date(prediction.resolved_at).toLocaleDateString()}</span>
        )}
        {onClick && !prediction.resolved_at && (
          <span className="text-violet-400 hover:text-violet-300">View details →</span>
        )}
      </div>
    </div>
  );
}
