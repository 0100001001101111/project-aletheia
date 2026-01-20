/**
 * Anti-Gaming Utilities
 * Detect and prevent score manipulation through audit logging and drift detection
 */

import type { EvidenceItem } from '@/components/submission/EvidenceForm';
import type { Witness } from '@/components/submission/WitnessesForm';

/**
 * Gaming flag types and severities
 */
export type GamingFlagType = 'rigor_drift' | 'credential_inflation' | 'excessive_iteration';
export type FlagSeverity = 'low' | 'medium' | 'high';

export interface GamingFlag {
  type: GamingFlagType;
  reason: string;
  severity: FlagSeverity;
  details?: Record<string, unknown>;
}

export interface ScoreAuditEntry {
  draftId: string;
  userId: string | null;
  sessionId: string | null;
  timestamp: string;
  submissionHash: string;
  estimatedScore: number;
  tier: string;
  breakdown: {
    witnessCredibility: number;
    documentationTiming: number;
    evidenceQuality: number;
    corroboration: number;
    verifiability: number;
  };
  witnessCount: number;
  evidenceCount: number;
  changesFromPrevious: ChangeRecord[];
  flags: GamingFlag[];
}

export interface ChangeRecord {
  field: string;
  action: 'added' | 'removed' | 'modified';
  previous?: unknown;
  current?: unknown;
}

/**
 * Hash submission state for change detection
 */
export function hashSubmissionState(
  witnesses: Witness[],
  evidence: EvidenceItem[]
): string {
  const state = {
    witnesses: witnesses.map(w => ({
      identityType: w.identityType,
      role: w.role,
      verificationStatus: w.verificationStatus,
      willingToTestify: w.willingToTestify,
      willingPolygraph: w.willingPolygraph,
      blindAudit: w.blindAudit,
    })),
    evidence: evidence.map(e => ({
      category: e.category,
      daysFromEvent: e.daysFromEvent,
      isPrimarySource: e.isPrimarySource,
      independentlyVerified: e.independentlyVerified,
    })),
  };

  // Simple hash using JSON stringify
  const str = JSON.stringify(state);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash.toString(16);
}

/**
 * Detect changes between two submission states
 */
export function detectChanges(
  previousWitnesses: Witness[],
  previousEvidence: EvidenceItem[],
  currentWitnesses: Witness[],
  currentEvidence: EvidenceItem[]
): ChangeRecord[] {
  const changes: ChangeRecord[] = [];

  // Witness count changes
  if (previousWitnesses.length !== currentWitnesses.length) {
    changes.push({
      field: 'witnesses',
      action: currentWitnesses.length > previousWitnesses.length ? 'added' : 'removed',
      previous: previousWitnesses.length,
      current: currentWitnesses.length,
    });
  }

  // Evidence count changes
  if (previousEvidence.length !== currentEvidence.length) {
    changes.push({
      field: 'evidence',
      action: currentEvidence.length > previousEvidence.length ? 'added' : 'removed',
      previous: previousEvidence.length,
      current: currentEvidence.length,
    });
  }

  // Witness field changes (compare by index for simplicity)
  const witnessLimit = Math.min(previousWitnesses.length, currentWitnesses.length);
  for (let i = 0; i < witnessLimit; i++) {
    const prev = previousWitnesses[i];
    const curr = currentWitnesses[i];

    if (prev.identityType !== curr.identityType) {
      changes.push({
        field: `witnesses[${i}].identityType`,
        action: 'modified',
        previous: prev.identityType,
        current: curr.identityType,
      });
    }

    if (prev.verificationStatus !== curr.verificationStatus) {
      changes.push({
        field: `witnesses[${i}].verificationStatus`,
        action: 'modified',
        previous: prev.verificationStatus,
        current: curr.verificationStatus,
      });
    }

    if (prev.willingToTestify !== curr.willingToTestify) {
      changes.push({
        field: `witnesses[${i}].willingToTestify`,
        action: 'modified',
        previous: prev.willingToTestify,
        current: curr.willingToTestify,
      });
    }

    if (prev.willingPolygraph !== curr.willingPolygraph) {
      changes.push({
        field: `witnesses[${i}].willingPolygraph`,
        action: 'modified',
        previous: prev.willingPolygraph,
        current: curr.willingPolygraph,
      });
    }
  }

  return changes;
}

/**
 * Detect credential upgrades (anonymous → professional without evidence)
 */
