'use client';

/**
 * UAP_FieldsForm
 * Step 4: UAP/Encounter domain-specific fields
 */

export type EncounterType =
  | 'distant_sighting'
  | 'close_sighting'
  | 'close_encounter'
  | 'direct_interaction'
  | 'abduction_claim';

export type EntityBehavior =
  | 'non_aggressive'
  | 'appeared_distressed'
  | 'communication_attempt'
  | 'aggressive'
  | 'indifferent';

export type CommunicationType =
  | 'verbal'
  | 'telepathic'
  | 'gesture'
  | 'none_observed';

export interface EntityDetails {
  count: '1' | '2-5' | '6+' | 'unknown';
  headShape: string;
  eyeDescription: string;
  skinDescription: string;
  otherFeatures: string;
  behavior: EntityBehavior;
  communicationType: CommunicationType;
}

export interface PhysicalEffects {
  onWitnesses: string[];
  environmental: string[];
}

export type CraftAssociation =
  | 'observed_separate_witnesses'
  | 'observed_same_witnesses'
  | 'not_observed'
  | 'unknown';

export interface OfficialResponse {
  militaryPresence: boolean;
  areaCordoned: boolean;
  witnessesContacted: boolean;
  foiaRequested: boolean;
  foiaDenied: boolean;
}

export interface UAPDomainData {
  encounterType: EncounterType;
  entityObserved: boolean;
  entityDetails: EntityDetails;
  physicalEffects: PhysicalEffects;
  craftAssociation: CraftAssociation;
  officialResponse: OfficialResponse;
}

interface UAP_FieldsFormProps {
  data: UAPDomainData;
  onChange: (data: UAPDomainData) => void;
  onNext: () => void;
  onBack: () => void;
}

const ENCOUNTER_TYPES: Array<{ value: EncounterType; label: string; description: string }> = [
  { value: 'distant_sighting', label: 'Distant Sighting', description: '>500m away' },
  { value: 'close_sighting', label: 'Close Sighting', description: '<500m away' },
  { value: 'close_encounter', label: 'Close Encounter', description: 'Entity interaction' },
  { value: 'direct_interaction', label: 'Direct Interaction', description: 'Communication/contact' },
  { value: 'abduction_claim', label: 'Abduction Claim', description: 'Alleged abduction' },
];

const WITNESS_EFFECTS = [
  'Injury/illness',
  'Temporary paralysis',
  'Missing time',
  'Long-term psychological',
  'Nausea',
  'Headache',
  'Skin irritation',
  'None',
];

const ENVIRONMENTAL_EFFECTS = [
  'EM interference',
  'Vehicle malfunction',
  'Unusual odor',
  'Temperature anomaly',
  'Animal reaction',
  'Compass deviation',
  'None',
];

const BEHAVIOR_OPTIONS: Array<{ value: EntityBehavior; label: string }> = [
  { value: 'non_aggressive', label: 'Non-aggressive' },
  { value: 'appeared_distressed', label: 'Appeared distressed' },
  { value: 'communication_attempt', label: 'Communication attempt' },
  { value: 'aggressive', label: 'Aggressive' },
  { value: 'indifferent', label: 'Indifferent' },
];

const COMMUNICATION_OPTIONS: Array<{ value: CommunicationType; label: string }> = [
  { value: 'verbal', label: 'Verbal' },
  { value: 'telepathic', label: 'Telepathic/eye contact' },
  { value: 'gesture', label: 'Gesture' },
  { value: 'none_observed', label: 'None observed' },
];

const CRAFT_OPTIONS: Array<{ value: CraftAssociation; label: string }> = [
  { value: 'observed_separate_witnesses', label: 'Observed by separate witnesses' },
  { value: 'observed_same_witnesses', label: 'Observed by same witnesses' },
  { value: 'not_observed', label: 'Not observed' },
  { value: 'unknown', label: 'Unknown' },
];

