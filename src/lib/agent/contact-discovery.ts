/**
 * Contact Discovery Module
 *
 * Identifies relevant researchers who might be interested in reviewing
 * a finding based on:
 * 1. Known researchers whose domains match
 * 2. Authors cited in research sources
 * 3. Tavily searches for author affiliations
 */

import type {
  AgentFinding,
  ResearchResult,
  SearchSource,
  SuggestedContact,
  KnownResearcher,
} from './types';
import {
  KNOWN_RESEARCHERS,
  findMatchingResearchers,
  scoreResearcherRelevance,
} from './known-researchers';
import { executeSearch } from './web-search';

const MAX_CONTACTS = 5;
const MIN_SCORE = 50;

// Words that are NOT names but could match name-like patterns
const NON_NAME_WORDS = new Set([
  'using', 'leveraging', 'examining', 'exploring', 'investigating', 'analyzing',
  'understanding', 'reviewing', 'studying', 'testing', 'building', 'creating',
  'developing', 'implementing', 'applying', 'assessing', 'evaluating', 'measuring',
  'comparing', 'combining', 'integrating', 'processing', 'detecting', 'tracking',
  'mapping', 'modeling', 'predicting', 'forecasting', 'monitoring', 'observing',
  'the', 'this', 'that', 'these', 'those', 'what', 'which', 'where', 'when',
  'new', 'recent', 'latest', 'current', 'modern', 'advanced', 'novel',
  'data', 'analysis', 'research', 'study', 'report', 'evidence', 'results',
  'machine', 'learning', 'neural', 'network', 'artificial', 'intelligence',
  'geographic', 'spatial', 'temporal', 'statistical', 'scientific', 'empirical',
]);

/**
 * Check if a string looks like a valid person name
 */
function isValidPersonName(name: string): boolean {
  const parts = name.toLowerCase().split(/\s+/);

  // Check if any part is a known non-name word
  for (const part of parts) {
    if (NON_NAME_WORDS.has(part)) {
      return false;
    }
  }

  // Names should be 2-4 words
  if (parts.length < 1 || parts.length > 4) {
    return false;
  }

  // Each part should be reasonably short (names are usually < 15 chars)
  for (const part of parts) {
    if (part.length > 15) {
      return false;
    }
  }

  return true;
}

/**
 * Extract potential author names from source titles and snippets
 * Note: This is conservative to avoid false positives
 */
function extractPotentialAuthors(sources: SearchSource[]): string[] {
  const authors: string[] = [];

  // Only use the most reliable patterns for author names
  // "et al." and "(year)" are strong indicators of academic citations
  const patterns = [
    /\b([A-Z][a-z]+)\s+et\s+al\./g,  // "Smith et al."
    /\b([A-Z][a-z]+)\s+\(\d{4}\)/g,  // "Smith (2020)"
    /\bDr\.?\s+([A-Z][a-z]+\s+[A-Z][a-z]+)/g,  // "Dr. Jane Smith"
    /\bProf(?:essor)?\.?\s+([A-Z][a-z]+\s+[A-Z][a-z]+)/g,  // "Prof. Jane Smith"
  ];

  for (const source of sources) {
    const text = `${source.title} ${source.snippet}`;

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const name = match[1].trim();
        if (name.length > 2 && !authors.includes(name) && isValidPersonName(name)) {
          authors.push(name);
        }
      }
      // Reset regex lastIndex for next source
      pattern.lastIndex = 0;
    }
  }

  return authors.slice(0, 10); // Limit to 10 potential authors
}

/**
 * Check if a researcher's name appears in any of the sources
 */
function isResearcherCitedInSources(
  researcher: KnownResearcher,
  sources: SearchSource[]
): boolean {
  const nameParts = researcher.name.toLowerCase().split(' ');
  const lastName = nameParts[nameParts.length - 1];

  for (const source of sources) {
    const text = `${source.title} ${source.snippet}`.toLowerCase();
    if (text.includes(lastName)) {
      return true;
    }
  }

  return false;
}

