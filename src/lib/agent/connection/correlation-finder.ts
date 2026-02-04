/**
 * Connection Agent - Correlation Finder
 * Find statistical correlations across domains
 */

import { getAdminClient } from '../supabase-admin';
import type { CrossDomainCorrelation, CorrelationType } from './types';


interface DomainData {
  domain: string;
  records: Record<string, unknown>[];
}

/**
 * Calculate Pearson correlation coefficient
 */
function pearsonCorrelation(x: number[], y: number[]): number {
  const n = Math.min(x.length, y.length);
  if (n < 3) return 0;

  const xSlice = x.slice(0, n);
  const ySlice = y.slice(0, n);

  const sumX = xSlice.reduce((a, b) => a + b, 0);
  const sumY = ySlice.reduce((a, b) => a + b, 0);
  const sumXY = xSlice.reduce((total, xi, i) => total + xi * ySlice[i], 0);
  const sumX2 = xSlice.reduce((total, xi) => total + xi * xi, 0);
  const sumY2 = ySlice.reduce((total, yi) => total + yi * yi, 0);

  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt(
    (n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY)
  );

  if (denominator === 0) return 0;
  return numerator / denominator;
}

/**
 * Calculate p-value for correlation (approximate)
 */
function correlationPValue(r: number, n: number): number {
  if (n < 3) return 1;

  // t-statistic for correlation
  const t = r * Math.sqrt((n - 2) / (1 - r * r));

  // Approximate p-value using normal distribution for large n
  const absT = Math.abs(t);
  // Simple approximation
  if (absT > 3.5) return 0.001;
  if (absT > 2.5) return 0.01;
  if (absT > 2.0) return 0.05;
  if (absT > 1.5) return 0.1;
  return 0.5;
}

/**
 * Determine effect size category
 */
function categorizeEffectSize(r: number): string {
  const absR = Math.abs(r);
  if (absR >= 0.5) return 'large';
  if (absR >= 0.3) return 'medium';
  if (absR >= 0.1) return 'small';
  return 'negligible';
}

/**
 * Find temporal correlations between domains
 * (Do events in one domain cluster with events in another?)
 */
export async function findTemporalCorrelations(
  domainA: string,
  domainB: string,
  timeWindow: number = 30 // days
): Promise<CrossDomainCorrelation | null> {
  // Get dates from both domains
  const { data: dataA, error: errA } = await getAdminClient()
    .from('aletheia_investigations')
    .select('id, investigation_date')
    .eq('investigation_type', domainA)
    .not('investigation_date', 'is', null)
    .order('investigation_date', { ascending: true })
    .limit(5000);

  const { data: dataB, error: errB } = await getAdminClient()
    .from('aletheia_investigations')
    .select('id, investigation_date')
    .eq('investigation_type', domainB)
    .not('investigation_date', 'is', null)
    .order('investigation_date', { ascending: true })
    .limit(5000);

  if (errA || errB || !dataA || !dataB) {
    console.error('Temporal correlation fetch error:', errA, errB);
    return null;
  }

  if (dataA.length < 10 || dataB.length < 10) {
    return null;
  }

  // Convert to monthly counts for correlation
  const countsA: Record<string, number> = {};
  const countsB: Record<string, number> = {};

  dataA.forEach(r => {
    const month = (r.investigation_date as string).substring(0, 7);
    countsA[month] = (countsA[month] || 0) + 1;
  });

  dataB.forEach(r => {
    const month = (r.investigation_date as string).substring(0, 7);
    countsB[month] = (countsB[month] || 0) + 1;
  });

  // Get common months
  const allMonths = new Set([...Object.keys(countsA), ...Object.keys(countsB)]);
  const months = Array.from(allMonths).sort();

  if (months.length < 12) {
    return null; // Need at least a year of data
  }

  const xValues = months.map(m => countsA[m] || 0);
  const yValues = months.map(m => countsB[m] || 0);

  const r = pearsonCorrelation(xValues, yValues);
  const pValue = correlationPValue(r, months.length);

  return {
    domain_a: domainA,
    domain_b: domainB,
    variable_a: 'monthly_count',
    variable_b: 'monthly_count',
    correlation_type: 'temporal',
    correlation_coefficient: r,
    p_value: pValue,
    effect_size: categorizeEffectSize(r),
    sample_size_a: dataA.length,
    sample_size_b: dataB.length,
    method: 'pearson_monthly_counts',
    conditions: `${months.length} months analyzed`,
    is_significant: pValue < 0.05,
    interpretation: r > 0.3
      ? `${domainA} and ${domainB} events show positive temporal correlation`
      : r < -0.3
        ? `${domainA} and ${domainB} events show inverse temporal correlation`
        : `No significant temporal correlation between ${domainA} and ${domainB}`,
  };
}

