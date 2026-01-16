'use client';

/**
 * Red-Team Dashboard
 * Review and flag methodology issues in submitted results
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { AuthModal } from '@/components/auth/AuthModal';

interface ResultFlag {
  id: string;
  flaw_type: string;
  description: string;
  severity: string;
  status: string;
  created_at: string;
}

interface FlaggableResult {
  id: string;
  effect_observed: boolean;
  p_value: number | null;
  sample_size: number | null;
  methodology: string;
  quality_score: number;
  created_at: string;
  prediction: {
    id: string;
    hypothesis: string;
  };
  flags: ResultFlag[];
}

interface TopFlagger {
  user_id: string;
  display_name: string;
  methodology_points: number;
  flags_submitted: number;
}

const FLAW_TYPES = {
  sensory_leakage: { label: 'Sensory Leakage', description: 'Could they have seen/heard the answer?' },
  selection_bias: { label: 'Selection Bias', description: 'Were targets cherry-picked?' },
  statistical_error: { label: 'Statistical Error', description: 'Math problem with p-value or analysis' },
  protocol_violation: { label: 'Protocol Violation', description: 'Broke the stated protocol' },
  data_integrity: { label: 'Data Integrity', description: 'Data appears tampered or incomplete' },
  other: { label: 'Other', description: 'Other methodology concern' },
};

const SEVERITY_COLORS = {
  minor: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  major: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  fatal: 'bg-red-500/20 text-red-400 border-red-500/30',
};

export default function RedTeamDashboard() {
  const { isAuthenticated } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);

  const [results, setResults] = useState<FlaggableResult[]>([]);
  const [topFlaggers, setTopFlaggers] = useState<TopFlagger[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unflagged' | 'flagged'>('all');

  // Flag modal state
  const [flaggingResult, setFlaggingResult] = useState<FlaggableResult | null>(null);
  const [flagForm, setFlagForm] = useState({
    flaw_type: 'other' as keyof typeof FLAW_TYPES,
    description: '',
    evidence: '',
    severity: 'minor' as 'minor' | 'major' | 'fatal',
  });
  const [submittingFlag, setSubmittingFlag] = useState(false);

  useEffect(() => {
    // Fetch flaggable results
    // In a real implementation, this would be an API call
    // For now, we'll show a placeholder
    setLoading(false);
    setResults([]);
    setTopFlaggers([]);
  }, []);

  const handleSubmitFlag = async () => {
    if (!flaggingResult || !flagForm.description) return;

    setSubmittingFlag(true);
    try {
      // API call would go here
      // const res = await fetch('/api/flags', { method: 'POST', ... });

      // For now, just close the modal
      setFlaggingResult(null);
      setFlagForm({ flaw_type: 'other', description: '', evidence: '', severity: 'minor' });
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to submit flag');
    } finally {
      setSubmittingFlag(false);
    }
  };

  const filteredResults = results.filter((r) => {
    if (filter === 'unflagged') return r.flags.length === 0;
    if (filter === 'flagged') return r.flags.length > 0;
    return true;
  });

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/50">
        <div className="mx-auto max-w-6xl px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-3">
                <span className="text-red-400">Red Team</span> Dashboard
              </h1>
              <p className="mt-1 text-zinc-400">
                Review submitted results and flag methodology issues
              </p>
            </div>
            <Link
              href="/predictions"
              className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-400 hover:bg-zinc-800"
            >
              Back to Predictions
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="grid lg:grid-cols-4 gap-8">
          {/* Main content */}
          <div className="lg:col-span-3 space-y-6">
            {/* Info banner */}
            <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-red-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div className="text-sm text-zinc-300">
                  <strong className="text-red-400">Red Team Mode:</strong> Your job is to find flaws in submitted results.
                  Flag methodology issues like sensory leakage, selection bias, or protocol violations.
                  Valid flags earn you Methodology Points (MP).
                </div>
              </div>
            </div>

            {/* Filter tabs */}
            <div className="flex gap-2">
              {(['all', 'unflagged', 'flagged'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filter === f
                      ? 'bg-red-600 text-white'
                      : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                  }`}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>

            {/* Results list */}
            {loading ? (
              <div className="text-center py-12">
                <div className="h-8 w-8 mx-auto animate-spin rounded-full border-4 border-red-500 border-t-transparent" />
                <p className="mt-4 text-zinc-400">Loading results...</p>
              </div>
            ) : filteredResults.length === 0 ? (
              <div className="rounded-xl border border-zinc-700 bg-zinc-900/50 p-12 text-center">
                <div className="w-16 h-16 mx-auto bg-zinc-800 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-zinc-300">No results to review</h3>
                <p className="mt-1 text-sm text-zinc-500">
                  Check back later when more results have been submitted.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredResults.map((result) => (
                  <div
                    key={result.id}
                    className="rounded-xl border border-zinc-700 bg-zinc-900/50 p-6"
                  >
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div>
                        <Link
                          href={`/predictions/${result.prediction.id}`}
                          className="text-lg font-medium text-zinc-200 hover:text-violet-400"
                        >
                          {result.prediction.hypothesis}
                        </Link>
                        <div className="flex items-center gap-3 mt-2 text-sm text-zinc-500">
                          <span className={result.effect_observed ? 'text-emerald-400' : 'text-red-400'}>
                            {result.effect_observed ? 'Supports' : 'Opposes'}
                          </span>
                          {result.p_value && <span>p = {result.p_value.toFixed(4)}</span>}
                          {result.sample_size && <span>n = {result.sample_size}</span>}
                          <span>Quality: {result.quality_score.toFixed(1)}/10</span>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          if (!isAuthenticated) {
                            setShowAuthModal(true);
                            return;
                          }
                          setFlaggingResult(result);
                        }}
                        className="rounded-lg bg-red-600/20 border border-red-500/30 px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-600/30"
                      >
                        Flag Issue
                      </button>
                    </div>

                    {/* Methodology preview */}
                    <div className="bg-zinc-800/50 rounded-lg p-4 mb-4 text-sm text-zinc-300">
                      <div className="line-clamp-3">{result.methodology}</div>
                    </div>

                    {/* Existing flags */}
                    {result.flags.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-xs text-zinc-500 uppercase tracking-wide">Existing Flags</div>
                        {result.flags.map((flag) => (
                          <div
                            key={flag.id}
                            className={`rounded-lg border px-3 py-2 text-sm ${SEVERITY_COLORS[flag.severity as keyof typeof SEVERITY_COLORS]}`}
                          >
                            <span className="font-medium">{FLAW_TYPES[flag.flaw_type as keyof typeof FLAW_TYPES]?.label || flag.flaw_type}</span>
                            {' - '}
                            <span className="text-zinc-400">{flag.description}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Leaderboard */}
            <div className="rounded-xl border border-zinc-700 bg-zinc-900/50 p-4">
              <h2 className="text-lg font-semibold text-zinc-200 mb-4">Top Flaggers</h2>
              {topFlaggers.length === 0 ? (
                <p className="text-sm text-zinc-500">No flags submitted yet.</p>
              ) : (
                <div className="space-y-3">
                  {topFlaggers.map((flagger, idx) => (
                    <div key={flagger.user_id} className="flex items-center gap-3">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        idx === 0 ? 'bg-yellow-500/20 text-yellow-400' :
                        idx === 1 ? 'bg-zinc-400/20 text-zinc-300' :
                        idx === 2 ? 'bg-amber-700/20 text-amber-600' :
                        'bg-zinc-700 text-zinc-400'
                      }`}>
                        {idx + 1}
                      </div>
                      <div className="flex-1">
                        <div className="text-sm text-zinc-200">{flagger.display_name}</div>
                        <div className="text-xs text-zinc-500">{flagger.flags_submitted} flags</div>
                      </div>
                      <div className="text-sm font-medium text-violet-400">{flagger.methodology_points} MP</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* MP info */}
            <div className="rounded-xl border border-zinc-700 bg-zinc-900/50 p-4">
              <h2 className="text-lg font-semibold text-zinc-200 mb-3">Methodology Points</h2>
              <ul className="text-sm text-zinc-400 space-y-2">
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400">+5 MP</span> Valid flag accepted
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-yellow-400">-2 MP</span> Flag disputed & overturned
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-red-400">-5 MP</span> Frivolous flag
                </li>
              </ul>
            </div>
          </div>
        </div>
      </main>

      {/* Flag Modal */}
      {flaggingResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-zinc-900 rounded-xl border border-zinc-700 p-6 max-w-lg w-full">
            <h2 className="text-xl font-bold text-red-400 mb-4">Flag Methodology Issue</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Flaw Type *</label>
                <select
                  value={flagForm.flaw_type}
                  onChange={(e) => setFlagForm({ ...flagForm, flaw_type: e.target.value as keyof typeof FLAW_TYPES })}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-zinc-100 focus:border-red-500 focus:outline-none"
                >
                  {Object.entries(FLAW_TYPES).map(([key, { label }]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-zinc-500">
                  {FLAW_TYPES[flagForm.flaw_type]?.description}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Describe the Issue *</label>
                <textarea
                  value={flagForm.description}
                  onChange={(e) => setFlagForm({ ...flagForm, description: e.target.value })}
                  rows={3}
                  placeholder="What specifically is wrong with this result?"
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-zinc-100 placeholder-zinc-500 focus:border-red-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Evidence</label>
                <textarea
                  value={flagForm.evidence}
                  onChange={(e) => setFlagForm({ ...flagForm, evidence: e.target.value })}
                  rows={2}
                  placeholder="Links, quotes, or other evidence (optional)"
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-zinc-100 placeholder-zinc-500 focus:border-red-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Severity</label>
                <div className="flex gap-2">
                  {(['minor', 'major', 'fatal'] as const).map((sev) => (
                    <button
                      key={sev}
                      type="button"
                      onClick={() => setFlagForm({ ...flagForm, severity: sev })}
                      className={`flex-1 rounded-lg border py-2 text-sm font-medium capitalize ${
                        flagForm.severity === sev
                          ? SEVERITY_COLORS[sev]
                          : 'border-zinc-600 text-zinc-400'
                      }`}
                    >
                      {sev}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setFlaggingResult(null)}
                className="px-4 py-2 text-zinc-400 hover:text-zinc-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitFlag}
                disabled={submittingFlag || !flagForm.description}
                className="rounded-lg bg-red-600 px-6 py-2 font-medium text-white hover:bg-red-500 disabled:opacity-50"
              >
                {submittingFlag ? 'Submitting...' : 'Submit Flag'}
              </button>
            </div>
          </div>
        </div>
      )}

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={() => setShowAuthModal(false)}
      />
    </div>
  );
}