export function detectCredentialUpgrades(
  previousWitnesses: Witness[],
  currentWitnesses: Witness[]
): ChangeRecord[] {
  const upgrades: ChangeRecord[] = [];

  const professionalTypes = ['named_professional', 'named_official'];
  const nonProfessionalTypes = ['anonymous', 'named_civilian', 'pseudonymous'];

  // Compare by index
  const limit = Math.min(previousWitnesses.length, currentWitnesses.length);
  for (let i = 0; i < limit; i++) {
    const prev = previousWitnesses[i];
    const curr = currentWitnesses[i];

    // Check for identity type upgrade
    if (
      nonProfessionalTypes.includes(prev.identityType) &&
      professionalTypes.includes(curr.identityType)
    ) {
      upgrades.push({
        field: `witnesses[${i}].identityType`,
        action: 'modified',
        previous: prev.identityType,
        current: curr.identityType,
      });
    }

    // Check for verification status upgrade
    const verificationOrder = ['claimed_only', 'documentation_provided', 'independently_verified'];
    const prevIndex = verificationOrder.indexOf(prev.verificationStatus);
    const currIndex = verificationOrder.indexOf(curr.verificationStatus);

    if (currIndex > prevIndex) {
      upgrades.push({
        field: `witnesses[${i}].verificationStatus`,
        action: 'modified',
        previous: prev.verificationStatus,
        current: curr.verificationStatus,
      });
    }
  }

  return upgrades;
}

/**
 * Check for gaming patterns based on audit history
 */
export function checkForGaming(
  currentEntry: Omit<ScoreAuditEntry, 'flags'>,
  previousEntries: ScoreAuditEntry[]
): GamingFlag[] {
  const flags: GamingFlag[] = [];

  if (previousEntries.length < 1) {
    return flags; // Not enough history
  }

  const previous = previousEntries[0]; // Most recent

  // Flag: Score jumped 1.5+ points without new evidence
  const scoreDelta = currentEntry.estimatedScore - previous.estimatedScore;
  const evidenceDelta = currentEntry.evidenceCount - previous.evidenceCount;

  if (scoreDelta >= 1.5 && evidenceDelta === 0) {
    flags.push({
      type: 'rigor_drift',
      reason: 'Large score increase without new evidence',
      severity: 'medium',
      details: {
        scoreJump: scoreDelta,
        previousScore: previous.estimatedScore,
        currentScore: currentEntry.estimatedScore,
      },
    });
  }

  // Flag: Credential upgrades without verification docs
  const credentialUpgrades = currentEntry.changesFromPrevious.filter(
    c => c.field.includes('identityType') || c.field.includes('verificationStatus')
  );

  if (credentialUpgrades.length > 0 && evidenceDelta === 0) {
    flags.push({
      type: 'credential_inflation',
      reason: 'Witness credentials upgraded without supporting evidence',
      severity: 'high',
      details: {
        upgrades: credentialUpgrades,
      },
    });
  }

  // Flag: Excessive iteration (10+ estimates on single draft)
  if (previousEntries.length >= 9) {
    flags.push({
      type: 'excessive_iteration',
      reason: 'Unusually high number of score estimate requests',
      severity: 'low',
      details: {
        iterationCount: previousEntries.length + 1,
      },
    });
  }

  return flags;
}

/**
 * Validation errors for submission updates
 */
export interface ValidationError {
  field: string;
  error: string;
}

/**
 * Validate submission update to prevent credential inflation
 * Returns empty array if valid, otherwise returns list of errors
 */
export function validateSubmissionUpdate(
  originalWitnesses: Witness[],
  originalEvidence: EvidenceItem[],
  updatedWitnesses: Witness[],
  updatedEvidence: EvidenceItem[]
): ValidationError[] {
  const errors: ValidationError[] = [];

  const professionalTypes = ['named_professional', 'named_official'];
  const verificationOrder = ['claimed_only', 'documentation_provided', 'independently_verified'];

  // Check if new evidence was added
  const newEvidenceAdded = updatedEvidence.length > originalEvidence.length;

  // Compare witnesses by index
  const limit = Math.min(originalWitnesses.length, updatedWitnesses.length);

  for (let i = 0; i < limit; i++) {
    const orig = originalWitnesses[i];
    const upd = updatedWitnesses[i];

    // Cannot upgrade to professional without new evidence
    if (
      professionalTypes.includes(upd.identityType) &&
      !professionalTypes.includes(orig.identityType) &&
      !newEvidenceAdded
    ) {
      errors.push({
        field: `witnesses[${i}].identityType`,
        error: 'Cannot upgrade witness credentials without supporting evidence',
      });
    }

    // Cannot upgrade verification status without evidence
    const origVerifIndex = verificationOrder.indexOf(orig.verificationStatus);
    const updVerifIndex = verificationOrder.indexOf(upd.verificationStatus);

    if (updVerifIndex > origVerifIndex && !newEvidenceAdded) {
      errors.push({
        field: `witnesses[${i}].verificationStatus`,
        error: 'Upload credential documentation to change verification status',
      });
    }
  }

  return errors;
}

/**
 * Calculate a gaming risk score (0-100) based on patterns
 */
export function calculateGamingRisk(flags: GamingFlag[]): number {
  let risk = 0;

  for (const flag of flags) {
    switch (flag.severity) {
      case 'high':
        risk += 40;
        break;
      case 'medium':
        risk += 20;
        break;
      case 'low':
        risk += 10;
        break;
    }
  }

  return Math.min(100, risk);
}
