'use client';

/**
 * Anomaly Map Page
 * Full-screen visualization of all anomaly types
 */

import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';

// Dynamically import map to avoid SSR issues
const AnomalyMap = dynamic(() => import('@/components/maps/AnomalyMap'), {
  ssr: false,
  loading: () => (
    <div className="flex h-screen items-center justify-center bg-zinc-950">
      <div className="text-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-violet-500 border-t-transparent mx-auto" />
        <p className="mt-3 text-zinc-400">Loading Anomaly Map...</p>
      </div>
    </div>
  ),
});

export default function AnomalyMapPage() {
  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-zinc-900/95 backdrop-blur-sm border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/investigations"
              className="text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              ← Back
            </Link>
            <div>
              <h1 className="text-lg font-bold text-zinc-100">
                🗺️ Anomaly Map
              </h1>
              <p className="text-xs text-zinc-500">
                Multi-phenomenon visualization across 18,900+ records
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/patterns"
              className="text-sm text-violet-400 hover:text-violet-300"
            >
              View Patterns →
            </Link>
          </div>
        </div>
      </header>

      {/* Map Container */}
      <main className="pt-16">
        <Suspense fallback={
          <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-violet-500 border-t-transparent" />
          </div>
        }>
          <AnomalyMap height="calc(100vh - 4rem)" />
        </Suspense>
      </main>

      {/* Info Panel */}
      <div className="fixed bottom-4 right-4 z-50 bg-zinc-900/95 backdrop-blur-sm rounded-xl border border-zinc-700 p-4 max-w-sm">
        <h3 className="text-sm font-bold text-zinc-100 mb-2">About This Map</h3>
        <p className="text-xs text-zinc-400 mb-3">
          This visualization shows geographic correlations between different anomaly types.
          Areas with multiple phenomenon types may indicate environmental or perceptual factors.
        </p>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-zinc-800/50 rounded-lg p-2">
            <p className="text-amber-400 font-medium">35,471</p>
            <p className="text-zinc-500">Bigfoot-UFO overlaps</p>
          </div>
          <div className="bg-zinc-800/50 rounded-lg p-2">
            <p className="text-violet-400 font-medium">97</p>
            <p className="text-zinc-500">Triple-overlap zones</p>
          </div>
          <div className="bg-zinc-800/50 rounded-lg p-2">
            <p className="text-rose-400 font-medium">59,085</p>
            <p className="text-zinc-500">Haunted-Bigfoot pairs</p>
          </div>
          <div className="bg-zinc-800/50 rounded-lg p-2">
            <p className="text-teal-400 font-medium">6</p>
            <p className="text-zinc-500">Patterns detected</p>
          </div>
        </div>
      </div>
    </div>
  );
}
