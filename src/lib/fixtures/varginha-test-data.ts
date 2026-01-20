/**
 * Varginha Case Test Data
 * Example submission for testing the scoring system
 *
 * This represents the famous 1996 Varginha, Brazil incident with:
 * - 3 witnesses including a medical professional
 * - Documentary and FOIA evidence
 * - Environmental data with LST window correlation
 *
 * Expected final score: ~5.56 (Provisional)
 */

import type {
  UAPEncounterSchema,
  Witness,
  Evidence,
  EnvironmentalData,
  ScoreBreakdown,
} from '@/types/submission';

export const VARGINHA_WITNESSES: Witness[] = [
  {
    id: 'witness-1',
    nameOrIdentifier: 'Dr. Italo',
    identityType: 'named_professional',
    role: 'primary_direct',
    profession: 'Neurosurgeon',
    affiliation: 'Regional Hospital, Varginha',
    yearsExperience: 46,
    verificationStatus: 'claimed_only',
    willingToTestify: true,
    willingPolygraph: true,
    blindAudit: false,
    claimSummary: 'Claims face-to-face encounter with living entity in hospital ICU. Describes telepathic communication through eye contact.',
    testimonyDate: '2022-11-01',
    testimonyFormat: 'documentary',
    testimonySource: 'Moment of Contact (2022)',
    credibilityFactors: {
      professionalRisk: true,
      consistentOverTime: true,
      corroboratedByOthers: true,
      physicalEvidenceSupports: false,
    },
  },
  {
    id: 'witness-2',
    nameOrIdentifier: 'Liliane and Valquíria',
    identityType: 'named_public',
    role: 'primary_direct',
    verificationStatus: 'claimed_only',
    willingToTestify: true,
    willingPolygraph: false,
    blindAudit: false,
    claimSummary: 'Three young women who first reported seeing entity crouched by wall. Described strong ammonia smell.',
    testimonyDate: '1996-01-20',
    testimonyFormat: 'written',
    credibilityFactors: {
      professionalRisk: false,
      consistentOverTime: true,
      corroboratedByOthers: true,
      physicalEvidenceSupports: false,
    },
  },
  {
    id: 'witness-3',
    nameOrIdentifier: 'Marco Eli Chereze',
    identityType: 'named_official',
    role: 'primary_direct',
    profession: 'Military Police Officer',
    verificationStatus: 'documentation_provided',
    willingToTestify: false,
    willingPolygraph: false,
    blindAudit: false,
    claimSummary: 'Allegedly handled captured entity. Died of unknown infection weeks later. (Deceased - testimony through family)',
    testimonyFormat: 'documentary',
    credibilityFactors: {
      professionalRisk: true,
      consistentOverTime: false,
      corroboratedByOthers: true,
      physicalEvidenceSupports: true,
    },
  },
];

export const VARGINHA_EVIDENCE: Evidence[] = [
  {
    id: 'evidence-1',
    evidenceType: 'document',
    category: 'foia_document',
    title: 'CIA FOIA Denial Letter',
    description: 'CIA response to FOIA request stating records exist but are classified',
    sourceDate: '2025-01-01',
    sourceAttribution: 'CIA FOIA Office',
    daysFromEvent: 10603,
    independentlyVerified: true,
    isPrimarySource: true,
  },
  {
    id: 'evidence-2',
    evidenceType: 'video',
    category: 'documentary',
    title: 'Moment of Contact (2022)',
    description: "Feature documentary with witness interviews including Dr. Italo's first public testimony",
    url: 'https://momentofcontactfilm.com',
    sourceDate: '2022-10-18',
    sourceAttribution: 'James Fox / 1091 Pictures',
    daysFromEvent: 9768,
    independentlyVerified: false,
    isPrimarySource: true,
  },
  {
    id: 'evidence-3',
    evidenceType: 'document',
    category: 'book_account',
    title: 'UFO Crash in Brazil (1998)',
    description: 'First major investigation by Roger Leir',
    sourceDate: '1998-01-01',
    sourceAttribution: 'Roger K. Leir, D.P.M.',
    daysFromEvent: 712,
    independentlyVerified: false,
    isPrimarySource: false,
  },
];

export const VARGINHA_ENVIRONMENTAL: EnvironmentalData = {
  autoPopulated: true,
  populatedAt: '2026-01-17T14:30:00Z',
  sources: ['USGS Geology API', 'USGS Earthquake API', 'NOAA SWPC', 'Calculated'],
  geology: {
    bedrockType: 'Precambrian gneiss and granite',
    piezoelectricContent: 0.65,
    piezoelectricCategory: 'Medium',
    nearestFaultKm: 23.4,
    faultName: undefined,
    source: 'USGS',
  },
  seismic: {
    eventsBefore7Days: 0,
    eventsAfter7Days: 1,
    largestMagnitude: 2.1,
    eventCount: 1,
    radiusKm: 100,
    minMagnitude: 2.5,
    source: 'USGS Earthquake Catalog',
  },
  geomagnetic: {
    kpIndex: 3,
    kpCategory: 'unsettled',
    solarWindSpeed: null,
    dstIndex: null,
    source: 'NOAA SWPC',
  },
  astronomical: {
    localSiderealTime: '14:22',
    lstDecimalHours: 14.37,
    inLstWindow: true,
    lstWindowNote: 'Event occurred during 13:00-14:30 LST window (Spottiswoode/STARGATE correlation)',
    source: 'Calculated',
  },
};

