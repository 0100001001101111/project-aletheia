/**
 * Simple Mode Scoring
 * Narrative-based scoring for non-experts
 * Maximum score capped at 6.0
 */

export interface SimpleSubmissionData {
  narrative: string;
  eventDate: string | null;
  eventLocation: string | null;
  hasWitnesses: boolean;
  witnessCount: number;
  hasEvidence: boolean;
  evidenceTypes: string[];
}

export interface SimpleScoreBreakdown {
  finalScore: number;
  maxPossible: number;
  tier: 'provisional' | 'pending';
  factors: {
    narrativeCompleteness: { score: number; max: number; reason: string };
    temporalProximity: { score: number; max: number; reason: string };
    witnessPresence: { score: number; max: number; reason: string };
    evidencePresence: { score: number; max: number; reason: string };
  };
  recommendations: string[];
}

const SIMPLE_MAX_SCORE = 6.0;

/**
 * Calculate score for simple mode submission
 * Uses narrative completeness, witnesses, and evidence presence
 */
export function calculateSimpleScore(data: SimpleSubmissionData): SimpleScoreBreakdown {
  const factors = {
    narrativeCompleteness: calculateNarrativeScore(data.narrative),
    temporalProximity: calculateTemporalScore(data.eventDate),
    witnessPresence: calculateWitnessScore(data.hasWitnesses, data.witnessCount),
    evidencePresence: calculateEvidenceScore(data.hasEvidence, data.evidenceTypes),
  };

  // Sum raw scores (each factor has max 1.5)
  const rawScore =
    factors.narrativeCompleteness.score +
    factors.temporalProximity.score +
    factors.witnessPresence.score +
    factors.evidencePresence.score;

  // Cap at 6.0
  const finalScore = Math.min(rawScore, SIMPLE_MAX_SCORE);

  // Simple mode can only reach "provisional" (4.0-5.9) or "pending" (<4.0)
  const tier = finalScore >= 4.0 ? 'provisional' : 'pending';

  // Generate recommendations
  const recommendations: string[] = [];

  if (factors.narrativeCompleteness.score < 1.5) {
    recommendations.push('Add more detail to your account (who, what, where, when)');
  }
  if (factors.temporalProximity.score < 1.0) {
    recommendations.push('Include approximate date/time for better temporal analysis');
  }
  if (factors.witnessPresence.score < 1.0) {
    recommendations.push('Note if anyone else witnessed the event');
  }
  if (factors.evidencePresence.score < 0.5) {
    recommendations.push('Attach any photos, documents, or recordings if available');
  }

  // Suggest upgrading to full mode for higher scores
  if (finalScore >= 5.0) {
    recommendations.push('For a score above 6.0, consider using Full Mode with detailed witness profiles');
  }

  return {
    finalScore,
    maxPossible: SIMPLE_MAX_SCORE,
    tier,
    factors,
    recommendations,
  };
}

/**
 * Score narrative completeness based on length and structure
 */
function calculateNarrativeScore(narrative: string): {
  score: number;
  max: number;
  reason: string;
} {
  const max = 1.5;
  const trimmed = narrative?.trim() || '';
  const wordCount = trimmed.split(/\s+/).filter(Boolean).length;

  // Check for key narrative elements
  const hasLocation = /where|location|at\s+the|in\s+the|near/i.test(trimmed);
  const hasTime = /when|time|o'clock|am|pm|morning|afternoon|evening|night/i.test(trimmed);
  const hasAction = /saw|heard|felt|observed|witnessed|noticed|appeared/i.test(trimmed);

  let score = 0;
  let reason = '';

  if (wordCount < 20) {
    score = 0.3;
    reason = 'Very brief description';
  } else if (wordCount < 50) {
    score = 0.6;
    reason = 'Brief description';
  } else if (wordCount < 100) {
    score = 0.9;
    reason = 'Moderate detail';
  } else if (wordCount < 200) {
    score = 1.2;
    reason = 'Good detail';
  } else {
    score = 1.5;
    reason = 'Comprehensive narrative';
  }

  // Bonus for including key elements (up to cap)
  const elementBonus = (hasLocation ? 0.1 : 0) + (hasTime ? 0.1 : 0) + (hasAction ? 0.1 : 0);
  score = Math.min(score + elementBonus, max);

  return { score, max, reason };
}

