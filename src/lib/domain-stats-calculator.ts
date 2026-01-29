/**
 * Domain Statistics Calculator
 * Computes per-domain reliability metrics for the statistics dashboard
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { InvestigationType, ResearchInvestigationType, TriageStatus } from '@/types/database';

// Type for the Supabase client (any variant)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = SupabaseClient<any, any, any>;

// Research domains for the dashboard
export const RESEARCH_DOMAINS: ResearchInvestigationType[] = [
  'nde',
  'ganzfeld',
  'crisis_apparition',
  'stargate',
  'geophysical',
  'ufo',
];

export interface DomainStats {
  domain: InvestigationType;
  recordCount: number;
  avgScore: number | null;
  minScore: number | null;
  maxScore: number | null;
  verifiedCount: number;
  provisionalCount: number;
  pendingCount: number;
  rejectedCount: number;
  oldestRecord: string | null;
  newestRecord: string | null;
  scoreDistribution: ScoreDistributionBucket[];
  temporalCoverage: TemporalCoverageBucket[];
  reliabilityIndex: number;
  dataQualityIndex: number;
}

export interface ScoreDistributionBucket {
  range: string; // e.g., "0-2", "2-4", "4-6", "6-8", "8-10"
  count: number;
  percentage: number;
}

export interface TemporalCoverageBucket {
  year: number;
  count: number;
}

export interface DomainComparison {
  domains: DomainStats[];
  totalRecords: number;
  avgReliability: number;
  lastUpdated: string;
}

interface InvestigationRow {
  id: string;
  triage_score: number | null;
  triage_status: TriageStatus | null;
  created_at: string | null;
}

/**
 * Calculate statistics for a single domain
 */
