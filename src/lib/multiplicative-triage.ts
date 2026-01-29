/**
 * Multiplicative Triage Scoring
 * Critical failure = 0 score (auto-reject with remediation guidance)
 *
 * Formula: score = sourceIntegrity × methodology × dataQuality × confoundControl × 10
 *
 * Each factor ranges from 0.0 to 1.0:
 * - 1.0 = Verified/High quality
 * - 0.5 = Present but limited
 * - 0.0 = FATAL (missing/unacceptable)
 *
 * Any factor = 0 → Auto-reject
 */

import type { InvestigationType } from '@/types/database';

export interface MultiplicativeFactor {
  value: number; // 0.0, 0.5, or 1.0
  level: 'high' | 'medium' | 'fatal';
  reason: string;
  remediation?: string;
}

export interface MultiplicativeBreakdown {
  sourceIntegrity: MultiplicativeFactor;
  methodology: MultiplicativeFactor;
  dataQuality: MultiplicativeFactor;
  confoundControl: MultiplicativeFactor;
  finalScore: number;
  hasFatalFactor: boolean;
  fatalFactorName: string | null;
  tier: 'verified' | 'provisional' | 'pending' | 'rejected';
  formula: string;
  recommendations: string[];
}

type TriageData = Record<string, unknown>;

/**
 * Calculate multiplicative triage score
 */
export function calculateMultiplicativeScore(
  data: TriageData,
  schemaType: InvestigationType
): MultiplicativeBreakdown {
  const sourceIntegrity = evaluateSourceIntegrity(data, schemaType);
  const methodology = evaluateMethodology(data, schemaType);
  const dataQuality = evaluateDataQuality(data, schemaType);
  const confoundControl = evaluateConfoundControl(data, schemaType);

  // Calculate product
  const product =
    sourceIntegrity.value *
    methodology.value *
    dataQuality.value *
    confoundControl.value;

  const finalScore = product * 10;

  // Check for fatal factors
  const factors = [
    { name: 'Source Integrity', factor: sourceIntegrity },
    { name: 'Methodology', factor: methodology },
    { name: 'Data Quality', factor: dataQuality },
    { name: 'Confound Control', factor: confoundControl },
  ];

  const fatalFactor = factors.find((f) => f.factor.value === 0);
  const hasFatalFactor = !!fatalFactor;

  // Determine tier
  let tier: 'verified' | 'provisional' | 'pending' | 'rejected';
  if (hasFatalFactor) {
    tier = 'rejected';
  } else if (finalScore >= 8.0) {
    tier = 'verified';
  } else if (finalScore >= 4.0) {
    tier = 'provisional';
  } else {
    tier = 'pending';
  }

  // Build formula display
  const formula = `${sourceIntegrity.value} × ${methodology.value} × ${dataQuality.value} × ${confoundControl.value} × 10 = ${finalScore.toFixed(1)}`;

  // Generate recommendations
  const recommendations: string[] = [];
  if (hasFatalFactor) {
    recommendations.push(`CRITICAL: ${fatalFactor!.factor.remediation || 'Address fatal quality issue'}`);
  }
  for (const { factor } of factors) {
    if (factor.level === 'medium' && factor.remediation) {
      recommendations.push(factor.remediation);
    }
  }

  return {
    sourceIntegrity,
    methodology,
    dataQuality,
    confoundControl,
    finalScore,
    hasFatalFactor,
    fatalFactorName: fatalFactor?.name || null,
    tier,
    formula,
    recommendations,
  };
}

/**
 * Evaluate source integrity
 * 1.0 = Verified sources (independently confirmed)
 * 0.5 = Named sources (not independently verified)
 * 0.0 = FATAL - No identifiable source
 */
