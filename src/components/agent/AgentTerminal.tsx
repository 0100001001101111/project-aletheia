'use client';

/**
 * Agent Terminal Component
 * Displays real-time agent logs in a terminal-like interface
 */

import { useEffect, useRef } from 'react';
import type { AgentLog, LogType } from '@/lib/agent/types';

interface AgentTerminalProps {
  logs: AgentLog[];
  isLive?: boolean;
}

const LOG_COLORS: Record<LogType, string> = {
  info: 'text-zinc-300',
  hypothesis: 'text-purple-400',
  test: 'text-cyan-400',
  result: 'text-green-400',
  warning: 'text-amber-400',
  error: 'text-red-400',
  system: 'text-brand-400',
};

const LOG_PREFIXES: Record<LogType, string> = {
  info: '[INFO]',
  hypothesis: '[HYPOTHESIS]',
  test: '[TEST]',
  result: '[RESULT]',
  warning: '[WARN]',
  error: '[ERROR]',
  system: '[SYSTEM]',
};

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function AgentTerminal({ logs, isLive = false }: AgentTerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (terminalRef.current && isLive) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs, isLive]);

  return (
    <div className="bg-zinc-950 rounded-lg border border-zinc-800 overflow-hidden">
      {/* Terminal header */}
      <div className="flex items-center gap-2 px-4 py-2 bg-zinc-900 border-b border-zinc-800">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500/80" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
          <div className="w-3 h-3 rounded-full bg-green-500/80" />
        </div>
        <span className="text-zinc-500 text-sm font-mono ml-2">aletheia-agent</span>
        {isLive && (
          <span className="ml-auto flex items-center gap-1.5 text-xs text-green-400">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            LIVE
          </span>
        )}
      </div>

      {/* Terminal content */}
      <div
        ref={terminalRef}
        className="p-4 h-[500px] overflow-y-auto font-mono text-sm"
      >
        {logs.length === 0 ? (
          <div className="text-zinc-600 animate-pulse">
            Waiting for agent output...
          </div>
        ) : (
          <div className="space-y-1">
            {logs.map((log) => (
              <div key={log.id} className="flex gap-2">
                <span className="text-zinc-600 shrink-0">
                  {formatTimestamp(log.timestamp)}
                </span>
                <span className={`${LOG_COLORS[log.log_type]} shrink-0`}>
                  {LOG_PREFIXES[log.log_type]}
                </span>
                <span className={LOG_COLORS[log.log_type]}>
                  {log.message}
                </span>
              </div>
            ))}
            {isLive && (
              <div className="flex gap-2 text-zinc-600">
                <span className="animate-pulse">▋</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
