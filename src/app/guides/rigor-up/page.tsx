'use client';

/**
 * Rigor-Up Guide
 * How to improve your submission quality score
 */

import { PageWrapper } from '@/components/layout/PageWrapper';
import Link from 'next/link';

interface ScoreCategory {
  name: string;
  weight: string;
  description: string;
  tips: string[];
  examples: {
    weak: string;
    strong: string;
  };
}

const SCORE_CATEGORIES: ScoreCategory[] = [
  {
    name: 'Witness Quality',
    weight: '30%',
    description: 'Credibility and verification of witness testimony',
    tips: [
      'Named witnesses with verifiable credentials score higher than anonymous claims',
      'Multiple independent witnesses who were interviewed separately ("blind audit") dramatically increase credibility',
      'Professional credentials must be independently verified, not just claimed',
      'Primary direct witnesses (eyewitnesses) score higher than secondary sources',
    ],
    examples: {
      weak: '"An anonymous source claims they saw something strange"',
      strong: '"Three hospital staff members, credentials verified, interviewed separately with matching accounts"',
    },
  },
  {
    name: 'Timing & Precision',
    weight: '25%',
    description: 'How well-documented the event timeline is',
    tips: [
      'Exact dates and times allow correlation with environmental data (seismic, geomagnetic)',
      'Reports filed within 24-72 hours are more reliable than months-old recollections',
      'Contemporary documentation (journals, photos with EXIF data) beats later reconstructions',
      'Specify time zones and note if the date is approximate',
    ],
    examples: {
      weak: '"Sometime in the summer of 2019"',
      strong: '"January 20, 1996 at approximately 3:30 PM local time (BRT)"',
    },
  },
  {
    name: 'Evidence Quality',
    weight: '20%',
    description: 'Physical evidence, documentation, and chain of custody',
    tips: [
      'Original files with metadata intact score higher than copies or screenshots',
      'Chain of custody documentation prevents tampering concerns',
      'Multiple types of evidence (photo + audio + physical) are more compelling',
      'Professional analysis (lab reports, forensic examination) adds significant weight',
    ],
    examples: {
      weak: '"A photo someone posted online, source unknown"',
      strong: '"Original RAW files with EXIF metadata, analyzed by independent photo forensics lab"',
    },
  },
  {
    name: 'Corroboration',
    weight: '15%',
    description: 'Independent confirmation from multiple sources',
    tips: [
      'Multiple witnesses who did not discuss the event before being interviewed',
      'Physical evidence that matches witness descriptions',
      'Official records (police reports, medical records, flight logs)',
      'Environmental data correlation (seismic records, radar, weather)',
    ],
    examples: {
      weak: '"Three friends all saw it together and agreed on what happened"',
      strong: '"Witnesses at three separate locations reported consistent details before meeting"',
    },
  },
  {
    name: 'Verifiability',
    weight: '10%',
    description: 'Can the claims be checked by independent researchers?',
    tips: [
      'Provide exact locations (coordinates) so others can investigate',
      'Name specific institutions, dates, and documents that can be verified',
      'Allow witness contact (even through intermediaries) for follow-up',
      'Share raw data files, not just summaries',
    ],
    examples: {
      weak: '"A military facility in the Southwest"',
      strong: '"Memorial Hospital, Varginha, Brazil - medical records available through FOIA"',
    },
  },
];

const SCORE_TIERS = [
  { range: '8.0 - 10.0', status: 'Verified', color: 'emerald', description: 'High-quality submission meeting rigorous standards' },
  { range: '4.0 - 7.9', status: 'Provisional', color: 'amber', description: 'Included in analysis but needs additional verification' },
  { range: '0.0 - 3.9', status: 'Rejected', color: 'red', description: 'Insufficient evidence for pattern matching inclusion' },
];

