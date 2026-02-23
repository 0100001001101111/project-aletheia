'use client';

/**
 * Agent Hub — Research Agent Network
 * 4-tier dashboard: Coordinator → Core Pipeline → Specialists → Publishing & Oversight
 * Single fetch from /api/agent/stats drives the entire page
 */

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Navigation } from '@/components/layout/Navigation';

// ─── Agent Roster (grouped by role type per Pi taxonomy) ─────

interface AgentDef {
  id: string;
  name: string;
  domain: string;
  mission: string;
}

type AgentGroup = {
  label: string;
  badge: string;
  badgeClass: string;
  description: string;
  agents: AgentDef[];
};

const AGENT_GROUPS: AgentGroup[] = [
  {
    label: 'Core',
    badge: 'Core',
    badgeClass: 'bg-brand-500/20 text-brand-400',
    description: 'The backbone — every finding passes through these agents',
    agents: [
      { id: 'argus', name: 'Argus', domain: 'Orchestration', mission: 'Reads every cross-domain finding. Assigns specialist tasks. The hundred-eyed watchman.' },
      { id: 'deep-miner', name: 'Deep Miner', domain: 'Statistical Analysis', mission: 'Rigorous statistical validation. If the p-value is wrong, Deep Miner will find it.' },
      { id: 'discovery', name: 'Discovery', domain: 'Literature Search', mission: 'Finds papers, datasets, and prior work nobody else has read yet.' },
      { id: 'connection', name: 'Connection', domain: 'Cross-Domain Patterns', mission: 'Links findings across domains. The reason NDE data talks to geophysics.' },
      { id: 'mechanism', name: 'Mechanism', domain: 'Theory Testing', mission: 'Tests causal mechanisms behind observed correlations. Kills bad theories.' },
      { id: 'synthesis', name: 'Synthesis', domain: 'Report Generation', mission: 'Combines multiple findings into coherent research reports with caveats intact.' },
    ],
  },
  {
    label: 'Domain Leads',
    badge: 'Lead',
    badgeClass: 'bg-purple-500/20 text-purple-400',
    description: 'Own their research domain end-to-end',
    agents: [
      { id: 'psyche', name: 'Psyche', domain: 'Ganzfeld / Telepathy', mission: 'Analyzes forced-choice telepathy experiments. Named for the soul that saw what others couldn\'t.' },
      { id: 'hypnos', name: 'Hypnos', domain: 'NDE / STARGATE', mission: 'Near-death experiences, remote viewing archives, altered states. The god of sleep sees clearly.' },
      { id: 'phaethon', name: 'Phaethon', domain: 'UFO / UAP', mission: 'NUFORC data, spatial clustering, temporal patterns. The one who drove too close to the sun.' },
    ],
  },
  {
    label: 'Specialists',
    badge: 'Specialist',
    badgeClass: 'bg-cyan-500/20 text-cyan-400',
    description: 'Deep expertise in specific research areas',
    agents: [
      { id: 'helios', name: 'Helios', domain: 'Astrophysics', mission: 'Solar activity, cosmic ray correlations, space weather effects on terrestrial phenomena.' },
      { id: 'gaia', name: 'Gaia', domain: 'Geomagnetic', mission: 'Earthquake precursors, geomagnetic storms, the SPECTER correlation pipeline.' },
      { id: 'methuselah', name: 'Methuselah', domain: 'Longevity', mission: 'Extreme lifespan research, caloric restriction, telomere dynamics. Named for 969 years.' },
      { id: 'thoth', name: 'Thoth', domain: 'Undeciphered Scripts', mission: 'Rongorongo, Linear A, Indus Valley. The scribe god decodes what others can\'t read.' },
      { id: 'daedalus', name: 'Daedalus', domain: 'Dataset Acquisition', mission: 'Finds and ingests new datasets. The master builder who constructs from raw materials.' },
      { id: 'chronos', name: 'Chronos', domain: 'Temporal Analysis', mission: 'Time-series anomalies, periodicity detection, window theory testing.' },
      { id: 'aether', name: 'Aether', domain: 'Physics Anomalies', mission: 'Anomalous physical measurements, unexplained variances, the fifth element.' },
      { id: 'flora', name: 'Flora', domain: 'Plant Intelligence', mission: 'Plant signaling, mycorrhizal networks, inter-organism communication.' },
      { id: 'asclepius', name: 'Asclepius', domain: 'Pharmacology', mission: 'Anomalous drug responses, placebo effects, healing phenomena. The first physician.' },
      { id: 'mnemosyne', name: 'Mnemosyne', domain: 'Memory Research', mission: 'Anomalous memory, recognition paradigms, déjà vu. Mother of the Muses.' },
      { id: 'publisher', name: 'Publisher', domain: 'Preprint Drafting', mission: 'Turns accumulated findings into structured preprints ready for review.' },
    ],
  },
  {
    label: 'Meta / QA',
    badge: 'QA',
    badgeClass: 'bg-amber-500/20 text-amber-400',
    description: 'Quality assurance, bias detection, and knowledge management',
    agents: [
      { id: 'skeptic', name: 'Skeptic', domain: 'Adversarial Auditing', mission: 'Challenges every finding. Tests for biases, p-hacking, methodological flaws. The 37% rejection rate starts here.' },
      { id: 'themis', name: 'Themis', domain: 'Bias Monitoring', mission: 'Monitors systematic biases across the full pipeline. Blind justice for data.' },
      { id: 'librarian', name: 'Librarian', domain: 'Knowledge Management', mission: 'Indexes, cross-references, and retrieves past findings so agents don\'t repeat work.' },
    ],
  },
];

