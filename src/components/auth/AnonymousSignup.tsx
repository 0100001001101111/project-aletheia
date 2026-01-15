'use client';

import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getVerificationLabel } from '../../lib/auth';
import type { VerificationLevel } from '../../types/database';

interface AnonymousSignupProps {
  onSuccess?: (anonId: string) => void;
  onSwitchToLogin?: () => void;
  onSwitchToSignup?: () => void;
}

const VERIFICATION_LEVELS: VerificationLevel[] = [
  'none',
  'phd',
  'researcher',
  'lab_tech',
  'independent',
];

export function AnonymousSignup({
  onSuccess,
  onSwitchToLogin,
  onSwitchToSignup,
}: AnonymousSignupProps) {
  const { signupAnonymous } = useAuth();

  const [verificationLevel, setVerificationLevel] = useState<VerificationLevel>('none');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [generatedId, setGeneratedId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const result = await signupAnonymous({
        verificationLevel: verificationLevel !== 'none' ? verificationLevel : undefined,
      });

      if (result.error) {
        setError(result.error.message);
      } else {
        setGeneratedId(result.anonId);
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyId = async () => {
    if (generatedId) {
      await navigator.clipboard.writeText(generatedId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleContinue = () => {
    if (generatedId) {
      onSuccess?.(generatedId);
    }
  };

  // Show success state with generated ID
  if (generatedId) {
    return (
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-emerald-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-semibold text-zinc-100 mb-2">
            Anonymous Account Created
          </h2>
          <p className="text-zinc-400 text-sm">
            Save your anonymous ID to sign in later
          </p>
        </div>

        <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4 mb-6">
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">
            Your Anonymous ID
          </p>
          <div className="flex items-center gap-3">
            <code className="flex-1 text-2xl font-mono text-amber-400">
              {generatedId}
            </code>
            <button
              type="button"
              onClick={handleCopyId}
              className="p-2 text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              {copied ? (
                <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>

        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 mb-6">
          <div className="flex gap-3">
            <svg
              className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <div>
              <p className="text-amber-200 text-sm font-medium mb-1">
                Important: Save this ID
              </p>
              <p className="text-amber-200/70 text-xs">
                This is the only way to access your account. If you lose it,
                you will not be able to recover your contributions.
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleContinue}
          className="w-full py-2.5 px-4 bg-amber-600 hover:bg-amber-500 text-white font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500/50"
        >
          Continue to Research
        </button>
      </div>
    );
  }

  // Show signup form
  return (
    <div className="w-full max-w-md">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-zinc-100 mb-2">
          Continue Anonymously
        </h2>
        <p className="text-zinc-400 text-sm">
          Participate without revealing your identity
        </p>
      </div>

      <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4 mb-6">
        <h3 className="text-zinc-200 font-medium mb-2">Anonymous Account Features</h3>
        <ul className="space-y-2 text-sm text-zinc-400">
          <li className="flex items-start gap-2">
            <svg className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Read all verified investigations
          </li>
          <li className="flex items-start gap-2">
            <svg className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Submit data (marked as provisional)
          </li>
          <li className="flex items-start gap-2">
            <svg className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Build credibility over time
          </li>
          <li className="flex items-start gap-2">
            <svg className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01" />
            </svg>
            Rate limited submissions (2/hour)
          </li>
        </ul>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="verificationLevel" className="block text-sm font-medium text-zinc-300 mb-1">
            Claim Credentials (Optional)
          </label>
          <select
            id="verificationLevel"
            value={verificationLevel}
            onChange={(e) => setVerificationLevel(e.target.value as VerificationLevel)}
            className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
          >
            {VERIFICATION_LEVELS.map((level) => (
              <option key={level} value={level}>
                {getVerificationLabel(level)}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-zinc-500">
            Claims can be verified later via zero-knowledge proof for higher trust
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-2.5 px-4 bg-amber-600 hover:bg-amber-500 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500/50"
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Creating anonymous account...
            </span>
          ) : (
            'Generate Anonymous ID'
          )}
        </button>
      </form>

      <div className="mt-6 space-y-3">
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-zinc-700" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-zinc-900 text-zinc-500">or</span>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          {onSwitchToSignup && (
            <button
              type="button"
              onClick={onSwitchToSignup}
              className="w-full py-2.5 px-4 border border-zinc-700 hover:border-zinc-600 text-zinc-300 hover:text-zinc-100 font-medium rounded-lg transition-colors"
            >
              Create Full Account
            </button>
          )}
          {onSwitchToLogin && (
            <button
              type="button"
              onClick={onSwitchToLogin}
              className="w-full py-2.5 px-4 text-zinc-400 hover:text-zinc-300 text-sm transition-colors"
            >
              Already have an account? Sign In
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
