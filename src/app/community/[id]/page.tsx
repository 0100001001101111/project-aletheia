'use client';

/**
 * Community Hypothesis Detail Page
 * View full details of a community hypothesis
 */

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { Navigation } from '@/components/layout/Navigation';
import { useAuth } from '@/contexts/AuthContext';
import type { CommunityHypothesisWithUser, InvestigationType } from '@/types/database';

// Domain icons mapping
const DOMAIN_ICONS: Partial<Record<InvestigationType, { icon: string; label: string; color: string }>> = {
  nde: { icon: '💀', label: 'Near-Death Experience', color: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
  ganzfeld: { icon: '👁️', label: 'Ganzfeld', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
  crisis_apparition: { icon: '👻', label: 'Crisis Apparitions', color: 'bg-pink-500/20 text-pink-300 border-pink-500/30' },
  stargate: { icon: '🎯', label: 'STARGATE', color: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' },
  geophysical: { icon: '🌍', label: 'Geophysical', color: 'bg-green-500/20 text-green-300 border-green-500/30' },
  ufo: { icon: '🛸', label: 'UFO/UAP', color: 'bg-rose-500/20 text-rose-300 border-rose-500/30' },
  bigfoot: { icon: '🦶', label: 'Bigfoot/Sasquatch', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
  haunting: { icon: '🏚️', label: 'Haunted Location', color: 'bg-slate-500/20 text-slate-300 border-slate-500/30' },
  crop_circle: { icon: '🌾', label: 'Crop Circle', color: 'bg-lime-500/20 text-lime-300 border-lime-500/30' },
  bermuda_triangle: { icon: '🔺', label: 'Bermuda Triangle', color: 'bg-teal-500/20 text-teal-300 border-teal-500/30' },
  hotspot: { icon: '📍', label: 'High Strangeness Hotspot', color: 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/30' },
  cryptid: { icon: '🦎', label: 'Cryptid', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
  cattle_mutilation: { icon: '🐄', label: 'Cattle Mutilation', color: 'bg-red-500/20 text-red-300 border-red-500/30' },
  men_in_black: { icon: '🕴️', label: 'Men in Black', color: 'bg-zinc-600/20 text-zinc-300 border-zinc-600/30' },
};

// Status badge styles
const STATUS_STYLES: Record<string, { bg: string; text: string; label: string; description: string }> = {
  speculative: {
    bg: 'bg-zinc-500/20',
    text: 'text-zinc-300',
    label: 'Speculative',
    description: 'This hypothesis is newly submitted and has not been evaluated.',
  },
  gathering_evidence: {
    bg: 'bg-amber-500/20',
    text: 'text-amber-300',
    label: 'Gathering Evidence',
    description: 'The community is actively collecting evidence related to this hypothesis.',
  },
  promoted: {
    bg: 'bg-green-500/20',
    text: 'text-green-300',
    label: 'Promoted',
    description: 'This hypothesis has been promoted to a testable prediction.',
  },
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function HypothesisDetailPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const { user } = useAuth();

  const [hypothesis, setHypothesis] = useState<CommunityHypothesisWithUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [upvoting, setUpvoting] = useState(false);
  const [hasUpvoted, setHasUpvoted] = useState(false);

  useEffect(() => {
    async function fetchHypothesis() {
      try {
        const response = await fetch(`/api/community/${resolvedParams.id}`);
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Hypothesis not found');
          }
          throw new Error('Failed to fetch hypothesis');
        }
        const data = await response.json();
        setHypothesis(data.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    }

    fetchHypothesis();
  }, [resolvedParams.id]);

  const handleUpvote = async () => {
    if (!user || upvoting || hasUpvoted) return;

    setUpvoting(true);
    try {
      const response = await fetch(`/api/community/${resolvedParams.id}/upvote`, {
        method: 'POST',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to upvote');
      }

      // Update local state
      setHypothesis((prev) =>
        prev ? { ...prev, upvotes: prev.upvotes + 1 } : prev
      );
      setHasUpvoted(true);
    } catch (err) {
      console.error('Upvote error:', err);
    } finally {
      setUpvoting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-bg">
        <Navigation />
        <main className="pt-24 pb-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
          </div>
        </main>
      </div>
    );
  }

  if (error || !hypothesis) {
    return (
      <div className="min-h-screen bg-dark-bg">
        <Navigation />
        <main className="pt-24 pb-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
          <div className="text-center py-16">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-dark-card flex items-center justify-center">
              <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-zinc-100 mb-2">{error || 'Hypothesis not found'}</h2>
            <Link
              href="/community"
              className="inline-flex items-center mt-4 text-brand-400 hover:text-brand-300 transition-colors"
            >
              <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Community
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const statusStyle = STATUS_STYLES[hypothesis.status] || STATUS_STYLES.speculative;
  const domains = hypothesis.domains_referenced || [];

  return (
    <div className="min-h-screen bg-dark-bg">
      <Navigation />

      <main className="pt-24 pb-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
        {/* Back link */}
        <Link
          href="/community"
          className="inline-flex items-center text-sm text-zinc-400 hover:text-zinc-200 mb-6 transition-colors"
        >
          <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Community
        </Link>

        {/* Main content card */}
        <div className="rounded-xl border border-dark-border bg-dark-card overflow-hidden">
          {/* Header */}
          <div className="p-6 border-b border-dark-border">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-zinc-100 mb-2">{hypothesis.title}</h1>
                <div className="flex items-center gap-3 text-sm text-zinc-500">
                  <span>
                    by {hypothesis.user?.display_name || 'Anonymous'}
                  </span>
                  <span>•</span>
                  <span>
                    {new Date(hypothesis.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                </div>
              </div>
              <span className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-medium ${statusStyle.bg} ${statusStyle.text}`}>
                {statusStyle.label}
              </span>
            </div>
          </div>

          {/* Hypothesis */}
          <div className="p-6 border-b border-dark-border">
            <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-3">Hypothesis</h2>
            <p className="text-zinc-200 whitespace-pre-wrap leading-relaxed">{hypothesis.hypothesis}</p>
          </div>

          {/* Domains */}
          {domains.length > 0 && (
            <div className="p-6 border-b border-dark-border">
              <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-3">Domains Involved</h2>
              <div className="flex flex-wrap gap-3">
                {domains.map((domain) => {
                  const domainInfo = DOMAIN_ICONS[domain as InvestigationType];
                  if (!domainInfo) return null;
                  return (
                    <span
                      key={domain}
                      className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border ${domainInfo.color}`}
                    >
                      <span className="text-lg">{domainInfo.icon}</span>
                      <span className="font-medium">{domainInfo.label}</span>
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* Evidence Needed - AI Generated (Prominent) */}
          {hypothesis.evidence_needed && (
            <div className="p-6 border-b border-dark-border bg-brand-500/5">
              <div className="flex items-center gap-2 mb-3">
                <svg className="w-5 h-5 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                <h2 className="text-sm font-medium text-brand-300 uppercase tracking-wider">Evidence Needed</h2>
                <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded">AI-Generated</span>
              </div>
              <div className="prose prose-invert prose-sm max-w-none">
                <p className="text-zinc-300 whitespace-pre-wrap leading-relaxed">{hypothesis.evidence_needed}</p>
              </div>
            </div>
          )}

          {/* Status description */}
          <div className="p-6 border-b border-dark-border bg-dark-bg/50">
            <p className="text-sm text-zinc-500">
              <strong className="text-zinc-400">Status:</strong> {statusStyle.description}
            </p>
          </div>

          {/* Footer with upvote */}
          <div className="p-6 flex items-center justify-between">
            <button
              onClick={handleUpvote}
              disabled={!user || upvoting || hasUpvoted}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                hasUpvoted
                  ? 'bg-brand-500/20 text-brand-300 cursor-default'
                  : user
                  ? 'bg-dark-bg border border-dark-border text-zinc-300 hover:border-brand-500/50 hover:text-brand-300'
                  : 'bg-dark-bg border border-dark-border text-zinc-500 cursor-not-allowed'
              }`}
              title={!user ? 'Sign in to upvote' : hasUpvoted ? 'Already upvoted' : 'Upvote this hypothesis'}
            >
              <svg
                className={`w-5 h-5 ${hasUpvoted ? 'fill-current' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
              <span>{hypothesis.upvotes}</span>
              {hasUpvoted && <span className="text-xs">Upvoted</span>}
            </button>

            {!user && (
              <Link
                href="/login"
                className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                Sign in to upvote
              </Link>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
