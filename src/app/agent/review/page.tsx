'use client';

/**
 * Finding Review Queue Page
 * Browse and filter agent findings awaiting human review
 */

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { FindingCard } from '@/components/agent/FindingCard';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';

interface Finding {
  id: string;
  title: string;
  display_title: string;
  confidence: number | null;
  review_status: string | null;
  rejection_reason?: string | null;
  created_at: string | null;
  session_id: string | null;
  agent_id: string | null;
  domains: string[];
}

interface Counts {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  needs_info: number;
}

type FilterStatus = 'all' | 'pending' | 'approved' | 'rejected' | 'needs_info';

const REJECTION_REASONS = [
  { value: 'duplicate', label: 'Duplicate' },
  { value: 'methodology', label: 'Methodology Issue' },
  { value: 'insufficient_evidence', label: 'Insufficient Evidence' },
  { value: 'already_known', label: 'Already Known' },
  { value: 'not_actionable', label: 'Not Actionable' },
  { value: 'other', label: 'Other' },
];

export default function ReviewQueuePage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [findings, setFindings] = useState<Finding[]>([]);
  const [counts, setCounts] = useState<Counts>({ total: 0, pending: 0, approved: 0, rejected: 0, needs_info: 0 });
  const [filter, setFilter] = useState<FilterStatus>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bulkSelectMode, setBulkSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkRejectReason, setBulkRejectReason] = useState('duplicate');
  const [isBulkRejecting, setIsBulkRejecting] = useState(false);

  // Redirect non-authenticated users to the public agent page
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/agent');
    }
  }, [user, authLoading, router]);

  const fetchFindings = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (filter !== 'all') {
        params.set('status', filter);
      }

      const res = await fetch(`/api/agent/findings?${params}`);
      if (!res.ok) throw new Error('Failed to fetch findings');

      const data = await res.json();
      setFindings(data.findings || []);
      setCounts(data.counts || { total: 0, pending: 0, approved: 0, rejected: 0, needs_info: 0 });
    } catch (err) {
      console.error('Error fetching findings:', err);
      setError(err instanceof Error ? err.message : 'Failed to load findings');
    } finally {
      setIsLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchFindings();
  }, [fetchFindings]);

  const handleSelect = (id: string, selected: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (selected) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    const pendingFindings = findings.filter(f => f.review_status === 'pending');
    if (selectedIds.size === pendingFindings.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pendingFindings.map(f => f.id)));
    }
  };

  const handleBulkReject = async () => {
    if (selectedIds.size === 0) return;

    setIsBulkRejecting(true);
    try {
      const promises = Array.from(selectedIds).map(id =>
        fetch(`/api/agent/findings/${id}/reject`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reason: bulkRejectReason,
            notes: `Bulk rejected as ${bulkRejectReason}`
          }),
        })
      );

      await Promise.all(promises);
      setSelectedIds(new Set());
      setBulkSelectMode(false);
      fetchFindings();
    } catch (err) {
      console.error('Bulk reject failed:', err);
      setError('Failed to reject selected findings');
    } finally {
      setIsBulkRejecting(false);
    }
  };

  const filterTabs: { key: FilterStatus; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: counts.total },
    { key: 'pending', label: 'Pending', count: counts.pending },
    { key: 'approved', label: 'Approved', count: counts.approved },
    { key: 'rejected', label: 'Rejected', count: counts.rejected },
    { key: 'needs_info', label: 'Needs Info', count: counts.needs_info },
  ];

  if (authLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-zinc-400 mb-4">Sign in to access the review queue</p>
          <Link href="/agent" className="text-brand-400 hover:text-brand-300 underline">Back to Agents</Link>
        </div>
      </div>
    );
  }

  return (
    <PageWrapper
      title="Finding Review Queue"
      description="Review and act on agent-discovered findings"
      headerAction={
        <Link
          href="/agent"
          className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-sm font-medium transition-colors"
        >
          ← Back to Terminal
        </Link>
      }
    >
      {/* Stats bar */}
      <div className="mb-6 p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg">
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-zinc-500 text-sm">Pending review:</span>
            <span className={`font-medium ${counts.pending > 0 ? 'text-amber-400' : 'text-zinc-400'}`}>
              {counts.pending}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-zinc-500 text-sm">Approved:</span>
            <span className="text-emerald-400 font-medium">{counts.approved}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-zinc-500 text-sm">Rejected:</span>
            <span className="text-red-400 font-medium">{counts.rejected}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-zinc-500 text-sm">Needs Info:</span>
            <span className="text-blue-400 font-medium">{counts.needs_info}</span>
          </div>
        </div>
      </div>

      {/* Filter tabs and bulk actions */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          {filterTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                filter === tab.key
                  ? 'bg-brand-600 text-white'
                  : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700'
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className={`ml-2 px-1.5 py-0.5 text-xs rounded ${
                  filter === tab.key ? 'bg-white/20' : 'bg-zinc-700'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Bulk select toggle */}
        {counts.pending > 0 && (
          <button
            onClick={() => {
              setBulkSelectMode(!bulkSelectMode);
              setSelectedIds(new Set());
            }}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              bulkSelectMode
                ? 'bg-brand-600 text-white'
                : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700'
            }`}
          >
            {bulkSelectMode ? 'Cancel Selection' : 'Bulk Select'}
          </button>
        )}
      </div>

      {/* Bulk action toolbar */}
      {bulkSelectMode && (
        <div className="mb-6 p-4 bg-zinc-900/80 border border-zinc-700 rounded-lg flex flex-wrap items-center gap-4">
          <button
            onClick={handleSelectAll}
            className="px-3 py-1.5 text-sm bg-zinc-700 hover:bg-zinc-600 text-zinc-200 rounded transition-colors"
          >
            {selectedIds.size === findings.filter(f => f.review_status === 'pending').length
              ? 'Deselect All'
              : 'Select All Pending'}
          </button>

          <span className="text-zinc-400 text-sm">
            {selectedIds.size} selected
          </span>

          {selectedIds.size > 0 && (
            <>
              <select
                value={bulkRejectReason}
                onChange={(e) => setBulkRejectReason(e.target.value)}
                className="px-3 py-1.5 text-sm bg-zinc-800 border border-zinc-700 text-zinc-200 rounded"
              >
                {REJECTION_REASONS.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>

              <button
                onClick={handleBulkReject}
                disabled={isBulkRejecting}
                className="px-4 py-1.5 text-sm bg-red-600 hover:bg-red-500 disabled:bg-red-800 disabled:cursor-not-allowed text-white rounded transition-colors"
              >
                {isBulkRejecting ? 'Rejecting...' : `Reject ${selectedIds.size} as ${bulkRejectReason}`}
              </button>
            </>
          )}
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="p-4 bg-red-900/20 border border-red-500/30 rounded-lg text-red-400">
          {error}
        </div>
      )}

      {/* Findings grid */}
      {!isLoading && !error && (
        <>
          {findings.length === 0 ? (
            <div className="py-12 text-center">
              <div className="text-6xl mb-4">🔍</div>
              <h3 className="text-xl font-medium text-zinc-300 mb-2">No findings to review</h3>
              <p className="text-zinc-500 max-w-md mx-auto">
                {filter === 'all'
                  ? 'The agent hasn\'t discovered any findings yet. Run an analysis to generate findings.'
                  : `No findings with status "${filter}".`}
              </p>
              <Link
                href="/agent"
                className="inline-block mt-6 px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Go to Agent Terminal
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {findings.map((finding) => (
                <FindingCard
                  key={finding.id}
                  finding={finding}
                  selectable={bulkSelectMode && finding.review_status === 'pending'}
                  selected={selectedIds.has(finding.id)}
                  onSelect={handleSelect}
                />
              ))}
            </div>
          )}
        </>
      )}
    </PageWrapper>
  );
}
