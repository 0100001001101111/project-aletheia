/**
 * Discovery Agent v2 - Paper Extractor
 * Uses Claude to extract structured information from papers
 */

import Anthropic from '@anthropic-ai/sdk';
import { getAdminClient } from '../supabase-admin';
import type {
  PaperExtraction,
  ExtractionPrompt,
  ClaudeExtractionResponse,
  ExtractedStatistic,
  ExtractedCorrelation,
} from './types';


/**
 * Extract structured information from a paper using Claude
 */
export async function extractFromPaper(
  prompt: ExtractionPrompt
): Promise<ClaudeExtractionResponse | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('ANTHROPIC_API_KEY not configured');
    return null;
  }

  const anthropic = new Anthropic({ apiKey });

  const systemPrompt = `You are a research paper analyzer specializing in anomalous phenomena research (NDEs, parapsychology, UFO studies, etc.).

Extract structured information from papers. Be precise about statistics - include exact values, p-values, effect sizes, and confidence intervals when mentioned.

Respond in JSON format with these fields:
- sample_size: number or null
- methodology: brief description of research method
- population: who was studied
- statistics: array of {finding, statistic_type, value, confidence_interval, p_value, context}
- correlations: array of {variable_a, variable_b, direction, strength, conditions}
- key_findings: array of main findings (strings)
- limitations: array of acknowledged limitations
- testable_with_aletheia: boolean - could we test this with our data?
- test_requirements: what data/methodology would be needed to test

Focus on quantitative findings. Be conservative - only include statistics actually mentioned, don't infer.`;

  const userPrompt = `Extract information from this paper:

Title: ${prompt.title}
${prompt.abstract ? `\nAbstract: ${prompt.abstract}` : ''}
${prompt.full_text ? `\nContent: ${prompt.full_text.substring(0, 15000)}` : ''}
${prompt.url ? `\nURL: ${prompt.url}` : ''}

Return valid JSON only.`;

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [
        { role: 'user', content: userPrompt }
      ],
      system: systemPrompt,
    });

    const content = message.content[0];
    if (content.type !== 'text') return null;

    // Parse JSON response
    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]) as ClaudeExtractionResponse;
    return parsed;
  } catch (error) {
    console.error('Paper extraction error:', error);
    return null;
  }
}

/**
 * Save a paper extraction to the database
 */
export async function savePaperExtraction(
  extraction: PaperExtraction & { domain?: string }
): Promise<string | null> {
  const { data, error } = await getAdminClient()
    .from('aletheia_paper_extractions')
    .insert({
      lead_id: extraction.lead_id,
      domain: extraction.domain?.toLowerCase(),
      title: extraction.title,
      authors: extraction.authors,
      doi: extraction.doi,
      publication: extraction.publication,
      publication_date: extraction.publication_date,
      url: extraction.url,
      sample_size: extraction.sample_size,
      methodology: extraction.methodology,
      population: extraction.population,
      statistics: extraction.statistics,
      correlations: extraction.correlations,
      comparisons_made: extraction.comparisons_made,
      limitations: extraction.limitations,
      key_findings: extraction.key_findings,
      testable_with_aletheia: extraction.testable_with_aletheia,
      test_requirements: extraction.test_requirements,
      extraction_method: extraction.extraction_method,
      extraction_confidence: extraction.extraction_confidence,
    })
    .select('id')
    .single();

  if (error) {
    console.error('Save paper extraction error:', error);
    return null;
  }

  return data.id;
}

/**
 * Get paper extractions by domain
 */
export async function getPaperExtractionsByDomain(
  domain: string,
  limit: number = 50
): Promise<PaperExtraction[]> {
  const { data, error } = await getAdminClient()
    .from('aletheia_paper_extractions')
    .select('*')
    .eq('domain', domain.toLowerCase())
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Get paper extractions error:', error);
    return [];
  }

  return data || [];
}

/**
 * Get paper extraction by ID
 */
export async function getPaperExtractionById(id: string): Promise<PaperExtraction | null> {
  const { data, error } = await getAdminClient()
    .from('aletheia_paper_extractions')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Get paper extraction error:', error);
    return null;
  }

  return data;
}

