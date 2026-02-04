'use client';

import Link from 'next/link';

interface SwarmBadgeProps {
  id: string;
  name: string;
  icon: string;
  color: string;
  size?: 'sm' | 'md';
  linkable?: boolean;
}

export function SwarmBadge({
  id,
  name,
  icon,
  color,
  size = 'md',
  linkable = true,
}: SwarmBadgeProps) {
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs gap-1',
    md: 'px-3 py-1.5 text-sm gap-1.5',
  };

  const badge = (
    <span
      className={`inline-flex items-center rounded-full border font-medium ${sizeClasses[size]} ${linkable ? 'hover:opacity-80 transition-opacity cursor-pointer' : ''}`}
      style={{
        backgroundColor: `${color}15`,
        borderColor: `${color}40`,
        color: color,
      }}
    >
      <span>{icon}</span>
      <span>{name}</span>
    </span>
  );

  if (linkable) {
    return <Link href={`/swarms/${id}`}>{badge}</Link>;
  }

  return badge;
}
