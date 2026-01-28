/**
 * Web Search Module for Aletheia Research Agent
 * Phase 4: External Research
 *
 * Uses Tavily Search API for web searches optimized for AI agents.
 * https://tavily.com
 */

import type { SearchSource, ResearchQuery } from './types';

// Configuration
const SEARCH_CONFIG = {
  maxResultsPerQuery: 5,
  apiKey: process.env.TAVILY_API_KEY,
  apiEndpoint: 'https://api.tavily.com/search',
  searchDepth: 'basic' as const, // 'basic' or 'advanced'
  rateLimitMs: 200, // Minimum delay between requests
};

// Rate limiting state
let lastRequestTime = 0;

/**
 * Tavily API Response Types
 */
interface TavilyResult {
  title: string;
  url: string;
  content: string;
  score: number;
  published_date?: string;
}

interface TavilyResponse {
  query: string;
  answer?: string;
  results: TavilyResult[];
  response_time: number;
}

/**
 * Execute a web search query using Tavily API
 *
 * @param query - The search query string
 * @param context - Context about what we're searching for
 * @returns Array of search results
 */
export async function executeSearch(
  query: string,
  context: string
): Promise<SearchSource[]> {
  // Check if API key is configured
  if (!SEARCH_CONFIG.apiKey) {
    console.warn('[WebSearch] TAVILY_API_KEY not configured, using mock results');
    return generateMockResults(query, context);
  }

  // Rate limiting
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  if (timeSinceLastRequest < SEARCH_CONFIG.rateLimitMs) {
    await new Promise(resolve =>
      setTimeout(resolve, SEARCH_CONFIG.rateLimitMs - timeSinceLastRequest)
    );
  }
  lastRequestTime = Date.now();

  try {
    console.log(`[WebSearch] Tavily search: "${query}"`);

    const response = await fetch(SEARCH_CONFIG.apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: SEARCH_CONFIG.apiKey,
        query: query,
        search_depth: SEARCH_CONFIG.searchDepth,
        include_answer: false,
        max_results: SEARCH_CONFIG.maxResultsPerQuery,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[WebSearch] Tavily API error: ${response.status} - ${errorText}`);

      // Fall back to mock results on API error
      if (response.status === 429) {
        console.warn('[WebSearch] Rate limited, falling back to mock results');
      }
      return generateMockResults(query, context);
    }

    const data: TavilyResponse = await response.json();
    console.log(`[WebSearch] Got ${data.results.length} results in ${data.response_time}s`);

    // Transform Tavily results to our format
    return data.results.map(result => ({
      title: result.title,
      url: result.url,
      snippet: result.content.substring(0, 500), // Truncate long content
      relevance: result.score,
    }));

  } catch (error) {
    console.error('[WebSearch] Error executing search:', error);
    return generateMockResults(query, context);
  }
}

/**
 * Generate mock search results for development/testing
 * Used as fallback when API is unavailable
 */
function generateMockResults(query: string, context: string): SearchSource[] {
  const queryLower = query.toLowerCase();
  const mockResults: SearchSource[] = [];

  // UFO/Bigfoot correlation queries
  if (queryLower.includes('ufo') && queryLower.includes('bigfoot')) {
    mockResults.push({
      title: 'The Interdimensional Hypothesis: A Review of Paranormal Co-occurrence Studies',
      url: 'https://example.com/mock/interdimensional-hypothesis',
      snippet: 'Several researchers have noted the geographic co-occurrence of UFO sightings and cryptid reports. Keel (1975) proposed that these phenomena may share a common source...',
      relevance: 0.85,
    });
    mockResults.push({
      title: 'Geographic Clustering of Anomalous Reports: Methodology and Pitfalls',
      url: 'https://example.com/mock/geographic-clustering',
      snippet: 'Analysis of paranormal report clustering must account for population density, reporting infrastructure, and media attention cycles...',
      relevance: 0.78,
    });
  }

  // Paranormal co-location queries
  if (queryLower.includes('co-location') || queryLower.includes('correlation') || queryLower.includes('cluster')) {
    mockResults.push({
      title: 'Window Areas and High Strangeness Zones: Historical Analysis',
      url: 'https://example.com/mock/window-areas',
      snippet: 'The concept of "window areas" - regions with concentrated anomalous activity - has been documented since the 1970s. Statistical analysis suggests these clusters exceed chance expectations...',
      relevance: 0.82,
    });
  }

  // Reporting bias queries
  if (queryLower.includes('bias') || queryLower.includes('methodology') || queryLower.includes('reporting')) {
    mockResults.push({
      title: 'Reporting Bias in Paranormal Research: A Meta-Analysis',
      url: 'https://example.com/mock/reporting-bias',
      snippet: 'Studies show that media coverage significantly influences reporting rates. Regions with active investigation groups show 3-5x higher report rates than comparable areas without...',
      relevance: 0.88,
    });
    mockResults.push({
      title: 'Social Contagion in Anomaly Reporting: Evidence from NUFORC Data',
      url: 'https://example.com/mock/social-contagion',
      snippet: 'Analysis of 100,000+ NUFORC reports shows clear temporal clustering following media events, suggesting significant social influence on reporting behavior...',
      relevance: 0.75,
    });
  }

  // Prior research queries
  if (queryLower.includes('study') || queryLower.includes('research') || queryLower.includes('academic')) {
    mockResults.push({
      title: 'Paranormal Research Database: Peer-Reviewed Studies 2000-2024',
      url: 'https://example.com/mock/research-database',
      snippet: 'Comprehensive database of academic studies on anomalous phenomena, including statistical analyses, methodological critiques, and replication attempts...',
      relevance: 0.72,
    });
  }

  // Mechanism/explanation queries
  if (queryLower.includes('why') || queryLower.includes('explanation') || queryLower.includes('mechanism') || queryLower.includes('theory')) {
    mockResults.push({
      title: 'Theories of Paranormal Clustering: From Geological to Psychological',
      url: 'https://example.com/mock/clustering-theories',
      snippet: 'Proposed explanations for geographic clustering range from geomagnetic anomalies affecting perception to demographic factors in reporting behavior...',
      relevance: 0.70,
    });
  }

  // Debunking queries
  if (queryLower.includes('debunk') || queryLower.includes('skeptic') || queryLower.includes('explained') || queryLower.includes('refuted')) {
    mockResults.push({
      title: 'Critical Analysis of Window Area Claims: A Skeptical Review',
      url: 'https://example.com/mock/skeptical-review',
      snippet: 'Examination of claimed "window areas" using rigorous statistical methods reveals significant methodological issues in original analyses...',
      relevance: 0.80,
    });
  }

  // Geophysical correlation queries
  if (queryLower.includes('geophysical') || queryLower.includes('tectonic') || queryLower.includes('seismic') || queryLower.includes('earthquake')) {
    mockResults.push({
      title: 'Tectonic Strain Theory and Anomalous Light Phenomena',
      url: 'https://example.com/mock/tectonic-strain',
      snippet: 'The tectonic strain theory proposes that piezoelectric effects in quartz-bearing rocks under stress could produce luminous phenomena and affect human consciousness...',
      relevance: 0.77,
    });
  }

  // If no specific matches, return generic results
  if (mockResults.length === 0) {
    mockResults.push({
      title: `Research Results for: ${query.substring(0, 50)}...`,
      url: 'https://example.com/mock/generic-result-1',
      snippet: 'Mock search result. Tavily API not available for this query.',
      relevance: 0.5,
    });
    mockResults.push({
      title: 'Paranormal Research Methods and Statistics',
      url: 'https://example.com/mock/research-methods',
      snippet: 'General resource on statistical methods appropriate for analyzing anomalous phenomena data...',
      relevance: 0.45,
    });
  }

  // Sort by relevance and limit results
  return mockResults
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, SEARCH_CONFIG.maxResultsPerQuery);
}

/**
 * Execute multiple searches for a research query set
 */
export async function executeSearches(
  queries: ResearchQuery[]
): Promise<Map<string, SearchSource[]>> {
  const results = new Map<string, SearchSource[]>();

  for (const q of queries) {
    const searchResults = await executeSearch(q.query, q.context);
    results.set(q.query, searchResults);
  }

  return results;
}

/**
 * Get all unique sources from multiple search results
 */
export function consolidateSources(
  searchResults: Map<string, SearchSource[]>
): SearchSource[] {
  const seenUrls = new Set<string>();
  const allSources: SearchSource[] = [];

  const valuesArray = Array.from(searchResults.values());
  for (const sources of valuesArray) {
    for (const source of sources) {
      if (!seenUrls.has(source.url)) {
        seenUrls.add(source.url);
        allSources.push(source);
      }
    }
  }

  // Sort by relevance
  return allSources.sort((a, b) => b.relevance - a.relevance);
}
