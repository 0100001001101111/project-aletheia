'use client';

/**
 * Investigation Edit Page
 * Edit an existing investigation submission
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { SCHEMA_METADATA } from '@/schemas';
import type { InvestigationType, TriageStatus } from '@/types/database';

interface Investigation {
  id: string;
  title: string;
  description?: string;
  type: InvestigationType;
  raw_data: Record<string, unknown>;
  triage_score: number;
  triage_status: TriageStatus;
  submitted_by?: string;
}

interface PageProps {
  params: { id: string };
}

export default function EditInvestigationPage({ params }: PageProps) {
  const { id } = params;
  const router = useRouter();
  const [investigation, setInvestigation] = useState<Investigation | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [rawData, setRawData] = useState<Record<string, unknown>>({});
  const [jsonEditorValue, setJsonEditorValue] = useState('');
  const [jsonError, setJsonError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchInvestigation() {
      try {
        const response = await fetch(`/api/submissions/${id}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch investigation');
        }

        setInvestigation(data);
        setTitle(data.title || '');
        setDescription(data.description || '');
        setRawData(data.raw_data || {});
        setJsonEditorValue(JSON.stringify(data.raw_data || {}, null, 2));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load investigation');
      } finally {
        setLoading(false);
      }
    }

    fetchInvestigation();
  }, [id]);

  const handleJsonChange = (value: string) => {
    setJsonEditorValue(value);
    try {
      const parsed = JSON.parse(value);
      setRawData(parsed);
      setJsonError(null);
    } catch {
      setJsonError('Invalid JSON');
    }
  };

  const handleSave = async () => {
    if (jsonError) {
      setError('Please fix JSON errors before saving');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/submissions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          raw_data: rawData,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save changes');
      }

      router.push(`/investigations/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <PageWrapper>
        <div className="flex items-center justify-center py-24">
          <div className="text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-500 border-t-transparent" />
            <p className="mt-4 text-zinc-400">Loading investigation...</p>
          </div>
        </div>
      </PageWrapper>
    );
  }

  if (!investigation) {
    return (
      <PageWrapper>
        <div className="max-w-2xl mx-auto py-12">
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-8 text-center">
            <h2 className="text-xl font-bold text-red-400">Investigation Not Found</h2>
            <p className="mt-2 text-red-300/80">{error}</p>
            <button
              onClick={() => router.back()}
              className="mt-6 rounded-lg border border-zinc-700 bg-zinc-800 px-6 py-2 text-zinc-300 hover:bg-zinc-700"
            >
              Go Back
            </button>
          </div>
        </div>
      </PageWrapper>
    );
  }

  const metadata = SCHEMA_METADATA[investigation.type];

  return (
    <PageWrapper>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200 mb-4"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <div className="flex items-center gap-3">
            <span className="text-3xl">{metadata?.icon || '?'}</span>
            <div>
              <h1 className="text-2xl font-bold text-zinc-100">Edit Investigation</h1>
              <p className="text-zinc-400">{metadata?.name || investigation.type}</p>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Edit Form */}
        <div className="space-y-6">
          {/* Basic Info */}
          <div className="rounded-xl border border-zinc-700 bg-zinc-900/50 p-6">
            <h2 className="text-lg font-semibold text-zinc-100 mb-4">Basic Information</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-zinc-100 focus:border-violet-500 focus:outline-none"
                  placeholder="Investigation title..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-zinc-100 focus:border-violet-500 focus:outline-none resize-none"
                  placeholder="Brief description of the investigation..."
                />
              </div>
            </div>
          </div>

          {/* Raw Data Editor */}
          <div className="rounded-xl border border-zinc-700 bg-zinc-900/50 p-6">
            <h2 className="text-lg font-semibold text-zinc-100 mb-4">Investigation Data</h2>
            <p className="text-sm text-zinc-400 mb-4">
              Edit the raw JSON data for this investigation. Be careful to maintain valid JSON format.
            </p>

            {jsonError && (
              <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-400">
                {jsonError}
              </div>
            )}

            <textarea
              value={jsonEditorValue}
              onChange={(e) => handleJsonChange(e.target.value)}
              rows={20}
              className={`w-full rounded-lg border bg-zinc-950 px-4 py-3 font-mono text-sm text-zinc-300 focus:outline-none ${
                jsonError ? 'border-amber-500' : 'border-zinc-700 focus:border-violet-500'
              }`}
              spellCheck={false}
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-zinc-700">
            <button
              onClick={() => router.back()}
              className="px-6 py-2 rounded-lg border border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !!jsonError}
              className="px-6 py-2 rounded-lg bg-violet-600 text-white font-medium hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
