'use client';

/**
 * EvidenceForm
 * Step 5: Evidence attachment with categorization and weight display
 */

import { useState } from 'react';

export type EvidenceType = 'document' | 'image' | 'video' | 'audio' | 'url' | 'data_file';

export type EvidenceCategory =
  | 'contemporary_official'
  | 'contemporary_news'
  | 'contemporary_photo_video'
  | 'later_testimony_video'
  | 'later_testimony_written'
  | 'foia_document'
  | 'academic_paper'
  | 'other';

export interface EvidenceItem {
  id: string;
  type: EvidenceType;
  category: EvidenceCategory;
  title: string;
  description: string;
  sourceDate: string;
  daysFromEvent: number | null;
  sourceAttribution: string;
  isPrimarySource: boolean;
  independentlyVerified: boolean;
  file?: File;
  url?: string;
  transcript?: string;
}

interface EvidenceFormProps {
  evidence: EvidenceItem[];
  eventDate: string;
  onChange: (evidence: EvidenceItem[]) => void;
  onNext: () => void;
  onBack: () => void;
}

const EVIDENCE_TYPES: Array<{ value: EvidenceType; label: string; icon: string }> = [
  { value: 'document', label: 'Document', icon: '📄' },
  { value: 'image', label: 'Image', icon: '🖼️' },
  { value: 'video', label: 'Video', icon: '🎥' },
  { value: 'audio', label: 'Audio', icon: '🎵' },
  { value: 'url', label: 'URL Link', icon: '🔗' },
  { value: 'data_file', label: 'Data File', icon: '📊' },
];

const EVIDENCE_CATEGORIES: Array<{ value: EvidenceCategory; label: string; weight: number; description: string }> = [
  { value: 'contemporary_official', label: 'Contemporary Official', weight: 1.0, description: 'Police report, military record from event date' },
  { value: 'contemporary_news', label: 'Contemporary News', weight: 0.9, description: 'News article within 7 days of event' },
  { value: 'contemporary_photo_video', label: 'Contemporary Photo/Video', weight: 0.85, description: 'Visual media from event' },
  { value: 'foia_document', label: 'FOIA Document', weight: 0.7, description: 'Government response to FOIA request' },
  { value: 'academic_paper', label: 'Academic Paper', weight: 0.8, description: 'Peer-reviewed analysis' },
  { value: 'later_testimony_video', label: 'Later Testimony (Video)', weight: 0.6, description: 'Documentary interview 10+ years later' },
  { value: 'later_testimony_written', label: 'Later Testimony (Written)', weight: 0.5, description: 'Book account, written statement' },
  { value: 'other', label: 'Other', weight: 0.3, description: 'Other supporting material' },
];

const ACCEPTED_FILE_TYPES = {
  document: '.pdf,.doc,.docx,.txt',
  image: '.jpg,.jpeg,.png,.gif,.webp',
  video: '.mp4,.mov,.avi,.webm',
  audio: '.mp3,.wav,.m4a,.ogg',
  data_file: '.csv,.json,.xlsx',
};

function createEmptyEvidence(): EvidenceItem {
  return {
    id: crypto.randomUUID(),
    type: 'document',
    category: 'other',
    title: '',
    description: '',
    sourceDate: '',
    daysFromEvent: null,
    sourceAttribution: '',
    isPrimarySource: false,
    independentlyVerified: false,
  };
}

