'use client';

/**
 * DataUploader
 * Step 2: Optional file upload (JSON, CSV, PDF, images)
 */

import { useState, useCallback, useRef } from 'react';

interface DataUploaderProps {
  uploadedFile: File | null;
  onUpload: (file: File | null, extractedText: string) => void;
  onNext: () => void;
  onBack: () => void;
}

const ACCEPTED_TYPES = {
  'application/json': ['.json'],
  'text/csv': ['.csv'],
  'application/pdf': ['.pdf'],
  'image/png': ['.png'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'text/plain': ['.txt'],
};

export function DataUploader({ uploadedFile, onUpload, onNext, onBack }: DataUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [extractedText, setExtractedText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(async (file: File) => {
    setProcessing(true);
    setError(null);

    try {
      let text = '';

      if (file.type === 'application/json') {
        const content = await file.text();
        const parsed = JSON.parse(content);
        text = JSON.stringify(parsed, null, 2);
      } else if (file.type === 'text/csv' || file.type === 'text/plain') {
        text = await file.text();
      } else if (file.type === 'application/pdf') {
        // PDF text extraction would require a library like pdf.js
        // For now, just note that PDF was uploaded
        text = `[PDF file uploaded: ${file.name}]\n\nPDF text extraction will be processed server-side.`;
      } else if (file.type.startsWith('image/')) {
        // Image OCR would require a service
        text = `[Image file uploaded: ${file.name}]\n\nImage OCR will be processed server-side.`;
      }

      setExtractedText(text);
      onUpload(file, text);
    } catch (err) {
      console.error('File processing error:', err);
      setError(`Failed to process file: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setProcessing(false);
    }
  }, [onUpload]);

  const handleDrop = useCallback(
    async (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);

      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        await processFile(files[0]);
      }
    },
    [processFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        await processFile(files[0]);
      }
    },
    [processFile]
  );

  const handleRemoveFile = useCallback(() => {
    onUpload(null, '');
    setExtractedText('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [onUpload]);

  const acceptedExtensions = Object.values(ACCEPTED_TYPES).flat().join(',');

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-zinc-100">Upload Data File</h2>
        <p className="mt-2 text-zinc-400">
          Optional: Upload existing data or documents to extract information
        </p>
      </div>

      {/* File drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`relative rounded-xl border-2 border-dashed p-12 text-center transition-colors ${
          isDragging
            ? 'border-violet-500 bg-violet-500/10'
            : uploadedFile
              ? 'border-emerald-500 bg-emerald-500/10'
              : 'border-zinc-700 bg-zinc-900/50 hover:border-zinc-600'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptedExtensions}
          onChange={handleFileSelect}
          className="absolute inset-0 cursor-pointer opacity-0"
          disabled={processing}
        />

        {processing ? (
          <div className="flex flex-col items-center">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-violet-500 border-t-transparent" />
            <p className="mt-4 text-zinc-300">Processing file...</p>
          </div>
        ) : uploadedFile ? (
          <div className="flex flex-col items-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20">
              <svg className="h-8 w-8 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="mt-4 text-lg font-medium text-zinc-100">{uploadedFile.name}</p>
            <p className="text-sm text-zinc-400">
              {(uploadedFile.size / 1024).toFixed(1)} KB
            </p>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleRemoveFile();
              }}
              className="mt-4 rounded-lg bg-red-600/20 px-4 py-2 text-sm text-red-400 hover:bg-red-600/30"
            >
              Remove File
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-zinc-800">
              <svg className="h-8 w-8 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <p className="mt-4 text-lg font-medium text-zinc-100">
              Drop file here or click to browse
            </p>
            <p className="mt-2 text-sm text-zinc-400">
              Supports JSON, CSV, PDF, images, and text files
            </p>
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-red-400">
          {error}
        </div>
      )}

      {/* Extracted text preview */}
      {extractedText && (
        <div className="rounded-lg border border-zinc-700 bg-zinc-900/50 p-4">
          <h4 className="mb-2 text-sm font-medium text-zinc-300">
            Extracted Content Preview
          </h4>
          <pre className="max-h-48 overflow-auto rounded bg-zinc-950 p-3 text-xs text-zinc-400">
            {extractedText.slice(0, 1000)}
            {extractedText.length > 1000 && '...'}
          </pre>
        </div>
      )}

      {/* Help text */}
      <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-4">
        <h4 className="text-sm font-medium text-zinc-300">Supported Formats</h4>
        <div className="mt-2 grid grid-cols-2 gap-2 text-sm text-zinc-400 md:grid-cols-3">
          <div>
            <strong className="text-zinc-300">JSON:</strong> Structured data
          </div>
          <div>
            <strong className="text-zinc-300">CSV:</strong> Tabular data
          </div>
          <div>
            <strong className="text-zinc-300">PDF:</strong> Research papers
          </div>
          <div>
            <strong className="text-zinc-300">Images:</strong> Scans, photos
          </div>
          <div>
            <strong className="text-zinc-300">Text:</strong> Plain text files
          </div>
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
          {uploadedFile ? 'Continue' : 'Skip This Step'}
        </button>
      </div>
    </div>
  );
}