/**
 * Convert a known researcher to a suggested contact
 */
function knownResearcherToContact(
  researcher: KnownResearcher,
  findingDomains: string[],
  citedInSources: boolean
): SuggestedContact {
  const score = scoreResearcherRelevance(researcher, findingDomains, citedInSources);

  // Build relevance explanation
  const matchingDomains = researcher.domains.filter(d =>
    findingDomains.some(fd =>
      d.toLowerCase().includes(fd.toLowerCase()) ||
      fd.toLowerCase().includes(d.toLowerCase())
    )
  );

  let relevance = `Expert in ${matchingDomains.join(', ')}`;
  if (citedInSources) {
    relevance += '; work cited in research';
  }

  return {
    name: researcher.name,
    affiliation: researcher.affiliation,
    relevance,
    related_work: researcher.expertise,
    contact_url: researcher.contact_url,
    email: researcher.email,
    score,
  };
}

/**
 * Search for author information using Tavily
 * Returns basic contact info if found
 */
async function searchForAuthorInfo(
  authorName: string
): Promise<Partial<SuggestedContact> | null> {
  try {
    const query = `${authorName} researcher professor affiliation contact`;
    const results = await executeSearch(query, 'Finding researcher contact information');

    if (results.length === 0) {
      return null;
    }

    // Look for academic indicators
    const academicResults = results.filter((r: SearchSource) =>
      r.url.includes('.edu') ||
      r.url.includes('researchgate') ||
      r.url.includes('scholar.google') ||
      r.url.includes('orcid') ||
      r.url.includes('academia.edu')
    );

    if (academicResults.length === 0 && results.length > 0) {
      // Use first result if no academic-specific ones
      return {
        name: authorName,
        contact_url: results[0].url,
      };
    }

    const topResult = academicResults[0] || results[0];

    // Try to extract affiliation from snippet
    let affiliation = 'Unknown';
    const affiliationPatterns = [
      /(?:at|from)\s+([A-Z][^\.,]+(?:University|Institute|College|Lab))/i,
      /([A-Z][^\.,]+(?:University|Institute|College|Lab))/i,
    ];

    for (const pattern of affiliationPatterns) {
      const match = topResult.snippet.match(pattern);
      if (match) {
        affiliation = match[1].trim();
        break;
      }
    }

    return {
      name: authorName,
      affiliation,
      contact_url: topResult.url,
    };
  } catch (error) {
    console.error(`Error searching for author ${authorName}:`, error);
    return null;
  }
}

/**
 * Main contact discovery function
 *
 * Given a finding and research results, returns suggested contacts
 * who might be relevant to the finding.
 */
