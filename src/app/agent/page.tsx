'use client';

/**
 * Agent Hub — Research Agent Network
 * 4-tier dashboard: Coordinator → Core Pipeline → Specialists → Publishing & Oversight
 * Single fetch from /api/agent/stats drives the entire page
 */

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Navigation } from '@/components/layout/Navigation';

// ─── Agent Roster ────────────────────────────────────────────

interface AgentDef {
  id: string;
  name: string;
  role?: string;
  domain?: string;
  description?: string;
}

const COORDINATOR: AgentDef = {
  id: 'argus',
  name: 'Argus',
  role: 'Coordinator',
  description: 'Orchestrates all 25 agents. Reads cross-domain findings, assigns specialist tasks, identifies connections between domains.',
};

const CORE_PIPELINE: AgentDef[] = [
  { id: 'deep-miner', name: 'Deep Miner', role: 'Statistical Analysis', description: 'Rigorous statistical validation across any dataset' },
  { id: 'discovery', name: 'Discovery', role: 'Literature Search', description: 'Finds papers, datasets, and prior work in any field' },
  { id: 'connection', name: 'Connection', role: 'Cross-Domain Patterns', description: 'Identifies links between findings from different domains' },
  { id: 'mechanism', name: 'Mechanism', role: 'Theory Testing', description: 'Tests causal mechanisms behind observed correlations' },
  { id: 'synthesis', name: 'Synthesis', role: 'Report Generation', description: 'Combines multiple findings into coherent research reports' },
  { id: 'skeptic', name: 'Skeptic', role: 'Adversarial Auditing', description: 'Challenges findings and tests for biases and methodological flaws' },
];

const SPECIALIST_AGENTS: AgentDef[] = [
  { id: 'helios', name: 'Helios', domain: 'Space & Physics' },
  { id: 'gaia', name: 'Gaia', domain: 'Earthquakes & Geology' },
  { id: 'poseidon', name: 'Poseidon', domain: 'Ocean Data & Marine Patterns' },
  { id: 'methuselah', name: 'Methuselah', domain: 'Longevity Research' },
  { id: 'thoth', name: 'Thoth', domain: 'Ancient Languages' },
  { id: 'daedalus', name: 'Daedalus', domain: 'Dataset Acquisition' },
  { id: 'chronos', name: 'Chronos', domain: 'Temporal Analysis' },
  { id: 'flora', name: 'Flora', domain: 'Plant Intelligence' },
  { id: 'hypnos', name: 'Hypnos', domain: 'Sleep & Dreams' },
  { id: 'mnemosyne', name: 'Mnemosyne', domain: 'Memory Research' },
  { id: 'phaethon', name: 'Phaethon', domain: 'UFO/UAP Research' },
  { id: 'aether', name: 'Aether', domain: 'Physics Anomalies' },
  { id: 'asclepius', name: 'Asclepius', domain: 'Medical Research' },
  { id: 'orpheus', name: 'Orpheus', domain: 'Music & Acoustics' },
];

const PUBLISHING_OVERSIGHT: AgentDef[] = [
  { id: 'publisher', name: 'Publisher', role: 'Preprint Drafting', description: 'Drafts research preprints from accumulated findings' },
  { id: 'hermes', name: 'Hermes', role: 'Communications & Outreach', description: 'Manages external communications and research summaries' },
  { id: 'themis', name: 'Themis', role: 'Bias Monitoring', description: 'Monitors for systematic biases across the research pipeline' },
];

const INACTIVE_AGENTS: AgentDef[] = [
  { id: 'vulcan', name: 'Vulcan', domain: 'Materials Science' },
];

// ─── Types ───────────────────────────────────────────────────

interface AgentStat {
  findings_count: number;
  last_active: string | null;
}

interface RecentFinding {
  id: string;
  agent_id: string | null;
  title: string;
  confidence: number | null;
  created_at: string;
}

interface StatsData {
  total_findings: number;
  pending_review: number;
  agents_active_24h: number;
  recent_findings: RecentFinding[];
  agent_stats: Record<string, AgentStat>;
}

// ─── Helpers ─────────────────────────────────────────────────

