"use client";

interface Prediction {
  id: string;
  cell_id: string;
  prediction_type: string;
  predicted_index: number;
  current_window_index: number;
  confidence: number;
  evaluation_date: string;
  prediction_correct: boolean | null;
  parameters?: {
    nullHypothesis?: string;
    alternativeHypothesis?: string;
    confirmationThreshold?: number;
    refutationThreshold?: number;
    caveat?: string;
    currentRatio?: number;
    overlapPeriod?: string;
    ufoCount_2014_2017?: number;
    bfCount_2014_2017?: number;
    primaryType?: string;
    currentTotalCount?: number;
  };
}

interface PredictionsPanelProps {
  predictions: Prediction[];
}

const PREDICTION_TYPE_INFO: Record<string, { label: string; description: string; icon: string }> = {
  per_capita_anomaly: {
    label: "Per-Capita Anomaly",
    description: "Low-activity cells with high type diversity - will they maintain elevation?",
    icon: "📊",
  },
  negative_control: {
    label: "Negative Control",
    description: "High-activity single-type cells - will they develop other phenomena?",
    icon: "🎯",
  },
  gap_cell_discrete: {
    label: "Gap Cell (Discrete)",
    description: "Testing if windows are discrete geographic features",
    icon: "🗺️",
  },
  gap_cell_diffuse: {
    label: "Gap Cell (Diffuse)",
    description: "Testing if window activity spreads to adjacent areas",
    icon: "🌊",
  },
  ratio_stability: {
    label: "Ratio Stability",
    description: "Will UFO/Bigfoot ratio remain stable in dual-type cells?",
    icon: "⚖️",
  },
};

function PredictionCard({ prediction }: { prediction: Prediction }) {
  const typeInfo = PREDICTION_TYPE_INFO[prediction.prediction_type] ?? {
    label: prediction.prediction_type,
    description: "",
    icon: "❓",
  };

  const isRatioType = prediction.prediction_type === "ratio_stability";
  const hasSmallSample = prediction.parameters?.caveat?.includes("small") ?? false;
  const evalDate = new Date(prediction.evaluation_date);
  const isPending = prediction.prediction_correct === null;

  return (
    <div className="border border-dark-border rounded-lg p-4 space-y-3 bg-dark-card">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">{typeInfo.icon}</span>
          <div>
            <p className="font-medium text-zinc-200">{typeInfo.label}</p>
            <p className="text-xs text-zinc-500 font-mono">{prediction.cell_id}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isPending ? (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border border-zinc-600 text-zinc-400">
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Pending
            </span>
          ) : prediction.prediction_correct ? (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-green-500/20 text-green-400">
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Confirmed
            </span>
          ) : (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-red-500/20 text-red-400">
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Refuted
            </span>
          )}
          {isRatioType && hasSmallSample && (
            <span className="px-2 py-0.5 rounded text-xs font-medium text-yellow-500 border border-yellow-500/50">
              Low confidence
            </span>
          )}
        </div>
      </div>

      <div className="grid gap-2 text-sm">
        <div className="flex items-start gap-2">
          <span className="text-zinc-500 min-w-[24px]">H₀:</span>
          <span className="text-zinc-500">{prediction.parameters?.nullHypothesis ?? "—"}</span>
        </div>
        <div className="flex items-start gap-2">
          <span className="text-zinc-500 min-w-[24px]">H₁:</span>
          <span className="text-zinc-300">{prediction.parameters?.alternativeHypothesis ?? "—"}</span>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-zinc-500 pt-2 border-t border-dark-border">
        <span>
          Confidence: {(prediction.confidence * 100).toFixed(0)}%
        </span>
        <span>
          Evaluation: {evalDate.toLocaleDateString("en-US", { month: "short", year: "numeric" })}
        </span>
      </div>

      {prediction.parameters?.caveat && (
        <div className="flex items-start gap-2 text-xs text-yellow-400 bg-yellow-500/10 p-2 rounded">
          <svg className="h-3 w-3 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>{prediction.parameters.caveat}</span>
        </div>
      )}

      {isRatioType && prediction.parameters?.overlapPeriod && (
        <div className="text-xs text-zinc-500">
          Based on {prediction.parameters.overlapPeriod} overlap: {prediction.parameters.ufoCount_2014_2017} UFO / {prediction.parameters.bfCount_2014_2017} BF
        </div>
      )}
    </div>
  );
}

export function PredictionsPanel({ predictions }: PredictionsPanelProps) {
  // Group predictions by type
  const grouped = predictions.reduce((acc, pred) => {
    const type = pred.prediction_type;
    if (!acc[type]) acc[type] = [];
    acc[type].push(pred);
    return acc;
  }, {} as Record<string, Prediction[]>);

  const pendingCount = predictions.filter(p => p.prediction_correct === null).length;
  const confirmedCount = predictions.filter(p => p.prediction_correct === true).length;
  const refutedCount = predictions.filter(p => p.prediction_correct === false).length;

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="rounded-xl border border-dark-border bg-dark-card p-6">
        <div className="flex items-center gap-2 mb-2">
          <svg className="h-5 w-5 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
          </svg>
          <h3 className="text-lg font-semibold text-zinc-100">Pre-registered Predictions</h3>
        </div>
        <p className="text-sm text-zinc-400 mb-6">
          Falsifiable predictions to test the window hypothesis. These are active experiments, not conclusions.
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-zinc-700">
              <svg className="h-4 w-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-zinc-100">{pendingCount}</p>
              <p className="text-xs text-zinc-500">Pending evaluation</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-green-500/20">
              <svg className="h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-zinc-100">{confirmedCount}</p>
              <p className="text-xs text-zinc-500">Confirmed</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-red-500/20">
              <svg className="h-4 w-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-zinc-100">{refutedCount}</p>
              <p className="text-xs text-zinc-500">Refuted</p>
            </div>
          </div>
        </div>
      </div>

      {/* Predictions by Type */}
      {Object.entries(grouped).map(([type, preds]) => {
        const typeInfo = PREDICTION_TYPE_INFO[type] ?? { label: type, description: "", icon: "❓" };
        return (
          <div key={type} className="rounded-xl border border-dark-border bg-dark-card p-6">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">{typeInfo.icon}</span>
              <div>
                <h3 className="text-base font-semibold text-zinc-100">{typeInfo.label}</h3>
                <p className="text-sm text-zinc-400">{typeInfo.description}</p>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2 mt-4">
              {preds.map((pred) => (
                <PredictionCard key={pred.id} prediction={pred} />
              ))}
            </div>
          </div>
        );
      })}

      {predictions.length === 0 && (
        <div className="rounded-xl border border-dark-border bg-dark-card p-8 text-center text-zinc-500">
          No predictions registered yet. Run the prediction generator to create testable hypotheses.
        </div>
      )}
    </div>
  );
}