export const VARGINHA_EXPECTED_SCORE: ScoreBreakdown = {
  breakdown: {
    witnessCredibility: 1.44, // 0.72 * 2.0 scale
    documentationTiming: 0.50, // 0.25 * 2.0 scale - heavily penalized due to 30-year gap
    evidenceQuality: 0.90, // 0.45 * 2.0 scale
    corroboration: 1.36, // 0.68 * 2.0 scale
    verifiability: 0.76, // 0.38 * 2.0 scale
  },
  environmentalModifiers: [
    {
      type: 'environmental_support',
      factor: 'piezoelectric_geology',
      value: 0.05,
      reason: 'Moderate piezoelectric content in regional bedrock',
    },
    {
      type: 'environmental_support',
      factor: 'lst_window',
      value: 0.05,
      reason: 'Event occurred during 13:00-14:30 LST window',
    },
  ],
  bonusesApplied: [
    {
      reason: '3+ claimed professional/official witnesses (unverified)',
      value: 0.3,
      applied: true,
    },
    {
      reason: 'Official FOIA document included',
      value: 0.2,
      applied: true,
    },
  ],
  bonusesNotApplied: [
    {
      reason: '3+ independently verified professional witnesses',
      value: 1.0,
      applied: false,
      requirement: 'Provide credential verification for Dr. Italo and Marco Chereze',
    },
    {
      reason: 'Contemporary official documentation',
      value: 0.3,
      applied: false,
      requirement: 'Locate police or hospital records from January 1996',
    },
  ],
  baseScore: 4.96,
  modifierTotal: 0.10,
  bonusTotal: 0.50,
  finalScore: 5.56,
  tier: 'provisional',
  aiImprovementSuggestions: [
    "Verify Dr. Italo's medical credentials through Brazilian medical board (+0.3 potential)",
    'Locate contemporary news articles from January 1996 (+0.2 potential)',
    'Obtain hospital admission records if available (+0.3 potential)',
    "Document that witnesses gave testimony before seeing each other's accounts (+0.1)",
  ],
  aiRedFlags: [
    '30-year documentation gap significantly impacts timing score',
    'No physical evidence retained',
    'Witness credentials claimed but not independently verified',
  ],
};

export const VARGINHA_FULL_SUBMISSION: UAPEncounterSchema = {
  id: 'varginha-test-001',
  investigationType: 'uap_encounter',
  title: 'Varginha Entity Encounter - January 1996',
  eventDate: '1996-01-20',
  eventDateApproximate: false,

  location: {
    description: 'Varginha, Minas Gerais, Brazil',
    coordinates: { lat: -21.5544, lng: -45.4303 },
    country: 'Brazil',
    region: 'Minas Gerais',
  },

  summary: 'Multiple witnesses including medical professionals report encountering non-human entities in and around Varginha, Brazil. Includes alleged military response and hospital involvement.',

  encounterType: {
    distantSighting: false,
    closeSighting: true,
    closeEncounter: true,
    directInteraction: true,
    abductionClaim: false,
  },

  entityObserved: true,
  entityDetails: {
    count: '2-5',
    heightEstimate: '4-5 feet',
    physicalDescription: {
      headShape: 'Large, teardrop-shaped with prominent cranium',
      eyeDescription: 'Large, red or lilac-colored',
      skinDescription: 'Brown/oily when observed outdoors, pale when observed indoors',
      otherFeatures: 'Three raised ridges on head, no apparent nose or ears',
    },
    behavior: {
      nonAggressive: true,
      appearedDistressed: true,
      communicationAttempt: true,
      aggressive: false,
      indifferent: false,
    },
    communicationType: {
      verbal: false,
      telepathicEyeContact: true,
      gesture: false,
      none: false,
    },
  },

  physicalEffects: {
    onWitnesses: {
      injuryIllness: true,
      temporaryParalysis: false,
      missingTime: false,
      psychologicalLongTerm: true,
      none: false,
    },
    injuryDescription: 'Military police officer allegedly died from unknown bacterial infection after handling entity',
    environmental: {
      emInterference: false,
      vehicleMalfunction: false,
      unusualOdor: true,
      temperatureAnomaly: false,
      groundTraces: false,
      none: false,
    },
  },

  associatedCraft: {
    observed: 'yes_separate_witnesses',
    description: 'Submarine-shaped craft reported by separate witnesses in days prior',
  },

  officialResponse: {
    militaryPresence: true,
    areaCordoned: true,
    witnessesContacted: true,
    foiaRequested: true,
    foiaDenied: true,
  },

  witnesses: VARGINHA_WITNESSES,
  evidence: VARGINHA_EVIDENCE,
  scoreBreakdown: VARGINHA_EXPECTED_SCORE,
};

/**
 * Calculate score for Varginha case using the scoring library
 * This can be used to verify the scoring algorithm
 */
export function testVarginhaScoring() {
  // This would be used to verify the scoring algorithm matches expected results
  console.log('Varginha Test Data Ready');
  console.log('Expected Score:', VARGINHA_EXPECTED_SCORE.finalScore);
  console.log('Expected Tier:', VARGINHA_EXPECTED_SCORE.tier);
  console.log('Witnesses:', VARGINHA_WITNESSES.length);
  console.log('Evidence:', VARGINHA_EVIDENCE.length);
}
