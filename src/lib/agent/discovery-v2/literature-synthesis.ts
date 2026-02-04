/**
 * Discovery Agent v2 - Literature Synthesis
 * Combines findings across papers to identify consensus, contested findings, and gaps
 */

import Anthropic from '@anthropic-ai/sdk';
import { getAdminClient } from '../supabase-admin';
import type {
  PaperExtraction,
  LiteratureSynthesis,
  ConsensusFinding,
  ContestedFinding,
  LiteratureGap,
  ExtractedStatistic,
} from './types';


/**
 * Synthesize literature from multiple paper extractions
 */
export async function synthesizeLiterature(
  topic: string,
  domain: string,
  papers: PaperExtraction[]
): Promise<LiteratureSynthesis | null> {
  if (papers.length < 2) {
    console.log('Need at least 2 papers for synthesis');
    return null;
  }

  // Extract and group findings
  const allFindings = extractAllFindings(papers);
  const consensus = findConsensusFndings(allFindings, papers);
  const contested = findContestedFindings(allFindings, papers);
  const gaps = identifyGaps(papers, domain);

  // Calculate totals
  const totalSampleSize = papers.reduce((sum, p) => sum + (p.sample_size || 0), 0);
  const years = papers
    .map(p => p.publication_date ? new Date(p.publication_date).getFullYear() : null)
    .filter((y): y is number => y !== null);

  // Generate executive summary using Claude
  const summary = await generateExecutiveSummary(topic, domain, consensus, contested, gaps, papers.length);

  const synthesis: LiteratureSynthesis = {
    topic,
    domain,
    papers_reviewed: papers.length,
    paper_ids: papers.map(p => p.id).filter((id): id is string => id !== undefined),
    consensus_findings: consensus,
    contested_findings: contested,
    gaps_in_literature: gaps,
    total_sample_size: totalSampleSize,
    year_range_start: years.length > 0 ? Math.min(...years) : undefined,
    year_range_end: years.length > 0 ? Math.max(...years) : undefined,
    executive_summary: summary,
    methodology_notes: generateMethodologyNotes(papers),
    recommendations: generateRecommendations(consensus, contested, gaps),
    status: 'draft',
  };

  return synthesis;
}

/**
 * Extract all findings from papers grouped by topic
 */
function extractAllFindings(papers: PaperExtraction[]): Map<string, Array<{
  paper: PaperExtraction;
  statistic: ExtractedStatistic;
}>> {
  const findingsMap = new Map<string, Array<{
    paper: PaperExtraction;
    statistic: ExtractedStatistic;
  }>>();

  papers.forEach(paper => {
    paper.statistics.forEach(stat => {
      // Normalize finding text for grouping
      const normalizedFinding = normalizeFinding(stat.finding);

      if (!findingsMap.has(normalizedFinding)) {
        findingsMap.set(normalizedFinding, []);
      }
      findingsMap.get(normalizedFinding)!.push({ paper, statistic: stat });
    });

    // Also group key findings
    paper.key_findings.forEach(finding => {
      const normalized = normalizeFinding(finding);
      if (!findingsMap.has(normalized)) {
        findingsMap.set(normalized, []);
      }
      findingsMap.get(normalized)!.push({
        paper,
        statistic: {
          finding,
          statistic_type: 'qualitative',
          value: 1,
          context: finding,
        },
      });
    });
  });

  return findingsMap;
}

/**
 * Normalize finding text for grouping
 */
function normalizeFinding(finding: string): string {
  return finding
    .toLowerCase()
    .replace(/\d+(?:\.\d+)?%?/g, 'X') // Replace numbers with X
    .replace(/[^\w\s]/g, '') // Remove punctuation
    .trim();
}

/**
 * Find consensus findings (multiple papers agree)
 */
function findConsensusFndings(
  findingsMap: Map<string, Array<{ paper: PaperExtraction; statistic: ExtractedStatistic }>>,
  papers: PaperExtraction[]
): ConsensusFinding[] {
  const consensus: ConsensusFinding[] = [];

  findingsMap.forEach((entries, normalizedFinding) => {
    // Need at least 2 papers mentioning similar findings
    if (entries.length < 2) return;

    const uniquePapers = new Set(entries.map(e => e.paper.id));
    if (uniquePapers.size < 2) return;

    // Calculate aggregate statistics
    const values = entries
      .map(e => e.statistic.value)
      .filter(v => !isNaN(v));

    const totalN = entries.reduce((sum, e) => sum + (e.paper.sample_size || 0), 0);

    // Determine confidence based on consistency and sample size
    const confidence = determineConfidence(values, totalN, uniquePapers.size);

    // Get original finding text from first entry
    const representativeFinding = entries[0].statistic.finding;

    consensus.push({
      finding: representativeFinding,
      supporting_papers: uniquePapers.size,
      total_n: totalN,
      effect_size_range: values.length > 0 ? [Math.min(...values), Math.max(...values)] : [0, 0],
      confidence,
    });
  });

  // Sort by confidence and number of supporting papers
  return consensus.sort((a, b) => {
    const confOrder = { high: 3, medium: 2, low: 1 };
    return confOrder[b.confidence] - confOrder[a.confidence] || b.supporting_papers - a.supporting_papers;
  });
}

