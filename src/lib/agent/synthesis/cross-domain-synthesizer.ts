/**
 * Synthesis Agent - Cross-Domain Synthesizer
 * Generate synthesis reports across multiple domains
 */

import { getAdminClient } from '../supabase-admin';
import Anthropic from '@anthropic-ai/sdk';
import type { CrossDomainSynthesis, CrossCuttingPattern } from './types';


// Predefined synthesis themes
const SYNTHESIS_THEMES = [
  {
    id: 'consciousness_anomalies',
    name: 'Consciousness Anomalies',
    description: 'Patterns in altered states of consciousness across domains',
    relevant_domains: ['nde', 'ganzfeld', 'crisis_apparition'],
  },
  {
    id: 'physical_manifestations',
    name: 'Physical Manifestations',
    description: 'Reported physical traces and effects',
    relevant_domains: ['ufo', 'haunting', 'bigfoot'],
  },
  {
    id: 'temporal_patterns',
    name: 'Temporal Patterns',
    description: 'Time-related anomalies and correlations',
    relevant_domains: ['nde', 'ufo', 'haunting'],
  },
  {
    id: 'entity_encounters',
    name: 'Entity Encounters',
    description: 'Reports of non-human entity contact',
    relevant_domains: ['nde', 'ufo', 'haunting', 'bigfoot'],
  },
  {
    id: 'stress_signal',
    name: 'Stress-Signal Hypothesis',
    description: 'Testing whether extreme stress produces anomalous signal',
    relevant_domains: ['nde', 'crisis_apparition', 'ufo', 'haunting'],
  },
];

/**
 * Get cross-domain correlations from Connection Agent
 */
async function getCrossDomainCorrelations(domains: string[]): Promise<Array<{
  domainA: string;
  domainB: string;
  type: string;
  coefficient: number;
  significant: boolean;
}>> {
  const { data, error } = await getAdminClient()
    .from('aletheia_cross_domain_correlations')
    .select('domain_a, domain_b, correlation_type, correlation_coefficient, is_significant')
    .in('domain_a', domains)
    .in('domain_b', domains)
    .eq('is_significant', true)
    .order('correlation_coefficient', { ascending: false })
    .limit(20);

  if (error) {
    console.error('Get cross-domain correlations error:', error);
    return [];
  }

  return (data || []).map(c => ({
    domainA: c.domain_a,
    domainB: c.domain_b,
    type: c.correlation_type,
    coefficient: c.correlation_coefficient,
    significant: c.is_significant,
  }));
}

/**
 * Get Keel test results
 */
async function getKeelTestResults(): Promise<Array<{
  name: string;
  domains: string[];
  correlation: number;
  supports: boolean;
}>> {
  const { data, error } = await getAdminClient()
    .from('aletheia_keel_tests')
    .select('test_name, domains_tested, overall_correlation, supports_keel_hypothesis')
    .order('overall_correlation', { ascending: false })
    .limit(5);

  if (error) {
    console.error('Get Keel tests error:', error);
    return [];
  }

  return (data || []).map(t => ({
    name: t.test_name,
    domains: t.domains_tested,
    correlation: t.overall_correlation,
    supports: t.supports_keel_hypothesis,
  }));
}

/**
 * Get unified theories
 */
async function getUnifiedTheoriesForDomains(domains: string[]): Promise<Array<{
  name: string;
  mechanism: string;
  plausibility: string;
}>> {
  const { data, error } = await getAdminClient()
    .from('aletheia_unified_theories')
    .select('theory_name, core_mechanism, overall_plausibility, domains_explained')
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('Get unified theories error:', error);
    return [];
  }

  // Filter to theories that explain at least 2 of our domains
  return (data || [])
    .filter(t => {
      const explained = t.domains_explained || [];
      const overlap = domains.filter(d => explained.includes(d));
      return overlap.length >= 2;
    })
    .map(t => ({
      name: t.theory_name,
      mechanism: t.core_mechanism,
      plausibility: t.overall_plausibility || 'speculative',
    }));
}

/**
 * Get record counts by domain
 */
