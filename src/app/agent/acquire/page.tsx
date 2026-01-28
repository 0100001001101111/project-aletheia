'use client';

/**
 * Data Acquisition Queue Page
 * Review and approve/reject data acquisition requests
 */

import { useEffect, useState, useCallback } from 'react';
import { PageWrapper } from '@/components/layout/PageWrapper';
import Link from 'next/link';

interface AcquisitionRequest {
  id: string;
  gap_type: string;
  gap_description: string;
  source_name: string;
  source_url: string;
  source_type: string | null;
  domain: string | null;
  estimated_records: number | null;
  quality_estimate: string | null;
  quality_reasoning: string | null;
  access_method: string | null;
  extraction_notes: string | null;
  status: string;
  review_notes: string | null;
  records_acquired: number | null;
  created_at: string | null;
}

interface Stats {
  total: number;
  pending: number;
  approved: number;
  completed: number;
  failed: number;
  totalRecordsAcquired: number;
}

const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  pending: { bg: 'bg-amber-500/10', text: 'text-amber-400' },
  approved: { bg: 'bg-blue-500/10', text: 'text-blue-400' },
  in_progress: { bg: 'bg-purple-500/10', text: 'text-purple-400' },
  completed: { bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
  rejected: { bg: 'bg-red-500/10', text: 'text-red-400' },
  failed: { bg: 'bg-red-500/10', text: 'text-red-400' },
};

