'use client';

/**
 * NewSubmissionWizard
 * 7-step submission wizard with draft save/resume
 */

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { InvestigationType } from '@/types/database';
import { DomainSelector, type AiClassificationResult } from './DomainSelector';
import { BasicInfoForm, type BasicInfoData } from './BasicInfoForm';
import { WitnessesForm, type Witness } from './WitnessesForm';
import { UAP_FieldsForm, type UAPDomainData, createEmptyUAPData } from './UAP_FieldsForm';
import { EvidenceForm, type EvidenceItem } from './EvidenceForm';
import { ScorePreview } from './ScorePreview';

export type WizardStep = 1 | 2 | 3 | 4 | 5 | 6 | 7;

const STEP_TITLES: Record<WizardStep, string> = {
  1: 'Domain Selection',
  2: 'Basic Information',
  3: 'Witnesses & Sources',
  4: 'Domain-Specific Details',
  5: 'Evidence Attachment',
  6: 'Score Preview',
  7: 'Confirmation',
};

export interface WizardState {
  draftId: string | null;
  currentStep: WizardStep;
  investigationType: InvestigationType | null;
  aiClassification: AiClassificationResult | null;
  basicInfo: BasicInfoData;
  witnesses: Witness[];
  domainData: UAPDomainData;
  evidence: EvidenceItem[];
  environmentalData: Record<string, unknown>;
  lastSaved: Date | null;
}

const createInitialState = (): WizardState => ({
  draftId: null,
  currentStep: 1,
  investigationType: null,
  aiClassification: null,
  basicInfo: {
    title: '',
    eventDate: '',
    eventDateApproximate: false,
    eventLocation: '',
    latitude: null,
    longitude: null,
    summary: '',
  },
  witnesses: [],
  domainData: createEmptyUAPData(),
  evidence: [],
  environmentalData: {},
  lastSaved: null,
});

interface NewSubmissionWizardProps {
  draftId?: string | null;
  onComplete?: () => void;
  onCancel?: () => void;
}

