/**
 * Mechanism Agent - Mechanism Catalog
 * Predefined mechanisms and CRUD operations
 */

import { getAdminClient } from '../supabase-admin';
import type { Mechanism, MechanismType, SupportLevel, MechanismEvidence } from './types';


// Predefined mechanisms from the literature
export const KNOWN_MECHANISMS: Mechanism[] = [
  // NDE Mechanisms
  {
    name: 'Hypoxia Theory',
    description: 'NDEs are caused by oxygen deprivation to the brain during cardiac arrest',
    mechanism_type: 'neurological',
    primary_domain: 'nde',
    applicable_domains: ['nde'],
    theoretical_basis: 'Brain hypoxia causes hallucinations and tunnel vision',
    key_proponents: ['Susan Blackmore', 'James Whinnery'],
    predictions: [
      { prediction: 'NDE elements should correlate with blood oxygen levels', testable: true },
      { prediction: 'Fighter pilots experiencing g-LOC should report NDE-like experiences', testable: true, tested: true, supported: true },
      { prediction: 'NDEs should not occur with adequate brain oxygenation', testable: true },
    ],
    overall_support: 'moderate',
  },
  {
    name: 'REM Intrusion',
    description: 'NDEs are caused by REM sleep processes intruding into waking consciousness',
    mechanism_type: 'neurological',
    primary_domain: 'nde',
    applicable_domains: ['nde', 'crisis_apparition'],
    theoretical_basis: 'REM intrusion can cause out-of-body sensations and vivid experiences',
    key_proponents: ['Kevin Nelson'],
    predictions: [
      { prediction: 'NDE experiencers should have higher rates of REM intrusion in daily life', testable: true, tested: true, supported: true },
      { prediction: 'NDEs should share features with lucid dreams', testable: true },
    ],
    overall_support: 'moderate',
  },
  {
    name: 'Ketamine Model',
    description: 'NDEs result from NMDA receptor blockade similar to ketamine effects',
    mechanism_type: 'neurological',
    primary_domain: 'nde',
    applicable_domains: ['nde'],
    theoretical_basis: 'Dying brain releases endogenous ketamine-like compounds',
    key_proponents: ['Karl Jansen'],
    predictions: [
      { prediction: 'Ketamine experiences should closely match NDE phenomenology', testable: true, tested: true, supported: true },
      { prediction: 'NMDA antagonists should produce NDE-like experiences', testable: true },
    ],
    overall_support: 'moderate',
  },
  {
    name: 'Consciousness Independence',
    description: 'Consciousness can exist independently of brain function',
    mechanism_type: 'consciousness',
    primary_domain: 'nde',
    applicable_domains: ['nde', 'crisis_apparition', 'ganzfeld'],
    theoretical_basis: 'Brain is a filter/receiver of consciousness, not its generator',
    key_proponents: ['Pim van Lommel', 'Sam Parnia', 'Bruce Greyson'],
    predictions: [
      { prediction: 'Accurate veridical perception during cardiac arrest', testable: true },
      { prediction: 'NDEs should occur during flat EEG', testable: true, tested: true, supported: true },
      { prediction: 'Information should be obtainable about distant events', testable: true },
    ],
    overall_support: 'mixed',
  },

  // UFO Mechanisms
  {
    name: 'Tectonic Strain Theory',
    description: 'UFO sightings are caused by piezoelectric effects from tectonic strain',
    mechanism_type: 'physical',
    primary_domain: 'ufo',
    applicable_domains: ['ufo', 'haunting'],
    theoretical_basis: 'Tectonic strain produces electromagnetic effects and luminous phenomena',
    key_proponents: ['Michael Persinger', 'John Derr'],
    predictions: [
      { prediction: 'UFO sightings should cluster near fault lines', testable: true, tested: true, supported: true },
      { prediction: 'Sighting rates should correlate with seismic activity', testable: true },
      { prediction: 'EM anomalies should precede sightings', testable: true },
    ],
    overall_support: 'moderate',
  },
  {
    name: 'Extraterrestrial Hypothesis',
    description: 'Some UFOs are craft operated by non-human intelligence from elsewhere',
    mechanism_type: 'physical',
    primary_domain: 'ufo',
    applicable_domains: ['ufo'],
    theoretical_basis: 'Interstellar travel is possible; Earth may be of interest to other civilizations',
    predictions: [
      { prediction: 'Physical evidence of non-terrestrial manufacture', testable: true },
      { prediction: 'Consistent craft descriptions across cultures', testable: true, tested: true, supported: true },
      { prediction: 'Anomalous materials or technology', testable: true },
    ],
    overall_support: 'mixed',
  },
  {
    name: 'Ultraterrestrial Hypothesis',
    description: 'UFOs are manifestations of an intelligence coexisting with humanity',
    mechanism_type: 'interdimensional',
    primary_domain: 'ufo',
    applicable_domains: ['ufo', 'haunting', 'bigfoot', 'nde'],
    theoretical_basis: 'Phenomena may originate from other dimensions or reality states',
    key_proponents: ['Jacques Vallée', 'John Keel'],
    predictions: [
      { prediction: 'High strangeness across domains should correlate', testable: true },
      { prediction: 'Phenomena should exhibit absurdist or theatrical elements', testable: true },
      { prediction: 'Reports should show cultural adaptation over time', testable: true, tested: true, supported: true },
    ],
    overall_support: 'weak',
  },

  // Psi Mechanisms
  {
    name: 'Quantum Mind',
    description: 'Psi effects operate through quantum entanglement and non-locality',
    mechanism_type: 'quantum',
    primary_domain: 'ganzfeld',
    applicable_domains: ['ganzfeld', 'crisis_apparition', 'nde'],
    theoretical_basis: 'Consciousness involves quantum processes that can span spacetime',
    key_proponents: ['Roger Penrose', 'Stuart Hameroff', 'Dean Radin'],
    predictions: [
      { prediction: 'Psi effects should show quantum signatures', testable: true },
      { prediction: 'Effects should not decay with distance', testable: true, tested: true, supported: true },
      { prediction: 'Shielding against EM should not block effects', testable: true },
    ],
    overall_support: 'weak',
  },
  {
    name: 'Field Consciousness',
    description: 'Consciousness exists as a field that brains tune into',
    mechanism_type: 'consciousness',
    primary_domain: 'ganzfeld',
    applicable_domains: ['ganzfeld', 'nde', 'crisis_apparition'],
    theoretical_basis: 'Brains are receivers of consciousness, not generators',
    key_proponents: ['Rupert Sheldrake', 'Bernardo Kastrup'],
    predictions: [
      { prediction: 'Collective consciousness effects should be measurable', testable: true },
      { prediction: 'Psi should work better between emotionally bonded pairs', testable: true, tested: true, supported: true },
    ],
    overall_support: 'weak',
  },

  // Haunting Mechanisms
  {
    name: 'Stone Tape Theory',
    description: 'Emotional events are "recorded" in the environment and replayed',
    mechanism_type: 'physical',
    primary_domain: 'haunting',
    applicable_domains: ['haunting'],
    theoretical_basis: 'Crystalline structures in stone may store information',
    predictions: [
      { prediction: 'Hauntings should cluster in old stone buildings', testable: true, tested: true, supported: true },
      { prediction: 'Events should repeat without variation', testable: true },
      { prediction: 'No intelligent interaction with witnesses', testable: true },
    ],
    overall_support: 'weak',
  },
  {
    name: 'Infrasound Hypothesis',
    description: 'Haunting experiences are caused by inaudible low-frequency sound',
    mechanism_type: 'physical',
    primary_domain: 'haunting',
    applicable_domains: ['haunting'],
    theoretical_basis: 'Infrasound at 18.9 Hz resonates with the eyeball causing visual effects',
    key_proponents: ['Vic Tandy'],
    predictions: [
      { prediction: 'Haunted locations should have infrasound sources', testable: true, tested: true, supported: true },
      { prediction: 'Eliminating infrasound should end experiences', testable: true },
    ],
    overall_support: 'moderate',
  },

  // Bigfoot Mechanisms
  {
    name: 'Relict Hominid',
    description: 'Bigfoot is an undiscovered primate species',
    mechanism_type: 'physical',
    primary_domain: 'bigfoot',
    applicable_domains: ['bigfoot'],
    theoretical_basis: 'Gigantopithecus or similar could have survived in remote areas',
    key_proponents: ['Jeff Meldrum', 'Grover Krantz'],
    predictions: [
      { prediction: 'Physical evidence (DNA, remains) should eventually be found', testable: true },
      { prediction: 'Distribution should follow habitat suitability', testable: true, tested: true, supported: true },
      { prediction: 'Reports should show consistent anatomy', testable: true },
    ],
    overall_support: 'weak',
  },
  {
    name: 'Paranormal Bigfoot',
    description: 'Bigfoot is a paranormal phenomenon, not a physical animal',
    mechanism_type: 'interdimensional',
    primary_domain: 'bigfoot',
    applicable_domains: ['bigfoot', 'ufo'],
    theoretical_basis: 'High strangeness elements in many reports suggest non-physical nature',
    key_proponents: ['Stan Gordon'],
    predictions: [
      { prediction: 'No physical evidence will ever be found', testable: true },
      { prediction: 'Bigfoot and UFO sightings should correlate', testable: true },
      { prediction: 'Creatures should demonstrate impossible behaviors', testable: true },
    ],
    overall_support: 'weak',
  },
];