async function getDomainCounts(domains: string[]): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};

  for (const domain of domains) {
    const { count } = await getAdminClient()
      .from('aletheia_investigations')
      .select('*', { count: 'exact', head: true })
      .eq('investigation_type', domain);

    counts[domain] = count || 0;
  }

  return counts;
}

/**
 * Identify cross-cutting patterns
 */
function identifyPatterns(
  correlations: Array<{ domainA: string; domainB: string; type: string; coefficient: number }>,
  keelResults: Array<{ domains: string[]; correlation: number; supports: boolean }>
): CrossCuttingPattern[] {
  const patterns: CrossCuttingPattern[] = [];

  // Pattern from significant correlations
  const temporalCorrs = correlations.filter(c => c.type === 'temporal');
  if (temporalCorrs.length > 0) {
    const domains = new Set<string>();
    temporalCorrs.forEach(c => {
      domains.add(c.domainA);
      domains.add(c.domainB);
    });
    patterns.push({
      pattern: 'Temporal clustering across domains',
      domains: Array.from(domains),
      evidence: `${temporalCorrs.length} significant temporal correlations found`,
      strength: temporalCorrs.some(c => c.coefficient > 0.3) ? 'strong' : 'moderate',
    });
  }

  const geoCorrs = correlations.filter(c => c.type === 'geographic');
  if (geoCorrs.length > 0) {
    const domains = new Set<string>();
    geoCorrs.forEach(c => {
      domains.add(c.domainA);
      domains.add(c.domainB);
    });
    patterns.push({
      pattern: 'Geographic co-occurrence',
      domains: Array.from(domains),
      evidence: `${geoCorrs.length} significant geographic correlations found`,
      strength: geoCorrs.some(c => c.coefficient > 0.3) ? 'strong' : 'moderate',
    });
  }

  // Pattern from Keel tests
  const supportingKeel = keelResults.filter(k => k.supports);
  if (supportingKeel.length > 0) {
    const allDomains = new Set<string>();
    supportingKeel.forEach(k => k.domains.forEach(d => allDomains.add(d)));
    patterns.push({
      pattern: 'High-strangeness correlation (Keel effect)',
      domains: Array.from(allDomains),
      evidence: `${supportingKeel.length} Keel tests show positive correlation`,
      strength: supportingKeel.some(k => k.correlation > 0.3) ? 'moderate' : 'weak',
    });
  }

  return patterns;
}

/**
 * Generate synthesis using AI
 */
async function generateSynthesisSummary(
  theme: string,
  domains: string[],
  patterns: CrossCuttingPattern[],
  theories: Array<{ name: string; mechanism: string; plausibility: string }>,
  totalRecords: number
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return `Cross-domain analysis of ${domains.join(', ')} identified ${patterns.length} patterns across ${totalRecords} records.`;
  }

  const anthropic = new Anthropic({ apiKey });

  const patternList = patterns.map(p => `- ${p.pattern} (${p.strength}): ${p.evidence}`).join('\n');
  const theoryList = theories.map(t => `- ${t.name}: ${t.plausibility}`).join('\n');

  const prompt = `Write a 2-3 paragraph executive summary for a cross-domain synthesis report.

Theme: ${theme}
Domains analyzed: ${domains.join(', ')}
Total records: ${totalRecords}

Patterns identified:
${patternList || 'No significant patterns'}

Relevant theories:
${theoryList || 'No unified theories'}

Be scientific, acknowledge limitations, focus on empirical findings not speculation.`;

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = message.content[0];
    return content.type === 'text' ? content.text : '';
  } catch (error) {
    console.error('Synthesis summary error:', error);
    return `Cross-domain analysis of ${domains.join(', ')}.`;
  }
}

/**
 * Generate a cross-domain synthesis
 */
