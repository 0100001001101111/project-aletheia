/**
 * Pattern Matcher Engine
 * Finds cross-domain correlations and generates testable predictions
 */

import type { InvestigationType } from '@/types/database';
import { getNestedValue } from '@/schemas';

// ============================================================================
// Types
// ============================================================================

export interface Investigation {
  id: string;
  type: InvestigationType;
  raw_data: Record<string, unknown>;
  triage_score: number;
  triage_status: string;
}

export interface DomainCorrelation {
  domain: InvestigationType;
  correlation: number; // -1 to 1
  pValue: number;
  sampleSize: number;
  direction: 'positive' | 'negative' | 'none';
}

export interface DetectedPattern {
  id?: string;
  variable: string;
  description: string;
  domains: InvestigationType[];
  correlations: DomainCorrelation[];
  prevalence: number; // 0-1, proportion of domains showing pattern
  reliability: number; // 0-1, inverse of avg p-value
  volatility: number; // 0-1, stability score
  confidenceScore: number; // Combined C_s score
  sampleSize: number;
  detectedAt: string;
}

export interface Prediction {
  id?: string;
  hypothesis: string;
  sourcePattern: DetectedPattern;
  domains: InvestigationType[];
  confidenceScore: number;
  testingProtocol?: string;
  status: 'open' | 'testing' | 'confirmed' | 'refuted' | 'inconclusive';
  pValue?: number;
  brierScore?: number;
  createdAt: string;
  resolvedAt?: string;
}

// ============================================================================
// Variable Mappings - What to look for across schemas
// ============================================================================

// Updated paths to match actual data structure in the database
export const CROSS_DOMAIN_VARIABLES: Record<string, {
  label: string;
  paths: Partial<Record<InvestigationType, string>>;
  type: 'numeric' | 'boolean' | 'categorical';
}> = {
  geomagnetic_activity: {
    label: 'Geomagnetic Activity (Kp Index)',
    paths: {
      ufo: 'geomagnetic.kp_index',
      geophysical: 'kp_index',
    },
    type: 'numeric',
  },
  seismic_correlation: {
    label: 'Seismic/Earthquake Correlation',
    paths: {
      ufo: 'geophysical.earthquake_nearby',
      geophysical: 'earthquake_nearby',
    },
    type: 'boolean',
  },
  piezoelectric_bedrock: {
    label: 'Piezoelectric Bedrock Present',
    paths: {
      ufo: 'geophysical.piezoelectric_bedrock',
      geophysical: 'piezoelectric_bedrock',
    },
    type: 'boolean',
  },
  em_interference: {
    label: 'Electromagnetic Interference',
    paths: {
      ufo: 'effects.em_interference',
      geophysical: 'em_interference',
    },
    type: 'boolean',
  },
  physiological_effects: {
    label: 'Physiological Effects Reported',
    paths: {
      ufo: 'effects.physiological_effects',
    },
    type: 'boolean',
  },
  local_sidereal_time: {
    label: 'Local Sidereal Time',
    paths: {
      ufo: 'local_sidereal_time',
    },
    type: 'numeric',
  },
  witness_count: {
    label: 'Number of Witnesses',
    paths: {
      ufo: 'witness_count',
    },
    type: 'numeric',
  },
  quality_score: {
    label: 'Data Quality Score',
    paths: {
      ufo: 'quality_score',
    },
    type: 'numeric',
  },
  hit_rate: {
    label: 'Hit Rate',
    paths: {
      ganzfeld: 'hit_rate',
    },
    type: 'numeric',
  },
  effect_size: {
    label: 'Effect Size',
    paths: {
      ganzfeld: 'effect_size_d',
    },
    type: 'numeric',
  },
  geomagnetic_storm: {
    label: 'Geomagnetic Storm Active',
    paths: {
      ufo: 'geomagnetic.geomagnetic_storm',
    },
    type: 'boolean',
  },
};

