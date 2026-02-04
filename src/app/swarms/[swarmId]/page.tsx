'use client';

/**
 * Swarm Detail Page
 * Display swarm info and its agents
 */

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { SwarmHeader, AgentCard } from '@/components/swarms';

interface Agent {
  id: string;
  name: string;
  role: string;
  description: string;
  personality: string;
  avatar: string;
  status: 'active' | 'inactive';
  stats: Record<string, number>;
}

interface Swarm {
  id: string;
  name: string;
  tagline: string;
  description: string;
  icon: string;
  color: string;
  status: 'active' | 'development' | 'paused';
  agent_count: number;
  discovery_count: number;
  investigation_count: number;
  agents: Agent[];
}

export default function SwarmDetailPage() {
  const params = useParams();
  const swarmId = params.swarmId as string;
  const [swarm, setSwarm] = useState<Swarm | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSwarm() {
      try {
        const response = await fetch(`/api/swarms/${swarmId}`);
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Swarm not found');
          }
          throw new Error('Failed to fetch swarm');
        }
        const data = await response.json();
        setSwarm(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load swarm');
      } finally {
        setLoading(false);
      }
    }
    if (swarmId) {
      fetchSwarm();
    }
  }, [swarmId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-500 border-t-transparent mx-auto" />
          <p className="mt-4 text-zinc-400">Loading swarm...</p>
        </div>
      </div>
    );
  }

  if (error || !swarm) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-red-400 text-lg mb-2">Error</div>
          <p className="text-zinc-400 mb-4">{error || 'Swarm not found'}</p>
          <Link
            href="/swarms"
            className="text-violet-400 hover:text-violet-300 transition-colors"
          >
            ← Back to Swarms
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Navigation */}
      <div className="border-b border-zinc-800 bg-zinc-900/50">
        <div className="mx-auto max-w-6xl px-4 py-3">
          <Link
            href="/swarms"
            className="text-sm text-zinc-400 hover:text-zinc-100 transition-colors"
          >
            ← Back to Swarms
          </Link>
        </div>
      </div>

      {/* Content */}
      <main className="mx-auto max-w-6xl px-4 py-8">
        {/* Swarm Header */}
        <SwarmHeader
          name={swarm.name}
          tagline={swarm.tagline}
          description={swarm.description}
          icon={swarm.icon}
          color={swarm.color}
          status={swarm.status}
          agentCount={swarm.agent_count}
          discoveryCount={swarm.discovery_count}
          investigationCount={swarm.investigation_count}
        />

        {/* Agents Section */}
        <section className="mt-8">
          <h2 className="text-xl font-semibold text-zinc-100 mb-4">
            Agents ({swarm.agents.length})
          </h2>
          {swarm.agents.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {swarm.agents.map((agent) => (
                <AgentCard
                  key={agent.id}
                  id={agent.id}
                  name={agent.name}
                  role={agent.role}
                  description={agent.description}
                  personality={agent.personality}
                  avatar={agent.avatar}
                  status={agent.status}
                  swarmColor={swarm.color}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-8 text-center">
              <p className="text-zinc-500">No agents configured yet</p>
            </div>
          )}
        </section>

        {/* Quick Links */}
        <section className="mt-8">
          <h2 className="text-xl font-semibold text-zinc-100 mb-4">Quick Links</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <Link
              href={`/investigations?swarm=${swarm.id}`}
              className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-4 hover:bg-zinc-900/50 transition-colors"
            >
              <div className="text-lg font-medium text-zinc-100">Investigations</div>
              <p className="text-sm text-zinc-500 mt-1">
                Browse {swarm.investigation_count.toLocaleString()} records
              </p>
            </Link>
            {swarm.id === 'anomaly' && (
              <>
                <Link
                  href="/agent"
                  className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-4 hover:bg-zinc-900/50 transition-colors"
                >
                  <div className="text-lg font-medium text-zinc-100">Agent Terminal</div>
                  <p className="text-sm text-zinc-500 mt-1">
                    Run and monitor research agents
                  </p>
                </Link>
                <Link
                  href="/predictions"
                  className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-4 hover:bg-zinc-900/50 transition-colors"
                >
                  <div className="text-lg font-medium text-zinc-100">Predictions</div>
                  <p className="text-sm text-zinc-500 mt-1">
                    Falsifiable hypotheses
                  </p>
                </Link>
              </>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