const QUALITY_STYLES: Record<string, { bg: string; text: string }> = {
  high: { bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
  medium: { bg: 'bg-amber-500/10', text: 'text-amber-400' },
  low: { bg: 'bg-red-500/10', text: 'text-red-400' },
};

const GAP_TYPE_LABELS: Record<string, string> = {
  temporal: 'Temporal Gap',
  geographic: 'Geographic Gap',
  domain: 'Domain Gap',
  verification: 'Verification Gap',
};

export default function AcquisitionQueuePage() {
  const [requests, setRequests] = useState<AcquisitionRequest[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const url = statusFilter === 'all'
        ? '/api/agent/acquisitions'
        : `/api/agent/acquisitions?status=${statusFilter}`;

      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch acquisitions');

      const data = await res.json();
      setRequests(data.requests || []);
      setStats(data.stats || null);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAction = async (id: string, action: 'approve' | 'reject') => {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/agent/acquisitions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Action failed');
      }

      // Refresh data
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setActionLoading(null);
    }
  };

  const handleExecute = async (id: string) => {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/agent/acquisitions/${id}/execute`, {
        method: 'POST',
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Execution failed');
      }

      // Show result
      alert(`Acquisition complete!\n\n${data.summary || 'Success'}`);

      // Refresh data
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Execution failed');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <PageWrapper>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Link
                href="/agent"
                className="text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                ← Agent
              </Link>
            </div>
            <h1 className="text-2xl font-bold text-zinc-100">
              Data Acquisition Queue
            </h1>
            <p className="text-zinc-400 mt-1">
              Review and approve data acquisition requests from the agent
            </p>
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <div className="p-4 bg-zinc-800/50 border border-zinc-700/50 rounded-lg">
              <div className="text-2xl font-bold text-zinc-100">{stats.pending}</div>
              <div className="text-sm text-amber-400">Pending</div>
            </div>
            <div className="p-4 bg-zinc-800/50 border border-zinc-700/50 rounded-lg">
              <div className="text-2xl font-bold text-zinc-100">{stats.approved}</div>
              <div className="text-sm text-blue-400">Approved</div>
            </div>
            <div className="p-4 bg-zinc-800/50 border border-zinc-700/50 rounded-lg">
              <div className="text-2xl font-bold text-zinc-100">{stats.completed}</div>
              <div className="text-sm text-emerald-400">Completed</div>
            </div>
            <div className="p-4 bg-zinc-800/50 border border-zinc-700/50 rounded-lg">
              <div className="text-2xl font-bold text-zinc-100">{stats.failed}</div>
              <div className="text-sm text-red-400">Failed</div>
            </div>
            <div className="p-4 bg-zinc-800/50 border border-zinc-700/50 rounded-lg">
              <div className="text-2xl font-bold text-zinc-100">
                {stats.totalRecordsAcquired.toLocaleString()}
              </div>
              <div className="text-sm text-zinc-400">Records Acquired</div>
            </div>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
          {['pending', 'approved', 'completed', 'rejected', 'all'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                statusFilter === status
                  ? 'bg-brand-500 text-white'
                  : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400">
            {error}
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <div className="text-center py-12 text-zinc-400">Loading...</div>
        ) : requests.length === 0 ? (
          <div className="text-center py-12 text-zinc-400">
            No {statusFilter === 'all' ? '' : statusFilter} acquisition requests
          </div>
        ) : (
          /* Request List */
          <div className="space-y-4">
            {requests.map((request) => (
              <div
                key={request.id}
                className="p-5 bg-zinc-800/50 border border-zinc-700/50 rounded-lg"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    {/* Title and badges */}
                    <div className="flex items-center gap-3 flex-wrap mb-2">
                      <h3 className="text-lg font-semibold text-zinc-100">
                        {request.source_name}
                      </h3>
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-medium ${
                          STATUS_STYLES[request.status]?.bg || 'bg-zinc-700'
                        } ${STATUS_STYLES[request.status]?.text || 'text-zinc-400'}`}
                      >
                        {request.status}
                      </span>
                      {request.quality_estimate && (
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-medium ${
                            QUALITY_STYLES[request.quality_estimate]?.bg || 'bg-zinc-700'
                          } ${QUALITY_STYLES[request.quality_estimate]?.text || 'text-zinc-400'}`}
                        >
                          {request.quality_estimate} quality
                        </span>
                      )}
                      {request.domain && (
                        <span className="px-2 py-0.5 bg-zinc-700/50 text-zinc-400 rounded text-xs">
                          {request.domain}
                        </span>
                      )}
                    </div>

                    {/* Gap info */}
                    <div className="mb-3">
                      <span className="text-xs text-zinc-500">
                        {GAP_TYPE_LABELS[request.gap_type] || request.gap_type}:
                      </span>
                      <p className="text-sm text-zinc-300">{request.gap_description}</p>
                    </div>

                    {/* Source URL */}
                    <div className="mb-3">
                      <span className="text-xs text-zinc-500">Source:</span>
                      <a
                        href={request.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-sm text-brand-400 hover:underline truncate"
                      >
                        {request.source_url}
                      </a>
                    </div>

                    {/* Details grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      {request.estimated_records && (
                        <div>
                          <span className="text-zinc-500">Est. Records:</span>
                          <span className="ml-2 text-zinc-300">
                            ~{request.estimated_records.toLocaleString()}
                          </span>
                        </div>
                      )}
                      {request.access_method && (
                        <div>
                          <span className="text-zinc-500">Method:</span>
                          <span className="ml-2 text-zinc-300">{request.access_method}</span>
                        </div>
                      )}
                      {request.records_acquired !== null && (
                        <div>
                          <span className="text-zinc-500">Acquired:</span>
                          <span className="ml-2 text-emerald-400">
                            {request.records_acquired.toLocaleString()}
                          </span>
                        </div>
                      )}
                      {request.created_at && (
                        <div>
                          <span className="text-zinc-500">Created:</span>
                          <span className="ml-2 text-zinc-300">
                            {new Date(request.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Quality reasoning */}
                    {request.quality_reasoning && (
                      <p className="mt-3 text-xs text-zinc-500">{request.quality_reasoning}</p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2">
                    {request.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleAction(request.id, 'approve')}
                          disabled={actionLoading === request.id}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                        >
                          {actionLoading === request.id ? '...' : 'Approve'}
                        </button>
                        <button
                          onClick={() => handleAction(request.id, 'reject')}
                          disabled={actionLoading === request.id}
                          className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                        >
                          Reject
                        </button>
                      </>
                    )}
                    {request.status === 'approved' && (
                      <button
                        onClick={() => handleExecute(request.id)}
                        disabled={actionLoading === request.id}
                        className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                      >
                        {actionLoading === request.id ? 'Running...' : 'Execute'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
