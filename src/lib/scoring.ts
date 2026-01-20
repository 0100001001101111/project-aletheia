/**
 * Scoring System for Aletheia Investigations
 *
 * Two approaches:
 * - Multiplicative (Ganzfeld, STARGATE): Critical failure = 0
 * - Weighted sum (UAP, NDE, Crisis, Geophysical): No single factor zeros out
 */

import type { InvestigationType } from '@/types/database';

// ====================================
// TYPE DEFINITIONS
// ====================================

export type IdentityType =
  | 'named_official'
  | 'named_professional'
  | 'named_public'
  | 'anonymous_verified'
  | 'anonymous';

export type WitnessRole =
  | 'primary_direct'
  | 'primary_indirect'
  | 'secondary'
  | 'corroborating';

export type VerificationStatus =
  | 'independently_verified'
  | 'documentation_provided'
  | 'claimed_only';

export type EvidenceCategory =
  | 'contemporary_official'
  | 'contemporary_news'
  | 'contemporary_photo_video'
  | 'foia_document'
  | 'academic_paper'
  | 'later_testimony_video'
  | 'later_testimony_written'
  | 'other';

export interface WitnessData {
  identityType: IdentityType;
  role: WitnessRole;
  verificationStatus: VerificationStatus;
  willingToTestify?: boolean;
  willingPolygraph?: boolean;
  blindAudit?: 'yes' | 'no' | 'unknown';
  professionalRisk?: boolean;
  consistentOverTime?: boolean;
  corroboratedByOthers?: boolean;
  physicalEvidenceSupports?: boolean;
}

export interface EvidenceData {
  category: EvidenceCategory;
  daysFromEvent: number | null;
  isPrimarySource?: boolean;
  independentlyVerified?: boolean;
}

export interface SubmissionData {
  witnesses: WitnessData[];
  evidence: EvidenceData[];
  eventDate: string;
  physicalEvidencePresent?: boolean;
}

export interface Bonus {
  reason: string;
  value: number;
}

export interface BonusNotApplied {
  reason: string;
  value: number;
  requirement: string;
}

export interface ScoreBreakdown {
  finalScore: number;
  tier: 'verified' | 'provisional' | 'rejected';
  breakdown: {
    witnessCredibility: number;
    documentationTiming: number;
    evidenceQuality: number;
    corroboration: number;
    verifiability: number;
  };
  rawBreakdown: {
    witnessCredibility: number;
    documentationTiming: number;
    evidenceQuality: number;
    corroboration: number;
    verifiability: number;
  };
  bonusesApplied: Bonus[];
  bonusesNotApplied: BonusNotApplied[];
}

// ====================================
// WEIGHT CONSTANTS
// ====================================

const IDENTITY_WEIGHTS: Record<IdentityType, number> = {
  named_official: 0.30,
  named_professional: 0.25,
  named_public: 0.20,
  anonymous_verified: 0.15,
  anonymous: 0.05,
};

const ROLE_WEIGHTS: Record<WitnessRole, number> = {
  primary_direct: 0.20,
  primary_indirect: 0.12,
  secondary: 0.08,
  corroborating: 0.05,
};

const VERIFICATION_WEIGHTS: Record<VerificationStatus, number> = {
  independently_verified: 0.25,
  documentation_provided: 0.15,
  claimed_only: 0.05,
};

const EVIDENCE_CATEGORY_WEIGHTS: Record<EvidenceCategory, number> = {
  contemporary_official: 1.0,
  contemporary_news: 0.95,
  contemporary_photo_video: 0.90,
  foia_document: 0.80,
  academic_paper: 0.75,
  later_testimony_video: 0.60,
  later_testimony_written: 0.50,
  other: 0.30,
};

// Component weights for final score calculation
const COMPONENT_WEIGHTS = {
  witnessCredibility: 0.30,
  documentationTiming: 0.25,
  evidenceQuality: 0.20,
  corroboration: 0.15,
  verifiability: 0.10,
};

// ====================================
// WITNESS CREDIBILITY SCORING
// ====================================

/**
 * Calculate credibility score for a single witness
 * Returns 0.0 to 1.0
 */
