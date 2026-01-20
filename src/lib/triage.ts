/**
 * Triage Score Calculator
 * Auto-calculates quality score (0-10) for submissions
 */

import type { InvestigationType } from '../types/database';
import { TRIAGE_INDICATORS, getNestedValue } from '../schemas';
import { calculateUFOQualityScore, calculateConfoundScore, type UFOData } from '../schemas/ufo';

export interface TriageBreakdown {
  sourceIntegrity: { score: number; max: number; details: string[] };
  methodology: { score: number; max: number; details: string[] };
  variableCapture: { score: number; max: number; details: string[] };
  dataQuality: { score: number; max: number; details: string[] };
  overall: number;
  status: 'pending' | 'provisional' | 'verified' | 'rejected';
  recommendations: string[];
}

/**
 * Calculate triage score for submission data
 */
export function calculateTriageScore(
  data: Record<string, unknown>,
  schemaType: InvestigationType
): TriageBreakdown {
  const indicators = TRIAGE_INDICATORS[schemaType];

  // Initialize breakdown
  const breakdown: TriageBreakdown = {
    sourceIntegrity: { score: 0, max: 3, details: [] },
    methodology: { score: 0, max: 3, details: [] },
    variableCapture: { score: 0, max: 2, details: [] },
    dataQuality: { score: 0, max: 2, details: [] },
    overall: 0,
    status: 'pending',
    recommendations: [],
  };

  // Calculate source integrity (0-3)
  const sourceFields = indicators.source_integrity || [];
  const sourcePresent = sourceFields.filter((field) => hasValue(data, field));
  breakdown.sourceIntegrity.score = Math.min(3, sourcePresent.length);
  breakdown.sourceIntegrity.details = sourcePresent.map((f) => `✓ ${formatFieldName(f)}`);

  const sourceMissing = sourceFields.filter((field) => !hasValue(data, field));
  if (sourceMissing.length > 0) {
    breakdown.recommendations.push(`Add source information: ${sourceMissing.map(formatFieldName).join(', ')}`);
  }

  // Calculate methodology (0-3)
  const methodFields = indicators.methodology || [];
  const methodPresent = methodFields.filter((field) => hasValue(data, field));
  breakdown.methodology.score = Math.min(3, methodPresent.length);
  breakdown.methodology.details = methodPresent.map((f) => `✓ ${formatFieldName(f)}`);

  const methodMissing = methodFields.filter((field) => !hasValue(data, field));
  if (methodMissing.length > 0) {
    breakdown.recommendations.push(`Document methodology: ${methodMissing.map(formatFieldName).join(', ')}`);
  }

  // Calculate variable capture (0-2)
  const varFields = indicators.variable_capture || [];
  const varPresent = varFields.filter((field) => hasValue(data, field));
  breakdown.variableCapture.score = Math.min(2, Math.floor(varPresent.length / 2));
  breakdown.variableCapture.details = varPresent.map((f) => `✓ ${formatFieldName(f)}`);

  if (varPresent.length < 2) {
    breakdown.recommendations.push('Add more subject/receiver profile variables');
  }

  // Calculate data quality (0-2)
  // Check for raw data/transcripts/detailed info
  const dataFields = indicators.data_quality || getDefaultDataQualityFields(schemaType);
  const dataPresent = dataFields.filter((field) => hasValue(data, field));
  breakdown.dataQuality.score = Math.min(2, dataPresent.length);
  breakdown.dataQuality.details = dataPresent.map((f) => `✓ ${formatFieldName(f)}`);

  if (dataPresent.length < 1) {
    breakdown.recommendations.push('Include raw data or transcripts when available');
  }

  // Calculate overall score (0-10)
  // For UFO type, use dedicated quality scoring
  if (schemaType === 'ufo') {
    const ufoQuality = calculateUFOQualityScore(data as UFOData);
    const confoundScore = calculateConfoundScore(data as UFOData);

    // Adjust quality based on confounds (high confound reduces quality)
    const confoundPenalty = Math.min(3, Math.floor(confoundScore / 25));
    breakdown.overall = Math.max(0, Math.min(10, ufoQuality - confoundPenalty));

    // Add confound info to recommendations if high
    if (confoundScore >= 50) {
      breakdown.recommendations.push(`High confound score (${confoundScore}): near airport/military base`);
    }
  } else {
    const rawTotal =
      breakdown.sourceIntegrity.score +
      breakdown.methodology.score +
      breakdown.variableCapture.score +
      breakdown.dataQuality.score;

    // Scale to 0-10
    breakdown.overall = Math.round(rawTotal);
  }

  // Determine status
  if (breakdown.overall >= 7) {
    breakdown.status = 'verified';
  } else if (breakdown.overall >= 4) {
    breakdown.status = 'provisional';
  } else if (breakdown.overall >= 1) {
    breakdown.status = 'pending';
  } else {
    breakdown.status = 'rejected';
    breakdown.recommendations.unshift('Submission needs significant additional information');
  }

  // Add specific recommendations based on schema type
  addSchemaSpecificRecommendations(breakdown, data, schemaType);

  return breakdown;
}

