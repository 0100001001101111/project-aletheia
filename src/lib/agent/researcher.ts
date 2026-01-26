/**
 * Research Protocol for Aletheia Research Agent
 * Phase 4: External Research
 *
 * When the agent has a finding that needs more validation,
 * this module orchestrates external research to provide context.
 */

import Anthropic from '@anthropic-ai/sdk';
import type {
  AgentFinding,
  ResearchQuery,
  ResearchResult,
  ResearchSynthesis,
  SearchSource,
  TestResult,
  ConfoundCheckResult,
} from './types';
import { executeSearches, consolidateSources } from './web-search';

// Initialize Anthropic client
const anthropic = new Anthropic();

/**
 * Check if a finding needs external research
 */
export function needsResearch(finding: AgentFinding): boolean {
  // Findings that need research:
  // 1. Passed statistical tests but failed confounds
  // 2. Confidence < 80%
  // 3. Flagged as needs_info (cast to string for extended status types)

  const status = finding.review_status as string;
  if (status === 'needs_info') {
    return true;
  }

  // Check if it passed tests but failed confounds
  if (!finding.effect_survived_controls && finding.confidence > 0.5) {
    return true;
  }

  // Low-to-moderate confidence findings benefit from research
  if (finding.confidence < 0.8 && finding.confidence > 0.4) {
    return true;
  }

  return false;
}

/**
 * Generate targeted search queries based on the finding
 */
export async function generateResearchQueries(
  finding: AgentFinding
): Promise<ResearchQuery[]> {
  const technicalDetails = finding.technical_details || {};
  const testResults = (technicalDetails.test_results || []) as TestResult[];
  const confoundChecks = (technicalDetails.confound_checks || []) as ConfoundCheckResult[];

  // Extract domains from the finding
  const domains = extractDomains(finding);

  // Build context for query generation
  const context = buildResearchContext(finding, testResults, confoundChecks);

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      messages: [
        {
          role: 'user',
          content: `You are a research assistant for the Aletheia anomaly research platform. Generate targeted web search queries to investigate a finding.

FINDING:
Title: ${finding.display_title}
Technical Title: ${finding.title}
Summary: ${finding.summary}
Domains: ${domains.join(', ')}
Confidence: ${(finding.confidence * 100).toFixed(0)}%
Effect survived controls: ${finding.effect_survived_controls ? 'Yes' : 'No'}

CONTEXT:
${context}

Generate 4-6 search queries covering these categories:
1. PRIOR_RESEARCH - Has this pattern been studied before? Look for academic papers, research databases.
2. ALTERNATIVE_DATA - Are there independent data sources that could validate this?
3. MECHANISM - What theories would explain this pattern if real?
4. DEBUNKING - Has this type of pattern been critiqued or refuted?

Return ONLY a JSON array of queries. Each query should have:
- type: "prior_research" | "alternative_data" | "mechanism" | "debunking"
- query: The actual search string (specific, not too long)
- context: Brief explanation of what we're looking for

Example format:
[
  {"type": "prior_research", "query": "UFO Bigfoot correlation academic study", "context": "Looking for prior academic work on this correlation"},
  {"type": "debunking", "query": "paranormal report clustering reporting bias", "context": "Checking if this pattern is explained by reporting bias"}
]

Return ONLY the JSON array, no other text.`,
        },
      ],
    });

    // Parse the response
    const content = message.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    // Extract JSON from response
    const jsonMatch = content.text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('Could not parse queries from response');
    }

    const queries = JSON.parse(jsonMatch[0]) as ResearchQuery[];

    // Validate and return
    return queries.filter(
      (q) =>
        q.type &&
        q.query &&
        ['prior_research', 'alternative_data', 'mechanism', 'debunking'].includes(q.type)
    );
  } catch (error) {
    console.error('Error generating research queries:', error);

    // Return fallback queries based on the finding
    return generateFallbackQueries(finding, domains);
  }
}

/**
 * Extract domains from finding
 */
function extractDomains(finding: AgentFinding): string[] {
  // Try to extract from technical_details or title
  const title = finding.title.toLowerCase();
  const domains: string[] = [];

  if (title.includes('ufo') || title.includes('uap')) domains.push('UFO');
  if (title.includes('bigfoot') || title.includes('sasquatch')) domains.push('Bigfoot');
  if (title.includes('haunting') || title.includes('ghost')) domains.push('Haunting');
  if (title.includes('nde') || title.includes('near-death')) domains.push('NDE');
  if (title.includes('ganzfeld')) domains.push('Ganzfeld');
  if (title.includes('geophysical') || title.includes('tectonic')) domains.push('Geophysical');
  if (title.includes('cryptid')) domains.push('Cryptid');

  // Check for co-location patterns
  if (title.includes('co-location') || title.includes('correlation') || title.includes('cluster')) {
    domains.push('Co-location Pattern');
  }

  return domains.length > 0 ? domains : ['Anomaly Research'];
}

/**
 * Build context string for research
 */
