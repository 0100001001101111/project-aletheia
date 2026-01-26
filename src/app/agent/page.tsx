'use client';

/**
 * Agent Terminal Page
 * View and trigger Aletheia Research Agent sessions
 * Phase 2: Full analysis with pattern scanning, hypothesis testing, and findings
 */

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { AgentTerminal } from '@/components/agent/AgentTerminal';
import { SessionSelector } from '@/components/agent/SessionSelector';
import Link from 'next/link';
import type { AgentSession, AgentLog, AgentStatus } from '@/lib/agent/types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

type RunMode = 'full' | 'demo';

export default function AgentPage() {
  const [status, setStatus] = useState<AgentStatus | null>(null);
  const [sessions, setSessions] = useState<AgentSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [logs, setLogs] = useState<AgentLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTriggering, setIsTriggering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [runMode, setRunMode] = useState<RunMode>('full');
  const [pendingCount, setPendingCount] = useState(0);

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  // Fetch agent status
  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/agent/status');
      if (!res.ok) throw new Error('Failed to fetch status');
      const data = await res.json();
      setStatus(data);

      // If there's a running session, auto-select it
      if (data.currentSession) {
        setSelectedSessionId(data.currentSession.id);
      }
    } catch (err) {
      console.error('Error fetching status:', err);
    }
  }, []);

  // Fetch sessions list
  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetch('/api/agent/sessions?limit=50');
      if (!res.ok) throw new Error('Failed to fetch sessions');
      const data = await res.json();
      setSessions(data.sessions || []);
    } catch (err) {
      console.error('Error fetching sessions:', err);
    }
  }, []);

  // Fetch pending findings count for review badge
  const fetchPendingCount = useCallback(async () => {
    try {
      const res = await fetch('/api/agent/findings?status=pending&limit=1');
      if (!res.ok) return;
      const data = await res.json();
      setPendingCount(data.counts?.pending || 0);
    } catch (err) {
      console.error('Error fetching pending count:', err);
    }
  }, []);

  // Fetch logs for selected session
  const fetchLogs = useCallback(async (sessionId: string) => {
    try {
      const res = await fetch(`/api/agent/sessions/${sessionId}`);
      if (!res.ok) throw new Error('Failed to fetch session');
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
      await Promise.all([fetchStatus(), fetchSessions(), fetchPendingCount()]);
      setIsLoading(false);
    };
    loadData();
  }, [fetchStatus, fetchSessions, fetchPendingCount]);

  // Load logs when session changes
  useEffect(() => {
    if (selectedSessionId) {
      fetchLogs(selectedSessionId);
    } else {
      setLogs([]);
    }
  }, [selectedSessionId, fetchLogs]);

  // Subscribe to realtime logs for running session
  useEffect(() => {
    if (!selectedSessionId || status?.currentSession?.id !== selectedSessionId) {
      return;
    }

    const channel = supabase
      .channel(`agent-logs-${selectedSessionId}`)
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

  // Trigger agent run
  const triggerRun = async () => {
    setIsTriggering(true);
    setError(null);
    setLogs([]); // Clear logs for new session

    try {
      const res = await fetch('/api/agent/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ triggerType: 'manual', mode: runMode }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to trigger agent');
      }

      const data = await res.json();

      // Refresh status and sessions
      await Promise.all([fetchStatus(), fetchSessions()]);

      // Select the new session
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
      title="Research Agent"
      description="Autonomous pattern discovery and hypothesis testing"
      headerAction={
        <Link
          href="/agent/review"
          className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
        >
          Review Queue
          {pendingCount > 0 && (
            <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-xs font-medium rounded-full">
              {pendingCount}
            </span>
          )}
        </Link>
      }
    >
      {/* Status bar */}
      <div className="mb-6 p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="text-zinc-500 text-sm">Status:</span>
              <span className={`font-medium ${status?.enabled ? 'text-green-400' : 'text-red-400'}`}>
                {status?.enabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>

            {status?.stats && (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-zinc-500 text-sm">Sessions:</span>
                  <span className="text-zinc-300">{status.stats.totalSessions}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-zinc-500 text-sm">Hypotheses:</span>
                  <span className="text-zinc-300">{status.stats.totalHypotheses}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-zinc-500 text-sm">Findings:</span>
                  <span className="text-zinc-300">
                    {status.stats.approvedFindings}/{status.stats.totalFindings}
                  </span>
                </div>
              </>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Mode selector */}
            <div className="flex items-center border border-zinc-700 rounded-lg overflow-hidden">
              <button
                onClick={() => setRunMode('full')}
                disabled={isTriggering || !!status?.currentSession}
                className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                  runMode === 'full'
                    ? 'bg-brand-600 text-white'
                    : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                } disabled:opacity-50`}
              >
                Full Analysis
              </button>
              <button
                onClick={() => setRunMode('demo')}
                disabled={isTriggering || !!status?.currentSession}
                className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                  runMode === 'demo'
                    ? 'bg-brand-600 text-white'
                    : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                } disabled:opacity-50`}
              >
                Demo
              </button>
            </div>

            {/* Run button */}
            <button
              onClick={triggerRun}
              disabled={isTriggering || !status?.enabled || !!status?.currentSession}
              className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Run Agent
                </>
              )}
            </button>
          </div>
        </div>

        {/* Mode description */}
        <div className="mt-3 text-xs text-zinc-500">
          {runMode === 'full' ? (
            <>
              <span className="text-brand-400 font-medium">Full Analysis:</span> Scans patterns, generates hypotheses via Claude API, runs statistical tests, checks confounds, and queues validated findings for review.
            </>
          ) : (
            <>
              <span className="text-brand-400 font-medium">Demo Mode:</span> Quick foundation test that loads data and shows module readiness without running full analysis.
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
          <SessionSelector
            sessions={sessions}
            currentSessionId={selectedSessionId}
            onSelectSession={setSelectedSessionId}
            isLoading={isLoading}
          />

          {isLiveSession && (
            <span className="text-green-400 text-sm flex items-center gap-1.5">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
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
                      session.status === 'running' ? 'text-blue-400' :
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
                    <span className="text-zinc-500">Hypotheses:</span>{' '}
                    <span className="text-zinc-300">{session.hypotheses_generated}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500">Tests:</span>{' '}
                    <span className="text-zinc-300">{session.tests_run}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500">Findings:</span>{' '}
                    <span className={session.findings_queued > 0 ? 'text-green-400 font-medium' : 'text-zinc-300'}>
                      {session.findings_queued}
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
