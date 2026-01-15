'use client';

/**
 * TriagePreview
 * Step 6: Preview triage score and recommendations
 */

import type { TriageBreakdown } from '@/lib/triage';
import { getTriageScoreColor, getTriageStatusColor } from '@/lib/triage';

interface TriagePreviewProps {
  triageScore: TriageBreakdown;
  onNext: () => void;
  onBack: () => void;
}

export function TriagePreview({ triageScore, onNext, onBack }: TriagePreviewProps) {
  const scoreColor = getTriageScoreColor(triageScore.overall);
  const statusColor = getTriageStatusColor(triageScore.status);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-zinc-100">Triage Score Preview</h2>
        <p className="mt-2 text-zinc-400">
          Your submission will receive this quality score
        </p>
      </div>

      {/* Main score display */}
      <div className="rounded-xl border border-zinc-700 bg-gradient-to-br from-zinc-900 to-zinc-900/50 p-8 text-center">
        <div className={`text-7xl font-bold ${scoreColor}`}>
          {triageScore.overall}
        </div>
        <div className="mt-2 text-xl text-zinc-400">out of 10</div>
        <div className="mt-4">
          <span
            className={`inline-block rounded-full border px-4 py-1 text-sm font-medium capitalize ${statusColor}`}
          >
            {triageScore.status}
          </span>
        </div>
      </div>

      {/* Score breakdown */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Source Integrity */}
        <div className="rounded-lg border border-zinc-700 bg-zinc-900/50 p-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-zinc-200">Source Integrity</h4>
            <span className="text-lg font-bold text-zinc-100">
              {triageScore.sourceIntegrity.score}/{triageScore.sourceIntegrity.max}
            </span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-800">
            <div
              className="h-full bg-violet-500 transition-all"
              style={{
                width: `${(triageScore.sourceIntegrity.score / triageScore.sourceIntegrity.max) * 100}%`,
              }}
            />
          </div>
          {triageScore.sourceIntegrity.details.length > 0 && (
            <ul className="mt-3 space-y-1 text-xs text-zinc-400">
              {triageScore.sourceIntegrity.details.map((detail, i) => (
                <li key={i}>{detail}</li>
              ))}
            </ul>
          )}
        </div>

        {/* Methodology */}
        <div className="rounded-lg border border-zinc-700 bg-zinc-900/50 p-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-zinc-200">Methodology</h4>
            <span className="text-lg font-bold text-zinc-100">
              {triageScore.methodology.score}/{triageScore.methodology.max}
            </span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-800">
            <div
              className="h-full bg-blue-500 transition-all"
              style={{
                width: `${(triageScore.methodology.score / triageScore.methodology.max) * 100}%`,
              }}
            />
          </div>
          {triageScore.methodology.details.length > 0 && (
            <ul className="mt-3 space-y-1 text-xs text-zinc-400">
              {triageScore.methodology.details.map((detail, i) => (
                <li key={i}>{detail}</li>
              ))}
            </ul>
          )}
        </div>

        {/* Variable Capture */}
        <div className="rounded-lg border border-zinc-700 bg-zinc-900/50 p-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-zinc-200">Variable Capture</h4>
            <span className="text-lg font-bold text-zinc-100">
              {triageScore.variableCapture.score}/{triageScore.variableCapture.max}
            </span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-800">
            <div
              className="h-full bg-emerald-500 transition-all"
              style={{
                width: `${(triageScore.variableCapture.score / triageScore.variableCapture.max) * 100}%`,
              }}
            />
          </div>
          {triageScore.variableCapture.details.length > 0 && (
            <ul className="mt-3 space-y-1 text-xs text-zinc-400">
              {triageScore.variableCapture.details.map((detail, i) => (
                <li key={i}>{detail}</li>
              ))}
            </ul>
          )}
        </div>

        {/* Data Quality */}
        <div className="rounded-lg border border-zinc-700 bg-zinc-900/50 p-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-zinc-200">Data Quality</h4>
            <span className="text-lg font-bold text-zinc-100">
              {triageScore.dataQuality.score}/{triageScore.dataQuality.max}
            </span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-800">
            <div
              className="h-full bg-amber-500 transition-all"
              style={{
                width: `${(triageScore.dataQuality.score / triageScore.dataQuality.max) * 100}%`,
              }}
            />
          </div>
          {triageScore.dataQuality.details.length > 0 && (
            <ul className="mt-3 space-y-1 text-xs text-zinc-400">
              {triageScore.dataQuality.details.map((detail, i) => (
                <li key={i}>{detail}</li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Recommendations */}
      {triageScore.recommendations.length > 0 && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-6">
          <h4 className="flex items-center gap-2 text-sm font-medium text-amber-400">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            Recommendations to Improve Score
          </h4>
          <ul className="mt-3 space-y-2">
            {triageScore.recommendations.map((rec, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-amber-300/80">
                <span className="text-amber-500">-</span>
                {rec}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Status explanation */}
      <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-4">
        <h4 className="text-sm font-medium text-zinc-300">What does this score mean?</h4>
        <div className="mt-3 space-y-2 text-sm text-zinc-400">
          <p>
            <strong className="text-emerald-400">Verified (7-10):</strong> High-quality submission
            ready for analysis and pattern matching.
          </p>
          <p>
            <strong className="text-amber-400">Provisional (4-6):</strong> Good submission that may
            benefit from additional documentation.
          </p>
          <p>
            <strong className="text-blue-400">Pending (1-3):</strong> Basic submission that needs
            more information for full analysis.
          </p>
          <p>
            <strong className="text-red-400">Rejected (0):</strong> Insufficient data for
            meaningful analysis.
          </p>
        </div>
      </div>

      {/* Navigation buttons */}
      <div className="flex justify-between">
        <button
          onClick={onBack}
          className="rounded-lg border border-zinc-700 bg-zinc-800 px-6 py-3 font-medium text-zinc-300 transition-colors hover:bg-zinc-700"
        >
          Back
        </button>
        <button
          onClick={onNext}
          className="rounded-lg bg-violet-600 px-6 py-3 font-medium text-white transition-colors hover:bg-violet-500"
        >
          Continue to Submit
        </button>
      </div>
    </div>
  );
}