function evaluateSourceIntegrity(data: TriageData, schemaType: InvestigationType): MultiplicativeFactor {
  const witnesses = getNestedArray(data, 'witnesses');
  const rawData = data.raw_data as TriageData | undefined;

  // Check for verified witnesses
  const hasVerifiedSource = witnesses.some(
    (w) =>
      w.verificationStatus === 'independently_verified' ||
      w.identityType === 'named_official' ||
      w.identityType === 'named_professional'
  );

  // Check for any named source
  const hasNamedSource = witnesses.some(
    (w) =>
      w.identityType !== 'anonymous' &&
      w.identityType !== 'anonymous_unverified'
  );

  // Check domain-specific sources
  const hasOfficialSource = checkOfficialSource(data, rawData, schemaType);

  if (hasVerifiedSource || hasOfficialSource) {
    return {
      value: 1.0,
      level: 'high',
      reason: 'Verified source(s) present',
    };
  }

  if (hasNamedSource || witnesses.length > 0) {
    return {
      value: 0.5,
      level: 'medium',
      reason: 'Named sources but not independently verified',
      remediation: 'Provide independent verification of source credentials',
    };
  }

  return {
    value: 0.0,
    level: 'fatal',
    reason: 'NO SOURCE: Cannot verify any originating source',
    remediation: 'Add at least one identifiable witness or source document',
  };
}

/**
 * Evaluate methodology
 * 1.0 = Pre-registered or written methodology
 * 0.5 = Retrospective written account
 * 0.0 = FATAL - No methodology/protocol documented
 */
function evaluateMethodology(data: TriageData, schemaType: InvestigationType): MultiplicativeFactor {
  const rawData = data.raw_data as TriageData | undefined;

  // Check for pre-registration (highest)
  const hasPreregistration =
    getNestedValue(data, 'preregistration_url') ||
    getNestedValue(rawData, 'preregistration_url') ||
    getNestedValue(rawData, 'protocol.pre_registered');

  // Check for protocol documentation
  const hasProtocol =
    getNestedValue(rawData, 'protocol') ||
    getNestedValue(rawData, 'methodology') ||
    getNestedValue(rawData, 'protocol.blind_level') ||
    getNestedValue(rawData, 'protocol.double_blind');

  // Check for detailed narrative
  const hasDetailedNarrative =
    (getNestedValue(data, 'raw_narrative') as string)?.length > 100 ||
    (getNestedValue(rawData, 'basicInfo.summary') as string)?.length > 100;

  // Domain-specific checks
  if (schemaType === 'ganzfeld' || schemaType === 'stargate') {
    // Experimental protocols are critical
    if (hasPreregistration) {
      return {
        value: 1.0,
        level: 'high',
        reason: 'Pre-registered experimental protocol',
      };
    }
    if (hasProtocol) {
      return {
        value: 0.5,
        level: 'medium',
        reason: 'Protocol documented but not pre-registered',
        remediation: 'Pre-register methodology before data collection',
      };
    }
    return {
      value: 0.0,
      level: 'fatal',
      reason: 'NO METHODOLOGY: Experimental protocol required but not documented',
      remediation: 'Document experimental protocol (blinding, controls, randomization)',
    };
  }

  // For observational domains (NDE, UFO, Crisis Apparition)
  if (hasPreregistration) {
    return {
      value: 1.0,
      level: 'high',
      reason: 'Pre-registered observation protocol',
    };
  }

  if (hasProtocol || hasDetailedNarrative) {
    return {
      value: 0.5,
      level: 'medium',
      reason: 'Written account provided',
      remediation: 'Add structured observation methodology for higher score',
    };
  }

  return {
    value: 0.0,
    level: 'fatal',
    reason: 'NO METHODOLOGY: No written account or protocol',
    remediation: 'Provide detailed written description of observation method',
  };
}

/**
 * Evaluate data quality
 * 1.0 = Raw data available (transcripts, measurements, recordings)
 * 0.5 = Narrative description only
 * 0.0 = FATAL - No data provided
 */