export async function calculateDomainStats(
  supabase: AnySupabaseClient,
  domain: InvestigationType
): Promise<DomainStats> {
  // Get basic counts and aggregates
  const { data: investigations, error } = await supabase
    .from('aletheia_investigations')
    .select('id, triage_score, triage_status, created_at')
    .eq('investigation_type', domain)
    .eq('tier', 'research') as { data: InvestigationRow[] | null; error: Error | null };

  if (error) {
    console.error(`Error fetching ${domain} stats:`, error);
    return createEmptyStats(domain);
  }

  if (!investigations || investigations.length === 0) {
    return createEmptyStats(domain);
  }

  // Calculate basic stats
  const scores = investigations
    .map((i) => i.triage_score)
    .filter((s): s is number => s != null);

  const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
  const minScore = scores.length > 0 ? Math.min(...scores) : null;
  const maxScore = scores.length > 0 ? Math.max(...scores) : null;

  // Count by status
  const statusCounts = investigations.reduce(
    (acc, i) => {
      const status = i.triage_status || 'pending';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  // Find date range
  const dates = investigations
    .map((i) => i.created_at)
    .filter(Boolean)
    .sort();
  const oldestRecord = dates[0] || null;
  const newestRecord = dates[dates.length - 1] || null;

  // Calculate score distribution
  const scoreDistribution = calculateScoreDistribution(scores);

  // Calculate temporal coverage
  const temporalCoverage = calculateTemporalCoverage(investigations);

  // Calculate reliability index (weighted average of verification metrics)
  const verifiedRatio = (statusCounts.verified || 0) / investigations.length;
  const avgScoreNorm = avgScore != null ? avgScore / 10 : 0;
  const reliabilityIndex = verifiedRatio * 0.6 + avgScoreNorm * 0.4;

  // Calculate data quality index (how complete the data is)
  const hasScoreRatio = scores.length / investigations.length;
  const dataQualityIndex = hasScoreRatio;

  return {
    domain,
    recordCount: investigations.length,
    avgScore,
    minScore,
    maxScore,
    verifiedCount: statusCounts.verified || 0,
    provisionalCount: statusCounts.provisional || 0,
    pendingCount: statusCounts.pending || 0,
    rejectedCount: statusCounts.rejected || 0,
    oldestRecord,
    newestRecord,
    scoreDistribution,
    temporalCoverage,
    reliabilityIndex,
    dataQualityIndex,
  };
}

/**
 * Calculate statistics for all research domains
 */
export async function calculateAllDomainStats(
  supabase: AnySupabaseClient
): Promise<DomainComparison> {
  const domainStatsPromises = RESEARCH_DOMAINS.map((domain) =>
    calculateDomainStats(supabase, domain)
  );

  const domains = await Promise.all(domainStatsPromises);

  const totalRecords = domains.reduce((sum, d) => sum + d.recordCount, 0);
  const avgReliability =
    domains.length > 0
      ? domains.reduce((sum, d) => sum + d.reliabilityIndex, 0) / domains.length
      : 0;

  return {
    domains,
    totalRecords,
    avgReliability,
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Calculate score distribution buckets
 */
function calculateScoreDistribution(scores: number[]): ScoreDistributionBucket[] {
  const buckets: ScoreDistributionBucket[] = [
    { range: '0-2', count: 0, percentage: 0 },
    { range: '2-4', count: 0, percentage: 0 },
    { range: '4-6', count: 0, percentage: 0 },
    { range: '6-8', count: 0, percentage: 0 },
    { range: '8-10', count: 0, percentage: 0 },
  ];

  if (scores.length === 0) return buckets;

  for (const score of scores) {
    if (score < 2) buckets[0].count++;
    else if (score < 4) buckets[1].count++;
    else if (score < 6) buckets[2].count++;
    else if (score < 8) buckets[3].count++;
    else buckets[4].count++;
  }

  // Calculate percentages
  for (const bucket of buckets) {
    bucket.percentage = (bucket.count / scores.length) * 100;
  }

  return buckets;
}

/**
 * Calculate temporal coverage (records per year)
 */
function calculateTemporalCoverage(
  investigations: { created_at: string | null }[]
): TemporalCoverageBucket[] {
  const yearCounts: Record<number, number> = {};

  for (const inv of investigations) {
    if (!inv.created_at) continue;
    const year = new Date(inv.created_at).getFullYear();
    yearCounts[year] = (yearCounts[year] || 0) + 1;
  }

  return Object.entries(yearCounts)
    .map(([year, count]) => ({
      year: parseInt(year),
      count,
    }))
    .sort((a, b) => a.year - b.year);
}

/**
 * Create empty stats for a domain with no data
 */
function createEmptyStats(domain: InvestigationType): DomainStats {
  return {
    domain,
    recordCount: 0,
    avgScore: null,
    minScore: null,
    maxScore: null,
    verifiedCount: 0,
    provisionalCount: 0,
    pendingCount: 0,
    rejectedCount: 0,
    oldestRecord: null,
    newestRecord: null,
    scoreDistribution: [
      { range: '0-2', count: 0, percentage: 0 },
      { range: '2-4', count: 0, percentage: 0 },
      { range: '4-6', count: 0, percentage: 0 },
      { range: '6-8', count: 0, percentage: 0 },
      { range: '8-10', count: 0, percentage: 0 },
    ],
    temporalCoverage: [],
    reliabilityIndex: 0,
    dataQualityIndex: 0,
  };
}

/**
 * Get domain display name
 */
export function getDomainDisplayName(domain: InvestigationType): string {
  const names: Record<string, string> = {
    nde: 'Near-Death Experiences',
    ganzfeld: 'Ganzfeld Experiments',
    crisis_apparition: 'Crisis Apparitions',
    stargate: 'STARGATE / Remote Viewing',
    geophysical: 'Geophysical Anomalies',
    ufo: 'UFO/UAP Sightings',
  };
  return names[domain] || domain;
}

/**
 * Get domain description
 */
export function getDomainDescription(domain: InvestigationType): string {
  const descriptions: Record<string, string> = {
    nde: 'Reports of experiences during clinical death or near-death states',
    ganzfeld: 'Controlled telepathy experiments using sensory deprivation',
    crisis_apparition: 'Apparitions of individuals at the moment of their death or crisis',
    stargate: 'Declassified government remote viewing program data',
    geophysical: 'Electromagnetic and geological anomaly measurements',
    ufo: 'Unidentified aerial phenomena observations',
  };
  return descriptions[domain] || '';
}

/**
 * Get domain icon color
 */
export function getDomainColor(domain: InvestigationType): string {
  const colors: Record<string, string> = {
    nde: 'violet',
    ganzfeld: 'cyan',
    crisis_apparition: 'rose',
    stargate: 'amber',
    geophysical: 'emerald',
    ufo: 'blue',
  };
  return colors[domain] || 'zinc';
}
