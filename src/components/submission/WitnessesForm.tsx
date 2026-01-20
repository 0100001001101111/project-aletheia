'use client';

/**
 * WitnessesForm
 * Step 3: Multi-witness interface with detailed credential tracking
 */

import { useState } from 'react';

export type IdentityType =
  | 'named_public'
  | 'named_professional'
  | 'named_official'
  | 'anonymous_verified'
  | 'anonymous';

export type WitnessRole =
  | 'primary_direct'
  | 'primary_indirect'
  | 'secondary'
  | 'corroborating';

export type VerificationStatus =
  | 'claimed_only'
  | 'documentation_provided'
  | 'independently_verified';

export interface Witness {
  id: string;
  name: string;
  identityType: IdentityType;
  role: WitnessRole;
  profession: string;
  affiliation: string;
  yearsExperience: number | null;
  verificationStatus: VerificationStatus;
  willingToTestify: boolean;
  willingPolygraph: boolean;
  claimSummary: string;
  blindAudit: 'yes' | 'no' | 'unknown';
}

interface WitnessesFormProps {
  witnesses: Witness[];
  onChange: (witnesses: Witness[]) => void;
  onNext: () => void;
  onBack: () => void;
}

const IDENTITY_OPTIONS: Array<{ value: IdentityType; label: string; description: string }> = [
  { value: 'named_public', label: 'Named Public', description: 'Name can be published' },
  { value: 'named_professional', label: 'Named Professional', description: 'Professional credentials claimed' },
  { value: 'named_official', label: 'Named Official', description: 'Government/military official' },
  { value: 'anonymous_verified', label: 'Anonymous Verified', description: 'Identity verified but protected' },
  { value: 'anonymous', label: 'Anonymous', description: 'Identity unknown' },
];

const ROLE_OPTIONS: Array<{ value: WitnessRole; label: string; description: string }> = [
  { value: 'primary_direct', label: 'Primary Direct', description: 'Directly witnessed event' },
  { value: 'primary_indirect', label: 'Primary Indirect', description: 'Involved but didn\'t directly witness' },
  { value: 'secondary', label: 'Secondary', description: 'Heard about event from primary witness' },
  { value: 'corroborating', label: 'Corroborating', description: 'Confirms other testimony' },
];

const VERIFICATION_OPTIONS: Array<{ value: VerificationStatus; label: string; description: string }> = [
  { value: 'claimed_only', label: 'Claimed Only', description: 'Credentials stated but not verified' },
  { value: 'documentation_provided', label: 'Documentation Provided', description: 'Evidence submitted' },
  { value: 'independently_verified', label: 'Independently Verified', description: 'Third-party confirmation' },
];

function createEmptyWitness(): Witness {
  return {
    id: crypto.randomUUID(),
    name: '',
    identityType: 'anonymous',
    role: 'primary_direct',
    profession: '',
    affiliation: '',
    yearsExperience: null,
    verificationStatus: 'claimed_only',
    willingToTestify: false,
    willingPolygraph: false,
    claimSummary: '',
    blindAudit: 'unknown',
  };
}

