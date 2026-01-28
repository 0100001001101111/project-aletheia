'use client';

/**
 * Tracked Researchers Page
 * View and manage researchers being followed
 */

import { useEffect, useState, useCallback } from 'react';
import { PageWrapper } from '@/components/layout/PageWrapper';
import Link from 'next/link';

interface TrackedResearcher {
  id: string;
  name: string;
  affiliations: string[] | null;
  domains: string[] | null;
  email: string | null;
  website: string | null;
  google_scholar: string | null;
  last_publication_check: string | null;
  credibility_score: number | null;
  notes: string | null;
  active: boolean;
}

const DOMAIN_COLORS: Record<string, string> = {
  parapsychology: 'bg-purple-500/10 text-purple-400',
  nde: 'bg-blue-500/10 text-blue-400',
  consciousness: 'bg-cyan-500/10 text-cyan-400',
  ufo: 'bg-amber-500/10 text-amber-400',
  geophysical: 'bg-orange-500/10 text-orange-400',
  skepticism: 'bg-red-500/10 text-red-400',
  remote_viewing: 'bg-indigo-500/10 text-indigo-400',
  psi: 'bg-pink-500/10 text-pink-400',
};

export default function TrackedResearchersPage() {
  const [researchers, setResearchers] = useState<TrackedResearcher[]>([]);
  const [grouped, setGrouped] = useState<Record<string, TrackedResearcher[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newResearcher, setNewResearcher] = useState({
    name: '',
    affiliations: '',
    domains: '',
    email: '',
    website: '',
    google_scholar: '',
    credibility_score: 50,
    notes: '',
  });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/agent/discovery/researchers');
      if (!res.ok) throw new Error('Failed to fetch researchers');

      const data = await res.json();
      setResearchers(data.researchers || []);
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

  const handleAddResearcher = async () => {
    try {
      const res = await fetch('/api/agent/discovery/researchers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newResearcher,
          affiliations: newResearcher.affiliations.split(',').map(s => s.trim()).filter(Boolean),
          domains: newResearcher.domains.split(',').map(s => s.trim()).filter(Boolean),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to add researcher');
      }

      setShowAddForm(false);
      setNewResearcher({
        name: '',
        affiliations: '',
        domains: '',
        email: '',
        website: '',
        google_scholar: '',
        credibility_score: 50,
        notes: '',
      });
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add researcher');
    }
  };

  const formatTimeAgo = (date: string | null) => {
    if (!date) return 'Never';
    const diff = Date.now() - new Date(date).getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    return `${days}d ago`;
  };

  const getDomainColor = (domain: string) => {
    const key = Object.keys(DOMAIN_COLORS).find(k => domain.toLowerCase().includes(k));
    return key ? DOMAIN_COLORS[key] : 'bg-zinc-700 text-zinc-400';
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
            <h1 className="text-2xl font-bold text-zinc-100">Tracked Researchers</h1>
            <p className="text-zinc-400 mt-1">
              Researchers the Discovery Agent monitors for new publications
            </p>
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-medium transition-colors"
          >
            Add Researcher
          </button>
        </div>

        {/* Add form modal */}
        {showAddForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-bold text-zinc-100 mb-4">Add Researcher</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-zinc-400 mb-1">Name *</label>
                  <input
                    type="text"
                    value={newResearcher.name}
                    onChange={(e) => setNewResearcher({ ...newResearcher, name: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-300"
                    placeholder="Dean Radin"
                  />
                </div>

                <div>
                  <label className="block text-sm text-zinc-400 mb-1">Affiliations (comma-separated)</label>
                  <input
                    type="text"
                    value={newResearcher.affiliations}
                    onChange={(e) => setNewResearcher({ ...newResearcher, affiliations: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-300"
                    placeholder="Institute of Noetic Sciences, Stanford"
                  />
                </div>

                <div>
                  <label className="block text-sm text-zinc-400 mb-1">Domains (comma-separated)</label>
                  <input
                    type="text"
                    value={newResearcher.domains}
                    onChange={(e) => setNewResearcher({ ...newResearcher, domains: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-300"
                    placeholder="parapsychology, consciousness, psi"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-zinc-400 mb-1">Website</label>
                    <input
                      type="text"
                      value={newResearcher.website}
                      onChange={(e) => setNewResearcher({ ...newResearcher, website: e.target.value })}
                      className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-300"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-zinc-400 mb-1">Email</label>
                    <input
                      type="text"
                      value={newResearcher.email}
                      onChange={(e) => setNewResearcher({ ...newResearcher, email: e.target.value })}
                      className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-300"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-zinc-400 mb-1">Google Scholar</label>
                  <input
                    type="text"
                    value={newResearcher.google_scholar}
                    onChange={(e) => setNewResearcher({ ...newResearcher, google_scholar: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-300"
                    placeholder="https://scholar.google.com/citations?user=..."
                  />
                </div>

                <div>
                  <label className="block text-sm text-zinc-400 mb-1">
                    Credibility Score: {newResearcher.credibility_score}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={newResearcher.credibility_score}
                    onChange={(e) => setNewResearcher({ ...newResearcher, credibility_score: parseInt(e.target.value) })}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm text-zinc-400 mb-1">Notes</label>
                  <textarea
                    value={newResearcher.notes}
                    onChange={(e) => setNewResearcher({ ...newResearcher, notes: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-300"
                    rows={2}
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleAddResearcher}
                  disabled={!newResearcher.name}
                  className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  Add Researcher
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

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="p-4 bg-zinc-800/50 border border-zinc-700/50 rounded-lg">
            <div className="text-2xl font-bold text-zinc-100">{researchers.length}</div>
            <div className="text-sm text-zinc-400">Researchers Tracked</div>
          </div>
          <div className="p-4 bg-zinc-800/50 border border-zinc-700/50 rounded-lg">
            <div className="text-2xl font-bold text-zinc-100">
              {researchers.filter(r => r.credibility_score && r.credibility_score >= 80).length}
            </div>
            <div className="text-sm text-emerald-400">High Credibility</div>
          </div>
          <div className="p-4 bg-zinc-800/50 border border-zinc-700/50 rounded-lg">
            <div className="text-2xl font-bold text-zinc-100">
              {new Set(researchers.flatMap(r => r.domains || [])).size}
            </div>
            <div className="text-sm text-purple-400">Domains Covered</div>
          </div>
        </div>

        {/* Researchers grouped by primary domain */}
        {loading ? (
          <div className="text-center py-12 text-zinc-400">Loading...</div>
        ) : (
          <div className="space-y-8">
            {Object.entries(grouped).map(([domain, domainResearchers]) => (
              <div key={domain}>
                <h2 className="text-lg font-semibold text-zinc-200 mb-4 flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-sm ${getDomainColor(domain)}`}>
                    {domain}
                  </span>
                  <span className="text-sm text-zinc-500 font-normal">
                    ({domainResearchers.length})
                  </span>
                </h2>

                <div className="grid gap-4 md:grid-cols-2">
                  {domainResearchers.map((researcher) => (
                    <div
                      key={researcher.id}
                      className="p-4 bg-zinc-800/50 border border-zinc-700/50 rounded-lg"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-semibold text-zinc-200">{researcher.name}</h3>
                          {researcher.affiliations && researcher.affiliations.length > 0 && (
                            <p className="text-sm text-zinc-400">
                              {researcher.affiliations.join(', ')}
                            </p>
                          )}
                        </div>
                        {researcher.credibility_score !== null && (
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            researcher.credibility_score >= 80 ? 'bg-emerald-500/10 text-emerald-400' :
                            researcher.credibility_score >= 60 ? 'bg-amber-500/10 text-amber-400' :
                            'bg-zinc-700 text-zinc-400'
                          }`}>
                            {researcher.credibility_score}
                          </span>
                        )}
                      </div>

                      {/* Domains */}
                      {researcher.domains && researcher.domains.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-3">
                          {researcher.domains.map((d, i) => (
                            <span key={i} className={`px-2 py-0.5 rounded text-xs ${getDomainColor(d)}`}>
                              {d}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Notes */}
                      {researcher.notes && (
                        <p className="text-sm text-zinc-500 mb-3">{researcher.notes}</p>
                      )}

                      {/* Links and last check */}
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex gap-3">
                          {researcher.website && (
                            <a
                              href={researcher.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-purple-400 hover:underline"
                            >
                              Website
                            </a>
                          )}
                          {researcher.google_scholar && (
                            <a
                              href={researcher.google_scholar}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-purple-400 hover:underline"
                            >
                              Scholar
                            </a>
                          )}
                          {researcher.email && (
                            <a
                              href={`mailto:${researcher.email}`}
                              className="text-purple-400 hover:underline"
                            >
                              Email
                            </a>
                          )}
                        </div>
                        <span className="text-zinc-500">
                          Checked: {formatTimeAgo(researcher.last_publication_check)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {Object.keys(grouped).length === 0 && (
              <div className="text-center py-12 text-zinc-400">
                No researchers tracked. Click "Add Researcher" to add one.
              </div>
            )}
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
