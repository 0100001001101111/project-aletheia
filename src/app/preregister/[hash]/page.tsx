'use client';

/**
 * Pre-Registration Verification Page
 * View and verify a pre-registration by hash ID
 */

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

interface PreRegistration {
  id: string;
  hash_id: string;
  content_hash: string;
  protocol: string;
  hypothesis: string;
  methodology: string;
  expected_sample_size: number | null;
  analysis_plan: string | null;
  embargoed: boolean;
  embargo_until: string | null;
  status: string;
  created_at: string;
  prediction: {
    id: string;
    hypothesis: string;
    status: string;
    domains_involved: string[];
  } | null;
}

interface EmbargoedResponse {
  hash_id: string;
  embargoed: true;
  embargo_until: string;
  created_at: string;
  status: string;
  message: string;
}

export default function PreRegistrationVerifyPage() {
  const params = useParams();
  const hash = params.hash as string;

  const [data, setData] = useState<PreRegistration | EmbargoedResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPreregistration() {
      try {
        const res = await fetch(`/api/preregister/${hash}`);
        const result = await res.json();

        if (!res.ok) {
          throw new Error(result.error || 'Failed to fetch pre-registration');
        }

        setData(result.data || result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        setLoading(false);
      }
    }

    fetchPreregistration();
  }, [hash]);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <div className="h-10 w-10 mx-auto animate-spin rounded-full border-4 border-violet-500 border-t-transparent" />
          <p className="mt-4 text-zinc-400">Loading pre-registration...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto bg-red-500/20 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-red-400 mb-2">Not Found</h1>
          <p className="text-zinc-400 mb-4">{error || 'Pre-registration not found'}</p>
          <Link href="/predictions" className="text-violet-400 hover:underline">
            Back to Predictions
          </Link>
        </div>
      </div>
    );
  }

  // Check if embargoed
  if ('embargoed' in data && data.embargoed === true && 'message' in data) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100">
        <header className="border-b border-zinc-800 bg-zinc-900/50">
          <div className="mx-auto max-w-3xl px-4 py-6">
            <h1 className="text-2xl font-bold">Pre-Registration Verification</h1>
          </div>
        </header>

        <main className="mx-auto max-w-3xl px-4 py-8">
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-8 text-center">
            <div className="w-16 h-16 mx-auto bg-amber-500/20 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-amber-400 mb-2">Embargoed</h2>
            <p className="text-zinc-400 mb-4">{data.message}</p>

            <div className="bg-zinc-800 rounded-lg p-4 mb-4">
              <div className="text-sm text-zinc-500 mb-1">Registration ID</div>
              <div className="text-2xl font-mono font-bold text-violet-400">{data.hash_id}</div>
            </div>

            <div className="text-sm text-zinc-500">
              <div>Embargo lifts: {new Date(data.embargo_until).toLocaleDateString()}</div>
              <div>Registered: {new Date(data.created_at).toLocaleDateString()}</div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Full pre-registration view
  const prereg = data as PreRegistration;

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
          <h1 className="text-2xl font-bold">Pre-Registration Verification</h1>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8 space-y-6">
        {/* Verified badge */}
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-500/20 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-emerald-400">Verified Pre-Registration</h2>
              <p className="text-sm text-zinc-400">
                This protocol was cryptographically timestamped before testing began.
              </p>
            </div>
          </div>
        </div>

        {/* Hash ID */}
        <div className="bg-zinc-800/50 rounded-xl p-6 text-center">
          <div className="text-sm text-zinc-500 mb-1">Registration ID</div>
          <div className="text-3xl font-mono font-bold text-violet-400 tracking-wider mb-2">
            {prereg.hash_id}
          </div>
          <div className="text-xs text-zinc-600 font-mono break-all">
            SHA-256: {prereg.content_hash}
          </div>
        </div>

        {/* Prediction link */}
        {prereg.prediction && (
          <div className="rounded-lg border border-zinc-700 p-4">
            <div className="text-sm text-zinc-500 mb-1">Testing Prediction</div>
            <p className="text-zinc-200 mb-2">{prereg.prediction.hypothesis}</p>
            <Link
              href={`/predictions/${prereg.prediction.id}`}
              className="text-sm text-violet-400 hover:underline"
            >
              View Prediction →
            </Link>
          </div>
        )}

        {/* Protocol details */}
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-medium text-zinc-400 mb-2">Hypothesis</h3>
            <div className="rounded-lg bg-zinc-800 p-4 text-zinc-200">
              {prereg.hypothesis}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-zinc-400 mb-2">Testing Protocol</h3>
            <div className="rounded-lg bg-zinc-800 p-4 text-zinc-200 whitespace-pre-wrap">
              {prereg.protocol}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-zinc-400 mb-2">Methodology</h3>
            <div className="rounded-lg bg-zinc-800 p-4 text-zinc-200 whitespace-pre-wrap">
              {prereg.methodology}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {prereg.expected_sample_size && (
              <div>
                <h3 className="text-sm font-medium text-zinc-400 mb-2">Expected Sample Size</h3>
                <div className="rounded-lg bg-zinc-800 p-4 text-zinc-200">
                  {prereg.expected_sample_size}
                </div>
              </div>
            )}
            {prereg.analysis_plan && (
              <div>
                <h3 className="text-sm font-medium text-zinc-400 mb-2">Analysis Plan</h3>
                <div className="rounded-lg bg-zinc-800 p-4 text-zinc-200">
                  {prereg.analysis_plan}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Metadata */}
        <div className="border-t border-zinc-800 pt-6 grid grid-cols-2 gap-4 text-sm text-zinc-500">
          <div>
            <span className="text-zinc-600">Registered:</span>{' '}
            {new Date(prereg.created_at).toLocaleString()}
          </div>
          <div>
            <span className="text-zinc-600">Status:</span>{' '}
            <span className={prereg.status === 'active' ? 'text-emerald-400' : 'text-zinc-400'}>
              {prereg.status}
            </span>
          </div>
        </div>
      </main>
    </div>
  );
}
