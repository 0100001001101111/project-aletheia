/**
 * Cross-Domain Analyzer
 *
 * Detects connections between research across different domains.
 * Generates hypotheses from cross-domain patterns.
 */

import Anthropic from '@anthropic-ai/sdk';
import { executeSearch } from './web-search';
import type { CrossDomainConnection, DiscoveryLead, SearchSource } from './types';

const anthropic = new Anthropic();

// ============================================
// Known Cross-Domain Connections
// ============================================

const KNOWN_CONNECTIONS: {
  domains: string[];
  connection: string;
  key_researchers: string[];
  keywords: string[];
}[] = [
  {
    domains: ['geophysical', 'ufo', 'haunting'],
    connection: 'Electromagnetic/geomagnetic anomalies correlate with anomalous experience reports',
    key_researchers: ['Persinger', 'Derr', 'Braithwaite'],
    keywords: ['tectonic', 'electromagnetic', 'geomagnetic', 'EM field'],
  },
  {
    domains: ['nde', 'consciousness', 'parapsychology'],
    connection: 'Altered states of consciousness may enable anomalous perception',
    key_researchers: ['Greyson', 'Cardeña', 'Radin'],
    keywords: ['altered state', 'consciousness', 'perception', 'awareness'],
  },
  {
    domains: ['nde', 'mediumship', 'reincarnation'],
    connection: 'Evidence for consciousness surviving bodily death',
    key_researchers: ['Stevenson', 'Tucker', 'Beischel', 'Greyson'],
    keywords: ['survival', 'afterlife', 'consciousness', 'death'],
  },
  {
    domains: ['parapsychology', 'quantum', 'consciousness'],
    connection: 'Quantum effects may explain psi phenomena',
    key_researchers: ['Stapp', 'Radin', 'Walach'],
    keywords: ['quantum', 'entanglement', 'nonlocal', 'observer'],
  },
  {
    domains: ['geophysical', 'nde', 'haunting'],
    connection: 'EM sensitivity as individual difference affecting anomalous experiences',
    key_researchers: ['Persinger', 'Braithwaite', 'French'],
    keywords: ['sensitivity', 'electromagnetic', 'temporal lobe', 'individual differences'],
  },
  {
    domains: ['ufo', 'consciousness', 'precognition'],
    connection: 'UAP experiences may involve altered perception or precognitive elements',
    key_researchers: ['Vallée', 'Pasulka', 'Kripal'],
    keywords: ['perception', 'time', 'precognition', 'altered state'],
  },
];

// ============================================
// Connection Detection
// ============================================

/**
 * Analyze leads and findings for cross-domain connections
 */
export async function findCrossDomainConnections(
  leads: DiscoveryLead[],
  recentFindings?: { domain: string; summary: string }[]
): Promise<CrossDomainConnection[]> {
  const connections: CrossDomainConnection[] = [];

  // Group leads by domain
  const leadsByDomain = new Map<string, DiscoveryLead[]>();
  for (const lead of leads) {
    for (const domain of lead.domains || []) {
      if (!leadsByDomain.has(domain)) {
        leadsByDomain.set(domain, []);
      }
      leadsByDomain.get(domain)!.push(lead);
    }
  }

  // Check known connection patterns
  for (const knownConn of KNOWN_CONNECTIONS) {
    const matchingDomains = knownConn.domains.filter(d => leadsByDomain.has(d));

    if (matchingDomains.length >= 2) {
      // We have leads in multiple related domains
      const sourcesForConnection: DiscoveryLead[] = [];

      for (const domain of matchingDomains) {
        const domainLeads = leadsByDomain.get(domain) || [];
        // Find leads that match connection keywords
        const relevant = domainLeads.filter(lead => {
          const text = `${lead.title} ${lead.description || ''}`.toLowerCase();
          return knownConn.keywords.some(kw => text.includes(kw.toLowerCase()));
        });
        sourcesForConnection.push(...relevant.slice(0, 2));
      }

      if (sourcesForConnection.length >= 2) {
        // Build connection from found sources
        const connection = buildConnection(
          sourcesForConnection,
          knownConn.connection
        );
        if (connection) {
          connections.push(connection);
        }
      }
    }
  }

  // Use Claude to find novel connections if we have enough leads
  if (leads.length >= 5) {
    const novelConnections = await findNovelConnections(leads);
    connections.push(...novelConnections);
  }

  return connections;
}

/**
 * Build a connection object from leads
 */
function buildConnection(
  leads: DiscoveryLead[],
  connectionPattern: string
): CrossDomainConnection | null {
  if (leads.length < 2) return null;

  const source_a = {
    paper: leads[0].title,
    domain: leads[0].domains?.[0] || 'unknown',
    finding: leads[0].description || '',
    url: leads[0].source_url,
  };

  const source_b = {
    paper: leads[1].title,
    domain: leads[1].domains?.[0] || 'unknown',
    finding: leads[1].description || '',
    url: leads[1].source_url,
  };

  const source_c = leads.length > 2 ? {
    paper: leads[2].title,
    domain: leads[2].domains?.[0] || 'unknown',
    finding: leads[2].description || '',
    url: leads[2].source_url,
  } : undefined;

  // Generate hypothesis from connection
  const hypothesis = generateHypothesisFromConnection(
    source_a.domain,
    source_b.domain,
    connectionPattern
  );

  return {
    source_a,
    source_b,
    source_c,
    connection: connectionPattern,
    potential_hypothesis: hypothesis,
    confidence: calculateConnectionConfidence(leads),
  };
}

/**
 * Generate a testable hypothesis from a connection
 */
