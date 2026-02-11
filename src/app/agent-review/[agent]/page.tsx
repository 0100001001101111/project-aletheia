'use client';

/**
 * Agent Profile Page - Shows stats, findings, and open tasks for a specific agent
 */

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { getAgentMeta } from '@/lib/agent-meta';

interface Finding {
  id: string;
  title: string;
  display_title: string;
  summary: string | null;
  confidence: number | null;
  review_status: string | null;
  destination_type: string | null;
  agent_id: string | null;
  created_at: string | null;
}

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string | null;
  priority: number | null;
  created_at: string | null;
}

export default function AgentProfilePage() {
  const params = useParams();
  const agentId = params.agent as string;
  const meta = getAgentMeta(agentId);

  const [findings, setFindings] = useState<Finding[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      try {
        const [findingsRes, tasksRes] = await Promise.all([
          fetch(`/api/agent-review?agent=${agentId}&limit=100`),
          fetch(`/api/agent-review/tasks?agent=${agentId}`),
        ]);
        if (findingsRes.ok) {
          const data = await findingsRes.json();
          setFindings(data.findings || []);
        }
        if (tasksRes.ok) {
          const data = await tasksRes.json();
          setTasks(data.tasks || []);
        }
      } catch (err) {
        console.error('Failed to load agent data:', err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, [agentId]);

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const avgConfidence = findings.length > 0
    ? Math.round(findings.reduce((s, f) => s + (f.confidence || 0), 0) / findings.length * 100)
    : 0;

  const thisWeek = findings.filter(f => {
    if (!f.created_at) return false;
    return (Date.now() - new Date(f.created_at).getTime()) < 7 * 24 * 60 * 60 * 1000;
  }).length;

  const openTasks = tasks.filter(t => t.status === 'assigned');
  const completedTasks = tasks.filter(t => t.status === 'completed' || t.status === 'done');

  return (
    <PageWrapper
      title={meta.name}
      description={meta.description}
      headerAction={
        <Link
          href="/agent-review"
          className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-sm font-medium transition-colors"
        >
          All Agents
        </Link>
      }
    >
      {/* Stats */}
      <div className="mb-8 grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg">
          <div className="text-2xl font-bold text-zinc-100">{findings.length}</div>
          <div className="text-sm text-zinc-500">Total Findings</div>
        </div>
        <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg">
          <div className={`text-2xl font-bold ${avgConfidence >= 85 ? 'text-emerald-400' : avgConfidence >= 70 ? 'text-amber-400' : 'text-zinc-400'}`}>
            {avgConfidence}%
          </div>
          <div className="text-sm text-zinc-500">Avg Confidence</div>
        </div>
        <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg">
          <div className="text-2xl font-bold text-violet-400">{thisWeek}</div>
          <div className="text-sm text-zinc-500">This Week</div>
        </div>
        <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg">
          <div className="text-2xl font-bold text-amber-400">{openTasks.length}</div>
          <div className="text-sm text-zinc-500">Open Tasks</div>
        </div>
        <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg">
          <div className="text-2xl font-bold text-emerald-400">{completedTasks.length}</div>
          <div className="text-sm text-zinc-500">Completed</div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Open Tasks */}
          {openTasks.length > 0 && (
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-zinc-100 mb-4">Open Tasks ({openTasks.length})</h2>
              <div className="space-y-2">
                {openTasks.map(task => (
                  <div key={task.id} className="p-3 bg-zinc-900/50 border border-zinc-800 rounded-lg flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-zinc-200">{task.title}</div>
                      {task.description && <div className="text-xs text-zinc-500 mt-1 line-clamp-1">{task.description}</div>}
                    </div>
                    <span className={`shrink-0 px-2 py-0.5 text-xs rounded ${
                      task.priority != null && task.priority >= 4 ? 'bg-red-500/10 text-red-400' :
                      task.priority != null && task.priority >= 3 ? 'bg-amber-500/10 text-amber-400' :
                      'bg-zinc-700/50 text-zinc-400'
                    }`}>
                      P{task.priority ?? 0}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Findings */}
          <h2 className="text-lg font-semibold text-zinc-100 mb-4">Findings ({findings.length})</h2>
          {findings.length === 0 ? (
            <div className="py-8 text-center text-zinc-500">No findings from this agent yet.</div>
          ) : (
            <div className="space-y-3">
              {findings.map(f => {
                const conf = f.confidence || 0;
                const confPct = Math.round(conf * 100);
                const expanded = expandedIds.has(f.id);

                return (
                  <div key={f.id} className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg hover:border-zinc-700 transition-all">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-medium text-zinc-100 line-clamp-2">{f.display_title}</h3>
                        <p className="text-sm text-zinc-500 mt-1 line-clamp-1">{f.title}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="w-16 h-2 bg-zinc-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${confPct >= 85 ? 'bg-emerald-500' : confPct >= 70 ? 'bg-amber-500' : 'bg-zinc-600'}`}
                            style={{ width: `${confPct}%` }}
                          />
                        </div>
                        <span className="text-xs text-zinc-400">{confPct}%</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-3">
                        {f.destination_type && (
                          <span className="px-2 py-0.5 text-xs rounded bg-zinc-700/50 text-zinc-400">
                            {f.destination_type.replace('_', ' ')}
                          </span>
                        )}
                        <span className="text-xs text-zinc-600">
                          {f.created_at ? new Date(f.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}
                        </span>
                      </div>
                      <button
                        onClick={() => toggleExpand(f.id)}
                        className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
                      >
                        {expanded ? 'Collapse' : 'Details'}
                      </button>
                    </div>
                    {expanded && f.summary && (
                      <div className="mt-3 pt-3 border-t border-zinc-800 animate-fade-in">
                        <p className="text-sm text-zinc-300 whitespace-pre-wrap">{f.summary}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </PageWrapper>
  );
}
