'use client';

interface AgentCardProps {
  id: string;
  name: string;
  role: string;
  description: string;
  personality?: string;
  avatar: string;
  status: 'active' | 'inactive';
  swarmColor?: string;
}

export function AgentCard({
  name,
  role,
  description,
  personality,
  avatar,
  status,
  swarmColor = '#8B5CF6',
}: AgentCardProps) {
  const roleColors: Record<string, string> = {
    scout: 'bg-blue-500/20 text-blue-400',
    critic: 'bg-red-500/20 text-red-400',
    librarian: 'bg-amber-500/20 text-amber-400',
    theorist: 'bg-purple-500/20 text-purple-400',
    judge: 'bg-emerald-500/20 text-emerald-400',
  };

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-4 hover:bg-zinc-900/50 transition-colors">
      <div className="flex items-start gap-3">
        <div
          className="flex h-12 w-12 items-center justify-center rounded-lg text-2xl"
          style={{ backgroundColor: `${swarmColor}20` }}
        >
          {avatar}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-medium text-zinc-100 truncate">{name}</h4>
            {status === 'inactive' && (
              <span className="px-1.5 py-0.5 text-xs bg-zinc-700 text-zinc-400 rounded">
                inactive
              </span>
            )}
          </div>
          <span className={`inline-block px-2 py-0.5 text-xs rounded-full capitalize ${roleColors[role] || 'bg-zinc-700 text-zinc-300'}`}>
            {role}
          </span>
        </div>
      </div>
      <p className="mt-3 text-sm text-zinc-400 line-clamp-2">{description}</p>
      {personality && (
        <p className="mt-2 text-xs text-zinc-500 italic">"{personality}"</p>
      )}
    </div>
  );
}
