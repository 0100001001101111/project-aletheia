/**
 * Mechanism Agent - Theory Builder
 * Build and evaluate unified theories across domains
 */

import { getAdminClient } from '../supabase-admin';
import Anthropic from '@anthropic-ai/sdk';
import type { Mechanism, UnifiedTheory, Plausibility } from './types';


// Predefined unified theory templates
const UNIFIED_THEORY_TEMPLATES = [
  {
    name: 'Stress-Signal Theory',
    core_mechanism: 'Extreme stress produces anomalous signal at multiple scales',
    applicable_domains: ['nde', 'crisis_apparition', 'ufo', 'haunting'],
    predictions: [
      'Phenomena should correlate with stress indicators',
      'Reports should cluster during high-stress periods',
      'Intensity should correlate with stressor magnitude',
    ],
  },
  {
    name: 'Consciousness Filter Theory',
    core_mechanism: 'Brain filters consciousness; altered states reduce filtering',
    applicable_domains: ['nde', 'ganzfeld', 'crisis_apparition'],
    predictions: [
      'Altered brain states should increase anomalous perception',
      'Psi should correlate with reduced brain activity',
      'NDEs should occur when filtering is reduced',
    ],
  },
  {
    name: 'Tectonic-Consciousness Interaction',
    core_mechanism: 'Tectonic stress affects both physical environment and consciousness',
    applicable_domains: ['ufo', 'haunting', 'nde'],
    predictions: [
      'Phenomena should cluster near geological features',
      'EM anomalies should accompany consciousness effects',
      'Reports should correlate with seismic activity',
    ],
  },
  {
    name: 'Information Field Theory',
    core_mechanism: 'Information exists non-locally and can be accessed under conditions',
    applicable_domains: ['ganzfeld', 'crisis_apparition', 'nde'],
    predictions: [
      'Distance should not affect information transfer',
      'Emotional significance should enhance access',
      'Information should be verifiable when tested',
    ],
  },
];

/**
 * Build a unified theory from mechanisms that span multiple domains
 */
export function buildUnifiedTheory(
  crossDomainMechanisms: Mechanism[],
  targetDomains: string[]
): UnifiedTheory | null {
  if (crossDomainMechanisms.length === 0) {
    return null;
  }

  // Find the mechanism that covers the most domains
  const bestMechanism = crossDomainMechanisms.reduce((best, current) => {
    const coveredDomains = current.applicable_domains.filter(d => targetDomains.includes(d));
    const bestCovered = best.applicable_domains.filter(d => targetDomains.includes(d));
    return coveredDomains.length > bestCovered.length ? current : best;
  });

  const coveredDomains = bestMechanism.applicable_domains.filter(d => targetDomains.includes(d));

  if (coveredDomains.length < 2) {
    return null;
  }

  // Build explanation per domain
  const explanationPerDomain: Record<string, string> = {};
  for (const domain of coveredDomains) {
    explanationPerDomain[domain] = generateDomainExplanation(bestMechanism, domain);
  }

  // Extract unique predictions
  const uniquePredictions = (bestMechanism.predictions || [])
    .filter(p => p.testable)
    .map(p => p.prediction);

  // Generate cross-domain predictions
  const crossDomainPredictions = generateCrossDomainPredictions(bestMechanism, coveredDomains);

  // Calculate scores
  const internalConsistency = calculateInternalConsistency(bestMechanism);
  const empiricalSupport = calculateEmpiricalSupport(bestMechanism);
  const parsimony = calculateParsimony(bestMechanism, coveredDomains.length);

  const avgScore = (internalConsistency + empiricalSupport + parsimony) / 3;
  const plausibility: Plausibility =
    avgScore >= 0.7 ? 'high' :
    avgScore >= 0.5 ? 'medium' :
    avgScore >= 0.3 ? 'low' : 'speculative';

  return {
    theory_name: `${bestMechanism.name} Unified Theory`,
    theory_description: `Application of ${bestMechanism.name} across ${coveredDomains.join(', ')}`,
    core_mechanism: bestMechanism.description,
    domains_explained: coveredDomains,
    explanation_per_domain: explanationPerDomain,
    unique_predictions: uniquePredictions,
    cross_domain_predictions: crossDomainPredictions,
    internal_consistency_score: internalConsistency,
    empirical_support_score: empiricalSupport,
    parsimony_score: parsimony,
    overall_plausibility: plausibility,
    status: 'draft',
  };
}

/**
 * Generate domain-specific explanation from mechanism
 */
