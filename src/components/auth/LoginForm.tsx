'use client';

import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { isValidEmail } from '../../lib/auth';

interface LoginFormProps {
  onSuccess?: () => void;
  onSwitchToSignup?: () => void;
  onSwitchToAnonymous?: () => void;
}

export function LoginForm({ onSuccess, onSwitchToSignup, onSwitchToAnonymous }: LoginFormProps) {
  const { login, loginWithAnonymousId, isAuthenticated } = useAuth();

  const [mode, setMode] = useState<'email' | 'anonymous'>('email');
  const [email, setEmail] = useState('');
  const [anonId, setAnonId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isAuthenticated) {
      onSuccess?.();
      return;
    }
    setError(null);
    setIsLoading(true);

    try {
      let result;

      if (mode === 'email') {
        if (!isValidEmail(email)) {
          setError('Please enter a valid email address');
          setIsLoading(false);
          return;
        }
        result = await login(email, password);
      } else {
        if (!anonId.trim()) {
          setError('Please enter your anonymous ID');
          setIsLoading(false);
          return;
        }
        result = await loginWithAnonymousId(anonId, password);
      }

      if (result.error) {
        setError(result.error.message);
      } else {
        // login() already called setUser — close modal
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
        <h2 className="text-2xl font-semibold text-zinc-100 mb-2">Sign In</h2>
        <p className="text-zinc-400 text-sm">
          Access your research contributions
        </p>
      </div>

      {/* Mode Toggle */}
      <div className="flex mb-6 bg-zinc-800 rounded-lg p-1">
        <button
          type="button"
          onClick={() => setMode('email')}
          className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
            mode === 'email'
              ? 'bg-zinc-700 text-zinc-100'
              : 'text-zinc-400 hover:text-zinc-300'
          }`}
        >
          Email
        </button>
        <button
          type="button"
          onClick={() => setMode('anonymous')}
          className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
            mode === 'anonymous'
              ? 'bg-zinc-700 text-zinc-100'
              : 'text-zinc-400 hover:text-zinc-300'
          }`}
        >
          Anonymous ID
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === 'email' ? (
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
          </div>
        ) : (
          <div>
            <label htmlFor="anonId" className="block text-sm font-medium text-zinc-300 mb-1">
              Anonymous ID
            </label>
            <input
              type="text"
              id="anonId"
              value={anonId}
              onChange={(e) => setAnonId(e.target.value.toUpperCase())}
              className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 font-mono"
              placeholder="ANON-XXXXXX"
              required
            />
          </div>
        )}

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
              Signing in...
            </span>
          ) : (
            'Sign In'
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
              Create Account
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
