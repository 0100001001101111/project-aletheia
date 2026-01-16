'use client';

/**
 * Submit Community Hypothesis Page
 * Form for submitting a new community hypothesis
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Navigation } from '@/components/layout/Navigation';
import { useAuth } from '@/contexts/AuthContext';
import type { InvestigationType } from '@/types/database';

const DOMAINS: { value: InvestigationType; label: string; icon: string }[] = [
  { value: 'nde', label: 'Near-Death Experience (NDE)', icon: '💀' },
  { value: 'ganzfeld', label: 'Ganzfeld / Psi Experiments', icon: '👁️' },
  { value: 'crisis_apparition', label: 'Crisis Apparitions', icon: '👻' },
  { value: 'stargate', label: 'STARGATE / Remote Viewing', icon: '🎯' },
  { value: 'geophysical', label: 'Geophysical Anomalies', icon: '🌍' },
];

export default function NewHypothesisPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  const [title, setTitle] = useState('');
  const [hypothesis, setHypothesis] = useState('');
  const [selectedDomains, setSelectedDomains] = useState<InvestigationType[]>([]);
  const [evidence, setEvidence] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleDomain = (domain: InvestigationType) => {
    setSelectedDomains((prev) =>
      prev.includes(domain)
        ? prev.filter((d) => d !== domain)
        : [...prev, domain]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!user) {
      setError('You must be logged in to submit a hypothesis.');
      return;
    }

    if (!title.trim() || !hypothesis.trim()) {
      setError('Please fill in the title and hypothesis fields.');
      return;
    }

    if (selectedDomains.length === 0) {
      setError('Please select at least one domain.');
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch('/api/community', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: title.trim(),
          hypothesis: hypothesis.trim(),
          domains_referenced: selectedDomains,
          user_evidence: evidence.trim() || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to submit hypothesis');
      }

      const data = await response.json();
      router.push(`/community/${data.data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setSubmitting(false);
    }
  };

  // Auth check
  if (authLoading) {
    return (
      <div className="min-h-screen bg-dark-bg">
        <Navigation />
        <main className="pt-24 pb-16 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto">
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
          </div>
        </main>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-dark-bg">
        <Navigation />
        <main className="pt-24 pb-16 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto">
          <div className="text-center py-16">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-dark-card flex items-center justify-center">
              <svg className="w-8 h-8 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-zinc-100 mb-2">Authentication Required</h2>
            <p className="text-zinc-400 mb-6">Please sign in to submit a hypothesis.</p>
            <Link
              href="/login"
              className="inline-flex items-center px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white font-medium rounded-lg transition-colors"
            >
              Sign In
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-bg">
      <Navigation />

      <main className="pt-24 pb-16 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/community"
            className="inline-flex items-center text-sm text-zinc-400 hover:text-zinc-200 mb-4 transition-colors"
          >
            <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Community
          </Link>
          <h1 className="text-3xl font-bold text-zinc-100 mb-2">Submit Hypothesis</h1>
          <p className="text-zinc-400">
            Share your speculative idea with the community. Our AI will suggest what evidence would be needed to test it.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-zinc-300 mb-2">
              Title
            </label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="A concise title for your hypothesis"
              className="w-full px-4 py-3 rounded-lg bg-dark-card border border-dark-border text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors"
              required
            />
          </div>

          {/* Hypothesis */}
          <div>
            <label htmlFor="hypothesis" className="block text-sm font-medium text-zinc-300 mb-2">
              Your Hypothesis
            </label>
            <p className="text-xs text-zinc-500 mb-2">What do you think connects? Be specific about the relationship you&apos;re proposing.</p>
            <textarea
              id="hypothesis"
              value={hypothesis}
              onChange={(e) => setHypothesis(e.target.value)}
              placeholder="Describe your hypothesis in detail. What patterns do you suspect? What connections might exist between phenomena?"
              rows={5}
              className="w-full px-4 py-3 rounded-lg bg-dark-card border border-dark-border text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors resize-none"
              required
            />
          </div>

          {/* Domains */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Domains Involved
            </label>
            <p className="text-xs text-zinc-500 mb-3">Select all research domains relevant to your hypothesis.</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {DOMAINS.map((domain) => (
                <button
                  key={domain.value}
                  type="button"
                  onClick={() => toggleDomain(domain.value)}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-all text-left ${
                    selectedDomains.includes(domain.value)
                      ? 'border-brand-500 bg-brand-500/10 text-zinc-100'
                      : 'border-dark-border bg-dark-card text-zinc-400 hover:border-zinc-600 hover:text-zinc-200'
                  }`}
                >
                  <span className="text-xl">{domain.icon}</span>
                  <span className="text-sm font-medium">{domain.label}</span>
                  {selectedDomains.includes(domain.value) && (
                    <svg className="w-5 h-5 ml-auto text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Evidence */}
          <div>
            <label htmlFor="evidence" className="block text-sm font-medium text-zinc-300 mb-2">
              Evidence You Have <span className="text-zinc-500 font-normal">(optional)</span>
            </label>
            <p className="text-xs text-zinc-500 mb-2">Any observations, data, or references that support your hypothesis.</p>
            <textarea
              id="evidence"
              value={evidence}
              onChange={(e) => setEvidence(e.target.value)}
              placeholder="Share any existing evidence, observations, or references..."
              rows={4}
              className="w-full px-4 py-3 rounded-lg bg-dark-card border border-dark-border text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors resize-none"
            />
          </div>

          {/* Submit Button */}
          <div className="flex items-center justify-end gap-4 pt-4">
            <Link
              href="/community"
              className="px-5 py-2.5 text-zinc-400 hover:text-zinc-200 font-medium transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 bg-brand-600 hover:bg-brand-500 disabled:bg-brand-600/50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-all hover:shadow-lg hover:shadow-brand-600/25"
            >
              {submitting ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Submitting...
                </span>
              ) : (
                'Submit Hypothesis'
              )}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
