'use client';

/**
 * Session Selector Component
 * Dropdown to select and view previous agent sessions
 */

import { useState, useEffect } from 'react';
import type { AgentSession } from '@/lib/agent/types';

interface SessionSelectorProps {
  sessions: AgentSession[];
  currentSessionId: string | null;
  onSelectSession: (sessionId: string | null) => void;
  isLoading?: boolean;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'running':
      return 'text-green-400';
    case 'completed':
      return 'text-brand-400';
    case 'failed':
      return 'text-red-400';
    case 'cancelled':
      return 'text-amber-400';
    default:
      return 'text-zinc-400';
  }
}

function getStatusIcon(status: string): string {
  switch (status) {
    case 'running':
      return '●';
    case 'completed':
      return '✓';
    case 'failed':
      return '✗';
    case 'cancelled':
      return '○';
    default:
      return '?';
  }
}

export function SessionSelector({
  sessions,
  currentSessionId,
  onSelectSession,
  isLoading = false,
}: SessionSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const currentSession = sessions.find((s) => s.id === currentSessionId);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
        className="flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-zinc-700 rounded-lg hover:border-zinc-600 transition-colors disabled:opacity-50 min-w-[200px]"
      >
        {isLoading ? (
          <span className="text-zinc-500">Loading...</span>
        ) : currentSession ? (
          <>
            <span className={getStatusColor(currentSession.status)}>
              {getStatusIcon(currentSession.status)}
            </span>
            <span className="text-zinc-300 truncate">
              {formatDate(currentSession.started_at)}
            </span>
            <span className="text-zinc-500 text-xs ml-auto">
              {currentSession.trigger_type}
            </span>
          </>
        ) : (
          <span className="text-zinc-500">Select session...</span>
        )}
        <svg
          className={`w-4 h-4 text-zinc-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-2 w-full bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl overflow-hidden">
          <div className="max-h-[300px] overflow-y-auto">
            {sessions.length === 0 ? (
              <div className="px-4 py-3 text-zinc-500 text-sm">No sessions yet</div>
            ) : (
              sessions.map((session) => (
                <button
                  key={session.id}
                  onClick={() => {
                    onSelectSession(session.id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center gap-2 px-4 py-3 hover:bg-zinc-800 transition-colors ${
                    session.id === currentSessionId ? 'bg-zinc-800' : ''
                  }`}
                >
                  <span className={getStatusColor(session.status)}>
                    {getStatusIcon(session.status)}
                  </span>
                  <div className="flex-1 text-left">
                    <div className="text-zinc-300 text-sm">
                      {formatDate(session.started_at)}
                    </div>
                    {session.summary && (
                      <div className="text-zinc-500 text-xs truncate">
                        {session.summary}
                      </div>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-zinc-500 text-xs">
                      {session.trigger_type}
                    </div>
                    {session.status === 'completed' && (
                      <div className="text-zinc-600 text-xs">
                        {session.hypotheses_generated}h / {session.tests_run}t / {session.findings_queued}f
                      </div>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