// Outcome variables for each domain - updated to match actual data
const OUTCOME_PATHS: Partial<Record<InvestigationType, string>> = {
  nde: 'target_hits',  // from actual NDE data
  ganzfeld: 'hit',  // boolean hit/miss for individual trials
  stargate: 'hit_rate',  // stargate data uses hit_rate
  crisis_apparition: 'verified',
  geophysical: 'anomalous',
  ufo: 'effects.physiological_effects', // High signal = consciousness correlation
};

// ============================================================================
// Core Pattern Detection Functions
// ============================================================================

/**
 * Find cross-domain patterns across all verified investigations
 */
export function findCrossdomainPatterns(
  investigations: Investigation[]
): DetectedPattern[] {
  const patterns: DetectedPattern[] = [];

  // Only analyze verified/provisional investigations
  const qualifiedInvestigations = investigations.filter(
    (inv) => inv.triage_status === 'verified' || inv.triage_status === 'provisional'
  );

  if (qualifiedInvestigations.length < 10) {
    return patterns;
  }

  // Group investigations by type
  const byType = groupByType(qualifiedInvestigations);

  // Analyze each cross-domain variable
  for (const [variableKey, variableConfig] of Object.entries(CROSS_DOMAIN_VARIABLES)) {
    // Skip outcome variable - we correlate others against this
    if (variableKey === 'outcome_success') continue;

    const correlations: DomainCorrelation[] = [];
    const domainsWithVariable: InvestigationType[] = [];

    // Calculate correlation in each domain
    for (const [domain, path] of Object.entries(variableConfig.paths)) {
      const domainType = domain as InvestigationType;
      const domainInvestigations = byType[domainType] || [];

      if (domainInvestigations.length < 5) continue;

      const outcomePath = OUTCOME_PATHS[domainType];
      if (!outcomePath) continue;

      // Extract variable and outcome values
      const pairs = extractVariablePairs(
        domainInvestigations,
        path,
        outcomePath,
        variableConfig.type
      );

      if (pairs.length < 5) continue;

      // Calculate correlation
      const correlation = calculateCorrelation(pairs);

      if (correlation.sampleSize >= 5) {
        correlations.push({
          domain: domainType,
          ...correlation,
        });
        domainsWithVariable.push(domainType);
      }
    }

    // Check if pattern appears in 2+ domains with consistent direction
    if (domainsWithVariable.length >= 2 && isConsistentCorrelation(correlations)) {
      const pattern = createPattern(
        variableKey,
        variableConfig.label,
        domainsWithVariable,
        correlations
      );
      patterns.push(pattern);
    }
  }

  // Also find intra-domain patterns (correlations within a single domain)
  const intraDomainPatterns = findIntraDomainPatterns(byType);
  patterns.push(...intraDomainPatterns);

  // Sort by confidence score
  return patterns.sort((a, b) => b.confidenceScore - a.confidenceScore);
}

/**
 * Find patterns within a single domain (intra-domain correlations)
 * Useful when one domain has rich multi-variable data (like UFO)
 */
