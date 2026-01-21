'use client';

/**
 * DataEditor
 * Step 4: Review and edit parsed data
 */

import { useState, useCallback, useMemo } from 'react';
import type { InvestigationType } from '@/types/database';
import type { ParseResult } from '@/lib/parser';
import { getFieldDescriptions, SCHEMA_METADATA, flattenToDotNotation, getNestedValue, setNestedValue } from '@/schemas';
import { getConfidenceLevel } from '@/lib/parser';

interface DataEditorProps {
  schemaType: InvestigationType;
  parsedData: Record<string, unknown>;
  parseResult: ParseResult | null;
  onDataChange: (data: Record<string, unknown>) => void;
  onNext: () => void;
  onBack: () => void;
}

interface FieldEditorProps {
  field: string;
  value: unknown;
  description: string;
  confidence?: number;
  onChange: (field: string, value: unknown) => void;
}

function FieldEditor({ field, value, description, confidence, onChange }: FieldEditorProps) {
  const [localValue, setLocalValue] = useState(
    value === null || value === undefined ? '' : String(value)
  );
  const [isEditing, setIsEditing] = useState(false);

  const confidenceInfo = confidence !== undefined ? getConfidenceLevel(confidence) : null;

  const handleBlur = useCallback(() => {
    setIsEditing(false);
    // Try to parse as JSON for objects/arrays, otherwise keep as string
    let parsedValue: unknown = localValue;
    if (localValue === '') {
      parsedValue = null;
    } else if (localValue === 'true') {
      parsedValue = true;
    } else if (localValue === 'false') {
      parsedValue = false;
    } else if (!isNaN(Number(localValue)) && localValue.trim() !== '') {
      parsedValue = Number(localValue);
    }
    onChange(field, parsedValue);
  }, [field, localValue, onChange]);

  const fieldName = field.split('.').pop() || field;
  const isNested = field.includes('.');

  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-800/30 p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-zinc-200">
            {fieldName.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
          </label>
          {isNested && (
            <span className="rounded bg-zinc-700 px-1.5 py-0.5 text-xs text-zinc-400">
              {field.split('.').slice(0, -1).join('.')}
            </span>
          )}
        </div>
        {confidenceInfo && (
          <span className={`text-xs ${confidenceInfo.color}`}>
            {confidenceInfo.label} ({Math.round(confidence! * 100)}%)
          </span>
        )}
      </div>

      <p className="mb-2 text-xs text-zinc-500">{description}</p>

      {isEditing ? (
        <input
          type="text"
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={(e) => e.key === 'Enter' && handleBlur()}
          autoFocus
          className="w-full rounded border border-zinc-600 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:border-violet-500 focus:outline-none"
        />
      ) : (
        <div
          onClick={() => setIsEditing(true)}
          className="min-h-[38px] cursor-text rounded border border-zinc-700 bg-zinc-900/50 px-3 py-2 text-sm text-zinc-300 hover:border-zinc-600"
        >
          {localValue || <span className="text-zinc-600">Click to edit...</span>}
        </div>
      )}
    </div>
  );
}

export function DataEditor({
  schemaType,
  parsedData,
  parseResult,
  onDataChange,
  onNext,
  onBack,
}: DataEditorProps) {
  const [editedData, setEditedData] = useState<Record<string, unknown>>(parsedData);
  const [showAllFields, setShowAllFields] = useState(false);

  const metadata = SCHEMA_METADATA[schemaType];
  const fieldDescriptions = getFieldDescriptions(schemaType) || {};
  const confidence = parseResult?.confidence || {};

  // Flatten data for editing
  const flatData = useMemo(() => flattenToDotNotation(editedData), [editedData]);

  // Get all fields (from descriptions) and parsed fields
  const allFields = useMemo(() => {
    const descFields = Object.keys(fieldDescriptions);
    const dataFields = Object.keys(flatData);
    const combined = new Set([...descFields, ...dataFields]);
    return Array.from(combined).sort();
  }, [fieldDescriptions, flatData]);

  // Fields with values or high confidence
  const importantFields = useMemo(() => {
    return allFields.filter((field) => {
      const value = flatData[field];
      const conf = confidence[field];
      return value !== null && value !== undefined && value !== '' || (conf && conf > 0.5);
    });
  }, [allFields, flatData, confidence]);

  const displayFields = showAllFields ? allFields : importantFields;

  const handleFieldChange = useCallback((field: string, value: unknown) => {
    setEditedData((prev) => {
      const newData = { ...prev };
      setNestedValue(newData, field, value);
      return newData;
    });
  }, []);

  const handleSave = useCallback(() => {
    onDataChange(editedData);
    onNext();
  }, [editedData, onDataChange, onNext]);

  // Group fields by category (first part of dot notation)
  const groupedFields = useMemo(() => {
    const groups: Record<string, string[]> = {};
    displayFields.forEach((field) => {
      const category = field.includes('.') ? field.split('.')[0] : 'general';
      if (!groups[category]) groups[category] = [];
      groups[category].push(field);
    });
    return groups;
  }, [displayFields]);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-zinc-100">Review & Edit Data</h2>
        <p className="mt-2 text-zinc-400">
          Review the extracted data and make corrections as needed
        </p>
        <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-zinc-800 px-3 py-1">
          <span className={`text-lg ${metadata.color}`}>{metadata.icon}</span>
          <span className="text-sm text-zinc-300">{metadata.name}</span>
        </div>
      </div>

      {/* Parser notes */}
      {parseResult?.parserNotes && parseResult.parserNotes.length > 0 && (
        <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-4">
          <h4 className="text-sm font-medium text-blue-400">Parser Notes</h4>
          <ul className="mt-2 space-y-1 text-sm text-blue-300/80">
            {parseResult.parserNotes.map((note, i) => (
              <li key={i}>- {note}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Toggle all fields */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-zinc-400">
          Showing {displayFields.length} of {allFields.length} fields
        </span>
        <button
          onClick={() => setShowAllFields(!showAllFields)}
          className="text-sm text-violet-400 hover:text-violet-300"
        >
          {showAllFields ? 'Show important fields only' : 'Show all fields'}
        </button>
      </div>

      {/* Grouped field editors */}
      <div className="space-y-6">
        {Object.entries(groupedFields).map(([category, fields]) => (
          <div key={category} className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
              {category.replace(/_/g, ' ')}
            </h3>
            <div className="grid gap-3 md:grid-cols-2">
              {fields.map((field) => (
                <FieldEditor
                  key={field}
                  field={field}
                  value={getNestedValue(editedData, field)}
                  description={fieldDescriptions[field] || 'No description available'}
                  confidence={confidence[field]}
                  onChange={handleFieldChange}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Missing required fields warning */}
      {parseResult?.missingRequired && parseResult.missingRequired.length > 0 && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
          <h4 className="text-sm font-medium text-amber-400">Missing Required Fields</h4>
          <p className="mt-1 text-sm text-amber-300/80">
            The following required fields are missing:{' '}
            {parseResult.missingRequired.join(', ')}
          </p>
          <p className="mt-2 text-xs text-amber-400/60">
            You can still submit, but the triage score will be affected.
          </p>
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
        <button
          onClick={handleSave}
          className="rounded-lg bg-violet-600 px-6 py-3 font-medium text-white transition-colors hover:bg-violet-500"
        >
          Save & Continue
        </button>
      </div>
    </div>
  );
}
