'use client';

/**
 * PageWrapper Component
 * Consistent page layout with navigation and styling
 */

import { Navigation } from './Navigation';

interface PageWrapperProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  headerAction?: React.ReactNode;
  fullWidth?: boolean;
}

export function PageWrapper({
  children,
  title,
  description,
  headerAction,
  fullWidth = false,
}: PageWrapperProps) {
  return (
    <div className="min-h-screen bg-dark-bg">
      <Navigation />

      {/* Page header */}
      {(title || description) && (
        <div className="pt-16 border-b border-dark-border bg-gradient-to-b from-brand-900/10 to-transparent">
          <div className={`${fullWidth ? '' : 'max-w-7xl mx-auto'} px-4 sm:px-6 lg:px-8 py-8`}>
            <div className="flex items-center justify-between gap-4">
              <div>
                {title && (
                  <h1 className="text-3xl font-bold text-zinc-100 animate-fade-in">{title}</h1>
                )}
                {description && (
                  <p className="mt-2 text-zinc-400 animate-fade-in" style={{ animationDelay: '0.1s' }}>
                    {description}
                  </p>
                )}
              </div>
              {headerAction && (
                <div className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
                  {headerAction}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className={`${fullWidth ? '' : 'max-w-7xl mx-auto'} px-4 sm:px-6 lg:px-8 py-8 pb-16 ${title ? '' : 'pt-24'}`}>
        {children}
      </main>
    </div>
  );
}
