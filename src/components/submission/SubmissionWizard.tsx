'use client';

/**
 * SubmissionWizard
 * Multi-step wizard for data submission
 */

import { useState, useCallback } from 'react';
import type { InvestigationType } from '@/types/database';
import type { ParseResult } from '@/lib/parser';
import type { TriageBreakdown } from '@/lib/triage';
import { SchemaSelector } from './SchemaSelector';
import { DataUploader } from './DataUploader';
import { NarrativeParser } from './NarrativeParser';
import { DataEditor } from './DataEditor';
import { ValidationResults } from './ValidationResults';
import { TriagePreview } from './TriagePreview';
import { SubmissionConfirm } from './SubmissionConfirm';

export type WizardStep =
  | 'select-type'
  | 'upload-data'
  | 'parse-narrative'
  | 'edit-data'
  | 'validate'
  | 'triage-preview'
  | 'confirm';

const STEPS: WizardStep[] = [
  'select-type',
  'upload-data',
  'parse-narrative',
  'edit-data',
  'validate',
  'triage-preview',
  'confirm',
];

const STEP_TITLES: Record<WizardStep, string> = {
  'select-type': 'Select Investigation Type',
  'upload-data': 'Upload Data',
  'parse-narrative': 'Parse Narrative',
  'edit-data': 'Edit Data',
  'validate': 'Validation',
  'triage-preview': 'Triage Preview',
  'confirm': 'Confirm Submission',
};

export interface WizardState {
  schemaType: InvestigationType | null;
  uploadedFile: File | null;
  narrative: string;
  parsedData: Record<string, unknown>;
  manualEdits: Record<string, unknown>;
  parseResult: ParseResult | null;
  triageScore: TriageBreakdown | null;
  validationErrors: Array<{ path: string; message: string }>;
}

interface SubmissionWizardProps {
  onComplete?: (data: WizardState) => void;
  onCancel?: () => void;
}

export function SubmissionWizard({ onComplete, onCancel }: SubmissionWizardProps) {
  const [currentStep, setCurrentStep] = useState<WizardStep>('select-type');
  const [state, setState] = useState<WizardState>({
    schemaType: null,
    uploadedFile: null,
    narrative: '',
    parsedData: {},
    manualEdits: {},
    parseResult: null,
    triageScore: null,
    validationErrors: [],
  });

  const currentStepIndex = STEPS.indexOf(currentStep);

  const goToStep = useCallback((step: WizardStep) => {
    setCurrentStep(step);
  }, []);

  const goNext = useCallback(() => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < STEPS.length) {
      setCurrentStep(STEPS[nextIndex]);
    }
  }, [currentStepIndex]);

  const goBack = useCallback(() => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(STEPS[prevIndex]);
    }
  }, [currentStepIndex]);

  const updateState = useCallback((updates: Partial<WizardState>) => {
    setState((prev) => ({ ...prev, ...updates }));
  }, []);

  const handleSchemaSelect = useCallback(
    (type: InvestigationType) => {
      updateState({ schemaType: type });
      goNext();
    },
    [updateState, goNext]
  );

  const handleFileUpload = useCallback(
    (file: File | null, extractedText: string) => {
      updateState({
        uploadedFile: file,
        narrative: extractedText || state.narrative,
      });
    },
    [updateState, state.narrative]
  );

  const handleParseComplete = useCallback(
    (result: ParseResult, triage: TriageBreakdown) => {
      updateState({
        parseResult: result,
        parsedData: result.data,
        triageScore: triage,
      });
      goNext();
    },
    [updateState, goNext]
  );

  const handleDataEdit = useCallback(
    (data: Record<string, unknown>) => {
      updateState({ manualEdits: data });
    },
    [updateState]
  );

  const handleValidation = useCallback(
    (errors: Array<{ path: string; message: string }>, triage: TriageBreakdown) => {
      updateState({
        validationErrors: errors,
        triageScore: triage,
      });
    },
    [updateState]
  );

  const handleSubmit = useCallback(async () => {
    if (onComplete) {
      onComplete(state);
    }
  }, [onComplete, state]);

  const canProceed = useCallback((): boolean => {
    switch (currentStep) {
      case 'select-type':
        return state.schemaType !== null;
      case 'upload-data':
        return true; // Optional step
      case 'parse-narrative':
        return state.parseResult !== null;
      case 'edit-data':
        return true;
      case 'validate':
        return state.validationErrors.length === 0;
      case 'triage-preview':
        return state.triageScore !== null;
      case 'confirm':
        return true;
      default:
        return false;
    }
  }, [currentStep, state]);

  const renderStepContent = () => {
    switch (currentStep) {
      case 'select-type':
        return (
          <SchemaSelector
            selected={state.schemaType}
            onSelect={handleSchemaSelect}
          />
        );

      case 'upload-data':
        return (
          <DataUploader
            onUpload={handleFileUpload}
            uploadedFile={state.uploadedFile}
            onNext={goNext}
            onBack={goBack}
          />
        );

      case 'parse-narrative':
        return (
          <NarrativeParser
            schemaType={state.schemaType!}
            initialNarrative={state.narrative}
            onParseComplete={handleParseComplete}
            onBack={goBack}
          />
        );

      case 'edit-data':
        return (
          <DataEditor
            schemaType={state.schemaType!}
            parsedData={state.parsedData}
            parseResult={state.parseResult}
            onDataChange={handleDataEdit}
            onNext={goNext}
            onBack={goBack}
          />
        );

      case 'validate':
        return (
          <ValidationResults
            schemaType={state.schemaType!}
            data={{ ...state.parsedData, ...state.manualEdits }}
            onValidation={handleValidation}
            onNext={goNext}
            onBack={goBack}
          />
        );

      case 'triage-preview':
        return (
          <TriagePreview
            triageScore={state.triageScore!}
            onNext={goNext}
            onBack={goBack}
          />
        );

      case 'confirm':
        return (
          <SubmissionConfirm
            state={state}
            onSubmit={handleSubmit}
            onBack={goBack}
            onCancel={onCancel}
          />
        );

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
            {STEPS.map((step, index) => (
              <div key={step} className="flex items-center">
                <button
                  onClick={() => index < currentStepIndex && goToStep(step)}
                  disabled={index > currentStepIndex}
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors ${
                    index === currentStepIndex
                      ? 'bg-violet-600 text-white'
                      : index < currentStepIndex
                        ? 'bg-emerald-600 text-white hover:bg-emerald-500'
                        : 'bg-zinc-700 text-zinc-400'
                  }`}
                >
                  {index < currentStepIndex ? (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    index + 1
                  )}
                </button>
                {index < STEPS.length - 1 && (
                  <div
                    className={`mx-2 h-0.5 w-8 lg:w-16 ${
                      index < currentStepIndex ? 'bg-emerald-600' : 'bg-zinc-700'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="mt-2 text-center">
            <span className="text-sm text-zinc-400">
              Step {currentStepIndex + 1} of {STEPS.length}:
            </span>{' '}
            <span className="text-sm font-medium text-zinc-200">
              {STEP_TITLES[currentStep]}
            </span>
          </div>
        </div>
      </div>

      {/* Step content */}
      <div className="mx-auto max-w-4xl px-4 py-8">{renderStepContent()}</div>
    </div>
  );
}
