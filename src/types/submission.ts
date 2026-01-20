/**
 * Submission System Data Schemas
 * Comprehensive TypeScript types for the UAP investigation submission system
 */

// ============================================================================
// Core Types
// ============================================================================

export type UUID = string;

export type InvestigationType = 'uap_encounter' | 'ufo' | 'nde' | 'ganzfeld' | 'crisis_apparition' | 'stargate' | 'geophysical';

export type IdentityType =
  | 'named_public'
  | 'named_professional'
  | 'named_official'
  | 'named_civilian'
  | 'anonymous_verified'
  | 'anonymous'
  | 'pseudonymous';

export type WitnessRole =
  | 'primary_direct'
  | 'primary_indirect'
  | 'secondary'
  | 'corroborating';

export type VerificationStatus =
  | 'claimed_only'
  | 'documentation_provided'
  | 'independently_verified';

export type TestimonyFormat =
  | 'video'
  | 'audio'
  | 'written'
  | 'documentary'
  | 'in_person';

export type EvidenceType =
  | 'document'
  | 'image'
  | 'video'
  | 'audio'
  | 'url'
  | 'data_file';

export type EvidenceCategory =
  | 'contemporary_official'      // Police report, hospital record from event
  | 'contemporary_news'          // News article within 7 days
  | 'contemporary_photo_video'   // Photo/video from event period
  | 'later_testimony_video'      // Interview years later (video)
  | 'later_testimony_written'    // Interview years later (written)
  | 'documentary'                // Documentary footage
  | 'foia_document'              // Government FOIA response
  | 'academic_paper'             // Peer-reviewed analysis
  | 'book_account'               // Book chapter/account
  | 'other';

export type ScoreTier = 'verified' | 'provisional' | 'rejected';

// ============================================================================
// Location Types
// ============================================================================

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface Location {
  description: string;
  coordinates: Coordinates;
  country?: string;
  region?: string;
}

// ============================================================================
// Environmental Data Types (Auto-populated)
// ============================================================================

export interface GeologyData {
  bedrockType: string;
  piezoelectricContent: number;
  piezoelectricCategory: string;
  nearestFaultKm: number | null;
  faultName?: string;
  tectonicSetting?: string;
  source: string;
  error?: string;
}

export interface SeismicData {
  eventsBefore7Days: number;
  eventsAfter7Days: number;
  largestMagnitude: number | null;
  eventCount: number;
  radiusKm: number;
  minMagnitude: number;
  source: string;
  error?: string;
}

export interface GeomagneticData {
  kpIndex: number | null;
  kpCategory: 'quiet' | 'unsettled' | 'active' | 'minor_storm' | 'moderate_storm' | 'strong_storm' | 'unknown';
  solarWindSpeed: number | null;
  dstIndex: number | null;
  source: string;
  error?: string;
}

export interface AstronomicalData {
  localSiderealTime: string;
  lstDecimalHours: number;
  inLstWindow: boolean;
  lstWindowNote: string;
  source: string;
  error?: string;
}

export interface EnvironmentalData {
  autoPopulated: boolean;
  populatedAt: string;
  sources: string[];
  geology: GeologyData;
  seismic: SeismicData;
  geomagnetic: GeomagneticData;
  astronomical: AstronomicalData;
}

export interface EnvironmentalModifier {
  type: string;
  factor: string;
  value: number;
  reason: string;
}

// ============================================================================
// Encounter Types (UAP-specific)
// ============================================================================

export interface EncounterType {
  distantSighting: boolean;
  closeSighting: boolean;
  closeEncounter: boolean;
  directInteraction: boolean;
  abductionClaim: boolean;
}

export interface EntityPhysicalDescription {
  headShape?: string;
  eyeDescription?: string;
  skinDescription?: string;
  otherFeatures?: string;
}

export interface EntityBehavior {
  nonAggressive: boolean;
  appearedDistressed: boolean;
  communicationAttempt: boolean;
  aggressive: boolean;
  indifferent: boolean;
}

export interface EntityCommunicationType {
  verbal: boolean;
  telepathicEyeContact: boolean;
  gesture: boolean;
  none: boolean;
}

export interface EntityDetails {
  count: '1' | '2-5' | '6+' | 'unknown';
  heightEstimate?: string;
  physicalDescription: EntityPhysicalDescription;
  behavior: EntityBehavior;
  communicationType: EntityCommunicationType;
}