function calculateSingleWitnessScore(witness: WitnessData): number {
  let score = 0.0;

  // Identity type (max 0.30)
  score += IDENTITY_WEIGHTS[witness.identityType] || 0.05;

  // Role (max 0.20)
  score += ROLE_WEIGHTS[witness.role] || 0.05;

  // Verification status - CRITICAL DISTINCTION (max 0.25)
  score += VERIFICATION_WEIGHTS[witness.verificationStatus] || 0.05;

  // Verification willingness (max 0.10)
  if (witness.willingToTestify) score += 0.05;
  if (witness.willingPolygraph) score += 0.03;
  if (witness.blindAudit === 'yes') score += 0.02;

  // Credibility factors (max 0.15)
  if (witness.professionalRisk) score += 0.05;
  if (witness.consistentOverTime) score += 0.03;
  if (witness.corroboratedByOthers) score += 0.04;
  if (witness.physicalEvidenceSupports) score += 0.03;

  return Math.min(score, 1.0);
}

/**
 * Calculate aggregate witness credibility score
 * Weighted toward best witnesses, bonus for multiple
 */
export function calculateWitnessCredibility(witnesses: WitnessData[]): number {
  if (!witnesses || witnesses.length === 0) {
    return 0.0;
  }

  // Score each witness and sort descending
  const scores = witnesses.map(calculateSingleWitnessScore).sort((a, b) => b - a);

  if (scores.length === 1) {
    return scores[0];
  } else if (scores.length === 2) {
    return scores[0] * 0.7 + scores[1] * 0.3;
  } else {
    // Top 3 weighted, diminishing returns after
    const aggregate = scores[0] * 0.5 + scores[1] * 0.3 + scores[2] * 0.2;
    // Small bonus for additional witnesses (max +0.1)
    const additionalBonus = Math.min((scores.length - 3) * 0.02, 0.1);
    return Math.min(aggregate + additionalBonus, 1.0);
  }
}

// ====================================
// DOCUMENTATION TIMING SCORING
// ====================================

/**
 * Calculate timing score based on days from event to first substantial documentation
 * Sliding scale - NOT binary pass/fail
 */
export function calculateDocumentationTiming(evidence: EvidenceData[]): number {
  if (!evidence || evidence.length === 0) {
    return 0.1; // Testimony-only baseline
  }

  // Find earliest substantial documentation
  let earliestDays = Infinity;

  for (const item of evidence) {
    if (item.daysFromEvent !== null && item.daysFromEvent >= 0) {
      const weight = EVIDENCE_CATEGORY_WEIGHTS[item.category] || 0.3;
      // Only count if weight is decent (substantial evidence)
      if (weight >= 0.6) {
        earliestDays = Math.min(earliestDays, item.daysFromEvent);
      }
    }
  }

  if (earliestDays === Infinity) {
    return 0.2; // No dated substantial evidence
  }

  // Sliding scale
  if (earliestDays <= 1) return 1.0;      // Same/next day
  if (earliestDays <= 7) return 0.9;      // Within week
  if (earliestDays <= 30) return 0.8;     // Within month
  if (earliestDays <= 365) return 0.6;    // Within year
  if (earliestDays <= 365 * 5) return 0.4;  // Within 5 years
  if (earliestDays <= 365 * 10) return 0.3; // Within 10 years
  if (earliestDays <= 365 * 30) return 0.2; // Within 30 years
  return 0.15; // Historical (30+ years)
}

// ====================================
// EVIDENCE QUALITY SCORING
// ====================================

/**
 * Calculate evidence quality score based on category weights
 */
export function calculateEvidenceQuality(evidence: EvidenceData[]): number {
  if (!evidence || evidence.length === 0) {
    return 0.0;
  }

  // Calculate weighted average
  const totalWeight = evidence.reduce((sum, item) => {
    const categoryWeight = EVIDENCE_CATEGORY_WEIGHTS[item.category] || 0.3;
    // Bonus for primary sources and verified evidence
    let itemWeight = categoryWeight;
    if (item.isPrimarySource) itemWeight = Math.min(itemWeight + 0.1, 1.0);
    if (item.independentlyVerified) itemWeight = Math.min(itemWeight + 0.1, 1.0);
    return sum + itemWeight;
  }, 0);

  const avgWeight = totalWeight / evidence.length;

  // Scale: average of 0.5 = 0.5 score, average of 1.0 = 1.0 score
  // Small bonus for multiple pieces of evidence (max +0.1)
  const quantityBonus = Math.min((evidence.length - 1) * 0.02, 0.1);

  return Math.min(avgWeight + quantityBonus, 1.0);
}

