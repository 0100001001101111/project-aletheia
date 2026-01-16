'use client';

/**
 * SimpleModeStepper
 * Three-step wizard for submitting prediction results without statistics knowledge
 * Auto-calculates p-value, effect size, and provides plain English explanation
 */

import { useState, useMemo } from 'react';
import { binomialTest, formatPValue, getPValueExplanation, getEffectSizeLabel } from '@/lib/statistics';
import type { BinomialResult } from '@/lib/statistics';

interface SimpleModeStepperProps {
  predictionId: string;
  expectedProportion?: number; // Default: 0.25 for 4-choice tasks
  onSubmit: (data: SimpleSubmissionData) => Promise<void>;
  onCancel: () => void;
}

export interface SimpleSubmissionData {
  trials: number;
  hits: number;
  description: string;
  effect_observed: boolean;
  p_value: number;
  sample_size: number;
  effect_size: number;
  submission_mode: 'simple';
  plain_summary: string;
}

type Step = 1 | 2 | 3;

export function SimpleModeStepper({
  predictionId,
  expectedProportion = 0.25,
  onSubmit,
  onCancel,
}: SimpleModeStepperProps) {
  const [step, setStep] = useState<Step>(1);
  const [trials, setTrials] = useState<string>('');
  const [hits, setHits] = useState<string>('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Validation
  const trialsNum = parseInt(trials, 10);
  const hitsNum = parseInt(hits, 10);
  const isTrialsValid = !isNaN(trialsNum) && trialsNum > 0;
  const isHitsValid = !isNaN(hitsNum) && hitsNum >= 0 && hitsNum <= trialsNum;

  // Calculate statistics when we have valid numbers
  const stats: BinomialResult | null = useMemo(() => {
    if (!isTrialsValid || !isHitsValid) return null;
    try {
      return binomialTest(hitsNum, trialsNum, expectedProportion);
    } catch {
      return null;
    }
  }, [hitsNum, trialsNum, expectedProportion, isTrialsValid, isHitsValid]);

  const canProceedStep1 = isTrialsValid && isHitsValid;
  const canProceedStep2 = description.trim().length >= 20;

  const handleNext = () => {
    if (step === 1 && canProceedStep1) {
      setStep(2);
    } else if (step === 2 && canProceedStep2) {
      setStep(3);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep((step - 1) as Step);
    }
  };

  const handleSubmit = async () => {
    if (!stats) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const data: SimpleSubmissionData = {
        trials: trialsNum,
        hits: hitsNum,
        description,
        effect_observed: stats.effectObserved,
        p_value: stats.pValue,
        sample_size: trialsNum,
        effect_size: stats.effectSize,
        submission_mode: 'simple',
        plain_summary: stats.plainEnglish,
      };

      await onSubmit(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit result');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Progress indicator */}
      <div className="flex items-center gap-2">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                s < step
                  ? 'bg-emerald-600 text-white'
                  : s === step
                    ? 'bg-violet-600 text-white'
                    : 'bg-zinc-700 text-zinc-400'
              }`}
            >
              {s < step ? (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                s
              )}
            </div>
            {s < 3 && (
              <div className={`h-0.5 w-8 ${s < step ? 'bg-emerald-600' : 'bg-zinc-700'}`} />
            )}
          </div>
        ))}
      </div>

      {/* Step labels */}
      <div className="flex justify-between text-xs text-zinc-500">
        <span className={step >= 1 ? 'text-zinc-300' : ''}>Your Results</span>
        <span className={step >= 2 ? 'text-zinc-300' : ''}>What Happened</span>
        <span className={step >= 3 ? 'text-zinc-300' : ''}>Review</span>
      </div>

      {/* Step 1: Trials & Hits */}
      {step === 1 && (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-zinc-100">Enter Your Results</h3>
            <p className="mt-1 text-sm text-zinc-400">
              How many trials did you run, and how many were successful?
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Total Trials
                <span className="ml-1 text-zinc-500">(attempts)</span>
              </label>
              <input
                type="number"
                min="1"
                value={trials}
                onChange={(e) => setTrials(e.target.value)}
                placeholder="e.g., 100"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-lg text-zinc-100 placeholder-zinc-500 focus:border-violet-500 focus:outline-none"
              />
              {trials && !isTrialsValid && (
                <p className="mt-1 text-sm text-red-400">Must be a positive number</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Successful Hits
                <span className="ml-1 text-zinc-500">(correct)</span>
              </label>
              <input
                type="number"
                min="0"
                max={trialsNum || undefined}
                value={hits}
                onChange={(e) => setHits(e.target.value)}
                placeholder="e.g., 32"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-lg text-zinc-100 placeholder-zinc-500 focus:border-violet-500 focus:outline-none"
              />
              {hits && !isHitsValid && (
                <p className="mt-1 text-sm text-red-400">Must be between 0 and total trials</p>
              )}
            </div>
          </div>

          {/* Live preview */}
          {stats && (
            <div className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-zinc-400">Hit Rate</div>
                  <div className="text-2xl font-bold text-zinc-100">
                    {(stats.observedProportion * 100).toFixed(1)}%
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-zinc-400">vs Chance ({(expectedProportion * 100).toFixed(0)}%)</div>
                  <div className={`text-lg font-medium ${stats.observedProportion > expectedProportion ? 'text-emerald-400' : 'text-zinc-400'}`}>
                    {stats.observedProportion > expectedProportion ? '+' : ''}
                    {((stats.observedProportion - expectedProportion) * 100).toFixed(1)}%
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="rounded-lg bg-zinc-800/30 p-4">
            <p className="text-sm text-zinc-400">
              <strong className="text-zinc-300">What counts as a trial?</strong> Each time you tested the prediction.
              For example, if testing remote viewing, each attempt to identify a hidden target is one trial.
            </p>
          </div>
        </div>
      )}

      {/* Step 2: Description */}
      {step === 2 && (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-zinc-100">Describe What Happened</h3>
            <p className="mt-1 text-sm text-zinc-400">
              Tell us about your testing process. This helps others understand and replicate your work.
            </p>
          </div>

          <div>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={6}
              placeholder="Describe your testing process...

For example:
- How were targets selected?
- Were the tester and target isolated?
- How did you record results?
- Any issues or deviations from the protocol?"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-zinc-100 placeholder-zinc-500 focus:border-violet-500 focus:outline-none"
            />
            <div className="mt-2 flex items-center justify-between text-sm">
              <span className={description.length >= 20 ? 'text-zinc-400' : 'text-yellow-400'}>
                {description.length >= 20 ? 'Good detail' : `Add ${20 - description.length} more characters`}
              </span>
              <span className="text-zinc-500">{description.length} characters</span>
            </div>
          </div>

          <div className="rounded-lg bg-zinc-800/30 p-4">
            <p className="text-sm text-zinc-400">
              <strong className="text-zinc-300">Why does this matter?</strong> Detailed methodology helps
              others verify your results and identifies potential sources of error.
            </p>
          </div>
        </div>
      )}

      {/* Step 3: Review */}
      {step === 3 && stats && (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-zinc-100">Review Your Submission</h3>
            <p className="mt-1 text-sm text-zinc-400">
              We calculated the statistics for you. Review everything before submitting.
            </p>
          </div>

          {/* Results summary card */}
          <div className="rounded-xl border border-zinc-700 bg-zinc-800/50 p-6 space-y-4">
            {/* Headline result */}
            <div className={`rounded-lg p-4 ${stats.effectObserved ? 'bg-emerald-500/10 border border-emerald-500/30' : 'bg-zinc-700/50'}`}>
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-full ${stats.effectObserved ? 'bg-emerald-500/20' : 'bg-zinc-700'}`}>
                  {stats.effectObserved ? (
                    <svg className="h-5 w-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                    </svg>
                  )}
                </div>
                <div>
                  <div className={`font-semibold ${stats.effectObserved ? 'text-emerald-400' : 'text-zinc-300'}`}>
                    {stats.effectObserved ? 'Effect Observed' : 'No Effect Detected'}
                  </div>
                  <div className="text-sm text-zinc-400">
                    {stats.plainEnglish}
                  </div>
                </div>
              </div>
            </div>

            {/* Statistics grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg bg-zinc-900/50 p-3">
                <div className="text-xs text-zinc-500 mb-1">Your Results</div>
                <div className="text-xl font-bold text-zinc-100">
                  {hitsNum} / {trialsNum}
                </div>
                <div className="text-sm text-zinc-400">
                  {(stats.observedProportion * 100).toFixed(1)}% hit rate
                </div>
              </div>

              <div className="rounded-lg bg-zinc-900/50 p-3">
                <div className="text-xs text-zinc-500 mb-1">Expected by Chance</div>
                <div className="text-xl font-bold text-zinc-100">
                  {Math.round(trialsNum * expectedProportion)} / {trialsNum}
                </div>
                <div className="text-sm text-zinc-400">
                  {(expectedProportion * 100).toFixed(0)}% baseline
                </div>
              </div>

              <div className="rounded-lg bg-zinc-900/50 p-3">
                <div className="text-xs text-zinc-500 mb-1">P-Value</div>
                <div className={`text-xl font-bold ${getPValueExplanation(stats.pValue).color}`}>
                  {formatPValue(stats.pValue)}
                </div>
                <div className="text-sm text-zinc-400">
                  {getPValueExplanation(stats.pValue).text}
                </div>
              </div>

              <div className="rounded-lg bg-zinc-900/50 p-3">
                <div className="text-xs text-zinc-500 mb-1">Effect Size</div>
                <div className="text-xl font-bold text-zinc-100">
                  {stats.effectSize.toFixed(3)}
                </div>
                <div className="text-sm text-zinc-400">
                  {getEffectSizeLabel(stats.effectSize)} (Cohen&apos;s h)
                </div>
              </div>
            </div>

            {/* Technical details collapse */}
            <details className="text-sm">
              <summary className="cursor-pointer text-zinc-500 hover:text-zinc-300">
                View technical details
              </summary>
              <div className="mt-2 rounded-lg bg-zinc-900/50 p-3 font-mono text-xs text-zinc-400">
                <div>n = {trialsNum}</div>
                <div>k = {hitsNum}</div>
                <div>p̂ = {stats.observedProportion.toFixed(4)}</div>
                <div>p₀ = {expectedProportion.toFixed(2)}</div>
                <div>z = {stats.zScore.toFixed(4)}</div>
                <div>p = {stats.pValue.toFixed(6)}</div>
                <div>h = {stats.effectSize.toFixed(4)}</div>
                <div>95% CI: [{stats.confidenceInterval.lower.toFixed(4)}, {stats.confidenceInterval.upper.toFixed(4)}]</div>
              </div>
            </details>
          </div>

          {/* Description preview */}
          <div>
            <div className="text-sm font-medium text-zinc-300 mb-2">Your Description</div>
            <div className="rounded-lg border border-zinc-700 bg-zinc-800/30 p-4 text-sm text-zinc-300">
              {description}
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
              {error}
            </div>
          )}
        </div>
      )}

      {/* Navigation buttons */}
      <div className="flex items-center justify-between pt-4 border-t border-zinc-700">
        <button
          onClick={step === 1 ? onCancel : handleBack}
          className="rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-700"
        >
          {step === 1 ? 'Cancel' : 'Back'}
        </button>

        {step < 3 ? (
          <button
            onClick={handleNext}
            disabled={step === 1 ? !canProceedStep1 : !canProceedStep2}
            className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Continue
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="rounded-lg bg-emerald-600 px-6 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Result'}
          </button>
        )}
      </div>
    </div>
  );
}
