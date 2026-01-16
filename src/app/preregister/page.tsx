'use client';

/**
 * Pre-Registration Page
 * Create pre-registrations for prediction testing
 */

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { AuthModal } from '@/components/auth/AuthModal';

interface Prediction {
  id: string;
  hypothesis: string;
  status: string;
  domains_involved: string[];
}

// Loading fallback component
function PreRegisterLoading() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center">
      <div className="text-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-500 border-t-transparent mx-auto" />
        <p className="mt-4 text-zinc-400">Loading...</p>
      </div>
    </div>
  );
}

// Wrap the page in Suspense for useSearchParams
export default function PreRegisterPage() {
  return (
    <Suspense fallback={<PreRegisterLoading />}>
      <PreRegisterContent />
    </Suspense>
  );
}

function PreRegisterContent() {
  const searchParams = useSearchParams();
  const predictionId = searchParams.get('prediction');

  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);

  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<{ hash_id: string } | null>(null);

  const [form, setForm] = useState({
    protocol: '',
    hypothesis: '',
    methodology: '',
    expected_sample_size: '',
    analysis_plan: '',
    embargoed: false,
    embargo_until: '',
  });

  // Fetch prediction if ID provided
  useEffect(() => {
    if (predictionId) {
      fetch(`/api/predictions/${predictionId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.id) {
            setPrediction(data);
            setForm((prev) => ({
              ...prev,
              hypothesis: data.hypothesis || '',
            }));
          }
        })
        .catch(console.error);
    }
  }, [predictionId]);

  const handleSubmit = async () => {
    if (!isAuthenticated) {
      setShowAuthModal(true);
      return;
    }

    if (!predictionId) {
      alert('Please select a prediction to pre-register for');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/preregister', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prediction_id: predictionId,
          ...form,
          expected_sample_size: form.expected_sample_size
            ? parseInt(form.expected_sample_size, 10)
            : null,
          embargo_until: form.embargoed && form.embargo_until ? form.embargo_until : null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSuccess({ hash_id: data.hash_id });
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create pre-registration');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center">
        <div className="max-w-lg w-full mx-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-8 text-center">
          <div className="w-16 h-16 mx-auto bg-emerald-500/20 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-emerald-400 mb-2">Pre-Registration Created!</h1>
          <p className="text-zinc-400 mb-6">
            Your testing protocol has been cryptographically timestamped.
          </p>

          <div className="bg-zinc-800 rounded-lg p-4 mb-6">
            <div className="text-sm text-zinc-500 mb-1">Your Registration ID</div>
            <div className="text-3xl font-mono font-bold text-violet-400 tracking-wider">
              {success.hash_id}
            </div>
          </div>

          <p className="text-sm text-zinc-500 mb-6">
            Save this ID! You can use it to prove your protocol was registered before running your experiment.
          </p>

          <div className="flex gap-3 justify-center">
            <Link
              href={`/preregister/${success.hash_id}`}
              className="rounded-lg bg-violet-600 px-6 py-2 font-medium text-white hover:bg-violet-500"
            >
              View Registration
            </Link>
            <Link
              href="/predictions"
              className="rounded-lg border border-zinc-700 px-6 py-2 text-zinc-400 hover:bg-zinc-800"
            >
              Back to Predictions
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/50">
        <div className="mx-auto max-w-3xl px-4 py-6">
          <Link
            href="/predictions"
            className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200 mb-4"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Predictions
          </Link>
          <h1 className="text-2xl font-bold">Pre-Register Your Test</h1>
          <p className="mt-2 text-zinc-400">
            Lock in your methodology before running experiments. Pre-registered results get +2 triage score.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8 space-y-6">
        {/* Prediction Info */}
        {prediction && (
          <div className="rounded-xl border border-violet-500/30 bg-violet-500/10 p-4">
            <div className="text-sm text-violet-400 mb-1">Testing Prediction</div>
            <p className="text-zinc-200">{prediction.hypothesis}</p>
          </div>
        )}

        {!predictionId && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
            <p className="text-amber-300">
              Please select a prediction from the{' '}
              <Link href="/predictions" className="underline">predictions page</Link>
              {' '}to pre-register for.
            </p>
          </div>
        )}

        {/* Form */}
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Your Hypothesis *
            </label>
            <textarea
              value={form.hypothesis}
              onChange={(e) => setForm({ ...form, hypothesis: e.target.value })}
              rows={2}
              placeholder="What specifically do you expect to find?"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-zinc-100 placeholder-zinc-500 focus:border-violet-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Testing Protocol *
            </label>
            <textarea
              value={form.protocol}
              onChange={(e) => setForm({ ...form, protocol: e.target.value })}
              rows={4}
              placeholder="Describe your experimental setup, controls, blinding procedures..."
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-zinc-100 placeholder-zinc-500 focus:border-violet-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Methodology *
            </label>
            <textarea
              value={form.methodology}
              onChange={(e) => setForm({ ...form, methodology: e.target.value })}
              rows={3}
              placeholder="How will you collect and analyze data?"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-zinc-100 placeholder-zinc-500 focus:border-violet-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Expected Sample Size
              </label>
              <input
                type="number"
                value={form.expected_sample_size}
                onChange={(e) => setForm({ ...form, expected_sample_size: e.target.value })}
                placeholder="100"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-zinc-100 placeholder-zinc-500 focus:border-violet-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Analysis Plan
              </label>
              <input
                type="text"
                value={form.analysis_plan}
                onChange={(e) => setForm({ ...form, analysis_plan: e.target.value })}
                placeholder="e.g., Binomial test, alpha=0.05"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-zinc-100 placeholder-zinc-500 focus:border-violet-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Embargo option */}
          <div className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-4">
            <div className="flex items-center gap-3 mb-3">
              <input
                type="checkbox"
                id="embargoed"
                checked={form.embargoed}
                onChange={(e) => setForm({ ...form, embargoed: e.target.checked })}
                className="rounded border-zinc-600 bg-zinc-700 text-violet-500 focus:ring-violet-500"
              />
              <label htmlFor="embargoed" className="text-sm font-medium text-zinc-300">
                Embargo protocol until date
              </label>
            </div>
            {form.embargoed && (
              <input
                type="date"
                value={form.embargo_until}
                onChange={(e) => setForm({ ...form, embargo_until: e.target.value })}
                className="rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-zinc-100 focus:border-violet-500 focus:outline-none"
              />
            )}
            <p className="mt-2 text-xs text-zinc-500">
              Embargoed protocols are hidden from public view until the specified date, but the timestamp is still recorded.
            </p>
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading || !form.protocol || !form.hypothesis || !form.methodology}
            className="w-full rounded-lg bg-violet-600 py-3 font-medium text-white hover:bg-violet-500 disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create Pre-Registration'}
          </button>
        </div>

        {/* Info */}
        <div className="rounded-lg bg-zinc-800/30 p-4">
          <h3 className="font-medium text-zinc-200 mb-2">Why Pre-Register?</h3>
          <ul className="text-sm text-zinc-400 space-y-1">
            <li>- Prevents p-hacking and data dredging</li>
            <li>- Cryptographic timestamp proves you didn&apos;t change your hypothesis</li>
            <li>- +2 triage score boost for pre-registered results</li>
            <li>- Builds trust with reviewers and the community</li>
          </ul>
        </div>
      </main>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={() => setShowAuthModal(false)}
      />
    </div>
  );
}