export async function generateCrossDomainSynthesis(
  themeId: string,
  customDomains?: string[]
): Promise<CrossDomainSynthesis | null> {
  const theme = SYNTHESIS_THEMES.find(t => t.id === themeId);
  if (!theme && !customDomains) {
    console.log('Theme not found and no custom domains provided');
    return null;
  }

  const domains = customDomains || theme?.relevant_domains || [];
  const themeName = theme?.name || 'Custom Cross-Domain Analysis';
  const themeDescription = theme?.description || 'Analysis across multiple domains';

  // Get data
  const correlations = await getCrossDomainCorrelations(domains);
  const keelResults = await getKeelTestResults();
  const theories = await getUnifiedTheoriesForDomains(domains);
  const counts = await getDomainCounts(domains);

  const totalRecords = Object.values(counts).reduce((a, b) => a + b, 0);

  // Identify patterns
  const patterns = identifyPatterns(correlations, keelResults);

  // Generate summary
  const executiveSummary = await generateSynthesisSummary(
    themeName,
    domains,
    patterns,
    theories,
    totalRecords
  );

  // Build domain variations
  const domainVariations: Record<string, string> = {};
  for (const domain of domains) {
    domainVariations[domain] = `${counts[domain]} records analyzed`;
  }

  // Calculate effect sizes
  const effectSizes: Record<string, number> = {};
  correlations.forEach(c => {
    const key = `${c.domainA}_${c.domainB}_${c.type}`;
    effectSizes[key] = c.coefficient;
  });

  return {
    title: `${themeName} Synthesis`,
    theme: themeName,
    domains_covered: domains,
    executive_summary: executiveSummary,
    methodology: 'Integration of cross-domain correlations, Keel tests, and unified theory analysis',
    cross_cutting_patterns: patterns,
    domain_specific_variations: domainVariations,
    unexplained_differences: [],
    supported_theories: theories.filter(t => t.plausibility === 'high' || t.plausibility === 'medium').map(t => t.name),
    challenged_theories: [],
    novel_hypotheses: patterns.length > 0 ? [
      `The ${patterns[0].pattern.toLowerCase()} suggests a common underlying factor`,
    ] : [],
    total_records_analyzed: totalRecords,
    significant_correlations: correlations.length,
    effect_sizes: effectSizes,
    research_priorities: [
      'Prospective multi-domain data collection',
      'Standardized protocols across phenomenon types',
      'Blind analysis methodologies',
    ],
    data_collection_recommendations: [
      'Include common demographic variables across all domains',
      'Record precise timestamps for temporal analysis',
      'Standardize geographic location formats',
    ],
    status: 'draft',
  };
}

/**
 * Save cross-domain synthesis
 */
export async function saveCrossDomainSynthesis(
  synthesis: CrossDomainSynthesis,
  sessionId?: string
): Promise<string | null> {
  const { data, error } = await getAdminClient()
    .from('aletheia_cross_domain_syntheses')
    .insert({
      session_id: sessionId,
      title: synthesis.title,
      theme: synthesis.theme,
      domains_covered: synthesis.domains_covered,
      executive_summary: synthesis.executive_summary,
      methodology: synthesis.methodology,
      cross_cutting_patterns: synthesis.cross_cutting_patterns,
      domain_specific_variations: synthesis.domain_specific_variations,
      unexplained_differences: synthesis.unexplained_differences,
      supported_theories: synthesis.supported_theories,
      challenged_theories: synthesis.challenged_theories,
      novel_hypotheses: synthesis.novel_hypotheses,
      total_records_analyzed: synthesis.total_records_analyzed,
      significant_correlations: synthesis.significant_correlations,
      effect_sizes: synthesis.effect_sizes,
      research_priorities: synthesis.research_priorities,
      data_collection_recommendations: synthesis.data_collection_recommendations,
      status: synthesis.status || 'draft',
    })
    .select('id')
    .single();

  if (error) {
    console.error('Save cross-domain synthesis error:', error);
    return null;
  }

  return data.id;
}

/**
 * Get cross-domain syntheses
 */
export async function getCrossDomainSyntheses(options: {
  theme?: string;
  status?: string;
  limit?: number;
}): Promise<CrossDomainSynthesis[]> {
  let query = getAdminClient()
    .from('aletheia_cross_domain_syntheses')
    .select('*')
    .order('created_at', { ascending: false });

  if (options.theme) {
    query = query.eq('theme', options.theme);
  }
  if (options.status) {
    query = query.eq('status', options.status);
  }

  const { data, error } = await query.limit(options.limit || 20);

  if (error) {
    console.error('Get cross-domain syntheses error:', error);
    return [];
  }

  return data || [];
}

/**
 * Get available synthesis themes
 */
export function getSynthesisThemes() {
  return SYNTHESIS_THEMES;
}
