'use client';

/**
 * Guides Index Page
 * Hub for all documentation and guides
 */

import { PageWrapper } from '@/components/layout/PageWrapper';
import Link from 'next/link';

interface Guide {
  title: string;
  description: string;
  href: string;
  icon: string;
  color: string;
}

const GUIDES: Guide[] = [
  {
    title: 'Rigor-Up Guide',
    description: 'How to improve your submission quality score and contribute meaningful data',
    href: '/guides/rigor-up',
    icon: '?',
    color: 'violet',
  },
  {
    title: 'Submission Walkthrough',
    description: 'Step-by-step guide through the submission wizard',
    href: '/submit',
    icon: '?',
    color: 'emerald',
  },
  {
    title: 'Pattern Matching',
    description: 'How cross-domain patterns are detected and scored',
    href: '/patterns',
    icon: '?',
    color: 'amber',
  },
  {
    title: 'Prediction Testing',
    description: 'How predictions are generated, tested, and validated',
    href: '/predictions',
    icon: '?',
    color: 'blue',
  },
];

export default function GuidesPage() {
  return (
    <PageWrapper>
      <div className="max-w-4xl mx-auto">
        <div className="mb-12 text-center">
          <h1 className="text-3xl font-bold text-zinc-100">Guides & Documentation</h1>
          <p className="mt-4 text-lg text-zinc-400">
            Learn how to contribute to rigorous anomaly research
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          {GUIDES.map((guide) => (
            <Link
              key={guide.href}
              href={guide.href}
              className={`rounded-xl border bg-zinc-900/50 p-6 transition-all hover:bg-zinc-800/50 ${
                guide.color === 'violet' ? 'border-violet-500/30 hover:border-violet-500/50' :
                guide.color === 'emerald' ? 'border-emerald-500/30 hover:border-emerald-500/50' :
                guide.color === 'amber' ? 'border-amber-500/30 hover:border-amber-500/50' :
                'border-blue-500/30 hover:border-blue-500/50'
              }`}
            >
              <div className="flex items-start gap-4">
                <span className="text-3xl">{guide.icon}</span>
                <div>
                  <h2 className="text-lg font-semibold text-zinc-100">{guide.title}</h2>
                  <p className="mt-1 text-sm text-zinc-400">{guide.description}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-12 rounded-xl border border-zinc-700 bg-zinc-900/50 p-6">
          <h2 className="text-lg font-semibold text-zinc-100 mb-4">Quick Links</h2>
          <div className="flex flex-wrap gap-3">
            <Link href="/dashboard" className="rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-700">
              Dashboard
            </Link>
            <Link href="/investigations" className="rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-700">
              Browse Investigations
            </Link>
            <Link href="/community" className="rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-700">
              Community Hypotheses
            </Link>
            <Link href="/redteam" className="rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-700">
              Red Team Dashboard
            </Link>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
