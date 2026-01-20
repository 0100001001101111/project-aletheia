'use client';

/**
 * BasicInfoForm
 * Step 2: Basic investigation information with coordinate auto-detection
 */

import { useState, useCallback } from 'react';
import { InfoTooltip, FIELD_HELP_TOOLTIPS } from '@/components/ui/Tooltip';

export interface BasicInfoData {
  title: string;
  eventDate: string;
  eventDateApproximate: boolean;
  eventLocation: string;
  latitude: number | null;
  longitude: number | null;
  summary: string;
}

interface BasicInfoFormProps {
  data: BasicInfoData;
  onChange: (data: BasicInfoData) => void;
  onNext: () => void;
  onBack: () => void;
  isLoadingEnvironmental?: boolean;
}

interface GeocodingResult {
  lat: number;
  lon: number;
  display_name: string;
}

export function BasicInfoForm({
  data,
  onChange,
  onNext,
  onBack,
  isLoadingEnvironmental,
}: BasicInfoFormProps) {
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [geocodeError, setGeocodeError] = useState<string | null>(null);

  const updateField = <K extends keyof BasicInfoData>(field: K, value: BasicInfoData[K]) => {
    onChange({ ...data, [field]: value });
  };

  const handleGeocode = useCallback(async () => {
    if (!data.eventLocation.trim()) {
      setGeocodeError('Please enter a location first.');
      return;
    }

    setIsGeocoding(true);
    setGeocodeError(null);

    try {
      // Using OpenStreetMap Nominatim API (free, no API key required)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(data.eventLocation)}&limit=1`,
        {
          headers: {
            'User-Agent': 'ProjectAletheia/1.0',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Geocoding failed');
      }

      const results: GeocodingResult[] = await response.json();

      if (results.length === 0) {
        setGeocodeError('Location not found. Try being more specific or enter coordinates manually.');
        return;
      }

      const result = results[0];
      onChange({
        ...data,
        latitude: parseFloat(result.lat.toFixed(7)),
        longitude: parseFloat(result.lon.toFixed(7)),
      });
    } catch {
      setGeocodeError('Failed to geocode location. Please enter coordinates manually.');
    } finally {
      setIsGeocoding(false);
    }
  }, [data, onChange]);

  const canProceed =
    data.title.trim() &&
    data.eventDate &&
    data.eventLocation.trim() &&
    data.summary.trim() &&
    data.summary.length >= 50;

  const summaryCharCount = data.summary.length;
  const summaryValid = summaryCharCount >= 50;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-zinc-100">Basic Information</h2>
        <p className="mt-2 text-zinc-400">
          Provide the core details about your investigation
        </p>
      </div>

      <div className="space-y-5">
        {/* Title */}
        <div>
          <label htmlFor="title" className="mb-2 flex items-center gap-1 text-sm font-medium text-zinc-200">
            Investigation Title <span className="text-red-400">*</span>
            <InfoTooltip text={FIELD_HELP_TOOLTIPS.title} />
          </label>
          <input
            id="title"
            type="text"
            value={data.title}
            onChange={(e) => updateField('title', e.target.value)}
            placeholder="e.g., Varginha Entity Encounter - January 1996"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-zinc-100 placeholder:text-zinc-500 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
          />
        </div>

        {/* Event Date */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="eventDate" className="mb-2 flex items-center gap-1 text-sm font-medium text-zinc-200">
              Event Date <span className="text-red-400">*</span>
              <InfoTooltip text={FIELD_HELP_TOOLTIPS.eventDate} />
            </label>
            <input
              id="eventDate"
              type="date"
              value={data.eventDate}
              onChange={(e) => updateField('eventDate', e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-zinc-100 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
            />
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800/50 px-4 py-3">
              <input
                type="checkbox"
                checked={data.eventDateApproximate}
                onChange={(e) => updateField('eventDateApproximate', e.target.checked)}
                className="h-4 w-4 rounded border-zinc-600 bg-zinc-700 text-violet-600 focus:ring-violet-500"
              />
              <span className="text-sm text-zinc-300">Approximate date</span>
            </label>
          </div>
        </div>

        {/* Location */}
        <div>
          <label htmlFor="eventLocation" className="mb-2 flex items-center gap-1 text-sm font-medium text-zinc-200">
            Event Location <span className="text-red-400">*</span>
            <InfoTooltip text={FIELD_HELP_TOOLTIPS.location} />
          </label>
          <div className="flex gap-2">
            <input
              id="eventLocation"
              type="text"
              value={data.eventLocation}
              onChange={(e) => updateField('eventLocation', e.target.value)}
              placeholder="e.g., Varginha, Minas Gerais, Brazil"
              className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-zinc-100 placeholder:text-zinc-500 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
            />
            <button
              onClick={handleGeocode}
              disabled={isGeocoding || !data.eventLocation.trim()}
              className="rounded-lg bg-zinc-700 px-4 py-3 text-sm font-medium text-zinc-200 transition-colors hover:bg-zinc-600 disabled:opacity-50"
            >
              {isGeocoding ? (
                <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (
                'Auto-detect'
              )}
            </button>
          </div>
          {geocodeError && (
            <p className="mt-2 text-sm text-amber-400">{geocodeError}</p>
          )}
        </div>

        {/* Coordinates */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="latitude" className="mb-2 flex items-center gap-1 text-sm font-medium text-zinc-200">
              Latitude
              <InfoTooltip text={FIELD_HELP_TOOLTIPS.latitude} />
            </label>
            <input
              id="latitude"
              type="number"
              step="0.0000001"
              value={data.latitude ?? ''}
              onChange={(e) => updateField('latitude', e.target.value ? parseFloat(e.target.value) : null)}
              placeholder="-21.5544"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-zinc-100 placeholder:text-zinc-500 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
            />
          </div>
          <div>
            <label htmlFor="longitude" className="mb-2 flex items-center gap-1 text-sm font-medium text-zinc-200">
              Longitude
              <InfoTooltip text={FIELD_HELP_TOOLTIPS.longitude} />
            </label>
            <input
              id="longitude"
              type="number"
              step="0.0000001"
              value={data.longitude ?? ''}
              onChange={(e) => updateField('longitude', e.target.value ? parseFloat(e.target.value) : null)}
              placeholder="-45.4303"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-zinc-100 placeholder:text-zinc-500 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
            />
          </div>
        </div>

        {/* Environmental data notice */}
        {data.latitude && data.longitude && (
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4">
            <div className="flex items-center gap-2">
              {isLoadingEnvironmental ? (
                <>
                  <svg className="h-5 w-5 animate-spin text-emerald-400" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span className="text-sm text-emerald-300">Fetching environmental data...</span>
                </>
              ) : (
                <>
                  <svg className="h-5 w-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-sm text-emerald-300">
                    Environmental data will be auto-populated for your location
                  </span>
                </>
              )}
            </div>
            <p className="mt-2 text-xs text-zinc-400">
              Includes: bedrock type, fault distance, seismic history, Kp-index, Local Sidereal Time
            </p>
          </div>
        )}

        {/* Summary */}
        <div>
          <label htmlFor="summary" className="mb-2 flex items-center gap-1 text-sm font-medium text-zinc-200">
            Brief Summary <span className="text-red-400">*</span>
            <InfoTooltip text={FIELD_HELP_TOOLTIPS.description} />
            <span className="ml-2 text-xs text-zinc-500">(2-5 sentences, minimum 50 characters)</span>
          </label>
          <textarea
            id="summary"
            value={data.summary}
            onChange={(e) => updateField('summary', e.target.value)}
            placeholder="Provide a brief overview of the investigation. What happened? Who was involved? What makes this case notable?"
            rows={4}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-zinc-100 placeholder:text-zinc-500 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
          />
          <div className="mt-1 flex justify-between text-xs">
            <span className={summaryValid ? 'text-emerald-400' : 'text-zinc-500'}>
              {summaryCharCount} characters {!summaryValid && `(${50 - summaryCharCount} more needed)`}
            </span>
            {summaryValid && (
              <span className="text-emerald-400">✓ Minimum met</span>
            )}
          </div>
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
          disabled={!canProceed}
          className="rounded-lg bg-violet-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-violet-500 disabled:opacity-50"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
