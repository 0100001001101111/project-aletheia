/**
 * Source Discovery Module
 *
 * Searches for external data sources to fill identified gaps.
 * Uses known sources database and Tavily search.
 */

import { executeSearch } from './web-search';
import { findSourcesForDomain, KNOWN_DATA_SOURCES } from './known-sources';
import type { DataGap, DataSource, KnownDataSource } from './types';

/**
 * Convert a known source to a DataSource
 */
function knownToDataSource(known: KnownDataSource): DataSource {
  return {
    name: known.name,
    url: known.url,
    type: known.type,
    domain: known.domain,
    coverage: {},
    estimated_records: 0, // Will be estimated during discovery
    quality_estimate: known.quality,
    quality_reasoning: known.description,
    access_method: known.type === 'api' ? 'API call' : known.type === 'scrape' ? 'Web scraping' : 'Archive access',
    discovered_at: new Date().toISOString(),
  };
}

/**
 * Estimate record count from search results
 */
function estimateRecordCount(snippets: string[]): number {
  // Look for numbers in snippets
  const numbers: number[] = [];

  for (const snippet of snippets) {
    // Match patterns like "10,000 reports", "over 5000 sightings"
    const matches = snippet.match(/(\d{1,3}(?:,\d{3})*|\d+)\s*(?:reports?|sightings?|cases?|records?|entries)/gi);
    if (matches) {
      for (const match of matches) {
        const num = parseInt(match.replace(/[^0-9]/g, ''), 10);
        if (num > 0 && num < 10000000) {
          numbers.push(num);
        }
      }
    }
  }

  if (numbers.length === 0) return 0;

  // Return the median estimate
  numbers.sort((a, b) => a - b);
  return numbers[Math.floor(numbers.length / 2)];
}

/**
 * Assess quality from search results
 */
function assessQuality(url: string, snippets: string[]): { quality: 'high' | 'medium' | 'low'; reasoning: string } {
  const text = snippets.join(' ').toLowerCase();

  // High quality indicators
  const highIndicators = [
    'field investigator',
    'peer-reviewed',
    'research foundation',
    'scientific',
    'verified',
    'documented',
    'academic',
    'university',
    '.edu',
    '.gov',
  ];

  // Low quality indicators
  const lowIndicators = [
    'unverified',
    'rumor',
    'creepypasta',
    'fiction',
    'entertainment',
    'blog',
    'forum post',
  ];

  let highScore = 0;
  let lowScore = 0;

  for (const indicator of highIndicators) {
    if (text.includes(indicator) || url.includes(indicator)) {
      highScore++;
    }
  }

  for (const indicator of lowIndicators) {
    if (text.includes(indicator)) {
      lowScore++;
    }
  }

  // Domain-specific quality
  if (url.includes('.edu') || url.includes('.gov')) {
    highScore += 2;
  }

  if (highScore >= 3 && lowScore === 0) {
    return { quality: 'high', reasoning: 'Source shows multiple quality indicators (research, verification, documentation)' };
  } else if (lowScore >= 2 || (lowScore > 0 && highScore === 0)) {
    return { quality: 'low', reasoning: 'Source shows quality concerns (unverified, entertainment-focused)' };
  } else {
    return { quality: 'medium', reasoning: 'Source has moderate verification standards' };
  }
}

/**
 * Discover sources for a specific gap using web search
 */
