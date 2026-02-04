'use client';

/**
 * PatternList
 * Table view of detected patterns with plain English explanations
 */

import { useState, useMemo } from 'react';
import type { InvestigationType } from '@/types/database';
import type { DetectedPattern } from '@/lib/pattern-matcher';
import { SCHEMA_METADATA } from '@/schemas';
import { getConfidenceLevel } from '@/lib/pattern-matcher';
import { generatePatternDisplayTitle } from '@/lib/prediction-display';

interface PatternListProps {
  patterns: DetectedPattern[];
  onPatternClick?: (pattern: DetectedPattern) => void;
}

type SortField = 'confidence' | 'prevalence' | 'reliability' | 'sampleSize' | 'date';

/**
 * Generate a plain English explanation of what the pattern means
 * Uses the pattern's description if available, otherwise generates from context
 */
function getWhatItMeans(pattern: DetectedPattern): string {
  // Use the pattern's actual description if it exists and is meaningful
  if (pattern.description && pattern.description.length > 20) {
    return pattern.description;
  }

  // Fallback to generated explanation based on pattern characteristics
  const domainNames = pattern.domains.map(d => SCHEMA_METADATA[d]?.name?.split(' ')[0] || d).join(', ');
  const confidence = pattern.confidenceScore;

  if (confidence >= 0.9) {
    return `Strong correlation detected across ${domainNames}. High priority for testing.`;
  } else if (confidence >= 0.75) {
    return `Consistent pattern observed in ${domainNames} research.`;
  } else if (confidence >= 0.5) {
    return `Emerging connection between ${domainNames}, more samples needed.`;
  } else {
    return `Preliminary link in ${domainNames}. Requires verification.`;
  }
}

/**
 * Get confidence badge styling
 */
function getConfidenceBadge(score: number): { bg: string; text: string; label: string } {
  if (score >= 0.9) return { bg: 'bg-emerald-500/20', text: 'text-emerald-400', label: 'Very High' };
  if (score >= 0.75) return { bg: 'bg-green-500/20', text: 'text-green-400', label: 'High' };
  if (score >= 0.5) return { bg: 'bg-yellow-500/20', text: 'text-yellow-400', label: 'Moderate' };
  return { bg: 'bg-orange-500/20', text: 'text-orange-400', label: 'Low' };
}

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
            const meta = domain !== 'all' ? (SCHEMA_METADATA[domain] || { name: domain, icon: '❓', color: 'text-zinc-400' }) : null;

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
            <span className={SCHEMA_METADATA[filterDomain]?.color || 'text-zinc-400'}>
              {SCHEMA_METADATA[filterDomain]?.name || filterDomain}
            </span>
          </span>
        )}
      </div>

      {/* Pattern table */}
      {filteredPatterns.length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-zinc-700 bg-zinc-900/50">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-700 bg-zinc-800/50">
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-400">
                    Pattern
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-400">
                    Domains
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-zinc-400">
                    Confidence
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-400">
                    What It Means
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-700/50">
                {filteredPatterns.map((pattern) => {
                  const confidenceBadge = getConfidenceBadge(pattern.confidenceScore);

                  return (
                    <tr
                      key={`${pattern.variable}-${pattern.domains.join('-')}`}
                      onClick={onPatternClick ? () => onPatternClick(pattern) : undefined}
                      className={`transition-colors ${
                        onPatternClick
                          ? 'cursor-pointer hover:bg-zinc-800/50'
                          : ''
                      }`}
                    >
                      {/* Pattern column */}
                      <td className="px-4 py-4">
                        {(() => {
                          const displayTitle = generatePatternDisplayTitle(pattern.description, pattern.variable, pattern.domains);
                          return (
                            <div className="max-w-xs">
                              <p className="font-medium text-zinc-100 line-clamp-2">
                                {displayTitle.title}
                              </p>
                              <p className="mt-1 text-xs text-zinc-500">
                                {displayTitle.subtitle}
                              </p>
                            </div>
                          );
                        })()}
                      </td>

                      {/* Domains column */}
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-1.5">
                          {pattern.domains.map((domain) => {
                            const meta = SCHEMA_METADATA[domain] || { name: domain, icon: '❓', color: 'text-zinc-400' };
                            return (
                              <span
                                key={domain}
                                className={`flex items-center gap-1 rounded-full bg-zinc-800 px-2 py-0.5 text-xs ${meta.color}`}
                                title={meta.name}
                              >
                                <span>{meta.icon}</span>
                                <span className="hidden sm:inline">{meta.name.split(' ')[0]}</span>
                              </span>
                            );
                          })}
                        </div>
                      </td>

                      {/* Confidence column */}
                      <td className="px-4 py-4 text-center">
                        <div className="inline-flex flex-col items-center">
                          <span className={`rounded-full px-2.5 py-1 text-sm font-semibold ${confidenceBadge.bg} ${confidenceBadge.text}`}>
                            {(pattern.confidenceScore * 100).toFixed(0)}%
                          </span>
                          <span className={`mt-1 text-xs ${confidenceBadge.text}`}>
                            {confidenceBadge.label}
                          </span>
                        </div>
                      </td>

                      {/* What It Means column */}
                      <td className="px-4 py-4">
                        <p className="max-w-sm text-sm text-zinc-300 leading-relaxed">
                          {getWhatItMeans(pattern)}
                        </p>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
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
