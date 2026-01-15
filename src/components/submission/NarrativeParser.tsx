'use client';

/**
 * NarrativeParser
 * Step 3: Enter narrative text and parse with LLM
 */

import { useState, useCallback } from 'react';
import type { InvestigationType } from '@/types/database';
import type { ParseResult } from '@/lib/parser';
import type { TriageBreakdown } from '@/lib/triage';
import { SCHEMA_METADATA, FIELD_DESCRIPTIONS } from '@/schemas';
import { estimateTokens, isNarrativeTooLong, truncateNarrative } from '@/lib/parser';
import { getConfidenceLevel } from '@/lib/parser';

interface NarrativeParserProps {
  schemaType: InvestigationType;
  initialNarrative: string;
  onParseComplete: (result: ParseResult, triage: TriageBreakdown) => void;
  onBack: () => void;
}

interface ParseApiResponse {
  success: boolean;
  data: Record<string, unknown>;
  confidence: Record<string, number>;
  missingRequired: string[];
  parserNotes: string[];
  validation: {
    valid: boolean;
    errors: Array<{ path: string; message: string }>;
  };
  triage: TriageBreakdown;
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
  error?: string;
}

export function NarrativeParser({
  schemaType,
  initialNarrative,
  onParseComplete,
  onBack,
}: NarrativeParserProps) {
  const [narrative, setNarrative] = useState(initialNarrative);
  const [isParsing, setIsParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parsePreview, setParsePreview] = useState<ParseApiResponse | null>(null);

  const metadata = SCHEMA_METADATA[schemaType];
  const fieldDescriptions = FIELD_DESCRIPTIONS[schemaType];
  const tokenCount = estimateTokens(narrative);
  const isTooLong = isNarrativeTooLong(narrative);

  const handleParse = useCallback(async () => {
    if (!narrative.trim()) {
      setError('Please enter some text to parse');
      return;
    }

    setIsParsing(true);
    setError(null);

    try {
      const textToParse = isTooLong ? truncateNarrative(narrative) : narrative;

      const response = await fetch('/api/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          narrative: textToParse,
          schemaType,
        }),
      });

      const data: ParseApiResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to parse narrative');
      }

      setParsePreview(data);
    } catch (err) {
      console.error('Parse error:', err);
      setError(err instanceof Error ? err.message : 'Failed to parse narrative');
    } finally {
      setIsParsing(false);
    }
  }, [narrative, schemaType, isTooLong]);

  const handleAcceptParse = useCallback(() => {
    if (parsePreview) {
      const parseResult: ParseResult = {
        data: parsePreview.data,
        confidence: parsePreview.confidence,
        missingRequired: parsePreview.missingRequired,
        parserNotes: parsePreview.parserNotes,
      };
      onParseComplete(parseResult, parsePreview.triage);
    }
  }, [parsePreview, onParseComplete]);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-zinc-100">Parse Narrative</h2>
        <p className="mt-2 text-zinc-400">
          Enter your research narrative and let AI extract structured data
        </p>
        <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-zinc-800 px-3 py-1">
          <span className={`text-lg ${metadata.color}`}>{metadata.icon}</span>
          <span className="text-sm text-zinc-300">{metadata.name}</span>
        </div>
      </div>

      {/* Narrative input */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-zinc-300">
            Research Narrative
          </label>
          <span className={`text-xs ${isTooLong ? 'text-amber-400' : 'text-zinc-500'}`}>
            ~{tokenCount} tokens {isTooLong && '(will be truncated)'}
          </span>
        </div>
        <textarea
          value={narrative}
          onChange={(e) => setNarrative(e.target.value)}
          placeholder="Paste your research narrative, case report, or session transcript here..."
          className="h-64 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-zinc-100 placeholder-zinc-500 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
          disabled={isParsing}
        />
      </div>

      {/* Field hints */}
      <details className="rounded-lg border border-zinc-800 bg-zinc-900/30">
        <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-zinc-300 hover:text-zinc-100">
          View expected fields for {metadata.name}
        </summary>
        <div className="border-t border-zinc-800 px-4 py-3">
          <div className="grid gap-2 text-sm md:grid-cols-2">
            {Object.entries(fieldDescriptions).slice(0, 10).map(([field, description]) => (
              <div key={field} className="flex gap-2">
                <code className="text-violet-400">{field}:</code>
                <span className="text-zinc-400">{description}</span>
              </div>
            ))}
          </div>
        </div>
      </details>

      {/* Error message */}
      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-red-400">
          {error}
        </div>
      )}

      {/* Parse button */}
      {!parsePreview && (
        <div className="flex justify-center">
          <button
            onClick={handleParse}
            disabled={isParsing || !narrative.trim()}
            className="flex items-center gap-3 rounded-lg bg-violet-600 px-8 py-4 font-medium text-white transition-colors hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isParsing ? (
              <>
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Parsing with AI...
              </>
            ) : (
              <>
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                Parse with Claude
              </>
            )}
          </button>
        </div>
      )}

      {/* Parse preview */}
      {parsePreview && (
        <div className="space-y-4 rounded-xl border border-zinc-700 bg-zinc-900/50 p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-zinc-100">Parse Results</h3>
            <span className="text-xs text-zinc-500">
              {parsePreview.usage.inputTokens + parsePreview.usage.outputTokens} tokens used
            </span>
          </div>

          {/* Extracted fields */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-zinc-300">Extracted Fields</h4>
            <div className="grid gap-2 md:grid-cols-2">
              {Object.entries(parsePreview.confidence).slice(0, 12).map(([field, confidence]) => {
                const { label, color } = getConfidenceLevel(confidence);
                return (
                  <div
                    key={field}
                    className="flex items-center justify-between rounded-lg bg-zinc-800/50 px-3 py-2"
                  >
                    <code className="text-xs text-zinc-400">{field}</code>
                    <span className={`text-xs ${color}`}>{label}</span>
                  </div>
                );
              })}
            </div>
            {Object.keys(parsePreview.confidence).length > 12 && (
              <p className="text-xs text-zinc-500">
                +{Object.keys(parsePreview.confidence).length - 12} more fields
              </p>
            )}
          </div>

          {/* Missing required */}
          {parsePreview.missingRequired.length > 0 && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
              <h4 className="text-sm font-medium text-amber-400">Missing Required Fields</h4>
              <p className="mt-1 text-xs text-amber-300/80">
                {parsePreview.missingRequired.join(', ')}
              </p>
            </div>
          )}

          {/* Parser notes */}
          {parsePreview.parserNotes.length > 0 && (
            <div className="rounded-lg bg-zinc-800/50 p-3">
              <h4 className="text-sm font-medium text-zinc-300">Parser Notes</h4>
              <ul className="mt-1 space-y-1 text-xs text-zinc-400">
                {parsePreview.parserNotes.map((note, i) => (
                  <li key={i}>- {note}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Triage preview */}
          <div className="flex items-center gap-4 rounded-lg bg-zinc-800/50 p-3">
            <div className="text-center">
              <div className="text-2xl font-bold text-violet-400">
                {parsePreview.triage.overall}/10
              </div>
              <div className="text-xs text-zinc-500">Triage Score</div>
            </div>
            <div className="flex-1 text-sm text-zinc-400">
              Status:{' '}
              <span className="font-medium capitalize text-zinc-200">
                {parsePreview.triage.status}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={() => setParsePreview(null)}
              className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm font-medium text-zinc-300 hover:bg-zinc-700"
            >
              Re-parse
            </button>
            <button
              onClick={handleAcceptParse}
              className="flex-1 rounded-lg bg-emerald-600 px-4 py-3 text-sm font-medium text-white hover:bg-emerald-500"
            >
              Accept & Continue
            </button>
          </div>
        </div>
      )}

      {/* Navigation buttons */}
      <div className="flex justify-between">
        <button
          onClick={onBack}
          className="rounded-lg border border-zinc-700 bg-zinc-800 px-6 py-3 font-medium text-zinc-300 transition-colors hover:bg-zinc-700"
        >
          Back
        </button>
        {!parsePreview && (
          <button
            onClick={handleParse}
            disabled={isParsing || !narrative.trim()}
            className="rounded-lg bg-violet-600 px-6 py-3 font-medium text-white transition-colors hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Parse Narrative
          </button>
        )}
      </div>
    </div>
  );
}