async function discoverSourcesViaSearch(gap: DataGap): Promise<DataSource[]> {
  const sources: DataSource[] = [];

  // Build search query based on gap type
  let query = '';
  switch (gap.type) {
    case 'temporal':
      query = `${gap.domain || 'paranormal'} sightings database ${gap.details.data_ends?.split('-')[0] || ''} to present`;
      break;
    case 'geographic':
      const region = gap.details.missing_regions?.[0] || '';
      query = `${region} ${gap.domain || 'paranormal'} reports database`;
      break;
    case 'domain':
      query = `${gap.domain} sightings database research`;
      break;
    case 'verification':
      query = `${gap.domain || 'paranormal'} independent database verification`;
      break;
  }

  try {
    const results = await executeSearch(query, 'Finding data sources');

    // Filter results that look like databases
    const dbResults = results.filter(r =>
      r.title.toLowerCase().includes('database') ||
      r.title.toLowerCase().includes('reports') ||
      r.title.toLowerCase().includes('archive') ||
      r.snippet.toLowerCase().includes('database') ||
      r.snippet.toLowerCase().includes('catalog') ||
      r.snippet.toLowerCase().includes('collection')
    );

    for (const result of dbResults.slice(0, 3)) {
      // Skip if we already have this source
      if (KNOWN_DATA_SOURCES.some(ks => result.url.includes(ks.url))) {
        continue;
      }

      const { quality, reasoning } = assessQuality(result.url, [result.snippet]);
      const estimatedRecords = estimateRecordCount([result.snippet]);

      sources.push({
        name: result.title.substring(0, 100),
        url: result.url,
        type: result.url.includes('api') ? 'api' : 'scrape',
        domain: gap.domain || 'unknown',
        coverage: {},
        estimated_records: estimatedRecords,
        quality_estimate: quality,
        quality_reasoning: reasoning,
        access_method: 'Web scraping (needs verification)',
        discovered_at: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error('Error searching for sources:', error);
  }

  return sources;
}

/**
 * Main function: Discover sources for a list of gaps
 */
export async function discoverSources(gaps: DataGap[]): Promise<Map<DataGap, DataSource[]>> {
  const results = new Map<DataGap, DataSource[]>();

  for (const gap of gaps) {
    const sources: DataSource[] = [];

    // 1. Check known sources first
    if (gap.domain) {
      const knownSources = findSourcesForDomain(gap.domain);
      for (const known of knownSources) {
        sources.push(knownToDataSource(known));
      }
    }

    // 2. Search for additional sources if we don't have enough
    if (sources.length < 3) {
      const discoveredSources = await discoverSourcesViaSearch(gap);
      sources.push(...discoveredSources);
    }

    // Remove duplicates by URL
    const uniqueSources = Array.from(
      new Map(sources.map(s => [s.url, s])).values()
    );

    results.set(gap, uniqueSources);
  }

  return results;
}

/**
 * Get the best source for a gap (highest quality, most records)
 */
export function getBestSource(sources: DataSource[]): DataSource | null {
  if (sources.length === 0) return null;

  // Score each source
  const scored = sources.map(source => {
    let score = 0;

    // Quality weight
    if (source.quality_estimate === 'high') score += 30;
    else if (source.quality_estimate === 'medium') score += 15;
    else score += 5;

    // Record count weight (log scale)
    if (source.estimated_records > 0) {
      score += Math.min(20, Math.log10(source.estimated_records) * 5);
    }

    // Known source bonus
    if (KNOWN_DATA_SOURCES.some(ks => source.url.includes(ks.url))) {
      score += 20;
    }

    // API bonus (usually more reliable)
    if (source.type === 'api') {
      score += 10;
    }

    return { source, score };
  });

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  return scored[0]?.source || null;
}

/**
 * Format source recommendations for logging
 */
export function formatSourceRecommendations(
  gapSources: Map<DataGap, DataSource[]>
): string {
  const lines: string[] = [];

  for (const [gap, sources] of Array.from(gapSources.entries())) {
    lines.push(`\nGap: ${gap.description}`);
    lines.push(`  Type: ${gap.type} | Severity: ${gap.severity}`);

    if (sources.length === 0) {
      lines.push('  No sources found');
    } else {
      lines.push(`  Found ${sources.length} potential source(s):`);
      for (const source of sources.slice(0, 3)) {
        lines.push(`    - ${source.name} (${source.quality_estimate} quality)`);
        lines.push(`      URL: ${source.url}`);
        if (source.estimated_records > 0) {
          lines.push(`      Est. records: ~${source.estimated_records.toLocaleString()}`);
        }
      }
    }
  }

  return lines.join('\n');
}
