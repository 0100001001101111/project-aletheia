"use client";

/**
 * Window Theory Analysis Dashboard
 * Tests John Keel's hypothesis about geographic clustering of paranormal phenomena
 */

import { useEffect, useState } from "react";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { SpatialAnalysisTab } from "@/components/window-analysis/SpatialAnalysisTab";
import { TemporalAnalysisTab } from "@/components/window-analysis/TemporalAnalysisTab";
import { GeologicalAnalysisTab } from "@/components/window-analysis/GeologicalAnalysisTab";
import { PredictionsPanel } from "@/components/window-analysis/PredictionsPanel";
import { DataStatusTab } from "@/components/window-analysis/DataStatusTab";

interface GridCell {
  cell_id: string;
  center_lat: number;
  center_lng: number;
  ufo_count: number;
  bigfoot_count: number;
  haunting_count: number;
  total_count: number;
  type_count: number;
  types_present?: string[];
  window_index: number;
  excess_ratio?: number;
}

interface CooccurrenceResult {
  id: string;
  analysis_date: string;
  pairings?: Record<string, unknown>;
  strongest_z_score?: number;
  window_effect_detected?: boolean;
  shuffle_count?: number;
}

interface Prediction {
  id: string;
  cell_id: string;
  prediction_type: string;
  predicted_index: number;
  current_window_index: number;
  confidence: number;
  evaluation_date: string;
  prediction_correct: boolean | null;
  parameters?: Record<string, unknown>;
}

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

type TabType = "spatial" | "temporal" | "geological" | "predictions" | "data";

const TABS: { id: TabType; label: string; icon: string }[] = [
  { id: "spatial", label: "Spatial Analysis", icon: "🗺️" },
  { id: "temporal", label: "Temporal Analysis", icon: "📅" },
  { id: "geological", label: "Geological", icon: "🏔️" },
  { id: "predictions", label: "Predictions", icon: "🔮" },
  { id: "data", label: "Data Status", icon: "📊" },
];

export default function WindowAnalysisPage() {
  const [activeTab, setActiveTab] = useState<TabType>("spatial");
  const [loading, setLoading] = useState(true);
  const [gridCells, setGridCells] = useState<GridCell[]>([]);
  const [cooccurrence, setCooccurrence] = useState<CooccurrenceResult | null>(null);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [gridRes, coocRes, predRes] = await Promise.all([
          fetch("/api/analysis/window/grid").catch(() => null),
          fetch("/api/analysis/window/cooccurrence").catch(() => null),
          fetch("/api/analysis/window/predictions").catch(() => null),
        ]);

        if (gridRes?.ok) {
          const data = await gridRes.json();
          setGridCells(data.cells || []);
        }

        if (coocRes?.ok) {
          const data = await coocRes.json();
          setCooccurrence(data.result || null);
        }

        if (predRes?.ok) {
          const data = await predRes.json();
          setPredictions(data.predictions || []);
        }
      } catch (err) {
        console.error("Failed to fetch window analysis data:", err);
        setError("Failed to load analysis data");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) {
    return (
      <PageWrapper>
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="text-center">
            <div className="h-10 w-10 mx-auto animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
            <p className="mt-4 text-zinc-400">Loading window analysis...</p>
          </div>
        </div>
      </PageWrapper>
    );
  }

  if (error) {
    return (
      <PageWrapper>
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="max-w-md rounded-xl border border-red-500/30 bg-red-500/10 p-8 text-center">
            <div className="w-12 h-12 mx-auto rounded-full bg-red-500/20 flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-red-400">Error</h2>
            <p className="mt-2 text-red-300/80">{error}</p>
          </div>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Window Theory Analysis"
      description="Testing John Keel's hypothesis: Do anomalous phenomena cluster geographically?"
    >
      {/* Header Stats */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 animate-fade-in">
        <div className="p-5 rounded-xl bg-gradient-to-br from-brand-900/20 to-transparent border border-brand-500/20 text-center">
          <div className="text-4xl font-bold text-brand-400">{gridCells.length.toLocaleString()}</div>
          <div className="text-zinc-400 font-medium mt-1">Grid Cells</div>
          <div className="text-xs text-zinc-500 mt-0.5">0.5° resolution</div>
        </div>
        <div className="p-5 rounded-xl bg-gradient-to-br from-purple-900/20 to-transparent border border-purple-500/20 text-center">
          <div className="text-4xl font-bold text-purple-400">
            {gridCells.filter(c => c.type_count >= 2).length}
          </div>
          <div className="text-zinc-400 font-medium mt-1">Multi-type Cells</div>
          <div className="text-xs text-zinc-500 mt-0.5">2+ phenomena types</div>
        </div>
        <div className="p-5 rounded-xl bg-gradient-to-br from-green-900/20 to-transparent border border-green-500/20 text-center">
          <div className="text-4xl font-bold text-green-400">
            {gridCells.filter(c => c.type_count === 3).length}
          </div>
          <div className="text-zinc-400 font-medium mt-1">Triple Cells</div>
          <div className="text-xs text-zinc-500 mt-0.5">All 3 phenomena</div>
        </div>
        <div className="p-5 rounded-xl bg-gradient-to-br from-cyan-900/20 to-transparent border border-cyan-500/20 text-center">
          <div className="text-4xl font-bold text-cyan-400">
            {predictions.filter(p => p.prediction_correct === null).length}
          </div>
          <div className="text-zinc-400 font-medium mt-1">Pending Tests</div>
          <div className="text-xs text-zinc-500 mt-0.5">Awaiting evaluation</div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-2 mb-6 p-1 bg-dark-card rounded-xl border border-dark-border">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.id
                ? "bg-brand-500/20 text-brand-400 border border-brand-500/30"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-dark-hover"
            }`}
          >
            <span>{tab.icon}</span>
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="animate-fade-in">
        {activeTab === "spatial" && (
          <SpatialAnalysisTab gridCells={gridCells} cooccurrence={cooccurrence} />
        )}
        {activeTab === "temporal" && <TemporalAnalysisTab />}
        {activeTab === "geological" && <GeologicalAnalysisTab />}
        {activeTab === "predictions" && <PredictionsPanel predictions={predictions} />}
        {activeTab === "data" && <DataStatusTab dataSources={dataSources} />}
      </div>
    </PageWrapper>
  );
}
