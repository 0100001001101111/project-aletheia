'use client';

/**
 * Mechanism Agent Page
 * Shows agent description and live findings feed
 */

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Navigation } from '@/components/layout/Navigation';

interface AgentFinding {
  id: string;
  title: string;
  display_title?: string;
  summary?: string;
  confidence: number;
  review_status: string;
  created_at: string;
}

function getRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function getConfidenceColor(confidence: number): string {
  if (confidence >= 0.8) return 'text-green-400';
  if (confidence >= 0.6) return 'text-amber-400';
  return 'text-zinc-400';
}

export default function MechanismPage() {
  const [findings, setFindings] = useState<AgentFinding[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFindings = useCallback(async () => {
    try {
      const res = await fetch('/api/agent/findings?agent_id=mechanism&limit=20');
      if (res.ok) {
        const data = await res.json();
        setFindings(data.findings || []);
      }
    } catch (err) {
      console.error('Error fetching findings:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFindings();
    const interval = setInterval(fetchFindings, 30000);
    return () => clearInterval(interval);
  }, [fetchFindings]);

  const pendingCount = findings.filter(f => f.review_status === 'pending').length;

  return (
    <div className="min-h-screen bg-zinc-950">
      <Navigation />

      <main className="pt-20 pb-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Back Link */}
          <Link
            href="/agent"
            className="text-zinc-500 hover:text-zinc-300 text-sm mb-4 inline-block"
          >
            ← Back to Agent Hub
          </Link>

          {/* Agent Header */}
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-emerald-600 to-green-600 flex items-center justify-center text-3xl">
                ⚙️
              </div>
              <div>
                <h1 className="text-2xl font-bold text-zinc-100">Mechanism</h1>
                <p className="text-emerald-400 font-medium">Theory Testing</p>
              </div>
              <span className="ml-auto px-3 py-1 bg-green-500/20 text-green-400 text-sm font-medium rounded-full flex items-center gap-2">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                Active
              </span>
            </div>
            <p className="text-zinc-400 leading-relaxed">
              Mechanism catalogs proposed explanatory mechanisms for each domain
              (e.g., NDE: anoxia, REM intrusion, temporal lobe activity; UFO: misidentification,
              plasma phenomena). It designs discriminating tests between competing theories
              and builds unified cross-domain theories with parsimony scoring.
            </p>
          </div>

          {/* Capabilities */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl">
              <div className="text-2xl mb-2">📚</div>
              <div className="text-sm font-medium text-zinc-200">Mechanism Catalog</div>
              <div className="text-xs text-zinc-500">Per-domain theories</div>
            </div>
            <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl">
              <div className="text-2xl mb-2">🧪</div>
              <div className="text-sm font-medium text-zinc-200">Test Designer</div>
              <div className="text-xs text-zinc-500">Discriminating tests</div>
            </div>
            <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl">
              <div className="text-2xl mb-2">🏗️</div>
              <div className="text-sm font-medium text-zinc-200">Theory Builder</div>
              <div className="text-xs text-zinc-500">Unified explanations</div>
            </div>
            <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl">
              <div className="text-2xl mb-2">⚖️</div>
              <div className="text-sm font-medium text-zinc-200">Parsimony Scorer</div>
              <div className="text-xs text-zinc-500">Simplicity ranking</div>
            </div>
          </div>

          {/* Stats */}
          <div className="flex gap-4 mb-6">
            <div className="px-4 py-2 bg-zinc-900/50 border border-zinc-800 rounded-lg">
              <span className="text-xl font-bold text-emerald-400">{findings.length}</span>
              <span className="text-sm text-zinc-500 ml-2">Findings</span>
            </div>
            <div className="px-4 py-2 bg-zinc-900/50 border border-zinc-800 rounded-lg">
              <span className="text-xl font-bold text-emerald-400">{pendingCount}</span>
              <span className="text-sm text-zinc-500 ml-2">Pending Review</span>
            </div>
          </div>

          {/* Findings Feed */}
          <div>
            <h2 className="text-lg font-semibold text-zinc-100 mb-4">Recent Findings</h2>

            {loading ? (
              <div className="flex items-center justify-center h-48 bg-zinc-900/50 border border-zinc-800 rounded-xl">
                <div className="text-center">
                  <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-zinc-500">Loading findings...</p>
                </div>
              </div>
            ) : findings.length > 0 ? (
              <div className="space-y-3">
                {findings.map((finding) => (
                  <Link
                    key={finding.id}
                    href={`/agent/review/${finding.id}`}
                    className="block p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl hover:border-emerald-500/30 hover:bg-zinc-900 transition-all"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-zinc-100 truncate">
                          {finding.display_title || finding.title}
                        </h3>
                        {finding.summary && (
                          <p className="text-sm text-zinc-500 mt-1 line-clamp-2">
                            {finding.summary}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <span className={`text-sm font-medium ${getConfidenceColor(finding.confidence)}`}>
                          {Math.round(finding.confidence * 100)}%
                        </span>
                        <span className="text-xs text-zinc-600">
                          {getRelativeTime(finding.created_at)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`px-2 py-0.5 text-xs rounded-full ${
                        finding.review_status === 'pending'
                          ? 'bg-amber-500/20 text-amber-400'
                          : finding.review_status === 'approved'
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-zinc-700 text-zinc-400'
                      }`}>
                        {finding.review_status}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-48 bg-zinc-900/50 border border-zinc-800 rounded-xl">
                <div className="text-center">
                  <span className="text-4xl mb-3 block">⚙️</span>
                  <p className="text-zinc-400">Mechanism is testing theories...</p>
                  <p className="text-sm text-zinc-600 mt-1">Findings will appear here</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
