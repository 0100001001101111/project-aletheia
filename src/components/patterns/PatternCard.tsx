'use client';

/**
 * PatternCard
 * Display a single pattern with its details
 */

import { SCHEMA_METADATA } from '@/schemas';
import type { DetectedPattern } from '@/lib/pattern-matcher';
import { getConfidenceLevel } from '@/lib/pattern-matcher';

interface PatternCardProps {
  pattern: DetectedPattern;
  onClick?: () => void;
  compact?: boolean;
}

export function PatternCard({ pattern, onClick, compact = false }: PatternCardProps) {
  const confidenceInfo = getConfidenceLevel(pattern.confidenceScore);

  if (compact) {
    return (
      <div
        onClick={onClick}
        className={`rounded-lg border border-zinc-700 bg-zinc-800/50 p-3 transition-colors ${
          onClick ? 'cursor-pointer hover:border-violet-500/50 hover:bg-zinc-800' : ''
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm text-zinc-200">{pattern.description}</p>
          <span className={`whitespace-nowrap text-xs font-medium ${confidenceInfo.color}`}>
            {(pattern.confidenceScore * 100).toFixed(0)}%
          </span>
        </div>
        <div className="mt-2 flex flex-wrap gap-1">
          {(pattern.domains || []).filter(d => d).map((domain) => {
            const meta = SCHEMA_METADATA[domain] || { name: domain, icon: '❓', color: 'text-zinc-400' };
            return (
              <span key={domain} className="text-sm" title={meta.name}>
                {meta.icon}
              </span>
            );
          })}
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
      <div className="mb-3 flex items-start justify-between">
        <div className="flex-1">
          <h3 className="text-lg font-medium text-zinc-100">{pattern.description}</h3>
          <p className="mt-1 text-sm text-zinc-500">
            Variable: <code className="text-violet-400">{pattern.variable}</code>
          </p>
        </div>
        <div className="text-right">
          <div className={`text-2xl font-bold ${confidenceInfo.color}`}>
            {(pattern.confidenceScore * 100).toFixed(1)}%
          </div>
          <div className={`text-xs ${confidenceInfo.color}`}>{confidenceInfo.label}</div>
        </div>
      </div>

      {/* Domains */}
      <div className="mb-4 flex flex-wrap gap-2">
        {(pattern.domains || []).filter(d => d).map((domain) => {
          const meta = SCHEMA_METADATA[domain] || { name: domain, icon: '❓', color: 'text-zinc-400' };
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

      {/* Metrics */}
      <div className="grid grid-cols-4 gap-3 border-t border-zinc-700 pt-4">
        <div className="text-center">
          <div className="text-lg font-semibold text-zinc-200">
            {(pattern.prevalence * 100).toFixed(0)}%
          </div>
          <div className="text-xs text-zinc-500">Prevalence</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-semibold text-zinc-200">
            {(pattern.reliability * 100).toFixed(0)}%
          </div>
          <div className="text-xs text-zinc-500">Reliability</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-semibold text-zinc-200">
            {(pattern.volatility * 100).toFixed(0)}%
          </div>
          <div className="text-xs text-zinc-500">Stability</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-semibold text-zinc-200">
            {pattern.sampleSize}
          </div>
          <div className="text-xs text-zinc-500">Samples</div>
        </div>
      </div>

      {/* Correlations */}
      {pattern.correlations && pattern.correlations.length > 0 && (
        <div className="mt-4 border-t border-zinc-700 pt-4">
          <h4 className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
            Correlations by Domain
          </h4>
          <div className="space-y-2">
            {(pattern.correlations || []).filter(c => c && c.domain).map((corr) => {
              const meta = SCHEMA_METADATA[corr.domain] || { name: corr.domain, icon: '❓', color: 'text-zinc-400' };
              const barWidth = Math.abs(corr.correlation) * 100;
              const isPositive = corr.correlation > 0;

              return (
                <div key={corr.domain} className="flex items-center gap-3">
                  <span className={`w-24 text-xs ${meta.color}`}>
                    {meta.icon} {meta.name.split(' ')[0]}
                  </span>
                  <div className="relative flex-1 h-4 bg-zinc-800 rounded overflow-hidden">
                    <div
                      className={`absolute h-full transition-all ${
                        isPositive ? 'bg-emerald-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${barWidth}%` }}
                    />
                    <span className="absolute inset-0 flex items-center justify-center text-xs text-zinc-300">
                      r={corr.correlation.toFixed(2)}
                    </span>
                  </div>
                  <span className="w-16 text-right text-xs text-zinc-500">
                    p={corr.pValue.toFixed(3)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="mt-4 flex items-center justify-between text-xs text-zinc-500">
        <span>Detected: {new Date(pattern.detectedAt).toLocaleDateString()}</span>
        {onClick && (
          <span className="text-violet-400 hover:text-violet-300">View details →</span>
        )}
      </div>
    </div>
  );
}
