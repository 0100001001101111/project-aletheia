'use client';

/**
 * Discovery Agent Terminal Page
 * View and trigger Discovery Agent sessions
 */

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { AgentTerminal } from '@/components/agent/AgentTerminal';
import Link from 'next/link';
import type { AgentLog, LogType } from '@/lib/agent/types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

interface DiscoverySession {
  id: string;
  started_at: string;
  ended_at: string | null;
  status: string;
  leads_found: number;
  connections_found: number;
  sources_scanned: number;
  focus_areas: string[] | null;
  summary: string | null;
}

interface DiscoveryStatus {
  enabled: boolean;
  currentSession: DiscoverySession | null;
  lastSession: DiscoverySession | null;
  stats: {
    totalSessions: number;
    totalLeads: number;
    pendingLeads: number;
    approvedLeads: number;
    totalConnections: number;
    sourcesMonitored: number;
    researchersTracked: number;
  };
}

type RunMode = 'full' | 'demo';

export default function DiscoveryAgentPage() {
  const [status, setStatus] = useState<DiscoveryStatus | null>(null);
  const [sessions, setSessions] = useState<DiscoverySession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [logs, setLogs] = useState<AgentLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTriggering, setIsTriggering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [runMode, setRunMode] = useState<RunMode>('full');
  const [focusArea, setFocusArea] = useState('');

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  // Fetch status
  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/agent/discovery/status');
      if (!res.ok) throw new Error('Failed to fetch status');
      const data = await res.json();
      setStatus(data);

      if (data.currentSession) {
        setSelectedSessionId(data.currentSession.id);
      }
    } catch (err) {
      console.error('Error fetching status:', err);
    }
  }, []);

  // Fetch sessions
  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetch('/api/agent/discovery/sessions?limit=20');
      if (!res.ok) throw new Error('Failed to fetch sessions');
      const data = await res.json();
      setSessions(data.sessions || []);
    } catch (err) {
      console.error('Error fetching sessions:', err);
    }
  }, []);

  // Fetch logs for session
  const fetchLogs = useCallback(async (sessionId: string) => {
    try {
      const res = await fetch(`/api/agent/sessions/${sessionId}`);
      if (!res.ok) return;
      const data = await res.json();
      setLogs(data.logs || []);
    } catch (err) {
      console.error('Error fetching logs:', err);
    }
  }, []);

  // Initial load
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([fetchStatus(), fetchSessions()]);
      setIsLoading(false);
    };
    loadData();
  }, [fetchStatus, fetchSessions]);

  // Load logs when session changes
  useEffect(() => {
    if (selectedSessionId) {
      fetchLogs(selectedSessionId);
    } else {
      setLogs([]);
    }
  }, [selectedSessionId, fetchLogs]);

  // Subscribe to realtime logs
  useEffect(() => {
    if (!selectedSessionId || status?.currentSession?.id !== selectedSessionId) {
      return;
    }

    const channel = supabase
      .channel(`discovery-logs-${selectedSessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'aletheia_agent_logs',
          filter: `session_id=eq.${selectedSessionId}`,
        },
        (payload) => {
          const newLog = payload.new as AgentLog;
          setLogs((prev) => [...prev, newLog]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedSessionId, status?.currentSession?.id, supabase]);

  // Poll for session completion
  useEffect(() => {
    if (!status?.currentSession) return;

    const interval = setInterval(async () => {
      await fetchStatus();
      await fetchSessions();
    }, 3000);

    return () => clearInterval(interval);
  }, [status?.currentSession, fetchStatus, fetchSessions]);

  // Trigger run
  const triggerRun = async () => {
    setIsTriggering(true);
    setError(null);
    setLogs([]);

    try {
      const res = await fetch('/api/agent/discovery/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          triggerType: 'manual',
          mode: runMode,
          focusAreas: focusArea ? [focusArea] : [],
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to trigger agent');
      }

      const data = await res.json();
      await Promise.all([fetchStatus(), fetchSessions()]);

      if (data.sessionId) {
        setSelectedSessionId(data.sessionId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsTriggering(false);
    }
  };

  const isLiveSession = selectedSessionId === status?.currentSession?.id;

  return (
    <PageWrapper
      title="Discovery Agent"
      description="Hunt for external research and cross-domain connections"
      headerAction={
        <div className="flex items-center gap-3">
          <Link
            href="/agent/discovery/leads"
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
          >
            Leads Queue
            {(status?.stats?.pendingLeads || 0) > 0 && (
              <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-xs font-medium rounded-full">
                {status?.stats?.pendingLeads}
              </span>
            )}
          </Link>
          <Link
            href="/agent/discovery/sources"
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-sm font-medium transition-colors"
          >
            Sources
          </Link>
          <Link
            href="/agent/discovery/researchers"
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-sm font-medium transition-colors"
          >
            Researchers
          </Link>
          <Link
            href="/agent"
            className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 rounded-lg text-sm font-medium transition-colors"
          >
            Research Agent
          </Link>
        </div>
      }
    >
      {/* Status bar */}
      <div className="mb-6 p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="text-zinc-500 text-sm">Status:</span>
              <span className="font-medium text-green-400">Active</span>
            </div>

            {status?.stats && (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-zinc-500 text-sm">Sessions:</span>
                  <span className="text-zinc-300">{status.stats.totalSessions}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-zinc-500 text-sm">Leads:</span>
                  <span className="text-zinc-300">{status.stats.totalLeads}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-zinc-500 text-sm">Connections:</span>
                  <span className="text-zinc-300">{status.stats.totalConnections}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-zinc-500 text-sm">Sources:</span>
                  <span className="text-zinc-300">{status.stats.sourcesMonitored}</span>
                </div>
              </>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Focus area input */}
            <input
              type="text"
              placeholder="Focus area (optional)"
              value={focusArea}
              onChange={(e) => setFocusArea(e.target.value)}
              className="px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-300 placeholder:text-zinc-500 w-48"
              disabled={isTriggering || !!status?.currentSession}
            />

            {/* Mode selector */}
            <div className="flex items-center border border-zinc-700 rounded-lg overflow-hidden">
              <button
                onClick={() => setRunMode('full')}
                disabled={isTriggering || !!status?.currentSession}
                className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                  runMode === 'full'
                    ? 'bg-purple-600 text-white'
                    : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                } disabled:opacity-50`}
              >
                Full Discovery
              </button>
              <button
                onClick={() => setRunMode('demo')}
                disabled={isTriggering || !!status?.currentSession}
                className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                  runMode === 'demo'
                    ? 'bg-purple-600 text-white'
                    : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                } disabled:opacity-50`}
              >
                Demo
              </button>
            </div>

            {/* Run button */}
            <button
              onClick={triggerRun}
              disabled={isTriggering || !!status?.currentSession}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isTriggering ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Starting...
                </>
              ) : status?.currentSession ? (
                <>
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  Running
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  Run Discovery
                </>
              )}
            </button>
          </div>
        </div>

        {/* Mode description */}
        <div className="mt-3 text-xs text-zinc-500">
          {runMode === 'full' ? (
            <>
              <span className="text-purple-400 font-medium">Full Discovery:</span> Checks monitored sources, scans researchers, follows citations, finds cross-domain connections, queues leads for review.
            </>
          ) : (
            <>
              <span className="text-purple-400 font-medium">Demo Mode:</span> Quick test of all capabilities without full web scanning.
            </>
          )}
        </div>

        {error && (
          <div className="mt-3 p-2 bg-red-900/20 border border-red-500/30 rounded text-red-400 text-sm">
            {error}
          </div>
        )}
      </div>

      {/* Session selector and terminal */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <select
            value={selectedSessionId || ''}
            onChange={(e) => setSelectedSessionId(e.target.value || null)}
            className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-300"
            disabled={isLoading}
          >
            <option value="">Select a session...</option>
            {sessions.map((session) => (
              <option key={session.id} value={session.id}>
                {new Date(session.started_at).toLocaleString()} - {session.status}
                {session.leads_found > 0 && ` (${session.leads_found} leads)`}
              </option>
            ))}
          </select>

          {isLiveSession && (
            <span className="text-purple-400 text-sm flex items-center gap-1.5">
              <span className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" />
              Live streaming
            </span>
          )}
        </div>

        <AgentTerminal logs={logs} isLive={isLiveSession} />

        {/* Session summary */}
        {selectedSessionId && !isLiveSession && (
          <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg">
            {(() => {
              const session = sessions.find((s) => s.id === selectedSessionId);
              if (!session) return null;

              return (
                <div className="flex flex-wrap gap-6 text-sm">
                  <div>
                    <span className="text-zinc-500">Status:</span>{' '}
                    <span className={`font-medium ${
                      session.status === 'completed' ? 'text-green-400' :
                      session.status === 'failed' ? 'text-red-400' :
                      session.status === 'running' ? 'text-purple-400' :
                      'text-zinc-400'
                    }`}>
                      {session.status}
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-500">Duration:</span>{' '}
                    <span className="text-zinc-300">
                      {session.ended_at
                        ? `${Math.round((new Date(session.ended_at).getTime() - new Date(session.started_at).getTime()) / 1000)}s`
                        : 'In progress'}
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-500">Sources:</span>{' '}
                    <span className="text-zinc-300">{session.sources_scanned}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500">Leads:</span>{' '}
                    <span className={session.leads_found > 0 ? 'text-green-400 font-medium' : 'text-zinc-300'}>
                      {session.leads_found}
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-500">Connections:</span>{' '}
                    <span className={session.connections_found > 0 ? 'text-purple-400 font-medium' : 'text-zinc-300'}>
                      {session.connections_found}
                    </span>
                  </div>
                  {session.summary && (
                    <div className="w-full">
                      <span className="text-zinc-500">Summary:</span>{' '}
                      <span className="text-zinc-300">{session.summary}</span>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
