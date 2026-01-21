"use client";

interface DataSource {
  id: string;
  source: string;
  sync_type: string;
  status: string;
  records_added: number;
  records_skipped: number;
  total_source_records: number;
  created_at: string;
  last_record_date?: string;
}

interface DataStatusTabProps {
  dataSources: DataSource[];
}

// Hardcoded data source info
const DATA_SOURCE_INFO: Record<string, {
  name: string;
  abbreviation: string;
  type: string;
  dateRange: string;
  records: number;
  hasGaps: boolean;
  source: string;
  url?: string;
  notes: string;
  gapNote?: string;
}> = {
  nuforc: {
    name: "National UFO Reporting Center",
    abbreviation: "NUFORC",
    type: "UFO",
    dateRange: "2014-2023",
    records: 147890,
    hasGaps: false,
    source: "Hugging Face (kcimc/NUFORC)",
    url: "https://huggingface.co/datasets/kcimc/NUFORC",
    notes: "Updated Jan 2024. Includes full text reports and geocoded locations.",
  },
  nuforc_legacy: {
    name: "NUFORC (Legacy)",
    abbreviation: "NUFORC",
    type: "UFO",
    dateRange: "Pre-2014",
    records: 4968,
    hasGaps: false,
    source: "Initial import",
    notes: "Original dataset before data pipeline.",
  },
  bfro_legacy: {
    name: "Bigfoot Field Researchers Organization",
    abbreviation: "BFRO",
    type: "Bigfoot",
    dateRange: "1869-2017",
    records: 3810,
    hasGaps: true,
    gapNote: "Data ends 2017. No updated source available without Kaggle API.",
    source: "Initial import",
    notes: "Geocoded sightings from BFRO database.",
  },
  haunted_places_legacy: {
    name: "Haunted Places Database",
    abbreviation: "HPD",
    type: "Haunting",
    dateRange: "Various",
    records: 9731,
    hasGaps: false,
    source: "Shadowlands/Initial import",
    notes: "No reliable event dates. Excluded from temporal analysis.",
  },
};

export function DataStatusTab({ dataSources }: DataStatusTabProps) {
  return (
    <div className="space-y-6">
      {/* Overview */}
      <div className="rounded-xl border border-dark-border bg-dark-card p-6">
        <div className="flex items-center gap-2 mb-2">
          <svg className="h-5 w-5 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
          </svg>
          <h3 className="text-lg font-semibold text-zinc-100">Data Sources</h3>
        </div>
        <p className="text-sm text-zinc-400 mb-4">
          Current data inventory and sync status
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-dark-border">
                <th className="text-left py-2 px-3 text-zinc-400 font-medium">Source</th>
                <th className="text-left py-2 px-3 text-zinc-400 font-medium">Type</th>
                <th className="text-right py-2 px-3 text-zinc-400 font-medium">Records</th>
                <th className="text-left py-2 px-3 text-zinc-400 font-medium">Date Range</th>
                <th className="text-left py-2 px-3 text-zinc-400 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(DATA_SOURCE_INFO).map(([key, info]) => (
                <tr key={key} className="border-b border-dark-border last:border-0">
                  <td className="py-2 px-3">
                    <div>
                      <p className="font-medium text-zinc-200">{info.abbreviation}</p>
                      <p className="text-xs text-zinc-500">{info.name}</p>
                    </div>
                  </td>
                  <td className="py-2 px-3">
                    <span className="px-2 py-0.5 rounded text-xs font-medium border border-zinc-600 text-zinc-400">
                      {info.type}
                    </span>
                  </td>
                  <td className="text-right py-2 px-3 font-mono text-zinc-300">
                    {info.records.toLocaleString()}
                  </td>
                  <td className="py-2 px-3 text-zinc-300">{info.dateRange}</td>
                  <td className="py-2 px-3">
                    {info.hasGaps ? (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium text-yellow-500 border border-yellow-500/50">
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        Gap
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium text-green-500 border border-green-500/50">
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Current
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* BFRO Gap Warning */}
      <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/5 p-6">
        <div className="flex items-center gap-2 mb-2">
          <svg className="h-5 w-5 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h3 className="text-base font-semibold text-zinc-100">Data Gap: BFRO (2017-Present)</h3>
        </div>
        <div className="space-y-3 text-sm">
          <p className="text-zinc-300">
            The Bigfoot Field Researchers Organization data ends in 2017. This creates a 6+ year gap
            that affects several analyses:
          </p>
          <ul className="list-disc list-inside space-y-1 text-zinc-500">
            <li>UFO-Bigfoot comparisons from 2018-2023 are one-sided</li>
            <li>Ratio stability predictions use 2014-2017 overlap period only</li>
            <li>Temporal correlation limited to overlap period</li>
          </ul>
          <p className="pt-2 text-zinc-300">
            To update BFRO data, configure Kaggle API credentials and run:
          </p>
          <code className="block p-2 bg-dark-hover rounded text-xs font-mono text-zinc-400">
            kaggle datasets download -d mexwell/bigfoot-sightings
          </code>
        </div>
      </div>

      {/* Data Sources Detail */}
      <div className="grid gap-4 md:grid-cols-2">
        {Object.entries(DATA_SOURCE_INFO).map(([key, info]) => (
          <div key={key} className="rounded-xl border border-dark-border bg-dark-card p-6">
            <h3 className="text-base font-semibold text-zinc-100 mb-4">{info.name}</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-zinc-500">Records:</span>
                <span className="font-mono text-zinc-300">{info.records.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Date Range:</span>
                <span className="text-zinc-300">{info.dateRange}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Source:</span>
                <span className="text-zinc-300">{info.source}</span>
              </div>
              {info.url && (
                <a
                  href={info.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-brand-400 hover:text-brand-300 transition-colors"
                >
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  View dataset
                </a>
              )}
              <p className="text-xs text-zinc-500 pt-2 border-t border-dark-border">
                {info.notes}
              </p>
              {info.gapNote && (
                <p className="text-xs text-yellow-500">
                  {info.gapNote}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Ingestion Documentation */}
      <div className="rounded-xl border border-dark-border bg-dark-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <svg className="h-5 w-5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="text-base font-semibold text-zinc-100">Data Ingestion API</h3>
        </div>
        <div className="space-y-4 text-sm">
          <div>
            <p className="font-medium text-zinc-200">GET /api/data/ingest</p>
            <p className="text-zinc-500">
              Returns sync status for all data sources
            </p>
          </div>
          <div>
            <p className="font-medium text-zinc-200">POST /api/data/ingest</p>
            <p className="text-zinc-500">
              Ingest data from JSON array or URL
            </p>
            <code className="block p-2 bg-dark-hover rounded text-xs font-mono mt-2 text-zinc-400">
              {`{ "source": "nuforc", "data": [...] }`}
            </code>
          </div>
          <div>
            <p className="font-medium text-zinc-200">POST /api/analysis/window/build-grid</p>
            <p className="text-zinc-500">
              Rebuild grid cells after data import
            </p>
          </div>
          <div>
            <p className="font-medium text-zinc-200">GET /api/analysis/window/predictions/evaluate</p>
            <p className="text-zinc-500">
              Evaluate predictions against current data
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