/**
 * Score based on how recently the event occurred
 */
function calculateTemporalScore(eventDate: string | null): {
  score: number;
  max: number;
  reason: string;
} {
  const max = 1.5;

  if (!eventDate) {
    return { score: 0.3, max, reason: 'No date provided' };
  }

  try {
    const date = new Date(eventDate);
    const now = new Date();
    const daysSinceEvent = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (daysSinceEvent < 0) {
      return { score: 0.3, max, reason: 'Future date' };
    }

    if (daysSinceEvent <= 7) {
      return { score: 1.5, max, reason: 'Within past week' };
    }
    if (daysSinceEvent <= 30) {
      return { score: 1.2, max, reason: 'Within past month' };
    }
    if (daysSinceEvent <= 365) {
      return { score: 0.9, max, reason: 'Within past year' };
    }
    if (daysSinceEvent <= 365 * 5) {
      return { score: 0.6, max, reason: 'Within past 5 years' };
    }

    return { score: 0.4, max, reason: 'Historical event (5+ years)' };
  } catch {
    return { score: 0.3, max, reason: 'Invalid date format' };
  }
}

/**
 * Score based on witness presence
 */
function calculateWitnessScore(
  hasWitnesses: boolean,
  witnessCount: number
): { score: number; max: number; reason: string } {
  const max = 1.5;

  if (!hasWitnesses || witnessCount === 0) {
    return { score: 0.3, max, reason: 'Solo experience' };
  }

  if (witnessCount === 1) {
    return { score: 0.6, max, reason: '1 additional witness' };
  }
  if (witnessCount === 2) {
    return { score: 0.9, max, reason: '2 additional witnesses' };
  }
  if (witnessCount <= 5) {
    return { score: 1.2, max, reason: 'Multiple witnesses' };
  }

  return { score: 1.5, max, reason: '6+ witnesses' };
}

/**
 * Score based on evidence presence
 */
function calculateEvidenceScore(
  hasEvidence: boolean,
  evidenceTypes: string[]
): { score: number; max: number; reason: string } {
  const max = 1.5;

  if (!hasEvidence || evidenceTypes.length === 0) {
    return { score: 0.2, max, reason: 'No supporting evidence' };
  }

  // Weight evidence types
  const evidenceWeights: Record<string, number> = {
    photo: 0.4,
    video: 0.5,
    audio: 0.3,
    document: 0.4,
    physical: 0.5,
    testimony: 0.2,
    other: 0.2,
  };

  let score = 0;
  for (const type of evidenceTypes) {
    score += evidenceWeights[type] || 0.2;
  }

  score = Math.min(score, max);

  let reason: string;
  if (score >= 1.2) {
    reason = 'Strong supporting evidence';
  } else if (score >= 0.8) {
    reason = 'Good supporting evidence';
  } else if (score >= 0.4) {
    reason = 'Some supporting evidence';
  } else {
    reason = 'Limited evidence';
  }

  return { score, max, reason };
}

/**
 * Convert simple submission to investigation raw_data format
 */
export function simpleToRawData(
  data: SimpleSubmissionData,
  domain: string
): Record<string, unknown> {
  return {
    basicInfo: {
      title: `${domain} Experience Report`,
      eventDate: data.eventDate,
      eventLocation: data.eventLocation,
      summary: data.narrative,
    },
    witnesses: data.hasWitnesses
      ? [
          {
            identityType: 'anonymous',
            role: 'primary_direct',
            verificationStatus: 'claimed_only',
            count: data.witnessCount,
          },
        ]
      : [],
    evidence: data.evidenceTypes.map((type) => ({
      category: mapEvidenceType(type),
      daysFromEvent: null,
      isPrimarySource: true,
      independentlyVerified: false,
    })),
    submissionMode: 'simple',
    simpleScoreBreakdown: calculateSimpleScore(data),
  };
}

function mapEvidenceType(simpleType: string): string {
  const mapping: Record<string, string> = {
    photo: 'contemporary_photo_video',
    video: 'contemporary_photo_video',
    audio: 'later_testimony_video',
    document: 'other',
    physical: 'other',
    testimony: 'later_testimony_written',
    other: 'other',
  };
  return mapping[simpleType] || 'other';
}