function generateHypothesisFromConnection(
  domain_a: string,
  domain_b: string,
  connection: string
): string {
  // Template-based hypothesis generation
  const templates = [
    `Phenomena in ${domain_a} and ${domain_b} share a common mechanism related to ${connection}`,
    `${domain_a} experiences predict ${domain_b} experiences in the same individuals or locations`,
    `Environmental factors affecting ${domain_a} also affect ${domain_b} through ${connection}`,
    `Individual differences in ${domain_a} sensitivity correlate with ${domain_b} experiences`,
  ];

  return templates[Math.floor(Math.random() * templates.length)];
}

/**
 * Calculate confidence based on lead quality
 */
function calculateConnectionConfidence(leads: DiscoveryLead[]): number {
  const avgQuality = leads.reduce((sum, l) => sum + (l.quality_score || 50), 0) / leads.length;
  const domainDiversity = new Set(leads.flatMap(l => l.domains || [])).size;

  let confidence = avgQuality / 100; // 0-1 base from quality

  // Bonus for multiple domains
  if (domainDiversity >= 3) confidence += 0.1;
  if (domainDiversity >= 4) confidence += 0.1;

  // Bonus for quantitative data
  const hasData = leads.some(l => l.has_quantitative_data);
  if (hasData) confidence += 0.1;

  return Math.min(0.95, confidence);
}

/**
 * Use Claude to find novel cross-domain connections
 */
async function findNovelConnections(leads: DiscoveryLead[]): Promise<CrossDomainConnection[]> {
  const connections: CrossDomainConnection[] = [];

  // Format leads for Claude
  const leadSummaries = leads.slice(0, 10).map(l => ({
    title: l.title,
    domain: l.domains?.[0] || 'unknown',
    description: l.description?.substring(0, 200),
  }));

  const prompt = `Analyze these research leads and identify potential cross-domain connections that could generate testable hypotheses.

Research Leads:
${JSON.stringify(leadSummaries, null, 2)}

Look for:
1. Similar mechanisms operating across different fields
2. Shared variables or environmental factors
3. Potential causal chains linking domains
4. Individual differences that might span domains

For each connection found, provide:
- Which leads are connected (by title)
- The nature of the connection
- A specific, testable hypothesis

Respond in JSON format:
{
  "connections": [
    {
      "lead_titles": ["Title A", "Title B"],
      "connection": "Description of how they connect",
      "hypothesis": "Specific testable hypothesis",
      "confidence": 0.7
    }
  ]
}

Only include connections with genuine scientific merit. Be conservative - it's better to miss a connection than to suggest a spurious one.`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';

    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);

      for (const conn of parsed.connections || []) {
        // Find the original leads
        const leadA = leads.find(l => l.title.includes(conn.lead_titles[0]) || conn.lead_titles[0].includes(l.title));
        const leadB = leads.find(l => l.title.includes(conn.lead_titles[1]) || conn.lead_titles[1].includes(l.title));

        if (leadA && leadB) {
          connections.push({
            source_a: {
              paper: leadA.title,
              domain: leadA.domains?.[0] || 'unknown',
              finding: leadA.description || '',
              url: leadA.source_url,
            },
            source_b: {
              paper: leadB.title,
              domain: leadB.domains?.[0] || 'unknown',
              finding: leadB.description || '',
              url: leadB.source_url,
            },
            connection: conn.connection,
            potential_hypothesis: conn.hypothesis,
            confidence: conn.confidence || 0.5,
          });
        }
      }
    }
  } catch (error) {
    console.error('Error finding novel connections:', error);
  }

  return connections;
}

// ============================================
// Citation Trail Following
// ============================================

/**
 * Search for papers cited by or citing a given paper
 */
export async function followCitationTrail(
  paperTitle: string,
  depth: number = 2
): Promise<SearchSource[]> {
  const found: SearchSource[] = [];

  // Search for citing papers
  const citingQuery = `"${paperTitle}" cited OR references research`;
  const citingResults = await executeSearch(citingQuery, `Following citations for: ${paperTitle}`);
  found.push(...citingResults.slice(0, 3));

  // If we have depth remaining, follow one level deeper
  if (depth > 1 && citingResults.length > 0) {
    const nextPaper = citingResults[0];
    const deeperResults = await followCitationTrail(nextPaper.title, depth - 1);
    found.push(...deeperResults);
  }

  return found;
}

/**
 * Extract references from a paper abstract/snippet
 */
export function extractReferences(text: string): string[] {
  const references: string[] = [];

  // Match patterns like "Smith (1985)", "Smith et al. (2020)", "Smith & Jones, 2015"
  const patterns = [
    /([A-Z][a-z]+(?:\s+et\s+al\.)?)\s*\((\d{4})\)/g,
    /([A-Z][a-z]+)\s*(?:&|and)\s*([A-Z][a-z]+),?\s*(\d{4})/g,
    /([A-Z][a-z]+)\s+(\d{4})/g,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const ref = match[0].trim();
      if (!references.includes(ref)) {
        references.push(ref);
      }
    }
  }

  return references.slice(0, 10); // Limit to prevent excessive API calls
}

/**
 * Search for a specific cited paper
 */
export async function findCitedPaper(
  authorYear: string
): Promise<SearchSource | null> {
  const query = `"${authorYear}" research paper abstract`;

  try {
    const results = await executeSearch(query, `Finding paper: ${authorYear}`);
    return results.length > 0 ? results[0] : null;
  } catch (error) {
    console.error(`Error finding cited paper ${authorYear}:`, error);
    return null;
  }
}
