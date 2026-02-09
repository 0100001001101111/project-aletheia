'use client';

/**
 * Submit Page
 * Dual-mode submission: Quick Submit (3-step) or Full Mode (7-step)
 */

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import Link from 'next/link';
import { NewSubmissionWizard } from '@/components/submission/NewSubmissionWizard';
import { SimpleSubmissionWizard } from '@/components/submission/SimpleSubmissionWizard';

type SubmissionMode = 'simple' | 'full' | null;

function ModeSelector({ onSelect }: { onSelect: (mode: SubmissionMode) => void }) {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center px-4">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-zinc-100">Submit an Investigation</h1>
          <p className="mt-2 text-zinc-400">Choose how you want to report your experience</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Quick Submit */}
          <button
            onClick={() => onSelect('simple')}
            className="group rounded-xl border border-zinc-700 bg-zinc-900/50 p-6 text-left transition-all hover:border-violet-500/50 hover:bg-zinc-900"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <svg className="h-5 w-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <span className="px-2 py-0.5 rounded text-xs font-medium bg-amber-500/10 text-amber-400">
                Recommended
              </span>
            </div>
            <h2 className="text-xl font-semibold text-zinc-100 group-hover:text-white">Quick Submit</h2>
            <p className="mt-2 text-sm text-zinc-400">
              3 simple steps. Perfect for first-time reports or when you just want to share what happened.
            </p>
            <div className="mt-4 space-y-1.5 text-xs text-zinc-500">
              <div className="flex items-center gap-2">
                <span className="text-emerald-400">✓</span> Tell your story in your own words
              </div>
              <div className="flex items-center gap-2">
                <span className="text-emerald-400">✓</span> Add basic details (date, location, witnesses)
              </div>
              <div className="flex items-center gap-2">
                <span className="text-emerald-400">✓</span> Review and submit
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-zinc-800">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-500">Max score</span>
                <span className="text-amber-400 font-medium">6.0 / 10</span>
              </div>
            </div>
          </button>

          {/* Full Mode */}
          <button
            onClick={() => onSelect('full')}
            className="group rounded-xl border border-zinc-700 bg-zinc-900/50 p-6 text-left transition-all hover:border-violet-500/50 hover:bg-zinc-900"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-lg bg-violet-500/10 flex items-center justify-center">
                <svg className="h-5 w-5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <span className="px-2 py-0.5 rounded text-xs font-medium bg-violet-500/10 text-violet-400">
                Research-Grade
              </span>
            </div>
            <h2 className="text-xl font-semibold text-zinc-100 group-hover:text-white">Full Mode</h2>
            <p className="mt-2 text-sm text-zinc-400">
              7 detailed steps. For serious documentation with detailed witness profiles and evidence.
            </p>
            <div className="mt-4 space-y-1.5 text-xs text-zinc-500">
              <div className="flex items-center gap-2">
                <span className="text-emerald-400">✓</span> Structured data collection
              </div>
              <div className="flex items-center gap-2">
                <span className="text-emerald-400">✓</span> Witness credential verification
              </div>
              <div className="flex items-center gap-2">
                <span className="text-emerald-400">✓</span> Evidence documentation
              </div>
              <div className="flex items-center gap-2">
                <span className="text-emerald-400">✓</span> Environmental data auto-fetch
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-zinc-800">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-500">Max score</span>
                <span className="text-violet-400 font-medium">10.0 / 10</span>
              </div>
            </div>
          </button>
        </div>

        {/* Upload File */}
        <Link
          href="/ingest"
          className="mt-4 block rounded-xl border border-zinc-700 bg-zinc-900/50 p-4 text-left transition-all hover:border-violet-500/50 hover:bg-zinc-900"
        >
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-teal-500/10 flex items-center justify-center shrink-0">
              <svg className="h-4 w-4 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-medium text-zinc-100">Upload File</h3>
              <p className="text-xs text-zinc-500">Upload PDF, CSV, XLSX, or text files for AI-powered multi-record parsing</p>
            </div>
          </div>
        </Link>

        <p className="mt-6 text-center text-xs text-zinc-600">
          Not sure? Start with Quick Submit — you can always provide more detail later.
        </p>
      </div>
    </div>
  );
}

function SubmitPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const draftId = searchParams.get('draft');
  const modeParam = searchParams.get('mode') as SubmissionMode;

  // If there's a draft, go straight to full mode
  const [mode, setMode] = useState<SubmissionMode>(draftId ? 'full' : modeParam);

  const handleComplete = () => {
    router.push('/dashboard');
  };

  const handleCancel = () => {
    router.push('/');
  };

  const handleSwitchToFull = () => {
    setMode('full');
  };

  // Mode selection screen
  if (!mode) {
    return <ModeSelector onSelect={setMode} />;
  }

  // Simple mode (3-step)
  if (mode === 'simple') {
    return (
      <SimpleSubmissionWizard
        onComplete={handleComplete}
        onCancel={handleCancel}
        onSwitchToFull={handleSwitchToFull}
      />
    );
  }

  // Full mode (7-step)
  return (
    <NewSubmissionWizard
      draftId={draftId}
      onComplete={handleComplete}
      onCancel={handleCancel}
    />
  );
}

export default function SubmitPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-zinc-950">
          <div className="text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-500 border-t-transparent" />
            <p className="mt-4 text-zinc-400">Loading...</p>
          </div>
        </div>
      }
    >
      <SubmitPageContent />
    </Suspense>
  );
}
