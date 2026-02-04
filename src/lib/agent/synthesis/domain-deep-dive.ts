/**
 * Synthesis Agent - Domain Deep Dive Generator
 * Generate comprehensive reports on individual domains
 */

import { getAdminClient } from '../supabase-admin';
import Anthropic from '@anthropic-ai/sdk';
import type { DomainDeepDive, KeyStatistic } from './types';


// Domain display names
const DOMAIN_NAMES: Record<string, string> = {
  nde: 'Near-Death Experiences',
  ufo: 'UFO/UAP Sightings',
  ganzfeld: 'Ganzfeld Psi Experiments',
  haunting: 'Haunting Reports',
  bigfoot: 'Bigfoot Sightings',
  crisis_apparition: 'Crisis Apparitions',
  stargate: 'Remote Viewing (STARGATE)',
  geophysical: 'Geophysical Anomalies',
};

/**
 * Gather domain statistics
 */
async function gatherDomainStats(domain: string): Promise<{
  totalRecords: number;
  dateRange: { start: string | null; end: string | null };
  locations: string[];
}> {
  // Get count
  const { count } = await getAdminClient()
    .from('aletheia_investigations')
    .select('*', { count: 'exact', head: true })
    .eq('investigation_type', domain);

  // Get date range
  const { data: dates } = await getAdminClient()
    .from('aletheia_investigations')
    .select('investigation_date')
    .eq('investigation_type', domain)
    .not('investigation_date', 'is', null)
    .order('investigation_date', { ascending: true })
    .limit(1);

  const { data: datesEnd } = await getAdminClient()
    .from('aletheia_investigations')
    .select('investigation_date')
    .eq('investigation_type', domain)
    .not('investigation_date', 'is', null)
    .order('investigation_date', { ascending: false })
    .limit(1);

  // Get unique locations
  const { data: locData } = await getAdminClient()
    .from('aletheia_investigations')
    .select('location')
    .eq('investigation_type', domain)
    .not('location', 'is', null)
    .limit(5000);

  const locations = new Set<string>();
  (locData || []).forEach(r => {
    if (r.location) {
      // Extract state/country
      const parts = (r.location as string).split(',').map(p => p.trim());
      if (parts.length > 1) {
        locations.add(parts[parts.length - 1]);
      }
    }
  });

  return {
    totalRecords: count || 0,
    dateRange: {
      start: dates?.[0]?.investigation_date || null,
      end: datesEnd?.[0]?.investigation_date || null,
    },
    locations: Array.from(locations).slice(0, 20),
  };
}

/**
 * Get Deep Miner results for a domain
 */
async function getDeepMinerResults(domain: string): Promise<{
  variables: Array<{ name: string; type: string; uniqueValues: number }>;
  crossTabs: Array<{ varA: string; varB: string; chiSquare: number; pValue: number; cramersV: number }>;
}> {
  // Get variable census
  const { data: variables } = await getAdminClient()
    .from('aletheia_variable_census')
    .select('variable_name, variable_type, unique_values')
    .eq('domain', domain)
    .order('total_count', { ascending: false })
    .limit(20);

  // Get significant cross-tabulations
  const { data: crossTabs } = await getAdminClient()
    .from('aletheia_cross_tabulations')
    .select('variable_a, variable_b, chi_square, p_value, cramers_v')
    .eq('domain', domain)
    .eq('is_significant', true)
    .order('cramers_v', { ascending: false })
    .limit(10);

  return {
    variables: (variables || []).map(v => ({
      name: v.variable_name,
      type: v.variable_type,
      uniqueValues: v.unique_values,
    })),
    crossTabs: (crossTabs || []).map(c => ({
      varA: c.variable_a,
      varB: c.variable_b,
      chiSquare: c.chi_square,
      pValue: c.p_value,
      cramersV: c.cramers_v,
    })),
  };
}

/**
 * Get mechanisms for a domain
 */
async function getDomainMechanisms(domain: string): Promise<Array<{ name: string; support: string }>> {
  const { data } = await getAdminClient()
    .from('aletheia_mechanisms')
    .select('name, overall_support')
    .or(`primary_domain.eq.${domain},applicable_domains.cs.{${domain}}`)
    .order('overall_support', { ascending: true })
    .limit(5);

  return (data || []).map(m => ({
    name: m.name,
    support: m.overall_support || 'untested',
  }));
}

/**
 * Generate executive summary using AI
 */
async function generateExecutiveSummary(
  domain: string,
  domainName: string,
  stats: { totalRecords: number; dateRange: { start: string | null; end: string | null } },
  mechanisms: Array<{ name: string; support: string }>,
  crossTabs: Array<{ varA: string; varB: string; cramersV: number }>
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return `Analysis of ${stats.totalRecords} ${domainName} records from ${stats.dateRange.start || 'unknown'} to ${stats.dateRange.end || 'present'}.`;
  }

  const anthropic = new Anthropic({ apiKey });

  const significantFindings = crossTabs.slice(0, 3).map(c =>
    `${c.varA} correlates with ${c.varB} (V=${c.cramersV.toFixed(3)})`
  ).join('; ');

  const mechList = mechanisms.map(m => `${m.name} (${m.support})`).join(', ');

  const prompt = `Write a 2-3 paragraph executive summary for a research report on ${domainName}.

Data: ${stats.totalRecords} records, ${stats.dateRange.start} to ${stats.dateRange.end}
Key correlations: ${significantFindings || 'None significant'}
Proposed mechanisms: ${mechList || 'Various'}

Be scientific and balanced. Acknowledge limitations. Focus on what the data shows, not speculation.`;

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
    return `Analysis of ${stats.totalRecords} ${domainName} records.`;
  }
}

/**
 * Generate a domain deep dive report
 */
