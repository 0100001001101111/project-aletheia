'use client';

/**
 * Submit Page
 * New 7-step submission wizard with draft save/resume
 */

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { NewSubmissionWizard } from '@/components/submission/NewSubmissionWizard';

function SubmitPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const draftId = searchParams.get('draft');

  const handleComplete = () => {
    router.push('/dashboard');
  };

  const handleCancel = () => {
    router.push('/');
  };

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
