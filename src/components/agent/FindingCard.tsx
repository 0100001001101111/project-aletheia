'use client';

/**
 * FindingCard Component
 * Displays a summary of an agent finding in the review queue
 */

import Link from 'next/link';

interface FindingCardProps {
  finding: {
    id: string;
    title: string;
    display_title: string;
    confidence: number | null;
    review_status: string | null;
    rejection_reason?: string | null;
    created_at: string | null;
    session_id: string | null;
    domains?: string[];
  };
  selectable?: boolean;
  selected?: boolean;
  onSelect?: (id: string, selected: boolean) => void;
}

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  pending: { bg: 'bg-amber-500/10', text: 'text-amber-400', label: 'Pending Review' },
  approved: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', label: 'Approved' },
  rejected: { bg: 'bg-red-500/10', text: 'text-red-400', label: 'Rejected' },
  needs_info: { bg: 'bg-blue-500/10', text: 'text-blue-400', label: 'Needs Info' },
};

const REJECTION_REASON_LABELS: Record<string, string> = {
  duplicate: 'Duplicate',
  methodology: 'Methodology Issue',
  insufficient_evidence: 'Insufficient Evidence',
  already_known: 'Already Known',
  not_actionable: 'Not Actionable',
  other: 'Rejected',
};

const DOMAIN_COLORS: Record<string, string> = {
  ufo: 'bg-purple-500/20 text-purple-300',
  bigfoot: 'bg-green-500/20 text-green-300',
  haunting: 'bg-orange-500/20 text-orange-300',
  nde: 'bg-cyan-500/20 text-cyan-300',
  ganzfeld: 'bg-blue-500/20 text-blue-300',
  crisis_apparition: 'bg-pink-500/20 text-pink-300',
  stargate: 'bg-indigo-500/20 text-indigo-300',
  geophysical: 'bg-yellow-500/20 text-yellow-300',
};

export function FindingCard({ finding, selectable, selected, onSelect }: FindingCardProps) {
  const status = STATUS_STYLES[finding.review_status || 'pending'] || STATUS_STYLES.pending;
  const confidence = finding.confidence ?? 0;
  const confidencePercent = Math.round(confidence * 100);

  // Get the appropriate label for rejected items
  const getStatusLabel = () => {
    if (finding.review_status === 'rejected' && finding.rejection_reason) {
      return REJECTION_REASON_LABELS[finding.rejection_reason] || 'Rejected';
    }
    return status.label;
  };

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onSelect) {
      onSelect(finding.id, !selected);
    }
  };

  return (
    <Link href={`/agent/review/${finding.id}`}>
      <div className={`p-4 bg-zinc-900/50 border rounded-lg hover:border-zinc-700 hover:bg-zinc-900/70 transition-all cursor-pointer ${
        selected ? 'border-brand-500 bg-brand-500/10' : 'border-zinc-800'
      }`}>
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex items-start gap-3">
            {selectable && (
              <div
                onClick={handleCheckboxClick}
                className={`mt-1 w-5 h-5 rounded border-2 flex items-center justify-center cursor-pointer transition-colors ${
                  selected
                    ? 'bg-brand-500 border-brand-500'
                    : 'border-zinc-600 hover:border-zinc-500'
                }`}
              >
                {selected && (
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
            )}
            <h3 className="text-lg font-medium text-zinc-100 line-clamp-2">
              {finding.display_title}
            </h3>
          </div>
          <span className={`shrink-0 px-2 py-1 text-xs font-medium rounded ${status.bg} ${status.text}`}>
            {getStatusLabel()}
          </span>
        </div>

        {/* Technical hypothesis */}
        <p className="text-sm text-zinc-400 mb-4 line-clamp-2">
          {finding.title}
        </p>

        {/* Domains */}
        {finding.domains && finding.domains.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {finding.domains.map((domain) => (
              <span
                key={domain}
                className={`px-2 py-0.5 text-xs rounded ${DOMAIN_COLORS[domain] || 'bg-zinc-500/20 text-zinc-300'}`}
              >
                {domain}
              </span>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-zinc-800">
          {/* Confidence meter */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-500">Confidence:</span>
            <div className="w-24 h-2 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  confidencePercent >= 70 ? 'bg-emerald-500' :
                  confidencePercent >= 40 ? 'bg-amber-500' :
                  'bg-red-500'
                }`}
                style={{ width: `${confidencePercent}%` }}
              />
            </div>
            <span className="text-xs text-zinc-400">{confidencePercent}%</span>
          </div>

          {/* Date */}
          <span className="text-xs text-zinc-500">
            {finding.created_at
              ? new Date(finding.created_at).toLocaleDateString()
              : 'Unknown date'}
          </span>
        </div>
      </div>
    </Link>
  );
}