/**
 * Extract testable statistics from a paper extraction
 */
export function extractTestableStatistics(
  extraction: PaperExtraction
): ExtractedStatistic[] {
  return extraction.statistics.filter(stat => {
    // Statistics are testable if they have:
    // 1. A clear finding
    // 2. A value we can compare
    // 3. Some indication of the population studied
    return (
      stat.finding &&
      stat.value !== undefined &&
      extraction.population
    );
  });
}

/**
 * Find correlations that could be tested with Aletheia data
 */
export function findTestableCorrelations(
  extraction: PaperExtraction,
  aletheiaVariables: string[]
): ExtractedCorrelation[] {
  const variableSet = new Set(aletheiaVariables.map(v => v.toLowerCase()));

  return extraction.correlations.filter(corr => {
    // Check if both variables might be in Aletheia
    const varA = corr.variable_a.toLowerCase();
    const varB = corr.variable_b.toLowerCase();

    return (
      variableSet.has(varA) ||
      variableSet.has(varB) ||
      aletheiaVariables.some(v => varA.includes(v.toLowerCase())) ||
      aletheiaVariables.some(v => varB.includes(v.toLowerCase()))
    );
  });
}

/**
 * Parse statistics from text (for manual extraction)
 */
export function parseStatisticsFromText(text: string): ExtractedStatistic[] {
  const statistics: ExtractedStatistic[] = [];

  // Pattern for percentages
  const percentPattern = /(\d+(?:\.\d+)?)\s*%\s*(?:of\s+)?([^,.]+)/gi;
  let match;

  while ((match = percentPattern.exec(text)) !== null) {
    statistics.push({
      finding: match[2].trim(),
      statistic_type: 'percentage',
      value: parseFloat(match[1]),
      context: match[0],
    });
  }

  // Pattern for p-values
  const pValuePattern = /p\s*[<=]\s*(\d+(?:\.\d+)?(?:e-?\d+)?)/gi;
  while ((match = pValuePattern.exec(text)) !== null) {
    // Find surrounding context
    const startIdx = Math.max(0, match.index - 100);
    const endIdx = Math.min(text.length, match.index + 100);
    const context = text.substring(startIdx, endIdx);

    statistics.push({
      finding: 'Statistical significance',
      statistic_type: 'p-value',
      value: parseFloat(match[1]),
      p_value: parseFloat(match[1]),
      context: context.trim(),
    });
  }

  // Pattern for correlation coefficients
  const correlationPattern = /r\s*=\s*(-?\d+(?:\.\d+)?)/gi;
  while ((match = correlationPattern.exec(text)) !== null) {
    const startIdx = Math.max(0, match.index - 100);
    const endIdx = Math.min(text.length, match.index + 100);
    const context = text.substring(startIdx, endIdx);

    statistics.push({
      finding: 'Correlation',
      statistic_type: 'correlation',
      value: parseFloat(match[1]),
      context: context.trim(),
    });
  }

  // Pattern for chi-square
  const chiSquarePattern = /χ²?\s*[=:]\s*(\d+(?:\.\d+)?)/gi;
  while ((match = chiSquarePattern.exec(text)) !== null) {
    const startIdx = Math.max(0, match.index - 100);
    const endIdx = Math.min(text.length, match.index + 100);
    const context = text.substring(startIdx, endIdx);

    statistics.push({
      finding: 'Chi-square test',
      statistic_type: 'chi-square',
      value: parseFloat(match[1]),
      context: context.trim(),
    });
  }

  // Pattern for sample sizes
  const samplePattern = /n\s*=\s*(\d+(?:,\d+)?)/gi;
  while ((match = samplePattern.exec(text)) !== null) {
    const startIdx = Math.max(0, match.index - 50);
    const endIdx = Math.min(text.length, match.index + 50);
    const context = text.substring(startIdx, endIdx);

    statistics.push({
      finding: 'Sample size',
      statistic_type: 'sample_size',
      value: parseInt(match[1].replace(',', '')),
      context: context.trim(),
    });
  }

  return statistics;
}
