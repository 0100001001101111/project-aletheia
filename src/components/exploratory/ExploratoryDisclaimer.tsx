'use client';

/**
 * Exploratory Disclaimer Component
 * Required on every Exploratory tier page to differentiate from Research tier
 */

interface ExploratoryDisclaimerProps {
  compact?: boolean;
}

export function ExploratoryDisclaimer({ compact = false }: ExploratoryDisclaimerProps) {
  if (compact) {
    return (
      <div className="inline-flex items-center gap-2 rounded-lg bg-purple-500/10 border border-purple-500/30 px-3 py-1.5 text-sm">
        <span>👻</span>
        <span className="text-purple-300">Exploratory Data</span>
      </div>
    );
  }

  return (
    <div className="rounded-xl border-l-4 border-amber-500 bg-amber-500/10 p-4 mb-6">
      <div className="flex">
        <div className="flex-shrink-0 text-2xl">📊</div>
        <div className="ml-3">
          <h3 className="text-sm font-medium text-amber-300">Pattern Analysis Only — Not Scientific Evidence</h3>
          <p className="text-sm text-amber-200/70 mt-1">
            Bulk-imported sighting reports (UFO, Bigfoot, Haunting) for geographic clustering and
            window theory testing. This data is not quality-scored and does not support scientific claims.
            Use for exploratory pattern detection only.
          </p>
        </div>
      </div>
    </div>
  );
}

export function ExploratoryBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 border border-amber-500/40 px-2.5 py-0.5 text-xs font-medium text-amber-300">
      <span>📊</span>
      Pattern Analysis
    </span>
  );
}

export function ResearchBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/20 border border-blue-500/40 px-2.5 py-0.5 text-xs font-medium text-blue-300">
      <span>🔬</span>
      Research
    </span>
  );
}
