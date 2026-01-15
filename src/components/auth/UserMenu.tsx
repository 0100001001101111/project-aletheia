'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  getDisplayName,
  getIdentityTypeLabel,
  getVerificationLabel,
  getCredibilityColor,
  formatCredibilityScore,
  isAnonymousEmail,
} from '../../lib/auth';

interface UserMenuProps {
  onOpenAuth?: () => void;
}

export function UserMenu({ onOpenAuth }: UserMenuProps) {
  const { user, isLoading, isAuthenticated, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setIsOpen(false);
    await logout();
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="h-10 w-10 rounded-full bg-zinc-800 animate-pulse" />
    );
  }

  // Not authenticated - show sign in button
  if (!isAuthenticated || !user) {
    return (
      <button
        type="button"
        onClick={onOpenAuth}
        className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-sm font-medium rounded-lg transition-colors"
      >
        Sign In
      </button>
    );
  }

  const displayName = getDisplayName(user);
  const isAnonymous = isAnonymousEmail(user.email);
  const initials = displayName
    .split(/[\s-]/)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="relative" ref={menuRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-1 rounded-lg hover:bg-zinc-800 transition-colors"
      >
        {/* Avatar */}
        <div
          className={`h-9 w-9 rounded-full flex items-center justify-center text-sm font-medium ${
            isAnonymous
              ? 'bg-zinc-700 text-zinc-300'
              : 'bg-amber-600 text-white'
          }`}
        >
          {isAnonymous ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
          ) : (
            initials
          )}
        </div>

        {/* Dropdown indicator */}
        <svg
          className={`w-4 h-4 text-zinc-400 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl py-2 z-50">
          {/* User Info */}
          <div className="px-4 py-3 border-b border-zinc-800">
            <div className="flex items-start gap-3">
              <div
                className={`h-12 w-12 rounded-full flex items-center justify-center text-lg font-medium flex-shrink-0 ${
                  isAnonymous
                    ? 'bg-zinc-700 text-zinc-300'
                    : 'bg-amber-600 text-white'
                }`}
              >
                {isAnonymous ? (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                ) : (
                  initials
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-zinc-100 font-medium truncate">{displayName}</p>
                <p className="text-zinc-500 text-sm truncate">
                  {getIdentityTypeLabel(user.identity_type)}
                </p>
                {user.verification_level !== 'none' && (
                  <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs rounded-full">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {getVerificationLabel(user.verification_level)}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Credibility Score */}
          <div className="px-4 py-3 border-b border-zinc-800">
            <div className="flex items-center justify-between">
              <span className="text-zinc-400 text-sm">Credibility Score</span>
              <span className={`text-lg font-semibold ${getCredibilityColor(user.credibility_score)}`}>
                {formatCredibilityScore(user.credibility_score)}
              </span>
            </div>
            {/* Progress bar */}
            <div className="mt-2 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-600 to-amber-400 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(user.credibility_score, 100)}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-zinc-500">
              Build credibility by submitting verified data
            </p>
          </div>

          {/* Menu Items */}
          <div className="py-2">
            <button
              type="button"
              className="w-full px-4 py-2 text-left text-sm text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 transition-colors flex items-center gap-3"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
              View Profile
            </button>
            <button
              type="button"
              className="w-full px-4 py-2 text-left text-sm text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 transition-colors flex items-center gap-3"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              My Contributions
            </button>
            <button
              type="button"
              className="w-full px-4 py-2 text-left text-sm text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 transition-colors flex items-center gap-3"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              Settings
            </button>

            {user.verification_level === 'none' && (
              <button
                type="button"
                className="w-full px-4 py-2 text-left text-sm text-amber-400 hover:bg-zinc-800 hover:text-amber-300 transition-colors flex items-center gap-3"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
                Verify Credentials
              </button>
            )}
          </div>

          {/* Logout */}
          <div className="border-t border-zinc-800 pt-2">
            <button
              type="button"
              onClick={handleLogout}
              className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-zinc-800 hover:text-red-300 transition-colors flex items-center gap-3"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
