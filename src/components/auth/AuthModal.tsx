'use client';

import { useState, useEffect, useCallback } from 'react';
import { LoginForm } from './LoginForm';
import { SignupForm } from './SignupForm';
import { AnonymousSignup } from './AnonymousSignup';

type AuthView = 'login' | 'signup' | 'anonymous';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultView?: AuthView;
  onSuccess?: () => void;
}

export function AuthModal({
  isOpen,
  onClose,
  defaultView = 'login',
  onSuccess,
}: AuthModalProps) {
  const [view, setView] = useState<AuthView>(defaultView);

  // Reset view when modal opens
  useEffect(() => {
    if (isOpen) {
      setView(defaultView);
    }
  }, [isOpen, defaultView]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  const handleSuccess = useCallback(() => {
    onSuccess?.();
    onClose();
  }, [onSuccess, onClose]);

  const handleAnonymousSuccess = useCallback(
    (_anonId: string) => {
      onSuccess?.();
      onClose();
    },
    [onSuccess, onClose]
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6 max-h-[90vh] overflow-y-auto">
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        {/* Content */}
        {view === 'login' && (
          <LoginForm
            onSuccess={handleSuccess}
            onSwitchToSignup={() => setView('signup')}
            onSwitchToAnonymous={() => setView('anonymous')}
          />
        )}
        {view === 'signup' && (
          <SignupForm
            onSuccess={handleSuccess}
            onSwitchToLogin={() => setView('login')}
            onSwitchToAnonymous={() => setView('anonymous')}
          />
        )}
        {view === 'anonymous' && (
          <AnonymousSignup
            onSuccess={handleAnonymousSuccess}
            onSwitchToLogin={() => setView('login')}
            onSwitchToSignup={() => setView('signup')}
          />
        )}
      </div>
    </div>
  );
}