function findIntraDomainPatterns(
  byType: Partial<Record<InvestigationType, Investigation[]>>
): DetectedPattern[] {
  const patterns: DetectedPattern[] = [];

  // Define variable pairs to correlate within domains
  const intraDomainCorrelations: Array<{
    domain: InvestigationType;
    variable1: { key: string; label: string; path: string; type: 'numeric' | 'boolean' };
    variable2: { key: string; label: string; path: string; type: 'numeric' | 'boolean' };
    minSamples: number;
  }> = [
    // UFO intra-domain correlations
    {
      domain: 'ufo',
      variable1: { key: 'kp_index', label: 'Geomagnetic Activity (Kp)', path: 'geomagnetic.kp_index', type: 'numeric' },
      variable2: { key: 'physio', label: 'Physiological Effects', path: 'effects.physiological_effects', type: 'boolean' },
      minSamples: 100,
    },
    {
      domain: 'ufo',
      variable1: { key: 'earthquake', label: 'Nearby Earthquake', path: 'geophysical.earthquake_nearby', type: 'boolean' },
      variable2: { key: 'physio', label: 'Physiological Effects', path: 'effects.physiological_effects', type: 'boolean' },
      minSamples: 100,
    },
    {
      domain: 'ufo',
      variable1: { key: 'em_interference', label: 'EM Interference', path: 'effects.em_interference', type: 'boolean' },
      variable2: { key: 'physio', label: 'Physiological Effects', path: 'effects.physiological_effects', type: 'boolean' },
      minSamples: 100,
    },
    {
      domain: 'ufo',
      variable1: { key: 'kp_index', label: 'Geomagnetic Activity (Kp)', path: 'geomagnetic.kp_index', type: 'numeric' },
      variable2: { key: 'em_interference', label: 'EM Interference', path: 'effects.em_interference', type: 'boolean' },
      minSamples: 100,
    },
    {
      domain: 'ufo',
      variable1: { key: 'geomagnetic_storm', label: 'Geomagnetic Storm', path: 'geomagnetic.geomagnetic_storm', type: 'boolean' },
      variable2: { key: 'physio', label: 'Physiological Effects', path: 'effects.physiological_effects', type: 'boolean' },
      minSamples: 100,
    },
    {
      domain: 'ufo',
      variable1: { key: 'lst', label: 'Local Sidereal Time', path: 'local_sidereal_time', type: 'numeric' },
      variable2: { key: 'physio', label: 'Physiological Effects', path: 'effects.physiological_effects', type: 'boolean' },
      minSamples: 100,
    },
    {
      domain: 'ufo',
      variable1: { key: 'piezoelectric', label: 'Piezoelectric Bedrock', path: 'geophysical.piezoelectric_bedrock', type: 'boolean' },
      variable2: { key: 'physio', label: 'Physiological Effects', path: 'effects.physiological_effects', type: 'boolean' },
      minSamples: 100,
    },
  ];

  for (const config of intraDomainCorrelations) {
    const domainInvestigations = byType[config.domain] || [];

    if (domainInvestigations.length < config.minSamples) continue;

    // Extract variable pairs
    const pairs = extractVariablePairs(
      domainInvestigations,
      config.variable1.path,
      config.variable2.path,
      config.variable1.type
    );

    if (pairs.length < config.minSamples) continue;

    // Calculate correlation
    const correlation = calculateCorrelation(pairs);

    // Only include if correlation is significant (p < 0.05) and has meaningful effect
    if (correlation.pValue < 0.05 && Math.abs(correlation.correlation) > 0.05) {
      const direction = correlation.correlation > 0 ? 'positively' : 'negatively';

      const pattern: DetectedPattern = {
        variable: `${config.variable1.key}_vs_${config.variable2.key}`,
        description: `${config.variable1.label} ${direction} correlates with ${config.variable2.label} in UFO/UAP sightings (r=${correlation.correlation.toFixed(3)}, n=${correlation.sampleSize})`,
        domains: [config.domain],
        correlations: [{
          domain: config.domain,
          ...correlation,
        }],
        prevalence: 0,
        reliability: 0,
        volatility: 0,
        confidenceScore: 0,
        sampleSize: correlation.sampleSize,
        detectedAt: new Date().toISOString(),
      };

      // Calculate scores (adjusted for single-domain)
      pattern.prevalence = 1 / 6; // 1 out of 6 domains
      pattern.reliability = 1 - correlation.pValue;
      pattern.volatility = calculateIntraDomainStability(correlation);
      pattern.confidenceScore = calculateIntraDomainConfidence(pattern, correlation);

      patterns.push(pattern);
    }
  }

  return patterns;
}

/**
 * Calculate stability for intra-domain patterns based on sample size and effect strength
 */
function calculateIntraDomainStability(correlation: CorrelationResult): number {
  // More samples and stronger effects = more stable
  const sampleFactor = Math.min(correlation.sampleSize / 1000, 1); // Max out at 1000 samples
  const effectFactor = Math.min(Math.abs(correlation.correlation) * 2, 1); // Stronger effects more stable
  return (sampleFactor * 0.6) + (effectFactor * 0.4);
}

/**
 * Calculate confidence for intra-domain patterns
 * Adjusted formula since these are single-domain
 */