function generateDomainExplanation(mechanism: Mechanism, domain: string): string {
  const domainDescriptions: Record<string, string> = {
    nde: 'near-death experiences',
    ufo: 'UAP/UFO sightings',
    ganzfeld: 'psi phenomena in sensory deprivation',
    haunting: 'haunting experiences',
    bigfoot: 'cryptid sightings',
    crisis_apparition: 'crisis apparitions',
  };

  const domainDesc = domainDescriptions[domain] || domain;
  return `${mechanism.name} explains ${domainDesc} through ${mechanism.mechanism_type} processes: ${mechanism.theoretical_basis || mechanism.description}`;
}

/**
 * Generate cross-domain predictions
 */
function generateCrossDomainPredictions(mechanism: Mechanism, domains: string[]): string[] {
  const predictions: string[] = [];

  // If the mechanism applies to multiple domains, they should show correlations
  if (domains.length >= 2) {
    predictions.push(`${domains[0]} and ${domains[1]} phenomena should show temporal correlation`);
    predictions.push(`Geographic distribution of ${domains.join(' and ')} should overlap`);
  }

  // Specific predictions based on mechanism type
  switch (mechanism.mechanism_type) {
    case 'neurological':
      predictions.push('Similar neural correlates across all explained phenomena');
      break;
    case 'consciousness':
      predictions.push('Experiencer traits should be consistent across domains');
      break;
    case 'physical':
      predictions.push('Physical measurements should show common anomalies');
      break;
    case 'quantum':
      predictions.push('Effects should not be blocked by physical shielding');
      break;
    case 'interdimensional':
      predictions.push('High strangeness elements should correlate across domains');
      break;
  }

  return predictions;
}

/**
 * Calculate internal consistency score
 */
function calculateInternalConsistency(mechanism: Mechanism): number {
  let score = 0.5; // Base score

  // Points for having predictions
  const predictions = mechanism.predictions || [];
  if (predictions.length > 0) score += 0.1;
  if (predictions.length >= 3) score += 0.1;

  // Points for theoretical basis
  if (mechanism.theoretical_basis) score += 0.1;

  // Points for key papers/proponents (scientific backing)
  if (mechanism.key_papers && mechanism.key_papers.length > 0) score += 0.1;
  if (mechanism.key_proponents && mechanism.key_proponents.length > 0) score += 0.1;

  return Math.min(1, score);
}

/**
 * Calculate empirical support score
 */
function calculateEmpiricalSupport(mechanism: Mechanism): number {
  const supportMap: Record<string, number> = {
    strong: 0.9,
    moderate: 0.6,
    weak: 0.3,
    mixed: 0.5,
    untested: 0.2,
  };

  const base = supportMap[mechanism.overall_support || 'untested'] || 0.2;

  // Bonus for tested predictions
  const predictions = mechanism.predictions || [];
  const testedCount = predictions.filter(p => p.tested).length;
  const supportedCount = predictions.filter(p => p.supported).length;

  let bonus = 0;
  if (testedCount > 0) {
    bonus = (supportedCount / testedCount) * 0.2;
  }

  return Math.min(1, base + bonus);
}

/**
 * Calculate parsimony score (fewer assumptions = higher score)
 */
function calculateParsimony(mechanism: Mechanism, domainsExplained: number): number {
  let score = 0.5;

  // More domains explained with one mechanism = more parsimonious
  score += domainsExplained * 0.1;

  // Some mechanism types are more parsimonious than others
  const typeScores: Record<string, number> = {
    neurological: 0.2, // Well-understood mechanisms
    physical: 0.15,
    psychological: 0.15,
    quantum: 0.0, // Requires additional assumptions
    consciousness: -0.1, // Requires consciousness theory
    interdimensional: -0.2, // Requires many assumptions
    informational: 0.0,
    unknown: -0.3,
  };

  score += typeScores[mechanism.mechanism_type] || 0;

  return Math.max(0, Math.min(1, score));
}

/**
 * Use AI to propose a unified theory
 */