// ====================================
// CORROBORATION SCORING
// ====================================

/**
 * Calculate corroboration score based on number and quality of witnesses
 */
export function calculateCorroboration(witnesses: WitnessData[]): number {
  if (!witnesses || witnesses.length === 0) {
    return 0.0;
  }

  const directWitnesses = witnesses.filter(w => w.role === 'primary_direct').length;
  const corroboratingWitnesses = witnesses.filter(w => w.role === 'corroborating').length;

  // Base score from direct witnesses
  let score = 0.0;
  if (directWitnesses >= 6) score = 1.0;
  else if (directWitnesses >= 4) score = 0.85;
  else if (directWitnesses >= 3) score = 0.7;
  else if (directWitnesses >= 2) score = 0.5;
  else if (directWitnesses >= 1) score = 0.3;

  // Bonus for corroborating witnesses (max +0.2)
  const corroborationBonus = Math.min(corroboratingWitnesses * 0.1, 0.2);

  return Math.min(score + corroborationBonus, 1.0);
}

// ====================================
// VERIFIABILITY SCORING
// ====================================

/**
 * Calculate verifiability score based on what can be independently verified
 */
export function calculateVerifiability(
  witnesses: WitnessData[],
  evidence: EvidenceData[]
): number {
  let score = 0.0;

  // Verified witnesses contribution (max 0.5)
  const verifiedWitnesses = witnesses.filter(
    w => w.verificationStatus === 'independently_verified'
  ).length;
  if (verifiedWitnesses >= 3) score += 0.5;
  else if (verifiedWitnesses >= 2) score += 0.4;
  else if (verifiedWitnesses >= 1) score += 0.25;
  else if (witnesses.some(w => w.verificationStatus === 'documentation_provided')) {
    score += 0.15;
  }

  // Verified evidence contribution (max 0.5)
  const verifiedEvidence = evidence.filter(e => e.independentlyVerified).length;
  const officialDocs = evidence.filter(
    e => e.category === 'contemporary_official' || e.category === 'foia_document'
  ).length;

  if (verifiedEvidence >= 3 || officialDocs >= 2) score += 0.5;
  else if (verifiedEvidence >= 2 || officialDocs >= 1) score += 0.35;
  else if (verifiedEvidence >= 1) score += 0.2;
  else if (evidence.some(e => e.isPrimarySource)) score += 0.1;

  return Math.min(score, 1.0);
}

// ====================================
// BONUS SYSTEM
// ====================================

/**
 * Calculate applicable bonuses based on submission data
 * Also returns bonuses that COULD apply but don't (for improvement suggestions)
 */
