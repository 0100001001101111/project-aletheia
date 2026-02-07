'use client';

/**
 * Finding Detail Page
 * Full view of an agent finding with evidence and review actions
 */

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { useAuth } from '@/contexts/AuthContext';
import { AuthModal } from '@/components/auth/AuthModal';

interface TestResult {
  test_type: string;
  statistic: number;
  p_value: number;
  effect_size: number;
  sample_size: number;
  passed_threshold: boolean;
  interpretation: string;
}

interface ConfoundCheck {
  confound_type: string;
  controlled: boolean;
  effect_survived: boolean;
  notes: string;
  stratified_results?: Record<string, unknown>;
}

interface Finding {
  id: string;
  title: string;
  display_title: string;
  summary: string;
  confidence: number | null;
  review_status: string | null;
  destination_status: string | null;
  review_notes: string | null;
  suggested_prediction: string | null;
  created_at: string | null;
  reviewed_at: string | null;
  created_prediction_id: string | null;
  domains: string[];
  test_results: TestResult[];
  confound_checks: ConfoundCheck[];
  holdout_validation: TestResult | null;
  source_pattern: Record<string, unknown> | null;
  hypothesis: {
    id: string;
    hypothesis_text: string;
    display_title: string;
    domains: string[];
    source_pattern: Record<string, unknown>;
  } | null;
  session: {
    id: string;
    started_at: string;
    ended_at: string;
    status: string;
  } | null;
}

type ModalType = 'approve' | 'reject' | 'request-info' | null;

const REJECTION_REASONS = [
  { value: 'methodological_flaw', label: 'Methodological flaw' },
  { value: 'already_known', label: 'Already known/studied' },
  { value: 'not_actionable', label: 'Not actionable' },
  { value: 'insufficient_evidence', label: 'Insufficient evidence' },
  { value: 'other', label: 'Other' },
];

const REQUESTED_CHECKS = [
  { value: 'additional_confounds', label: 'Run additional confound checks' },
  { value: 'different_statistical_method', label: 'Test with different statistical method' },
  { value: 'prior_research', label: 'Search for prior research' },
  { value: 'additional_data', label: 'Acquire additional data' },
  { value: 'subcategory_breakdown', label: 'Break down by subcategory' },
];