export interface WitnessPhysicalEffects {
  injuryIllness: boolean;
  temporaryParalysis: boolean;
  missingTime: boolean;
  psychologicalLongTerm: boolean;
  none: boolean;
}

export interface EnvironmentalEffects {
  emInterference: boolean;
  vehicleMalfunction: boolean;
  unusualOdor: boolean;
  temperatureAnomaly: boolean;
  groundTraces: boolean;
  none: boolean;
}

export interface PhysicalEffects {
  onWitnesses: WitnessPhysicalEffects;
  injuryDescription?: string;
  environmental: EnvironmentalEffects;
}

export interface AssociatedCraft {
  observed: 'yes_separate_witnesses' | 'yes_same_witnesses' | 'no' | 'unknown';
  description?: string;
}

export interface OfficialResponse {
  militaryPresence: boolean;
  areaCordoned: boolean;
  witnessesContacted: boolean;
  foiaRequested: boolean;
  foiaDenied: boolean;
}

// ============================================================================
// Witness Types
// ============================================================================

export interface CredibilityFactors {
  professionalRisk: boolean;      // Career on the line
  consistentOverTime: boolean;    // Story hasn't changed
  corroboratedByOthers: boolean;  // Others confirm details
  physicalEvidenceSupports: boolean;
}

export interface Witness {
  id: UUID;
  investigationId?: UUID;

  // Identity
  nameOrIdentifier: string;
  identityType: IdentityType;

  // Role
  role: WitnessRole;
  roleDescription?: string;

  // Credentials (if professional/official)
  profession?: string;
  affiliation?: string;
  yearsExperience?: number;

  // Verification - THE CRITICAL DISTINCTION
  verificationStatus: VerificationStatus;
  verificationEvidenceIds?: UUID[];  // Links to uploaded credential docs

  // Verification willingness
  willingToTestify: boolean;
  willingPolygraph: boolean;

  // Anti-coaching check
  blindAudit: boolean;  // Was witness isolated before testimony?
  blindAuditDetails?: string;

  // Testimony
  claimSummary?: string;
  testimonyDate?: string;
  testimonyFormat?: TestimonyFormat;
  testimonySource?: string;

  // Credibility factors
  credibilityFactors?: CredibilityFactors;

  // Calculated
  credibilityScore?: number;

  createdAt?: string;
  updatedAt?: string;
}

// ============================================================================
// Evidence Types
// ============================================================================

export interface Evidence {
  id: UUID;
  investigationId?: UUID;

  evidenceType: EvidenceType;
  category: EvidenceCategory;

  title: string;
  description?: string;

  // File or URL
  filePath?: string;
  url?: string;
  file?: File;  // For upload handling

  // Timing
  sourceDate?: string;
  daysFromEvent?: number;  // Auto-calculated

  // Attribution
  sourceAttribution?: string;

  // Quality markers
  independentlyVerified: boolean;
  isPrimarySource: boolean;

  // If this is credential evidence for a witness
  witnessId?: UUID;

  createdAt?: string;
}

// ============================================================================
// Score Types
// ============================================================================

export interface Bonus {
  reason: string;
  value: number;
  applied: boolean;
  requirement?: string;  // How to unlock if not applied
}

export interface ScoreBreakdown {
  id?: UUID;
  investigationId?: UUID;

  // Component scores (0.0 - 2.0 each, weighted differently)
  breakdown: {
    witnessCredibility: number;      // 30% weight
    documentationTiming: number;     // 25% weight
    evidenceQuality: number;         // 20% weight
    corroboration: number;           // 15% weight
    verifiability: number;           // 10% weight
  };

  // Environmental modifiers (auto-calculated)
  environmentalModifiers?: EnvironmentalModifier[];

  // Bonuses
  bonusesApplied: Bonus[];
  bonusesNotApplied: Bonus[];  // What they could get with more evidence

  // Final calculation
  baseScore: number;
  modifierTotal: number;
  bonusTotal: number;
  finalScore: number;
  tier: ScoreTier;

  // AI analysis (optional)
  aiVerdict?: string;
  aiImprovementSuggestions?: string[];
  aiRedFlags?: string[];