function formatAgentName(agentId: string | null): string {
  if (!agentId) return 'Unknown Agent';
  return agentId.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function relativeTime(dateString: string | null): string {
  if (!dateString) return 'never';
  const ms = Date.now() - new Date(dateString).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(ms / 3600000);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(ms / 86400000);
  if (days < 7) return `${days}d ago`;
  return new Date(dateString).toLocaleDateString();
}

function activityDot(lastActive: string | null): string {
  if (!lastActive) return 'bg-zinc-600';
  const ms = Date.now() - new Date(lastActive).getTime();
  if (ms < 24 * 3600000) return 'bg-green-400';
  if (ms < 48 * 3600000) return 'bg-yellow-400';
  return 'bg-zinc-600';
}

function confidenceBadge(c: number | null): { bg: string; text: string } {
  const v = c ?? 0;
  if (v >= 0.7) return { bg: 'bg-emerald-500/20', text: 'text-emerald-400' };
  if (v >= 0.4) return { bg: 'bg-amber-500/20', text: 'text-amber-400' };
  return { bg: 'bg-zinc-700', text: 'text-zinc-400' };
}

// ─── Page ────────────────────────────────────────────────────

export default function AgentHubPage() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/agent/stats');
      if (res.ok) setStats(await res.json());
    } catch (err) {
      console.error('Failed to fetch agent stats:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  const getStat = (id: string): AgentStat =>
    stats?.agent_stats[id] ?? { findings_count: 0, last_active: null };

  return (
    <div className="min-h-screen bg-zinc-950">
      <Navigation />
      <main className="pt-20 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* ── Header ─────────────────────────────────── */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-zinc-100">Research Agent Network</h1>
            <p className="text-zinc-400 mt-1">25 autonomous agents across 6 research domains</p>
          </div>

          {/* ── Stats Row ──────────────────────────────── */}
          <div className="grid grid-cols-3 gap-4 mb-10">
            <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl">
              <div className="text-3xl font-bold text-brand-400">{stats?.total_findings ?? '—'}</div>
              <div className="text-sm text-zinc-500">Total Findings</div>
            </div>
            <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl">
              <div className="text-3xl font-bold text-amber-400">{stats?.pending_review ?? '—'}</div>
              <div className="text-sm text-zinc-500">Pending Review</div>
            </div>
            <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl">
              <div className="text-3xl font-bold text-emerald-400">{stats?.agents_active_24h ?? '—'}</div>
              <div className="text-sm text-zinc-500">Agents Active 24h</div>
            </div>
          </div>

          {/* ── AGORA Feed ─────────────────────────────── */}
          <section className="mb-12">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold text-zinc-100">AGORA — Cross-Domain Discovery Feed</h2>
              </div>
              <Link href="/agent/review" className="text-sm text-brand-400 hover:text-brand-300 transition-colors">
                View All Findings →
              </Link>
            </div>

            {loading ? (
              <div className="flex items-center justify-center h-40 bg-zinc-900/50 border border-zinc-800 rounded-xl">
                <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <div className="space-y-2">
                {(stats?.recent_findings ?? []).map((f) => {
                  const badge = confidenceBadge(f.confidence);
                  return (
                    <Link
                      key={f.id}
                      href={`/agent/review/${f.id}`}
                      className="flex items-center gap-4 p-3 bg-zinc-900/50 border border-zinc-800 rounded-lg hover:border-zinc-700 transition-colors"
                    >
                      <span className="text-xs text-zinc-500 w-20 shrink-0">{formatAgentName(f.agent_id)}</span>
                      <span className="flex-1 text-sm text-zinc-200 truncate">{f.title}</span>
                      <span className={`px-2 py-0.5 text-xs rounded ${badge.bg} ${badge.text} shrink-0`}>
                        {Math.round((f.confidence ?? 0) * 100)}%
                      </span>
                      <span className="text-xs text-zinc-600 w-16 text-right shrink-0">{relativeTime(f.created_at)}</span>
                    </Link>
                  );
                })}
                {(stats?.recent_findings ?? []).length === 0 && (
                  <div className="p-6 bg-zinc-900/50 border border-zinc-800 rounded-lg text-center text-zinc-500">
                    No findings yet. Agents are initializing.
                  </div>
                )}
              </div>
            )}
          </section>

          {/* ── Coordinator ────────────────────────────── */}
          <section className="mb-10">
            <h2 className="text-lg font-semibold text-zinc-300 uppercase tracking-wider mb-4">Coordinator</h2>
            <div className="p-5 bg-zinc-900/50 border border-zinc-800 rounded-xl">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-violet-600 to-purple-600 flex items-center justify-center text-white font-bold text-lg shrink-0">
                  A
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-semibold text-zinc-100">{COORDINATOR.name}</span>
                    <span className={`w-2 h-2 rounded-full ${activityDot(getStat(COORDINATOR.id).last_active)}`} />
                    <span className="px-2 py-0.5 text-xs bg-violet-500/20 text-violet-400 rounded">Coordinator</span>
                  </div>
                  <p className="text-sm text-zinc-400 mt-1">{COORDINATOR.description}</p>
                  <div className="flex gap-4 mt-3 text-xs text-zinc-500">
                    <span>{getStat(COORDINATOR.id).findings_count} findings</span>
                    <span>Last active: {relativeTime(getStat(COORDINATOR.id).last_active)}</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ── Core Pipeline ──────────────────────────── */}
          <section className="mb-10">
            <h2 className="text-lg font-semibold text-zinc-300 uppercase tracking-wider mb-1">Core Pipeline</h2>
            <p className="text-sm text-zinc-500 mb-4">Work on findings across all domains — analysis, validation, and reporting</p>
            <div className="grid md:grid-cols-3 gap-4">
              {CORE_PIPELINE.map((agent) => {
                const s = getStat(agent.id);
                return (
                  <div key={agent.id} className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-medium text-zinc-100">{agent.name}</span>
                      <span className={`w-2 h-2 rounded-full ${activityDot(s.last_active)}`} />
                    </div>
                    <span className="text-xs text-zinc-500">{agent.role}</span>
                    <p className="text-sm text-zinc-400 mt-2">{agent.description}</p>
                    <div className="flex gap-4 mt-3 text-xs text-zinc-500">
                      <span>{s.findings_count} findings</span>
                      <span>{relativeTime(s.last_active)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* ── Specialist Agents ──────────────────────── */}
          <section className="mb-10">
            <h2 className="text-lg font-semibold text-zinc-300 uppercase tracking-wider mb-1">Specialist Agents</h2>
            <p className="text-sm text-zinc-500 mb-4">Domain-specific research across 14 areas</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {SPECIALIST_AGENTS.map((agent) => {
                const s = getStat(agent.id);
                return (
                  <div key={agent.id} className="p-3 bg-zinc-900/50 border border-zinc-800 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-zinc-200 text-sm">{agent.name}</span>
                      <span className={`w-1.5 h-1.5 rounded-full ${activityDot(s.last_active)}`} />
                    </div>
                    <span className="text-xs text-zinc-500">{agent.domain}</span>
                    <div className="mt-2 text-xs text-zinc-600">
                      {s.findings_count > 0 ? (
                        `${s.findings_count} findings`
                      ) : (
                        <span className="text-zinc-600 italic">Initializing...</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* ── Publishing & Oversight ─────────────────── */}
          <section className="mb-10">
            <h2 className="text-lg font-semibold text-zinc-300 uppercase tracking-wider mb-1">Publishing & Oversight</h2>
            <p className="text-sm text-zinc-500 mb-4">Quality assurance, publication, and external communication</p>
            <div className="grid md:grid-cols-3 gap-4">
              {PUBLISHING_OVERSIGHT.map((agent) => {
                const s = getStat(agent.id);
                return (
                  <div key={agent.id} className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-medium text-zinc-100">{agent.name}</span>
                      <span className={`w-2 h-2 rounded-full ${activityDot(s.last_active)}`} />
                    </div>
                    <span className="text-xs text-zinc-500">{agent.role}</span>
                    <p className="text-sm text-zinc-400 mt-2">{agent.description}</p>
                    <div className="flex gap-4 mt-3 text-xs text-zinc-500">
                      <span>{s.findings_count} findings</span>
                      <span>{relativeTime(s.last_active)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* ── Inactive ───────────────────────────────── */}
          {INACTIVE_AGENTS.length > 0 && (
            <section className="mb-10">
              <h2 className="text-lg font-semibold text-zinc-600 uppercase tracking-wider mb-1">Inactive</h2>
              <p className="text-sm text-zinc-600 mb-4">Configured but not yet producing findings</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {INACTIVE_AGENTS.map((agent) => (
                  <div key={agent.id} className="p-3 bg-zinc-900/30 border border-zinc-800/50 rounded-lg opacity-50">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-zinc-400 text-sm">{agent.name}</span>
                    </div>
                    <span className="text-xs text-zinc-600">{agent.domain}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

        </div>
      </main>
    </div>
  );
}