const DORMANT_AGENTS: AgentDef[] = [
  { id: 'vulcan', name: 'Vulcan', domain: 'Materials Science', mission: 'Anomalous material properties. Currently dormant — awaiting dataset.' },
  { id: 'orpheus', name: 'Orpheus', domain: 'Music & Acoustics', mission: 'Acoustic anomalies, frequency effects. Dormant since Feb 17.' },
  { id: 'poseidon', name: 'Poseidon', domain: 'Ocean & Marine', mission: 'Ocean data, marine patterns. Reduced activity — limited dataset coverage.' },
  { id: 'hermes', name: 'Hermes', domain: 'Communications', mission: 'External comms and research summaries. Low-frequency output.' },
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

          {/* ── Domain Breakdown ────────────────────────── */}
          <section className="mb-12">
            <h2 className="text-lg font-semibold text-zinc-300 uppercase tracking-wider mb-4">Research Domains</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {([
                { domain: 'Psi Research', color: 'border-purple-500/30 bg-purple-500/5', agents: ['Psyche', 'Hypnos'], ids: ['psyche', 'hypnos'] },
                { domain: 'Frontier Physics', color: 'border-cyan-500/30 bg-cyan-500/5', agents: ['Aether', 'Helios'], ids: ['aether', 'helios'] },
                { domain: 'Biology', color: 'border-green-500/30 bg-green-500/5', agents: ['Flora', 'Asclepius', 'Methuselah'], ids: ['flora', 'asclepius', 'methuselah'] },
                { domain: 'Earth & Space', color: 'border-amber-500/30 bg-amber-500/5', agents: ['Gaia', 'Phaethon'], ids: ['gaia', 'phaethon'] },
                { domain: 'History & Language', color: 'border-rose-500/30 bg-rose-500/5', agents: ['Thoth', 'Chronos', 'Mnemosyne'], ids: ['thoth', 'chronos', 'mnemosyne'] },
                { domain: 'Cross-Domain', color: 'border-brand-500/30 bg-brand-500/5', agents: ['Connection', 'Discovery'], ids: ['connection', 'discovery'] },
              ] as const).map((d) => {
                const totalFindings = d.ids.reduce((sum, id) => sum + getStat(id).findings_count, 0);
                return (
                  <div key={d.domain} className={`p-4 rounded-xl border ${d.color}`}>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-zinc-200 text-sm">{d.domain}</h3>
                      <span className="text-xs text-zinc-500">{totalFindings} findings</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {d.agents.map((name, i) => {
                        const s = getStat(d.ids[i]);
                        return (
                          <span key={name} className="inline-flex items-center gap-1 px-2 py-1 rounded bg-zinc-800/50 text-xs text-zinc-300">
                            <span className={`w-1.5 h-1.5 rounded-full ${activityDot(s.last_active)}`} />
                            {name}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

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

          {/* ── Agent Groups ─────────────────────────── */}
          {AGENT_GROUPS.map((group) => (
            <section key={group.label} className="mb-10">
              <div className="flex items-center gap-3 mb-1">
                <h2 className="text-lg font-semibold text-zinc-300 uppercase tracking-wider">{group.label}</h2>
                <span className={`px-2 py-0.5 text-xs rounded ${group.badgeClass}`}>{group.agents.length}</span>
              </div>
              <p className="text-sm text-zinc-500 mb-4">{group.description}</p>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {group.agents.map((agent) => {
                  const s = getStat(agent.id);
                  return (
                    <div key={agent.id} className="p-5 bg-zinc-900/50 border border-zinc-800 rounded-xl hover:border-zinc-700 transition-colors">
                      <div className="flex items-start gap-3">
                        {/* Avatar */}
                        <div className="w-10 h-10 rounded-lg bg-brand-500/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-brand-400 font-bold text-sm uppercase">{agent.name.slice(0, 2)}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="font-semibold text-zinc-100">{agent.name}</span>
                            <span className={`w-2 h-2 rounded-full ${activityDot(s.last_active)}`} />
                            <span className={`px-1.5 py-0.5 text-[10px] rounded ${group.badgeClass}`}>{group.badge}</span>
                          </div>
                          <span className="text-xs text-zinc-500">{agent.domain}</span>
                        </div>
                      </div>
                      {/* Mission */}
                      <p className="text-sm text-zinc-400 mt-3 leading-relaxed">{agent.mission}</p>
                      {/* Stats */}
                      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-zinc-800/50">
                        <span className="text-xs text-zinc-500">
                          <span className="text-zinc-300 font-medium">{s.findings_count}</span> findings
                        </span>
                        <span className="text-xs text-zinc-600">
                          {s.last_active ? relativeTime(s.last_active) : 'no activity'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}

          {/* ── Dormant ─────────────────────────────────── */}
          <section className="mb-10">
            <h2 className="text-lg font-semibold text-zinc-600 uppercase tracking-wider mb-1">Dormant</h2>
            <p className="text-sm text-zinc-600 mb-4">Reduced activity or awaiting datasets</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {DORMANT_AGENTS.map((agent) => {
                const s = getStat(agent.id);
                return (
                  <div key={agent.id} className="p-4 bg-zinc-900/30 border border-zinc-800/50 rounded-lg opacity-60">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-zinc-400 text-sm">{agent.name}</span>
                      <span className={`w-1.5 h-1.5 rounded-full ${activityDot(s.last_active)}`} />
                    </div>
                    <span className="text-xs text-zinc-600">{agent.domain}</span>
                    <p className="text-xs text-zinc-600 mt-2">{agent.mission}</p>
                    <div className="mt-2 text-xs text-zinc-600">
                      {s.findings_count > 0 ? `${s.findings_count} findings` : 'No findings'}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

        </div>
      </main>
    </div>
  );
}
