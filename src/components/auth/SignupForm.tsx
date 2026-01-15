'use client';

import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  isValidEmail,
  isValidPassword,
  isValidDisplayName,
  getVerificationLabel,
} from '../../lib/auth';
import type { VerificationLevel } from '../../types/database';

interface SignupFormProps {
  onSuccess?: () => void;
  onSwitchToLogin?: () => void;
  onSwitchToAnonymous?: () => void;
}

const VERIFICATION_LEVELS: VerificationLevel[] = [
  'none',
  'phd',
  'researcher',
  'lab_tech',
  'independent',
];

export function SignupForm({ onSuccess, onSwitchToLogin, onSwitchToAnonymous }: SignupFormProps) {
  const { signup } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [verificationLevel, setVerificationLevel] = useState<VerificationLevel>('none');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate email
    if (!isValidEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    // Validate password
    const passwordValidation = isValidPassword(password);
    if (!passwordValidation.valid) {
      setError(passwordValidation.message!);
      return;
    }

    // Check password confirmation
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    // Validate display name
    const nameValidation = isValidDisplayName(displayName);
    if (!nameValidation.valid) {
      setError(nameValidation.message!);
      return;
    }

    setIsLoading(true);

    try {
      const result = await signup({
        email,
        password,
        displayName,
        identityType: 'public',
        verificationLevel,
      });

      if (result.error) {
        setError(result.error.message);
      } else {
        onSuccess?.();
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-zinc-100 mb-2">Create Account</h2>
        <p className="text-zinc-400 text-sm">
          Join the cross-domain research network
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-zinc-300 mb-1">
            Email
          </label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
            placeholder="researcher@university.edu"
            required
          />
          <p className="mt-1 text-xs text-zinc-500">
            Verification email will be sent to confirm your account
          </p>
        </div>

        <div>
          <label htmlFor="displayName" className="block text-sm font-medium text-zinc-300 mb-1">
            Display Name
          </label>
          <input
            type="text"
            id="displayName"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
            placeholder="Dr. Jane Smith"
            required
          />
        </div>

        <div>
          <label htmlFor="verificationLevel" className="block text-sm font-medium text-zinc-300 mb-1">
            Credential Level
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
            Credentials can be verified later via zero-knowledge proof
          </p>
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-zinc-300 mb-1">
            Password
          </label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
            placeholder="••••••••"
            required
          />
          <p className="mt-1 text-xs text-zinc-500">
            Minimum 8 characters with at least one number
          </p>
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-zinc-300 mb-1">
            Confirm Password
          </label>
          <input
            type="password"
            id="confirmPassword"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
            placeholder="••••••••"
            required
          />
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
              Creating account...
            </span>
          ) : (
            'Create Account'
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
          {onSwitchToLogin && (
            <button
              type="button"
              onClick={onSwitchToLogin}
              className="w-full py-2.5 px-4 border border-zinc-700 hover:border-zinc-600 text-zinc-300 hover:text-zinc-100 font-medium rounded-lg transition-colors"
            >
              Already have an account? Sign In
            </button>
          )}
          {onSwitchToAnonymous && (
            <button
              type="button"
              onClick={onSwitchToAnonymous}
              className="w-full py-2.5 px-4 text-zinc-400 hover:text-zinc-300 text-sm transition-colors"
            >
              Continue Anonymously
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
