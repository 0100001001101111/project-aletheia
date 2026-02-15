'use client';

interface StatsBarProps {
  activeAgents: number;
  totalAgents: number;
  pendingTasks: number;
  findingsThisWeek: number;
  approvalRate: number;
}

export function StatsBar({ activeAgents, totalAgents, pendingTasks, findingsThisWeek, approvalRate }: StatsBarProps) {
  const stats = [
    { label: 'Agents Active', value: `${activeAgents}/${totalAgents}`, color: activeAgents > 0 ? 'text-emerald-400' : 'text-zinc-500' },
    { label: 'Tasks Queued', value: pendingTasks, color: pendingTasks > 0 ? 'text-amber-400' : 'text-zinc-400' },
    { label: 'Findings This Week', value: findingsThisWeek, color: findingsThisWeek > 0 ? 'text-brand-400' : 'text-zinc-400' },
    { label: 'Approval Rate', value: `${approvalRate}%`, color: approvalRate >= 50 ? 'text-emerald-400' : 'text-red-400' },
  ];

  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 bg-zinc-900/60 border border-zinc-800 rounded-lg text-sm">
      {stats.map((stat) => (
        <div key={stat.label} className="flex items-center gap-2">
          <span className="text-zinc-500">{stat.label}:</span>
          <span className={`font-semibold ${stat.color}`}>{stat.value}</span>
        </div>
      ))}
    </div>
  );
}
