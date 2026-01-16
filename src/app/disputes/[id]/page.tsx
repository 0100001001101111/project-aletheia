'use client';

/**
 * Individual Dispute Page
 * View dispute details and participate in resolution
 */

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { JuryVoting } from '@/components/disputes/JuryVoting';

interface Dispute {
  id: string;
  result_id: string;
  flag_id: string | null;
  initiator_id: string | null;
  tier: number;
  status: 'open' | 'resolved' | 'escalated' | 'nullified';
  data_requested: string | null;
  data_provided: string | null;
  data_provided_at: string | null;
  jury_decision: 'uphold' | 'overturn' | 'partial' | null;
  jury_votes: { uphold: number; overturn: number; abstain: number } | null;
  nullification_reason: string | null;
  created_at: string;
  resolved_at: string | null;
  result?: {
    id: string;
    prediction_id: string;
    effect_observed: boolean;
    p_value: number;
    sample_size: number;
    description: string;
    methodology: string;
    tester?: {
      display_name: string;
    };
  };
  flag?: {
    id: string;
    flaw_type: string;
    description: string;
    evidence: string | null;
    severity: 'minor' | 'major' | 'fatal';
  };
}

interface JuryAssignment {
  dispute_id: string;
  has_voted: boolean;
  my_vote: 'uphold' | 'overturn' | 'abstain' | null;
}

const TIER_INFO = {
  1: {
    name: 'Data Request',
    description: 'The submitter must provide raw data or clarification.',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
  },
  2: {
    name: 'Blind Jury',
    description: 'Qualified jurors vote on the dispute outcome.',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    color: 'text-violet-400',
    bgColor: 'bg-violet-500/10',
    borderColor: 'border-violet-500/30',
  },
  3: {
    name: 'Nullification',
    description: 'The result has been marked as contested.',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
  },
};

const FLAW_TYPES: Record<string, { label: string; description: string }> = {
  sensory_leakage: {
    label: 'Sensory Leakage',
    description: 'Possible unintended sensory cues that could explain the result',
  },
  selection_bias: {
    label: 'Selection Bias',
    description: 'Non-random target selection or selective reporting of results',
  },
  statistical_error: {
    label: 'Statistical Error',
    description: 'Incorrect baseline, wrong statistical test, or calculation error',
  },
  protocol_violation: {
    label: 'Protocol Violation',
    description: 'Deviation from the stated methodology or pre-registration',
  },
  data_integrity: {
    label: 'Data Integrity',
    description: 'Evidence of data tampering, timestamp manipulation, or fabrication',
  },
  other: {
    label: 'Other',
    description: 'Other methodological concern not covered above',
  },
};

