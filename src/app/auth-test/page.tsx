'use client';

import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { AuthModal, UserMenu } from '../../components/auth';
import {
  getDisplayName,
  getIdentityTypeLabel,
  getVerificationLabel,
  getCredibilityColor,
  formatCredibilityScore,
  canSubmitData,
  canReviewSubmissions,
  isAdmin,
  submitsAsProvisional,
  isAnonymousEmail,
} from '../../lib/auth';

export default function AuthTestPage() {
  const {
    user,
    isLoading,
    isAuthenticated,
    logout,
    claimVerification,
  } = useAuth();

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [claimLevel, setClaimLevel] = useState<'phd' | 'researcher' | 'lab_tech' | 'independent'>('researcher');

  const handleClaimVerification = async () => {
    const result = await claimVerification(claimLevel);
    if (result.error) {
      alert(`Error: ${result.error.message}`);
    } else {
      alert('Verification claim submitted!');
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-amber-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">A</span>
            </div>
            <span className="font-semibold">Project Aletheia</span>
            <span className="text-zinc-500 text-sm">/ Auth Test</span>
          </div>
          <UserMenu onOpenAuth={() => setIsAuthModalOpen(true)} />
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-2">Authentication Test Page</h1>
        <p className="text-zinc-400 mb-8">
          Test all authentication features and view current user state
        </p>

        {/* Auth Status Card */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${isAuthenticated ? 'bg-emerald-400' : 'bg-red-400'}`} />
            Authentication Status
          </h2>

          {isLoading ? (
            <div className="flex items-center gap-3 text-zinc-400">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Loading authentication state...
            </div>
          ) : isAuthenticated && user ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Status</p>
                  <p className="text-emerald-400 font-medium">Authenticated</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Display Name</p>
                  <p className="font-medium">{getDisplayName(user)}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Identity Type</p>
                  <p className="font-medium">{getIdentityTypeLabel(user.identity_type)}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Verification Level</p>
                  <p className="font-medium">{getVerificationLabel(user.verification_level)}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Email Verified</p>
                  <p className={user.isEmailVerified ? 'text-emerald-400' : 'text-amber-400'}>
                    {user.isEmailVerified ? 'Yes' : 'No'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Credibility Score</p>
                  <p className={`font-semibold ${getCredibilityColor(user.credibility_score)}`}>
                    {formatCredibilityScore(user.credibility_score)}
                  </p>
                </div>
              </div>

              <button
                onClick={logout}
                className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-zinc-400">Not authenticated</p>
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Sign In / Sign Up
              </button>
            </div>
          )}
        </div>

        {/* Permissions Card */}
        {user && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">Permissions</h2>
            <div className="space-y-3">
              <PermissionRow
                label="Can Submit Data"
                allowed={canSubmitData(user)}
                description="Submit investigations and contributions"
              />
              <PermissionRow
                label="Submits as Provisional"
                allowed={submitsAsProvisional(user)}
                description="Submissions require review before verification"
                invertColor
              />
              <PermissionRow
                label="Can Review Submissions"
                allowed={canReviewSubmissions(user)}
                description="Triage and review other users' submissions"
              />
              <PermissionRow
                label="Admin Access"
                allowed={isAdmin(user)}
                description="Full administrative privileges"
              />
            </div>
          </div>
        )}

        {/* Raw User Data */}
        {user && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">Raw User Object</h2>
            <pre className="bg-zinc-950 border border-zinc-800 rounded-lg p-4 overflow-x-auto text-sm text-zinc-300">
              {JSON.stringify(
                {
                  ...user,
                  authUser: user.authUser
                    ? {
                        id: user.authUser.id,
                        email: user.authUser.email,
                        email_confirmed_at: user.authUser.email_confirmed_at,
                        created_at: user.authUser.created_at,
                        role: user.authUser.role,
                      }
                    : null,
                },
                null,
                2
              )}
            </pre>
          </div>
        )}

        {/* Claim Verification (for testing) */}
        {user && user.verification_level === 'none' && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">Claim Verification (Test)</h2>
            <p className="text-zinc-400 text-sm mb-4">
              In production, this would use ZKP verification. For testing, claims are stored directly.
            </p>
            <div className="flex items-center gap-4">
              <select
                value={claimLevel}
                onChange={(e) => setClaimLevel(e.target.value as typeof claimLevel)}
                className="px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100"
              >
                <option value="phd">PhD / Doctorate</option>
                <option value="researcher">Academic Researcher</option>
                <option value="lab_tech">Lab Technician</option>
                <option value="independent">Independent Researcher</option>
              </select>
              <button
                onClick={handleClaimVerification}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Claim Verification
              </button>
            </div>
          </div>
        )}

        {/* Auth Actions */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">Test Auth Flows</h2>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-sm font-medium rounded-lg transition-colors"
            >
              Open Auth Modal
            </button>
            <a
              href="/submit"
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-sm font-medium rounded-lg transition-colors inline-block"
            >
              Test Protected Route (/submit)
            </a>
            <a
              href="/agent/review"
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-sm font-medium rounded-lg transition-colors inline-block"
            >
              Test Reviewer Route (/agent/review)
            </a>
            <a
              href="/admin/gaming-flags"
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-sm font-medium rounded-lg transition-colors inline-block"
            >
              Test Admin Route (/admin/gaming-flags)
            </a>
          </div>
        </div>
      </main>

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={() => setIsAuthModalOpen(false)}
      />
    </div>
  );
}

// Helper component for permission rows
function PermissionRow({
  label,
  allowed,
  description,
  invertColor = false,
}: {
  label: string;
  allowed: boolean;
  description: string;
  invertColor?: boolean;
}) {
  const colorClass = invertColor
    ? allowed
      ? 'text-amber-400'
      : 'text-emerald-400'
    : allowed
    ? 'text-emerald-400'
    : 'text-red-400';

  return (
    <div className="flex items-center justify-between py-2 border-b border-zinc-800 last:border-0">
      <div>
        <p className="font-medium">{label}</p>
        <p className="text-xs text-zinc-500">{description}</p>
      </div>
      <span className={`font-medium ${colorClass}`}>
        {allowed ? 'Yes' : 'No'}
      </span>
    </div>
  );
}
