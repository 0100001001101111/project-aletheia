'use client';

/**
 * ValidationResults
 * Step 5: Validate data against schema
 */

import { useEffect, useState, useCallback } from 'react';
import type { InvestigationType } from '@/types/database';
import type { TriageBreakdown } from '@/lib/triage';
import { validateData, formatZodErrors, SCHEMA_METADATA, REQUIRED_FIELDS } from '@/schemas';
import { calculateTriageScore } from '@/lib/triage';

interface ValidationResultsProps {
  schemaType: InvestigationType;
  data: Record<string, unknown>;
  onValidation: (errors: Array<{ path: string; message: string }>, triage: TriageBreakdown) => void;
  onNext: () => void;
  onBack: () => void;
}

export function ValidationResults({
  schemaType,
  data,
  onValidation,
  onNext,
  onBack,
}: ValidationResultsProps) {
  const [validationErrors, setValidationErrors] = useState<Array<{ path: string; message: string }>>([]);
  const [isValid, setIsValid] = useState(false);
  const [triage, setTriage] = useState<TriageBreakdown | null>(null);

  const metadata = SCHEMA_METADATA[schemaType];
  const requiredFields = REQUIRED_FIELDS[schemaType];

  // Run validation on mount
  useEffect(() => {
    const result = validateData(schemaType, data);
    const errors = result.errors ? formatZodErrors(result.errors) : [];
    const triageScore = calculateTriageScore(data, schemaType);

    setValidationErrors(errors);
    setIsValid(result.success);
    setTriage(triageScore);
    onValidation(errors, triageScore);
  }, [schemaType, data, onValidation]);

  const handleContinue = useCallback(() => {
    onNext();
  }, [onNext]);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-zinc-100">Validation Results</h2>
        <p className="mt-2 text-zinc-400">
          Checking your data against the {metadata.name} schema
        </p>
      </div>

      {/* Overall status */}
      <div
        className={`rounded-xl border p-6 text-center ${
          isValid
            ? 'border-emerald-500/30 bg-emerald-500/10'
            : 'border-amber-500/30 bg-amber-500/10'
        }`}
      >
        <div
          className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${
            isValid ? 'bg-emerald-500/20' : 'bg-amber-500/20'
          }`}
        >
          {isValid ? (
            <svg className="h-8 w-8 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="h-8 w-8 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          )}
        </div>
        <h3 className={`mt-4 text-xl font-semibold ${isValid ? 'text-emerald-400' : 'text-amber-400'}`}>
          {isValid ? 'All Validations Passed' : 'Validation Warnings'}
        </h3>
        <p className={`mt-2 text-sm ${isValid ? 'text-emerald-300/80' : 'text-amber-300/80'}`}>
          {isValid
            ? 'Your data meets all schema requirements'
            : 'Some issues were found but you can still submit'}
        </p>
      </div>

      {/* Validation errors */}
      {validationErrors.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-zinc-300">Issues Found</h4>
          <div className="space-y-2">
            {validationErrors.map((error, i) => (
              <div
                key={i}
                className="flex items-start gap-3 rounded-lg border border-red-500/30 bg-red-500/10 p-3"
              >
                <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                <div>
                  <code className="text-xs text-red-300">{error.path || 'root'}</code>
                  <p className="text-sm text-red-200">{error.message}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Required fields checklist */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-zinc-300">Required Fields</h4>
        <div className="grid gap-2 md:grid-cols-2">
          {requiredFields.map((field) => {
            const hasValue = checkFieldPresent(data, field);
            return (
              <div
                key={field}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 ${
                  hasValue ? 'bg-emerald-500/10' : 'bg-zinc-800/50'
                }`}
              >
                {hasValue ? (
                  <svg className="h-4 w-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="h-4 w-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                  </svg>
                )}
                <code className={`text-xs ${hasValue ? 'text-emerald-400' : 'text-zinc-500'}`}>
                  {field}
                </code>
              </div>
            );
          })}
        </div>
      </div>

      {/* Triage score preview */}
      {triage && (
        <div className="rounded-xl border border-zinc-700 bg-zinc-900/50 p-6">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-zinc-300">Preliminary Triage Score</h4>
            <div className="text-right">
              <span className="text-3xl font-bold text-violet-400">{triage.overall}</span>
              <span className="text-lg text-zinc-500">/10</span>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-lg font-semibold text-zinc-200">
                {triage.sourceIntegrity.score}/{triage.sourceIntegrity.max}
              </div>
              <div className="text-xs text-zinc-500">Source</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-zinc-200">
                {triage.methodology.score}/{triage.methodology.max}
              </div>
              <div className="text-xs text-zinc-500">Method</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-zinc-200">
                {triage.variableCapture.score}/{triage.variableCapture.max}
              </div>
              <div className="text-xs text-zinc-500">Variables</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-zinc-200">
                {triage.dataQuality.score}/{triage.dataQuality.max}
              </div>
              <div className="text-xs text-zinc-500">Data</div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation buttons */}
      <div className="flex justify-between">
        <button
          onClick={onBack}
          className="rounded-lg border border-zinc-700 bg-zinc-800 px-6 py-3 font-medium text-zinc-300 transition-colors hover:bg-zinc-700"
        >
          Back to Edit
        </button>
        <button
          onClick={handleContinue}
          className="rounded-lg bg-violet-600 px-6 py-3 font-medium text-white transition-colors hover:bg-violet-500"
        >
          Continue
        </button>
      </div>
    </div>
  );
}

// Helper to check if a nested field has a value
function checkFieldPresent(data: Record<string, unknown>, path: string): boolean {
  const parts = path.split('.');
  let current: unknown = data;

  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return false;
    }
    current = (current as Record<string, unknown>)[part];
  }

  if (current === null || current === undefined) return false;
  if (typeof current === 'string' && current.trim() === '') return false;
  if (Array.isArray(current) && current.length === 0) return false;

  return true;
}