/**
 * Check if a nested field has a non-null/non-empty value
 */
function hasValue(data: Record<string, unknown>, path: string): boolean {
  const value = getNestedValue(data, path);

  if (value === null || value === undefined) return false;
  if (typeof value === 'string' && value.trim() === '') return false;
  if (Array.isArray(value) && value.length === 0) return false;
  if (typeof value === 'object' && Object.keys(value).length === 0) return false;

  return true;
}

/**
 * Format field path for display
 */
function formatFieldName(path: string): string {
  return path
    .split('.')
    .pop()!
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (l) => l.toUpperCase());
}

/**
 * Get default data quality fields for schema type
 */
function getDefaultDataQualityFields(schemaType: InvestigationType): string[] {
  switch (schemaType) {
    case 'nde':
      return ['full_narrative', 'greyson_score', 'veridical_perception.description'];
    case 'ganzfeld':
      return ['mentation_transcript', 'results.correspondence_notes', 'session_id'];
    case 'crisis_apparition':
      return ['full_narrative', 'witnesses.witness_statements_available'];
    case 'stargate':
      return ['session_transcript', 'sketch_analysis.sketches_available', 'impressions.summary_description'];
    case 'geophysical':
      return ['readings', 'raw_data_file', 'anomaly_events'];
    case 'ufo':
      return ['description', 'location.latitude', 'location.longitude', 'date_time'];
    default:
      return [];
  }
}

/**
 * Add schema-specific recommendations
 */
function addSchemaSpecificRecommendations(
  breakdown: TriageBreakdown,
  data: Record<string, unknown>,
  schemaType: InvestigationType
): void {
  switch (schemaType) {
    case 'nde':
      if (!hasValue(data, 'greyson_score')) {
        breakdown.recommendations.push('Consider administering the Greyson NDE Scale for standardized scoring');
      }
      if (hasValue(data, 'veridical_perception.claimed') && !hasValue(data, 'veridical_perception.verified')) {
        breakdown.recommendations.push('Veridical perception claimed - attempt independent verification');
      }
      break;

    case 'ganzfeld':
      if (!hasValue(data, 'protocol.double_blind')) {
        breakdown.recommendations.push('Document whether double-blind protocol was used');
      }
      if (!hasValue(data, 'environment.geomagnetic_activity_kp')) {
        breakdown.recommendations.push('Record geomagnetic activity (Kp index) for correlation analysis');
      }
      break;

    case 'crisis_apparition':
      if (hasValue(data, 'witnesses.count')) {
        const count = getNestedValue(data, 'witnesses.count') as number;
        if (count > 0 && !hasValue(data, 'witnesses.independent_reports')) {
          breakdown.recommendations.push('Document whether witnesses reported independently before comparing');
        }
      }
      if (!hasValue(data, 'knew_subject_was_ill_or_dying')) {
        breakdown.recommendations.push('Document whether percipient knew subject was ill/dying before apparition');
      }
      break;

    case 'stargate':
      if (!hasValue(data, 'protocol.blind_level')) {
        breakdown.recommendations.push('Document blinding level (single, double, triple)');
      }
      if (!hasValue(data, 'evaluation.decoy_pool_size')) {
        breakdown.recommendations.push('Specify decoy pool size for statistical analysis');
      }
      break;

    case 'geophysical':
      if (!hasValue(data, 'baseline')) {
        breakdown.recommendations.push('Establish baseline measurements before anomaly detection');
      }
      if (!hasValue(data, 'protocol.control_location_used')) {
        breakdown.recommendations.push('Consider using a control location for comparison');
      }
      break;

    case 'ufo':
      if (!hasValue(data, 'geophysical.earthquake_nearby')) {
        breakdown.recommendations.push('Check for seismic activity within 7 days and 200km (SPECTER correlation)');
      }
      if (!hasValue(data, 'geomagnetic.kp_index')) {
        breakdown.recommendations.push('Record Kp index at time of sighting for geomagnetic correlation');
      }
      if (!hasValue(data, 'effects.physiological_effects')) {
        breakdown.recommendations.push('Document any physiological effects (high-signal indicator)');
      }
      if (hasValue(data, 'witness_count')) {
        const count = getNestedValue(data, 'witness_count') as number;
        if (count === 1) {
          breakdown.recommendations.push('Single-witness sighting - corroboration would strengthen quality');
        }
      }
      break;
  }
}

/**
 * Get triage score color based on score value
 */
export function getTriageScoreColor(score: number): string {
  if (score >= 7) return 'text-emerald-400';
  if (score >= 4) return 'text-amber-400';
  if (score >= 1) return 'text-orange-400';
  return 'text-red-400';
}

/**
 * Get triage status color
 */
export function getTriageStatusColor(status: TriageBreakdown['status']): string {
  switch (status) {
    case 'verified':
      return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    case 'provisional':
      return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
    case 'pending':
      return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    case 'rejected':
      return 'bg-red-500/20 text-red-400 border-red-500/30';
    default:
      return 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30';
  }
}