export async function proposeUnifiedTheoryWithAI(
  mechanisms: Mechanism[],
  targetDomains: string[]
): Promise<UnifiedTheory | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.log('ANTHROPIC_API_KEY not configured');
    return null;
  }

  const anthropic = new Anthropic({ apiKey });

  const mechDescriptions = mechanisms.map(m =>
    `- ${m.name} (${m.mechanism_type}): ${m.description}`
  ).join('\n');

  const prompt = `You are a theoretical scientist proposing unified theories for anomalous phenomena.

Existing mechanisms:
${mechDescriptions}

Target domains to explain: ${targetDomains.join(', ')}

Propose ONE unified theory that could explain phenomena across these domains.

Return JSON with:
{
  "theory_name": "name",
  "theory_description": "detailed description",
  "core_mechanism": "the central explanatory mechanism",
  "domains_explained": ["list", "of", "domains"],
  "explanation_per_domain": {"domain": "how theory explains it"},
  "unique_predictions": ["testable predictions"],
  "cross_domain_predictions": ["predictions that span domains"],
  "advantages": ["why this theory is compelling"],
  "disadvantages": ["limitations or challenges"]
}`;

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = message.content[0];
    if (content.type !== 'text') return null;

    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      theory_name: parsed.theory_name,
      theory_description: parsed.theory_description,
      core_mechanism: parsed.core_mechanism,
      domains_explained: parsed.domains_explained,
      explanation_per_domain: parsed.explanation_per_domain,
      unique_predictions: parsed.unique_predictions,
      cross_domain_predictions: parsed.cross_domain_predictions,
      advantages: parsed.advantages,
      disadvantages: parsed.disadvantages,
      overall_plausibility: 'speculative',
      status: 'draft',
    };
  } catch (error) {
    console.error('AI theory proposal error:', error);
    return null;
  }
}

/**
 * Save unified theory to database
 */
export async function saveUnifiedTheory(
  theory: UnifiedTheory,
  sessionId?: string
): Promise<string | null> {
  const { data, error } = await getAdminClient()
    .from('aletheia_unified_theories')
    .insert({
      session_id: sessionId,
      theory_name: theory.theory_name,
      theory_description: theory.theory_description,
      core_mechanism: theory.core_mechanism,
      domains_explained: theory.domains_explained,
      explanation_per_domain: theory.explanation_per_domain,
      unique_predictions: theory.unique_predictions,
      cross_domain_predictions: theory.cross_domain_predictions,
      internal_consistency_score: theory.internal_consistency_score,
      empirical_support_score: theory.empirical_support_score,
      parsimony_score: theory.parsimony_score,
      overall_plausibility: theory.overall_plausibility,
      compared_to: theory.compared_to,
      advantages: theory.advantages,
      disadvantages: theory.disadvantages,
      status: theory.status || 'draft',
    })
    .select('id')
    .single();

  if (error) {
    console.error('Save unified theory error:', error);
    return null;
  }

  return data.id;
}

/**
 * Get unified theories
 */
export async function getUnifiedTheories(options: {
  sessionId?: string;
  plausibility?: Plausibility;
  limit?: number;
}): Promise<UnifiedTheory[]> {
  let query = getAdminClient()
    .from('aletheia_unified_theories')
    .select('*')
    .order('created_at', { ascending: false });

  if (options.sessionId) {
    query = query.eq('session_id', options.sessionId);
  }
  if (options.plausibility) {
    query = query.eq('overall_plausibility', options.plausibility);
  }

  const { data, error } = await query.limit(options.limit || 20);

  if (error) {
    console.error('Get unified theories error:', error);
    return [];
  }

  return data || [];
}

/**
 * Compare two unified theories
 */
export function compareTheories(theory1: UnifiedTheory, theory2: UnifiedTheory): {
  winner: UnifiedTheory;
  comparison: {
    coverage: string;
    support: string;
    parsimony: string;
  };
} {
  const score1 = (
    (theory1.internal_consistency_score || 0) +
    (theory1.empirical_support_score || 0) +
    (theory1.parsimony_score || 0)
  ) / 3;

  const score2 = (
    (theory2.internal_consistency_score || 0) +
    (theory2.empirical_support_score || 0) +
    (theory2.parsimony_score || 0)
  ) / 3;

  const domainCoverage1 = theory1.domains_explained?.length || 0;
  const domainCoverage2 = theory2.domains_explained?.length || 0;

  return {
    winner: score1 > score2 ? theory1 : theory2,
    comparison: {
      coverage: domainCoverage1 > domainCoverage2
        ? `${theory1.theory_name} explains more domains (${domainCoverage1} vs ${domainCoverage2})`
        : `${theory2.theory_name} explains more domains (${domainCoverage2} vs ${domainCoverage1})`,
      support: `${theory1.theory_name}: ${((theory1.empirical_support_score || 0) * 100).toFixed(0)}% vs ${theory2.theory_name}: ${((theory2.empirical_support_score || 0) * 100).toFixed(0)}%`,
      parsimony: (theory1.parsimony_score || 0) > (theory2.parsimony_score || 0)
        ? `${theory1.theory_name} is more parsimonious`
        : `${theory2.theory_name} is more parsimonious`,
    },
  };
}
