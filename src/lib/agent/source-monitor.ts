/**
 * Source Monitor
 *
 * Checks monitored sources for new content.
 * Integrates with web search for journal/archive scanning.
 */

import { executeSearch } from './web-search';
import { evaluateLead, extractSampleSize, hasQuantitativeData, detectLanguage } from './lead-evaluator';
import type { DiscoverySource, DiscoveryLead, LeadType, SearchSource } from './types';

interface DiscoveredContent {
  title: string;
  url: string;
  snippet: string;
  source: DiscoverySource;
  lead_type: LeadType;
}

// ============================================
// Search Keywords by Source Type
// ============================================

const SEARCH_KEYWORDS: Record<string, string[]> = {
  nde: ['near-death experience', 'NDE research', 'veridical perception NDE', 'cardiac arrest consciousness'],
  parapsychology: ['parapsychology study', 'ganzfeld experiment', 'psi research', 'ESP study'],
  ufo: ['UFO sighting report', 'UAP research', 'unidentified aerial phenomena study'],
  consciousness: ['consciousness research', 'hard problem consciousness', 'anomalous cognition'],
  geophysical: ['earthquake lights', 'tectonic strain anomaly', 'geomagnetic phenomena'],
  remote_viewing: ['remote viewing study', 'anomalous cognition', 'STARGATE program'],
};

// ============================================
// Source Checking Functions
// ============================================

/**
 * Check a source for new content
 */
export async function checkSource(source: DiscoverySource): Promise<DiscoveredContent[]> {
  const discovered: DiscoveredContent[] = [];

  switch (source.source_type) {
    case 'journal':
      discovered.push(...await checkJournal(source));
      break;
    case 'archive':
      discovered.push(...await checkArchive(source));
      break;
    case 'preprint':
      discovered.push(...await checkPreprint(source));
      break;
    case 'organization':
      discovered.push(...await checkOrganization(source));
      break;
    case 'conference':
      discovered.push(...await checkConference(source));
      break;
    case 'database':
      // Databases handled by acquisition system
      break;
  }

  return discovered;
}

/**
 * Check a journal for new papers
 */
async function checkJournal(source: DiscoverySource): Promise<DiscoveredContent[]> {
  const discovered: DiscoveredContent[] = [];

  // Build search query for recent papers
  const query = `site:${extractDomain(source.url)} new paper 2024 OR 2025 OR 2026`;

  try {
    const results = await executeSearch(query, `Checking ${source.name}`);

    for (const result of results.slice(0, 5)) {
      // Filter for actual papers (not about pages, contact, etc.)
      if (looksLikePaper(result.title, result.url)) {
        discovered.push({
          title: result.title,
          url: result.url,
          snippet: result.snippet,
          source,
          lead_type: 'paper',
        });
      }
    }
  } catch (error) {
    console.error(`Error checking journal ${source.name}:`, error);
  }

  return discovered;
}

/**
 * Check an archive for new documents
 */
async function checkArchive(source: DiscoverySource): Promise<DiscoveredContent[]> {
  const discovered: DiscoveredContent[] = [];

  // Keywords relevant to our research
  const keywords = [
    'remote viewing', 'parapsychology', 'ESP', 'psychic',
    'UFO', 'UAP', 'anomalous', 'unexplained'
  ];

  // Search archive with our keywords
  const query = `site:${extractDomain(source.url)} ${keywords.slice(0, 3).join(' OR ')}`;

  try {
    const results = await executeSearch(query, `Checking ${source.name}`);

    for (const result of results.slice(0, 5)) {
      if (looksLikeDocument(result.title, result.url)) {
        discovered.push({
          title: result.title,
          url: result.url,
          snippet: result.snippet,
          source,
          lead_type: 'document',
        });
      }
    }
  } catch (error) {
    console.error(`Error checking archive ${source.name}:`, error);
  }

  return discovered;
}

/**
 * Check a preprint server for new papers
 */
async function checkPreprint(source: DiscoverySource): Promise<DiscoveredContent[]> {
  const discovered: DiscoveredContent[] = [];

  // Search for consciousness/parapsychology preprints
  const queries = [
    `site:${extractDomain(source.url)} consciousness anomalous`,
    `site:${extractDomain(source.url)} parapsychology OR psi`,
    `site:${extractDomain(source.url)} near-death experience`,
  ];

  try {
    for (const query of queries.slice(0, 2)) {
      const results = await executeSearch(query, `Checking ${source.name}`);

      for (const result of results.slice(0, 3)) {
        discovered.push({
          title: result.title,
          url: result.url,
          snippet: result.snippet,
          source,
          lead_type: 'paper',
        });
      }
    }
  } catch (error) {
    console.error(`Error checking preprint ${source.name}:`, error);
  }

  return discovered;
}

/**
 * Check an organization's website for news/publications
 */
