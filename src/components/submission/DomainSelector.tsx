'use client';

/**
 * DomainSelector
 * Step 1: Select investigation type with "I'm not sure" AI helper
 */

import { useState } from 'react';
import type { InvestigationType } from '@/types/database';
import { SCHEMA_METADATA } from '@/schemas';

interface DomainSelectorProps {
  selected: InvestigationType | null;
  onSelect: (type: InvestigationType) => void;
  onAiClassification?: (result: AiClassificationResult) => void;
}

export interface AiClassificationResult {
  suggestedType: InvestigationType;
  confidence: number;
  reasoning: string;
  alternativeTypes: Array<{
    type: InvestigationType;
    confidence: number;
  }>;
}

const INVESTIGATION_TYPES: InvestigationType[] = [
  'nde',
  'ganzfeld',
  'crisis_apparition',
  'stargate',
  'geophysical',
  'ufo',
];

const DOMAIN_EXAMPLES: Record<InvestigationType, string[]> = {
  nde: [
    'Cardiac arrest survivor with verified perception during clinical death',
    'Out-of-body experience with veridical information',
    'Life review during medical emergency',
  ],
  ganzfeld: [
    'Controlled telepathy experiment with sender/receiver',
    'Psi research with sensory deprivation protocol',
    'Dream telepathy study',
  ],
  crisis_apparition: [
    'Vision of family member at time of their death',
    'Spontaneous appearance of person in crisis',
    'Deathbed apparition witnessed by multiple people',
  ],
  stargate: [
    'Coordinate remote viewing session',
    'Operational remote viewing with feedback',
    'Controlled viewing experiment with blind judging',
  ],
  geophysical: [
    'EMF anomaly measured with calibrated equipment',
    'Temperature fluctuations in controlled environment',
    'Radiation readings correlated with phenomena',
  ],
  ufo: [
    'UAP sighting with multiple witnesses',
    'Close encounter with physical effects',
    'Entity observation with documentation',
  ],
};

