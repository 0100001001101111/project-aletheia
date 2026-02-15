'use client';

import { getAgentMeta } from '@/lib/agent-meta';

interface QueueTask {
  id: string;
  title: string;
  assigned_agent: string;
  status: string;
  priority: number;
  created_at: string;
  task_type: string;
}

interface QueueStats {
  totalPending: number;
  inProgress: number;
  completedThisWeek: number;
  abandoned: number;
  oldestPending: string | null;
}

interface QueueOverviewProps {
  tasks: QueueTask[];
  stats: QueueStats;
}

function ageString(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return '<1h';
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

function priorityLabel(p: number): { text: string; color: string } {
  if (p <= 1) return { text: 'Critical', color: 'text-red-400' };
  if (p <= 2) return { text: 'High', color: 'text-amber-400' };
  if (p <= 3) return { text: 'Medium', color: 'text-yellow-400' };
  return { text: 'Low', color: 'text-zinc-400' };
}

export function QueueOverview({ tasks, stats }: QueueOverviewProps) {
  const oldestAge = stats.oldestPending ? ageString(stats.oldestPending) : '-';
  const isOldestStale = stats.oldestPending
    ? (Date.now() - new Date(stats.oldestPending).getTime()) > 3 * 24 * 60 * 60 * 1000
    : false;

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
      <h3 className="text-sm font-semibold text-zinc-200 mb-4">Queue Overview</h3>

      {/* Summary stats */}
      <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs mb-4">
        <span className="text-zinc-500">Pending: <span className="text-amber-400 font-medium">{stats.totalPending}</span></span>
        <span className="text-zinc-500">In Progress: <span className="text-brand-400 font-medium">{stats.inProgress}</span></span>
        <span className="text-zinc-500">Done (7d): <span className="text-emerald-400 font-medium">{stats.completedThisWeek}</span></span>
        <span className="text-zinc-500">Abandoned: <span className="text-zinc-400 font-medium">{stats.abandoned}</span></span>
        <span className="text-zinc-500">Oldest: <span className={`font-medium ${isOldestStale ? 'text-red-400' : 'text-zinc-300'}`}>{oldestAge}</span></span>
      </div>

      {/* Task table */}
      {tasks.length === 0 ? (
        <p className="text-xs text-zinc-600 py-4 text-center">No pending tasks</p>
      ) : (
        <div className="overflow-x-auto -mx-5 px-5">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-zinc-500 border-b border-zinc-800">
                <th className="text-left py-2 pr-3 font-medium">Priority</th>
                <th className="text-left py-2 pr-3 font-medium">Agent</th>
                <th className="text-left py-2 pr-3 font-medium">Task</th>
                <th className="text-left py-2 pr-3 font-medium">Status</th>
                <th className="text-right py-2 font-medium">Age</th>
              </tr>
            </thead>
            <tbody>
              {tasks.slice(0, 20).map(task => {
                const pri = priorityLabel(task.priority);
                const meta = getAgentMeta(task.assigned_agent);
                return (
                  <tr key={task.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                    <td className={`py-2 pr-3 ${pri.color} font-medium`}>{pri.text}</td>
                    <td className="py-2 pr-3">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] ${meta.badge}`}>{meta.name}</span>
                    </td>
                    <td className="py-2 pr-3 text-zinc-300 max-w-[200px] truncate">{task.title}</td>
                    <td className="py-2 pr-3">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                        task.status === 'in_progress' ? 'bg-brand-500/15 text-brand-400' : 'bg-yellow-500/15 text-yellow-400'
                      }`}>{task.status}</span>
                    </td>
                    <td className="py-2 text-right text-zinc-500">{ageString(task.created_at)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {tasks.length > 20 && (
            <p className="text-xs text-zinc-600 mt-2 text-center">Showing 20 of {tasks.length} tasks</p>
          )}
        </div>
      )}
    </div>
  );
}
