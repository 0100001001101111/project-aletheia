'use client';

/**
 * SimpleSubmissionWizard
 * 3-step wizard for non-experts
 * Maximum score capped at 6.0
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { InvestigationType } from '@/types/database';
import { calculateSimpleScore, type SimpleSubmissionData } from '@/lib/simple-scoring';
import { SimpleScorePreview } from './SimpleScorePreview';

type SimpleStep = 1 | 2 | 3;

const STEP_TITLES: Record<SimpleStep, string> = {
  1: 'What Happened',
  2: 'Basic Details',
  3: 'Review & Submit',
};

const DOMAIN_OPTIONS: { value: InvestigationType; label: string; description: string }[] = [
  { value: 'nde', label: 'Near-Death Experience', description: 'Cardiac arrest, coma, or close brush with death' },
  { value: 'ufo', label: 'UAP/UFO Sighting', description: 'Unidentified aerial phenomenon' },
  { value: 'crisis_apparition', label: 'Crisis Apparition', description: 'Seeing someone at moment of their death/crisis' },
  { value: 'ganzfeld', label: 'Telepathy/Psi Experience', description: 'Information transfer without known means' },
  { value: 'geophysical', label: 'Geophysical Anomaly', description: 'EM fields, temperature drops, equipment malfunction' },
  { value: 'stargate', label: 'Remote Viewing', description: 'Perceiving distant/hidden targets' },
];

const EVIDENCE_OPTIONS = [
  { value: 'photo', label: 'Photo' },
  { value: 'video', label: 'Video' },
  { value: 'audio', label: 'Audio Recording' },
  { value: 'document', label: 'Document' },
  { value: 'physical', label: 'Physical Evidence' },
  { value: 'testimony', label: 'Written Testimony' },
];

interface SimpleWizardState {
  currentStep: SimpleStep;
  domain: InvestigationType | null;
  narrative: string;
  eventDate: string;
  eventLocation: string;
  hasWitnesses: boolean;
  witnessCount: number;
  hasEvidence: boolean;
  evidenceTypes: string[];
}

interface SimpleSubmissionWizardProps {
  onComplete?: () => void;
  onCancel?: () => void;
  onSwitchToFull?: () => void;
}

export function SimpleSubmissionWizard({
  onComplete,
  onCancel,
  onSwitchToFull,
}: SimpleSubmissionWizardProps) {
  const router = useRouter();
  const [state, setState] = useState<SimpleWizardState>({
    currentStep: 1,
    domain: null,
    narrative: '',
    eventDate: '',
    eventLocation: '',
    hasWitnesses: false,
    witnessCount: 0,
    hasEvidence: false,
    evidenceTypes: [],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const goNext = () => {
    if (state.currentStep < 3) {
      setState((prev) => ({ ...prev, currentStep: (prev.currentStep + 1) as SimpleStep }));
    }
  };

  const goBack = () => {
    if (state.currentStep > 1) {
      setState((prev) => ({ ...prev, currentStep: (prev.currentStep - 1) as SimpleStep }));
    }
  };

  const canProceed = (): boolean => {
    switch (state.currentStep) {
      case 1:
        return !!state.domain && state.narrative.trim().length >= 20;
      case 2:
        return true; // Optional fields
      case 3:
        return true;
      default:
        return false;
    }
  };

  const getSubmissionData = (): SimpleSubmissionData => ({
    narrative: state.narrative,
    eventDate: state.eventDate || null,
    eventLocation: state.eventLocation || null,
    hasWitnesses: state.hasWitnesses,
    witnessCount: state.witnessCount,
    hasEvidence: state.hasEvidence,
    evidenceTypes: state.evidenceTypes,
  });

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const submissionData = getSubmissionData();
      const scoreBreakdown = calculateSimpleScore(submissionData);

      const response = await fetch('/api/submissions/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          investigationType: state.domain,
          submissionMode: 'simple',
          basicInfo: {
            title: `${state.domain?.toUpperCase()} Experience Report`,
            eventDate: state.eventDate || null,
            eventLocation: state.eventLocation || null,
            summary: state.narrative,
          },
          witnesses: state.hasWitnesses
            ? [
                {
                  identityType: 'anonymous',
                  role: 'primary_direct',
                  verificationStatus: 'claimed_only',
                },
              ]
            : [],
          domainData: {},
          evidence: state.evidenceTypes.map((type) => ({
            category: type === 'photo' || type === 'video' ? 'contemporary_photo_video' : 'other',
            daysFromEvent: null,
            isPrimarySource: true,
            independentlyVerified: false,
          })),
          environmentalData: {},
          simpleScoreBreakdown: scoreBreakdown,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Submission failed');
      }

      const result = await response.json();
      sessionStorage.setItem(
        'submissionResult',
        JSON.stringify({
          ...result,
          submissionMode: 'simple',
        })
      );

      if (onComplete) {
        onComplete();
      } else {
        router.push('/dashboard');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submission failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStep1 = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-zinc-100">What did you experience?</h2>
        <p className="mt-2 text-zinc-400">
          Select the type that best matches and describe what happened in your own words.
        </p>
      </div>

      {/* Domain Selection */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-zinc-300">Type of Experience</label>
        <div className="grid gap-2 sm:grid-cols-2">
          {DOMAIN_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setState((prev) => ({ ...prev, domain: option.value }))}
              className={`rounded-lg border p-3 text-left transition-colors ${
                state.domain === option.value
                  ? 'border-violet-500 bg-violet-500/10'
                  : 'border-zinc-700 bg-zinc-800/50 hover:bg-zinc-800'
              }`}
            >
              <div className="font-medium text-zinc-200">{option.label}</div>
              <div className="text-xs text-zinc-500">{option.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Narrative */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-zinc-300">
          Describe what happened <span className="text-zinc-500">(minimum 20 words)</span>
        </label>
        <textarea
          value={state.narrative}
          onChange={(e) => setState((prev) => ({ ...prev, narrative: e.target.value }))}
          placeholder="Tell us what you experienced in your own words. Include details like where you were, what you saw/heard/felt, and how long it lasted..."
          rows={8}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-zinc-100 placeholder-zinc-500 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
        />
        <div className="text-xs text-zinc-500">
          {state.narrative.split(/\s+/).filter(Boolean).length} words
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-zinc-100">Basic Details</h2>
        <p className="mt-2 text-zinc-400">
          Optional information that helps us understand and classify your experience.
        </p>
      </div>

      {/* Date */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-zinc-300">When did this happen?</label>
        <input
          type="date"
          value={state.eventDate}
          onChange={(e) => setState((prev) => ({ ...prev, eventDate: e.target.value }))}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-zinc-100 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
        />
      </div>

      {/* Location */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-zinc-300">Where did this happen?</label>
        <input
          type="text"
          value={state.eventLocation}
          onChange={(e) => setState((prev) => ({ ...prev, eventLocation: e.target.value }))}
          placeholder="City, state, country or general area"
          className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-zinc-100 placeholder-zinc-500 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
        />
      </div>

      {/* Witnesses */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-zinc-300">Were there other witnesses?</label>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setState((prev) => ({ ...prev, hasWitnesses: true }))}
            className={`flex-1 rounded-lg border px-4 py-3 text-sm font-medium transition-colors ${
              state.hasWitnesses
                ? 'border-violet-500 bg-violet-500/10 text-violet-300'
                : 'border-zinc-700 bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
            }`}
          >
            Yes
          </button>
          <button
            type="button"
            onClick={() => setState((prev) => ({ ...prev, hasWitnesses: false, witnessCount: 0 }))}
            className={`flex-1 rounded-lg border px-4 py-3 text-sm font-medium transition-colors ${
              !state.hasWitnesses
                ? 'border-violet-500 bg-violet-500/10 text-violet-300'
                : 'border-zinc-700 bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
            }`}
          >
            No / Just Me
          </button>
        </div>
        {state.hasWitnesses && (
          <div className="pt-2">
            <label className="block text-sm text-zinc-400 mb-1">
              How many others witnessed it?
            </label>
            <input
              type="number"
              min={1}
              max={100}
              value={state.witnessCount || ''}
              onChange={(e) =>
                setState((prev) => ({ ...prev, witnessCount: parseInt(e.target.value) || 0 }))
              }
              className="w-32 rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-zinc-100 focus:border-violet-500 focus:outline-none"
            />
          </div>
        )}
      </div>

      {/* Evidence */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-zinc-300">
          Do you have any supporting evidence?
        </label>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setState((prev) => ({ ...prev, hasEvidence: true }))}
            className={`flex-1 rounded-lg border px-4 py-3 text-sm font-medium transition-colors ${
              state.hasEvidence
                ? 'border-violet-500 bg-violet-500/10 text-violet-300'
                : 'border-zinc-700 bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
            }`}
          >
            Yes
          </button>
          <button
            type="button"
            onClick={() =>
              setState((prev) => ({ ...prev, hasEvidence: false, evidenceTypes: [] }))
            }
            className={`flex-1 rounded-lg border px-4 py-3 text-sm font-medium transition-colors ${
              !state.hasEvidence
                ? 'border-violet-500 bg-violet-500/10 text-violet-300'
                : 'border-zinc-700 bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
            }`}
          >
            No
          </button>
        </div>
        {state.hasEvidence && (
          <div className="pt-2 space-y-2">
            <label className="block text-sm text-zinc-400">What type(s)?</label>
            <div className="flex flex-wrap gap-2">
              {EVIDENCE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    setState((prev) => ({
                      ...prev,
                      evidenceTypes: prev.evidenceTypes.includes(option.value)
                        ? prev.evidenceTypes.filter((t) => t !== option.value)
                        : [...prev.evidenceTypes, option.value],
                    }));
                  }}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                    state.evidenceTypes.includes(option.value)
                      ? 'border-violet-500 bg-violet-500/20 text-violet-300'
                      : 'border-zinc-600 text-zinc-400 hover:border-zinc-500'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderStep3 = () => {
    const submissionData = getSubmissionData();
    const scoreBreakdown = calculateSimpleScore(submissionData);

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-zinc-100">Review & Submit</h2>
          <p className="mt-2 text-zinc-400">
            Review your estimated score. Simple mode submissions are capped at 6.0.
          </p>
        </div>

        <SimpleScorePreview scoreBreakdown={scoreBreakdown} />

        {/* Summary */}
        <div className="rounded-xl border border-zinc-700 bg-zinc-900/50 p-4">
          <h3 className="font-medium text-zinc-200 mb-3">Your Submission</h3>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-zinc-500">Domain</dt>
              <dd className="text-zinc-200 capitalize">{state.domain?.replace('_', ' ')}</dd>
            </div>
            {state.eventDate && (
              <div className="flex justify-between">
                <dt className="text-zinc-500">Date</dt>
                <dd className="text-zinc-200">{new Date(state.eventDate).toLocaleDateString()}</dd>
              </div>
            )}
            {state.eventLocation && (
              <div className="flex justify-between">
                <dt className="text-zinc-500">Location</dt>
                <dd className="text-zinc-200">{state.eventLocation}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-zinc-500">Witnesses</dt>
              <dd className="text-zinc-200">
                {state.hasWitnesses ? `${state.witnessCount} other(s)` : 'None'}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-zinc-500">Evidence</dt>
              <dd className="text-zinc-200">
                {state.hasEvidence ? state.evidenceTypes.join(', ') || 'Yes' : 'None'}
              </dd>
            </div>
          </dl>
        </div>

        {/* Full Mode Upgrade CTA */}
        {scoreBreakdown.finalScore >= 5.0 && onSwitchToFull && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
            <div className="flex items-start gap-3">
              <div className="text-amber-400">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-medium text-amber-300">Want a higher score?</h4>
                <p className="mt-1 text-xs text-zinc-400">
                  Your experience has good potential. Switch to Full Mode to add detailed witness
                  profiles and evidence documentation for scores up to 10.0.
                </p>
                <button
                  onClick={onSwitchToFull}
                  className="mt-2 text-sm text-amber-400 hover:text-amber-300"
                >
                  Switch to Full Mode →
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Progress bar */}
      <div className="border-b border-zinc-800 bg-zinc-900/50">
        <div className="mx-auto max-w-2xl px-4 py-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-zinc-200">Step {state.currentStep}/3</span>
            <span className="text-sm text-zinc-400">{STEP_TITLES[state.currentStep]}</span>
          </div>
          <div className="h-2 bg-zinc-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-violet-500 transition-all"
              style={{ width: `${(state.currentStep / 3) * 100}%` }}
            />
          </div>

          {/* Simple Mode Badge */}
          <div className="mt-3 flex items-center justify-between">
            <div className="inline-flex items-center gap-2 rounded-full bg-zinc-800 px-3 py-1 text-xs">
              <span className="h-2 w-2 rounded-full bg-amber-400" />
              <span className="text-zinc-400">Quick Submit Mode</span>
              <span className="text-zinc-600">|</span>
              <span className="text-zinc-500">Max score: 6.0</span>
            </div>
            {onSwitchToFull && (
              <button
                onClick={onSwitchToFull}
                className="text-xs text-zinc-500 hover:text-zinc-300"
              >
                Switch to Full Mode
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="border-b border-red-500/30 bg-red-500/10 px-4 py-3">
          <div className="mx-auto max-w-2xl flex items-center justify-between">
            <span className="text-sm text-red-400">{error}</span>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Submitting overlay */}
      {isSubmitting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80">
          <div className="text-center">
            <div className="h-12 w-12 mx-auto animate-spin rounded-full border-4 border-violet-500 border-t-transparent" />
            <p className="mt-4 text-zinc-300">Submitting...</p>
          </div>
        </div>
      )}

      {/* Step content */}
      <div className="mx-auto max-w-2xl px-4 py-8">
        {state.currentStep === 1 && renderStep1()}
        {state.currentStep === 2 && renderStep2()}
        {state.currentStep === 3 && renderStep3()}

        {/* Navigation */}
        <div className="mt-8 flex justify-between">
          {state.currentStep > 1 ? (
            <button
              onClick={goBack}
              className="rounded-lg border border-zinc-700 bg-zinc-800 px-6 py-3 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-700"
            >
              Back
            </button>
          ) : (
            <button
              onClick={onCancel}
              className="rounded-lg border border-zinc-700 bg-zinc-800 px-6 py-3 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-700"
            >
              Cancel
            </button>
          )}

          {state.currentStep < 3 ? (
            <button
              onClick={goNext}
              disabled={!canProceed()}
              className={`rounded-lg px-6 py-3 text-sm font-medium text-white transition-colors ${
                canProceed()
                  ? 'bg-violet-600 hover:bg-violet-500'
                  : 'bg-zinc-600 cursor-not-allowed'
              }`}
            >
              Continue
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="rounded-lg bg-violet-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-violet-500 disabled:bg-zinc-600"
            >
              Submit Report
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