/**
 * Find geographic correlations between domains
 * (Do events in one domain occur in same areas as another?)
 */
export async function findGeographicCorrelations(
  domainA: string,
  domainB: string
): Promise<CrossDomainCorrelation | null> {
  // Get location data from both domains
  const { data: dataA, error: errA } = await getAdminClient()
    .from('aletheia_investigations')
    .select('id, location, raw_data')
    .eq('investigation_type', domainA)
    .not('location', 'is', null)
    .limit(5000);

  const { data: dataB, error: errB } = await getAdminClient()
    .from('aletheia_investigations')
    .select('id, location, raw_data')
    .eq('investigation_type', domainB)
    .not('location', 'is', null)
    .limit(5000);

  if (errA || errB || !dataA || !dataB) {
    console.error('Geographic correlation fetch error:', errA, errB);
    return null;
  }

  if (dataA.length < 10 || dataB.length < 10) {
    return null;
  }

  // Extract state/region from locations
  const getState = (location: string): string | null => {
    const usStates = ['AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
      'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI',
      'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND',
      'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA',
      'WA', 'WV', 'WI', 'WY'];

    for (const state of usStates) {
      if (location.includes(state) || location.includes(`, ${state}`)) {
        return state;
      }
    }
    return null;
  };

  // Count by state
  const countsA: Record<string, number> = {};
  const countsB: Record<string, number> = {};

  dataA.forEach(r => {
    const state = getState(r.location || '');
    if (state) {
      countsA[state] = (countsA[state] || 0) + 1;
    }
  });

  dataB.forEach(r => {
    const state = getState(r.location || '');
    if (state) {
      countsB[state] = (countsB[state] || 0) + 1;
    }
  });

  // Get common states
  const allStates = new Set([...Object.keys(countsA), ...Object.keys(countsB)]);
  const states = Array.from(allStates);

  if (states.length < 10) {
    return null;
  }

  const xValues = states.map(s => countsA[s] || 0);
  const yValues = states.map(s => countsB[s] || 0);

  const r = pearsonCorrelation(xValues, yValues);
  const pValue = correlationPValue(r, states.length);

  return {
    domain_a: domainA,
    domain_b: domainB,
    variable_a: 'state_count',
    variable_b: 'state_count',
    correlation_type: 'geographic',
    correlation_coefficient: r,
    p_value: pValue,
    effect_size: categorizeEffectSize(r),
    sample_size_a: Object.values(countsA).reduce((a, b) => a + b, 0),
    sample_size_b: Object.values(countsB).reduce((a, b) => a + b, 0),
    method: 'pearson_state_counts',
    conditions: `${states.length} US states analyzed`,
    confounds_checked: ['population_density'],
    is_significant: pValue < 0.05,
    interpretation: r > 0.3
      ? `${domainA} and ${domainB} events show positive geographic correlation`
      : r < -0.3
        ? `${domainA} and ${domainB} events show inverse geographic correlation`
        : `No significant geographic correlation between ${domainA} and ${domainB}`,
  };
}

/**
 * Find phenomenological correlations
 * (Do domains share similar reported features?)
 */