export default function DisputeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const disputeId = params.id as string;
  const { user, isAuthenticated } = useAuth();

  const [dispute, setDispute] = useState<Dispute | null>(null);
  const [juryAssignment, setJuryAssignment] = useState<JuryAssignment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Data response form
  const [dataResponse, setDataResponse] = useState('');
  const [submittingData, setSubmittingData] = useState(false);

  // Escalation
  const [escalating, setEscalating] = useState(false);

  useEffect(() => {
    async function fetchDispute() {
      try {
        const res = await fetch(`/api/disputes/${disputeId}`);
        const data = await res.json();

        if (!res.ok) throw new Error(data.error || 'Failed to fetch dispute');

        setDispute(data.data);

        // Check jury assignment
        if (isAuthenticated) {
          const juryRes = await fetch(`/api/disputes/${disputeId}/jury`);
          const juryData = await juryRes.json();
          if (juryData.assignment) {
            setJuryAssignment(juryData.assignment);
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load dispute');
      } finally {
        setLoading(false);
      }
    }

    fetchDispute();
  }, [disputeId, isAuthenticated]);

  const handleProvideData = async () => {
    if (!dataResponse.trim()) return;

    setSubmittingData(true);
    try {
      const res = await fetch(`/api/disputes/${disputeId}/provide-data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: dataResponse }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to submit data');
      }

      // Refresh dispute
      const refreshRes = await fetch(`/api/disputes/${disputeId}`);
      const refreshData = await refreshRes.json();
      setDispute(refreshData.data);
      setDataResponse('');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to submit data');
    } finally {
      setSubmittingData(false);
    }
  };

  const handleEscalate = async () => {
    if (!confirm('Are you sure you want to escalate this dispute to the next tier?')) return;

    setEscalating(true);
    try {
      const res = await fetch(`/api/disputes/${disputeId}/escalate`, {
        method: 'POST',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to escalate');
      }

      // Refresh dispute
      const refreshRes = await fetch(`/api/disputes/${disputeId}`);
      const refreshData = await refreshRes.json();
      setDispute(refreshData.data);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to escalate');
    } finally {
      setEscalating(false);
    }
  };

  const handleVoteSubmitted = async () => {
    // Refresh dispute after vote
    const res = await fetch(`/api/disputes/${disputeId}`);
    const data = await res.json();
    setDispute(data.data);

    // Refresh jury assignment
    const juryRes = await fetch(`/api/disputes/${disputeId}/jury`);
    const juryData = await juryRes.json();
    if (juryData.assignment) {
      setJuryAssignment(juryData.assignment);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <div className="h-10 w-10 mx-auto animate-spin rounded-full border-4 border-violet-500 border-t-transparent" />
          <p className="mt-4 text-zinc-400">Loading dispute...</p>
        </div>
      </div>
    );
  }

  if (error || !dispute) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto bg-red-500/20 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-red-400 mb-2">Dispute Not Found</h1>
          <p className="text-zinc-400 mb-4">{error || 'This dispute does not exist.'}</p>
          <Link href="/disputes" className="text-violet-400 hover:underline">
            Back to Disputes
          </Link>
        </div>
      </div>
    );
  }

  const tierInfo = TIER_INFO[dispute.tier as keyof typeof TIER_INFO];
  const flawInfo = dispute.flag ? FLAW_TYPES[dispute.flag.flaw_type] : null;
  const isOwner = dispute.result?.tester && user?.id === dispute.result.tester.display_name; // Simplified check
  const canProvideData = dispute.tier === 1 && dispute.status === 'open' && !dispute.data_provided && isOwner;
  const canVote = juryAssignment && !juryAssignment.has_voted && dispute.tier === 2 && dispute.status === 'open';

  const daysRemaining = dispute.tier === 1 && dispute.status === 'open'
    ? Math.max(0, 7 - Math.floor((Date.now() - new Date(dispute.created_at).getTime()) / (1000 * 60 * 60 * 24)))
    : null;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/50">
        <div className="mx-auto max-w-4xl px-4 py-6">
          <Link
            href="/disputes"
            className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200 mb-4"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Disputes
          </Link>

          <div className="flex items-center gap-4">
            <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${tierInfo.bgColor} ${tierInfo.color}`}>
              {tierInfo.icon}
            </div>
            <div>
              <h1 className="text-2xl font-bold">
                Tier {dispute.tier}: {tierInfo.name}
              </h1>
              <p className="text-zinc-400">{tierInfo.description}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8 space-y-6">
        {/* Status banner */}
        <div className={`rounded-xl border ${tierInfo.borderColor} ${tierInfo.bgColor} p-4`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className={`rounded-full px-3 py-1 text-sm font-medium ${
                dispute.status === 'open' ? 'bg-amber-500/20 text-amber-400' :
                dispute.status === 'resolved' ? 'bg-emerald-500/20 text-emerald-400' :
                dispute.status === 'escalated' ? 'bg-violet-500/20 text-violet-400' :
                'bg-red-500/20 text-red-400'
              }`}>
                {dispute.status.charAt(0).toUpperCase() + dispute.status.slice(1)}
              </span>
              <span className="text-sm text-zinc-400">
                Opened {new Date(dispute.created_at).toLocaleDateString()}
              </span>
            </div>

            {daysRemaining !== null && dispute.status === 'open' && (
              <span className={`text-sm ${daysRemaining <= 2 ? 'text-red-400' : 'text-amber-400'}`}>
                {daysRemaining} days remaining to respond
              </span>
            )}
          </div>
        </div>

        {/* Flag details */}
        {dispute.flag && flawInfo && (
          <div className="rounded-xl border border-zinc-700 bg-zinc-800/50 p-6 space-y-4">
            <h2 className="text-lg font-semibold text-zinc-100">Contested Issue</h2>

            <div className="flex items-center gap-3">
              <span className={`rounded-full px-3 py-1 text-sm font-medium ${
                dispute.flag.severity === 'fatal' ? 'bg-red-500/20 text-red-400' :
                dispute.flag.severity === 'major' ? 'bg-amber-500/20 text-amber-400' :
                'bg-zinc-700 text-zinc-400'
              }`}>
                {dispute.flag.severity.charAt(0).toUpperCase() + dispute.flag.severity.slice(1)} Severity
              </span>
              <span className="font-medium text-zinc-200">{flawInfo.label}</span>
            </div>

            <p className="text-zinc-300">{dispute.flag.description}</p>

            {dispute.flag.evidence && (
              <div className="rounded-lg bg-zinc-900/50 p-4">
                <div className="text-sm text-zinc-500 mb-1">Supporting Evidence</div>
                <p className="text-sm text-zinc-400">{dispute.flag.evidence}</p>
              </div>
            )}
          </div>
        )}

        {/* Result being disputed */}
        {dispute.result && (
          <div className="rounded-xl border border-zinc-700 bg-zinc-800/50 p-6 space-y-4">
            <h2 className="text-lg font-semibold text-zinc-100">Result Under Dispute</h2>

            <div className="grid grid-cols-3 gap-4">
              <div className="rounded-lg bg-zinc-900/50 p-3">
                <div className="text-xs text-zinc-500 mb-1">Effect Observed</div>
                <div className={`font-bold ${dispute.result.effect_observed ? 'text-emerald-400' : 'text-zinc-400'}`}>
                  {dispute.result.effect_observed ? 'Yes' : 'No'}
                </div>
              </div>
              <div className="rounded-lg bg-zinc-900/50 p-3">
                <div className="text-xs text-zinc-500 mb-1">P-Value</div>
                <div className="font-bold text-zinc-100">
                  {dispute.result.p_value.toFixed(4)}
                </div>
              </div>
              <div className="rounded-lg bg-zinc-900/50 p-3">
                <div className="text-xs text-zinc-500 mb-1">Sample Size</div>
                <div className="font-bold text-zinc-100">
                  n = {dispute.result.sample_size}
                </div>
              </div>
            </div>

            {dispute.result.description && (
              <div>
                <div className="text-sm font-medium text-zinc-300 mb-1">Description</div>
                <p className="text-sm text-zinc-400">{dispute.result.description}</p>
              </div>
            )}

            <Link
              href={`/predictions/${dispute.result.prediction_id}`}
              className="inline-flex items-center gap-2 text-sm text-violet-400 hover:underline"
            >
              View Full Prediction
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        )}

        {/* Tier 1: Data Request */}
        {dispute.tier === 1 && (
          <div className="rounded-xl border border-zinc-700 bg-zinc-800/50 p-6 space-y-4">
            <h2 className="text-lg font-semibold text-zinc-100">Data Request</h2>

            {dispute.data_requested && (
              <div>
                <div className="text-sm font-medium text-zinc-300 mb-1">Requested Information</div>
                <p className="text-sm text-zinc-400">{dispute.data_requested}</p>
              </div>
            )}

            {dispute.data_provided ? (
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="font-medium text-emerald-400">Data Provided</span>
                  {dispute.data_provided_at && (
                    <span className="text-sm text-emerald-400/70">
                      on {new Date(dispute.data_provided_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <p className="text-sm text-zinc-300">{dispute.data_provided}</p>
              </div>
            ) : canProvideData ? (
              <div className="space-y-3">
                <textarea
                  value={dataResponse}
                  onChange={(e) => setDataResponse(e.target.value)}
                  rows={4}
                  placeholder="Provide the requested data or clarification..."
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-zinc-100 placeholder-zinc-500 focus:border-violet-500 focus:outline-none"
                />
                <button
                  onClick={handleProvideData}
                  disabled={submittingData || !dataResponse.trim()}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
                >
                  {submittingData ? 'Submitting...' : 'Submit Response'}
                </button>
              </div>
            ) : (
              <div className="rounded-lg bg-zinc-900/50 p-4 text-center text-sm text-zinc-500">
                Awaiting response from the result submitter
              </div>
            )}
          </div>
        )}

        {/* Tier 2: Jury Voting */}
        {dispute.tier === 2 && (
          <div className="space-y-4">
            {/* Voting progress */}
            <div className="rounded-xl border border-zinc-700 bg-zinc-800/50 p-6 space-y-4">
              <h2 className="text-lg font-semibold text-zinc-100">Jury Voting</h2>

              {dispute.jury_votes ? (
                <div>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex-1">
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-emerald-400">Uphold ({dispute.jury_votes.uphold})</span>
                        <span className="text-red-400">Overturn ({dispute.jury_votes.overturn})</span>
                      </div>
                      <div className="h-3 rounded-full bg-zinc-700 overflow-hidden flex">
                        <div
                          className="bg-emerald-500 transition-all"
                          style={{
                            width: `${(dispute.jury_votes.uphold / 5) * 100}%`,
                          }}
                        />
                        <div
                          className="bg-red-500 transition-all"
                          style={{
                            width: `${(dispute.jury_votes.overturn / 5) * 100}%`,
                          }}
                        />
                      </div>
                      <div className="text-xs text-zinc-500 mt-1">
                        {dispute.jury_votes.abstain} abstained
                        {' '}&bull;{' '}
                        {5 - dispute.jury_votes.uphold - dispute.jury_votes.overturn - dispute.jury_votes.abstain} pending
                      </div>
                    </div>
                  </div>

                  {dispute.jury_decision && (
                    <div className={`rounded-lg p-4 ${
                      dispute.jury_decision === 'uphold' ? 'bg-emerald-500/10 border border-emerald-500/30' :
                      dispute.jury_decision === 'overturn' ? 'bg-red-500/10 border border-red-500/30' :
                      'bg-amber-500/10 border border-amber-500/30'
                    }`}>
                      <span className="font-medium">
                        Jury Decision: {dispute.jury_decision.charAt(0).toUpperCase() + dispute.jury_decision.slice(1)}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-zinc-400">Waiting for jurors to cast their votes...</p>
              )}
            </div>

            {/* Jury voting interface */}
            {canVote && (
              <JuryVoting
                disputeId={dispute.id}
                flag={dispute.flag}
                result={dispute.result}
                onVoteSubmitted={handleVoteSubmitted}
              />
            )}

            {juryAssignment?.has_voted && (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-center">
                <div className="flex items-center justify-center gap-2">
                  <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-emerald-400">
                    You voted to <strong>{juryAssignment.my_vote}</strong> the flag
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tier 3: Nullification */}
        {dispute.tier === 3 && dispute.nullification_reason && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6 space-y-4">
            <h2 className="text-lg font-semibold text-red-400">Nullification Notice</h2>
            <p className="text-zinc-300">{dispute.nullification_reason}</p>
            <p className="text-sm text-zinc-500">
              This result has been marked as contested and will be displayed with a warning label.
            </p>
          </div>
        )}

        {/* Escalation button */}
        {dispute.status === 'open' && dispute.tier < 3 && isAuthenticated && (
          <div className="flex justify-end">
            <button
              onClick={handleEscalate}
              disabled={escalating}
              className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-400 hover:bg-zinc-800 disabled:opacity-50"
            >
              {escalating ? 'Escalating...' : `Escalate to Tier ${dispute.tier + 1}`}
            </button>
          </div>
        )}

        {/* Resolution summary */}
        {dispute.status === 'resolved' && (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-6">
            <div className="flex items-center gap-3 mb-2">
              <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h2 className="text-lg font-semibold text-emerald-400">Dispute Resolved</h2>
            </div>
            <p className="text-zinc-300">
              This dispute was resolved on {dispute.resolved_at ? new Date(dispute.resolved_at).toLocaleDateString() : 'unknown date'}.
              {dispute.jury_decision && (
                <> The jury voted to <strong>{dispute.jury_decision}</strong> the flag.</>
              )}
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
