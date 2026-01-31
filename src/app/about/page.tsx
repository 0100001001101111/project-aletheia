/**
 * About Page - Coming Soon
 */

import Link from 'next/link';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <div className="text-center max-w-md px-4">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-600 to-accent-blue flex items-center justify-center mx-auto mb-6">
          <span className="text-white font-bold text-2xl">A</span>
        </div>
        <h1 className="text-3xl font-bold text-zinc-100 mb-4">About Aletheia</h1>
        <p className="text-zinc-400 mb-8">
          We&apos;re building the infrastructure for rigorous anomaly research.
          Full documentation coming soon.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 bg-brand-600 hover:bg-brand-500 text-white font-medium rounded-lg transition-colors"
        >
          ← Back to Home
        </Link>
      </div>
    </div>
  );
}
