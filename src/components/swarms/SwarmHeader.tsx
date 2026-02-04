'use client';

interface SwarmHeaderProps {
  name: string;
  tagline: string;
  description: string;
  icon: string;
  color: string;
  status: 'active' | 'development' | 'paused';
  agentCount: number;
  discoveryCount: number;
  investigationCount: number;
}

export function SwarmHeader({
  name,
  tagline,
  description,
  icon,
  color,
  status,
  agentCount,
  discoveryCount,
  investigationCount,
}: SwarmHeaderProps) {
  const statusColors = {
    active: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    development: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    paused: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
  };

  return (
    <div className="relative overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/50">
      {/* Color accent bar */}
      <div className="h-2" style={{ backgroundColor: color }} />

      <div className="p-6">
        {/* Main header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-4">
            <div
              className="flex h-16 w-16 items-center justify-center rounded-xl text-4xl"
              style={{ backgroundColor: `${color}20` }}
            >
              {icon}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-zinc-100">{name}</h1>
                <span
                  className={`px-2 py-1 text-xs font-medium rounded-full border ${statusColors[status]}`}
                >
                  {status}
                </span>
              </div>
              <p className="text-zinc-400 mt-1">{tagline}</p>
            </div>
          </div>
        </div>

        {/* Description */}
        <p className="text-zinc-300 mb-6">{description}</p>

        {/* Stats row */}
        <div className="flex gap-8 pt-4 border-t border-zinc-800">
          <div>
            <div className="text-2xl font-bold" style={{ color }}>
              {agentCount}
            </div>
            <div className="text-sm text-zinc-500">Active Agents</div>
          </div>
          <div>
            <div className="text-2xl font-bold" style={{ color }}>
              {discoveryCount}
            </div>
            <div className="text-sm text-zinc-500">Discoveries</div>
          </div>
          <div>
            <div className="text-2xl font-bold" style={{ color }}>
              {investigationCount.toLocaleString()}
            </div>
            <div className="text-sm text-zinc-500">Records</div>
          </div>
        </div>
      </div>

      {/* Background glow effect */}
      <div
        className="absolute top-0 right-0 w-64 h-64 opacity-5 blur-3xl pointer-events-none"
        style={{ backgroundColor: color }}
      />
    </div>
  );
}
