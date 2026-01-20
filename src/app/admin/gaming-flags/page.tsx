'use client';

/**
 * Admin Gaming Flags Review Page
 * Review and take action on flagged submissions
 */

import { useState, useEffect } from 'react';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { formatDistanceToNow } from 'date-fns';

interface GamingFlag {
  id: string;
  userId: string | null;
  draftId: string;
  flagType: 'rigor_drift' | 'credential_inflation' | 'excessive_iteration';
  severity: 'low' | 'medium' | 'high';
  details: Record<string, unknown>;
  reviewed: boolean;
  reviewedBy: string | null;
  reviewedAt: string | null;
  outcome: string | null;
  createdAt: string;
  // Joined data
  userName?: string;
  draftTitle?: string;
}

type FilterSeverity = 'all' | 'low' | 'medium' | 'high';
type FilterStatus = 'all' | 'pending' | 'reviewed';

export default function GamingFlagsPage() {
  const [flags, setFlags] = useState<GamingFlag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [severityFilter, setSeverityFilter] = useState<FilterSeverity>('all');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('pending');
  const [selectedFlag, setSelectedFlag] = useState<GamingFlag | null>(null);
  const [isActioning, setIsActioning] = useState(false);

  useEffect(() => {
    fetchFlags();
  }, [severityFilter, statusFilter]);

  const fetchFlags = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (severityFilter !== 'all') params.set('severity', severityFilter);
      if (statusFilter !== 'all') params.set('status', statusFilter);

      const response = await fetch(`/api/admin/gaming-flags?${params}`);
      if (!response.ok) throw new Error('Failed to fetch flags');

      const data = await response.json();
      setFlags(data.flags || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load flags');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAction = async (
    flagId: string,
    outcome: 'dismissed' | 'warning' | 'submission_blocked'
  ) => {
    setIsActioning(true);

    try {
      const response = await fetch(`/api/admin/gaming-flags/${flagId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ outcome }),
      });

      if (!response.ok) throw new Error('Failed to update flag');

      // Refresh the list
      await fetchFlags();
      setSelectedFlag(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update flag');
    } finally {
      setIsActioning(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'medium': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'low': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      default: return 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30';
    }
  };

  const getFlagTypeLabel = (type: string) => {
    switch (type) {
      case 'rigor_drift': return 'Rigor Drift';
      case 'credential_inflation': return 'Credential Inflation';
      case 'excessive_iteration': return 'Excessive Iteration';
      default: return type;
    }
  };

  return (
    <PageWrapper>
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-zinc-100">Gaming Flags Review</h1>
            <p className="mt-1 text-zinc-400">
              Review and take action on flagged submissions
            </p>
          </div>
          <div className="flex flex-wrap gap-2 sm:gap-4">
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value as FilterSeverity)}
              className="flex-1 sm:flex-none rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200"
            >
              <option value="all">All Severities</option>
              <option value="high">High Only</option>
              <option value="medium">Medium Only</option>
              <option value="low">Low Only</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as FilterStatus)}
              className="flex-1 sm:flex-none rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200"
            >
              <option value="pending">Pending Review</option>
              <option value="reviewed">Reviewed</option>
              <option value="all">All</option>
            </select>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-500 border-t-transparent" />
          </div>
        ) : flags.length === 0 ? (
          <div className="rounded-xl border border-zinc-700 bg-zinc-900/50 p-12 text-center">
            <div className="text-4xl mb-4">✓</div>
            <h3 className="text-lg font-medium text-zinc-200">No Flags to Review</h3>
            <p className="mt-2 text-zinc-500">
              {statusFilter === 'pending'
                ? 'All gaming flags have been reviewed'
                : 'No flags match the current filters'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {flags.map((flag) => (
              <div
                key={flag.id}
                className={`rounded-xl border bg-zinc-900/50 p-6 transition-colors ${
                  selectedFlag?.id === flag.id
                    ? 'border-violet-500/50'
                    : 'border-zinc-700 hover:border-zinc-600'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium uppercase border ${getSeverityColor(flag.severity)}`}>
                        {flag.severity}
                      </span>
                      <span className="text-sm font-medium text-zinc-200">
                        {getFlagTypeLabel(flag.flagType)}
                      </span>
                      {flag.reviewed && (
                        <span className="px-2 py-1 rounded bg-emerald-500/20 text-emerald-400 text-xs">
                          Reviewed: {flag.outcome}
                        </span>
                      )}
                    </div>

                    <div className="text-sm text-zinc-400 mb-3">
                      Draft: <span className="text-zinc-300">{flag.draftTitle || flag.draftId.slice(0, 8)}</span>
                      {flag.userName && (
                        <> • User: <span className="text-zinc-300">{flag.userName}</span></>
                      )}
                      <> • <span>{formatDistanceToNow(new Date(flag.createdAt), { addSuffix: true })}</span></>
                    </div>

                    {/* Flag Details */}
                    <div className="rounded-lg bg-zinc-800/50 p-4 text-sm">
                      {flag.flagType === 'rigor_drift' && (
                        <div>
                          <p className="text-zinc-300">
                            Score jumped from <span className="text-amber-400">{(flag.details.previousScore as number)?.toFixed(1)}</span> to{' '}
                            <span className="text-amber-400">{(flag.details.currentScore as number)?.toFixed(1)}</span> without new evidence
                          </p>
                        </div>
                      )}
                      {flag.flagType === 'credential_inflation' && (
                        <div>
                          <p className="text-zinc-300">
                            Witness credentials upgraded without supporting documentation:
                          </p>
                          <pre className="mt-2 text-xs text-zinc-500 overflow-x-auto">
                            {JSON.stringify(flag.details.upgrades, null, 2)}
                          </pre>
                        </div>
                      )}
                      {flag.flagType === 'excessive_iteration' && (
                        <p className="text-zinc-300">
                          <span className="text-amber-400">{flag.details.iterationCount as number}</span> score calculations on this draft
                        </p>
                      )}
                    </div>
                  </div>

                  {!flag.reviewed && (
                    <div className="flex flex-row sm:flex-col gap-2 mt-4 sm:mt-0 sm:ml-4 w-full sm:w-auto">
                      <button
                        onClick={() => handleAction(flag.id, 'dismissed')}
                        disabled={isActioning}
                        className="flex-1 sm:flex-none px-3 py-1.5 rounded-lg border border-zinc-600 text-sm text-zinc-300 hover:bg-zinc-700 disabled:opacity-50"
                      >
                        Dismiss
                      </button>
                      <button
                        onClick={() => handleAction(flag.id, 'warning')}
                        disabled={isActioning}
                        className="flex-1 sm:flex-none px-3 py-1.5 rounded-lg border border-amber-500/50 text-sm text-amber-400 hover:bg-amber-500/10 disabled:opacity-50"
                      >
                        Warn
                      </button>
                      <button
                        onClick={() => handleAction(flag.id, 'submission_blocked')}
                        disabled={isActioning}
                        className="flex-1 sm:flex-none px-3 py-1.5 rounded-lg border border-red-500/50 text-sm text-red-400 hover:bg-red-500/10 disabled:opacity-50"
                      >
                        Block
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
