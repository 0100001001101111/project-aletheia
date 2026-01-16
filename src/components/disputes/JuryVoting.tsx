'use client';

/**
 * JuryVoting Component
 * Blind voting interface for dispute resolution
 */

import { useState } from 'react';

interface JuryVotingProps {
  disputeId: string;
  flag?: {
    id: string;
    flaw_type: string;
    description: string;
    evidence: string | null;
    severity: 'minor' | 'major' | 'fatal';
  } | null;
  result?: {
    id: string;
    prediction_id: string;
    effect_observed: boolean;
    p_value: number;
    sample_size: number;
    description: string;
    methodology: string;
  } | null;
  onVoteSubmitted: () => void;
}

type Vote = 'uphold' | 'overturn' | 'abstain';

const VOTE_OPTIONS: { value: Vote; label: string; description: string; color: string }[] = [
  {
    value: 'uphold',
    label: 'Uphold Flag',
    description: 'The flag is valid. The methodological concern is legitimate and affects the result.',
    color: 'emerald',
  },
  {
    value: 'overturn',
    label: 'Overturn Flag',
    description: 'The flag is not valid. The concern does not significantly impact the result.',
    color: 'red',
  },
  {
    value: 'abstain',
    label: 'Abstain',
    description: "You don't have enough expertise to make a determination, or there's a conflict of interest.",
    color: 'zinc',
  },
];

export function JuryVoting({ disputeId, flag, result, onVoteSubmitted }: JuryVotingProps) {
  const [selectedVote, setSelectedVote] = useState<Vote | null>(null);
  const [reasoning, setReasoning] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);

  const handleSubmit = async () => {
    if (!selectedVote || !acknowledged) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/disputes/${disputeId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vote: selectedVote,
          reasoning: reasoning.trim() || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to submit vote');
      }

      onVoteSubmitted();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to submit vote');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="rounded-xl border border-violet-500/30 bg-violet-500/10 p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-500/20">
          <svg className="w-5 h-5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-violet-200">Your Jury Vote</h3>
          <p className="text-sm text-violet-300/70">
            Review the evidence and cast your vote
          </p>
        </div>
      </div>

      {/* Evidence summary */}
      <div className="rounded-lg bg-zinc-800/50 p-4 space-y-4">
        <h4 className="font-medium text-zinc-200">Evidence Summary</h4>

        {flag && (
          <div>
            <div className="text-sm text-zinc-500 mb-1">Flag Reason</div>
            <p className="text-sm text-zinc-300">
              <span className="font-medium capitalize">{flag.flaw_type.replace(/_/g, ' ')}</span>
              {' - '}{flag.description}
            </p>
            {flag.evidence && (
              <p className="text-sm text-zinc-400 mt-1 italic">&quot;{flag.evidence}&quot;</p>
            )}
          </div>
        )}

        {result && (
          <div>
            <div className="text-sm text-zinc-500 mb-1">Disputed Result</div>
            <div className="text-sm text-zinc-300">
              <span className={result.effect_observed ? 'text-emerald-400' : 'text-zinc-400'}>
                {result.effect_observed ? 'Effect observed' : 'No effect observed'}
              </span>
              {' with p = '}{result.p_value.toFixed(4)}{' (n = '}{result.sample_size}{')'}
            </div>
            {result.methodology && (
              <p className="text-sm text-zinc-400 mt-1">{result.methodology}</p>
            )}
          </div>
        )}
      </div>

      {/* Vote options */}
      <div className="space-y-3">
        <h4 className="font-medium text-zinc-200">Cast Your Vote</h4>
        {VOTE_OPTIONS.map((option) => (
          <button
            key={option.value}
            onClick={() => setSelectedVote(option.value)}
            className={`w-full rounded-lg border p-4 text-left transition-colors ${
              selectedVote === option.value
                ? option.color === 'emerald'
                  ? 'border-emerald-500 bg-emerald-500/20'
                  : option.color === 'red'
                    ? 'border-red-500 bg-red-500/20'
                    : 'border-zinc-500 bg-zinc-700/50'
                : 'border-zinc-700 bg-zinc-800/50 hover:bg-zinc-800'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`flex h-6 w-6 items-center justify-center rounded-full border ${
                selectedVote === option.value
                  ? option.color === 'emerald'
                    ? 'border-emerald-500 bg-emerald-500'
                    : option.color === 'red'
                      ? 'border-red-500 bg-red-500'
                      : 'border-zinc-500 bg-zinc-500'
                  : 'border-zinc-600'
              }`}>
                {selectedVote === option.value && (
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <div>
                <div className={`font-medium ${
                  selectedVote === option.value
                    ? option.color === 'emerald'
                      ? 'text-emerald-400'
                      : option.color === 'red'
                        ? 'text-red-400'
                        : 'text-zinc-300'
                    : 'text-zinc-200'
                }`}>
                  {option.label}
                </div>
                <div className="text-sm text-zinc-500">{option.description}</div>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Reasoning (optional) */}
      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-2">
          Reasoning <span className="text-zinc-500">(optional)</span>
        </label>
        <textarea
          value={reasoning}
          onChange={(e) => setReasoning(e.target.value)}
          rows={3}
          placeholder="Explain your reasoning..."
          className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-zinc-100 placeholder-zinc-500 focus:border-violet-500 focus:outline-none"
        />
        <p className="mt-1 text-xs text-zinc-500">
          Your reasoning will be recorded but kept anonymous.
        </p>
      </div>

      {/* Acknowledgment */}
      <div className="rounded-lg bg-zinc-800/50 p-4">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={acknowledged}
            onChange={(e) => setAcknowledged(e.target.checked)}
            className="mt-1 rounded border-zinc-600 bg-zinc-700 text-violet-500 focus:ring-violet-500"
          />
          <span className="text-sm text-zinc-400">
            I confirm that I have reviewed the evidence, I have no conflict of interest with
            either party, and I am casting this vote based solely on the methodological merits
            of the dispute.
          </span>
        </label>
      </div>

      {/* Submit button */}
      <button
        onClick={handleSubmit}
        disabled={!selectedVote || !acknowledged || isSubmitting}
        className={`w-full rounded-lg py-3 font-medium text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
          selectedVote === 'uphold'
            ? 'bg-emerald-600 hover:bg-emerald-500'
            : selectedVote === 'overturn'
              ? 'bg-red-600 hover:bg-red-500'
              : 'bg-violet-600 hover:bg-violet-500'
        }`}
      >
        {isSubmitting ? 'Submitting Vote...' : 'Submit Vote'}
      </button>

      {/* Warning */}
      <p className="text-xs text-center text-zinc-500">
        Your vote is final and cannot be changed once submitted.
      </p>
    </div>
  );
}