function evaluateDataQuality(data: TriageData, schemaType: InvestigationType): MultiplicativeFactor {
  const rawData = data.raw_data as TriageData | undefined;
  const evidence = getNestedArray(rawData, 'evidence');

  // Check for raw data
  const hasRawData =
    getNestedValue(rawData, 'mentation_transcript') || // Ganzfeld
    getNestedValue(rawData, 'session_transcript') || // STARGATE
    getNestedValue(rawData, 'readings') || // Geophysical
    getNestedValue(rawData, 'raw_data_file') ||
    evidence.some((e) => e.category === 'contemporary_official' || e.category === 'foia_document');

  // Check for structured data
  const hasStructuredData =
    evidence.length > 0 ||
    getNestedValue(rawData, 'domainData') ||
    getNestedValue(rawData, 'results');

  // Check for narrative
  const hasNarrative =
    (getNestedValue(data, 'raw_narrative') as string)?.length > 20 ||
    (getNestedValue(rawData, 'basicInfo.summary') as string)?.length > 20 ||
    (getNestedValue(data, 'description') as string)?.length > 20;

  if (hasRawData) {
    return {
      value: 1.0,
      level: 'high',
      reason: 'Raw data/transcripts available',
    };
  }

  if (hasStructuredData || hasNarrative) {
    return {
      value: 0.5,
      level: 'medium',
      reason: 'Narrative or structured data provided',
      remediation: 'Include raw data (transcripts, recordings, measurements) for higher quality',
    };
  }

  return {
    value: 0.0,
    level: 'fatal',
    reason: 'NO DATA: No narrative, evidence, or structured data',
    remediation: 'Provide at minimum a detailed written description of the event',
  };
}

/**
 * Evaluate confound control
 * 1.0 = Alternative explanations ruled out
 * 0.5 = Confounds considered but not ruled out
 * 0.0 = FATAL - High-probability conventional explanation
 */
