'use client';

import Link from 'next/link';

interface SwarmCardProps {
  id: string;
  name: string;
  tagline: string;
  description?: string;
  icon: string;
  color: string;
  status: 'active' | 'development' | 'paused' | 'planned';
  agentCount: number;
  discoveryCount: number;
  investigationCount: number;
}

export function SwarmCard({
  id,
  name,
  tagline,
  icon,
  color,
  status,
  agentCount,
  discoveryCount,
  investigationCount,
}: SwarmCardProps) {
  const statusColors = {
    active: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    development: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    paused: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
    planned: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  };

  return (
    <Link href={`/swarms/${id}`}>
      <div
        className="group relative rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 transition-all hover:border-zinc-700 hover:bg-zinc-900/80 cursor-pointer"
        style={{ '--swarm-color': color } as React.CSSProperties}
      >
        {/* Accent line */}
        <div
          className="absolute inset-x-0 top-0 h-1 rounded-t-xl"
          style={{ backgroundColor: color }}
        />

        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{icon}</span>
            <div>
              <h3 className="text-lg font-bold text-zinc-100">{name}</h3>
              <p className="text-sm text-zinc-400">{tagline}</p>
            </div>
          </div>
          <span
            className={`px-2 py-1 text-xs font-medium rounded-full border ${statusColors[status]}`}
          >
            {status}
          </span>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-zinc-800">
          <div className="text-center">
            <div className="text-xl font-bold text-zinc-100">{agentCount}</div>
            <div className="text-xs text-zinc-500">Agents</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-zinc-100">{discoveryCount}</div>
            <div className="text-xs text-zinc-500">Discoveries</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-zinc-100">{investigationCount}</div>
            <div className="text-xs text-zinc-500">Records</div>
          </div>
        </div>

        {/* Hover effect */}
        <div
          className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-10 transition-opacity pointer-events-none"
          style={{ backgroundColor: color }}
        />
      </div>
    </Link>
  );
}