export default function FindingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [finding, setFinding] = useState<Finding | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Form states
  const [approveForm, setApproveForm] = useState({
    title: '',
    hypothesis: '',
    protocol: '',
  });
  const [rejectForm, setRejectForm] = useState({
    reason: '' as string,
    notes: '',
  });
  const [requestInfoForm, setRequestInfoForm] = useState({
    notes: '',
    checks: [] as string[],
  });

  // Expanded sections
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['tests', 'confounds']));

  const fetchFinding = useCallback(async () => {
    if (!params.id) return;

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/agent/findings/${params.id}`);
      if (!res.ok) {
        if (res.status === 404) throw new Error('Finding not found');
        throw new Error('Failed to fetch finding');
      }

      const data = await res.json();
      setFinding(data.finding);

      // Pre-fill approve form
      if (data.finding) {
        setApproveForm({
          title: data.finding.display_title || '',
          hypothesis: data.finding.title || '',
          protocol: data.finding.suggested_prediction || '',
        });
      }
    } catch (err) {
      console.error('Error fetching finding:', err);
      setError(err instanceof Error ? err.message : 'Failed to load finding');
    } finally {
      setIsLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    fetchFinding();
  }, [fetchFinding]);

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  const handleAction = (action: ModalType) => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    setActiveModal(action);
  };

  const handleApprove = async () => {
    if (!finding) return;
    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/agent/findings/${finding.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prediction_title: approveForm.title,
          prediction_hypothesis: approveForm.hypothesis,
          prediction_protocol: approveForm.protocol,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to approve');
      }

      const data = await res.json();
      setActiveModal(null);

      // Redirect to new prediction
      router.push(`/predictions/${data.prediction_id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve finding');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!finding || !rejectForm.reason) return;
    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/agent/findings/${finding.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: rejectForm.reason,
          notes: rejectForm.notes,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to reject');
      }

      setActiveModal(null);
      fetchFinding(); // Refresh to show updated status
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject finding');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRequestInfo = async () => {
    if (!finding || !requestInfoForm.notes) return;
    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/agent/findings/${finding.id}/request-info`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notes: requestInfoForm.notes,
          requested_checks: requestInfoForm.checks,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to request info');
      }

      setActiveModal(null);
      fetchFinding(); // Refresh to show updated status
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to request info');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <PageWrapper title="Loading...">
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
        </div>
      </PageWrapper>
    );
  }

  if (error || !finding) {
    return (
      <PageWrapper title="Error">
        <div className="py-12 text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h3 className="text-xl font-medium text-zinc-300 mb-2">{error || 'Finding not found'}</h3>
          <Link
            href="/agent/review"
            className="inline-block mt-6 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-sm font-medium transition-colors"
          >
            ← Back to Review Queue
          </Link>
        </div>
      </PageWrapper>
    );
  }

  const confidencePercent = Math.round((finding.confidence ?? 0) * 100);
  // Use destination_status for determining actual state (Telegram sets destination_status, not review_status)
  const isPending = finding.destination_status !== 'published' && finding.destination_status !== 'rejected';
  const isApproved = finding.destination_status === 'published';
  const isRejected = finding.destination_status === 'rejected';

  return (
    <PageWrapper
      title={finding.display_title}
      description={`Confidence: ${confidencePercent}%`}
      headerAction={
        user ? (
          <Link
            href="/agent/review"
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-sm font-medium transition-colors"
          >
            ← Back to Queue
          </Link>
        ) : (
          <Link
            href="/agent"
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-sm font-medium transition-colors"
          >
            ← Back to Agents
          </Link>
        )
      }
    >
      {/* Status banner */}
      {isApproved && finding.created_prediction_id && (
        <div className="mb-6 p-4 bg-emerald-900/20 border border-emerald-500/30 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-emerald-400">
              ✓ Approved and converted to prediction
            </span>
            <Link
              href={`/predictions/${finding.created_prediction_id}`}
              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-sm font-medium transition-colors"
            >
              View Prediction →
            </Link>
          </div>
        </div>
      )}

      {isRejected && (
        <div className="mb-6 p-4 bg-red-900/20 border border-red-500/30 rounded-lg">
          <span className="text-red-400">✗ Rejected</span>
          {finding.review_notes && (
            <p className="mt-2 text-sm text-zinc-400">{finding.review_notes}</p>
          )}
        </div>
      )}

      {finding.review_status === 'needs_info' && (
        <div className="mb-6 p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg">
          <span className="text-blue-400">ℹ Awaiting additional analysis</span>
          {finding.review_notes && (
            <p className="mt-2 text-sm text-zinc-400">{finding.review_notes}</p>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Summary section */}
          <section className="p-6 bg-zinc-900/50 border border-zinc-800 rounded-lg">
            <h2 className="text-lg font-semibold text-zinc-100 mb-4">Summary</h2>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-zinc-500 uppercase tracking-wider">Technical Hypothesis</label>
                <div className="mt-1 text-zinc-300 prose prose-invert prose-sm max-w-none">
                  <ReactMarkdown>{finding.title}</ReactMarkdown>
                </div>
              </div>

              <div>
                <label className="text-xs text-zinc-500 uppercase tracking-wider">Finding Summary</label>
                <div className="mt-1 text-zinc-400 prose prose-invert prose-sm max-w-none prose-headings:text-zinc-200 prose-strong:text-zinc-200 prose-code:bg-zinc-800 prose-code:px-1 prose-code:rounded prose-pre:bg-zinc-800/50">
                  <ReactMarkdown>{finding.summary}</ReactMarkdown>
                </div>
              </div>

              {finding.suggested_prediction && (
                <div>
                  <label className="text-xs text-zinc-500 uppercase tracking-wider">Suggested Prediction</label>
                  <div className="mt-1 text-zinc-300 italic prose prose-invert prose-sm max-w-none">
                    <ReactMarkdown>{finding.suggested_prediction}</ReactMarkdown>
                  </div>
                </div>
              )}

              {/* Domains */}
              {finding.domains.length > 0 && (
                <div>
                  <label className="text-xs text-zinc-500 uppercase tracking-wider">Domains Involved</label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {finding.domains.map((domain) => (
                      <span key={domain} className="px-2 py-1 bg-zinc-800 text-zinc-300 rounded text-sm">
                        {domain}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Statistical Tests */}
          <section className="bg-zinc-900/50 border border-zinc-800 rounded-lg overflow-hidden">
            <button
              onClick={() => toggleSection('tests')}
              className="w-full p-4 flex items-center justify-between text-left hover:bg-zinc-800/50 transition-colors"
            >
              <h2 className="text-lg font-semibold text-zinc-100">Statistical Tests</h2>
              <span className="text-zinc-500">{expandedSections.has('tests') ? '−' : '+'}</span>
            </button>

            {expandedSections.has('tests') && (
              <div className="p-4 pt-0 space-y-4">
                {finding.test_results.map((test, i) => (
                  <div key={i} className="p-4 bg-zinc-800/50 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-medium text-zinc-200">{test.test_type}</span>
                      <span className={`px-2 py-0.5 text-xs rounded ${
                        test.passed_threshold
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-red-500/20 text-red-400'
                      }`}>
                        {test.passed_threshold ? 'PASSED' : 'FAILED'}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-zinc-500">p-value:</span>
                        <span className="ml-2 text-zinc-300">{test.p_value.toFixed(4)}</span>
                      </div>
                      <div>
                        <span className="text-zinc-500">Effect size:</span>
                        <span className="ml-2 text-zinc-300">{test.effect_size.toFixed(3)}</span>
                      </div>
                      <div>
                        <span className="text-zinc-500">Statistic:</span>
                        <span className="ml-2 text-zinc-300">{test.statistic.toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="text-zinc-500">Sample size:</span>
                        <span className="ml-2 text-zinc-300">{test.sample_size}</span>
                      </div>
                    </div>
                    {test.interpretation && (
                      <p className="mt-3 text-sm text-zinc-400">{test.interpretation}</p>
                    )}
                  </div>
                ))}

                {/* Holdout validation */}
                {finding.holdout_validation && (
                  <div className="p-4 bg-zinc-800/50 rounded-lg border-l-4 border-brand-500">
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-medium text-zinc-200">Holdout Validation (20%)</span>
                      <span className={`px-2 py-0.5 text-xs rounded ${
                        finding.holdout_validation.passed_threshold
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-red-500/20 text-red-400'
                      }`}>
                        {finding.holdout_validation.passed_threshold ? 'REPLICATED' : 'FAILED'}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-zinc-500">p-value:</span>
                        <span className="ml-2 text-zinc-300">{finding.holdout_validation.p_value.toFixed(4)}</span>
                      </div>
                      <div>
                        <span className="text-zinc-500">Effect size:</span>
                        <span className="ml-2 text-zinc-300">{finding.holdout_validation.effect_size.toFixed(3)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Confound Checks */}
          <section className="bg-zinc-900/50 border border-zinc-800 rounded-lg overflow-hidden">
            <button
              onClick={() => toggleSection('confounds')}
              className="w-full p-4 flex items-center justify-between text-left hover:bg-zinc-800/50 transition-colors"
            >
              <h2 className="text-lg font-semibold text-zinc-100">Confound Checks</h2>
              <span className="text-zinc-500">{expandedSections.has('confounds') ? '−' : '+'}</span>
            </button>

            {expandedSections.has('confounds') && (
              <div className="p-4 pt-0 space-y-3">
                {finding.confound_checks.map((check, i) => (
                  <div key={i} className="p-3 bg-zinc-800/50 rounded-lg flex items-start gap-3">
                    <span className={`mt-0.5 text-lg ${
                      !check.controlled ? '⚪' :
                      check.effect_survived ? '✅' : '❌'
                    }`}>
                      {!check.controlled ? '⚪' : check.effect_survived ? '✅' : '❌'}
                    </span>
                    <div>
                      <span className="font-medium text-zinc-200 capitalize">
                        {check.confound_type.replace(/_/g, ' ')}
                      </span>
                      <p className="text-sm text-zinc-400">{check.notes}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Source Pattern */}
          {finding.source_pattern && (
            <section className="bg-zinc-900/50 border border-zinc-800 rounded-lg overflow-hidden">
              <button
                onClick={() => toggleSection('pattern')}
                className="w-full p-4 flex items-center justify-between text-left hover:bg-zinc-800/50 transition-colors"
              >
                <h2 className="text-lg font-semibold text-zinc-100">Source Pattern</h2>
                <span className="text-zinc-500">{expandedSections.has('pattern') ? '−' : '+'}</span>
              </button>

              {expandedSections.has('pattern') && (
                <div className="p-4 pt-0">
                  <pre className="p-3 bg-zinc-800/50 rounded-lg text-xs text-zinc-400 overflow-x-auto">
                    {JSON.stringify(finding.source_pattern, null, 2)}
                  </pre>
                </div>
              )}
            </section>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Confidence */}
          <div className="p-6 bg-zinc-900/50 border border-zinc-800 rounded-lg">
            <h3 className="text-sm font-medium text-zinc-400 mb-3">Confidence Score</h3>
            <div className="text-4xl font-bold text-zinc-100 mb-3">{confidencePercent}%</div>
            <div className="w-full h-3 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  confidencePercent >= 70 ? 'bg-emerald-500' :
                  confidencePercent >= 40 ? 'bg-amber-500' :
                  'bg-red-500'
                }`}
                style={{ width: `${confidencePercent}%` }}
              />
            </div>
          </div>

          {/* Review Actions - Admin only */}
          {user && isPending && (
            <div className="p-6 bg-zinc-900/50 border border-zinc-800 rounded-lg">
              <h3 className="text-sm font-medium text-zinc-400 mb-4">Review Actions</h3>
              <div className="space-y-3">
                <button
                  onClick={() => handleAction('approve')}
                  className="w-full px-4 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium transition-colors"
                >
                  ✓ Approve
                </button>
                <button
                  onClick={() => handleAction('reject')}
                  className="w-full px-4 py-3 bg-red-600 hover:bg-red-500 text-white rounded-lg font-medium transition-colors"
                >
                  ✗ Reject
                </button>
                <button
                  onClick={() => handleAction('request-info')}
                  className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors"
                >
                  ℹ Request More Info
                </button>
              </div>
            </div>
          )}

          {/* Metadata */}
          <div className="p-6 bg-zinc-900/50 border border-zinc-800 rounded-lg text-sm">
            <h3 className="text-sm font-medium text-zinc-400 mb-3">Details</h3>
            <div className="space-y-2">
              {/* Only show status to admins, or show "Published" for public */}
              {(user || isApproved) && (
                <div className="flex justify-between">
                  <span className="text-zinc-500">Status:</span>
                  <span className="text-zinc-300 capitalize">{isApproved ? 'published' : finding.review_status || 'pending'}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-zinc-500">Found:</span>
                <span className="text-zinc-300">
                  {finding.created_at ? new Date(finding.created_at).toLocaleDateString() : 'Unknown'}
                </span>
              </div>
              {finding.session && (
                <div className="flex justify-between">
                  <span className="text-zinc-500">Session:</span>
                  <Link
                    href={`/agent?session=${finding.session.id}`}
                    className="text-brand-400 hover:text-brand-300"
                  >
                    View →
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Approve Modal */}
      {activeModal === 'approve' && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-xl font-semibold text-zinc-100 mb-4">Approve Finding</h3>
              <p className="text-zinc-400 mb-6">
                This will create a new prediction from this finding. You can edit the details below.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1">
                    Prediction Title
                  </label>
                  <input
                    type="text"
                    value={approveForm.title}
                    onChange={(e) => setApproveForm((f) => ({ ...f, title: e.target.value }))}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 focus:outline-none focus:border-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1">
                    Hypothesis
                  </label>
                  <textarea
                    value={approveForm.hypothesis}
                    onChange={(e) => setApproveForm((f) => ({ ...f, hypothesis: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 focus:outline-none focus:border-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1">
                    Testing Protocol
                  </label>
                  <textarea
                    value={approveForm.protocol}
                    onChange={(e) => setApproveForm((f) => ({ ...f, protocol: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setActiveModal(null)}
                  className="flex-1 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleApprove}
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Creating...' : 'Create Prediction'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {activeModal === 'reject' && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl max-w-lg w-full">
            <div className="p-6">
              <h3 className="text-xl font-semibold text-zinc-100 mb-4">Reject Finding</h3>
              <p className="text-zinc-400 mb-6">
                Please provide a reason for rejecting this finding.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Rejection Reason
                  </label>
                  <div className="space-y-2">
                    {REJECTION_REASONS.map((reason) => (
                      <label
                        key={reason.value}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <input
                          type="radio"
                          name="rejection_reason"
                          value={reason.value}
                          checked={rejectForm.reason === reason.value}
                          onChange={(e) => setRejectForm((f) => ({ ...f, reason: e.target.value }))}
                          className="text-brand-500"
                        />
                        <span className="text-zinc-300">{reason.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1">
                    Notes {rejectForm.reason === 'other' && <span className="text-red-400">*</span>}
                  </label>
                  <textarea
                    value={rejectForm.notes}
                    onChange={(e) => setRejectForm((f) => ({ ...f, notes: e.target.value }))}
                    rows={3}
                    placeholder="Additional notes..."
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setActiveModal(null)}
                  className="flex-1 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReject}
                  disabled={isSubmitting || !rejectForm.reason || (rejectForm.reason === 'other' && !rejectForm.notes)}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Rejecting...' : 'Reject Finding'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Request Info Modal */}
      {activeModal === 'request-info' && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl max-w-lg w-full">
            <div className="p-6">
              <h3 className="text-xl font-semibold text-zinc-100 mb-4">Request More Information</h3>
              <p className="text-zinc-400 mb-6">
                Flag this finding for additional agent analysis.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1">
                    What additional analysis is needed? <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    value={requestInfoForm.notes}
                    onChange={(e) => setRequestInfoForm((f) => ({ ...f, notes: e.target.value }))}
                    rows={3}
                    placeholder="Describe what you need..."
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 focus:outline-none focus:border-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Common Requests (optional)
                  </label>
                  <div className="space-y-2">
                    {REQUESTED_CHECKS.map((check) => (
                      <label
                        key={check.value}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={requestInfoForm.checks.includes(check.value)}
                          onChange={(e) => {
                            setRequestInfoForm((f) => ({
                              ...f,
                              checks: e.target.checked
                                ? [...f.checks, check.value]
                                : f.checks.filter((c) => c !== check.value),
                            }));
                          }}
                          className="text-brand-500"
                        />
                        <span className="text-zinc-300">{check.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setActiveModal(null)}
                  className="flex-1 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRequestInfo}
                  disabled={isSubmitting || !requestInfoForm.notes.trim()}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Submitting...' : 'Request Info'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={() => setShowAuthModal(false)}
      />
    </PageWrapper>
  );
}
