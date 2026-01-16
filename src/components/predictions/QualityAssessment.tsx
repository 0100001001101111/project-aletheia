'use client';

/**
 * QualityAssessment
 * Multiplicative quality scoring for prediction results
 * Formula: Quality = Isolation x Target x Data x Baseline x 10
 * If ANY factor = 0, result is auto-rejected
 */

import { useState, useCallback } from 'react';

export interface QualityScores {
  isolation: number;
  targetSelection: number;
  dataIntegrity: number;
  baseline: number;
}

interface QualityAssessmentProps {
  scores: QualityScores;
  onChange: (scores: QualityScores) => void;
  readOnly?: boolean;
}

interface FactorDefinition {
  key: keyof QualityScores;
  name: string;
  description: string;
  levels: {
    value: number;
    label: string;
    description: string;
  }[];
}

const FACTORS: FactorDefinition[] = [
  {
    key: 'isolation',
    name: 'Isolation',
    description: 'How well were the tester and information source separated?',
    levels: [
      { value: 1.0, label: 'Excellent', description: 'Faraday cage, no electronics, different buildings' },
      { value: 0.75, label: 'Good', description: 'Separate rooms, phones off, no communication' },
      { value: 0.5, label: 'Acceptable', description: 'Same building but separated, limited isolation' },
      { value: 0.25, label: 'Minimal', description: 'Same room but screened, basic separation' },
      { value: 0, label: 'None', description: 'Same room, could see/hear answer' },
    ],
  },
  {
    key: 'targetSelection',
    name: 'Target Selection',
    description: 'How were the targets chosen?',
    levels: [
      { value: 1.0, label: 'True Random', description: 'Hardware RNG, timestamped, verifiable seed' },
      { value: 0.75, label: 'Pseudo-Random', description: 'Software RNG, documented method' },
      { value: 0.5, label: 'Shuffled', description: 'Pre-made target pool, shuffled order' },
      { value: 0.25, label: 'Selected', description: 'Experimenter chose from pool' },
      { value: 0, label: 'Manual', description: 'Targets chosen by someone who knew answers' },
    ],
  },
  {
    key: 'dataIntegrity',
    name: 'Data Integrity',
    description: 'How was data recorded and protected?',
    levels: [
      { value: 1.0, label: 'Video + Auto-log', description: 'Video recording, automatic data logging, timestamps' },
      { value: 0.75, label: 'Witnessed + Logged', description: 'Independent witness, written log at time of test' },
      { value: 0.5, label: 'Manual Log', description: 'Written log during session, no witness' },
      { value: 0.25, label: 'Post-Session', description: 'Data recorded after session from memory' },
      { value: 0, label: 'Self-Report Only', description: 'No contemporaneous record, self-reported only' },
    ],
  },
  {
    key: 'baseline',
    name: 'Baseline',
    description: 'Was the expected chance rate established?',
    levels: [
      { value: 1.0, label: 'Pre-Registered', description: 'Baseline declared before testing, documented' },
      { value: 0.75, label: 'Historical', description: 'Used established baseline from prior research' },
      { value: 0.5, label: 'Calculated', description: 'Baseline calculated from task structure' },
      { value: 0.25, label: 'Estimated', description: 'Baseline estimated without formal calculation' },
      { value: 0, label: 'None', description: 'No baseline stated or justified' },
    ],
  },
];

/**
 * Calculate the multiplicative quality score
 */
export function calculateQualityScore(scores: QualityScores): number {
  const { isolation, targetSelection, dataIntegrity, baseline } = scores;
  return isolation * targetSelection * dataIntegrity * baseline * 10;
}

/**
 * Check if any factor is zero (auto-reject)
 */
export function hasZeroFactor(scores: QualityScores): boolean {
  return Object.values(scores).some((v) => v === 0);
}

/**
 * Get quality score label and color
 */
export function getQualityLabel(score: number): { label: string; color: string; bg: string } {
  if (score === 0) return { label: 'Rejected', color: 'text-red-400', bg: 'bg-red-500/20' };
  if (score >= 7) return { label: 'Excellent', color: 'text-emerald-400', bg: 'bg-emerald-500/20' };
  if (score >= 5) return { label: 'Good', color: 'text-green-400', bg: 'bg-green-500/20' };
  if (score >= 3) return { label: 'Acceptable', color: 'text-yellow-400', bg: 'bg-yellow-500/20' };
  return { label: 'Low', color: 'text-orange-400', bg: 'bg-orange-500/20' };
}

