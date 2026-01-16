'use client';

/**
 * Disputes Dashboard
 * View and manage dispute resolution process
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

interface Dispute {
  id: string;
  result_id: string;
  flag_id: string | null;
  tier: number;
  status: 'open' | 'resolved' | 'escalated' | 'nullified';
  data_requested: string | null;
  data_provided: string | null;
  jury_decision: 'uphold' | 'overturn' | 'partial' | null;
  jury_votes: { uphold: number; overturn: number; abstain: number } | null;
  created_at: string;
  resolved_at: string | null;
  result?: {
    id: string;
    prediction_id: string;
    effect_observed: boolean;
    p_value: number;
    sample_size: number;
  };
  flag?: {
    flaw_type: string;
    description: string;
    severity: string;
  };
}

const TIER_INFO = {
  1: {
    name: 'Data Request',
    description: 'The submitter has 7 days to provide raw data or clarification.',
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
  },
  2: {
    name: 'Blind Jury',
    description: '5 qualified jurors vote on whether the flag should be upheld.',
    color: 'text-violet-400',
    bgColor: 'bg-violet-500/10',
    borderColor: 'border-violet-500/30',
  },
  3: {
    name: 'Nullification',
    description: 'The result has been marked as contested by administrators.',
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
  },
};

const STATUS_BADGES = {
  open: { text: 'Open', color: 'bg-amber-500/20 text-amber-400' },
  resolved: { text: 'Resolved', color: 'bg-emerald-500/20 text-emerald-400' },
  escalated: { text: 'Escalated', color: 'bg-violet-500/20 text-violet-400' },
  nullified: { text: 'Nullified', color: 'bg-red-500/20 text-red-400' },
};

export default function DisputesPage() {
  const { user, isAuthenticated } = useAuth();
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'open' | 'my'>('all');
  const [myJuryDisputes, setMyJuryDisputes] = useState<string[]>([]);

  useEffect(() => {
    async function fetchDisputes() {
      try {
        const params = new URLSearchParams();
        if (filter === 'open') params.append('status', 'open');
        if (filter === 'my' && user?.id) params.append('user_id', user.id);

        const res = await fetch(`/api/disputes?${params}`);
        const data = await res.json();
        setDisputes(data.data || []);

        // Fetch jury pool status
        if (isAuthenticated) {
          const juryRes = await fetch('/api/disputes/jury-pool');
          const juryData = await juryRes.json();
          if (juryData.disputes) {
            setMyJuryDisputes(juryData.disputes.map((d: { dispute_id: string }) => d.dispute_id));
          }
        }
      } catch (err) {
        console.error('Failed to fetch disputes:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchDisputes();
  }, [filter, user?.id, isAuthenticated]);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <div className="h-10 w-10 mx-auto animate-spin rounded-full border-4 border-violet-500 border-t-transparent" />
          <p className="mt-4 text-zinc-400">Loading disputes...</p>
        </div>
      </div>
    );
  }

  const openDisputes = disputes.filter((d) => d.status === 'open');
  const resolvedDisputes = disputes.filter((d) => d.status === 'resolved');
  const juryNeeded = disputes.filter((d) => d.tier === 2 && d.status === 'open');

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/50">
        <div className="mx-auto max-w-6xl px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Dispute Resolution</h1>
              <p className="mt-1 text-zinc-400">
                Fair, transparent resolution of contested results
              </p>
            </div>
            <Link
              href="/redteam"
              className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-400 hover:bg-zinc-800"
            >
              Red-Team Dashboard
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 space-y-8">
        {/* Stats overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-xl border border-zinc-700 bg-zinc-800/50 p-4">
            <div className="text-2xl font-bold text-zinc-100">{disputes.length}</div>
            <div className="text-sm text-zinc-500">Total Disputes</div>
          </div>
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
            <div className="text-2xl font-bold text-amber-400">{openDisputes.length}</div>
            <div className="text-sm text-amber-400/70">Open</div>
          </div>
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
            <div className="text-2xl font-bold text-emerald-400">{resolvedDisputes.length}</div>
            <div className="text-sm text-emerald-400/70">Resolved</div>
          </div>
          <div className="rounded-xl border border-violet-500/30 bg-violet-500/10 p-4">
            <div className="text-2xl font-bold text-violet-400">{juryNeeded.length}</div>
            <div className="text-sm text-violet-400/70">Awaiting Jury</div>
          </div>
        </div>

        {/* Jury notification */}
        {myJuryDisputes.length > 0 && (
          <div className="rounded-xl border border-violet-500/30 bg-violet-500/10 p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-500/20">
                <svg className="w-5 h-5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </div>
              <div>
                <div className="font-medium text-violet-200">You have {myJuryDisputes.length} jury duty assignment(s)</div>
                <div className="text-sm text-violet-300/70">Your vote helps ensure fair resolution</div>
              </div>
            </div>
            <Link
              href={`/disputes/${myJuryDisputes[0]}`}
              className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500"
            >
              Cast Vote
            </Link>
          </div>
        )}

        {/* Filter tabs */}
        <div className="flex gap-2">
          {['all', 'open', 'my'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f as typeof filter)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                filter === f
                  ? 'bg-violet-600 text-white'
                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
              }`}
            >
              {f === 'all' ? 'All Disputes' : f === 'open' ? 'Open Only' : 'My Disputes'}
            </button>
          ))}
        </div>

        {/* Disputes list */}
        {disputes.length === 0 ? (
          <div className="rounded-xl border border-zinc-700 bg-zinc-800/50 p-8 text-center">
            <div className="w-16 h-16 mx-auto bg-zinc-700 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-zinc-300 mb-1">No Disputes Found</h3>
            <p className="text-sm text-zinc-500">
              {filter === 'open'
                ? 'All disputes have been resolved.'
                : filter === 'my'
                  ? "You don't have any active disputes."
                  : 'No disputes have been filed yet.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {disputes.map((dispute) => {
              const tierInfo = TIER_INFO[dispute.tier as keyof typeof TIER_INFO];
              const statusBadge = STATUS_BADGES[dispute.status];
              const isJuryAssigned = myJuryDisputes.includes(dispute.id);

              return (
                <Link
                  key={dispute.id}
                  href={`/disputes/${dispute.id}`}
                  className={`block rounded-xl border ${tierInfo.borderColor} ${tierInfo.bgColor} p-4 hover:bg-opacity-20 transition-colors`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`font-medium ${tierInfo.color}`}>
                          Tier {dispute.tier}: {tierInfo.name}
                        </span>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusBadge.color}`}>
                          {statusBadge.text}
                        </span>
                        {isJuryAssigned && (
                          <span className="rounded-full px-2 py-0.5 text-xs font-medium bg-violet-500/20 text-violet-400">
                            Jury Duty
                          </span>
                        )}
                      </div>

                      {dispute.flag && (
                        <div className="mb-2">
                          <span className="text-sm text-zinc-400">Flag: </span>
                          <span className="text-sm text-zinc-200 capitalize">
                            {dispute.flag.flaw_type.replace(/_/g, ' ')}
                          </span>
                          <span className={`ml-2 text-xs ${
                            dispute.flag.severity === 'fatal'
                              ? 'text-red-400'
                              : dispute.flag.severity === 'major'
                                ? 'text-amber-400'
                                : 'text-zinc-500'
                          }`}>
                            ({dispute.flag.severity})
                          </span>
                        </div>
                      )}

                      <p className="text-sm text-zinc-400 line-clamp-2">
                        {dispute.flag?.description || tierInfo.description}
                      </p>

                      {dispute.tier === 2 && dispute.jury_votes && (
                        <div className="mt-2 flex items-center gap-4 text-xs">
                          <span className="text-emerald-400">{dispute.jury_votes.uphold} uphold</span>
                          <span className="text-red-400">{dispute.jury_votes.overturn} overturn</span>
                          <span className="text-zinc-500">{dispute.jury_votes.abstain} abstain</span>
                        </div>
                      )}
                    </div>

                    <div className="text-right text-sm text-zinc-500">
                      <div>{new Date(dispute.created_at).toLocaleDateString()}</div>
                      {dispute.resolved_at && (
                        <div className="text-emerald-400">
                          Resolved {new Date(dispute.resolved_at).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* How it works */}
        <div className="rounded-xl border border-zinc-700 bg-zinc-800/30 p-6">
          <h3 className="text-lg font-medium text-zinc-200 mb-4">How Dispute Resolution Works</h3>
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/20 text-amber-400 font-bold">
                  1
                </div>
                <span className="font-medium text-amber-400">Tier 1: Data Request</span>
              </div>
              <p className="text-sm text-zinc-400">
                The submitter is asked to provide raw data or clarification within 7 days.
                If provided, the flag may be resolved. If not, the dispute escalates.
              </p>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-500/20 text-violet-400 font-bold">
                  2
                </div>
                <span className="font-medium text-violet-400">Tier 2: Blind Jury</span>
              </div>
              <p className="text-sm text-zinc-400">
                5 qualified users are randomly selected to vote. They see the evidence
                but not the identities. 3+ votes are needed for a decision.
              </p>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-500/20 text-red-400 font-bold">
                  3
                </div>
                <span className="font-medium text-red-400">Tier 3: Nullification</span>
              </div>
              <p className="text-sm text-zinc-400">
                If the jury cannot reach consensus or evidence of misconduct is found,
                the result is marked as &quot;contested&quot; with a public explanation.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