export async function generateDomainDeepDive(domain: string): Promise<DomainDeepDive | null> {
  const domainName = DOMAIN_NAMES[domain] || domain;

  // Gather statistics
  const stats = await gatherDomainStats(domain);
  if (stats.totalRecords === 0) {
    console.log(`No records found for domain: ${domain}`);
    return null;
  }

  // Get Deep Miner results
  const deepMiner = await getDeepMinerResults(domain);

  // Get mechanisms
  const mechanisms = await getDomainMechanisms(domain);

  // Generate key statistics
  const keyStatistics: KeyStatistic[] = [
    { name: 'Total Records', value: stats.totalRecords, context: 'Total cases in database' },
  ];

  if (deepMiner.variables.length > 0) {
    keyStatistics.push({
      name: 'Variables Analyzed',
      value: deepMiner.variables.length,
      context: 'Unique variables extracted from data',
    });
  }

  if (deepMiner.crossTabs.length > 0) {
    keyStatistics.push({
      name: 'Significant Correlations',
      value: deepMiner.crossTabs.length,
      context: 'Variable pairs with p < 0.05',
    });

    const strongestCorr = deepMiner.crossTabs[0];
    keyStatistics.push({
      name: 'Strongest Association',
      value: `${strongestCorr.varA} ↔ ${strongestCorr.varB}`,
      context: `Cramér's V = ${strongestCorr.cramersV.toFixed(3)}`,
    });
  }

  // Generate executive summary
  const executiveSummary = await generateExecutiveSummary(
    domain,
    domainName,
    stats,
    mechanisms,
    deepMiner.crossTabs
  );

  // Identify findings
  const consensusFindings: string[] = [];
  const contestedFindings: string[] = [];
  const novelFindings: string[] = [];

  // Check for strong correlations (consensus)
  deepMiner.crossTabs.filter(c => c.cramersV >= 0.3).forEach(c => {
    consensusFindings.push(`${c.varA} and ${c.varB} show strong association (V=${c.cramersV.toFixed(3)})`);
  });

  // Identify data gaps
  const dataGaps: string[] = [];
  if (!stats.dateRange.start) {
    dataGaps.push('Missing date information for many records');
  }
  if (stats.locations.length < 5) {
    dataGaps.push('Limited geographic coverage');
  }
  if (deepMiner.variables.length < 10) {
    dataGaps.push('Limited variable diversity in records');
  }

  // Build mechanism evidence
  const mechanismEvidence: Record<string, string> = {};
  mechanisms.forEach(m => {
    mechanismEvidence[m.name] = `Support level: ${m.support}`;
  });

  return {
    domain,
    domain_name: domainName,
    executive_summary: executiveSummary,
    methodology_overview: 'Statistical analysis using chi-square tests, effect size calculations, and cross-tabulation analysis on structured investigation records.',
    total_records: stats.totalRecords,
    date_range_start: stats.dateRange.start || undefined,
    date_range_end: stats.dateRange.end || undefined,
    geographic_coverage: stats.locations,
    key_statistics: keyStatistics,
    consensus_findings: consensusFindings,
    contested_findings: contestedFindings,
    novel_findings: novelFindings,
    dominant_mechanisms: mechanisms.map(m => m.name),
    mechanism_evidence: mechanismEvidence,
    data_gaps: dataGaps,
    methodological_concerns: [
      'Self-selection bias in reported cases',
      'Variable data quality across sources',
      'Retrospective reporting limitations',
    ],
    future_research: [
      'Prospective data collection with standardized protocols',
      'Cross-cultural comparison studies',
      'Longitudinal follow-up of experiencers',
    ],
    evidence_quality_score: deepMiner.crossTabs.length > 5 ? 0.7 : 0.5,
    status: 'draft',
  };
}

/**
 * Save domain deep dive to database
 */
export async function saveDomainDeepDive(
  deepDive: DomainDeepDive,
  sessionId?: string
): Promise<string | null> {
  const { data, error } = await getAdminClient()
    .from('aletheia_domain_deep_dives')
    .insert({
      session_id: sessionId,
      domain: deepDive.domain,
      domain_name: deepDive.domain_name,
      executive_summary: deepDive.executive_summary,
      methodology_overview: deepDive.methodology_overview,
      total_records: deepDive.total_records,
      date_range_start: deepDive.date_range_start,
      date_range_end: deepDive.date_range_end,
      geographic_coverage: deepDive.geographic_coverage,
      key_statistics: deepDive.key_statistics,
      consensus_findings: deepDive.consensus_findings,
      contested_findings: deepDive.contested_findings,
      novel_findings: deepDive.novel_findings,
      dominant_mechanisms: deepDive.dominant_mechanisms,
      mechanism_evidence: deepDive.mechanism_evidence,
      data_gaps: deepDive.data_gaps,
      methodological_concerns: deepDive.methodological_concerns,
      future_research: deepDive.future_research,
      evidence_quality_score: deepDive.evidence_quality_score,
      status: deepDive.status || 'draft',
    })
    .select('id')
    .single();

  if (error) {
    console.error('Save domain deep dive error:', error);
    return null;
  }

  return data.id;
}

/**
 * Get domain deep dives
 */
export async function getDomainDeepDives(options: {
  domain?: string;
  status?: string;
  limit?: number;
}): Promise<DomainDeepDive[]> {
  let query = getAdminClient()
    .from('aletheia_domain_deep_dives')
    .select('*')
    .order('created_at', { ascending: false });

  if (options.domain) {
    query = query.eq('domain', options.domain);
  }
  if (options.status) {
    query = query.eq('status', options.status);
  }

  const { data, error } = await query.limit(options.limit || 20);

  if (error) {
    console.error('Get domain deep dives error:', error);
    return [];
  }

  return data || [];
}