export function QualityAssessment({ scores, onChange, readOnly = false }: QualityAssessmentProps) {
  const [expandedFactor, setExpandedFactor] = useState<keyof QualityScores | null>(null);

  const handleScoreChange = useCallback(
    (key: keyof QualityScores, value: number) => {
      if (readOnly) return;
      onChange({ ...scores, [key]: value });
    },
    [scores, onChange, readOnly]
  );

  const qualityScore = calculateQualityScore(scores);
  const isRejected = hasZeroFactor(scores);
  const qualityLabel = getQualityLabel(qualityScore);

  return (
    <div className="space-y-6">
      {/* Overall score display */}
      <div className={`rounded-xl p-6 ${qualityLabel.bg} border ${isRejected ? 'border-red-500/30' : 'border-zinc-700'}`}>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-zinc-400">Quality Score</div>
            <div className={`text-4xl font-bold ${qualityLabel.color}`}>
              {qualityScore.toFixed(1)}
              <span className="text-lg text-zinc-500">/10</span>
            </div>
            <div className={`mt-1 text-sm ${qualityLabel.color}`}>
              {qualityLabel.label}
            </div>
          </div>
          {isRejected && (
            <div className="rounded-lg bg-red-500/20 px-4 py-2 text-sm text-red-400">
              <div className="font-semibold">Auto-Rejected</div>
              <div className="text-xs">One or more factors are zero</div>
            </div>
          )}
        </div>

        {/* Formula display */}
        <div className="mt-4 pt-4 border-t border-zinc-700/50">
          <div className="text-xs text-zinc-500 mb-1">Formula</div>
          <div className="font-mono text-sm text-zinc-400">
            {scores.isolation.toFixed(2)} x {scores.targetSelection.toFixed(2)} x{' '}
            {scores.dataIntegrity.toFixed(2)} x {scores.baseline.toFixed(2)} x 10 ={' '}
            <span className={qualityLabel.color}>{qualityScore.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Factor sliders */}
      <div className="space-y-4">
        {FACTORS.map((factor) => {
          const currentValue = scores[factor.key];
          const isExpanded = expandedFactor === factor.key;
          const isZero = currentValue === 0;

          return (
            <div
              key={factor.key}
              className={`rounded-lg border ${isZero ? 'border-red-500/30 bg-red-500/5' : 'border-zinc-700 bg-zinc-800/50'} p-4`}
            >
              {/* Factor header */}
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-zinc-100">{factor.name}</span>
                    {isZero && (
                      <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-xs text-red-400">
                        Fatal
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-500 mt-0.5">{factor.description}</p>
                </div>
                <div className="text-right">
                  <div className={`text-lg font-bold ${isZero ? 'text-red-400' : 'text-zinc-100'}`}>
                    {currentValue.toFixed(2)}
                  </div>
                  <div className="text-xs text-zinc-500">
                    {factor.levels.find((l) => l.value === currentValue)?.label || 'Custom'}
                  </div>
                </div>
              </div>

              {/* Quick select buttons */}
              {!readOnly && (
                <div className="flex gap-1 mb-3">
                  {factor.levels.map((level) => (
                    <button
                      key={level.value}
                      onClick={() => handleScoreChange(factor.key, level.value)}
                      className={`flex-1 rounded py-1.5 text-xs font-medium transition-colors ${
                        currentValue === level.value
                          ? level.value === 0
                            ? 'bg-red-500/30 text-red-300'
                            : 'bg-violet-600 text-white'
                          : level.value === 0
                            ? 'bg-red-500/10 text-red-400/70 hover:bg-red-500/20'
                            : 'bg-zinc-700/50 text-zinc-400 hover:bg-zinc-700'
                      }`}
                      title={level.description}
                    >
                      {level.label}
                    </button>
                  ))}
                </div>
              )}

              {/* Slider */}
              {!readOnly && (
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={currentValue}
                  onChange={(e) => handleScoreChange(factor.key, parseFloat(e.target.value))}
                  className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-zinc-700"
                  style={{
                    background: `linear-gradient(to right, ${isZero ? '#ef4444' : '#8b5cf6'} 0%, ${isZero ? '#ef4444' : '#8b5cf6'} ${currentValue * 100}%, #3f3f46 ${currentValue * 100}%, #3f3f46 100%)`,
                  }}
                />
              )}

              {/* Expand button */}
              <button
                onClick={() => setExpandedFactor(isExpanded ? null : factor.key)}
                className="mt-2 text-xs text-zinc-500 hover:text-zinc-300"
              >
                {isExpanded ? 'Hide details' : 'What does this mean?'}
              </button>

              {/* Expanded details */}
              {isExpanded && (
                <div className="mt-3 pt-3 border-t border-zinc-700/50 space-y-2">
                  {factor.levels.map((level) => (
                    <div
                      key={level.value}
                      className={`rounded-lg p-2 text-sm ${
                        currentValue === level.value
                          ? 'bg-violet-500/10 border border-violet-500/30'
                          : 'bg-zinc-900/50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`font-medium ${level.value === 0 ? 'text-red-400' : 'text-zinc-200'}`}>
                          {level.label}
                        </span>
                        <span className="text-zinc-500">{level.value.toFixed(2)}</span>
                      </div>
                      <p className="text-xs text-zinc-400 mt-0.5">{level.description}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Warning box */}
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
        <div className="flex items-start gap-3">
          <svg className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div className="text-sm text-amber-300">
            <strong>Be honest.</strong> If any factor is truly zero (e.g., you could see the target),
            the result will be auto-rejected. It&apos;s better to have a null result with good methodology
            than a positive result that can&apos;t be trusted.
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Compact inline display of quality score
 */
export function QualityScoreBadge({ scores }: { scores: QualityScores }) {
  const score = calculateQualityScore(scores);
  const label = getQualityLabel(score);

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${label.bg} ${label.color}`}>
      <span>{score.toFixed(1)}</span>
      <span className="opacity-70">/10</span>
    </span>
  );
}
