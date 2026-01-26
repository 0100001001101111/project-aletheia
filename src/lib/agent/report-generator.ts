/**
 * Report Generator for Aletheia Research Agent
 * Phase 4: External Research
 *
 * Generates comprehensive research reports combining
 * internal evidence with external research findings.
 */

import Anthropic from '@anthropic-ai/sdk';
import { createAgentReadClient } from './supabase-admin';
import type {
  AgentFinding,
  AgentReport,
  ResearchQuery,
  ResearchResult,
  ResearchSynthesis,
  SearchSource,
  ReportVerdict,
  TestResult,
  ConfoundCheckResult,
} from './types';

const anthropic = new Anthropic();

/**
 * Generate a URL-safe slug from a title
 */
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 80);
}

/**
 * Determine the verdict based on evidence
 */
function determineVerdict(
  finding: AgentFinding,
  synthesis: ResearchSynthesis
): ReportVerdict {
  const effectSurvived = finding.effect_survived_controls;
  const confidence = finding.confidence + synthesis.confidence_adjustment;
  const researchSupports = synthesis.supports_finding;

  // Strong support
  if (effectSurvived && confidence >= 0.7 && researchSupports === true) {
    return 'supported';
  }

  // Clear refutation
  if (!effectSurvived && researchSupports === false) {
    return 'refuted';
  }

  // Promising but needs more data
  if (confidence >= 0.5 && (researchSupports === null || researchSupports === true)) {
    return 'needs_more_data';
  }

  // Default to inconclusive
  return 'inconclusive';
}

/**
 * Generate the report conclusion using Claude
 */
async function generateConclusion(
  finding: AgentFinding,
  synthesis: ResearchSynthesis,
  verdict: ReportVerdict
): Promise<string> {
  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [
        {
          role: 'user',
          content: `Write a conclusion for a research report about an anomalous pattern finding.

FINDING:
Title: ${finding.display_title}
Summary: ${finding.summary}
Effect survived controls: ${finding.effect_survived_controls ? 'Yes' : 'No'}

RESEARCH SYNTHESIS:
${synthesis.summary}

VERDICT: ${verdict}

Write 2-3 paragraphs that:
1. Summarize the key evidence (both internal testing and external research)
2. Explain why the verdict was reached
3. Note any important caveats or limitations
4. Suggest what would strengthen or weaken this conclusion

Write for a general audience. Be balanced and scientific in tone. Return just the conclusion text, no JSON.`,
        },
      ],
    });

    const content = message.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    return content.text;
  } catch (error) {
    console.error('Error generating conclusion:', error);
    return `Based on our internal analysis and external research, this finding is classified as "${verdict}". The statistical evidence ${finding.effect_survived_controls ? 'survived' : 'did not survive'} control checks. Further investigation is recommended to strengthen these conclusions.`;
  }
}

/**
 * Generate interpretation of statistical evidence
 */
function generateStatisticalInterpretation(
  testResults: TestResult[],
  confoundChecks: ConfoundCheckResult[]
): string {
  const parts: string[] = [];

  // Test results interpretation
  const significantTests = testResults.filter((t) => t.passed_threshold);
  if (significantTests.length > 0) {
    parts.push(
      `${significantTests.length} of ${testResults.length} statistical tests showed significant results (p < 0.01).`
    );

    const avgEffect = significantTests.reduce((sum, t) => sum + t.effect_size, 0) / significantTests.length;
    parts.push(
      `Average effect size: ${avgEffect.toFixed(3)} (${avgEffect >= 0.5 ? 'medium to large' : avgEffect >= 0.3 ? 'small to medium' : 'small'}).`
    );
  } else {
    parts.push('No tests reached statistical significance threshold.');
  }

  // Confound interpretation
  const checkedConfounds = confoundChecks.filter((c) => c.controlled);
  const survivedConfounds = checkedConfounds.filter((c) => c.effect_survived);

  if (checkedConfounds.length > 0) {
    parts.push(
      `${survivedConfounds.length} of ${checkedConfounds.length} confound checks passed.`
    );

    const failedConfounds = checkedConfounds.filter((c) => !c.effect_survived);
    if (failedConfounds.length > 0) {
      parts.push(
        `Failed checks: ${failedConfounds.map((c) => c.confound_type).join(', ')}. This suggests the observed pattern may be partially explained by these factors.`
      );
    }
  }

  return parts.join(' ');
}

/**
 * Generate a full research report
 */