export const createEmptyUAPData = (): UAPDomainData => ({
  encounterType: 'distant_sighting',
  entityObserved: false,
  entityDetails: {
    count: 'unknown',
    headShape: '',
    eyeDescription: '',
    skinDescription: '',
    otherFeatures: '',
    behavior: 'non_aggressive',
    communicationType: 'none_observed',
  },
  physicalEffects: {
    onWitnesses: [],
    environmental: [],
  },
  craftAssociation: 'unknown',
  officialResponse: {
    militaryPresence: false,
    areaCordoned: false,
    witnessesContacted: false,
    foiaRequested: false,
    foiaDenied: false,
  },
});

export function UAP_FieldsForm({ data, onChange, onNext, onBack }: UAP_FieldsFormProps) {
  const updateField = <K extends keyof UAPDomainData>(field: K, value: UAPDomainData[K]) => {
    onChange({ ...data, [field]: value });
  };

  const updateEntityDetails = <K extends keyof EntityDetails>(field: K, value: EntityDetails[K]) => {
    onChange({
      ...data,
      entityDetails: { ...data.entityDetails, [field]: value },
    });
  };

  const toggleWitnessEffect = (effect: string) => {
    const current = data.physicalEffects.onWitnesses;
    const updated = current.includes(effect)
      ? current.filter(e => e !== effect)
      : [...current, effect];
    onChange({
      ...data,
      physicalEffects: { ...data.physicalEffects, onWitnesses: updated },
    });
  };

  const toggleEnvironmentalEffect = (effect: string) => {
    const current = data.physicalEffects.environmental;
    const updated = current.includes(effect)
      ? current.filter(e => e !== effect)
      : [...current, effect];
    onChange({
      ...data,
      physicalEffects: { ...data.physicalEffects, environmental: updated },
    });
  };

  const toggleOfficialResponse = (field: keyof OfficialResponse) => {
    onChange({
      ...data,
      officialResponse: { ...data.officialResponse, [field]: !data.officialResponse[field] },
    });
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-zinc-100">UAP/Encounter Details</h2>
        <p className="mt-2 text-zinc-400">
          Provide specific details about the encounter
        </p>
      </div>

      {/* Encounter Type */}
      <div>
        <label className="mb-2 block text-sm font-medium text-zinc-200">Encounter Type</label>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {ENCOUNTER_TYPES.map((type) => (
            <button
              key={type.value}
              onClick={() => updateField('encounterType', type.value)}
              className={`rounded-lg border p-3 text-left transition-colors ${
                data.encounterType === type.value
                  ? 'border-violet-500 bg-violet-500/10'
                  : 'border-zinc-700 bg-zinc-800/50 hover:border-zinc-600'
              }`}
            >
              <div className="font-medium text-zinc-200">{type.label}</div>
              <div className="text-xs text-zinc-500">{type.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Entity Observed Toggle */}
      <div className="rounded-xl border border-zinc-700 bg-zinc-900/50 p-4">
        <label className="flex items-center justify-between">
          <div>
            <div className="font-medium text-zinc-200">Entity/Being Observed?</div>
            <div className="text-sm text-zinc-500">Were non-human entities observed during this encounter?</div>
          </div>
          <button
            onClick={() => updateField('entityObserved', !data.entityObserved)}
            className={`relative h-6 w-11 rounded-full transition-colors ${
              data.entityObserved ? 'bg-violet-600' : 'bg-zinc-600'
            }`}
          >
            <div
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                data.entityObserved ? 'translate-x-5' : 'translate-x-0.5'
              }`}
            />
          </button>
        </label>
      </div>

      {/* Entity Details (if observed) */}
      {data.entityObserved && (
        <div className="rounded-xl border border-violet-500/30 bg-violet-500/5 p-4 space-y-4">
          <h3 className="font-medium text-violet-300">Entity Details</h3>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm text-zinc-400">Entity Count</label>
              <select
                value={data.entityDetails.count}
                onChange={(e) => updateEntityDetails('count', e.target.value as EntityDetails['count'])}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-violet-500 focus:outline-none"
              >
                <option value="1">1 entity</option>
                <option value="2-5">2-5 entities</option>
                <option value="6+">6+ entities</option>
                <option value="unknown">Unknown</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm text-zinc-400">Behavior</label>
              <select
                value={data.entityDetails.behavior}
                onChange={(e) => updateEntityDetails('behavior', e.target.value as EntityBehavior)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-violet-500 focus:outline-none"
              >
                {BEHAVIOR_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm text-zinc-400">Head Shape</label>
              <input
                type="text"
                value={data.entityDetails.headShape}
                onChange={(e) => updateEntityDetails('headShape', e.target.value)}
                placeholder="e.g., Large, oval-shaped"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-violet-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-zinc-400">Eye Description</label>
              <input
                type="text"
                value={data.entityDetails.eyeDescription}
                onChange={(e) => updateEntityDetails('eyeDescription', e.target.value)}
                placeholder="e.g., Large, red, almond-shaped"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-violet-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm text-zinc-400">Skin Description</label>
              <input
                type="text"
                value={data.entityDetails.skinDescription}
                onChange={(e) => updateEntityDetails('skinDescription', e.target.value)}
                placeholder="e.g., Brown, oily appearance"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-violet-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-zinc-400">Communication Type</label>
              <select
                value={data.entityDetails.communicationType}
                onChange={(e) => updateEntityDetails('communicationType', e.target.value as CommunicationType)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-violet-500 focus:outline-none"
              >
                {COMMUNICATION_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm text-zinc-400">Other Features</label>
            <textarea
              value={data.entityDetails.otherFeatures}
              onChange={(e) => updateEntityDetails('otherFeatures', e.target.value)}
              placeholder="Any other notable physical characteristics..."
              rows={2}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-violet-500 focus:outline-none"
            />
          </div>
        </div>
      )}

      {/* Physical Effects */}
      <div className="space-y-4">
        <h3 className="font-medium text-zinc-200">Physical Effects</h3>

        <div>
          <label className="mb-2 block text-sm text-zinc-400">On Witnesses</label>
          <div className="flex flex-wrap gap-2">
            {WITNESS_EFFECTS.map((effect) => (
              <button
                key={effect}
                onClick={() => toggleWitnessEffect(effect)}
                className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                  data.physicalEffects.onWitnesses.includes(effect)
                    ? 'border-amber-500/50 bg-amber-500/20 text-amber-300'
                    : 'border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-600'
                }`}
              >
                {effect}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm text-zinc-400">Environmental</label>
          <div className="flex flex-wrap gap-2">
            {ENVIRONMENTAL_EFFECTS.map((effect) => (
              <button
                key={effect}
                onClick={() => toggleEnvironmentalEffect(effect)}
                className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                  data.physicalEffects.environmental.includes(effect)
                    ? 'border-cyan-500/50 bg-cyan-500/20 text-cyan-300'
                    : 'border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-600'
                }`}
              >
                {effect}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Craft Association */}
      <div>
        <label className="mb-2 block text-sm font-medium text-zinc-200">Associated Craft</label>
        <div className="grid gap-2 sm:grid-cols-2">
          {CRAFT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => updateField('craftAssociation', opt.value)}
              className={`rounded-lg border p-3 text-left text-sm transition-colors ${
                data.craftAssociation === opt.value
                  ? 'border-violet-500 bg-violet-500/10 text-zinc-200'
                  : 'border-zinc-700 bg-zinc-800/50 text-zinc-400 hover:border-zinc-600'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Official Response */}
      <div>
        <label className="mb-2 block text-sm font-medium text-zinc-200">Official Response</label>
        <div className="grid gap-2 sm:grid-cols-2">
          {[
            { key: 'militaryPresence', label: 'Military/government presence' },
            { key: 'areaCordoned', label: 'Area cordoned off' },
            { key: 'witnessesContacted', label: 'Witnesses contacted by officials' },
            { key: 'foiaRequested', label: 'FOIA requested' },
            { key: 'foiaDenied', label: 'FOIA denied/redacted' },
          ].map(({ key, label }) => (
            <label
              key={key}
              className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-2 cursor-pointer hover:bg-zinc-800"
            >
              <input
                type="checkbox"
                checked={data.officialResponse[key as keyof OfficialResponse]}
                onChange={() => toggleOfficialResponse(key as keyof OfficialResponse)}
                className="h-4 w-4 rounded border-zinc-600 bg-zinc-700 text-violet-600"
              />
              <span className="text-sm text-zinc-300">{label}</span>
            </label>
          ))}
        </div>
      </div>

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
          className="rounded-lg bg-violet-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-violet-500"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