function calculateIntraDomainConfidence(pattern: DetectedPattern, correlation: CorrelationResult): number {
  // Weight: statistical significance (40%) + effect size (30%) + sample size (30%)
  const significanceFactor = Math.max(0, 1 - correlation.pValue * 10); // p=0.05 -> 0.5, p=0.001 -> 0.99
  const effectFactor = Math.min(Math.abs(correlation.correlation) * 2, 1);
  const sampleFactor = Math.min(correlation.sampleSize / 2000, 1);

  return (significanceFactor * 0.4) + (effectFactor * 0.3) + (sampleFactor * 0.3);
}

/**
 * Calculate prevalence - proportion of domains showing this pattern
 */
export function calculatePrevalence(pattern: DetectedPattern): number {
  const totalDomains = 6; // nde, ganzfeld, crisis_apparition, stargate, geophysical, ufo
  return pattern.domains.length / totalDomains;
}

/**
 * Calculate reliability - inverse of average p-value
 */
export function calculateReliability(pattern: DetectedPattern): number {
  const avgPValue = pattern.correlations.reduce((sum, c) => sum + c.pValue, 0) /
    pattern.correlations.length;
  // Transform p-value to 0-1 reliability score
  // p=0.001 -> 0.999, p=0.05 -> 0.95, p=0.5 -> 0.5
  return 1 - avgPValue;
}

/**
 * Calculate volatility - stability of pattern with new data
 * Lower volatility = more stable = better
 */
export function calculateVolatility(pattern: DetectedPattern): number {
  // Calculate variance in correlation strengths across domains
  const correlationValues = pattern.correlations.map((c) => Math.abs(c.correlation));
  const mean = correlationValues.reduce((a, b) => a + b, 0) / correlationValues.length;
  const variance = correlationValues.reduce((sum, c) => sum + Math.pow(c - mean, 2), 0) /
    correlationValues.length;

  // Convert variance to stability score (lower variance = higher stability)
  const stability = 1 - Math.min(variance, 1);
  return stability;
}

/**
 * Calculate combined confidence score (C_s)
 * Formula: C_s = (Prevalence * 0.3) + (Reliability * 0.4) + (Stability * 0.3)
 */
export function calculateConfidenceScore(pattern: DetectedPattern): number {
  const prevalence = calculatePrevalence(pattern);
  const reliability = calculateReliability(pattern);
  const stability = calculateVolatility(pattern);

  return (prevalence * 0.3) + (reliability * 0.4) + (stability * 0.3);
}

/**
 * Check if pattern should generate a prediction
 * Threshold: C_s > 0.85
 */
export function shouldGeneratePrediction(pattern: DetectedPattern): boolean {
  return pattern.confidenceScore >= 0.85;
}

/**
 * Generate a testable prediction from a pattern
 */
