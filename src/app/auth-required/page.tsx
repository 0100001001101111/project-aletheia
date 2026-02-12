'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { AuthModal } from '../../components/auth';

function isRelativePath(url: string): boolean {
  // Only allow paths starting with / and not // (protocol-relative URLs)
  return url.startsWith('/') && !url.startsWith('//');
}

function AuthRequiredContent() {
  const searchParams = useSearchParams();
  const rawNext = searchParams.get('next') || '/';
  const next = isRelativePath(rawNext) ? rawNext : '/';
  const reason = searchParams.get('reason');

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(true);

  const getMessage = () => {
    switch (reason) {
      case 'elevated_access':
        return 'This page requires elevated permissions. Please sign in with an account that has the appropriate credentials.';
      default:
        return 'You need to sign in to access this page.';
    }
  };

  const handleSuccess = () => {
    // Redirect to the intended page after successful auth
    window.location.href = next;
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 bg-amber-600/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg
            className="w-8 h-8 text-amber-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-zinc-100 mb-2">
          Authentication Required
        </h1>
        <p className="text-zinc-400 mb-6">{getMessage()}</p>

        <button
          onClick={() => setIsAuthModalOpen(true)}
          className="px-6 py-3 bg-amber-600 hover:bg-amber-500 text-white font-medium rounded-lg transition-colors"
        >
          Sign In
        </button>

        <p className="mt-4 text-sm text-zinc-500">
          or{' '}
          <a href="/" className="text-amber-400 hover:text-amber-300">
            return to home
          </a>
        </p>
      </div>

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={handleSuccess}
      />
    </div>
  );
}

export default function AuthRequiredPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
      </div>
    }>
      <AuthRequiredContent />
    </Suspense>
  );
}
