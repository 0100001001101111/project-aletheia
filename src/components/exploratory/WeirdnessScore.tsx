'use client';

/**
 * Weirdness Score Component
 * Playful alternative to the serious triage score for Exploratory tier
 */

interface WeirdnessScoreProps {
  score: number; // 0-10
  factors?: WeirdnessFactor[];
  compact?: boolean;
}

export interface WeirdnessFactor {
  icon: string;
  label: string;
  met: boolean;
}

const WEIRDNESS_LABELS = [
  { min: 0, max: 2, label: 'Mildly Odd', emoji: '🤔' },
  { min: 3, max: 4, label: 'Pretty Strange', emoji: '😮' },
  { min: 5, max: 6, label: 'Very Weird', emoji: '😱' },
  { min: 7, max: 8, label: 'Extremely Bizarre', emoji: '🤯' },
  { min: 9, max: 10, label: 'Off The Charts', emoji: '👽' },
];

function getWeirdnessLabel(score: number) {
  return WEIRDNESS_LABELS.find(l => score >= l.min && score <= l.max) || WEIRDNESS_LABELS[0];
}

export function WeirdnessScore({ score, factors, compact = false }: WeirdnessScoreProps) {
  const label = getWeirdnessLabel(score);
  const filledBars = Math.round(score);

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-lg">{label.emoji}</span>
        <div className="flex gap-0.5">
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className={`h-3 w-1.5 rounded-sm ${
                i < filledBars
                  ? 'bg-purple-500'
                  : 'bg-zinc-700'
              }`}
            />
          ))}
        </div>
        <span className="text-sm font-medium text-purple-400">{score}/10</span>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-purple-500/30 bg-purple-500/5 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{label.emoji}</span>
          <div>
            <div className="text-sm text-purple-300 font-medium">Weirdness Level</div>
            <div className="text-xs text-purple-400/70">{label.label}</div>
          </div>
        </div>
        <div className="text-2xl font-bold text-purple-400">{score}/10</div>
      </div>

      {/* Progress bar */}
      <div className="flex gap-1 mb-4">
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className={`h-4 flex-1 rounded transition-all ${
              i < filledBars
                ? 'bg-gradient-to-t from-purple-600 to-purple-400'
                : 'bg-zinc-700/50'
            }`}
          />
        ))}
      </div>

      {/* Factors */}
      {factors && factors.length > 0 && (
        <div className="space-y-1.5">
          {factors.map((factor, i) => (
            <div
              key={i}
              className={`flex items-center gap-2 text-sm ${
                factor.met ? 'text-purple-300' : 'text-zinc-500'
              }`}
            >
              <span>{factor.icon}</span>
              <span>{factor.label}</span>
              {factor.met && <span className="text-purple-400">✓</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Mini weirdness indicator for list views
 */
export function WeirdnessMini({ score }: { score: number }) {
  const label = getWeirdnessLabel(score);

  return (
    <span className="inline-flex items-center gap-1 text-purple-400">
      <span>{label.emoji}</span>
      <span className="font-medium">{score}</span>
    </span>
  );
}
