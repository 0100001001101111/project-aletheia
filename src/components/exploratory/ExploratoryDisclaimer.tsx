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
    <div className="rounded-xl border-l-4 border-purple-500 bg-purple-500/10 p-4 mb-6">
      <div className="flex">
        <div className="flex-shrink-0 text-2xl">👻</div>
        <div className="ml-3">
          <h3 className="text-sm font-medium text-purple-300">Exploratory Data</h3>
          <p className="text-sm text-purple-200/70 mt-1">
            This domain is for pattern exploration and entertainment. We make no
            scientific claims about the phenomena. Correlations shown are interesting
            but not rigorously validated. Have fun with it.
          </p>
        </div>
      </div>
    </div>
  );
}

export function ExploratoryBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-purple-500/20 border border-purple-500/40 px-2.5 py-0.5 text-xs font-medium text-purple-300">
      <span>👻</span>
      Exploratory
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