function WitnessCard({
  witness,
  index,
  onChange,
  onRemove,
  isExpanded,
  onToggle,
}: {
  witness: Witness;
  index: number;
  onChange: (witness: Witness) => void;
  onRemove: () => void;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const updateField = <K extends keyof Witness>(field: K, value: Witness[K]) => {
    onChange({ ...witness, [field]: value });
  };

  return (
    <div className="rounded-xl border border-zinc-700 bg-zinc-900/50 overflow-hidden">
      {/* Header */}
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between p-4 text-left hover:bg-zinc-800/50"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-500/20 text-sm font-medium text-violet-400">
            {index + 1}
          </div>
          <div>
            <div className="font-medium text-zinc-200">
              {witness.name || 'Unnamed Witness'}
            </div>
            <div className="text-sm text-zinc-500">
              {ROLE_OPTIONS.find(r => r.value === witness.role)?.label} ·
              {IDENTITY_OPTIONS.find(i => i.value === witness.identityType)?.label}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {witness.verificationStatus === 'independently_verified' && (
            <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs text-emerald-400">
              Verified
            </span>
          )}
          <svg
            className={`h-5 w-5 text-zinc-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="border-t border-zinc-700 p-4 space-y-4">
          {/* Name and Identity Type */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm text-zinc-400">Name/Identifier</label>
              <input
                type="text"
                value={witness.name}
                onChange={(e) => updateField('name', e.target.value)}
                placeholder="e.g., Dr. John Smith or Witness A"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-violet-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-zinc-400">Identity Type</label>
              <select
                value={witness.identityType}
                onChange={(e) => updateField('identityType', e.target.value as IdentityType)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-violet-500 focus:outline-none"
              >
                {IDENTITY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Role and Verification */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm text-zinc-400">Role</label>
              <select
                value={witness.role}
                onChange={(e) => updateField('role', e.target.value as WitnessRole)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-violet-500 focus:outline-none"
              >
                {ROLE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label} - {opt.description}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm text-zinc-400">Verification Status</label>
              <select
                value={witness.verificationStatus}
                onChange={(e) => updateField('verificationStatus', e.target.value as VerificationStatus)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-violet-500 focus:outline-none"
              >
                {VERIFICATION_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Credentials */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm text-zinc-400">Profession</label>
              <input
                type="text"
                value={witness.profession}
                onChange={(e) => updateField('profession', e.target.value)}
                placeholder="e.g., Physician"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-violet-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-zinc-400">Affiliation</label>
              <input
                type="text"
                value={witness.affiliation}
                onChange={(e) => updateField('affiliation', e.target.value)}
                placeholder="e.g., Hospital Regional"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-violet-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-zinc-400">Years Experience</label>
              <input
                type="number"
                min="0"
                value={witness.yearsExperience ?? ''}
                onChange={(e) => updateField('yearsExperience', e.target.value ? parseInt(e.target.value) : null)}
                placeholder="10"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-violet-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Verification willingness and Blind Audit */}
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-2">
              <input
                type="checkbox"
                checked={witness.willingToTestify}
                onChange={(e) => updateField('willingToTestify', e.target.checked)}
                className="h-4 w-4 rounded border-zinc-600 bg-zinc-700 text-violet-600"
              />
              <span className="text-sm text-zinc-300">Willing to testify</span>
            </label>
            <label className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-2">
              <input
                type="checkbox"
                checked={witness.willingPolygraph}
                onChange={(e) => updateField('willingPolygraph', e.target.checked)}
                className="h-4 w-4 rounded border-zinc-600 bg-zinc-700 text-violet-600"
              />
              <span className="text-sm text-zinc-300">Willing for polygraph</span>
            </label>
            <div>
              <select
                value={witness.blindAudit}
                onChange={(e) => updateField('blindAudit', e.target.value as 'yes' | 'no' | 'unknown')}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-violet-500 focus:outline-none"
              >
                <option value="unknown">Blind audit: Unknown</option>
                <option value="yes">Blind audit: Yes (isolated before testimony)</option>
                <option value="no">Blind audit: No</option>
              </select>
            </div>
          </div>

          {/* Claim Summary */}
          <div>
            <label className="mb-1 block text-sm text-zinc-400">Claim Summary</label>
            <textarea
              value={witness.claimSummary}
              onChange={(e) => updateField('claimSummary', e.target.value)}
              placeholder="Brief description of what this witness claims to have seen/experienced..."
              rows={3}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-violet-500 focus:outline-none"
            />
          </div>

          {/* Remove button */}
          <div className="flex justify-end">
            <button
              onClick={onRemove}
              className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-sm text-red-400 transition-colors hover:bg-red-500/20"
            >
              Remove Witness
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function WitnessesForm({ witnesses, onChange, onNext, onBack }: WitnessesFormProps) {
  const [expandedId, setExpandedId] = useState<string | null>(witnesses[0]?.id || null);

  const addWitness = () => {
    const newWitness = createEmptyWitness();
    onChange([...witnesses, newWitness]);
    setExpandedId(newWitness.id);
  };

  const updateWitness = (index: number, updated: Witness) => {
    const newWitnesses = [...witnesses];
    newWitnesses[index] = updated;
    onChange(newWitnesses);
  };

  const removeWitness = (index: number) => {
    const newWitnesses = witnesses.filter((_, i) => i !== index);
    onChange(newWitnesses);
    if (expandedId === witnesses[index].id) {
      setExpandedId(newWitnesses[0]?.id || null);
    }
  };

  const hasAtLeastOneWitness = witnesses.length > 0 && witnesses.some(w => w.name.trim() || w.claimSummary.trim());

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-zinc-100">Witnesses & Sources</h2>
        <p className="mt-2 text-zinc-400">
          Add details about each witness or source for this investigation
        </p>
      </div>

      {/* Credential verification notice */}
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
        <div className="flex gap-3">
          <svg className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <div className="font-medium text-amber-300">Credential Verification Matters</div>
            <p className="mt-1 text-sm text-zinc-400">
              &quot;Claimed professional&quot; credentials provide minimal score boost.
              &quot;Independently verified&quot; credentials significantly improve your investigation&apos;s quality score.
            </p>
          </div>
        </div>
      </div>

      {/* Witness list */}
      <div className="space-y-3">
        {witnesses.map((witness, index) => (
          <WitnessCard
            key={witness.id}
            witness={witness}
            index={index}
            onChange={(updated) => updateWitness(index, updated)}
            onRemove={() => removeWitness(index)}
            isExpanded={expandedId === witness.id}
            onToggle={() => setExpandedId(expandedId === witness.id ? null : witness.id)}
          />
        ))}
      </div>

      {/* Add witness button */}
      <button
        onClick={addWitness}
        className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-zinc-700 bg-zinc-900/30 p-4 text-zinc-400 transition-colors hover:border-violet-500/50 hover:text-violet-400"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Add {witnesses.length === 0 ? 'First' : 'Another'} Witness
      </button>

      {/* Summary stats */}
      {witnesses.length > 0 && (
        <div className="flex gap-4 text-sm">
          <div className="rounded-lg bg-zinc-800/50 px-3 py-2">
            <span className="text-zinc-400">Total witnesses:</span>{' '}
            <span className="font-medium text-zinc-200">{witnesses.length}</span>
          </div>
          <div className="rounded-lg bg-zinc-800/50 px-3 py-2">
            <span className="text-zinc-400">Primary direct:</span>{' '}
            <span className="font-medium text-zinc-200">
              {witnesses.filter(w => w.role === 'primary_direct').length}
            </span>
          </div>
          <div className="rounded-lg bg-zinc-800/50 px-3 py-2">
            <span className="text-zinc-400">Verified:</span>{' '}
            <span className="font-medium text-emerald-400">
              {witnesses.filter(w => w.verificationStatus === 'independently_verified').length}
            </span>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <button
          onClick={onBack}
          className="rounded-lg border border-zinc-700 bg-zinc-800 px-6 py-3 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-700"
        >
          Back
        </button>
        <button
          onClick={onNext}
          disabled={!hasAtLeastOneWitness}
          className="rounded-lg bg-violet-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-violet-500 disabled:opacity-50"
        >
          {hasAtLeastOneWitness ? 'Continue' : 'Add at least one witness'}
        </button>
      </div>
    </div>
  );
}
