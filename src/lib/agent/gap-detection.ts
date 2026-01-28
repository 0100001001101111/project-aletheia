/**
 * Gap Detection Module
 *
 * Identifies data gaps during agent runs:
 * - Temporal gaps (data coverage ends before other domains)
 * - Geographic gaps (missing regions with expected activity)
 * - Domain gaps (significant imbalance between domains)
 * - Verification gaps (patterns needing independent confirmation)
 */

import { createAgentReadClient } from './supabase-admin';
import type { DataGap } from './types';

/**
 * Detect temporal gaps in the data
 * Compares date ranges across investigation types
 */
async function detectTemporalGaps(): Promise<DataGap[]> {
  const supabase = createAgentReadClient();
  const gaps: DataGap[] = [];

  // Get date ranges by investigation type
  const { data, error } = await supabase
    .from('aletheia_investigations')
    .select('investigation_type, event_date')
    .not('event_date', 'is', null)
    .order('event_date', { ascending: false });

  if (error || !data) {
    console.error('Error fetching date ranges:', error);
    return gaps;
  }

  // Group by type and find max dates
  const typeMaxDates: Record<string, string> = {};
  for (const row of data) {
    const type = row.investigation_type;
    const date = row.event_date;
    if (!typeMaxDates[type] || date > typeMaxDates[type]) {
      typeMaxDates[type] = date;
    }
  }

  // Find the overall max date
  const allDates = Object.values(typeMaxDates);
  if (allDates.length === 0) return gaps;

  const overallMax = allDates.reduce((a, b) => a > b ? a : b);
  const overallMaxDate = new Date(overallMax);

  // Check each type for gaps (more than 1 year behind)
  for (const [type, maxDate] of Object.entries(typeMaxDates)) {
    const typeDate = new Date(maxDate);
    const diffYears = (overallMaxDate.getTime() - typeDate.getTime()) / (1000 * 60 * 60 * 24 * 365);

    if (diffYears >= 1) {
      gaps.push({
        type: 'temporal',
        description: `${type} data ends ${maxDate.split('T')[0]}, which is ${Math.floor(diffYears)} year(s) behind other domains`,
        domain: type,
        severity: diffYears >= 3 ? 'critical' : diffYears >= 2 ? 'moderate' : 'minor',
        details: {
          data_ends: maxDate,
          comparison_ends: overallMax,
        },
      });
    }
  }

  return gaps;
}

/**
 * Detect geographic gaps in the data
 * Looks for states/regions with zero or very few reports
 */
async function detectGeographicGaps(): Promise<DataGap[]> {
  const supabase = createAgentReadClient();
  const gaps: DataGap[] = [];

  // US states that should have some paranormal activity
  const expectedStates = [
    'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado',
    'Connecticut', 'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho',
    'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana',
    'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota',
    'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada',
    'New Hampshire', 'New Jersey', 'New Mexico', 'New York',
    'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon',
    'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota',
    'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington',
    'West Virginia', 'Wisconsin', 'Wyoming',
  ];

  // Count records by state (from location field)
  const { data, error } = await supabase
    .from('aletheia_investigations')
    .select('location')
    .not('location', 'is', null);

  if (error || !data) {
    console.error('Error fetching locations:', error);
    return gaps;
  }

  // Extract states from location strings
  const stateCounts: Record<string, number> = {};
  for (const state of expectedStates) {
    stateCounts[state] = 0;
  }

  for (const row of data) {
    const location = (row.location || '').toString();
    for (const state of expectedStates) {
      if (location.includes(state)) {
        stateCounts[state]++;
        break;
      }
    }
  }

  // Find states with very low coverage (< 10 records)
  const missingStates = Object.entries(stateCounts)
    .filter(([, count]) => count < 10)
    .map(([state]) => state);

  if (missingStates.length > 0) {
    gaps.push({
      type: 'geographic',
      description: `${missingStates.length} states have fewer than 10 records: ${missingStates.slice(0, 5).join(', ')}${missingStates.length > 5 ? '...' : ''}`,
      severity: missingStates.length > 10 ? 'critical' : missingStates.length > 5 ? 'moderate' : 'minor',
      details: {
        missing_regions: missingStates,
      },
    });
  }

  return gaps;
}