/**
 * Seed the mechanism catalog with known mechanisms
 */
export async function seedMechanismCatalog(): Promise<number> {
  let created = 0;

  for (const mech of KNOWN_MECHANISMS) {
    // Check if already exists
    const { data: existing } = await getAdminClient()
      .from('aletheia_mechanisms')
      .select('id')
      .eq('name', mech.name)
      .single();

    if (existing) continue;

    const { error } = await getAdminClient()
      .from('aletheia_mechanisms')
      .insert({
        name: mech.name,
        description: mech.description,
        mechanism_type: mech.mechanism_type,
        primary_domain: mech.primary_domain,
        applicable_domains: mech.applicable_domains,
        theoretical_basis: mech.theoretical_basis,
        key_proponents: mech.key_proponents,
        key_papers: mech.key_papers,
        predictions: mech.predictions,
        evidence_for: mech.evidence_for,
        evidence_against: mech.evidence_against,
        overall_support: mech.overall_support,
        created_by: 'seed',
      });

    if (!error) created++;
  }

  return created;
}

/**
 * Get mechanisms by domain
 */
export async function getMechanismsByDomain(domain: string): Promise<Mechanism[]> {
  const { data, error } = await getAdminClient()
    .from('aletheia_mechanisms')
    .select('*')
    .or(`primary_domain.eq.${domain},applicable_domains.cs.{${domain}}`)
    .order('overall_support', { ascending: true });

  if (error) {
    console.error('Get mechanisms error:', error);
    return [];
  }

  return data || [];
}