async function checkOrganization(source: DiscoverySource): Promise<DiscoveredContent[]> {
  const discovered: DiscoveredContent[] = [];

  const query = `site:${extractDomain(source.url)} research OR publication OR study 2024 OR 2025 OR 2026`;

  try {
    const results = await executeSearch(query, `Checking ${source.name}`);

    for (const result of results.slice(0, 5)) {
      const leadType: LeadType = looksLikePaper(result.title, result.url) ? 'paper' : 'archive';
      discovered.push({
        title: result.title,
        url: result.url,
        snippet: result.snippet,
        source,
        lead_type: leadType,
      });
    }
  } catch (error) {
    console.error(`Error checking organization ${source.name}:`, error);
  }

  return discovered;
}

/**
 * Check conference proceedings
 */
async function checkConference(source: DiscoverySource): Promise<DiscoveredContent[]> {
  const discovered: DiscoveredContent[] = [];

  const query = `site:${extractDomain(source.url)} proceedings OR presentation OR abstract 2024 OR 2025`;

  try {
    const results = await executeSearch(query, `Checking ${source.name}`);

    for (const result of results.slice(0, 5)) {
      discovered.push({
        title: result.title,
        url: result.url,
        snippet: result.snippet,
        source,
        lead_type: 'conference',
      });
    }
  } catch (error) {
    console.error(`Error checking conference ${source.name}:`, error);
  }

  return discovered;
}

// ============================================
// Content Evaluation
// ============================================

/**
 * Convert discovered content to a lead
 */
export function contentToLead(
  content: DiscoveredContent,
  sessionId: string
): Omit<DiscoveryLead, 'id' | 'created_at'> {
  const evaluation = evaluateLead(
    content.title,
    content.snippet,
    content.url,
    undefined,
    content.source.name
  );

  return {
    session_id: sessionId,
    lead_type: content.lead_type,
    title: content.title,
    description: content.snippet,
    source_url: content.url,
    quality_score: evaluation.quality_score,
    quality_signals: evaluation.quality_signals,
    quality_concerns: evaluation.quality_concerns,
    domains: evaluation.domains,
    publication: content.source.name,
    language: detectLanguage(content.title + ' ' + content.snippet),
    has_quantitative_data: hasQuantitativeData(content.snippet),
    sample_size: extractSampleSize(content.snippet),
    status: 'pending',
    priority: evaluation.priority,
  };
}

// ============================================
// Helper Functions
// ============================================

/**
 * Extract domain from URL
 */
function extractDomain(url?: string): string {
  if (!url) return '';
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    return url.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  }
}

/**
 * Check if URL/title looks like a paper
 */
function looksLikePaper(title: string, url: string): boolean {
  const paperIndicators = [
    /abstract/i,
    /article/i,
    /paper/i,
    /study/i,
    /research/i,
    /doi\.org/i,
    /\.pdf$/i,
    /volume/i,
    /issue/i,
  ];

  const exclusions = [
    /about/i,
    /contact/i,
    /subscribe/i,
    /login/i,
    /register/i,
    /submit/i,
    /guidelines/i,
    /policy/i,
  ];

  const combined = title + ' ' + url;

  if (exclusions.some(p => p.test(combined))) {
    return false;
  }

  return paperIndicators.some(p => p.test(combined));
}

/**
 * Check if URL/title looks like a document
 */
function looksLikeDocument(title: string, url: string): boolean {
  const docIndicators = [
    /document/i,
    /report/i,
    /memo/i,
    /file/i,
    /record/i,
    /declassified/i,
    /\.pdf/i,
  ];

  const combined = title + ' ' + url;
  return docIndicators.some(p => p.test(combined));
}

// ============================================
// Researcher Checking
// ============================================

/**
 * Check for new publications from a researcher
 */
export async function checkResearcher(
  name: string,
  domains: string[],
  googleScholar?: string
): Promise<SearchSource[]> {
  const results: SearchSource[] = [];

  // Search for recent publications
  const query = `"${name}" research paper OR study OR preprint 2024 OR 2025 OR 2026`;

  try {
    const searchResults = await executeSearch(query, `Checking researcher: ${name}`);

    for (const result of searchResults.slice(0, 5)) {
      // Filter for actual publications
      if (looksLikePaper(result.title, result.url)) {
        results.push(result);
      }
    }
  } catch (error) {
    console.error(`Error checking researcher ${name}:`, error);
  }

  return results;
}

/**
 * Search for topic-specific content
 */
export async function searchTopic(
  topic: string,
  keywords: string[]
): Promise<SearchSource[]> {
  const query = `${topic} ${keywords.join(' OR ')} research study`;

  try {
    return await executeSearch(query, `Searching topic: ${topic}`);
  } catch (error) {
    console.error(`Error searching topic ${topic}:`, error);
    return [];
  }
}
