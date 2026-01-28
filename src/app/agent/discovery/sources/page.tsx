'use client';

/**
 * Discovery Sources Management Page
 * View and manage monitored sources
 */

import { useEffect, useState, useCallback } from 'react';
import { PageWrapper } from '@/components/layout/PageWrapper';
import Link from 'next/link';

interface DiscoverySource {
  id: string;
  name: string;
  url: string | null;
  source_type: string;
  monitor_frequency: string;
  last_checked: string | null;
  next_check: string | null;
  quality_tier: string;
  notes: string | null;
  leads_found: number;
  leads_approved: number;
  active: boolean;
}

const SOURCE_TYPE_LABELS: Record<string, { label: string; icon: string }> = {
  journal: { label: 'Journal', icon: '📄' },
  archive: { label: 'Archive', icon: '🗄️' },
  database: { label: 'Database', icon: '💾' },
  organization: { label: 'Organization', icon: '🏛️' },
  preprint: { label: 'Preprint', icon: '📝' },
  conference: { label: 'Conference', icon: '🎤' },
  researcher: { label: 'Researcher', icon: '👤' },
};

const QUALITY_STYLES: Record<string, { bg: string; text: string }> = {
  high: { bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
  medium: { bg: 'bg-amber-500/10', text: 'text-amber-400' },
  low: { bg: 'bg-red-500/10', text: 'text-red-400' },
};

const FREQUENCY_LABELS: Record<string, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  manual: 'Manual',
};

export default function DiscoverySourcesPage() {
  const [sources, setSources] = useState<DiscoverySource[]>([]);
  const [grouped, setGrouped] = useState<Record<string, DiscoverySource[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newSource, setNewSource] = useState({
    name: '',
    url: '',
    source_type: 'journal',
    monitor_frequency: 'weekly',
    quality_tier: 'medium',
    notes: '',
  });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/agent/discovery/sources');
      if (!res.ok) throw new Error('Failed to fetch sources');

      const data = await res.json();
      setSources(data.sources || []);
      setGrouped(data.grouped || {});
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAddSource = async () => {
    try {
      const res = await fetch('/api/agent/discovery/sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSource),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to add source');
      }

      setShowAddForm(false);
      setNewSource({
        name: '',
        url: '',
        source_type: 'journal',
        monitor_frequency: 'weekly',
        quality_tier: 'medium',
        notes: '',
      });
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add source');
    }
  };

  const formatTimeAgo = (date: string | null) => {
    if (!date) return 'Never';
    const diff = Date.now() - new Date(date).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
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
            <h1 className="text-2xl font-bold text-zinc-100">Monitored Sources</h1>
            <p className="text-zinc-400 mt-1">
              Sources the Discovery Agent checks for new content
            </p>
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-medium transition-colors"
          >
            Add Source
          </button>
        </div>

        {/* Add form modal */}
        {showAddForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 w-full max-w-md">
              <h2 className="text-xl font-bold text-zinc-100 mb-4">Add Source</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-zinc-400 mb-1">Name</label>
                  <input
                    type="text"
                    value={newSource.name}
                    onChange={(e) => setNewSource({ ...newSource, name: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-300"
                    placeholder="Journal of Scientific Exploration"
                  />
                </div>

                <div>
                  <label className="block text-sm text-zinc-400 mb-1">URL</label>
                  <input
                    type="text"
                    value={newSource.url}
                    onChange={(e) => setNewSource({ ...newSource, url: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-300"
                    placeholder="https://example.com"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-zinc-400 mb-1">Type</label>
                    <select
                      value={newSource.source_type}
                      onChange={(e) => setNewSource({ ...newSource, source_type: e.target.value })}
                      className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-300"
                    >
                      {Object.entries(SOURCE_TYPE_LABELS).map(([type, { label }]) => (
                        <option key={type} value={type}>{label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm text-zinc-400 mb-1">Frequency</label>
                    <select
                      value={newSource.monitor_frequency}
                      onChange={(e) => setNewSource({ ...newSource, monitor_frequency: e.target.value })}
                      className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-300"
                    >
                      {Object.entries(FREQUENCY_LABELS).map(([freq, label]) => (
                        <option key={freq} value={freq}>{label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-zinc-400 mb-1">Quality Tier</label>
                  <select
                    value={newSource.quality_tier}
                    onChange={(e) => setNewSource({ ...newSource, quality_tier: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-300"
                  >
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-zinc-400 mb-1">Notes</label>
                  <textarea
                    value={newSource.notes}
                    onChange={(e) => setNewSource({ ...newSource, notes: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-300"
                    rows={2}
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleAddSource}
                  disabled={!newSource.name}
                  className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  Add Source
                </button>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400">
            {error}
          </div>
        )}

        {/* Sources grouped by type */}
        {loading ? (
          <div className="text-center py-12 text-zinc-400">Loading...</div>
        ) : (
          <div className="space-y-8">
            {Object.entries(grouped).map(([type, typeSources]) => (
              <div key={type}>
                <h2 className="text-lg font-semibold text-zinc-200 mb-4 flex items-center gap-2">
                  <span>{SOURCE_TYPE_LABELS[type]?.icon || '📌'}</span>
                  {SOURCE_TYPE_LABELS[type]?.label || type}
                  <span className="text-sm text-zinc-500 font-normal">
                    ({typeSources.length})
                  </span>
                </h2>

                <div className="space-y-3">
                  {typeSources.map((source) => (
                    <div
                      key={source.id}
                      className="p-4 bg-zinc-800/50 border border-zinc-700/50 rounded-lg flex items-center justify-between"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="font-medium text-zinc-200">{source.name}</h3>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            QUALITY_STYLES[source.quality_tier]?.bg || 'bg-zinc-700'
                          } ${QUALITY_STYLES[source.quality_tier]?.text || 'text-zinc-400'}`}>
                            {source.quality_tier}
                          </span>
                          <span className="px-2 py-0.5 bg-zinc-700/50 text-zinc-400 rounded text-xs">
                            {FREQUENCY_LABELS[source.monitor_frequency] || source.monitor_frequency}
                          </span>
                        </div>

                        {source.url && (
                          <a
                            href={source.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-purple-400 hover:underline"
                          >
                            {source.url}
                          </a>
                        )}

                        {source.notes && (
                          <p className="text-sm text-zinc-500 mt-1">{source.notes}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-6 text-sm">
                        <div className="text-right">
                          <div className="text-zinc-400">Last checked</div>
                          <div className="text-zinc-300">{formatTimeAgo(source.last_checked)}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-zinc-400">Leads found</div>
                          <div className="text-zinc-300">{source.leads_found}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-zinc-400">Approved</div>
                          <div className={source.leads_approved > 0 ? 'text-emerald-400' : 'text-zinc-500'}>
                            {source.leads_approved}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {Object.keys(grouped).length === 0 && (
              <div className="text-center py-12 text-zinc-400">
                No sources configured. Click "Add Source" to add one.
              </div>
            )}
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
