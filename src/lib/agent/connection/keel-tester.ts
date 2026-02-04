/**
 * Connection Agent - Keel Tester
 * Test the "weird stuff correlates" hypothesis
 * Named after John Keel who observed correlations between disparate anomalies
 */

import { getAdminClient } from '../supabase-admin';
import type { KeelTest, KeelTestVariable, KeelStrength } from './types';


// Define "weirdness" indicators for each domain
const WEIRDNESS_INDICATORS: Record<string, KeelTestVariable[]> = {
  nde: [
    { domain: 'nde', variable: 'out_of_body', weird_indicator: 'Reported leaving physical body' },
    { domain: 'nde', variable: 'life_review', weird_indicator: 'Panoramic life review experience' },
    { domain: 'nde', variable: 'deceased_relatives', weird_indicator: 'Encounter with deceased persons' },
    { domain: 'nde', variable: 'being_of_light', weird_indicator: 'Encounter with light being' },
  ],
  ufo: [
    { domain: 'ufo', variable: 'entity_observed', weird_indicator: 'Non-human entity seen' },
    { domain: 'ufo', variable: 'missing_time', weird_indicator: 'Unexplained time loss' },
    { domain: 'ufo', variable: 'physical_effects', weird_indicator: 'Physical traces or effects' },
    { domain: 'ufo', variable: 'paralysis', weird_indicator: 'Temporary paralysis during encounter' },
  ],
  haunting: [
    { domain: 'haunting', variable: 'apparition', weird_indicator: 'Full apparition seen' },
    { domain: 'haunting', variable: 'physical_manipulation', weird_indicator: 'Objects moved or manipulated' },
    { domain: 'haunting', variable: 'communication', weird_indicator: 'Apparent communication received' },
  ],
  bigfoot: [
    { domain: 'bigfoot', variable: 'visual_sighting', weird_indicator: 'Clear visual observation' },
    { domain: 'bigfoot', variable: 'footprints', weird_indicator: 'Physical tracks found' },
    { domain: 'bigfoot', variable: 'vocalizations', weird_indicator: 'Unusual sounds heard' },
  ],
  ganzfeld: [
    { domain: 'ganzfeld', variable: 'hit', weird_indicator: 'Above-chance target identification' },
    { domain: 'ganzfeld', variable: 'direct_hit', weird_indicator: 'First-rank target identification' },
  ],
};

/**
 * Extract weirdness score from a record
 */
function calculateWeirdnessScore(
  rawData: Record<string, unknown>,
  indicators: KeelTestVariable[]
): number {
  let score = 0;
  let checkedCount = 0;

  for (const indicator of indicators) {
    const value = extractValue(rawData, indicator.variable);
    if (value !== null) {
      checkedCount++;
      if (value === true || value === 'yes' || value === 'Yes' || value === 1) {
        score++;
      }
    }
  }

  if (checkedCount === 0) return 0;
  return score / checkedCount; // Normalized 0-1
}

/**
 * Helper to extract value from nested object
 */
function extractValue(data: Record<string, unknown>, key: string): unknown {
  if (key in data) return data[key];

  // Check nested objects
  for (const k of Object.keys(data)) {
    if (typeof data[k] === 'object' && data[k] !== null) {
      const nested = data[k] as Record<string, unknown>;
      if (key in nested) return nested[key];
    }
  }

  return null;
}

/**
 * Calculate Pearson correlation for weirdness scores
 */
