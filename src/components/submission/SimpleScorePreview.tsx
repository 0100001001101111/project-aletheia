'use client';

/**
 * SimpleScorePreview
 * Display capped score (max 6.0) for simple mode submissions
 */

import type { SimpleScoreBreakdown } from '@/lib/simple-scoring';

interface SimpleScorePreviewProps {
  scoreBreakdown: SimpleScoreBreakdown;
}

function getTierColor(tier: string): string {
  switch (tier) {
    case 'provisional':
      return 'text-amber-400';
    case 'pending':
      return 'text-blue-400';
    default:
      return 'text-zinc-400';
  }
}

function getTierBg(tier: string): string {
  switch (tier) {
    case 'provisional':
      return 'bg-amber-500/10 border-amber-500/30';
    case 'pending':
      return 'bg-blue-500/10 border-blue-500/30';
    default:
      return 'bg-zinc-800 border-zinc-700';
  }
}

export function SimpleScorePreview({ scoreBreakdown }: SimpleScorePreviewProps) {
  const { finalScore, maxPossible, tier, factors, recommendations } = scoreBreakdown;

  return (
    <div className="space-y-4">
      {/* Main Score Card */}
      <div className={`rounded-xl border p-5 ${getTierBg(tier)}`}>
        <div className="flex items-start justify-between">
          <div>
            <div className="text-sm text-zinc-400 uppercase tracking-wide">Estimated Score</div>
            <div className={`text-4xl font-bold ${getTierColor(tier)}`}>
              {finalScore.toFixed(1)}
              <span className="text-xl text-zinc-500">/{maxPossible}</span>
            </div>
          </div>
          <div className={`rounded-lg px-3 py-1.5 ${getTierBg(tier)}`}>
            <div className="text-xs text-zinc-400 uppercase">Status</div>
            <div className={`text-sm font-semibold ${getTierColor(tier)} capitalize`}>{tier}</div>
          </div>
        </div>

        {/* Cap notice */}
        <div className="mt-3 p-2 rounded bg-zinc-800/50 border border-zinc-700/50">
          <p className="text-xs text-zinc-500">
            <span className="text-amber-400 font-medium">Quick Submit Mode</span> — Maximum score
            is 6.0. For higher scores, use Full Mode with detailed witness profiles and evidence.
          </p>
        </div>
      </div>

      {/* Score Breakdown */}
      <div className="rounded-xl border border-zinc-700 bg-zinc-900/50 p-4">
        <h3 className="font-medium text-zinc-200 mb-3">Score Breakdown</h3>
        <div className="space-y-2.5">
          {Object.entries(factors).map(([key, factor]) => (
            <div key={key} className="flex items-center gap-3">
              <div className="w-36 text-xs text-zinc-400">
                {formatFactorName(key)}
              </div>
              <div className="flex-1">
                <div className="h-1.5 rounded-full bg-zinc-700 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      factor.score / factor.max >= 0.7
                        ? 'bg-emerald-500'
                        : factor.score / factor.max >= 0.4
                          ? 'bg-amber-500'
                          : 'bg-red-500'
                    }`}
                    style={{ width: `${(factor.score / factor.max) * 100}%` }}
                  />
                </div>
              </div>
              <div className="w-14 text-right text-xs text-zinc-300">
                {factor.score.toFixed(1)}/{factor.max}
              </div>
            </div>
          ))}
        </div>

        {/* Factor details */}
        <div className="mt-4 pt-4 border-t border-zinc-700/50">
          <div className="grid gap-2">
            {Object.entries(factors).map(([key, factor]) => (
              <div key={key} className="flex items-center gap-2 text-xs">
                <span
                  className={`inline-block w-2 h-2 rounded-full ${
                    factor.score / factor.max >= 0.7
                      ? 'bg-emerald-500'
                      : factor.score / factor.max >= 0.4
                        ? 'bg-amber-500'
                        : 'bg-red-500'
                  }`}
                />
                <span className="text-zinc-500">{formatFactorName(key)}:</span>
                <span className="text-zinc-300">{factor.reason}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="rounded-xl border border-zinc-700 bg-zinc-800/50 p-4">
          <h3 className="font-medium text-zinc-200 mb-2">How to Improve</h3>
          <ul className="space-y-1.5">
            {recommendations.map((rec, i) => (
              <li key={i} className="flex items-start gap-2 text-xs">
                <span className="text-amber-400 mt-0.5">•</span>
                <span className="text-zinc-400">{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Tier explanation */}
      <div className="rounded-xl border border-zinc-700 bg-zinc-800/30 p-4">
        <h4 className="text-sm font-medium text-zinc-300 mb-2">What This Means</h4>
        <p className="text-xs text-zinc-500">
          {tier === 'provisional' ? (
            <>
              Your report will be visible in <span className="text-zinc-300">Community Findings</span>
              . It contributes to our exploratory data and may be used in pattern matching.
            </>
          ) : (
            <>
              Your report is <span className="text-zinc-300">pending</span> additional information.
              It will be stored but not included in active research until enhanced.
            </>
          )}
        </p>
      </div>
    </div>
  );
}

function formatFactorName(key: string): string {
  const names: Record<string, string> = {
    narrativeCompleteness: 'Narrative',
    temporalProximity: 'Recency',
    witnessPresence: 'Witnesses',
    evidencePresence: 'Evidence',
  };
  return names[key] || key;
}
