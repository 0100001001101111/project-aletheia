'use client';

/**
 * PatternList
 * List view of detected patterns
 */

import { useState, useMemo } from 'react';
import type { InvestigationType } from '@/types/database';
import type { DetectedPattern } from '@/lib/pattern-matcher';
import { SCHEMA_METADATA } from '@/schemas';
import { PatternCard } from './PatternCard';

interface PatternListProps {
  patterns: DetectedPattern[];
  onPatternClick?: (pattern: DetectedPattern) => void;
}

type SortField = 'confidence' | 'prevalence' | 'reliability' | 'sampleSize' | 'date';

export function PatternList({ patterns, onPatternClick }: PatternListProps) {
  const [filterDomain, setFilterDomain] = useState<InvestigationType | 'all'>('all');
  const [sortField, setSortField] = useState<SortField>('confidence');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredPatterns = useMemo(() => {
    let result = [...patterns];

    // Filter by domain
    if (filterDomain !== 'all') {
      result = result.filter((p) => p.domains.includes(filterDomain));
    }

    // Filter by search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.description.toLowerCase().includes(query) ||
          p.variable.toLowerCase().includes(query)
      );
    }

    // Sort
    result.sort((a, b) => {
      let aVal: number;
      let bVal: number;

      switch (sortField) {
        case 'confidence':
          aVal = a.confidenceScore;
          bVal = b.confidenceScore;
          break;
        case 'prevalence':
          aVal = a.prevalence;
          bVal = b.prevalence;
          break;
        case 'reliability':
          aVal = a.reliability;
          bVal = b.reliability;
          break;
        case 'sampleSize':
          aVal = a.sampleSize;
          bVal = b.sampleSize;
          break;
        case 'date':
          aVal = new Date(a.detectedAt).getTime();
          bVal = new Date(b.detectedAt).getTime();
          break;
        default:
          aVal = 0;
          bVal = 0;
      }

      return sortOrder === 'desc' ? bVal - aVal : aVal - bVal;
    });

    return result;
  }, [patterns, filterDomain, sortField, sortOrder, searchQuery]);

  const domains: (InvestigationType | 'all')[] = [
    'all',
    'nde',
    'ganzfeld',
    'crisis_apparition',
    'stargate',
    'geophysical',
  ];

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search patterns..."
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 pl-10 text-sm text-zinc-100 placeholder-zinc-500 focus:border-violet-500 focus:outline-none"
          />
          <svg
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>

        {/* Domain filter */}
        <div className="flex gap-1">
          {domains.map((domain) => {
            const isActive = filterDomain === domain;
            const meta = domain !== 'all' ? SCHEMA_METADATA[domain] : null;

            return (
              <button
                key={domain}
                onClick={() => setFilterDomain(domain)}
                className={`rounded-lg px-3 py-2 text-sm transition-colors ${
                  isActive
                    ? 'bg-violet-600 text-white'
                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200'
                }`}
              >
                {meta ? (
                  <span className="flex items-center gap-1">
                    {meta.icon}
                    <span className="hidden lg:inline">{meta.name.split(' ')[0]}</span>
                  </span>
                ) : (
                  'All'
                )}
              </button>
            );
          })}
        </div>

        {/* Sort */}
        <select
          value={`${sortField}-${sortOrder}`}
          onChange={(e) => {
            const [field, order] = e.target.value.split('-');
            setSortField(field as SortField);
            setSortOrder(order as 'asc' | 'desc');
          }}
          className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-300 focus:border-violet-500 focus:outline-none"
        >
          <option value="confidence-desc">Confidence (High to Low)</option>
          <option value="confidence-asc">Confidence (Low to High)</option>
          <option value="prevalence-desc">Prevalence (High to Low)</option>
          <option value="reliability-desc">Reliability (High to Low)</option>
          <option value="sampleSize-desc">Sample Size (High to Low)</option>
          <option value="date-desc">Newest First</option>
          <option value="date-asc">Oldest First</option>
        </select>
      </div>

      {/* Results count */}
      <div className="text-sm text-zinc-500">
        {filteredPatterns.length} pattern{filteredPatterns.length !== 1 ? 's' : ''} found
        {filterDomain !== 'all' && (
          <span>
            {' '}in{' '}
            <span className={SCHEMA_METADATA[filterDomain].color}>
              {SCHEMA_METADATA[filterDomain].name}
            </span>
          </span>
        )}
      </div>

      {/* Pattern cards */}
      {filteredPatterns.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredPatterns.map((pattern) => (
            <PatternCard
              key={`${pattern.variable}-${pattern.domains.join('-')}`}
              pattern={pattern}
              onClick={onPatternClick ? () => onPatternClick(pattern) : undefined}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-zinc-700 bg-zinc-900/50 p-12 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-800">
            <svg className="h-6 w-6 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-zinc-300">No patterns found</h3>
          <p className="mt-1 text-sm text-zinc-500">
            Try adjusting your filters or search query
          </p>
        </div>
      )}
    </div>
  );
}
