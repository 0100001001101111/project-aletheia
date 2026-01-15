'use client';

/**
 * SubmissionConfirm
 * Step 7: Final confirmation before submission
 */

import { useState, useCallback } from 'react';
import type { WizardState } from './SubmissionWizard';
import { SCHEMA_METADATA } from '@/schemas';
import { getTriageScoreColor, getTriageStatusColor } from '@/lib/triage';

interface SubmissionConfirmProps {
  state: WizardState;
  onSubmit: () => Promise<void>;
  onBack: () => void;
  onCancel?: () => void;
}

export function SubmissionConfirm({ state, onSubmit, onBack, onCancel }: SubmissionConfirmProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submissionId, setSubmissionId] = useState<string | null>(null);

  const metadata = state.schemaType ? SCHEMA_METADATA[state.schemaType] : null;
  const scoreColor = state.triageScore ? getTriageScoreColor(state.triageScore.overall) : '';
  const statusColor = state.triageScore ? getTriageStatusColor(state.triageScore.status) : '';

  // Merge parsed data with manual edits
  const finalData = { ...state.parsedData, ...state.manualEdits };
  const fieldCount = Object.keys(finalData).length;

  const handleSubmit = useCallback(async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      // Call the submissions API
      const response = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: state.schemaType,
          title: generateTitle(state),
          raw_data: finalData,
          triage_score: state.triageScore?.overall || 0,
          triage_status: state.triageScore?.status || 'pending',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit');
      }

      setSubmissionId(data.id);
      setSuccess(true);

      // Call parent onSubmit
      await onSubmit();
    } catch (err) {
      console.error('Submission error:', err);
      setError(err instanceof Error ? err.message : 'Failed to submit');
    } finally {
      setIsSubmitting(false);
    }
  }, [state, finalData, onSubmit]);

  if (success) {
    return (
      <div className="space-y-6">
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-12 text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/20">
            <svg className="h-10 w-10 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="mt-6 text-2xl font-bold text-emerald-400">Submission Successful!</h2>
          <p className="mt-2 text-zinc-400">
            Your data has been submitted and is now part of the research database.
          </p>
          {submissionId && (
            <p className="mt-4">
              <span className="text-zinc-500">Submission ID: </span>
              <code className="rounded bg-zinc-800 px-2 py-1 text-sm text-emerald-400">
                {submissionId}
              </code>
            </p>
          )}
          <div className="mt-8 flex justify-center gap-4">
            <a
              href={`/investigations/${submissionId}`}
              className="rounded-lg bg-emerald-600 px-6 py-3 font-medium text-white transition-colors hover:bg-emerald-500"
            >
              View Submission
            </a>
            <a
              href="/submit"
              className="rounded-lg border border-zinc-700 bg-zinc-800 px-6 py-3 font-medium text-zinc-300 transition-colors hover:bg-zinc-700"
            >
              Submit Another
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-zinc-100">Confirm Submission</h2>
        <p className="mt-2 text-zinc-400">
          Review your submission before finalizing
        </p>
      </div>

      {/* Submission summary */}
      <div className="rounded-xl border border-zinc-700 bg-zinc-900/50 p-6">
        <h3 className="text-lg font-semibold text-zinc-100">Submission Summary</h3>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {/* Investigation type */}
          <div className="rounded-lg bg-zinc-800/50 p-4">
            <span className="text-xs uppercase tracking-wide text-zinc-500">Type</span>
            {metadata && (
              <div className="mt-1 flex items-center gap-2">
                <span className={`text-2xl ${metadata.color}`}>{metadata.icon}</span>
                <span className="font-medium text-zinc-200">{metadata.name}</span>
              </div>
            )}
          </div>

          {/* Triage score */}
          <div className="rounded-lg bg-zinc-800/50 p-4">
            <span className="text-xs uppercase tracking-wide text-zinc-500">Triage Score</span>
            {state.triageScore && (
              <div className="mt-1 flex items-center gap-3">
                <span className={`text-2xl font-bold ${scoreColor}`}>
                  {state.triageScore.overall}/10
                </span>
                <span className={`rounded-full border px-2 py-0.5 text-xs capitalize ${statusColor}`}>
                  {state.triageScore.status}
                </span>
              </div>
            )}
          </div>

          {/* Field count */}
          <div className="rounded-lg bg-zinc-800/50 p-4">
            <span className="text-xs uppercase tracking-wide text-zinc-500">Fields</span>
            <div className="mt-1 text-xl font-medium text-zinc-200">
              {fieldCount} fields populated
            </div>
          </div>

          {/* Validation status */}
          <div className="rounded-lg bg-zinc-800/50 p-4">
            <span className="text-xs uppercase tracking-wide text-zinc-500">Validation</span>
            <div className="mt-1 flex items-center gap-2">
              {state.validationErrors.length === 0 ? (
                <>
                  <svg className="h-5 w-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="font-medium text-emerald-400">All validations passed</span>
                </>
              ) : (
                <>
                  <svg className="h-5 w-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span className="font-medium text-amber-400">
                    {state.validationErrors.length} warnings
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Data preview (collapsible) */}
      <details className="rounded-xl border border-zinc-700 bg-zinc-900/50">
        <summary className="cursor-pointer px-6 py-4 text-sm font-medium text-zinc-300 hover:text-zinc-100">
          View Data Preview ({fieldCount} fields)
        </summary>
        <div className="border-t border-zinc-700 px-6 py-4">
          <pre className="max-h-64 overflow-auto rounded-lg bg-zinc-950 p-4 text-xs text-zinc-400">
            {JSON.stringify(finalData, null, 2)}
          </pre>
        </div>
      </details>

      {/* Terms and conditions */}
      <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-4">
        <h4 className="text-sm font-medium text-zinc-300">By submitting, you agree that:</h4>
        <ul className="mt-2 space-y-1 text-sm text-zinc-400">
          <li>- The data you are providing is accurate to the best of your knowledge</li>
          <li>- You have permission to share any personal or sensitive information included</li>
          <li>- This data may be used for cross-domain pattern analysis and research</li>
          <li>- Your submission may be reviewed by other researchers</li>
        </ul>
      </div>

      {/* Error message */}
      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-red-400">
          {error}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex justify-between">
        <div className="flex gap-3">
          <button
            onClick={onBack}
            disabled={isSubmitting}
            className="rounded-lg border border-zinc-700 bg-zinc-800 px-6 py-3 font-medium text-zinc-300 transition-colors hover:bg-zinc-700 disabled:opacity-50"
          >
            Back
          </button>
          {onCancel && (
            <button
              onClick={onCancel}
              disabled={isSubmitting}
              className="rounded-lg border border-red-500/30 bg-red-500/10 px-6 py-3 font-medium text-red-400 transition-colors hover:bg-red-500/20 disabled:opacity-50"
            >
              Cancel
            </button>
          )}
        </div>
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="flex items-center gap-2 rounded-lg bg-emerald-600 px-8 py-3 font-medium text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Submitting...
            </>
          ) : (
            <>
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Submit Data
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// Generate a title based on the submission data
function generateTitle(state: WizardState): string {
  const metadata = state.schemaType ? SCHEMA_METADATA[state.schemaType] : null;
  const typeName = metadata?.name || state.schemaType || 'Investigation';
  const date = new Date().toISOString().split('T')[0];
  return `${typeName} - ${date}`;
}