export async function generateReport(
  finding: AgentFinding,
  queries: ResearchQuery[],
  results: ResearchResult[],
  synthesis: ResearchSynthesis,
  sessionId: string
): Promise<AgentReport> {
  // Extract technical details
  const technicalDetails = finding.technical_details || {};
  const testResults = (technicalDetails.test_results || []) as TestResult[];
  const confoundChecks = (technicalDetails.confound_checks || []) as ConfoundCheckResult[];

  // Consolidate sources
  const allSources: SearchSource[] = [];
  for (const result of results) {
    allSources.push(...result.sources);
  }
  // Deduplicate by URL
  const uniqueSources = Array.from(
    new Map(allSources.map((s) => [s.url, s])).values()
  ).sort((a, b) => b.relevance - a.relevance);

  // Determine verdict
  const verdict = determineVerdict(finding, synthesis);

  // Calculate final confidence
  const confidenceInitial = finding.confidence;
  const confidenceFinal = Math.max(0, Math.min(1, confidenceInitial + synthesis.confidence_adjustment));

  // Generate conclusion
  const conclusion = await generateConclusion(finding, synthesis, verdict);

  // Generate slug
  const slug = generateSlug(finding.display_title) + '-' + Date.now().toString(36);

  // Generate statistical interpretation
  const statisticalInterpretation = generateStatisticalInterpretation(testResults, confoundChecks);

  // Build the report
  const report: AgentReport = {
    finding_id: finding.id,
    session_id: sessionId,
    title: finding.title,
    display_title: finding.display_title,
    slug,
    summary: finding.summary + '\n\n' + synthesis.summary,
    statistical_evidence: {
      pattern: finding.title,
      tests: testResults,
      confounds: confoundChecks,
      interpretation: statisticalInterpretation,
    },
    research_queries: queries,
    sources: uniqueSources,
    synthesis: synthesis.summary,
    conclusion,
    recommended_actions: synthesis.recommended_next_steps,
    confidence_initial: confidenceInitial,
    confidence_final: confidenceFinal,
    verdict,
    status: 'draft',
  };

  return report;
}

/**
 * Save a report to the database
 */
export async function saveReport(report: AgentReport): Promise<string> {
  const supabase = createAgentReadClient();

  const { data, error } = await supabase
    .from('aletheia_agent_reports')
    .insert({
      finding_id: report.finding_id,
      session_id: report.session_id,
      title: report.title,
      display_title: report.display_title,
      slug: report.slug,
      summary: report.summary,
      statistical_evidence: report.statistical_evidence,
      research_queries: report.research_queries,
      sources: report.sources,
      synthesis: report.synthesis,
      conclusion: report.conclusion,
      recommended_actions: report.recommended_actions,
      confidence_initial: report.confidence_initial,
      confidence_final: report.confidence_final,
      verdict: report.verdict,
      status: report.status,
    })
    .select('id')
    .single();

  if (error) {
    throw new Error(`Failed to save report: ${error.message}`);
  }

  return data.id;
}

/**
 * Publish a report (change status from draft to published)
 */
export async function publishReport(reportId: string): Promise<void> {
  const supabase = createAgentReadClient();

  const { error } = await supabase
    .from('aletheia_agent_reports')
    .update({
      status: 'published',
      published_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', reportId);

  if (error) {
    throw new Error(`Failed to publish report: ${error.message}`);
  }
}

/**
 * Get all reports with optional filtering
 */
export async function getReports(options?: {
  status?: 'draft' | 'published';
  verdict?: ReportVerdict;
  limit?: number;
  offset?: number;
}): Promise<AgentReport[]> {
  const supabase = createAgentReadClient();

  let query = supabase
    .from('aletheia_agent_reports')
    .select('*')
    .order('created_at', { ascending: false });

  if (options?.status) {
    query = query.eq('status', options.status);
  }

  if (options?.verdict) {
    query = query.eq('verdict', options.verdict);
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  if (options?.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch reports: ${error.message}`);
  }

  return (data || []) as AgentReport[];
}

/**
 * Get a single report by slug
 */
export async function getReportBySlug(slug: string): Promise<AgentReport | null> {
  const supabase = createAgentReadClient();

  const { data, error } = await supabase
    .from('aletheia_agent_reports')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Not found
    }
    throw new Error(`Failed to fetch report: ${error.message}`);
  }

  return data as AgentReport;
}

/**
 * Get report counts by status and verdict
 */
export async function getReportCounts(): Promise<{
  total: number;
  published: number;
  draft: number;
  byVerdict: Record<string, number>;
}> {
  const supabase = createAgentReadClient();

  const { data, error } = await supabase
    .from('aletheia_agent_reports')
    .select('status, verdict');

  if (error) {
    throw new Error(`Failed to fetch report counts: ${error.message}`);
  }

  const counts = {
    total: data?.length || 0,
    published: 0,
    draft: 0,
    byVerdict: {} as Record<string, number>,
  };

  for (const report of data || []) {
    if (report.status === 'published') {
      counts.published++;
    } else {
      counts.draft++;
    }

    const verdict = report.verdict || 'unknown';
    counts.byVerdict[verdict] = (counts.byVerdict[verdict] || 0) + 1;
  }

  return counts;
}