export function calculateBonuses(submission: SubmissionData): {
  applied: Bonus[];
  notApplied: BonusNotApplied[];
} {
  const applied: Bonus[] = [];
  const notApplied: BonusNotApplied[] = [];

  // Count verified professionals
  const verifiedProfessionals = submission.witnesses.filter(
    w =>
      (w.identityType === 'named_professional' || w.identityType === 'named_official') &&
      w.verificationStatus === 'independently_verified'
  ).length;

  const claimedProfessionals = submission.witnesses.filter(
    w =>
      (w.identityType === 'named_professional' || w.identityType === 'named_official') &&
      w.verificationStatus !== 'independently_verified'
  ).length;

  // Professional witness bonuses
  if (verifiedProfessionals >= 3) {
    applied.push({
      reason: '3+ independently verified professional witnesses',
      value: 1.0,
    });
  } else if (verifiedProfessionals >= 2) {
    applied.push({
      reason: '2 independently verified professional witnesses',
      value: 0.5,
    });
    if (claimedProfessionals >= 1) {
      notApplied.push({
        reason: '3+ verified professional witnesses',
        value: 1.0,
        requirement: `Verify ${claimedProfessionals} more professional credential(s)`,
      });
    }
  } else if (verifiedProfessionals === 1) {
    notApplied.push({
      reason: '2+ verified professional witnesses',
      value: 0.5,
      requirement: 'Need 1 more verified professional witness',
    });
  } else if (claimedProfessionals >= 2) {
    notApplied.push({
      reason: '2+ verified professional witnesses',
      value: 0.5,
      requirement: `Verify ${claimedProfessionals} claimed professional credential(s)`,
    });
  }

  // FOIA document bonus
  const hasFoia = submission.evidence.some(e => e.category === 'foia_document');
  if (hasFoia) {
    applied.push({
      reason: 'Official FOIA document included',
      value: 0.2,
    });
  }

  // Physical evidence bonus
  if (submission.physicalEvidencePresent) {
    applied.push({
      reason: 'Physical evidence documented',
      value: 0.5,
    });
  }

  // Contemporary official documentation bonus
  const hasContemporaryOfficial = submission.evidence.some(
    e => e.category === 'contemporary_official' &&
         e.daysFromEvent !== null &&
         e.daysFromEvent <= 7
  );
  if (hasContemporaryOfficial) {
    applied.push({
      reason: 'Official documentation within 7 days of event',
      value: 0.3,
    });
  } else {
    const hasAnyOfficial = submission.evidence.some(
      e => e.category === 'contemporary_official'
    );
    if (!hasAnyOfficial) {
      notApplied.push({
        reason: 'Contemporary official documentation',
        value: 0.3,
        requirement: 'Add police report, military record, or other official document from within 7 days',
      });
    }
  }

  // Blind audit bonus
  const blindAuditedCount = submission.witnesses.filter(
    w => w.blindAudit === 'yes'
  ).length;
  if (blindAuditedCount >= 2) {
    applied.push({
      reason: 'Multiple witnesses gave isolated testimony',
      value: 0.2,
    });
  } else if (blindAuditedCount === 1) {
    notApplied.push({
      reason: 'Multiple blind-audited witnesses',
      value: 0.2,
      requirement: 'Confirm 1 more witness was isolated before testimony',
    });
  } else if (submission.witnesses.length >= 2) {
    notApplied.push({
      reason: 'Blind-audited witnesses',
      value: 0.2,
      requirement: 'Confirm witnesses were isolated from each other before testimony',
    });
  }

  return { applied, notApplied };
}

// ====================================
// MAIN SCORING FUNCTION
// ====================================

/**
 * Calculate the complete UAP/Encounter score
 * Uses weighted sum approach (not multiplicative)
 */
export function calculateUAPScore(submission: SubmissionData): ScoreBreakdown {
  // Calculate component scores (each 0.0 to 1.0)
  const rawBreakdown = {
    witnessCredibility: calculateWitnessCredibility(submission.witnesses),
    documentationTiming: calculateDocumentationTiming(submission.evidence),
    evidenceQuality: calculateEvidenceQuality(submission.evidence),
    corroboration: calculateCorroboration(submission.witnesses),
    verifiability: calculateVerifiability(submission.witnesses, submission.evidence),
  };

  // Calculate weighted base score (0-10)
  const baseScore = (
    rawBreakdown.witnessCredibility * COMPONENT_WEIGHTS.witnessCredibility +
    rawBreakdown.documentationTiming * COMPONENT_WEIGHTS.documentationTiming +
    rawBreakdown.evidenceQuality * COMPONENT_WEIGHTS.evidenceQuality +
    rawBreakdown.corroboration * COMPONENT_WEIGHTS.corroboration +
    rawBreakdown.verifiability * COMPONENT_WEIGHTS.verifiability
  ) * 10;

  // Calculate bonuses
  const { applied: bonusesApplied, notApplied: bonusesNotApplied } = calculateBonuses(submission);
  const bonusTotal = bonusesApplied.reduce((sum, b) => sum + b.value, 0);

  // Final score (capped at 10)
  const finalScore = Math.min(baseScore + bonusTotal, 10.0);

  // Determine tier
  let tier: 'verified' | 'provisional' | 'rejected';
  if (finalScore >= 8.0) {
    tier = 'verified';
  } else if (finalScore >= 4.0) {
    tier = 'provisional';
  } else {
    tier = 'rejected';
  }

  // Scale raw breakdown to match display (out of 2.0 each for 5 components)
  const breakdown = {
    witnessCredibility: rawBreakdown.witnessCredibility * 2,
    documentationTiming: rawBreakdown.documentationTiming * 2,
    evidenceQuality: rawBreakdown.evidenceQuality * 2,
    corroboration: rawBreakdown.corroboration * 2,
    verifiability: rawBreakdown.verifiability * 2,
  };

  return {
    finalScore,
    tier,
    breakdown,
    rawBreakdown,
    bonusesApplied,
    bonusesNotApplied,
  };
}

