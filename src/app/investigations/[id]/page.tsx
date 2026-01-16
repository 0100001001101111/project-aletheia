'use client';

/**
 * Investigation View Page
 * View a single investigation submission
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SCHEMA_METADATA, flattenToDotNotation, FIELD_DESCRIPTIONS } from '@/schemas';
import { getTriageScoreColor, getTriageStatusColor } from '@/lib/triage';
import { formatFieldName, formatValue as formatVal } from '@/lib/format';
import { InfoTooltip, JARGON_TOOLTIPS } from '@/components/ui/Tooltip';
import type { InvestigationType, TriageStatus } from '@/types/database';

interface Investigation {
  id: string;
  title: string;
  type: InvestigationType;
  raw_data: Record<string, unknown>;
  triage_score: number;
  triage_status: TriageStatus;
  created_at: string;
  updated_at: string;
  submitted_by_user?: {
    id: string;
    display_name: string;
    identity_type: string;
  };
  contributions?: Array<{
    id: string;
    contribution_type: string;
    details: Record<string, unknown>;
    created_at: string;
  }>;
  triage_reviews?: Array<{
    id: string;
    score_override: number | null;
    status_override: TriageStatus | null;
    review_notes: string;
    created_at: string;
  }>;
}

interface PageProps {
  params: { id: string };
}

export default function InvestigationPage({ params }: PageProps) {
  const { id } = params;
  const router = useRouter();
  const [investigation, setInvestigation] = useState<Investigation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchInvestigation() {
      try {
        const response = await fetch(`/api/submissions/${id}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch investigation');
        }

        setInvestigation(data);
      } catch (err) {
        console.error('Fetch error:', err);
        setError(err instanceof Error ? err.message : 'Failed to load investigation');
      } finally {
        setLoading(false);
      }
    }

    fetchInvestigation();
  }, [id]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-500 border-t-transparent" />
          <p className="mt-4 text-zinc-400">Loading investigation...</p>
        </div>
      </div>
    );
  }

  if (error || !investigation) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <div className="max-w-md rounded-xl border border-red-500/30 bg-red-500/10 p-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-500/20">
            <svg className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="mt-6 text-2xl font-bold text-red-400">Error</h2>
          <p className="mt-2 text-red-300/80">{error || 'Investigation not found'}</p>
          <button
            onClick={() => router.back()}
            className="mt-6 rounded-lg border border-zinc-700 bg-zinc-800 px-6 py-3 font-medium text-zinc-300 hover:bg-zinc-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const metadata = SCHEMA_METADATA[investigation.type];
  const fieldDescriptions = FIELD_DESCRIPTIONS[investigation.type];
  const flatData = flattenToDotNotation(investigation.raw_data);
  const scoreColor = getTriageScoreColor(investigation.triage_score);
  const statusColor = getTriageStatusColor(investigation.triage_status);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/50">
        <div className="mx-auto max-w-6xl px-4 py-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3">
                <span className={`text-3xl ${metadata.color}`}>{metadata.icon}</span>
                <div>
                  <h1 className="text-2xl font-bold text-zinc-100">{investigation.title}</h1>
                  <p className="text-zinc-400">{metadata.name}</p>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className={`text-4xl font-bold ${scoreColor}`}>
                {investigation.triage_score}/10
                <InfoTooltip text={JARGON_TOOLTIPS.triage_score} position="left" />
              </div>
              <span className={`mt-1 inline-flex items-center gap-1 rounded-full border px-3 py-1 text-sm capitalize ${statusColor}`}>
                {investigation.triage_status}
                {investigation.triage_status === 'verified' && (
                  <InfoTooltip text={JARGON_TOOLTIPS.verified} position="left" />
                )}
                {investigation.triage_status === 'provisional' && (
                  <InfoTooltip text={JARGON_TOOLTIPS.provisional} position="left" />
                )}
              </span>
            </div>
          </div>

          {/* Metadata */}
          <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-zinc-400">
            <span>
              ID: <code className="rounded bg-zinc-800 px-2 py-0.5 text-xs">{investigation.id}</code>
            </span>
            <span>
              Created: {new Date(investigation.created_at).toLocaleDateString()}
            </span>
            {investigation.submitted_by_user && (
              <span>
                By: {investigation.submitted_by_user.display_name}
                {investigation.submitted_by_user.identity_type !== 'public' && (
                  <span className="ml-1 rounded bg-zinc-800 px-1.5 py-0.5 text-xs">
                    {investigation.submitted_by_user.identity_type}
                  </span>
                )}
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main data panel */}
          <div className="space-y-6 lg:col-span-2">
            <div className="rounded-xl border border-zinc-700 bg-zinc-900/50 p-6">
              <h2 className="text-lg font-semibold text-zinc-100">Investigation Data</h2>

              <div className="mt-4 space-y-4">
                {Object.entries(groupByCategory(flatData)).map(([category, fields]) => (
                  <div key={category}>
                    <h3 className="mb-2 text-sm font-medium uppercase tracking-wide text-zinc-500">
                      {formatFieldName(category)}
                    </h3>
                    <div className="grid gap-2 md:grid-cols-2">
                      {Object.entries(fields).map(([key, value]) => (
                        <div key={key} className="rounded-lg bg-zinc-800/50 p-3">
                          <div className="text-xs text-zinc-500">
                            {fieldDescriptions[key] || formatFieldName(key)}
                          </div>
                          <div className="mt-1 text-sm text-zinc-200">
                            {formatValue(value)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Raw JSON */}
            <details className="rounded-xl border border-zinc-700 bg-zinc-900/50">
              <summary className="cursor-pointer px-6 py-4 font-medium text-zinc-300 hover:text-zinc-100">
                View Raw JSON
              </summary>
              <div className="border-t border-zinc-700 p-4">
                <pre className="max-h-96 overflow-auto rounded-lg bg-zinc-950 p-4 text-xs text-zinc-400">
                  {JSON.stringify(investigation.raw_data, null, 2)}
                </pre>
              </div>
            </details>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Actions */}
            <div className="rounded-xl border border-zinc-700 bg-zinc-900/50 p-4">
              <h3 className="font-medium text-zinc-100">Actions</h3>
              <div className="mt-3 space-y-2">
                <button className="w-full rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500">
                  Edit Submission
                </button>
                <button className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-700">
                  Request Review
                </button>
                <button className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-700">
                  Export Data
                </button>
              </div>
            </div>

            {/* Contributions */}
            {investigation.contributions && investigation.contributions.length > 0 && (
              <div className="rounded-xl border border-zinc-700 bg-zinc-900/50 p-4">
                <h3 className="font-medium text-zinc-100">Contributions</h3>
                <div className="mt-3 space-y-2">
                  {investigation.contributions.map((contrib) => (
                    <div key={contrib.id} className="rounded-lg bg-zinc-800/50 p-3 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="capitalize text-zinc-300">
                          {contrib.contribution_type.replace(/_/g, ' ')}
                        </span>
                        <span className="text-xs text-zinc-500">
                          {new Date(contrib.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Reviews */}
            {investigation.triage_reviews && investigation.triage_reviews.length > 0 && (
              <div className="rounded-xl border border-zinc-700 bg-zinc-900/50 p-4">
                <h3 className="font-medium text-zinc-100">Triage Reviews</h3>
                <div className="mt-3 space-y-2">
                  {investigation.triage_reviews.map((review) => (
                    <div key={review.id} className="rounded-lg bg-zinc-800/50 p-3 text-sm">
                      <div className="flex items-center gap-2">
                        {review.score_override && (
                          <span className="text-violet-400">
                            Score: {review.score_override}/10
                          </span>
                        )}
                        {review.status_override && (
                          <span className="capitalize text-zinc-400">
                            {review.status_override}
                          </span>
                        )}
                      </div>
                      {review.review_notes && (
                        <p className="mt-1 text-xs text-zinc-500">{review.review_notes}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

// Helper to group flat data by category
function groupByCategory(flatData: Record<string, unknown>): Record<string, Record<string, unknown>> {
  const groups: Record<string, Record<string, unknown>> = {};

  for (const [key, value] of Object.entries(flatData)) {
    const category = key.includes('.') ? key.split('.')[0] : 'general';
    if (!groups[category]) groups[category] = {};
    groups[category][key] = value;
  }

  return groups;
}

// Helper to format values for display
function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) return value.join(', ') || '-';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}
