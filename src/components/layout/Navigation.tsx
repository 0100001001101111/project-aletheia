'use client';

/**
 * Navigation Component
 * Shared header navigation for all pages
 */

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/predictions', label: 'Predictions' },
  { href: '/patterns', label: 'Patterns' },
  { href: '/investigations', label: 'Investigations' },
];

interface NavigationProps {
  transparent?: boolean;
}

export function Navigation({ transparent = false }: NavigationProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (href: string) => pathname === href || pathname?.startsWith(href + '/');

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 border-b transition-all duration-300 ${
        transparent
          ? 'border-brand-900/30 bg-[#0a0a0f]/80 backdrop-blur-xl'
          : 'border-dark-border bg-dark-bg/95 backdrop-blur-md'
      }`}
    >
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo - links to home */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-brand-600 to-accent-blue flex items-center justify-center transition-transform group-hover:scale-105">
              <span className="text-white font-bold text-lg">A</span>
            </div>
            <span className="font-semibold text-zinc-100 text-lg">Aletheia</span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  isActive(item.href)
                    ? 'text-white bg-brand-600/20 border border-brand-500/30'
                    : 'text-zinc-400 hover:text-zinc-100 hover:bg-white/5'
                }`}
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/submit"
              className="ml-4 px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium rounded-lg transition-all hover:shadow-lg hover:shadow-brand-600/25 hover:-translate-y-0.5"
            >
              Submit Data
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-zinc-400 hover:text-zinc-100 rounded-lg hover:bg-white/5 transition-colors"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-dark-border animate-fade-in">
            <div className="flex flex-col gap-1">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                    isActive(item.href)
                      ? 'text-white bg-brand-600/20 border border-brand-500/30'
                      : 'text-zinc-400 hover:text-zinc-100 hover:bg-white/5'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
              <Link
                href="/submit"
                onClick={() => setMobileMenuOpen(false)}
                className="mt-2 px-4 py-3 bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium rounded-lg text-center transition-all"
              >
                Submit Data
              </Link>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