// ====================================
// DOMAIN-SPECIFIC SCORING ROUTER
// ====================================

/**
 * Route to appropriate scoring algorithm based on investigation type
 */
export function calculateScore(
  investigationType: InvestigationType,
  submission: SubmissionData
): ScoreBreakdown {
  switch (investigationType) {
    case 'ufo':
    case 'nde':
    case 'crisis_apparition':
    case 'geophysical':
      // Weighted sum approach
      return calculateUAPScore(submission);

    case 'ganzfeld':
    case 'stargate':
      // Multiplicative approach (TODO: implement separately)
      // For now, use weighted sum
      return calculateUAPScore(submission);

    default:
      return calculateUAPScore(submission);
  }
}

// ====================================
// IMPROVEMENT SUGGESTIONS
// ====================================

export interface ImprovementSuggestion {
  action: string;
  impact: number;
  difficulty: 'easy' | 'medium' | 'hard';
  category: 'witness' | 'evidence' | 'verification' | 'documentation';
}

/**
 * Generate actionable improvement suggestions based on score breakdown
 */
export function generateImprovementSuggestions(
  submission: SubmissionData,
  scoreBreakdown: ScoreBreakdown
): ImprovementSuggestion[] {
  const suggestions: ImprovementSuggestion[] = [];

  // Witness verification improvements
  const unverifiedProfessionals = submission.witnesses.filter(
    w =>
      (w.identityType === 'named_professional' || w.identityType === 'named_official') &&
      w.verificationStatus !== 'independently_verified'
  );

  unverifiedProfessionals.forEach(() => {
    suggestions.push({
      action: 'Verify professional witness credentials with third-party confirmation',
      impact: 0.3,
      difficulty: 'medium',
      category: 'verification',
    });
  });

  // Evidence improvements based on what's missing
  const hasContemporaryOfficial = submission.evidence.some(
    e => e.category === 'contemporary_official'
  );
  const hasContemporaryNews = submission.evidence.some(
    e => e.category === 'contemporary_news'
  );
  const hasFoia = submission.evidence.some(
    e => e.category === 'foia_document'
  );

  if (!hasContemporaryOfficial) {
    suggestions.push({
      action: 'Locate contemporary official documents (police reports, military records)',
      impact: 0.5,
      difficulty: 'hard',
      category: 'evidence',
    });
  }

  if (!hasContemporaryNews) {
    suggestions.push({
      action: 'Find contemporary news articles from within 7 days of event',
      impact: 0.3,
      difficulty: 'medium',
      category: 'evidence',
    });
  }

  if (!hasFoia) {
    suggestions.push({
      action: 'Submit FOIA request for government records',
      impact: 0.2,
      difficulty: 'hard',
      category: 'documentation',
    });
  }

  // Witness blind audit
  const witnessesWithoutBlindAudit = submission.witnesses.filter(
    w => w.blindAudit !== 'yes'
  );
  if (witnessesWithoutBlindAudit.length > 0 && submission.witnesses.length >= 2) {
    suggestions.push({
      action: 'Confirm witnesses were isolated before testimony (blind audit)',
      impact: 0.1,
      difficulty: 'easy',
      category: 'witness',
    });
  }

  // Evidence verification
  const unverifiedEvidence = submission.evidence.filter(
    e => !e.independentlyVerified
  );
  if (unverifiedEvidence.length > 0) {
    suggestions.push({
      action: 'Independently verify evidence sources',
      impact: Math.min(0.2 * unverifiedEvidence.length, 0.6),
      difficulty: 'medium',
      category: 'verification',
    });
  }

  // Add bonuses not applied as suggestions
  scoreBreakdown.bonusesNotApplied.forEach(bonus => {
    suggestions.push({
      action: bonus.requirement,
      impact: bonus.value,
      difficulty: bonus.value >= 0.5 ? 'hard' : bonus.value >= 0.2 ? 'medium' : 'easy',
      category: 'verification',
    });
  });

  // Sort by impact (highest first) and deduplicate
  const seen = new Set<string>();
  return suggestions
    .filter(s => {
      if (seen.has(s.action)) return false;
      seen.add(s.action);
      return true;
    })
    .sort((a, b) => b.impact - a.impact)
    .slice(0, 6);
}