export function generatePrediction(pattern: DetectedPattern): Prediction {
  const hypothesis = generateHypothesis(pattern);
  const testingProtocol = generateTestingProtocol(pattern);

  return {
    hypothesis,
    sourcePattern: pattern,
    domains: pattern.domains,
    confidenceScore: pattern.confidenceScore,
    testingProtocol,
    status: 'open',
    createdAt: new Date().toISOString(),
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

function groupByType(
  investigations: Investigation[]
): Partial<Record<InvestigationType, Investigation[]>> {
  const groups: Partial<Record<InvestigationType, Investigation[]>> = {};

  for (const inv of investigations) {
    if (!groups[inv.type]) {
      groups[inv.type] = [];
    }
    groups[inv.type]!.push(inv);
  }

  return groups;
}

interface VariablePair {
  variable: number;
  outcome: number;
}

function extractVariablePairs(
  investigations: Investigation[],
  variablePath: string,
  outcomePath: string,
  variableType: 'numeric' | 'boolean' | 'categorical'
): VariablePair[] {
  const pairs: VariablePair[] = [];

  for (const inv of investigations) {
    const variableValue = getNestedValue(inv.raw_data, variablePath);
    const outcomeValue = getNestedValue(inv.raw_data, outcomePath);

    // Convert to numeric
    let numVariable: number | null = null;
    let numOutcome: number | null = null;

    // Handle variable conversion
    if (variableType === 'numeric' && typeof variableValue === 'number') {
      numVariable = variableValue;
    } else if (variableType === 'boolean') {
      numVariable = variableValue === true ? 1 : variableValue === false ? 0 : null;
    } else if (variableType === 'categorical') {
      // Skip categorical variables - string length is not a valid numeric proxy
      // Categorical correlations require chi-square tests, not Pearson correlation
      continue;
    }

    // Handle outcome conversion
    if (typeof outcomeValue === 'number') {
      numOutcome = outcomeValue;
    } else if (typeof outcomeValue === 'boolean') {
      numOutcome = outcomeValue ? 1 : 0;
    } else if (outcomeValue === 'hit') {
      numOutcome = 1;
    } else if (outcomeValue === 'miss') {
      numOutcome = 0;
    } else if (outcomeValue === 'partial') {
      numOutcome = 0.5;
    }

    if (numVariable !== null && numOutcome !== null) {
      pairs.push({ variable: numVariable, outcome: numOutcome });
    }
  }

  return pairs;
}

interface CorrelationResult {
  correlation: number;
  pValue: number;
  sampleSize: number;
  direction: 'positive' | 'negative' | 'none';
}

function calculateCorrelation(pairs: VariablePair[]): CorrelationResult {
  const n = pairs.length;
  if (n < 2) {
    return { correlation: 0, pValue: 1, sampleSize: n, direction: 'none' };
  }

  // Pearson correlation coefficient
  const sumX = pairs.reduce((s, p) => s + p.variable, 0);
  const sumY = pairs.reduce((s, p) => s + p.outcome, 0);
  const sumXY = pairs.reduce((s, p) => s + p.variable * p.outcome, 0);
  const sumX2 = pairs.reduce((s, p) => s + p.variable * p.variable, 0);
  const sumY2 = pairs.reduce((s, p) => s + p.outcome * p.outcome, 0);

  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt(
    (n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY)
  );

  if (denominator === 0) {
    return { correlation: 0, pValue: 1, sampleSize: n, direction: 'none' };
  }

  const r = numerator / denominator;

  // Approximate p-value using t-distribution
  const t = r * Math.sqrt((n - 2) / (1 - r * r));
  const pValue = approximatePValue(t, n - 2);

  return {
    correlation: r,
    pValue,
    sampleSize: n,
    direction: r > 0.1 ? 'positive' : r < -0.1 ? 'negative' : 'none',
  };
}

function approximatePValue(t: number, df: number): number {
  // Simplified p-value approximation
  const absT = Math.abs(t);
  if (df <= 0) return 1;

  // Using approximation for two-tailed test
  const x = df / (df + t * t);
  const p = 0.5 * Math.pow(x, df / 2);

  return Math.min(1, Math.max(0, 2 * p));
}

function isConsistentCorrelation(correlations: DomainCorrelation[]): boolean {
  if (correlations.length < 2) return false;

  // Check if all correlations are in the same direction
  const directions = correlations.map((c) => c.direction);
  const positiveCount = directions.filter((d) => d === 'positive').length;
  const negativeCount = directions.filter((d) => d === 'negative').length;

  // At least 2 correlations should agree
  const agreementThreshold = Math.max(2, Math.floor(correlations.length * 0.6));

  if (positiveCount >= agreementThreshold || negativeCount >= agreementThreshold) {
    // Also check that at least one has p < 0.1
    const hasSignificant = correlations.some((c) => c.pValue < 0.1);
    return hasSignificant;
  }

  return false;
}

function createPattern(
  variableKey: string,
  variableLabel: string,
  domains: InvestigationType[],
  correlations: DomainCorrelation[]
): DetectedPattern {
  const avgCorrelation = correlations.reduce((s, c) => s + c.correlation, 0) / correlations.length;
  const direction = avgCorrelation > 0 ? 'positively' : 'negatively';
  const totalSamples = correlations.reduce((s, c) => s + c.sampleSize, 0);

  const pattern: DetectedPattern = {
    variable: variableKey,
    description: `${variableLabel} ${direction} correlates with success across ${domains.join(', ')}`,
    domains,
    correlations,
    prevalence: 0,
    reliability: 0,
    volatility: 0,
    confidenceScore: 0,
    sampleSize: totalSamples,
    detectedAt: new Date().toISOString(),
  };

  // Calculate scores
  pattern.prevalence = calculatePrevalence(pattern);
  pattern.reliability = calculateReliability(pattern);
  pattern.volatility = calculateVolatility(pattern);
  pattern.confidenceScore = calculateConfidenceScore(pattern);

  return pattern;
}

function generateHypothesis(pattern: DetectedPattern): string {
  const variableConfig = CROSS_DOMAIN_VARIABLES[pattern.variable];
  const label = variableConfig?.label || pattern.variable;
  const domains = pattern.domains.map(formatDomainName).join(', ');
  const avgCorr = pattern.correlations.reduce((s, c) => s + c.correlation, 0) / pattern.correlations.length;
  const direction = avgCorr > 0 ? 'higher' : 'lower';

  return `Participants with ${direction} ${label.toLowerCase()} will show increased success rates in ${domains} experiments.`;
}

function generateTestingProtocol(pattern: DetectedPattern): string {
  const protocols: string[] = [
    `1. Select participants without prior screening for ${pattern.variable}`,
    `2. Administer standardized ${pattern.variable} assessment`,
    `3. Run standard protocol for each domain: ${pattern.domains.join(', ')}`,
    `4. Compare success rates between high/low ${pattern.variable} groups`,
    `5. Calculate effect size and p-value`,
    `6. Minimum sample size: 30 per group per domain`,
  ];

  return protocols.join('\n');
}

function formatDomainName(domain: InvestigationType): string {
  const names: Record<InvestigationType, string> = {
    nde: 'NDE',
    ganzfeld: 'Ganzfeld',
    crisis_apparition: 'Crisis Apparition',
    stargate: 'Remote Viewing',
    geophysical: 'Geophysical',
    ufo: 'UFO/UAP',
  };
  return names[domain] || domain;
}

// ============================================================================
// SEED_PATTERNS REMOVED
// ============================================================================
// Fabricated seed patterns were removed on 2026-01-20.
// All patterns must now be calculated from actual investigation data using
// findCrossdomainPatterns(). See audit report for details.
// ============================================================================

// ============================================================================
// Pattern Analysis Utilities
// ============================================================================

export function getPatternsByDomain(
  patterns: DetectedPattern[],
  domain: InvestigationType
): DetectedPattern[] {
  return patterns.filter((p) => p.domains.includes(domain));
}

export function getSharedPatterns(
  patterns: DetectedPattern[],
  domain1: InvestigationType,
  domain2: InvestigationType
): DetectedPattern[] {
  return patterns.filter(
    (p) => p.domains.includes(domain1) && p.domains.includes(domain2)
  );
}

export function calculateDomainConnections(
  patterns: DetectedPattern[]
): Map<string, number> {
  const connections = new Map<string, number>();
  const domains: InvestigationType[] = ['nde', 'ganzfeld', 'crisis_apparition', 'stargate', 'geophysical', 'ufo'];

  for (let i = 0; i < domains.length; i++) {
    for (let j = i + 1; j < domains.length; j++) {
      const key = `${domains[i]}-${domains[j]}`;
      const shared = getSharedPatterns(patterns, domains[i], domains[j]);
      if (shared.length > 0) {
        // Sum confidence scores for connection strength
        const strength = shared.reduce((s, p) => s + p.confidenceScore, 0);
        connections.set(key, strength);
      }
    }
  }

  return connections;
}

export function formatConfidenceScore(score: number): string {
  return (score * 100).toFixed(1) + '%';
}

export function getConfidenceLevel(score: number): {
  label: string;
  color: string;
} {
  if (score >= 0.9) return { label: 'Very High', color: 'text-emerald-400' };
  if (score >= 0.8) return { label: 'High', color: 'text-green-400' };
  if (score >= 0.7) return { label: 'Moderate', color: 'text-amber-400' };
  if (score >= 0.5) return { label: 'Low', color: 'text-orange-400' };
  return { label: 'Very Low', color: 'text-red-400' };
}
