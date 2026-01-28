'use client';

/**
 * Discovery Leads Queue Page
 * Review and act on discovered leads
 */

import { useEffect, useState, useCallback } from 'react';
import { PageWrapper } from '@/components/layout/PageWrapper';
import Link from 'next/link';

interface DiscoveryLead {
  id: string;
  session_id: string;
  lead_type: string;
  title: string;
  description: string | null;
  source_url: string | null;
  quality_score: number | null;
  quality_signals: string[] | null;
  quality_concerns: string[] | null;
  domains: string[] | null;
  authors: string[] | null;
  publication: string | null;
  language: string | null;
  has_quantitative_data: boolean | null;
  sample_size: number | null;
  potential_hypothesis: string | null;
  status: string;
  priority: string;
  created_at: string | null;
}

interface Stats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  investigating: number;
  acquired: number;
}

const LEAD_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  paper: { label: 'Paper', color: 'text-blue-400 bg-blue-500/10' },
  dataset: { label: 'Dataset', color: 'text-emerald-400 bg-emerald-500/10' },
  archive: { label: 'Archive', color: 'text-amber-400 bg-amber-500/10' },
  document: { label: 'Document', color: 'text-orange-400 bg-orange-500/10' },
  connection: { label: 'Connection', color: 'text-purple-400 bg-purple-500/10' },
  researcher: { label: 'Researcher', color: 'text-pink-400 bg-pink-500/10' },
  replication: { label: 'Replication', color: 'text-cyan-400 bg-cyan-500/10' },
  conference: { label: 'Conference', color: 'text-indigo-400 bg-indigo-500/10' },
  translation: { label: 'Translation', color: 'text-rose-400 bg-rose-500/10' },
};

const PRIORITY_STYLES: Record<string, { bg: string; text: string }> = {
  urgent: { bg: 'bg-red-500/20', text: 'text-red-400' },
  high: { bg: 'bg-amber-500/20', text: 'text-amber-400' },
  normal: { bg: 'bg-zinc-700/50', text: 'text-zinc-400' },
  low: { bg: 'bg-zinc-800/50', text: 'text-zinc-500' },
};

const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  pending: { bg: 'bg-amber-500/10', text: 'text-amber-400' },
  approved: { bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
  rejected: { bg: 'bg-red-500/10', text: 'text-red-400' },
  investigating: { bg: 'bg-blue-500/10', text: 'text-blue-400' },
  acquired: { bg: 'bg-purple-500/10', text: 'text-purple-400' },
};

