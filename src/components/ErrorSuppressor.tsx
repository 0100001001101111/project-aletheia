'use client';

/**
 * Suppress known harmless errors from third-party libraries
 * Specifically: Supabase auth AbortError during navigation
 */

import { useEffect } from 'react';

export function ErrorSuppressor() {
  useEffect(() => {
    const originalError = console.error;

    console.error = (...args) => {
      // Suppress Supabase auth AbortError - harmless, happens during navigation
      if (args[0] instanceof Error && args[0].name === 'AbortError') {
        return;
      }
      if (typeof args[0] === 'string' && args[0].includes('AbortError')) {
        return;
      }
      originalError.apply(console, args);
    };

    // Also handle unhandled promise rejections for AbortError
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (event.reason instanceof Error && event.reason.name === 'AbortError') {
        event.preventDefault();
      }
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      console.error = originalError;
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  return null;
}