function evaluateConfoundControl(data: TriageData, schemaType: InvestigationType): MultiplicativeFactor {
  const rawData = data.raw_data as TriageData | undefined;

  // Domain-specific confound evaluation
  switch (schemaType) {
    case 'ufo': {
      const confounds = getNestedValue(rawData, 'confounds') as TriageData | undefined;
      const militaryNearby = (confounds?.military_base_nearby_km as number) ?? Infinity;
      const airportNearby = (confounds?.airport_nearby_km as number) ?? Infinity;

      // Fatal: Very close to airport/military base
      if (militaryNearby < 5 || airportNearby < 5) {
        return {
          value: 0.0,
          level: 'fatal',
          reason: 'HIGH CONFOUND: Within 5km of military base or airport',
          remediation: 'Document why conventional aircraft/military activity ruled out',
        };
      }

      // Medium: Somewhat close
      if (militaryNearby < 30 || airportNearby < 30) {
        return {
          value: 0.5,
          level: 'medium',
          reason: 'Near military/airport but not immediate proximity',
          remediation: 'Check flight logs and military activity for time of sighting',
        };
      }

      return {
        value: 1.0,
        level: 'high',
        reason: 'No obvious conventional explanations in proximity',
      };
    }

    case 'nde': {
      // Check for anoxia/drug confounds
      const medicalContext = getNestedValue(rawData, 'medical_context') as string | undefined;
      const hasVeridicality = getNestedValue(rawData, 'veridical_perception');

      if (hasVeridicality) {
        return {
          value: 1.0,
          level: 'high',
          reason: 'Veridical perception reported (harder to explain via confounds)',
        };
      }

      if (medicalContext) {
        return {
          value: 0.5,
          level: 'medium',
          reason: 'Medical context documented, confounds possible',
          remediation: 'Document why anoxia/drugs do not fully explain experience',
        };
      }

      return {
        value: 0.5,
        level: 'medium',
        reason: 'Standard confounds not explicitly ruled out',
        remediation: 'Provide medical records and rule out pharmacological explanations',
      };
    }

    case 'ganzfeld':
    case 'stargate': {
      // Check for sensory leakage
      const protocol = getNestedValue(rawData, 'protocol') as TriageData | undefined;
      const blindLevel = protocol?.blind_level || protocol?.double_blind;

      if (blindLevel === 'triple' || protocol?.double_blind === true) {
        return {
          value: 1.0,
          level: 'high',
          reason: 'Double/triple blind protocol - sensory leakage minimized',
        };
      }

      if (blindLevel) {
        return {
          value: 0.5,
          level: 'medium',
          reason: 'Some blinding but not rigorous',
          remediation: 'Implement double-blind protocol',
        };
      }

      return {
        value: 0.0,
        level: 'fatal',
        reason: 'NO BLINDING: Sensory leakage not controlled',
        remediation: 'Implement at minimum single-blind protocol',
      };
    }

    case 'crisis_apparition': {
      // Check for prior knowledge confound
      const knewIll = getNestedValue(rawData, 'knew_subject_was_ill_or_dying');

      if (knewIll === false) {
        return {
          value: 1.0,
          level: 'high',
          reason: 'Percipient did not know subject was in crisis',
        };
      }

      if (knewIll === true) {
        return {
          value: 0.5,
          level: 'medium',
          reason: 'Percipient knew subject was ill - expectation confound possible',
          remediation: 'Document specific unexpected details to strengthen case',
        };
      }

      return {
        value: 0.5,
        level: 'medium',
        reason: 'Prior knowledge status not documented',
        remediation: 'Document whether percipient knew of subject\'s condition beforehand',
      };
    }

    case 'geophysical': {
      const baseline = getNestedValue(rawData, 'baseline');
      const control = getNestedValue(rawData, 'protocol.control_location_used');

      if (baseline && control) {
        return {
          value: 1.0,
          level: 'high',
          reason: 'Baseline and control location established',
        };
      }

      if (baseline || control) {
        return {
          value: 0.5,
          level: 'medium',
          reason: 'Partial confound control',
          remediation: 'Add both baseline measurements and control location',
        };
      }

      return {
        value: 0.5,
        level: 'medium',
        reason: 'No baseline or control documented',
        remediation: 'Establish baseline measurements before anomaly detection',
      };
    }

    default:
      return {
        value: 0.5,
        level: 'medium',
        reason: 'Standard confound evaluation',
        remediation: 'Document ruled-out alternative explanations',
      };
  }
}

// Helper to check for official sources (FOIA, military, govt)
function checkOfficialSource(
  data: TriageData,
  rawData: TriageData | undefined,
  _schemaType: InvestigationType
): boolean {
  const evidence = getNestedArray(rawData, 'evidence');
  return evidence.some(
    (e) =>
      e.category === 'contemporary_official' ||
      e.category === 'foia_document' ||
      e.category === 'academic_paper'
  );
}

// Helper to get nested array
function getNestedArray(obj: TriageData | undefined, path: string): TriageData[] {
  if (!obj) return [];
  const value = getNestedValue(obj, path);
  return Array.isArray(value) ? value : [];
}

// Helper to get nested value
function getNestedValue(obj: TriageData | undefined, path: string): unknown {
  if (!obj) return undefined;
  const parts = path.split('.');
  let current: unknown = obj;

  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    if (typeof current !== 'object') return undefined;
    current = (current as TriageData)[part];
  }

  return current;
}

/**
 * Get CSS classes for factor display
 */
export function getFactorColor(level: MultiplicativeFactor['level']): string {
  switch (level) {
    case 'high':
      return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
    case 'medium':
      return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
    case 'fatal':
      return 'text-red-400 bg-red-500/10 border-red-500/30';
    default:
      return 'text-zinc-400 bg-zinc-500/10 border-zinc-500/30';
  }
}

/**
 * Get badge label for factor value
 */
export function getFactorLabel(value: number): string {
  if (value === 1.0) return 'HIGH';
  if (value === 0.5) return 'MEDIUM';
  if (value === 0.0) return 'FATAL';
  return 'UNKNOWN';
}