/**
 * Get all mechanisms
 */
export async function getAllMechanisms(options: {
  type?: MechanismType;
  support?: SupportLevel;
  limit?: number;
}): Promise<Mechanism[]> {
  let query = getAdminClient()
    .from('aletheia_mechanisms')
    .select('*')
    .order('created_at', { ascending: false });

  if (options.type) {
    query = query.eq('mechanism_type', options.type);
  }
  if (options.support) {
    query = query.eq('overall_support', options.support);
  }

  const { data, error } = await query.limit(options.limit || 50);

  if (error) {
    console.error('Get all mechanisms error:', error);
    return [];
  }

  return data || [];
}

/**
 * Save a new mechanism
 */
export async function saveMechanism(mechanism: Mechanism): Promise<string | null> {
  const { data, error } = await getAdminClient()
    .from('aletheia_mechanisms')
    .insert({
      name: mechanism.name,
      description: mechanism.description,
      mechanism_type: mechanism.mechanism_type,
      primary_domain: mechanism.primary_domain,
      applicable_domains: mechanism.applicable_domains,
      theoretical_basis: mechanism.theoretical_basis,
      key_proponents: mechanism.key_proponents,
      key_papers: mechanism.key_papers,
      predictions: mechanism.predictions,
      evidence_for: mechanism.evidence_for,
      evidence_against: mechanism.evidence_against,
      overall_support: mechanism.overall_support,
      created_by: mechanism.created_by || 'agent',
    })
    .select('id')
    .single();

  if (error) {
    console.error('Save mechanism error:', error);
    return null;
  }

  return data.id;
}

/**
 * Add evidence for a mechanism
 */
export async function addMechanismEvidence(evidence: MechanismEvidence): Promise<string | null> {
  const { data, error } = await getAdminClient()
    .from('aletheia_mechanism_evidence')
    .insert({
      mechanism_id: evidence.mechanism_id,
      evidence_type: evidence.evidence_type,
      description: evidence.description,
      source: evidence.source,
      source_url: evidence.source_url,
      supports: evidence.supports,
      strength: evidence.strength,
      effect_size: evidence.effect_size,
      p_value: evidence.p_value,
      sample_size: evidence.sample_size,
    })
    .select('id')
    .single();

  if (error) {
    console.error('Add mechanism evidence error:', error);
    return null;
  }

  return data.id;
}

/**
 * Get evidence for a mechanism
 */
export async function getMechanismEvidence(mechanismId: string): Promise<MechanismEvidence[]> {
  const { data, error } = await getAdminClient()
    .from('aletheia_mechanism_evidence')
    .select('*')
    .eq('mechanism_id', mechanismId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Get mechanism evidence error:', error);
    return [];
  }

  return data || [];
}

/**
 * Get mechanisms that apply to multiple domains
 */
export async function getCrossdomainMechanisms(): Promise<Mechanism[]> {
  const { data, error } = await getAdminClient()
    .from('aletheia_mechanisms')
    .select('*');

  if (error) {
    console.error('Get crossdomain mechanisms error:', error);
    return [];
  }

  // Filter for mechanisms with multiple applicable domains
  return (data || []).filter(m =>
    m.applicable_domains && m.applicable_domains.length > 1
  );
}
