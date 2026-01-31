'use client';

/**
 * Swarms Overview Page
 * Display all active research swarms using the central registry
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { SwarmCard } from '@/components/swarms';
import { getActiveSwarms, getSwarmCounts, type Swarm } from '@/config/swarms';

interface SwarmStats {
  agentCount: number;
  discoveryCount: number;
  investigationCount: number;
}

export default function SwarmsPage() {
  const [stats, setStats] = useState<Record<string, SwarmStats>>({});
  const [loading, setLoading] = useState(true);

  // Get active swarms from registry (no API call needed)
  const activeSwarms = getActiveSwarms();
  const swarmCounts = getSwarmCounts();

  useEffect(() => {
    async function fetchStats() {
      try {
        // Fetch live stats for active swarms from API
        const response = await fetch('/api/swarms/stats');
        if (response.ok) {
          const data = await response.json();
          setStats(data);
        }
      } catch {
        // Stats are optional - swarms still display without them
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  // Get stats for a swarm, falling back to registry data
  const getSwarmStats = (swarm: Swarm): SwarmStats => {
    if (stats[swarm.id]) {
      return stats[swarm.id];
    }
    // Fallback to registry counts
    return {
      agentCount: swarm.agents.length,
      discoveryCount: 0,
      investigationCount: 0,
    };
  };

  // Calculate totals
  const totalAgents = activeSwarms.reduce((acc, s) => acc + getSwarmStats(s).agentCount, 0);
  const totalRecords = activeSwarms.reduce((acc, s) => acc + getSwarmStats(s).investigationCount, 0);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <div className="border-b border-zinc-800 bg-zinc-900/50">
        <div className="mx-auto max-w-6xl px-4 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-zinc-100">Research Swarms</h1>
              <p className="mt-2 text-zinc-400">
                Autonomous AI agents hunting for patterns across scientific domains
              </p>
            </div>
            <Link
              href="/"
              className="text-sm text-zinc-400 hover:text-zinc-100 transition-colors"
            >
              ← Back to Home
            </Link>
          </div>

          {/* Stats bar */}
          <div className="mt-6 flex gap-8 text-sm">
            <div>
              <span className="text-2xl font-bold text-violet-400">{activeSwarms.length}</span>
              <span className="ml-2 text-zinc-500">Active Swarms</span>
            </div>
            <div>
              <span className="text-2xl font-bold text-violet-400">{totalAgents}</span>
              <span className="ml-2 text-zinc-500">Agents</span>
            </div>
            {totalRecords > 0 && (
              <div>
                <span className="text-2xl font-bold text-violet-400">
                  {totalRecords.toLocaleString()}
                </span>
                <span className="ml-2 text-zinc-500">Records</span>
              </div>
            )}
            <div>
              <span className="text-2xl font-bold text-zinc-500">{swarmCounts.planned}</span>
              <span className="ml-2 text-zinc-600">Planned</span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="mx-auto max-w-6xl px-4 py-8">
        {/* Active Swarms */}
        {activeSwarms.length > 0 && (
          <section className="mb-12">
            <h2 className="text-xl font-semibold text-zinc-100 mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Active Swarms
            </h2>
            <div className="grid gap-6 md:grid-cols-2">
              {activeSwarms.map((swarm) => {
                const swarmStats = getSwarmStats(swarm);
                return (
                  <SwarmCard
                    key={swarm.id}
                    id={swarm.id}
                    name={swarm.name}
                    tagline={swarm.tagline}
                    description={swarm.description}
                    icon={swarm.icon}
                    color={swarm.color}
                    status={swarm.status}
                    agentCount={swarmStats.agentCount}
                    discoveryCount={swarmStats.discoveryCount}
                    investigationCount={swarmStats.investigationCount}
                  />
                );
              })}
            </div>
          </section>
        )}

        {/* Coming Soon Note */}
        <div className="mt-8 p-4 rounded-lg border border-zinc-800 bg-zinc-900/30 text-center">
          <p className="text-zinc-500 text-sm">
            {swarmCounts.planned} more research domains planned
          </p>
        </div>
      </main>
    </div>
  );
}
