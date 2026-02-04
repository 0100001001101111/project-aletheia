'use client';

/**
 * Agent Dashboard Page
 * Live view of the autonomous research swarm
 * Shows real findings, tasks, and agent activity from Supabase
 */

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Navigation } from '@/components/layout/Navigation';
import { useAuth } from '@/contexts/AuthContext';

interface AgentFinding {
  id: string;
  title: string;
  display_title?: string;
  summary?: string;
  confidence: number;
  review_status: string;
  destination_status?: string;
  created_at: string;
  session_id?: string;
}

interface AgentTask {
  id: string;
  title: string;
  description?: string;
  assigned_to?: string;
  status: string;
  priority?: number;
  created_at: string;
}

interface AgentInfo {
  id: string;
  name: string;
  emoji: string;
  color: string;
  role: string;
  description: string;
  href: string;
}

const AGENTS: AgentInfo[] = [
  {
    id: 'argus',
    name: 'Argus',
    emoji: '👁️',
    color: 'from-violet-600 to-purple-600',
    role: 'Continuous Monitoring',
    description: 'Watches data streams 24/7, flagging new submissions and detecting anomalies.',
    href: '/agent/review',
  },
  {
    id: 'deep-miner',
    name: 'Deep Miner',
    emoji: '⛏️',
    color: 'from-amber-600 to-orange-600',
    role: 'Statistical Analysis',
    description: 'Exhaustive within-domain analysis: variable census, cross-tabulations, subgroups.',
    href: '/agent/deep-miner',
  },
  {
    id: 'discovery',
    name: 'Discovery',
    emoji: '🔍',
    color: 'from-teal-600 to-cyan-600',
    role: 'Literature Hunting',
    description: 'Monitors journals, archives, and preprints for relevant new research.',
    href: '/agent/discovery-v2',
  },
  {
    id: 'connection',
    name: 'Connection',
    emoji: '🔗',
    color: 'from-indigo-600 to-blue-600',
    role: 'Cross-Domain Patterns',
    description: 'Maps variables across domains, finds correlations, tests Keel hypothesis.',
    href: '/agent/connection',
  },
  {
    id: 'mechanism',
    name: 'Mechanism',
    emoji: '⚙️',
    color: 'from-emerald-600 to-green-600',
    role: 'Theory Testing',
    description: 'Catalogs mechanisms, designs discriminating tests, builds unified theories.',
    href: '/agent/mechanism',
  },
  {
    id: 'synthesis',
    name: 'Synthesis',
    emoji: '📊',
    color: 'from-rose-600 to-pink-600',
    role: 'Report Generation',
    description: 'Creates domain deep-dives, cross-domain syntheses, and research briefs.',
    href: '/agent/synthesis',
  },
  {
    id: 'flora',
    name: 'Flora',
    emoji: '🌿',
    color: 'from-lime-600 to-green-600',
    role: 'Plant Intelligence',
    description: 'Monitors plant bioelectrics, analyzes Backster-effect signals, tracks environmental responses.',
    href: '/agent/flora',
  },
];

function getRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function getConfidenceColor(confidence: number): string {
  if (confidence >= 0.8) return 'text-green-400';
  if (confidence >= 0.6) return 'text-amber-400';
  return 'text-zinc-400';
}