export function DomainSelector({ selected, onSelect, onAiClassification }: DomainSelectorProps) {
  const [showNotSure, setShowNotSure] = useState(false);
  const [description, setDescription] = useState('');
  const [isClassifying, setIsClassifying] = useState(false);
  const [aiResult, setAiResult] = useState<AiClassificationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleClassify = async () => {
    if (!description.trim()) {
      setError('Please describe your research first.');
      return;
    }

    setIsClassifying(true);
    setError(null);

    try {
      const response = await fetch('/api/submissions/classify-domain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description }),
      });

      if (!response.ok) {
        throw new Error('Classification failed');
      }

      const result: AiClassificationResult = await response.json();
      setAiResult(result);
      onAiClassification?.(result);
    } catch {
      setError('Failed to classify. Please select a domain manually or try again.');
    } finally {
      setIsClassifying(false);
    }
  };

  const handleSelectFromAi = (type: InvestigationType) => {
    onSelect(type);
    setShowNotSure(false);
    setAiResult(null);
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-zinc-100">
          What type of research are you submitting?
        </h2>
        <p className="mt-2 text-zinc-400">
          Select the domain that best matches your investigation
        </p>
      </div>

      {!showNotSure ? (
        <>
          {/* Domain grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {INVESTIGATION_TYPES.map((type) => {
              const metadata = SCHEMA_METADATA[type];
              const isSelected = selected === type;
              const isBeta = type === 'ufo';

              return (
                <button
                  key={type}
                  onClick={() => onSelect(type)}
                  className={`group relative rounded-xl border p-6 text-left transition-all hover:border-violet-500/50 hover:bg-zinc-800/50 ${
                    isSelected
                      ? 'border-violet-500 bg-violet-500/10'
                      : 'border-zinc-700 bg-zinc-900/50'
                  }`}
                >
                  {/* Beta badge */}
                  {isBeta && (
                    <div className="absolute right-4 top-4 rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-medium text-amber-400">
                      BETA
                    </div>
                  )}

                  {/* Selected indicator */}
                  {isSelected && !isBeta && (
                    <div className="absolute right-4 top-4 flex h-6 w-6 items-center justify-center rounded-full bg-violet-600">
                      <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}

                  {/* Icon */}
                  <div className={`text-4xl mb-3 ${metadata?.color || 'text-zinc-400'}`}>
                    {metadata?.icon || '📋'}
                  </div>

                  {/* Title */}
                  <h3 className="text-lg font-semibold text-zinc-100">
                    {metadata?.name || type}
                  </h3>

                  {/* Description */}
                  <p className="mt-2 text-sm text-zinc-400 line-clamp-2">
                    {metadata?.description || ''}
                  </p>

                  {/* Examples on hover */}
                  <div className="mt-3 hidden group-hover:block">
                    <div className="text-xs text-zinc-500">Examples:</div>
                    <ul className="mt-1 space-y-1 text-xs text-zinc-400">
                      {DOMAIN_EXAMPLES[type]?.slice(0, 2).map((ex, i) => (
                        <li key={i} className="truncate">• {ex}</li>
                      ))}
                    </ul>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Not sure button */}
          <div className="text-center">
            <button
              onClick={() => setShowNotSure(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800/50 px-4 py-2 text-sm text-zinc-300 transition-colors hover:bg-zinc-700"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              I&apos;m not sure / Other
            </button>
          </div>
        </>
      ) : (
        /* AI Classification Mode */
        <div className="rounded-xl border border-zinc-700 bg-zinc-900/50 p-6">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-500/20">
              <svg className="h-5 w-5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-zinc-100">Describe Your Research</h3>
              <p className="text-sm text-zinc-400">AI will suggest the best domain match</p>
            </div>
          </div>

          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe your research in a few sentences. For example: 'I watched a podcast about the Varginha case in Brazil where multiple witnesses reported seeing non-human entities in 1996...'"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-zinc-100 placeholder:text-zinc-500 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
            rows={4}
          />

          {error && (
            <div className="mt-3 rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-400">
              {error}
            </div>
          )}

          {/* AI Result */}
          {aiResult && (
            <div className="mt-4 space-y-3">
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{SCHEMA_METADATA[aiResult.suggestedType]?.icon}</span>
                    <div>
                      <div className="font-medium text-emerald-300">
                        Suggested: {SCHEMA_METADATA[aiResult.suggestedType]?.name}
                      </div>
                      <div className="text-sm text-zinc-400">
                        {(aiResult.confidence * 100).toFixed(0)}% confidence
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleSelectFromAi(aiResult.suggestedType)}
                    className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-500"
                  >
                    Use This
                  </button>
                </div>
                <p className="mt-2 text-sm text-zinc-400">{aiResult.reasoning}</p>
              </div>

              {aiResult.alternativeTypes.length > 0 && (
                <div className="space-y-2">
                  <div className="text-sm text-zinc-500">Other possibilities:</div>
                  {aiResult.alternativeTypes.map((alt) => (
                    <button
                      key={alt.type}
                      onClick={() => handleSelectFromAi(alt.type)}
                      className="flex w-full items-center justify-between rounded-lg border border-zinc-700 bg-zinc-800/50 p-3 text-left transition-colors hover:border-zinc-600"
                    >
                      <div className="flex items-center gap-2">
                        <span>{SCHEMA_METADATA[alt.type]?.icon}</span>
                        <span className="text-zinc-200">{SCHEMA_METADATA[alt.type]?.name}</span>
                      </div>
                      <span className="text-sm text-zinc-500">
                        {(alt.confidence * 100).toFixed(0)}%
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="mt-4 flex gap-3">
            <button
              onClick={() => {
                setShowNotSure(false);
                setAiResult(null);
                setDescription('');
              }}
              className="rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm text-zinc-300 transition-colors hover:bg-zinc-700"
            >
              Back to List
            </button>
            <button
              onClick={handleClassify}
              disabled={isClassifying || !description.trim()}
              className="flex-1 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-violet-500 disabled:opacity-50"
            >
              {isClassifying ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Classifying...
                </span>
              ) : (
                'Suggest Domain'
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
