'use client';

/**
 * Agent Review Page - Public view of all agent findings
 * Filterable by agent, type, confidence threshold with expandable cards
 */

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { AGENT_META, getAgentMeta, DESTINATION_TYPES } from '@/lib/agent-meta';

interface Finding {
  id: string;
  title: string;
  display_title: string;
  summary: string | null;
  confidence: number | null;
  review_status: string | null;
  destination_type: string | null;
  destination_status: string | null;
  agent_id: string | null;
  created_at: string | null;
  rejection_reason: string | null;
  technical_details: Record<string, unknown> | null;
  supporting_tests: string[] | null;
  suggested_prediction: string | null;
}

function confidenceBarColor(c: number) {
  if (c >= 0.7) return 'bg-green-500';
  if (c >= 0.4) return 'bg-amber-500';
  return 'bg-red-500';
}

function confidenceTextColor(c: number) {
  if (c >= 0.7) return 'text-green-400';
  if (c >= 0.4) return 'text-amber-400';
  return 'text-red-400';
}

export default function AgentReviewPage() {
  const [findings, setFindings] = useState<Finding[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [agentFilter, setAgentFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [minConfidence, setMinConfidence] = useState('');
  const [sort, setSort] = useState('newest');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const fetchFindings = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (agentFilter) params.set('agent', agentFilter);
      if (typeFilter) params.set('type', typeFilter);
      if (minConfidence) params.set('minConfidence', minConfidence);
      params.set('sort', sort);

      const res = await fetch(`/api/agent-review?${params}`);
      if (!res.ok) throw new Error('Failed to fetch findings');

      const data = await res.json();
      setFindings(data.findings || []);
      setTotal(data.total || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load findings');
    } finally {
      setIsLoading(false);
    }
  }, [agentFilter, typeFilter, minConfidence, sort]);

  useEffect(() => { fetchFindings(); }, [fetchFindings]);

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const sortedAgentIds = Object.keys(AGENT_META).sort();

  return (
    <PageWrapper
      title="Agent Findings"
      description={`${total} findings from 22 autonomous research agents`}
    >
      {/* Stats bar */}
      <div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg">
          <div className="text-2xl font-bold text-zinc-100">{total}</div>
          <div className="text-sm text-zinc-500">Total Findings</div>
        </div>
        <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg">
          <div className="text-2xl font-bold text-zinc-100">22</div>
          <div className="text-sm text-zinc-500">Research Agents</div>
        </div>
        <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg">
          <div className="text-2xl font-bold text-emerald-400">
            {findings.length > 0
              ? Math.round(findings.reduce((s, f) => s + (f.confidence || 0), 0) / findings.length * 100)
              : 0}%
          </div>
          <div className="text-sm text-zinc-500">Avg Confidence</div>
        </div>
        <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg">
          <div className="text-2xl font-bold text-amber-400">
            {findings.filter(f => f.review_status === 'pending').length}
          </div>
          <div className="text-sm text-zinc-500">Pending Review</div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg space-y-4">
        {/* Agent chips */}
        <div>
          <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2 block">Agent</label>
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setAgentFilter('')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                !agentFilter ? 'bg-brand-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
              }`}
            >All</button>
            {sortedAgentIds.map(id => {
              const meta = getAgentMeta(id);
              return (
                <button
                  key={id}
                  onClick={() => setAgentFilter(agentFilter === id ? '' : id)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                    agentFilter === id ? 'bg-brand-600 text-white' : `${meta.badge} hover:opacity-80`
                  }`}
                >{meta.name}</button>
              );
            })}
          </div>
        </div>

        {/* Type, Confidence, Sort row */}
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1 block">Type</label>
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-300 focus:border-violet-500 focus:outline-none"
            >
              {DESTINATION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1 block">Min Confidence</label>
            <input
              type="number"
              step="0.05"
              min="0"
              max="1"
              placeholder="0.00"
              value={minConfidence}
              onChange={e => setMinConfidence(e.target.value)}
              className="w-24 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-300 placeholder-zinc-500 focus:border-violet-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1 block">Sort</label>
            <select
              value={sort}
              onChange={e => setSort(e.target.value)}
              className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-300 focus:border-violet-500 focus:outline-none"
            >
              <option value="newest">Newest First</option>
              <option value="confidence">Highest Confidence</option>
            </select>
          </div>
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-900/20 border border-red-500/30 rounded-lg text-red-400">{error}</div>
      )}

      {/* Results */}
      {!isLoading && !error && (
        findings.length === 0 ? (
          <div className="py-12 text-center">
            <h3 className="text-xl font-medium text-zinc-300 mb-2">No findings match your filters</h3>
            <p className="text-zinc-500">Try adjusting your filters or clear them to see all findings.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {findings.map(finding => {
              const meta = getAgentMeta(finding.agent_id);
              const conf = finding.confidence || 0;
              const confPct = Math.round(conf * 100);
              const expanded = expandedIds.has(finding.id);
              const isRejected = finding.review_status === 'rejected';

              return (
                <div
                  key={finding.id}
                  className={`p-4 bg-zinc-900/50 border rounded-lg transition-all ${
                    isRejected ? 'border-red-500/30' : 'border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  {/* Header */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <Link href={`/agent-review/${finding.agent_id}`}>
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded hover:opacity-80 transition-opacity ${meta.badge}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                            {meta.name}
                          </span>
                        </Link>
                        {finding.destination_type && (
                          <span className="px-2 py-0.5 text-xs rounded bg-zinc-700/50 text-zinc-400">
                            {finding.destination_type.replace('_', ' ')}
                          </span>
                        )}
                        {isRejected && (
                          <span className="px-2 py-0.5 text-xs rounded bg-red-500/10 text-red-400">Flagged</span>
                        )}
                      </div>
                      <h3 className="text-base font-medium text-zinc-100 line-clamp-2">{finding.display_title}</h3>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="w-24 h-2.5 bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${confidenceBarColor(conf)}`}
                          style={{ width: `${confPct}%` }}
                        />
                      </div>
                      <span className={`text-sm font-semibold tabular-nums ${confidenceTextColor(conf)}`}>{confPct}%</span>
                    </div>
                  </div>

                  <p className="text-sm text-zinc-500 mt-1 line-clamp-1">{finding.title}</p>

                  {/* Footer */}
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-zinc-800/50">
                    <span className="text-xs text-zinc-500">
                      {finding.created_at
                        ? new Date(finding.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                        : ''}
                    </span>
                    <button
                      onClick={() => toggleExpand(finding.id)}
                      className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
                    >
                      {expanded ? 'Collapse' : 'Details'}
                    </button>
                  </div>

                  {/* Expanded */}
                  {expanded && (
                    <div className="mt-4 pt-4 border-t border-zinc-800 space-y-3 animate-fade-in">
                      {finding.summary && (
                        <div>
                          <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">Summary</h4>
                          <p className="text-sm text-zinc-300 whitespace-pre-wrap">{finding.summary}</p>
                        </div>
                      )}
                      {finding.suggested_prediction && (
                        <div>
                          <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">Suggested Prediction</h4>
                          <p className="text-sm text-zinc-400">{finding.suggested_prediction}</p>
                        </div>
                      )}
                      {finding.technical_details && Object.keys(finding.technical_details).length > 0 && (
                        <div>
                          <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">Technical Details</h4>
                          <pre className="text-xs text-zinc-400 bg-zinc-900 rounded p-3 overflow-x-auto font-mono">
                            {JSON.stringify(finding.technical_details, null, 2)}
                          </pre>
                        </div>
                      )}
                      {finding.rejection_reason && (
                        <div>
                          <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">Rejection Reason</h4>
                          <p className="text-sm text-red-400">{finding.rejection_reason}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )
      )}
    </PageWrapper>
  );
}