export default function AgentDashboardPage() {
  const { user } = useAuth();
  const [findings, setFindings] = useState<AgentFinding[]>([]);
  const [tasks, setTasks] = useState<AgentTask[]>([]);
  const [taskCounts, setTaskCounts] = useState({ completed: 0, active: 0, total: 0 });
  const [findingsCount, setFindingsCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      // Fetch findings from API
      const findingsRes = await fetch('/api/agent/findings?limit=20');
      if (findingsRes.ok) {
        const data = await findingsRes.json();
        setFindings(data.findings || []);
        setFindingsCount(data.counts?.total || data.findings?.length || 0);
      }

      // Fetch tasks
      const tasksRes = await fetch('/api/agent/tasks');
      if (tasksRes.ok) {
        const data = await tasksRes.json();
        setTasks(data.tasks || []);
        const completed = (data.tasks || []).filter((t: AgentTask) =>
          t.status === 'completed' || t.status === 'done'
        ).length;
        const active = (data.tasks || []).filter((t: AgentTask) =>
          t.status === 'assigned' || t.status === 'in_progress'
        ).length;
        setTaskCounts({
          completed,
          active,
          total: data.tasks?.length || 0,
        });
      }
    } catch (err) {
      console.error('Error fetching agent data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    // Refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const pendingFindings = findings.filter(f => f.review_status === 'pending');
  const recentActivity = [...findings].sort((a, b) =>
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  ).slice(0, 10);

  return (
    <div className="min-h-screen bg-zinc-950">
      <Navigation />

      <main className="pt-20 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-3xl">🤖</span>
              <h1 className="text-3xl font-bold text-zinc-100">Research Swarm</h1>
              <span className="px-3 py-1 bg-green-500/20 text-green-400 text-sm font-medium rounded-full flex items-center gap-2">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                Active
              </span>
            </div>
            <p className="text-zinc-400">
              Seven autonomous agents hunting for patterns across six research domains
            </p>
          </div>

          {/* Live Stats */}
          <div className={`grid grid-cols-2 ${user ? 'md:grid-cols-4' : 'md:grid-cols-3'} gap-4 mb-8`}>
            <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl">
              <div className="text-3xl font-bold text-brand-400">{findingsCount}</div>
              <div className="text-sm text-zinc-500">Total Findings</div>
            </div>
            {/* Only show pending count to admins */}
            {user && (
              <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl">
                <div className="text-3xl font-bold text-amber-400">{pendingFindings.length}</div>
                <div className="text-sm text-zinc-500">Awaiting Review</div>
              </div>
            )}
            <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl">
              <div className="text-3xl font-bold text-emerald-400">{taskCounts.completed}</div>
              <div className="text-sm text-zinc-500">Tasks Completed</div>
            </div>
            <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl">
              <div className="text-3xl font-bold text-blue-400">{taskCounts.active}</div>
              <div className="text-sm text-zinc-500">Active Tasks</div>
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Recent Findings Feed */}
            <div className="lg:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-zinc-100">Recent Findings</h2>
                <Link
                  href="/agent/review"
                  className="text-sm text-brand-400 hover:text-brand-300 transition-colors"
                >
                  View All →
                </Link>
              </div>

              {loading ? (
                <div className="flex items-center justify-center h-64 bg-zinc-900/50 border border-zinc-800 rounded-xl">
                  <div className="text-center">
                    <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-zinc-500">Loading findings...</p>
                  </div>
                </div>
              ) : recentActivity.length > 0 ? (
                <div className="space-y-3">
                  {recentActivity.map((finding) => (
                    <Link
                      key={finding.id}
                      href={`/agent/review/${finding.id}`}
                      className="block p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl hover:border-brand-500/30 hover:bg-zinc-900 transition-all"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-zinc-100 truncate">
                            {finding.display_title || finding.title}
                          </h3>
                          {finding.summary && (
                            <p className="text-sm text-zinc-500 mt-1 line-clamp-2">
                              {finding.summary}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                          <span className={`text-sm font-medium ${getConfidenceColor(finding.confidence)}`}>
                            {Math.round(finding.confidence * 100)}%
                          </span>
                          <span className="text-xs text-zinc-600">
                            {getRelativeTime(finding.created_at)}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        {/* Use destination_status for public display, hide pending for non-admins */}
                        {(user || finding.destination_status === 'published') && (
                          <span className={`px-2 py-0.5 text-xs rounded-full ${
                            finding.destination_status === 'published'
                              ? 'bg-green-500/20 text-green-400'
                              : finding.destination_status === 'rejected'
                              ? 'bg-red-500/20 text-red-400'
                              : 'bg-amber-500/20 text-amber-400'
                          }`}>
                            {finding.destination_status === 'published' ? 'published' :
                             finding.destination_status === 'rejected' ? 'rejected' : 'pending'}
                          </span>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center h-64 bg-zinc-900/50 border border-zinc-800 rounded-xl">
                  <div className="text-center">
                    <span className="text-4xl mb-3 block">🔬</span>
                    <p className="text-zinc-400">Agents are analyzing data...</p>
                    <p className="text-sm text-zinc-600 mt-1">Findings will appear here</p>
                  </div>
                </div>
              )}
            </div>

            {/* Agents Sidebar */}
            <div>
              <h2 className="text-xl font-semibold text-zinc-100 mb-4">Agent Swarm</h2>
              <div className="space-y-3">
                {AGENTS.map((agent) => (
                  <Link
                    key={agent.id}
                    href={agent.href}
                    className="block p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl hover:border-zinc-700 transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${agent.color} flex items-center justify-center text-xl`}>
                        {agent.emoji}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-zinc-100">{agent.name}</span>
                          <span className="w-2 h-2 bg-green-400 rounded-full" />
                        </div>
                        <p className="text-xs text-zinc-500 truncate">{agent.role}</p>
                      </div>
                      <svg
                        className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400 transition-colors"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* Recent Tasks Section */}
          {tasks.length > 0 && (
            <div className="mt-12">
              <h2 className="text-xl font-semibold text-zinc-100 mb-4">Recent Agent Tasks</h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {tasks.slice(0, 6).map((task) => (
                  <div
                    key={task.id}
                    className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="font-medium text-zinc-200 text-sm line-clamp-2">{task.title}</h3>
                      <span className={`px-2 py-0.5 text-xs rounded-full flex-shrink-0 ${
                        task.status === 'completed' || task.status === 'done'
                          ? 'bg-green-500/20 text-green-400'
                          : task.status === 'assigned'
                          ? 'bg-blue-500/20 text-blue-400'
                          : 'bg-zinc-700 text-zinc-400'
                      }`}>
                        {task.status}
                      </span>
                    </div>
                    {task.assigned_to && (
                      <p className="text-xs text-zinc-500">Assigned to: {task.assigned_to}</p>
                    )}
                    <p className="text-xs text-zinc-600 mt-1">{getRelativeTime(task.created_at)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Admin Section - Only visible to authenticated users */}
          {user && (
            <div className="mt-16 pt-8 border-t border-zinc-800">
              <h2 className="text-lg font-semibold text-zinc-400 mb-4">Admin Tools</h2>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/agent/reports"
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-sm font-medium transition-colors"
                >
                  Research Reports
                </Link>
                <Link
                  href="/agent/acquire"
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-sm font-medium transition-colors"
                >
                  Data Acquisition
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