function correlateWeirdnessScores(
  scoresA: { date: string; score: number }[],
  scoresB: { date: string; score: number }[]
): { r: number; n: number } {
  // Group by month
  const monthlyA: Record<string, number[]> = {};
  const monthlyB: Record<string, number[]> = {};

  scoresA.forEach(s => {
    const month = s.date.substring(0, 7);
    if (!monthlyA[month]) monthlyA[month] = [];
    monthlyA[month].push(s.score);
  });

  scoresB.forEach(s => {
    const month = s.date.substring(0, 7);
    if (!monthlyB[month]) monthlyB[month] = [];
    monthlyB[month].push(s.score);
  });

  // Get average weirdness per month
  const months = new Set([...Object.keys(monthlyA), ...Object.keys(monthlyB)]);
  const commonMonths = Array.from(months).filter(m => monthlyA[m] && monthlyB[m]);

  if (commonMonths.length < 6) {
    return { r: 0, n: commonMonths.length };
  }

  const avgA = commonMonths.map(m => {
    const scores = monthlyA[m];
    return scores.reduce((a, b) => a + b, 0) / scores.length;
  });

  const avgB = commonMonths.map(m => {
    const scores = monthlyB[m];
    return scores.reduce((a, b) => a + b, 0) / scores.length;
  });

  // Pearson correlation
  const n = avgA.length;
  const sumA = avgA.reduce((a, b) => a + b, 0);
  const sumB = avgB.reduce((a, b) => a + b, 0);
  const sumAB = avgA.reduce((total, a, i) => total + a * avgB[i], 0);
  const sumA2 = avgA.reduce((total, a) => total + a * a, 0);
  const sumB2 = avgB.reduce((total, b) => total + b * b, 0);

  const numerator = n * sumAB - sumA * sumB;
  const denominator = Math.sqrt((n * sumA2 - sumA * sumA) * (n * sumB2 - sumB * sumB));

  if (denominator === 0) return { r: 0, n };
  return { r: numerator / denominator, n };
}

/**
 * Determine Keel strength from correlation
 */
function categorizeKeelStrength(r: number): KeelStrength {
  if (r >= 0.5) return 'strong';
  if (r >= 0.3) return 'moderate';
  if (r >= 0.1) return 'weak';
  if (r >= -0.1) return 'none';
  return 'inverse';
}

/**
 * Run a Keel test across multiple domains
 */
export async function runKeelTest(
  domains: string[],
  testName: string,
  hypothesis: string
): Promise<KeelTest | null> {
  const domainData: Record<string, { date: string; score: number }[]> = {};
  const recordsPerDomain: Record<string, number> = {};
  let totalRecords = 0;

  // Get all weirdness indicators used
  const allIndicators: KeelTestVariable[] = [];

  for (const domain of domains) {
    const indicators = WEIRDNESS_INDICATORS[domain];
    if (!indicators) continue;
    allIndicators.push(...indicators);

    // Fetch records for this domain
    const { data, error } = await getAdminClient()
      .from('aletheia_investigations')
      .select('id, investigation_date, raw_data')
      .eq('investigation_type', domain)
      .not('investigation_date', 'is', null)
      .not('raw_data', 'is', null)
      .limit(5000);

    if (error || !data) {
      console.error(`Keel test fetch error for ${domain}:`, error);
      continue;
    }

    recordsPerDomain[domain] = data.length;
    totalRecords += data.length;

    // Calculate weirdness scores
    domainData[domain] = data
      .filter(r => r.raw_data && r.investigation_date)
      .map(r => ({
        date: r.investigation_date as string,
        score: calculateWeirdnessScore(r.raw_data as Record<string, unknown>, indicators),
      }))
      .filter(s => s.score > 0); // Only include records with some weirdness
  }

  const activeDomains = Object.keys(domainData).filter(d => domainData[d].length >= 10);

  if (activeDomains.length < 2) {
    console.log('Not enough domains with sufficient data for Keel test');
    return null;
  }

  // Calculate pairwise correlations
  const correlationMatrix: Record<string, Record<string, number>> = {};
  const correlationValues: number[] = [];

  for (let i = 0; i < activeDomains.length; i++) {
    correlationMatrix[activeDomains[i]] = {};

    for (let j = 0; j < activeDomains.length; j++) {
      if (i === j) {
        correlationMatrix[activeDomains[i]][activeDomains[j]] = 1;
        continue;
      }

      const { r } = correlateWeirdnessScores(
        domainData[activeDomains[i]],
        domainData[activeDomains[j]]
      );

      correlationMatrix[activeDomains[i]][activeDomains[j]] = r;
      if (i < j) correlationValues.push(r);
    }
  }

  // Calculate overall correlation (average of pairwise)
  const overallCorrelation = correlationValues.length > 0
    ? correlationValues.reduce((a, b) => a + b, 0) / correlationValues.length
    : 0;

  // Approximate p-value (simplified)
  const pValue = correlationValues.length > 0
    ? Math.max(0.001, 1 / (1 + Math.abs(overallCorrelation) * Math.sqrt(totalRecords)))
    : 1;

  const strength = categorizeKeelStrength(overallCorrelation);
  const supportsKeel = overallCorrelation > 0.15;

  return {
    test_name: testName,
    hypothesis,
    domains_tested: activeDomains,
    variables_tested: allIndicators,
    correlation_matrix: correlationMatrix,
    overall_correlation: overallCorrelation,
    p_value: pValue,
    effect_size: strength,
    supports_keel_hypothesis: supportsKeel,
    strength,
    notes: supportsKeel
      ? `Weirdness indicators show ${strength} positive correlation across ${activeDomains.length} domains`
      : `No significant correlation found between weirdness indicators across domains`,
    total_records: totalRecords,
    records_per_domain: recordsPerDomain,
  };
}

