'use client';

/**
 * HypothesisCard Component
 * Displays a community hypothesis in a card format
 */

import Link from 'next/link';
import type { CommunityHypothesis, InvestigationType } from '@/types/database';

// Domain icons mapping
const DOMAIN_ICONS: Record<InvestigationType, { icon: string; label: string; color: string }> = {
  nde: { icon: '💀', label: 'NDE', color: 'bg-purple-500/20 text-purple-300' },
  ganzfeld: { icon: '👁️', label: 'Ganzfeld', color: 'bg-blue-500/20 text-blue-300' },
  crisis_apparition: { icon: '👻', label: 'Crisis', color: 'bg-pink-500/20 text-pink-300' },
  stargate: { icon: '🎯', label: 'STARGATE', color: 'bg-cyan-500/20 text-cyan-300' },
  geophysical: { icon: '🌍', label: 'Geophysical', color: 'bg-green-500/20 text-green-300' },
  ufo: { icon: '🛸', label: 'UFO/UAP', color: 'bg-rose-500/20 text-rose-300' },
};

// Status badge styles
const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  speculative: { bg: 'bg-zinc-500/20', text: 'text-zinc-300', label: 'Speculative' },
  gathering_evidence: { bg: 'bg-amber-500/20', text: 'text-amber-300', label: 'Gathering Evidence' },
  promoted: { bg: 'bg-green-500/20', text: 'text-green-300', label: 'Promoted' },
};

interface HypothesisCardProps {
  hypothesis: CommunityHypothesis;
}

export function HypothesisCard({ hypothesis }: HypothesisCardProps) {
  const statusStyle = STATUS_STYLES[hypothesis.status] || STATUS_STYLES.speculative;
  const domains = hypothesis.domains_referenced || [];

  return (
    <div className="group rounded-xl border border-dark-border bg-dark-card p-5 transition-all hover:border-brand-500/30 hover:bg-dark-hover">
      {/* Header with status */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <h3 className="font-semibold text-zinc-100 line-clamp-2 group-hover:text-brand-400 transition-colors">
          {hypothesis.title}
        </h3>
        <span className={`shrink-0 px-2 py-1 rounded-full text-xs font-medium ${statusStyle.bg} ${statusStyle.text}`}>
          {statusStyle.label}
        </span>
      </div>

      {/* Hypothesis text (truncated) */}
      <p className="text-sm text-zinc-400 line-clamp-3 mb-4">
        {hypothesis.hypothesis}
      </p>

      {/* Domain icons */}
      {domains.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {domains.map((domain) => {
            const domainInfo = DOMAIN_ICONS[domain as InvestigationType];
            if (!domainInfo) return null;
            return (
              <span
                key={domain}
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs ${domainInfo.color}`}
                title={domainInfo.label}
              >
                <span>{domainInfo.icon}</span>
                <span>{domainInfo.label}</span>
              </span>
            );
          })}
        </div>
      )}

      {/* Footer with upvotes and link */}
      <div className="flex items-center justify-between pt-3 border-t border-dark-border">
        <div className="flex items-center gap-1 text-zinc-500">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
          <span className="text-sm font-medium">{hypothesis.upvotes}</span>
        </div>
        <Link
          href={`/community/${hypothesis.id}`}
          className="text-sm font-medium text-brand-400 hover:text-brand-300 transition-colors"
        >
          View Details →
        </Link>
      </div>
    </div>
  );
}