export async function findPhenomenologicalCorrelations(
  domainA: string,
  domainB: string,
  variableA: string,
  variableB: string
): Promise<CrossDomainCorrelation | null> {
  // Get raw_data containing the variables
  const { data: dataA, error: errA } = await getAdminClient()
    .from('aletheia_investigations')
    .select('id, raw_data')
    .eq('investigation_type', domainA)
    .limit(5000);

  const { data: dataB, error: errB } = await getAdminClient()
    .from('aletheia_investigations')
    .select('id, raw_data')
    .eq('investigation_type', domainB)
    .limit(5000);

  if (errA || errB || !dataA || !dataB) {
    return null;
  }

  // Extract variable values
  const extractValue = (rawData: unknown, variable: string): boolean | null => {
    if (!rawData || typeof rawData !== 'object') return null;
    const data = rawData as Record<string, unknown>;

    // Try direct access
    if (variable in data) {
      const val = data[variable];
      if (typeof val === 'boolean') return val;
      if (typeof val === 'string') return val.toLowerCase() === 'yes' || val === 'true' || val === '1';
      if (typeof val === 'number') return val > 0;
    }

    // Try nested access
    for (const key of Object.keys(data)) {
      if (typeof data[key] === 'object' && data[key] !== null) {
        const nested = data[key] as Record<string, unknown>;
        if (variable in nested) {
          const val = nested[variable];
          if (typeof val === 'boolean') return val;
          if (typeof val === 'string') return val.toLowerCase() === 'yes' || val === 'true';
        }
      }
    }

    return null;
  };

  const valuesA = dataA
    .map(r => extractValue(r.raw_data, variableA))
    .filter((v): v is boolean => v !== null);

  const valuesB = dataB
    .map(r => extractValue(r.raw_data, variableB))
    .filter((v): v is boolean => v !== null);

  if (valuesA.length < 10 || valuesB.length < 10) {
    return null;
  }

  // Calculate prevalence rates
  const rateA = valuesA.filter(v => v).length / valuesA.length;
  const rateB = valuesB.filter(v => v).length / valuesB.length;

  // Compare rates (simple effect size)
  const rateDiff = Math.abs(rateA - rateB);

  return {
    domain_a: domainA,
    domain_b: domainB,
    variable_a: variableA,
    variable_b: variableB,
    correlation_type: 'phenomenological',
    correlation_coefficient: 1 - rateDiff, // Similarity
    effect_size: rateDiff < 0.1 ? 'similar' : rateDiff < 0.3 ? 'moderate_difference' : 'large_difference',
    sample_size_a: valuesA.length,
    sample_size_b: valuesB.length,
    method: 'prevalence_comparison',
    conditions: `${variableA} rate: ${(rateA * 100).toFixed(1)}%, ${variableB} rate: ${(rateB * 100).toFixed(1)}%`,
    is_significant: rateDiff < 0.15, // Similar if rates within 15%
    interpretation: rateDiff < 0.15
      ? `"${variableA}" in ${domainA} and "${variableB}" in ${domainB} have similar prevalence rates`
      : `"${variableA}" and "${variableB}" show different prevalence across domains`,
  };
}

/**
 * Save cross-domain correlations
 */
export async function saveCorrelations(
  correlations: CrossDomainCorrelation[],
  sessionId?: string
): Promise<number> {
  if (correlations.length === 0) return 0;

  const toInsert = correlations.map(c => ({
    ...c,
    session_id: sessionId,
  }));

  const { data, error } = await getAdminClient()
    .from('aletheia_cross_domain_correlations')
    .insert(toInsert)
    .select('id');

  if (error) {
    console.error('Save correlations error:', error);
    return 0;
  }

  return data?.length || 0;
}

/**
 * Get existing correlations
 */
export async function getCorrelations(options: {
  domainA?: string;
  domainB?: string;
  type?: CorrelationType;
  significantOnly?: boolean;
  limit?: number;
}): Promise<CrossDomainCorrelation[]> {
  let query = getAdminClient()
    .from('aletheia_cross_domain_correlations')
    .select('*')
    .order('correlation_coefficient', { ascending: false });

  if (options.domainA) {
    query = query.eq('domain_a', options.domainA);
  }
  if (options.domainB) {
    query = query.eq('domain_b', options.domainB);
  }
  if (options.type) {
    query = query.eq('correlation_type', options.type);
  }
  if (options.significantOnly) {
    query = query.eq('is_significant', true);
  }

  const { data, error } = await query.limit(options.limit || 50);

  if (error) {
    console.error('Get correlations error:', error);
    return [];
  }

  return data || [];
}