export default function DiscoveryLeadsPage() {
  const [leads, setLeads] = useState<DiscoveryLead[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      let url = '/api/agent/discovery/leads?limit=100';
      if (statusFilter !== 'all') {
        url += `&status=${statusFilter}`;
      }
      if (typeFilter !== 'all') {
        url += `&type=${typeFilter}`;
      }

      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch leads');

      const data = await res.json();
      setLeads(data.leads || []);
      setStats(data.stats || null);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, typeFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAction = async (id: string, action: 'approve' | 'reject' | 'investigate') => {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/agent/discovery/leads/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Action failed');
      }

      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
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
                href="/agent/discovery"
                className="text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                ← Discovery Agent
              </Link>
            </div>
            <h1 className="text-2xl font-bold text-zinc-100">Discovery Leads</h1>
            <p className="text-zinc-400 mt-1">
              Review and act on discovered research leads
            </p>
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
            <div className="p-4 bg-zinc-800/50 border border-zinc-700/50 rounded-lg">
              <div className="text-2xl font-bold text-zinc-100">{stats.pending}</div>
              <div className="text-sm text-amber-400">Pending</div>
            </div>
            <div className="p-4 bg-zinc-800/50 border border-zinc-700/50 rounded-lg">
              <div className="text-2xl font-bold text-zinc-100">{stats.investigating}</div>
              <div className="text-sm text-blue-400">Investigating</div>
            </div>
            <div className="p-4 bg-zinc-800/50 border border-zinc-700/50 rounded-lg">
              <div className="text-2xl font-bold text-zinc-100">{stats.approved}</div>
              <div className="text-sm text-emerald-400">Approved</div>
            </div>
            <div className="p-4 bg-zinc-800/50 border border-zinc-700/50 rounded-lg">
              <div className="text-2xl font-bold text-zinc-100">{stats.acquired}</div>
              <div className="text-sm text-purple-400">Acquired</div>
            </div>
            <div className="p-4 bg-zinc-800/50 border border-zinc-700/50 rounded-lg">
              <div className="text-2xl font-bold text-zinc-100">{stats.rejected}</div>
              <div className="text-sm text-red-400">Rejected</div>
            </div>
            <div className="p-4 bg-zinc-800/50 border border-zinc-700/50 rounded-lg">
              <div className="text-2xl font-bold text-zinc-100">{stats.total}</div>
              <div className="text-sm text-zinc-400">Total</div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex gap-4 mb-6">
          <div className="flex gap-2 overflow-x-auto">
            {['pending', 'investigating', 'approved', 'rejected', 'all'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  statusFilter === status
                    ? 'bg-purple-600 text-white'
                    : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-300"
          >
            <option value="all">All Types</option>
            {Object.entries(LEAD_TYPE_LABELS).map(([type, { label }]) => (
              <option key={type} value={type}>{label}</option>
            ))}
          </select>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400">
            {error}
          </div>
        )}

        {/* Leads list */}
        {loading ? (
          <div className="text-center py-12 text-zinc-400">Loading...</div>
        ) : leads.length === 0 ? (
          <div className="text-center py-12 text-zinc-400">
            No {statusFilter === 'all' ? '' : statusFilter} leads found
          </div>
        ) : (
          <div className="space-y-4">
            {leads.map((lead) => (
              <div
                key={lead.id}
                className="p-5 bg-zinc-800/50 border border-zinc-700/50 rounded-lg"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    {/* Title and badges */}
                    <div className="flex items-center gap-3 flex-wrap mb-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        PRIORITY_STYLES[lead.priority]?.bg || 'bg-zinc-700'
                      } ${PRIORITY_STYLES[lead.priority]?.text || 'text-zinc-400'}`}>
                        {lead.priority.toUpperCase()}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        LEAD_TYPE_LABELS[lead.lead_type]?.color || 'text-zinc-400 bg-zinc-700'
                      }`}>
                        {LEAD_TYPE_LABELS[lead.lead_type]?.label || lead.lead_type}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        STATUS_STYLES[lead.status]?.bg || 'bg-zinc-700'
                      } ${STATUS_STYLES[lead.status]?.text || 'text-zinc-400'}`}>
                        {lead.status}
                      </span>
                    </div>

                    {/* Title */}
                    <h3 className="text-lg font-semibold text-zinc-100 mb-2">
                      {lead.title}
                    </h3>

                    {/* Description */}
                    {lead.description && (
                      <p className="text-sm text-zinc-400 mb-3 line-clamp-2">
                        {lead.description}
                      </p>
                    )}

                    {/* Hypothesis (for connections) */}
                    {lead.potential_hypothesis && (
                      <div className="mb-3 p-2 bg-purple-500/10 border border-purple-500/30 rounded">
                        <span className="text-xs text-purple-400 font-medium">Hypothesis:</span>
                        <p className="text-sm text-zinc-300 mt-1">{lead.potential_hypothesis}</p>
                      </div>
                    )}

                    {/* Quality score and details */}
                    <div className="flex flex-wrap gap-4 text-sm">
                      {lead.quality_score !== null && (
                        <div className="flex items-center gap-2">
                          <span className="text-zinc-500">Quality:</span>
                          <span className={`font-medium ${
                            lead.quality_score >= 70 ? 'text-emerald-400' :
                            lead.quality_score >= 50 ? 'text-amber-400' :
                            'text-red-400'
                          }`}>
                            {lead.quality_score}/100
                          </span>
                        </div>
                      )}
                      {lead.domains && lead.domains.length > 0 && (
                        <div className="flex items-center gap-2">
                          <span className="text-zinc-500">Domains:</span>
                          <span className="text-zinc-300">{lead.domains.join(', ')}</span>
                        </div>
                      )}
                      {lead.authors && lead.authors.length > 0 && (
                        <div className="flex items-center gap-2">
                          <span className="text-zinc-500">Authors:</span>
                          <span className="text-zinc-300">{lead.authors.join(', ')}</span>
                        </div>
                      )}
                      {lead.sample_size && (
                        <div className="flex items-center gap-2">
                          <span className="text-zinc-500">N:</span>
                          <span className="text-zinc-300">{lead.sample_size}</span>
                        </div>
                      )}
                      {lead.has_quantitative_data && (
                        <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded text-xs">
                          Has data
                        </span>
                      )}
                      {lead.language && lead.language !== 'en' && (
                        <span className="px-2 py-0.5 bg-rose-500/10 text-rose-400 rounded text-xs">
                          {lead.language.toUpperCase()}
                        </span>
                      )}
                    </div>

                    {/* Quality signals */}
                    {lead.quality_signals && lead.quality_signals.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {lead.quality_signals.slice(0, 5).map((signal, i) => (
                          <span key={i} className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-xs rounded">
                            {signal}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Quality concerns */}
                    {lead.quality_concerns && lead.quality_concerns.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {lead.quality_concerns.map((concern, i) => (
                          <span key={i} className="px-2 py-0.5 bg-red-500/10 text-red-400 text-xs rounded">
                            {concern}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Source URL */}
                    {lead.source_url && (
                      <a
                        href={lead.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 block text-sm text-purple-400 hover:underline truncate"
                      >
                        {lead.source_url}
                      </a>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2">
                    {lead.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleAction(lead.id, 'approve')}
                          disabled={actionLoading === lead.id}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                        >
                          {actionLoading === lead.id ? '...' : 'Approve'}
                        </button>
                        <button
                          onClick={() => handleAction(lead.id, 'investigate')}
                          disabled={actionLoading === lead.id}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                        >
                          Investigate
                        </button>
                        <button
                          onClick={() => handleAction(lead.id, 'reject')}
                          disabled={actionLoading === lead.id}
                          className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                        >
                          Reject
                        </button>
                      </>
                    )}
                    {lead.status === 'investigating' && (
                      <>
                        <button
                          onClick={() => handleAction(lead.id, 'approve')}
                          disabled={actionLoading === lead.id}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleAction(lead.id, 'reject')}
                          disabled={actionLoading === lead.id}
                          className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                        >
                          Reject
                        </button>
                      </>
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