  calculatedAt?: string;
}

// ============================================================================
// Main Investigation Schema
// ============================================================================

export interface UAPEncounterSchema {
  id: UUID;
  userId?: UUID;
  investigationType: InvestigationType;
  title: string;
  eventDate: string;
  eventDateApproximate: boolean;

  location: Location;

  // Auto-populated, not user-editable
  environmentalData?: EnvironmentalData & {
    environmentalModifiers: EnvironmentalModifier[];
  };

  summary: string;

  // UAP-specific fields
  encounterType: EncounterType;
  entityObserved: boolean;
  entityDetails?: EntityDetails;
  physicalEffects: PhysicalEffects;
  associatedCraft: AssociatedCraft;
  officialResponse: OfficialResponse;

  // Related records
  witnesses: Witness[];
  evidence: Evidence[];
  scoreBreakdown?: ScoreBreakdown;

  // Pattern matching results
  patternMatches?: PatternMatch[];

  // Metadata
  triageScore?: number;
  triageStatus?: ScoreTier;
  createdAt?: string;
  updatedAt?: string;
}

export interface PatternMatch {
  id: UUID;
  patternId: UUID;
  patternName: string;
  matchStrength: number;
  matchingFields: string[];
  description?: string;
}

// ============================================================================
// Draft Schema (for save/resume)
// ============================================================================

export interface SubmissionDraft {
  id: UUID;
  userId: UUID | null;
  sessionId: string | null;
  status: 'in_progress' | 'submitted' | 'abandoned';

  currentStep: number;
  investigationType: InvestigationType | null;
  domainAiSuggestion: InvestigationType | null;

  // Basic info
  title: string | null;
  eventDate: string | null;
  eventDateApproximate: boolean;
  eventLocation: string | null;
  latitude: number | null;
  longitude: number | null;
  summary: string | null;

  // Related data
  witnesses: Witness[];
  domainData: Partial<UAPDomainData>;
  evidence: Omit<Evidence, 'file'>[];
  environmentalData?: EnvironmentalData;

  // Score tracking
  lastScoreEstimate: number | null;
  lastScoreCalculatedAt: string | null;

  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Domain-Specific Data (UAP)
// ============================================================================

export interface UAPDomainData {
  encounterType: EncounterType;
  entityObserved: boolean;
  entityDetails?: EntityDetails;
  physicalEffects: PhysicalEffects;
  associatedCraft: AssociatedCraft;
  officialResponse: OfficialResponse;
}

// ============================================================================
// Submission Request/Response Types
// ============================================================================

export interface SubmissionRequest {
  draftId?: UUID;
  investigationType: InvestigationType;
  basicInfo: {
    title: string;
    eventDate: string;
    eventDateApproximate: boolean;
    eventLocation: string;
    latitude: number;
    longitude: number;
    summary: string;
  };
  witnesses: Witness[];
  domainData: UAPDomainData;
  evidence: Omit<Evidence, 'file'>[];
  environmentalData?: EnvironmentalData;
}

export interface SubmissionResponse {
  id: UUID;
  estimatedScore: number;
  tier: ScoreTier;
  scoreBreakdown?: ScoreBreakdown;
}

// ============================================================================
// Score Audit Types
// ============================================================================

export interface ScoreAuditEntry {
  id: UUID;
  draftId: UUID;
  userId: UUID | null;
  sessionId: string | null;

  submissionHash: string;
  estimatedScore: number;
  tier: ScoreTier;
  breakdown: ScoreBreakdown['breakdown'];

  witnessCount: number;
  evidenceCount: number;
  changesFromPrevious: ChangeRecord[];
  flags: GamingFlag[];
  gamingRiskScore: number;

  submissionState?: {
    witnesses: Witness[];
    evidence: Omit<Evidence, 'file'>[];
  };

  createdAt: string;
}

export interface ChangeRecord {
  field: string;
  action: 'added' | 'removed' | 'modified';
  previous?: unknown;
  current?: unknown;
}

export type GamingFlagType = 'rigor_drift' | 'credential_inflation' | 'excessive_iteration';
export type FlagSeverity = 'low' | 'medium' | 'high';

export interface GamingFlag {
  type: GamingFlagType;
  reason: string;
  severity: FlagSeverity;
  details?: Record<string, unknown>;
}
