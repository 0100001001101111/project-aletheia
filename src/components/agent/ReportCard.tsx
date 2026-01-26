'use client';

/**
 * ReportCard Component
 * Displays a summary of an agent research report
 */

import Link from 'next/link';
import type { ReportVerdict } from '@/lib/agent/types';

interface ReportCardProps {
  report: {
    id: string;
    slug: string;
    title: string;
    display_title: string;
    summary: string;
    confidence_final: number | null;
    verdict: ReportVerdict | null;
    status: string;
    published_at: string | null;
    created_at: string | null;
  };
}

const VERDICT_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  supported: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', label: 'Supported' },
  refuted: { bg: 'bg-red-500/10', text: 'text-red-400', label: 'Refuted' },
  inconclusive: { bg: 'bg-amber-500/10', text: 'text-amber-400', label: 'Inconclusive' },
  needs_more_data: { bg: 'bg-blue-500/10', text: 'text-blue-400', label: 'Needs More Data' },
};

export function ReportCard({ report }: ReportCardProps) {
  const verdict = VERDICT_STYLES[report.verdict || 'inconclusive'] || VERDICT_STYLES.inconclusive;
  const confidence = report.confidence_final ?? 0;
  const confidencePercent = Math.round(confidence * 100);

  // Truncate summary
  const truncatedSummary = report.summary.length > 200
    ? report.summary.substring(0, 200) + '...'
    : report.summary;

  const date = report.published_at || report.created_at;

  return (
    <Link href={`/agent/reports/${report.slug}`}>
      <div className="p-5 bg-zinc-900/50 border border-zinc-800 rounded-lg hover:border-zinc-700 hover:bg-zinc-900/70 transition-all cursor-pointer h-full flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <h3 className="text-lg font-medium text-zinc-100 line-clamp-2 flex-1">
            {report.display_title}
          </h3>
          <span className={`shrink-0 px-2.5 py-1 text-xs font-medium rounded-full ${verdict.bg} ${verdict.text}`}>
            {verdict.label}
          </span>
        </div>

        {/* Summary */}
        <p className="text-sm text-zinc-400 mb-4 line-clamp-3 flex-1">
          {truncatedSummary}
        </p>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-zinc-800">
          {/* Confidence meter */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-500">Confidence:</span>
            <div className="w-20 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
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
          <div className="flex items-center gap-2">
            {report.status === 'draft' && (
              <span className="text-xs px-1.5 py-0.5 bg-zinc-700 text-zinc-400 rounded">
                Draft
              </span>
            )}
            <span className="text-xs text-zinc-500">
              {date
                ? new Date(date).toLocaleDateString()
                : 'Unknown date'}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