export default function RigorUpGuidePage() {
  return (
    <PageWrapper>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-12 text-center">
          <h1 className="text-3xl font-bold text-zinc-100">Rigor-Up Guide</h1>
          <p className="mt-4 text-lg text-zinc-400 max-w-2xl mx-auto">
            How to improve your submission quality score and contribute meaningful data to anomaly research
          </p>
        </div>

        {/* Score Tiers */}
        <div className="mb-12">
          <h2 className="text-xl font-semibold text-zinc-100 mb-4">Score Tiers</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {SCORE_TIERS.map((tier) => (
              <div
                key={tier.status}
                className={`rounded-xl border p-4 ${
                  tier.color === 'emerald'
                    ? 'border-emerald-500/30 bg-emerald-500/10'
                    : tier.color === 'amber'
                    ? 'border-amber-500/30 bg-amber-500/10'
                    : 'border-red-500/30 bg-red-500/10'
                }`}
              >
                <div className="flex items-baseline justify-between mb-2">
                  <span className={`font-semibold ${
                    tier.color === 'emerald' ? 'text-emerald-400' :
                    tier.color === 'amber' ? 'text-amber-400' : 'text-red-400'
                  }`}>
                    {tier.status}
                  </span>
                  <span className="text-sm text-zinc-400">{tier.range}</span>
                </div>
                <p className="text-sm text-zinc-400">{tier.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Scoring Categories */}
        <div className="space-y-8 mb-12">
          <h2 className="text-xl font-semibold text-zinc-100">How Your Score is Calculated</h2>

          {SCORE_CATEGORIES.map((category) => (
            <div key={category.name} className="rounded-xl border border-zinc-700 bg-zinc-900/50 p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-zinc-100">{category.name}</h3>
                  <p className="text-sm text-zinc-400">{category.description}</p>
                </div>
                <span className="rounded-full bg-violet-500/20 px-3 py-1 text-sm font-medium text-violet-400">
                  {category.weight}
                </span>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-zinc-300 mb-2">Tips for Higher Scores:</h4>
                  <ul className="space-y-2">
                    {category.tips.map((tip, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm text-zinc-400">
                        <svg className="h-5 w-5 text-emerald-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 pt-4 border-t border-zinc-700">
                  <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3">
                    <div className="text-xs font-medium text-red-400 uppercase mb-1">Weak Example</div>
                    <p className="text-sm text-zinc-400 italic">{category.examples.weak}</p>
                  </div>
                  <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3">
                    <div className="text-xs font-medium text-emerald-400 uppercase mb-1">Strong Example</div>
                    <p className="text-sm text-zinc-400 italic">{category.examples.strong}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Key Principles */}
        <div className="rounded-xl border border-violet-500/30 bg-violet-500/5 p-6 mb-12">
          <h2 className="text-lg font-semibold text-zinc-100 mb-4">Key Principles</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-violet-500/20 flex items-center justify-center text-violet-400">
                1
              </div>
              <div>
                <div className="font-medium text-zinc-200">Rigor Over Volume</div>
                <p className="text-sm text-zinc-400">One high-quality submission is worth more than ten weak ones.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-violet-500/20 flex items-center justify-center text-violet-400">
                2
              </div>
              <div>
                <div className="font-medium text-zinc-200">Verification Beats Claims</div>
                <p className="text-sm text-zinc-400">Independent verification always scores higher than self-reported credentials.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-violet-500/20 flex items-center justify-center text-violet-400">
                3
              </div>
              <div>
                <div className="font-medium text-zinc-200">Process, Not Belief</div>
                <p className="text-sm text-zinc-400">We score methodology and evidence quality, not whether we think the phenomenon is real.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-violet-500/20 flex items-center justify-center text-violet-400">
                4
              </div>
              <div>
                <div className="font-medium text-zinc-200">Transparency is Key</div>
                <p className="text-sm text-zinc-400">Share raw data and allow independent verification whenever possible.</p>
              </div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <Link
            href="/submit"
            className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-6 py-3 font-medium text-white hover:bg-violet-500"
          >
            Start a New Submission
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>
      </div>
    </PageWrapper>
  );
}
