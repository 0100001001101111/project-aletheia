'use client';

/**
 * Ingest Upload Page
 * Auth-gated file upload with schema type selection and AI-powered parsing
 */

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import type { ResearchInvestigationType } from '@/types/database';

const SCHEMA_OPTIONS: { value: ResearchInvestigationType; label: string }[] = [
  { value: 'nde', label: 'Near-Death Experience (NDE)' },
  { value: 'ganzfeld', label: 'Ganzfeld Experiment' },
  { value: 'crisis_apparition', label: 'Crisis Apparition' },
  { value: 'stargate', label: 'STARGATE / Remote Viewing' },
  { value: 'geophysical', label: 'Geophysical Anomaly' },
  { value: 'ufo', label: 'UFO / UAP' },
];

const ACCEPTED_EXTENSIONS = '.pdf,.csv,.xlsx,.xls,.txt,.json';

export default function IngestPage() {
  const { user } = useAuth();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [schemaType, setSchemaType] = useState<ResearchInvestigationType>('nde');
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) {
      setFile(dropped);
      setError(null);
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setError(null);
    }
  }, []);

  const handleUpload = async () => {
    if (!file) return;
    if (!user) {
      setError('Please sign in to upload files.');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('schemaType', schemaType);

      const res = await fetch('/api/ingest/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Upload failed');
        return;
      }

      router.push(`/ingest/review/${data.uploadId}`);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 px-4 py-12">
      <div className="mx-auto max-w-xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold">Upload Research Data</h1>
          <p className="mt-2 text-zinc-400">
            Upload PDF, CSV, XLSX, or text files for AI-powered multi-record parsing
          </p>
        </div>

        {/* Schema type selector */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Investigation Type
          </label>
          <select
            value={schemaType}
            onChange={(e) => setSchemaType(e.target.value as ResearchInvestigationType)}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-zinc-100 focus:border-violet-500 focus:outline-none"
          >
            {SCHEMA_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {/* File drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-all ${
            isDragging
              ? 'border-violet-500 bg-violet-500/5'
              : file
                ? 'border-emerald-500/50 bg-emerald-500/5'
                : 'border-zinc-700 bg-zinc-900/50 hover:border-zinc-600'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_EXTENSIONS}
            onChange={handleFileSelect}
            className="hidden"
          />

          {file ? (
            <div>
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10">
                <svg className="h-6 w-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="font-medium text-zinc-100">{file.name}</p>
              <p className="mt-1 text-sm text-zinc-500">
                {(file.size / 1024).toFixed(1)} KB
              </p>
              <button
                onClick={(e) => { e.stopPropagation(); setFile(null); }}
                className="mt-2 text-xs text-zinc-500 hover:text-zinc-300 underline"
              >
                Remove
              </button>
            </div>
          ) : (
            <div>
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-800">
                <svg className="h-6 w-6 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <p className="font-medium text-zinc-300">Drop a file here or click to browse</p>
              <p className="mt-1 text-sm text-zinc-500">
                PDF, CSV, XLSX, TXT, JSON — max 10MB
              </p>
            </div>
          )}
        </div>

        {/* Error message */}
        {error && (
          <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Upload button */}
        <button
          onClick={handleUpload}
          disabled={!file || isUploading}
          className="mt-6 w-full rounded-lg bg-violet-600 px-4 py-3 font-medium text-white transition-colors hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isUploading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Parsing with AI...
            </span>
          ) : (
            'Upload & Parse'
          )}
        </button>

        <p className="mt-4 text-center text-xs text-zinc-600">
          Files are parsed server-side using Claude AI to extract structured records.
        </p>
      </div>
    </div>
  );
}
