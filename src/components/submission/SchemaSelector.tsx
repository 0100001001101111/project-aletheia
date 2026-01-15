'use client';

/**
 * SchemaSelector
 * Step 1: Select investigation type
 */

import type { InvestigationType } from '@/types/database';
import { SCHEMA_METADATA } from '@/schemas';

interface SchemaSelectorProps {
  selected: InvestigationType | null;
  onSelect: (type: InvestigationType) => void;
}

const INVESTIGATION_TYPES: InvestigationType[] = [
  'nde',
  'ganzfeld',
  'crisis_apparition',
  'stargate',
  'geophysical',
];

export function SchemaSelector({ selected, onSelect }: SchemaSelectorProps) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-zinc-100">
          Select Investigation Type
        </h2>
        <p className="mt-2 text-zinc-400">
          Choose the type of research data you want to submit
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {INVESTIGATION_TYPES.map((type) => {
          const metadata = SCHEMA_METADATA[type];
          const isSelected = selected === type;

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
              {/* Selected indicator */}
              {isSelected && (
                <div className="absolute right-4 top-4 flex h-6 w-6 items-center justify-center rounded-full bg-violet-600">
                  <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}

              {/* Icon */}
              <div className={`text-4xl mb-4 ${metadata.color}`}>
                {metadata.icon}
              </div>

              {/* Title */}
              <h3 className="text-lg font-semibold text-zinc-100">
                {metadata.name}
              </h3>

              {/* Description */}
              <p className="mt-2 text-sm text-zinc-400">
                {metadata.description}
              </p>

              {/* Schema type badge */}
              <div className="mt-4">
                <span className="inline-block rounded-full bg-zinc-800 px-3 py-1 text-xs font-medium text-zinc-300">
                  {type.replace('_', ' ')}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Help text */}
      <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-4">
        <h4 className="text-sm font-medium text-zinc-300">
          Not sure which type to choose?
        </h4>
        <ul className="mt-2 space-y-1 text-sm text-zinc-400">
          <li>
            <strong className="text-purple-400">NDE:</strong> Near-death experiences, cardiac arrest survivor reports, OBEs
          </li>
          <li>
            <strong className="text-blue-400">Ganzfeld:</strong> Controlled telepathy experiments with sensory deprivation
          </li>
          <li>
            <strong className="text-emerald-400">Crisis Apparition:</strong> Spontaneous apparitions coinciding with death/crisis
          </li>
          <li>
            <strong className="text-amber-400">Remote Viewing:</strong> Coordinate remote viewing, operational or research sessions
          </li>
          <li>
            <strong className="text-cyan-400">Geophysical:</strong> EMF, temperature, radiation, and other instrument readings
          </li>
        </ul>
      </div>
    </div>
  );
}