/**
 * Run the standard Keel battery (multiple pre-defined tests)
 */
export async function runKeelBattery(): Promise<KeelTest[]> {
  const tests: KeelTest[] = [];

  // Test 1: All domains
  const allDomains = Object.keys(WEIRDNESS_INDICATORS);
  const allDomainsTest = await runKeelTest(
    allDomains,
    'Universal Weirdness Correlation',
    'High-strangeness indicators correlate across all domains'
  );
  if (allDomainsTest) tests.push(allDomainsTest);

  // Test 2: Entity encounters (NDE, UFO, Haunting)
  const entityTest = await runKeelTest(
    ['nde', 'ufo', 'haunting'],
    'Entity Encounter Correlation',
    'Entity encounters correlate across NDE, UFO, and haunting reports'
  );
  if (entityTest) tests.push(entityTest);

  // Test 3: Physical effects (UFO, Bigfoot, Haunting)
  const physicalTest = await runKeelTest(
    ['ufo', 'bigfoot', 'haunting'],
    'Physical Evidence Correlation',
    'Physical evidence/effects correlate across UFO, Bigfoot, and haunting'
  );
  if (physicalTest) tests.push(physicalTest);

  // Test 4: Consciousness correlates (NDE, Ganzfeld)
  const consciousnessTest = await runKeelTest(
    ['nde', 'ganzfeld'],
    'Consciousness Phenomena Correlation',
    'Anomalous consciousness indicators correlate between NDE and Ganzfeld'
  );
  if (consciousnessTest) tests.push(consciousnessTest);

  return tests;
}

/**
 * Save Keel tests to database
 */
export async function saveKeelTests(
  tests: KeelTest[],
  sessionId?: string
): Promise<number> {
  if (tests.length === 0) return 0;

  const toInsert = tests.map(t => ({
    session_id: sessionId,
    test_name: t.test_name,
    hypothesis: t.hypothesis,
    domains_tested: t.domains_tested,
    variables_tested: t.variables_tested,
    correlation_matrix: t.correlation_matrix,
    overall_correlation: t.overall_correlation,
    p_value: t.p_value,
    effect_size: t.effect_size,
    supports_keel_hypothesis: t.supports_keel_hypothesis,
    strength: t.strength,
    notes: t.notes,
    total_records: t.total_records,
    records_per_domain: t.records_per_domain,
  }));

  const { data, error } = await getAdminClient()
    .from('aletheia_keel_tests')
    .insert(toInsert)
    .select('id');

  if (error) {
    console.error('Save Keel tests error:', error);
    return 0;
  }

  return data?.length || 0;
}

/**
 * Get Keel test results
 */
export async function getKeelTests(options: {
  sessionId?: string;
  supportsKeel?: boolean;
  limit?: number;
}): Promise<KeelTest[]> {
  let query = getAdminClient()
    .from('aletheia_keel_tests')
    .select('*')
    .order('overall_correlation', { ascending: false });

  if (options.sessionId) {
    query = query.eq('session_id', options.sessionId);
  }
  if (options.supportsKeel !== undefined) {
    query = query.eq('supports_keel_hypothesis', options.supportsKeel);
  }

  const { data, error } = await query.limit(options.limit || 20);

  if (error) {
    console.error('Get Keel tests error:', error);
    return [];
  }

  return data || [];
}

/**
 * Get known weirdness indicators
 */
export function getWeirdnessIndicators(): Record<string, KeelTestVariable[]> {
  return WEIRDNESS_INDICATORS;
}