function calculateDaysFromEvent(eventDate: string, sourceDate: string): number | null {
  if (!eventDate || !sourceDate) return null;
  const event = new Date(eventDate);
  const source = new Date(sourceDate);
  const diffTime = source.getTime() - event.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

function EvidenceCard({
  item,
  index,
  eventDate,
  onChange,
  onRemove,
  isExpanded,
  onToggle,
}: {
  item: EvidenceItem;
  index: number;
  eventDate: string;
  onChange: (item: EvidenceItem) => void;
  onRemove: () => void;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const updateField = <K extends keyof EvidenceItem>(field: K, value: EvidenceItem[K]) => {
    const updated = { ...item, [field]: value };

    // Auto-calculate days from event when source date changes
    if (field === 'sourceDate') {
      updated.daysFromEvent = calculateDaysFromEvent(eventDate, value as string);
    }

    onChange(updated);
  };

  const category = EVIDENCE_CATEGORIES.find(c => c.value === item.category);
  const type = EVIDENCE_TYPES.find(t => t.value === item.type);

  return (
    <div className="rounded-xl border border-zinc-700 bg-zinc-900/50 overflow-hidden">
      {/* Header */}
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between p-4 text-left hover:bg-zinc-800/50"
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">{type?.icon || '📎'}</span>
          <div>
            <div className="font-medium text-zinc-200">
              {item.title || 'Untitled Evidence'}
            </div>
            <div className="flex items-center gap-2 text-sm text-zinc-500">
              <span>{category?.label}</span>
              <span className="rounded bg-zinc-700 px-1.5 py-0.5 text-xs">
                {category?.weight}x weight
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {item.isPrimarySource && (
            <span className="rounded-full bg-violet-500/20 px-2 py-0.5 text-xs text-violet-400">
              Primary
            </span>
          )}
          {item.independentlyVerified && (
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
          {/* Type and Category */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm text-zinc-400">Evidence Type</label>
              <div className="flex flex-wrap gap-2">
                {EVIDENCE_TYPES.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => updateField('type', t.value)}
                    className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                      item.type === t.value
                        ? 'border-violet-500 bg-violet-500/20 text-violet-300'
                        : 'border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-600'
                    }`}
                  >
                    {t.icon} {t.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm text-zinc-400">Category</label>
              <select
                value={item.category}
                onChange={(e) => updateField('category', e.target.value as EvidenceCategory)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-violet-500 focus:outline-none"
              >
                {EVIDENCE_CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label} ({cat.weight}x)
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-zinc-500">{category?.description}</p>
            </div>
          </div>

          {/* Title and Attribution */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm text-zinc-400">Title</label>
              <input
                type="text"
                value={item.title}
                onChange={(e) => updateField('title', e.target.value)}
                placeholder="e.g., Police Report #12345"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-violet-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-zinc-400">Source Attribution</label>
              <input
                type="text"
                value={item.sourceAttribution}
                onChange={(e) => updateField('sourceAttribution', e.target.value)}
                placeholder="e.g., Varginha Police Department"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-violet-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Source Date */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm text-zinc-400">Source Date</label>
              <input
                type="date"
                value={item.sourceDate}
                onChange={(e) => updateField('sourceDate', e.target.value)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-violet-500 focus:outline-none"
              />
            </div>
            <div className="flex items-end">
              {item.daysFromEvent !== null && (
                <div className={`rounded-lg border px-4 py-2 ${
                  item.daysFromEvent <= 7
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                    : item.daysFromEvent <= 30
                      ? 'border-amber-500/30 bg-amber-500/10 text-amber-400'
                      : 'border-zinc-700 bg-zinc-800 text-zinc-400'
                }`}>
                  <span className="text-sm">
                    {item.daysFromEvent === 0
                      ? 'Same day as event'
                      : item.daysFromEvent > 0
                        ? `${item.daysFromEvent} days after event`
                        : `${Math.abs(item.daysFromEvent)} days before event`}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* File/URL input based on type */}
          {item.type === 'url' ? (
            <div>
              <label className="mb-1 block text-sm text-zinc-400">URL</label>
              <input
                type="url"
                value={item.url || ''}
                onChange={(e) => updateField('url', e.target.value)}
                placeholder="https://..."
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-violet-500 focus:outline-none"
              />
            </div>
          ) : (
            <div>
              <label className="mb-1 block text-sm text-zinc-400">Upload File</label>
              <input
                type="file"
                accept={ACCEPTED_FILE_TYPES[item.type] || '*'}
                onChange={(e) => updateField('file', e.target.files?.[0])}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 file:mr-4 file:rounded file:border-0 file:bg-violet-600 file:px-3 file:py-1 file:text-sm file:text-white focus:border-violet-500 focus:outline-none"
              />
              {item.file && (
                <p className="mt-1 text-xs text-zinc-500">Selected: {item.file.name}</p>
              )}
            </div>
          )}

          {/* Description */}
          <div>
            <label className="mb-1 block text-sm text-zinc-400">Description</label>
            <textarea
              value={item.description}
              onChange={(e) => updateField('description', e.target.value)}
              placeholder="Brief description of this evidence..."
              rows={2}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-violet-500 focus:outline-none"
            />
          </div>

          {/* Checkboxes */}
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={item.isPrimarySource}
                onChange={(e) => updateField('isPrimarySource', e.target.checked)}
                className="h-4 w-4 rounded border-zinc-600 bg-zinc-700 text-violet-600"
              />
              <span className="text-sm text-zinc-300">Primary source</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={item.independentlyVerified}
                onChange={(e) => updateField('independentlyVerified', e.target.checked)}
                className="h-4 w-4 rounded border-zinc-600 bg-zinc-700 text-violet-600"
              />
              <span className="text-sm text-zinc-300">Independently verified</span>
            </label>
          </div>

          {/* Remove button */}
          <div className="flex justify-end">
            <button
              onClick={onRemove}
              className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-sm text-red-400 transition-colors hover:bg-red-500/20"
            >
              Remove Evidence
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function EvidenceForm({ evidence, eventDate, onChange, onNext, onBack }: EvidenceFormProps) {
  const [expandedId, setExpandedId] = useState<string | null>(evidence[0]?.id || null);

  const addEvidence = () => {
    const newItem = createEmptyEvidence();
    onChange([...evidence, newItem]);
    setExpandedId(newItem.id);
  };

  const updateEvidence = (index: number, updated: EvidenceItem) => {
    const newEvidence = [...evidence];
    newEvidence[index] = updated;
    onChange(newEvidence);
  };

  const removeEvidence = (index: number) => {
    const newEvidence = evidence.filter((_, i) => i !== index);
    onChange(newEvidence);
    if (expandedId === evidence[index].id) {
      setExpandedId(newEvidence[0]?.id || null);
    }
  };

  // Calculate average weight
  const avgWeight = evidence.length > 0
    ? evidence.reduce((sum, item) => {
        const cat = EVIDENCE_CATEGORIES.find(c => c.value === item.category);
        return sum + (cat?.weight || 0.3);
      }, 0) / evidence.length
    : 0;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-zinc-100">Evidence Attachment</h2>
        <p className="mt-2 text-zinc-400">
          Attach supporting documents, media, and links
        </p>
      </div>

      {/* Weight guide */}
      <div className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-4">
        <h4 className="text-sm font-medium text-zinc-300 mb-2">Evidence Weight Guide</h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <div className="flex justify-between">
            <span className="text-zinc-500">Contemporary official</span>
            <span className="text-emerald-400">1.0x</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500">Contemporary news</span>
            <span className="text-emerald-400">0.9x</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500">Photo/video</span>
            <span className="text-emerald-400">0.85x</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500">Academic paper</span>
            <span className="text-cyan-400">0.8x</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500">FOIA document</span>
            <span className="text-cyan-400">0.7x</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500">Later testimony (video)</span>
            <span className="text-amber-400">0.6x</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500">Later testimony (written)</span>
            <span className="text-amber-400">0.5x</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500">Other</span>
            <span className="text-zinc-400">0.3x</span>
          </div>
        </div>
      </div>

      {/* Evidence list */}
      <div className="space-y-3">
        {evidence.map((item, index) => (
          <EvidenceCard
            key={item.id}
            item={item}
            index={index}
            eventDate={eventDate}
            onChange={(updated) => updateEvidence(index, updated)}
            onRemove={() => removeEvidence(index)}
            isExpanded={expandedId === item.id}
            onToggle={() => setExpandedId(expandedId === item.id ? null : item.id)}
          />
        ))}
      </div>

      {/* Add evidence button */}
      <button
        onClick={addEvidence}
        className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-zinc-700 bg-zinc-900/30 p-4 text-zinc-400 transition-colors hover:border-violet-500/50 hover:text-violet-400"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Add {evidence.length === 0 ? 'First' : 'More'} Evidence
      </button>

      {/* Summary stats */}
      {evidence.length > 0 && (
        <div className="flex gap-4 text-sm">
          <div className="rounded-lg bg-zinc-800/50 px-3 py-2">
            <span className="text-zinc-400">Total pieces:</span>{' '}
            <span className="font-medium text-zinc-200">{evidence.length}</span>
          </div>
          <div className="rounded-lg bg-zinc-800/50 px-3 py-2">
            <span className="text-zinc-400">Primary sources:</span>{' '}
            <span className="font-medium text-violet-400">
              {evidence.filter(e => e.isPrimarySource).length}
            </span>
          </div>
          <div className="rounded-lg bg-zinc-800/50 px-3 py-2">
            <span className="text-zinc-400">Avg weight:</span>{' '}
            <span className={`font-medium ${avgWeight >= 0.7 ? 'text-emerald-400' : avgWeight >= 0.5 ? 'text-amber-400' : 'text-zinc-400'}`}>
              {avgWeight.toFixed(2)}x
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
          className="rounded-lg bg-violet-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-violet-500"
        >
          Continue to Score Preview
        </button>
      </div>
    </div>
  );
}
