'use client';

/**
 * Swarm Dashboard - Agent Control Room
 * Shows all 24 agents' status, task queue, findings feed, and trigger map.
 * Auth-protected. Auto-refreshes every 60 seconds.
 */

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { StatsBar } from '@/components/swarm/StatsBar';
import { AgentCard } from '@/components/swarm/AgentCard';
import { QueueOverview } from '@/components/swarm/QueueOverview';
import { FindingsFeed } from '@/components/swarm/FindingsFeed';
import { TriggerMap } from '@/components/swarm/TriggerMap';
import Link from 'next/link';

interface SwarmData {
  stats: {
    activeAgents: number;
    totalAgents: number;
    pendingTasks: number;
    findingsThisWeek: number;
    approvalRate: number;
  };
  agents: Array<{
    agent_name: string;
    last_run_at: string | null;
    status: string;
    current_task: string | null;
    pending_task_count: number;
    findings_this_week: number;
    approved_this_week: number;
    rejected_this_week: number;
  }>;
  queue: {
    tasks: Array<{
      id: string;
      title: string;
      assigned_agent: string;
      status: string;
      priority: number;
      created_at: string;
      task_type: string;
    }>;
    totalPending: number;
    inProgress: number;
    completedThisWeek: number;
    abandoned: number;
    oldestPending: string | null;
  };
  findings: Array<{
    id: string;
    title: string;
    display_title: string;
    confidence: number | null;
    review_status: string;
    agent_id: string;
    created_at: string;
  }>;
  triggers: Array<{
    trigger_id: string;
    last_checked: string | null;
    last_fired: string | null;
    condition_met: boolean;
    blocked_by_dedup: boolean;
    fire_count: number;
  }>;
}

// Agent display order matching the spec layout
const AGENT_ORDER = [
  'argus', 'deep-miner', 'discovery', 'connection',
  'mechanism', 'synthesis', 'skeptic', 'publisher',
  'flora', 'helios', 'gaia', 'poseidon',
  'methuselah', 'thoth', 'daedalus', 'chronos',
  'phaethon', 'aether', 'vulcan', 'asclepius',
  'hypnos', 'mnemosyne', 'librarian', 'orpheus',
];

export default function SwarmPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<SwarmData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [actioningId, setActioningId] = useState<string | null>(null);

  // Redirect non-authenticated users (delayed to avoid race with auth init)
  useEffect(() => {
    if (!authLoading && !user) {
      const timeout = setTimeout(() => router.replace('/agent'), 1500);
      return () => clearTimeout(timeout);
    }
  }, [user, authLoading, router]);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/swarm');
      if (!res.ok) {
        if (res.status === 401) {
          setError('Not authenticated — please sign in');
          return;
        }
        throw new Error('Failed to fetch swarm data');
      }
      const json = await res.json();
      setData(json);
      setLastRefresh(new Date());
      setError(null);
    } catch (err) {
      console.error('Swarm fetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load swarm data');
    } finally {
      setLoading(false);
    }
  }, [router]);

  // Initial fetch
  useEffect(() => {
    if (user) fetchData();
  }, [user, fetchData]);

  // Auto-refresh every 60s
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [user, fetchData]);

  const handleFindingAction = async (id: string, action: 'approve' | 'reject') => {
    setActioningId(id);
    try {
      const res = await fetch(`/api/agent/findings/${id}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(action === 'reject' ? { reason: 'not_actionable', notes: 'Quick reject from swarm dashboard' } : {}),
      });
      if (!res.ok) throw new Error(`Failed to ${action} finding`);
      // Refresh data
      fetchData();
    } catch (err) {
      console.error(`${action} error:`, err);
    } finally {
      setActioningId(null);
    }
  };

  // Sort agents by display order
  const sortedAgents = data?.agents
    ? [...data.agents].sort((a, b) => {
        const ai = AGENT_ORDER.indexOf(a.agent_name);
        const bi = AGENT_ORDER.indexOf(b.agent_name);
        return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
      })
    : [];

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
          <p className="text-zinc-400 mb-4">Sign in to access the swarm dashboard</p>
          <Link href="/agent" className="text-brand-400 hover:text-brand-300 underline">Back to Agents</Link>
        </div>
      </div>
    );
  }

  return (
    <PageWrapper
      title="Swarm Control Room"
      description="24-agent research swarm status, queue, and findings"
      headerAction={
        <div className="flex items-center gap-3">
          {lastRefresh && (
            <span className="text-xs text-zinc-500">
              Updated {lastRefresh.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={fetchData}
            disabled={loading}
            className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
          <Link
            href="/agent/review"
            className="px-3 py-1.5 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Review Queue
          </Link>
        </div>
      }
    >
      {loading && !data && (
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <div className="w-8 h-8 mx-auto border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
            <p className="mt-4 text-zinc-500 text-sm">Loading swarm data...</p>
          </div>
        </div>
      )}

      {error && !data && (
        <div className="p-4 bg-red-900/20 border border-red-500/30 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      {data && (
        <div className="space-y-6 animate-fade-in">
          {/* Section 1: Stats Bar */}
          <StatsBar
            activeAgents={data.stats.activeAgents}
            totalAgents={data.stats.totalAgents}
            pendingTasks={data.stats.pendingTasks}
            findingsThisWeek={data.stats.findingsThisWeek}
            approvalRate={data.stats.approvalRate}
          />

          {/* Section 2: Agent Grid */}
          <div>
            <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">Agent Status</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {sortedAgents.map(agent => (
                <AgentCard
                  key={agent.agent_name}
                  agent={agent}
                  tasks={data.queue.tasks}
                  findings={data.findings}
                />
              ))}
            </div>
          </div>

          {/* Section 3 & 4: Queue + Findings side by side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <QueueOverview
              tasks={data.queue.tasks}
              stats={{
                totalPending: data.queue.totalPending,
                inProgress: data.queue.inProgress,
                completedThisWeek: data.queue.completedThisWeek,
                abandoned: data.queue.abandoned,
                oldestPending: data.queue.oldestPending,
              }}
            />
            <FindingsFeed
              findings={data.findings}
              onAction={handleFindingAction}
              isActioning={actioningId}
            />
          </div>

          {/* Section 5: Trigger Map */}
          <TriggerMap triggers={data.triggers} />
        </div>
      )}
    </PageWrapper>
  );
}