/**
 * Detect domain imbalances
 * Identifies domains with significantly fewer records than others
 */
async function detectDomainGaps(): Promise<DataGap[]> {
  const supabase = createAgentReadClient();
  const gaps: DataGap[] = [];

  // Count by investigation type
  const { data, error } = await supabase
    .from('aletheia_investigations')
    .select('investigation_type');

  if (error || !data) {
    console.error('Error fetching domain counts:', error);
    return gaps;
  }

  const typeCounts: Record<string, number> = {};
  for (const row of data) {
    const type = row.investigation_type || 'unknown';
    typeCounts[type] = (typeCounts[type] || 0) + 1;
  }

  // Find the maximum count (excluding unknown)
  const counts = Object.entries(typeCounts).filter(([t]) => t !== 'unknown');
  if (counts.length < 2) return gaps;

  const maxCount = Math.max(...counts.map(([, c]) => c));
  const maxType = counts.find(([, c]) => c === maxCount)?.[0] || '';

  // Find domains with < 5% of the max
  for (const [type, count] of counts) {
    const ratio = count / maxCount;
    if (ratio < 0.05 && count < 1000) {
      gaps.push({
        type: 'domain',
        description: `${type} has only ${count.toLocaleString()} records (${(ratio * 100).toFixed(1)}% of ${maxType}'s ${maxCount.toLocaleString()})`,
        domain: type,
        severity: ratio < 0.01 ? 'critical' : ratio < 0.03 ? 'moderate' : 'minor',
        details: {
          domain_count: count,
          comparison_count: maxCount,
        },
      });
    }
  }

  return gaps;
}

/**
 * Detect verification gaps
 * Identifies findings that need independent data sources for confirmation
 */
async function detectVerificationGaps(): Promise<DataGap[]> {
  const supabase = createAgentReadClient();
  const gaps: DataGap[] = [];

  // Find findings that failed confound checks due to single-source data
  const { data, error } = await supabase
    .from('aletheia_agent_findings')
    .select('id, title, technical_details')
    .eq('review_status', 'pending')
    .not('technical_details', 'is', null);

  if (error || !data) {
    console.error('Error fetching findings:', error);
    return gaps;
  }

  for (const finding of data) {
    const details = finding.technical_details as Record<string, unknown>;
    const confoundChecks = (details?.confound_checks || []) as Array<{
      confound_type: string;
      effect_survived: boolean;
      notes?: string;
    }>;

    // Check for reporting bias confound failures
    const reportingBias = confoundChecks.find(c => c.confound_type === 'reporting_bias');
    if (reportingBias && !reportingBias.effect_survived) {
      gaps.push({
        type: 'verification',
        description: `Finding "${finding.title}" failed reporting bias check - needs independent data source`,
        severity: 'moderate',
        details: {
          pattern_id: finding.id,
          needs_independent_source: true,
        },
      });
    }
  }

  return gaps;
}

/**
 * Main function: Detect all data gaps
 */
export async function detectDataGaps(): Promise<DataGap[]> {
  const allGaps: DataGap[] = [];

  // Run all detection methods in parallel
  const [temporal, geographic, domain, verification] = await Promise.all([
    detectTemporalGaps(),
    detectGeographicGaps(),
    detectDomainGaps(),
    detectVerificationGaps(),
  ]);

  allGaps.push(...temporal, ...geographic, ...domain, ...verification);

  // Sort by severity
  const severityOrder = { critical: 0, moderate: 1, minor: 2 };
  allGaps.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return allGaps;
}

/**
 * Get a summary of detected gaps for logging
 */
export function summarizeGaps(gaps: DataGap[]): string {
  if (gaps.length === 0) {
    return 'No significant data gaps detected.';
  }

  const byType = gaps.reduce((acc, gap) => {
    acc[gap.type] = (acc[gap.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const critical = gaps.filter(g => g.severity === 'critical').length;

  let summary = `Detected ${gaps.length} data gap(s): `;
  summary += Object.entries(byType).map(([type, count]) => `${count} ${type}`).join(', ');
  if (critical > 0) {
    summary += ` (${critical} critical)`;
  }

  return summary;
}