export function NewSubmissionWizard({ draftId, onComplete, onCancel }: NewSubmissionWizardProps) {
  const router = useRouter();
  const [state, setState] = useState<WizardState>(createInitialState);
  const [isLoading, setIsLoading] = useState(!!draftId);
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingEnvironmental, setIsLoadingEnvironmental] = useState(false);

  // Load draft if draftId provided
  useEffect(() => {
    if (draftId) {
      loadDraft(draftId);
    }
  }, [draftId]);

  const loadDraft = async (id: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/submissions/drafts/${id}`);
      if (!response.ok) throw new Error('Failed to load draft');
      const draft = await response.json();

      setState({
        draftId: id,
        currentStep: draft.current_step || 1,
        investigationType: draft.investigation_type,
        aiClassification: draft.domain_ai_suggestion,
        basicInfo: {
          title: draft.title || '',
          eventDate: draft.event_date || '',
          eventDateApproximate: draft.event_date_approximate || false,
          eventLocation: draft.event_location || '',
          latitude: draft.latitude,
          longitude: draft.longitude,
          summary: draft.summary || '',
        },
        witnesses: draft.witnesses || [],
        domainData: draft.domain_data || createEmptyUAPData(),
        evidence: draft.evidence || [],
        environmentalData: draft.environmental_data || {},
        lastSaved: new Date(draft.updated_at),
      });
    } catch {
      setError('Failed to load draft. Starting fresh.');
      setState(createInitialState());
    } finally {
      setIsLoading(false);
    }
  };

  const saveDraft = useCallback(async () => {
    setIsSaving(true);
    try {
      const draftData = {
        current_step: state.currentStep,
        investigation_type: state.investigationType,
        domain_ai_suggestion: state.aiClassification,
        title: state.basicInfo.title,
        event_date: state.basicInfo.eventDate || null,
        event_date_approximate: state.basicInfo.eventDateApproximate,
        event_location: state.basicInfo.eventLocation,
        latitude: state.basicInfo.latitude,
        longitude: state.basicInfo.longitude,
        summary: state.basicInfo.summary,
        witnesses: state.witnesses,
        domain_data: state.domainData,
        evidence: state.evidence,
        environmental_data: state.environmentalData,
      };

      let response;
      if (state.draftId) {
        response = await fetch(`/api/submissions/drafts/${state.draftId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(draftData),
        });
      } else {
        response = await fetch('/api/submissions/drafts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(draftData),
        });
      }

      if (!response.ok) throw new Error('Failed to save draft');
      const result = await response.json();

      setState(prev => ({
        ...prev,
        draftId: result.id,
        lastSaved: new Date(),
      }));
    } catch {
      setError('Failed to save draft');
    } finally {
      setIsSaving(false);
    }
  }, [state]);

  // Auto-save on step change
  useEffect(() => {
    if (state.currentStep > 1 && state.investigationType) {
      const timer = setTimeout(() => {
        saveDraft();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [state.currentStep, saveDraft, state.investigationType]);

  // Fetch environmental data when coordinates change
  useEffect(() => {
    if (state.basicInfo.latitude && state.basicInfo.longitude && state.basicInfo.eventDate) {
      fetchEnvironmentalData();
    }
  }, [state.basicInfo.latitude, state.basicInfo.longitude, state.basicInfo.eventDate]);

  const fetchEnvironmentalData = async () => {
    if (!state.basicInfo.latitude || !state.basicInfo.longitude) return;

    setIsLoadingEnvironmental(true);
    try {
      const response = await fetch('/api/environmental/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          latitude: state.basicInfo.latitude,
          longitude: state.basicInfo.longitude,
          date: state.basicInfo.eventDate,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setState(prev => ({
          ...prev,
          environmentalData: data,
        }));
      }
    } catch {
      // Silently fail - environmental data is optional
    } finally {
      setIsLoadingEnvironmental(false);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/submissions/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          draftId: state.draftId,
          investigationType: state.investigationType,
          basicInfo: state.basicInfo,
          witnesses: state.witnesses,
          domainData: state.domainData,
          evidence: state.evidence,
          environmentalData: state.environmentalData,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Submission failed');
      }

      const result = await response.json();

      // Move to confirmation step
      setState(prev => ({
        ...prev,
        currentStep: 7,
      }));

      // Store result for confirmation display
      sessionStorage.setItem('submissionResult', JSON.stringify(result));

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submission failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const goToStep = (step: WizardStep) => {
    setState(prev => ({ ...prev, currentStep: step }));
  };

  const goNext = () => {
    if (state.currentStep < 7) {
      setState(prev => ({ ...prev, currentStep: (prev.currentStep + 1) as WizardStep }));
    }
  };

  const goBack = () => {
    if (state.currentStep > 1) {
      setState(prev => ({ ...prev, currentStep: (prev.currentStep - 1) as WizardStep }));
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-500 border-t-transparent" />
          <p className="mt-4 text-zinc-400">Loading draft...</p>
        </div>
      </div>
    );
  }

  const renderStepContent = () => {
    switch (state.currentStep) {
      case 1:
        return (
          <DomainSelector
            selected={state.investigationType}
            onSelect={(type) => {
              setState(prev => ({ ...prev, investigationType: type }));
              goNext();
            }}
            onAiClassification={(result) => {
              setState(prev => ({ ...prev, aiClassification: result }));
            }}
          />
        );

      case 2:
        return (
          <BasicInfoForm
            data={state.basicInfo}
            onChange={(basicInfo) => setState(prev => ({ ...prev, basicInfo }))}
            onNext={goNext}
            onBack={goBack}
            isLoadingEnvironmental={isLoadingEnvironmental}
          />
        );

      case 3:
        return (
          <WitnessesForm
            witnesses={state.witnesses}
            onChange={(witnesses) => setState(prev => ({ ...prev, witnesses }))}
            onNext={goNext}
            onBack={goBack}
          />
        );

      case 4:
        // For now, only UAP has domain-specific fields
        // Other domains would have their own forms
        if (state.investigationType === 'ufo') {
          return (
            <UAP_FieldsForm
              data={state.domainData}
              onChange={(domainData) => setState(prev => ({ ...prev, domainData }))}
              onNext={goNext}
              onBack={goBack}
            />
          );
        }
        // For other domains, skip to evidence
        goNext();
        return null;

      case 5:
        return (
          <EvidenceForm
            evidence={state.evidence}
            eventDate={state.basicInfo.eventDate}
            onChange={(evidence) => setState(prev => ({ ...prev, evidence }))}
            onNext={goNext}
            onBack={goBack}
          />
        );

      case 6:
        return (
          <ScorePreview
            investigationType={state.investigationType!}
            basicInfo={state.basicInfo}
            witnesses={state.witnesses}
            domainData={state.domainData}
            evidence={state.evidence}
            onNext={handleSubmit}
            onBack={goBack}
            onSaveDraft={saveDraft}
          />
        );

      case 7:
        return <ConfirmationStep onComplete={onComplete} />;

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Progress bar */}
      <div className="border-b border-zinc-800 bg-zinc-900/50">
        <div className="mx-auto max-w-4xl px-4 py-4">
          <div className="flex items-center justify-between">
            {([1, 2, 3, 4, 5, 6, 7] as WizardStep[]).map((step) => (
              <div key={step} className="flex items-center">
                <button
                  onClick={() => step < state.currentStep && goToStep(step)}
                  disabled={step > state.currentStep}
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors ${
                    step === state.currentStep
                      ? 'bg-violet-600 text-white'
                      : step < state.currentStep
                        ? 'bg-emerald-600 text-white hover:bg-emerald-500'
                        : 'bg-zinc-700 text-zinc-400'
                  }`}
                >
                  {step < state.currentStep ? (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    step
                  )}
                </button>
                {step < 7 && (
                  <div
                    className={`mx-1 h-0.5 w-4 lg:mx-2 lg:w-8 ${
                      step < state.currentStep ? 'bg-emerald-600' : 'bg-zinc-700'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="mt-2 flex items-center justify-between">
            <div className="text-center flex-1">
              <span className="text-sm text-zinc-400">
                Step {state.currentStep} of 7:
              </span>{' '}
              <span className="text-sm font-medium text-zinc-200">
                {STEP_TITLES[state.currentStep]}
              </span>
            </div>
            {state.lastSaved && (
              <div className="text-xs text-zinc-500">
                {isSaving ? 'Saving...' : `Saved ${state.lastSaved.toLocaleTimeString()}`}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="border-b border-red-500/30 bg-red-500/10 px-4 py-3">
          <div className="mx-auto max-w-4xl flex items-center justify-between">
            <span className="text-sm text-red-400">{error}</span>
            <button
              onClick={() => setError(null)}
              className="text-red-400 hover:text-red-300"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
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
            <p className="mt-4 text-zinc-300">Submitting investigation...</p>
          </div>
        </div>
      )}

      {/* Step content */}
      <div className="mx-auto max-w-4xl px-4 py-8">{renderStepContent()}</div>

      {/* Cancel button */}
      {state.currentStep < 7 && (
        <div className="fixed bottom-4 left-4">
          <button
            onClick={() => {
              if (confirm('Are you sure you want to cancel? Your draft will be saved.')) {
                saveDraft().then(() => {
                  if (onCancel) onCancel();
                  else router.push('/');
                });
              }
            }}
            className="rounded-lg border border-zinc-700 bg-zinc-800/80 px-4 py-2 text-sm text-zinc-400 backdrop-blur hover:bg-zinc-700 hover:text-zinc-200"
          >
            Save & Exit
          </button>
        </div>
      )}
    </div>
  );
}

function ConfirmationStep({ onComplete }: { onComplete?: () => void }) {
  const router = useRouter();
  const [result, setResult] = useState<{
    id: string;
    estimatedScore: number;
    tier: string;
  } | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem('submissionResult');
    if (stored) {
      setResult(JSON.parse(stored));
      sessionStorage.removeItem('submissionResult');
    }
  }, []);

  return (
    <div className="max-w-2xl mx-auto text-center py-12">
      <div className="mx-auto w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mb-6">
        <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>

      <h2 className="text-3xl font-bold text-zinc-100 mb-2">Submission Received</h2>

      {result && (
        <div className="mt-6 p-6 rounded-xl border border-zinc-700 bg-zinc-900/50">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <div className="text-sm text-zinc-500">Investigation ID</div>
              <div className="font-mono text-zinc-200">{result.id.slice(0, 8)}...</div>
            </div>
            <div>
              <div className="text-sm text-zinc-500">Estimated Score</div>
              <div className={`text-2xl font-bold ${
                result.tier === 'verified' ? 'text-emerald-400' :
                result.tier === 'provisional' ? 'text-amber-400' : 'text-red-400'
              }`}>
                {result.estimatedScore.toFixed(1)} ({result.tier})
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mt-8 p-6 rounded-xl border border-zinc-700 bg-zinc-800/50 text-left">
        <h3 className="font-semibold text-zinc-200 mb-4">What Happens Next</h3>
        <ol className="space-y-3 text-sm text-zinc-400">
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-violet-500/20 flex items-center justify-center text-xs text-violet-400">1</span>
            <span><strong className="text-zinc-300">AI Processing (1-24 hours)</strong> - Validate data integrity, cross-reference environmental data, check for duplicates</span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-violet-500/20 flex items-center justify-center text-xs text-violet-400">2</span>
            <span><strong className="text-zinc-300">Pattern Matching</strong> - Compare against existing investigations, identify cross-domain correlations</span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-violet-500/20 flex items-center justify-center text-xs text-violet-400">3</span>
            <span><strong className="text-zinc-300">Results Email (within 48 hours)</strong> - Final score, tier assignment, pattern matches, improvement suggestions</span>
          </li>
        </ol>
      </div>

      <div className="mt-8 flex gap-4 justify-center">
        <button
          onClick={() => router.push('/dashboard')}
          className="rounded-lg bg-violet-600 px-6 py-3 font-medium text-white hover:bg-violet-500"
        >
          Go to Dashboard
        </button>
        <button
          onClick={() => {
            if (onComplete) onComplete();
            else router.push('/investigations');
          }}
          className="rounded-lg border border-zinc-700 bg-zinc-800 px-6 py-3 font-medium text-zinc-300 hover:bg-zinc-700"
        >
          Browse Investigations
        </button>
      </div>
    </div>
  );
}