/**
 * Determine confidence level
 */
function determineConfidence(
  values: number[],
  totalN: number,
  numPapers: number
): 'high' | 'medium' | 'low' {
  // High confidence: large samples, consistent values, many papers
  if (totalN > 500 && numPapers >= 3) {
    const range = values.length > 0 ? Math.max(...values) - Math.min(...values) : 0;
    const mean = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
    const cv = mean !== 0 ? range / Math.abs(mean) : 1;

    if (cv < 0.3) return 'high';
    if (cv < 0.6) return 'medium';
    return 'low';
  }

  if (totalN > 100 && numPapers >= 2) return 'medium';

  return 'low';
}

/**
 * Find contested findings (papers disagree)
 */
function findContestedFindings(
  findingsMap: Map<string, Array<{ paper: PaperExtraction; statistic: ExtractedStatistic }>>,
  papers: PaperExtraction[]
): ContestedFinding[] {
  const contested: ContestedFinding[] = [];

  findingsMap.forEach((entries, normalizedFinding) => {
    if (entries.length < 2) return;

    // Check for contradictory values (opposite directions or very different magnitudes)
    const values = entries.map(e => e.statistic.value);
    const hasNegative = values.some(v => v < 0);
    const hasPositive = values.some(v => v > 0);

    // For percentages, check large discrepancies
    const isPercentage = entries.some(e => e.statistic.statistic_type === 'percentage');
    const hasLargeDiscrepancy = isPercentage && (Math.max(...values) - Math.min(...values) > 30);

    if ((hasNegative && hasPositive) || hasLargeDiscrepancy) {
      // Group by direction/magnitude
      const supporting = entries
        .filter(e => e.statistic.value > 0)
        .map(e => e.paper.title);
      const contradicting = entries
        .filter(e => e.statistic.value <= 0)
        .map(e => e.paper.title);

      if (supporting.length > 0 && contradicting.length > 0) {
        contested.push({
          finding: entries[0].statistic.finding,
          supporting_papers: supporting,
          contradicting_papers: contradicting,
          likely_explanation: 'Methodological differences or population variations',
        });
      }
    }
  });

  return contested;
}

/**
 * Identify gaps in the literature
 */
function identifyGaps(papers: PaperExtraction[], domain: string): LiteratureGap[] {
  const gaps: LiteratureGap[] = [];

  // Common research questions by domain
  const domainQuestions: Record<string, string[]> = {
    nde: [
      'Do NDEs occur in different cultural contexts similarly?',
      'What is the relationship between anesthesia depth and NDE occurrence?',
      'Do blind-from-birth subjects report visual NDEs?',
      'How do pediatric NDEs differ from adult NDEs?',
      'What predicts who has an NDE vs who does not during cardiac arrest?',
    ],
    ufo: [
      'What is the relationship between sightings and geomagnetic activity?',
      'Do close encounters cluster in specific geological formations?',
      'Are there temporal patterns (time of day, season) in sightings?',
      'How do witness characteristics correlate with report details?',
    ],
    ganzfeld: [
      'Does sender-receiver relationship affect hit rates?',
      'What personality traits predict success?',
      'Are there optimal session durations?',
      'Do experienced receivers outperform novices?',
    ],
  };

  const questions = domainQuestions[domain] || [];

  // Check which questions are addressed
  questions.forEach(question => {
    const addressed = papers.some(paper => {
      const allText = [
        paper.methodology || '',
        ...paper.key_findings,
        ...paper.statistics.map(s => s.context),
      ].join(' ').toLowerCase();

      return question.toLowerCase().split(' ').some(word =>
        word.length > 4 && allText.includes(word)
      );
    });

    if (!addressed) {
      gaps.push({
        question,
        why_unstudied: 'Not addressed in reviewed literature',
        could_we_address: checkIfAletheiaCanAddress(question, domain),
      });
    }
  });

  // Also check for acknowledged limitations that suggest gaps
  papers.forEach(paper => {
    paper.limitations.forEach(limitation => {
      if (limitation.toLowerCase().includes('future research') ||
          limitation.toLowerCase().includes('further study')) {
        gaps.push({
          question: `Address: ${limitation}`,
          why_unstudied: 'Acknowledged limitation in existing research',
          could_we_address: true,
        });
      }
    });
  });

  return gaps.slice(0, 10); // Limit to top 10 gaps
}

/**
 * Check if Aletheia could address a research question
 */