export async function discoverContacts(
  finding: AgentFinding,
  researchResults: ResearchResult[]
): Promise<SuggestedContact[]> {
  const contacts: SuggestedContact[] = [];

  // Get domains from finding
  const technicalDetails = finding.technical_details || {};
  const testResults = (technicalDetails.test_results || []) as Array<{ domains?: string[] }>;
  const findingDomains: string[] = [];

  // Extract domains from test results or title
  for (const test of testResults) {
    if (test.domains) {
      findingDomains.push(...test.domains);
    }
  }

  // Also extract domains from finding title and display_title
  const titleLower = (finding.title + ' ' + finding.display_title).toLowerCase();
  if (titleLower.includes('bigfoot') || titleLower.includes('sasquatch')) findingDomains.push('bigfoot');
  if (titleLower.includes('ufo') || titleLower.includes('uap') || titleLower.includes('alien')) findingDomains.push('ufo');
  if (titleLower.includes('haunting') || titleLower.includes('apparition') || titleLower.includes('ghost')) findingDomains.push('haunting');
  if (titleLower.includes('nde') || titleLower.includes('near-death') || titleLower.includes('near death')) findingDomains.push('nde');
  if (titleLower.includes('ganzfeld') || titleLower.includes('psi') || titleLower.includes('telepathy')) findingDomains.push('ganzfeld');
  if (titleLower.includes('geophysical') || titleLower.includes('earthquake') || titleLower.includes('tectonic')) findingDomains.push('geophysical');
  if (titleLower.includes('cryptid') || titleLower.includes('cryptozoology')) findingDomains.push('cryptozoology');
  if (titleLower.includes('window') || titleLower.includes('high strangeness') || titleLower.includes('cluster')) findingDomains.push('window_areas');
  // General anomaly/parapsychology keywords
  if (titleLower.includes('anomaly') || titleLower.includes('anomalous') || titleLower.includes('anomalies')) findingDomains.push('anomalous');
  if (titleLower.includes('parapsychology') || titleLower.includes('paranormal')) findingDomains.push('parapsychology');
  if (titleLower.includes('consciousness') || titleLower.includes('psychic')) findingDomains.push('consciousness');
  // Statistics/methodology keywords
  if (titleLower.includes('statistical') || titleLower.includes('statistics') || titleLower.includes('meta-analysis')) findingDomains.push('statistics');
  if (titleLower.includes('reporting') || titleLower.includes('population') || titleLower.includes('geographic')) findingDomains.push('statistics');

  // Deduplicate domains
  const uniqueDomains = Array.from(new Set(findingDomains));

  // Collect all sources from research
  const allSources: SearchSource[] = [];
  for (const result of researchResults) {
    allSources.push(...result.sources);
  }

  // 1. Find known researchers whose domains match
  const matchingResearchers = findMatchingResearchers(uniqueDomains);

  for (const researcher of matchingResearchers) {
    const citedInSources = isResearcherCitedInSources(researcher, allSources);
    const contact = knownResearcherToContact(researcher, uniqueDomains, citedInSources);

    if (contact.score >= MIN_SCORE) {
      contacts.push(contact);
    }
  }

  // 2. Extract potential authors from sources and search for their info
  const potentialAuthors = extractPotentialAuthors(allSources);

  // Only search for authors if we have few contacts so far
  if (contacts.length < MAX_CONTACTS && potentialAuthors.length > 0) {
    // Limit author searches to avoid too many API calls
    const authorsToSearch = potentialAuthors.slice(0, 3);

    for (const authorName of authorsToSearch) {
      // Skip if we already have this person from known researchers
      if (contacts.some(c => c.name.toLowerCase().includes(authorName.toLowerCase()))) {
        continue;
      }

      const authorInfo = await searchForAuthorInfo(authorName);

      if (authorInfo && authorInfo.name) {
        // Find the source that mentions this author
        const relevantSource = allSources.find(s =>
          s.title.toLowerCase().includes(authorName.toLowerCase()) ||
          s.snippet.toLowerCase().includes(authorName.toLowerCase())
        );

        const contact: SuggestedContact = {
          name: authorInfo.name,
          affiliation: authorInfo.affiliation || 'Unknown',
          relevance: 'Author of research cited in this analysis',
          related_work: relevantSource?.title || 'Cited in research sources',
          contact_url: authorInfo.contact_url,
          score: 55, // Base score for discovered authors
        };

        contacts.push(contact);
      }
    }
  }

  // Sort by score and return top contacts
  contacts.sort((a, b) => b.score - a.score);

  return contacts.slice(0, MAX_CONTACTS);
}

/**
 * Generate a summary of why these contacts were suggested
 */
export function summarizeContactRecommendations(contacts: SuggestedContact[]): string {
  if (contacts.length === 0) {
    return 'No relevant contacts identified for this finding.';
  }

  const knownCount = contacts.filter(c => c.score >= 60).length;
  const discoveredCount = contacts.length - knownCount;

  let summary = `Identified ${contacts.length} potential contacts: `;

  if (knownCount > 0) {
    summary += `${knownCount} known researcher${knownCount > 1 ? 's' : ''} in relevant fields`;
  }

  if (discoveredCount > 0) {
    if (knownCount > 0) summary += ', ';
    summary += `${discoveredCount} author${discoveredCount > 1 ? 's' : ''} from cited research`;
  }

  summary += '.';

  return summary;
}
