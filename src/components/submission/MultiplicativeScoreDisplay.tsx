'use client';

/**
 * MultiplicativeScoreDisplay
 * Visual display of multiplicative scoring formula
 * Shows each factor with color-coded status and fatal warnings
 */

import {
  type MultiplicativeBreakdown,
  type MultiplicativeFactor,
  getFactorColor,
  getFactorLabel,
} from '@/lib/multiplicative-triage';

interface MultiplicativeScoreDisplayProps {
  breakdown: MultiplicativeBreakdown;
  showFormula?: boolean;
}

function FactorCard({
  name,
  factor,
  isLast = false,
}: {
  name: string;
  factor: MultiplicativeFactor;
  isLast?: boolean;
}) {
  const colorClasses = getFactorColor(factor.level);
  const label = getFactorLabel(factor.value);

  return (
    <div className="flex items-center gap-2">
      <div
        className={`flex-1 rounded-lg border p-3 ${colorClasses} ${
          factor.level === 'fatal' ? 'animate-pulse' : ''
        }`}
      >
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium uppercase tracking-wide opacity-75">{name}</span>
          <span
            className={`text-xs font-bold px-1.5 py-0.5 rounded ${
              factor.level === 'fatal' ? 'bg-red-500 text-white' : ''
            }`}
          >
            {label}
          </span>
        </div>
        <div className="text-2xl font-bold">{factor.value.toFixed(1)}</div>
        <div className="text-xs opacity-75 mt-1 line-clamp-2">{factor.reason}</div>
      </div>
      {!isLast && (
        <div className="text-2xl font-bold text-zinc-500">×</div>
      )}
    </div>
  );
}

export function MultiplicativeScoreDisplay({
  breakdown,
  showFormula = true,
}: MultiplicativeScoreDisplayProps) {
  const {
    sourceIntegrity,
    methodology,
    dataQuality,
    confoundControl,
    finalScore,
    hasFatalFactor,
    fatalFactorName,
    tier,
    formula,
    recommendations,
  } = breakdown;

  const getTierColor = () => {
    switch (tier) {
      case 'verified':
        return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
      case 'provisional':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
      case 'pending':
        return 'text-blue-400 bg-blue-500/10 border-blue-500/30';
      case 'rejected':
        return 'text-red-400 bg-red-500/10 border-red-500/30';
      default:
        return 'text-zinc-400 bg-zinc-500/10 border-zinc-500/30';
    }
  };

  return (
    <div className="space-y-4">
      {/* Fatal Warning Banner */}
      {hasFatalFactor && (
        <div className="rounded-xl border-2 border-red-500 bg-red-500/10 p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <svg
                className="h-6 w-6 text-red-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-red-300">Critical Quality Issue</h3>
              <p className="mt-1 text-sm text-red-400">
                <strong>{fatalFactorName}</strong> has a fatal score of 0.0, which zeros out the
                entire calculation. This submission cannot be accepted until this is addressed.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Score Card */}
      <div className={`rounded-xl border p-5 ${getTierColor()}`}>
        <div className="flex items-start justify-between">
          <div>
            <div className="text-sm uppercase tracking-wide opacity-75">Quality Score</div>
            <div className="text-5xl font-bold">
              {finalScore.toFixed(1)}
              <span className="text-xl opacity-50">/10</span>
            </div>
          </div>
          <div className={`rounded-lg border px-3 py-2 ${getTierColor()}`}>
            <div className="text-xs uppercase opacity-75">Status</div>
            <div className="text-lg font-semibold capitalize">{tier}</div>
          </div>
        </div>
      </div>

      {/* Formula Display */}
      {showFormula && (
        <div className="rounded-xl border border-zinc-700 bg-zinc-900/50 p-4">
          <h3 className="text-sm font-medium text-zinc-400 mb-3">Multiplicative Formula</h3>

          {/* Factor Cards Grid */}
          <div className="grid gap-2 sm:grid-cols-4">
            <FactorCard name="Source" factor={sourceIntegrity} />
            <FactorCard name="Method" factor={methodology} />
            <FactorCard name="Data" factor={dataQuality} />
            <FactorCard name="Confounds" factor={confoundControl} isLast />
          </div>

          {/* Formula String */}
          <div className="mt-4 p-3 rounded-lg bg-zinc-800 font-mono text-sm text-center">
            <span className="text-zinc-400">{formula}</span>
          </div>

          {/* Explanation */}
          <p className="mt-3 text-xs text-zinc-500">
            Each factor multiplies together. A single zero (FATAL) results in a score of 0.
            All factors must be non-zero for a valid score.
          </p>
        </div>
      )}

      {/* Factor Details */}
      <div className="rounded-xl border border-zinc-700 bg-zinc-800/50 p-4">
        <h3 className="text-sm font-medium text-zinc-300 mb-3">Factor Details</h3>
        <div className="space-y-3">
          {[
            { name: 'Source Integrity', factor: sourceIntegrity },
            { name: 'Methodology', factor: methodology },
            { name: 'Data Quality', factor: dataQuality },
            { name: 'Confound Control', factor: confoundControl },
          ].map(({ name, factor }) => (
            <div key={name} className="flex items-start gap-3">
              <div
                className={`w-2 h-2 rounded-full mt-1.5 ${
                  factor.level === 'high'
                    ? 'bg-emerald-500'
                    : factor.level === 'medium'
                      ? 'bg-amber-500'
                      : 'bg-red-500'
                }`}
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-zinc-200">{name}</span>
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded ${
                      factor.level === 'high'
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : factor.level === 'medium'
                          ? 'bg-amber-500/20 text-amber-400'
                          : 'bg-red-500/20 text-red-400'
                    }`}
                  >
                    {factor.value.toFixed(1)}
                  </span>
                </div>
                <p className="text-xs text-zinc-500 mt-0.5">{factor.reason}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div
          className={`rounded-xl border p-4 ${
            hasFatalFactor
              ? 'border-red-500/30 bg-red-500/5'
              : 'border-amber-500/30 bg-amber-500/5'
          }`}
        >
          <h3
            className={`text-sm font-medium mb-2 ${
              hasFatalFactor ? 'text-red-300' : 'text-amber-300'
            }`}
          >
            {hasFatalFactor ? 'Required to Submit' : 'Recommendations'}
          </h3>
          <ul className="space-y-2">
            {recommendations.map((rec, i) => (
              <li key={i} className="flex items-start gap-2 text-xs">
                <span
                  className={hasFatalFactor ? 'text-red-400' : 'text-amber-400'}
                >
                  {hasFatalFactor ? '!' : '•'}
                </span>
                <span className={hasFatalFactor ? 'text-red-300' : 'text-zinc-400'}>
                  {rec}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Scoring Guide */}
      <div className="rounded-xl border border-zinc-700 bg-zinc-800/30 p-4">
        <h4 className="text-sm font-medium text-zinc-300 mb-2">Scoring Guide</h4>
        <div className="grid gap-2 sm:grid-cols-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-zinc-400">1.0 = High (verified/rigorous)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span className="text-zinc-400">0.5 = Medium (present but limited)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            <span className="text-zinc-400">0.0 = Fatal (auto-reject)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