function checkIfAletheiaCanAddress(question: string, domain: string): boolean {
  // Keywords that suggest we have relevant data
  const addressableKeywords = [
    'cultural', 'demographic', 'age', 'gender', 'geographic', 'temporal',
    'correlation', 'comparison', 'frequency', 'rate', 'percentage',
  ];

  const questionLower = question.toLowerCase();
  return addressableKeywords.some(keyword => questionLower.includes(keyword));
}

/**
 * Generate executive summary using Claude
 */
async function generateExecutiveSummary(
  topic: string,
  domain: string,
  consensus: ConsensusFinding[],
  contested: ContestedFinding[],
  gaps: LiteratureGap[],
  paperCount: number
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return `Literature synthesis of ${paperCount} papers on "${topic}" in ${domain}. Found ${consensus.length} consensus findings, ${contested.length} contested findings, and ${gaps.length} gaps.`;
  }

  const anthropic = new Anthropic({ apiKey });

  const prompt = `Write a 2-3 paragraph executive summary of this literature synthesis:

Topic: ${topic}
Domain: ${domain}
Papers reviewed: ${paperCount}

Consensus findings (${consensus.length}):
${consensus.slice(0, 5).map(c => `- ${c.finding} (${c.supporting_papers} papers, n=${c.total_n})`).join('\n')}

Contested findings (${contested.length}):
${contested.slice(0, 3).map(c => `- ${c.finding}: supported by ${c.supporting_papers.length}, contradicted by ${c.contradicting_papers.length}`).join('\n')}

Gaps identified (${gaps.length}):
${gaps.slice(0, 3).map(g => `- ${g.question}`).join('\n')}

Be concise and scientific. Focus on the most important findings and what they mean for the field.`;

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = message.content[0];
    return content.type === 'text' ? content.text : '';
  } catch (error) {
    console.error('Summary generation error:', error);
    return `Literature synthesis of ${paperCount} papers on "${topic}" in ${domain}.`;
  }
}

/**
 * Generate methodology notes
 */
function generateMethodologyNotes(papers: PaperExtraction[]): string {
  const methodologies = papers
    .map(p => p.methodology)
    .filter((m): m is string => !!m);

  const methodCounts: Record<string, number> = {};
  methodologies.forEach(m => {
    const normalized = m.toLowerCase();
    methodCounts[normalized] = (methodCounts[normalized] || 0) + 1;
  });

  const common = Object.entries(methodCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([method, count]) => `${method} (${count})`)
    .join(', ');

  return `Common methodologies: ${common || 'Various'}.`;
}

/**
 * Generate recommendations based on synthesis
 */
function generateRecommendations(
  consensus: ConsensusFinding[],
  contested: ContestedFinding[],
  gaps: LiteratureGap[]
): string[] {
  const recommendations: string[] = [];

  // Recommendations for contested findings
  if (contested.length > 0) {
    recommendations.push(`Resolve contested findings (${contested.length}) through targeted analysis`);
  }

  // Recommendations for gaps we can address
  const addressableGaps = gaps.filter(g => g.could_we_address);
  if (addressableGaps.length > 0) {
    recommendations.push(`Address ${addressableGaps.length} gaps using Aletheia data`);
    addressableGaps.slice(0, 2).forEach(g => {
      recommendations.push(`  → ${g.question}`);
    });
  }

  // Recommendations for high-confidence consensus
  const highConfidence = consensus.filter(c => c.confidence === 'high');
  if (highConfidence.length > 0) {
    recommendations.push(`Verify ${highConfidence.length} high-confidence findings with independent data`);
  }

  return recommendations;
}

/**
 * Save literature synthesis to database
 */
export async function saveLiteratureSynthesis(
  synthesis: LiteratureSynthesis
): Promise<string | null> {
  const { data, error } = await getAdminClient()
    .from('aletheia_literature_syntheses')
    .insert({
      topic: synthesis.topic,
      domain: synthesis.domain,
      papers_reviewed: synthesis.papers_reviewed,
      paper_ids: synthesis.paper_ids,
      consensus_findings: synthesis.consensus_findings,
      contested_findings: synthesis.contested_findings,
      gaps_in_literature: synthesis.gaps_in_literature,
      total_sample_size: synthesis.total_sample_size,
      year_range_start: synthesis.year_range_start,
      year_range_end: synthesis.year_range_end,
      executive_summary: synthesis.executive_summary,
      methodology_notes: synthesis.methodology_notes,
      recommendations: synthesis.recommendations,
      status: synthesis.status,
    })
    .select('id')
    .single();

  if (error) {
    console.error('Save literature synthesis error:', error);
    return null;
  }

  return data.id;
}

/**
 * Get literature synthesis by domain
 */
export async function getLiteratureSyntheses(
  domain?: string,
  limit: number = 20
): Promise<LiteratureSynthesis[]> {
  let query = getAdminClient()
    .from('aletheia_literature_syntheses')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (domain) {
    query = query.eq('domain', domain);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Get literature syntheses error:', error);
    return [];
  }

  return data || [];
}
