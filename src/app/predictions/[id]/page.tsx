/**
 * Prediction Detail Page
 */

import { createClient } from '@/lib/supabase-server';
import Link from 'next/link';
import { notFound } from 'next/navigation';

const STATUS_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  open: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30' },
  pending: { bg: 'bg-zinc-500/10', text: 'text-zinc-400', border: 'border-zinc-500/30' },
  testing: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30' },
  confirmed: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  refuted: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/30' },
  inconclusive: { bg: 'bg-zinc-500/10', text: 'text-zinc-400', border: 'border-zinc-500/30' },
};

interface PageProps {
  params: Promise<{ id: string }>;
}

interface PredictionData {
  id: string;
  hypothesis: string;
  status: string;
  confidence_score: number;
  p_value: number | null;
  brier_score: number | null;
  domains_involved: string[];
  testing_protocol: string | null;
  created_at: string;
  resolved_at: string | null;
  pattern: {
    id: string;
    pattern_description: string;
    confidence_score: number;
    domains_matched: string[];
  } | null;
}

export default async function PredictionDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: prediction, error } = await supabase
    .from('aletheia_predictions')
    .select(`
      *,
      pattern:aletheia_pattern_matches!aletheia_predictions_pattern_id_fkey(
        id,
        pattern_description,
        confidence_score,
        domains_matched
      )
    `)
    .eq('id', id)
    .single() as { data: PredictionData | null; error: { code?: string } | null };

  if (error || !prediction) {
    notFound();
  }

  const statusStyle = STATUS_STYLES[prediction.status] || STATUS_STYLES.pending;
  const confidencePercent = ((prediction.confidence_score || 0) * 100).toFixed(1);
  const domains = prediction.domains_involved || [];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/50">
        <div className="mx-auto max-w-4xl px-4 py-6">
          <Link
            href="/predictions"
            className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200 mb-4"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Predictions
          </Link>
          <div className="flex items-start justify-between gap-4">
            <h1 className="text-2xl font-bold text-zinc-100">{prediction.hypothesis}</h1>
            <span
              className={`shrink-0 rounded-full border px-3 py-1 text-sm font-medium capitalize ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}
            >
              {prediction.status}
            </span>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-4xl px-4 py-8 space-y-8">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-xl bg-zinc-800/50 p-4 text-center" title="How certain we are this pattern is real, based on how many domains show it and how consistent the data is. Higher = more certain.">
            <div className="text-2xl font-bold text-violet-400">{confidencePercent}%</div>
            <div className="text-sm text-zinc-500 cursor-help">Confidence <span className="text-zinc-600">ⓘ</span></div>
          </div>
          {prediction.p_value != null && (
            <div className="rounded-xl bg-zinc-800/50 p-4 text-center" title="Probability this result happened by chance. Lower = more likely to be real. Scientists typically want p < 0.05 (less than 5% chance of being random).">
              <div className={`text-2xl font-bold ${prediction.p_value < 0.05 ? 'text-emerald-400' : 'text-zinc-400'}`}>
                {prediction.p_value.toFixed(4)}
              </div>
              <div className="text-sm text-zinc-500 cursor-help">P-Value <span className="text-zinc-600">ⓘ</span></div>
            </div>
          )}
          {prediction.brier_score != null && (
            <div className="rounded-xl bg-zinc-800/50 p-4 text-center" title="Measures prediction accuracy. Lower = better predictions. 0 = perfect, 1 = completely wrong.">
              <div className={`text-2xl font-bold ${prediction.brier_score < 0.25 ? 'text-emerald-400' : 'text-amber-400'}`}>
                {prediction.brier_score.toFixed(3)}
              </div>
              <div className="text-sm text-zinc-500 cursor-help">Brier Score <span className="text-zinc-600">ⓘ</span></div>
            </div>
          )}
          <div className="rounded-xl bg-zinc-800/50 p-4 text-center" title="Research categories: Near-Death Experiences, Ganzfeld, Crisis Apparitions, Remote Viewing, and Geophysical anomalies.">
            <div className="text-2xl font-bold text-zinc-300">{domains.length}</div>
            <div className="text-sm text-zinc-500 cursor-help">Domains <span className="text-zinc-600">ⓘ</span></div>
          </div>
        </div>

        {/* Domains */}
        {domains.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-zinc-200 mb-3">Domains Involved</h2>
            <div className="flex flex-wrap gap-2">
              {domains.map((domain: string) => (
                <span
                  key={domain}
                  className="rounded-full bg-violet-500/10 border border-violet-500/30 px-3 py-1 text-sm text-violet-300"
                >
                  {domain}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Testing Protocol */}
        {prediction.testing_protocol && (
          <div>
            <h2 className="text-lg font-semibold text-zinc-200 mb-3">Testing Protocol</h2>
            <div className="rounded-xl bg-zinc-800/50 p-4">
              <pre className="whitespace-pre-wrap text-sm text-zinc-300">{prediction.testing_protocol}</pre>
            </div>
          </div>
        )}

        {/* Source Pattern */}
        {prediction.pattern && (
          <div>
            <h2 className="text-lg font-semibold text-zinc-200 mb-3">Source Pattern</h2>
            <div className="rounded-xl border border-zinc-700 bg-zinc-800/30 p-4">
              <p className="text-zinc-300">{prediction.pattern.pattern_description}</p>
              <div className="mt-2 text-sm text-zinc-500">
                Pattern Confidence: {((prediction.pattern.confidence_score || 0) * 100).toFixed(1)}%
              </div>
            </div>
          </div>
        )}

        {/* Metadata */}
        <div className="border-t border-zinc-800 pt-6">
          <div className="grid grid-cols-2 gap-4 text-sm text-zinc-500">
            <div>
              <span className="text-zinc-600">Created:</span>{' '}
              {new Date(prediction.created_at).toLocaleDateString()}
            </div>
            {prediction.resolved_at && (
              <div>
                <span className="text-zinc-600">Resolved:</span>{' '}
                {new Date(prediction.resolved_at).toLocaleDateString()}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
