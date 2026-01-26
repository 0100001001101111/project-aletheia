'use client';

/**
 * Agent Terminal Component
 * Displays real-time agent logs in a terminal-like interface
 * Enhanced for Phase 2 with progress tracking and visual indicators
 */

import { useEffect, useRef, useMemo } from 'react';
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

const LOG_BG: Record<LogType, string> = {
  info: '',
  hypothesis: 'bg-purple-500/5',
  test: 'bg-cyan-500/5',
  result: 'bg-green-500/5',
  warning: 'bg-amber-500/5',
  error: 'bg-red-500/10',
  system: 'bg-brand-500/5',
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

// Extract running tally from logs
function extractStats(logs: AgentLog[]): {
  patterns: number;
  tested: number;
  findings: number;
} {
  let patterns = 0;
  let tested = 0;
  let findings = 0;

  for (const log of logs) {
    const msg = log.message.toLowerCase();
    // Look for patterns count
    const patternMatch = log.message.match(/Found (\d+) pattern candidates/);
    if (patternMatch) {
      patterns = parseInt(patternMatch[1]);
    }
    // Count tested hypotheses
    if (msg.includes('hypothesis') && log.log_type === 'hypothesis' && msg.includes('━━━')) {
      tested++;
    }
    // Count findings
    if (msg.includes('finding queued for review')) {
      findings++;
    }
  }

  return { patterns, tested, findings };
}

export function AgentTerminal({ logs, isLive = false }: AgentTerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);

  // Calculate running stats
  const stats = useMemo(() => extractStats(logs), [logs]);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (terminalRef.current && isLive) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs, isLive]);

  // Detect current phase from logs
  const currentPhase = useMemo(() => {
    for (let i = logs.length - 1; i >= 0; i--) {
      const msg = logs[i].message;
      if (msg.includes('PHASE 1')) return 'Data Loading';
      if (msg.includes('PHASE 2')) return 'Pattern Scanning';
      if (msg.includes('PHASE 3')) return 'Hypothesis Testing';
      if (msg.includes('SESSION COMPLETE')) return 'Complete';
    }
    return 'Initializing';
  }, [logs]);

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

      {/* Progress bar (only when live and in progress) */}
      {isLive && logs.length > 0 && currentPhase !== 'Complete' && (
        <div className="px-4 py-2 bg-zinc-900/50 border-b border-zinc-800">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-3">
              <span className="text-zinc-500">Phase:</span>
              <span className="text-brand-400 font-medium">{currentPhase}</span>
            </div>
            <div className="flex items-center gap-4 text-zinc-400">
              <span>
                Patterns:{' '}
                <span className="text-zinc-200">{stats.patterns}</span>
              </span>
              <span>
                Tested:{' '}
                <span className="text-zinc-200">{stats.tested}</span>
              </span>
              <span>
                Findings:{' '}
                <span className={stats.findings > 0 ? 'text-green-400' : 'text-zinc-200'}>
                  {stats.findings}
                </span>
              </span>
            </div>
          </div>
        </div>
      )}

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
          <div className="space-y-0.5">
            {logs.map((log) => {
              // Special styling for section headers
              const isHeader = log.message.includes('═══') || log.message.includes('───');
              const isFindingAlert = log.message.includes('★★★');
              const isEmpty = log.message.trim() === '';

              if (isEmpty) {
                return <div key={log.id} className="h-2" />;
              }

              return (
                <div
                  key={log.id}
                  className={`flex gap-2 py-0.5 px-1 rounded ${LOG_BG[log.log_type]} ${
                    isFindingAlert ? 'bg-green-500/10 py-1 my-1' : ''
                  }`}
                >
                  {!isHeader && (
                    <>
                      <span className="text-zinc-600 shrink-0">
                        {formatTimestamp(log.timestamp)}
                      </span>
                      <span className={`${LOG_COLORS[log.log_type]} shrink-0 w-[100px]`}>
                        {LOG_PREFIXES[log.log_type]}
                      </span>
                    </>
                  )}
                  <span
                    className={`${LOG_COLORS[log.log_type]} ${
                      isHeader ? 'w-full text-center' : ''
                    } ${isFindingAlert ? 'font-bold' : ''}`}
                  >
                    {log.message}
                  </span>
                </div>
              );
            })}
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
