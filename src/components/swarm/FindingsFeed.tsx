'use client';

import { useState } from 'react';
import { getAgentMeta, AGENT_META } from '@/lib/agent-meta';

interface Finding {
  id: string;
  title: string;
  display_title: string;
  confidence: number | null;
  review_status: string;
  agent_id: string;
  created_at: string;
}

interface FindingsFeedProps {
  findings: Finding[];
  onAction?: (id: string, action: 'approve' | 'reject') => void;
  isActioning?: string | null;
}

function statusBadge(status: string) {
  const map: Record<string, { bg: string; label: string }> = {
    pending: { bg: 'bg-yellow-500/15 text-yellow-400', label: 'Pending' },
    approved: { bg: 'bg-emerald-500/15 text-emerald-400', label: 'Approved' },
    rejected: { bg: 'bg-red-500/15 text-red-400', label: 'Rejected' },
    needs_info: { bg: 'bg-blue-500/15 text-blue-400', label: 'Info Needed' },
  };
  return map[status] || { bg: 'bg-zinc-500/15 text-zinc-400', label: status };
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function FindingsFeed({ findings, onAction, isActioning }: FindingsFeedProps) {
  const [agentFilter, setAgentFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [minConfidence, setMinConfidence] = useState<number>(0);

  const agentIds = Array.from(new Set(findings.map(f => f.agent_id).filter(Boolean)));

  const filtered = findings.filter(f => {
    if (agentFilter !== 'all' && f.agent_id !== agentFilter) return false;
    if (statusFilter !== 'all' && f.review_status !== statusFilter) return false;
    if (f.confidence !== null && f.confidence < minConfidence) return false;
    return true;
  });

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
      <h3 className="text-sm font-semibold text-zinc-200 mb-4">Findings Feed (7d)</h3>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <select
          value={agentFilter}
          onChange={e => setAgentFilter(e.target.value)}
          className="px-2 py-1 text-xs bg-zinc-800 border border-zinc-700 text-zinc-300 rounded"
        >
          <option value="all">All Agents</option>
          {agentIds.map(id => (
            <option key={id} value={id}>{getAgentMeta(id).name}</option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-2 py-1 text-xs bg-zinc-800 border border-zinc-700 text-zinc-300 rounded"
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>

        <div className="flex items-center gap-2">
          <label className="text-xs text-zinc-500">Min confidence:</label>
          <input
            type="range"
            min={0}
            max={100}
            value={minConfidence}
            onChange={e => setMinConfidence(Number(e.target.value))}
            className="w-20 h-1 accent-brand-500"
          />
          <span className="text-xs text-zinc-400 w-8">{minConfidence}%</span>
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <p className="text-xs text-zinc-600 py-4 text-center">No findings match filters</p>
      ) : (
        <div className="overflow-x-auto -mx-5 px-5">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-zinc-500 border-b border-zinc-800">
                <th className="text-left py-2 pr-3 font-medium">Time</th>
                <th className="text-left py-2 pr-3 font-medium">Agent</th>
                <th className="text-left py-2 pr-3 font-medium">Finding</th>
                <th className="text-left py-2 pr-3 font-medium">Conf.</th>
                <th className="text-left py-2 pr-3 font-medium">Status</th>
                <th className="text-right py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 30).map(f => {
                const badge = statusBadge(f.review_status);
                const meta = getAgentMeta(f.agent_id);
                return (
                  <tr key={f.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                    <td className="py-2 pr-3 text-zinc-500 whitespace-nowrap">{relativeTime(f.created_at)}</td>
                    <td className="py-2 pr-3">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] ${meta.badge}`}>{meta.name}</span>
                    </td>
                    <td className="py-2 pr-3 text-zinc-300 max-w-[200px] truncate">
                      <a href={`/agent/review/${f.id}`} className="hover:text-brand-400 transition-colors">
                        {f.display_title || f.title}
                      </a>
                    </td>
                    <td className="py-2 pr-3">
                      {f.confidence !== null ? (
                        <span className={`${f.confidence >= 70 ? 'text-emerald-400' : f.confidence >= 40 ? 'text-yellow-400' : 'text-red-400'}`}>
                          {Math.round(f.confidence * 100)}%
                        </span>
                      ) : (
                        <span className="text-zinc-600">-</span>
                      )}
                    </td>
                    <td className="py-2 pr-3">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] ${badge.bg}`}>{badge.label}</span>
                    </td>
                    <td className="py-2 text-right whitespace-nowrap">
                      {f.review_status === 'pending' && onAction && (
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => onAction(f.id, 'approve')}
                            disabled={isActioning === f.id}
                            className="px-2 py-0.5 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/40 rounded text-[10px] transition-colors disabled:opacity-50"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => onAction(f.id, 'reject')}
                            disabled={isActioning === f.id}
                            className="px-2 py-0.5 bg-red-600/20 text-red-400 hover:bg-red-600/40 rounded text-[10px] transition-colors disabled:opacity-50"
                          >
                            Reject
                          </button>
                          <a
                            href={`/agent/review/${f.id}`}
                            className="px-2 py-0.5 bg-zinc-700/50 text-zinc-400 hover:bg-zinc-700 rounded text-[10px] transition-colors"
                          >
                            View
                          </a>
                        </div>
                      )}
                      {f.review_status !== 'pending' && (
                        <a
                          href={`/agent/review/${f.id}`}
                          className="px-2 py-0.5 bg-zinc-700/50 text-zinc-400 hover:bg-zinc-700 rounded text-[10px] transition-colors"
                        >
                          View
                        </a>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length > 30 && (
            <p className="text-xs text-zinc-600 mt-2 text-center">Showing 30 of {filtered.length} findings</p>
          )}
        </div>
      )}
    </div>
  );
}
