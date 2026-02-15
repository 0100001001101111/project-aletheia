'use client';

import { useState } from 'react';
import { getAgentMeta } from '@/lib/agent-meta';

interface AgentStatus {
  agent_name: string;
  last_run_at: string | null;
  status: string;
  current_task: string | null;
  pending_task_count: number;
  findings_this_week: number;
  approved_this_week: number;
  rejected_this_week: number;
}

interface AgentTask {
  id: string;
  title: string;
  status: string;
  priority: number;
  created_at: string;
  assigned_agent: string;
}

interface AgentFinding {
  id: string;
  title: string;
  display_title: string;
  confidence: number | null;
  review_status: string;
  agent_id: string;
  created_at: string;
}

interface AgentCardProps {
  agent: AgentStatus;
  tasks: AgentTask[];
  findings: AgentFinding[];
}

const INACTIVE_AGENTS = ['vulcan', 'asclepius', 'hypnos', 'mnemosyne', 'hermes', 'orpheus'];

function getStatusColor(agent: AgentStatus): string {
  if (INACTIVE_AGENTS.includes(agent.agent_name) || agent.status === 'inactive') return 'bg-zinc-600';

  const lastRun = agent.last_run_at ? new Date(agent.last_run_at) : null;
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  if (!lastRun || lastRun < dayAgo) return 'bg-red-500';
  if (agent.pending_task_count > 0) return 'bg-emerald-500';
  return 'bg-yellow-500';
}

function getStatusLabel(agent: AgentStatus): string {
  if (INACTIVE_AGENTS.includes(agent.agent_name) || agent.status === 'inactive') return 'Inactive';
  const lastRun = agent.last_run_at ? new Date(agent.last_run_at) : null;
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  if (!lastRun || lastRun < dayAgo) return 'Stale';
  if (agent.pending_task_count > 0) return 'Active';
  return 'Idle';
}

function relativeTime(dateStr: string | null): string {
  if (!dateStr) return 'Never';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function statusBadge(status: string) {
  const colors: Record<string, string> = {
    pending: 'bg-yellow-500/15 text-yellow-400',
    approved: 'bg-emerald-500/15 text-emerald-400',
    rejected: 'bg-red-500/15 text-red-400',
    needs_info: 'bg-blue-500/15 text-blue-400',
    in_progress: 'bg-brand-500/15 text-brand-400',
    completed: 'bg-emerald-500/15 text-emerald-400',
  };
  return colors[status] || 'bg-zinc-500/15 text-zinc-400';
}

export function AgentCard({ agent, tasks, findings }: AgentCardProps) {
  const [expanded, setExpanded] = useState(false);
  const meta = getAgentMeta(agent.agent_name);
  const statusColor = getStatusColor(agent);

  const agentTasks = tasks.filter(t => t.assigned_agent === agent.agent_name);
  const agentFindings = findings.filter(f => f.agent_id === agent.agent_name);

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 hover:border-zinc-700 transition-colors">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left p-4"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${statusColor}`} />
              <span className="font-semibold text-zinc-100 truncate">{meta.name}</span>
              <span className="text-[10px] text-zinc-600 uppercase">{getStatusLabel(agent)}</span>
            </div>
            <p className="text-xs text-zinc-500 mt-1 truncate">{meta.description}</p>
          </div>
          <svg
            className={`w-4 h-4 text-zinc-500 flex-shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>

        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs">
          <span className="text-zinc-500">Last run: <span className="text-zinc-300">{relativeTime(agent.last_run_at)}</span></span>
          <span className="text-zinc-500">Tasks: <span className="text-zinc-300">{agent.pending_task_count}</span></span>
          <span className="text-zinc-500">
            Findings: <span className="text-emerald-400">{agent.approved_this_week}</span>
            /<span className="text-red-400">{agent.rejected_this_week}</span>
            /<span className="text-zinc-300">{agent.findings_this_week}</span>
          </span>
        </div>

        {agent.current_task && (
          <div className="mt-2 text-xs text-brand-400 truncate">
            Running: {agent.current_task}
          </div>
        )}
      </button>

      {expanded && (
        <div className="border-t border-zinc-800 p-4 space-y-4">
          {/* Tasks */}
          <div>
            <h4 className="text-xs font-semibold text-zinc-400 uppercase mb-2">Tasks ({agentTasks.length})</h4>
            {agentTasks.length === 0 ? (
              <p className="text-xs text-zinc-600">No pending tasks</p>
            ) : (
              <div className="space-y-1.5">
                {agentTasks.slice(0, 5).map(task => (
                  <div key={task.id} className="flex items-center gap-2 text-xs">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] ${statusBadge(task.status)}`}>{task.status}</span>
                    <span className="text-zinc-300 truncate">{task.title}</span>
                  </div>
                ))}
                {agentTasks.length > 5 && (
                  <p className="text-xs text-zinc-600">+{agentTasks.length - 5} more</p>
                )}
              </div>
            )}
          </div>

          {/* Findings */}
          <div>
            <h4 className="text-xs font-semibold text-zinc-400 uppercase mb-2">Recent Findings ({agentFindings.length})</h4>
            {agentFindings.length === 0 ? (
              <p className="text-xs text-zinc-600">No findings this week</p>
            ) : (
              <div className="space-y-1.5">
                {agentFindings.slice(0, 5).map(finding => (
                  <div key={finding.id} className="flex items-center gap-2 text-xs">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] ${statusBadge(finding.review_status)}`}>
                      {finding.review_status}
                    </span>
                    <a
                      href={`/agent/review/${finding.id}`}
                      className="text-zinc-300 hover:text-brand-400 truncate transition-colors"
                      onClick={e => e.stopPropagation()}
                    >
                      {finding.display_title || finding.title}
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