function buildResearchContext(
  finding: AgentFinding,
  testResults: TestResult[],
  confoundChecks: ConfoundCheckResult[]
): string {
  const parts: string[] = [];

  // Add test results summary
  if (testResults.length > 0) {
    const passedTests = testResults.filter((t) => t.passed_threshold).length;
    parts.push(`Statistical tests: ${passedTests}/${testResults.length} passed threshold`);

    for (const test of testResults) {
      parts.push(
        `  - ${test.test_type}: p=${test.p_value.toFixed(4)}, effect=${test.effect_size.toFixed(3)}`
      );
    }
  }

  // Add confound check summary
  if (confoundChecks.length > 0) {
    const survivedConfounds = confoundChecks.filter((c) => c.effect_survived).length;
    const checkedConfounds = confoundChecks.filter((c) => c.controlled).length;
    parts.push(`Confound checks: ${survivedConfounds}/${checkedConfounds} survived`);

    for (const check of confoundChecks) {
      if (check.controlled && !check.effect_survived) {
        parts.push(`  - FAILED: ${check.confound_type} - ${check.notes}`);
      }
    }
  }

  // Add suggested prediction if available
  if (finding.suggested_prediction) {
    parts.push(`Suggested prediction: ${finding.suggested_prediction}`);
  }

  return parts.join('\n');
}

/**
 * Generate fallback queries when Claude API fails
 */
function generateFallbackQueries(finding: AgentFinding, domains: string[]): ResearchQuery[] {
  const domainString = domains.join(' ');

  return [
    {
      type: 'prior_research',
      query: `${domainString} correlation academic study research`,
      context: 'Looking for prior academic work on this pattern',
    },
    {
      type: 'alternative_data',
      query: `${domainString} database methodology independent`,
      context: 'Seeking independent data sources for validation',
    },
    {
      type: 'mechanism',
      query: `${domainString} explanation theory hypothesis`,
      context: 'Exploring theoretical explanations for the pattern',
    },
    {
      type: 'debunking',
      query: `paranormal ${domainString} reporting bias skeptic`,
      context: 'Checking for critiques or alternative explanations',
    },
  ];
}

/**
 * Synthesize research results using Claude
 */
export async function synthesizeResearch(
  finding: AgentFinding,
  results: ResearchResult[]
): Promise<ResearchSynthesis> {
  // Consolidate all sources
  const allSources: SearchSource[] = [];
  for (const result of results) {
    allSources.push(...result.sources);
  }

  // Build research summary for Claude
  const researchSummary = results
    .map((r) => {
      const sourceList = r.sources
        .map((s) => `  - "${s.title}": ${s.snippet}`)
        .join('\n');
      return `Query Type: ${r.query.type}\nQuery: "${r.query.query}"\nSources:\n${sourceList}`;
    })
    .join('\n\n');

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: `You are analyzing research results for the Aletheia anomaly research platform. Synthesize the external research into a coherent assessment.

ORIGINAL FINDING:
Title: ${finding.display_title}
Summary: ${finding.summary}
Confidence: ${(finding.confidence * 100).toFixed(0)}%
Effect survived controls: ${finding.effect_survived_controls ? 'Yes' : 'No'}

EXTERNAL RESEARCH RESULTS:
${researchSummary}

Provide a synthesis in the following JSON format:
{
  "summary": "2-3 paragraph summary of what the external research shows, written for a general audience",
  "supports_finding": true/false/null (null if evidence is mixed),
  "confidence_adjustment": number between -0.3 and 0.3 (how much should the finding's confidence change based on this research),
  "recommended_next_steps": ["array", "of", "recommended", "actions"]
}

Consider:
- Does prior research support or contradict this finding?
- Are there methodological concerns raised by the research?
- What do skeptical sources say?
- What additional validation would help?

Return ONLY the JSON object, no other text.`,
        },
      ],
    });

    const content = message.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    // Extract JSON from response
    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Could not parse synthesis from response');
    }

    const synthesis = JSON.parse(jsonMatch[0]);

    return {
      summary: synthesis.summary,
      key_sources: allSources.slice(0, 5), // Top 5 sources
      supports_finding: synthesis.supports_finding,
      confidence_adjustment: Math.max(-0.3, Math.min(0.3, synthesis.confidence_adjustment || 0)),
      recommended_next_steps: synthesis.recommended_next_steps || [],
    };
  } catch (error) {
    console.error('Error synthesizing research:', error);

    // Return fallback synthesis
    return {
      summary:
        'External research was conducted but automated synthesis failed. Manual review of sources is recommended.',
      key_sources: allSources.slice(0, 5),
      supports_finding: null,
      confidence_adjustment: 0,
      recommended_next_steps: [
        'Review sources manually',
        'Consult domain expert',
        'Consider additional confound checks',
      ],
    };
  }
}

/**
 * Conduct full research protocol for a finding
 */
export async function conductResearch(
  finding: AgentFinding
): Promise<{
  queries: ResearchQuery[];
  results: ResearchResult[];
  synthesis: ResearchSynthesis;
}> {
  // Step 1: Generate research queries
  const queries = await generateResearchQueries(finding);

  // Step 2: Execute searches
  const searchResultsMap = await executeSearches(queries);

  // Step 3: Organize results by query
  const results: ResearchResult[] = [];
  for (const query of queries) {
    const sources = searchResultsMap.get(query.query) || [];
    results.push({
      query,
      sources,
      synthesis: '', // Individual synthesis not needed
    });
  }

  // Step 4: Synthesize all results
  const synthesis = await synthesizeResearch(finding, results);

  return { queries, results, synthesis };
}
