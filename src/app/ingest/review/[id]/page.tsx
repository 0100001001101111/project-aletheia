'use client';

/**
 * Ingest Review Page
 * Shows parsed records with confidence coloring, inline editing, batch approve/reject
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';


interface IngestUpload {
  id: string;
  filename: string;
  schema_type: string;
  status: string;
  total_records: number;
  approved_records: number;
}

interface IngestRecord {
  id: string;
  record_index: number;
  title: string;
  parsed_data: Record<string, unknown>;
  confidence: Record<string, number>;
  validation_errors: string[];
  status: string;
  edited_data: Record<string, unknown> | null;
}

function getConfidenceColor(score: number): string {
  if (score >= 0.8) return 'bg-emerald-500/10 border-emerald-500/30';
  if (score >= 0.5) return 'bg-amber-500/10 border-amber-500/30';
  return 'bg-red-500/10 border-red-500/30';
}

function getConfidenceTextColor(score: number): string {
  if (score >= 0.8) return 'text-emerald-400';
  if (score >= 0.5) return 'text-amber-400';
  return 'text-red-400';
}

function getStatusBadge(status: string) {
  const styles: Record<string, string> = {
    pending: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    approved: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    rejected: 'bg-red-500/10 text-red-400 border-red-500/30',
    edited: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  };
  return styles[status] || styles.pending;
}

function averageConfidence(confidence: Record<string, number>): number {
  const values = Object.values(confidence);
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function flattenObject(
  obj: Record<string, unknown>,
  prefix = ''
): Array<{ key: string; value: unknown }> {
  const result: Array<{ key: string; value: unknown }> = [];
  for (const [k, v] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      result.push(...flattenObject(v as Record<string, unknown>, fullKey));
    } else {
      result.push({ key: fullKey, value: v });
    }
  }
  return result;
}

export default function ReviewPage() {
  const params = useParams();
  const router = useRouter();
  const uploadId = params.id as string;

  const [upload, setUpload] = useState<IngestUpload | null>(null);
  const [records, setRecords] = useState<IngestRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<{ recordId: string; key: string } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [approving, setApproving] = useState(false);
  const [approveResult, setApproveResult] = useState<{
    inserted: number;
    failed: number;
    errors: Array<{ recordId: string; title: string; errors: string[] }>;
  } | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/ingest/records?upload_id=${uploadId}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to load');
        return;
      }
      setUpload(data.upload);
      setRecords(data.records);
    } catch {
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [uploadId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const updateRecordStatus = async (recordId: string, status: string) => {
    const res = await fetch('/api/ingest/records', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recordId, status }),
    });
    if (res.ok) {
      setRecords((prev) =>
        prev.map((r) => (r.id === recordId ? { ...r, status } : r))
      );
    }
  };

  const saveFieldEdit = async (recordId: string, fieldKey: string, newValue: string) => {
    const record = records.find((r) => r.id === recordId);
    if (!record) return;

    const currentData = record.edited_data ?? { ...record.parsed_data };
    // Set nested value
    const parts = fieldKey.split('.');
    let current = currentData;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!current[parts[i]] || typeof current[parts[i]] !== 'object') {
        current[parts[i]] = {};
      }
      current = current[parts[i]] as Record<string, unknown>;
    }

    // Try to parse as number or boolean, fallback to string
    let parsed: unknown = newValue;
    if (newValue === 'true') parsed = true;
    else if (newValue === 'false') parsed = false;
    else if (newValue === 'null') parsed = null;
    else if (!isNaN(Number(newValue)) && newValue.trim() !== '') parsed = Number(newValue);

    current[parts[parts.length - 1]] = parsed;

    const res = await fetch('/api/ingest/records', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recordId, editedData: currentData, status: 'edited' }),
    });

    if (res.ok) {
      setRecords((prev) =>
        prev.map((r) =>
          r.id === recordId ? { ...r, edited_data: currentData, status: 'edited' } : r,
        )
      );
    }
    setEditingField(null);
  };

  const handleBatchStatus = async (newStatus: string) => {
    const pendingRecords = records.filter((r) => r.status === 'pending');
    for (const rec of pendingRecords) {
      await updateRecordStatus(rec.id, newStatus);
    }
  };

  const handleApprove = async () => {
    const toApprove = records.filter(
      (r) => r.status === 'approved' || r.status === 'edited' || r.status === 'pending'
    );
    const approvedIds = toApprove
      .filter((r) => r.status === 'approved' || r.status === 'edited')
      .map((r) => r.id);

    if (approvedIds.length === 0) {
      setError('No records marked as approved. Approve individual records first.');
      return;
    }

    setApproving(true);
    setError(null);

    try {
      const res = await fetch('/api/ingest/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uploadId, recordIds: approvedIds }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Approval failed');
        return;
      }

      setApproveResult(data);
      // Refresh records
      await fetchData();
    } catch {
      setError('Network error during approval');
    } finally {
      setApproving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-500 border-t-transparent" />
          <p className="mt-4 text-zinc-400">Loading records...</p>
        </div>
      </div>
    );
  }

  if (error && !upload) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <p className="text-red-400">{error}</p>
      </div>
    );
  }

  const pendingCount = records.filter((r) => r.status === 'pending').length;
  const approvedCount = records.filter((r) => r.status === 'approved' || r.status === 'edited').length;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 px-4 py-8">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/ingest')}
            className="mb-4 text-sm text-zinc-500 hover:text-zinc-300"
          >
            &larr; Back to upload
          </button>
          <h1 className="text-2xl font-bold">{upload?.filename}</h1>
          <div className="mt-2 flex flex-wrap gap-3 text-sm text-zinc-400">
            <span>Type: <span className="text-zinc-200">{upload?.schema_type}</span></span>
            <span>Records: <span className="text-zinc-200">{records.length}</span></span>
            <span>Status: <span className="text-zinc-200">{upload?.status}</span></span>
          </div>
        </div>

        {/* Batch actions */}
        <div className="mb-4 flex flex-wrap gap-2">
          <button
            onClick={() => handleBatchStatus('approved')}
            disabled={pendingCount === 0}
            className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-sm text-emerald-400 hover:bg-emerald-500/20 disabled:opacity-40"
          >
            Approve All Pending ({pendingCount})
          </button>
          <button
            onClick={() => handleBatchStatus('rejected')}
            disabled={pendingCount === 0}
            className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-sm text-red-400 hover:bg-red-500/20 disabled:opacity-40"
          >
            Reject All Pending
          </button>
          <button
            onClick={handleApprove}
            disabled={approvedCount === 0 || approving}
            className="ml-auto rounded-lg bg-violet-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-40"
          >
            {approving ? 'Writing to DB...' : `Submit ${approvedCount} to Investigations`}
          </button>
        </div>

        {/* Approve result */}
        {approveResult && (
          <div className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm">
            <p className="text-emerald-400 font-medium">
              {approveResult.inserted} record(s) written to investigations
              {approveResult.failed > 0 && (
                <span className="text-red-400 ml-2">
                  ({approveResult.failed} failed)
                </span>
              )}
            </p>
            {approveResult.errors.map((err, i) => (
              <p key={i} className="mt-1 text-red-400 text-xs">
                {err.title}: {err.errors.join(', ')}
              </p>
            ))}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Record list */}
        <div className="space-y-3">
          {records.map((record) => {
            const isExpanded = expandedId === record.id;
            const avgConf = averageConfidence(record.confidence);
            const displayData = record.edited_data ?? record.parsed_data;
            const fields = flattenObject(displayData as Record<string, unknown>);

            return (
              <div
                key={record.id}
                className="rounded-xl border border-zinc-800 bg-zinc-900/50"
              >
                {/* Record header */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : record.id)}
                  className="flex w-full items-center justify-between px-4 py-3 text-left"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-zinc-100">
                      {record.title || `Record ${record.record_index + 1}`}
                    </span>
                    <span className={`rounded-full border px-2 py-0.5 text-xs ${getStatusBadge(record.status)}`}>
                      {record.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs ${getConfidenceTextColor(avgConf)}`}>
                      {(avgConf * 100).toFixed(0)}% confidence
                    </span>
                    <svg
                      className={`h-4 w-4 text-zinc-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>

                {/* Expanded detail panel */}
                {isExpanded && (
                  <div className="border-t border-zinc-800 px-4 py-3">
                    {/* Fields */}
                    <div className="space-y-1.5">
                      {fields.map(({ key, value }) => {
                        const conf = record.confidence[key];
                        const confScore = typeof conf === 'number' ? conf : 0.5;
                        const isEditing = editingField?.recordId === record.id && editingField?.key === key;

                        return (
                          <div
                            key={key}
                            className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-sm ${getConfidenceColor(confScore)}`}
                          >
                            <span className="min-w-[140px] shrink-0 text-zinc-400 font-mono text-xs">
                              {key}
                            </span>
                            {isEditing ? (
                              <div className="flex flex-1 gap-2">
                                <input
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') saveFieldEdit(record.id, key, editValue);
                                    if (e.key === 'Escape') setEditingField(null);
                                  }}
                                  className="flex-1 rounded bg-zinc-800 border border-zinc-600 px-2 py-0.5 text-sm text-zinc-100 focus:outline-none focus:border-violet-500"
                                  autoFocus
                                />
                                <button
                                  onClick={() => saveFieldEdit(record.id, key, editValue)}
                                  className="text-xs text-emerald-400 hover:text-emerald-300"
                                >
                                  Save
                                </button>
                                <button
                                  onClick={() => setEditingField(null)}
                                  className="text-xs text-zinc-500 hover:text-zinc-300"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <span
                                onClick={() => {
                                  setEditingField({ recordId: record.id, key });
                                  setEditValue(value == null ? '' : String(value));
                                }}
                                className="flex-1 cursor-pointer text-zinc-200 hover:text-white"
                                title="Click to edit"
                              >
                                {value == null ? (
                                  <span className="text-zinc-600 italic">null</span>
                                ) : Array.isArray(value) ? (
                                  value.join(', ')
                                ) : (
                                  String(value)
                                )}
                              </span>
                            )}
                            {typeof conf === 'number' && (
                              <span className={`shrink-0 text-xs ${getConfidenceTextColor(conf)}`}>
                                {(conf * 100).toFixed(0)}%
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Validation errors */}
                    {record.validation_errors?.length > 0 && (
                      <div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2">
                        <p className="text-xs font-medium text-amber-400 mb-1">Validation notes:</p>
                        {record.validation_errors.map((err, i) => (
                          <p key={i} className="text-xs text-amber-300">{err}</p>
                        ))}
                      </div>
                    )}

                    {/* Record actions */}
                    <div className="mt-3 flex gap-2">
                      {record.status !== 'approved' && (
                        <button
                          onClick={() => updateRecordStatus(record.id, 'approved')}
                          className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs text-emerald-400 hover:bg-emerald-500/20"
                        >
                          Approve
                        </button>
                      )}
                      {record.status !== 'rejected' && (
                        <button
                          onClick={() => updateRecordStatus(record.id, 'rejected')}
                          className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/20"
                        >
                          Reject
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
