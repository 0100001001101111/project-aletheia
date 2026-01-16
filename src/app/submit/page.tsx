'use client';

/**
 * Submit Page
 * Data submission wizard
 */

import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { SubmissionWizard } from '@/components/submission/SubmissionWizard';
import type { WizardState } from '@/components/submission/SubmissionWizard';

export default function SubmitPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  const handleComplete = (_state: WizardState) => {
    // Submission complete - wizard handles the redirect
  };

  const handleCancel = () => {
    router.push('/');
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-500 border-t-transparent" />
          <p className="mt-4 text-zinc-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Require authentication
  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <div className="max-w-md rounded-xl border border-zinc-800 bg-zinc-900/50 p-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/20">
            <svg className="h-8 w-8 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="mt-6 text-2xl font-bold text-zinc-100">Authentication Required</h2>
          <p className="mt-2 text-zinc-400">
            You need to sign in to submit research data.
          </p>
          <div className="mt-6 space-y-3">
            <a
              href="/auth-test"
              className="block w-full rounded-lg bg-violet-600 px-4 py-3 font-medium text-white transition-colors hover:bg-violet-500"
            >
              Sign In
            </a>
            <a
              href="/"
              className="block w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 font-medium text-zinc-300 transition-colors hover:bg-zinc-700"
            >
              Back to Home
            </a>
          </div>
        </div>
      </div>
    );
  }

  return <SubmissionWizard onComplete={handleComplete} onCancel={handleCancel} />;
}
