/**
 * Tracked Researchers - Seed Data
 *
 * Curated list of researchers for the Discovery Agent to follow.
 */

import type { TrackedResearcher } from './types';

interface SeedResearcher {
  name: string;
  affiliations: string[];
  domains: string[];
  email?: string;
  website?: string;
  google_scholar?: string;
  credibility_score: number;
  notes?: string;
}

export const SEED_RESEARCHERS: SeedResearcher[] = [
  // ============================================
  // Parapsychology
  // ============================================
  {
    name: 'Dean Radin',
    affiliations: ['Institute of Noetic Sciences'],
    domains: ['parapsychology', 'consciousness', 'psi', 'entanglement'],
    website: 'https://www.deanradin.com/',
    google_scholar: 'https://scholar.google.com/citations?user=DhqG0CMAAAAJ',
    credibility_score: 85,
    notes: 'Chief Scientist at IONS. Prolific researcher, multiple meta-analyses.',
  },
  {
    name: 'Etzel Cardeña',
    affiliations: ['Lund University'],
    domains: ['parapsychology', 'anomalous experience', 'hypnosis', 'dissociation'],
    google_scholar: 'https://scholar.google.com/citations?user=w6kExg0AAAAJ',
    credibility_score: 90,
    notes: 'Thorvaldson Chair in Psychology. Mainstream credentials, parapsychology research.',
  },
  {
    name: 'Daryl Bem',
    affiliations: ['Cornell University (emeritus)'],
    domains: ['precognition', 'psi', 'social psychology'],
    credibility_score: 80,
    notes: 'Famous for "Feeling the Future" studies. Controversial but influential.',
  },
  {
    name: 'Jessica Utts',
    affiliations: ['UC Irvine'],
    domains: ['statistics', 'parapsychology', 'stargate'],
    credibility_score: 90,
    notes: 'Former ASA president. Evaluated STARGATE program. Statistical rigor.',
  },
  {
    name: 'Julia Mossbridge',
    affiliations: ['IONS', 'Mossbridge Institute'],
    domains: ['precognition', 'predictive anticipatory activity', 'consciousness'],
    website: 'https://www.mossbridgeinstitute.com/',
    credibility_score: 80,
    notes: 'Meta-analysis of presentiment studies. Focus on unconscious anticipation.',
  },
  {
    name: 'Patrizio Tressoldi',
    affiliations: ['University of Padova'],
    domains: ['parapsychology', 'meta-analysis', 'ganzfeld'],
    google_scholar: 'https://scholar.google.com/citations?user=BdJYjO4AAAAJ',
    credibility_score: 85,
    notes: 'Multiple Ganzfeld meta-analyses. Pre-registration advocate.',
  },

  // ============================================
  // NDE Research
  // ============================================
  {
    name: 'Bruce Greyson',
    affiliations: ['University of Virginia (emeritus)'],
    domains: ['nde', 'consciousness', 'near-death experience'],
    credibility_score: 95,
    notes: 'Created Greyson NDE Scale. Founder of IANDS. Gold standard NDE researcher.',
  },
  {
    name: 'Sam Parnia',
    affiliations: ['NYU Langone Medical Center'],
    domains: ['nde', 'resuscitation', 'consciousness', 'aware'],
    credibility_score: 90,
    notes: 'AWARE study lead. Medical researcher focusing on veridical perception.',
  },
  {
    name: 'Pim van Lommel',
    affiliations: ['Independent'],
    domains: ['nde', 'consciousness', 'cardiology'],
    website: 'https://pimvanlommel.nl/en/',
    credibility_score: 85,
    notes: 'Lancet prospective NDE study. Dutch cardiologist.',
  },
  {
    name: 'Penny Sartori',
    affiliations: ['University of Wales'],
    domains: ['nde', 'nursing', 'end-of-life'],
    credibility_score: 75,
    notes: 'Five-year prospective NDE study in ICU setting.',
  },

  // ============================================
  // Skeptics (Important to Track)
  // ============================================
  {
    name: 'Chris French',
    affiliations: ['Goldsmiths, University of London'],
    domains: ['anomalous psychology', 'skepticism', 'parapsychology'],
    credibility_score: 85,
    notes: 'Heads Anomalistic Psychology Research Unit. Fair skeptic.',
  },
  {
    name: 'Richard Wiseman',
    affiliations: ['University of Hertfordshire'],
    domains: ['parapsychology', 'skepticism', 'psychology'],
    credibility_score: 80,
    notes: 'Former magician. Parapsychology skeptic but does research.',
  },
  {
    name: 'Susan Blackmore',
    affiliations: ['Independent'],
    domains: ['consciousness', 'nde', 'skepticism', 'memes'],
    website: 'https://www.susanblackmore.uk/',
    credibility_score: 80,
    notes: 'Former parapsychologist turned skeptic. NDE research history.',
  },

  // ============================================
  // UFO/UAP Research
  // ============================================
  {
    name: 'Jacques Vallée',
    affiliations: ['Independent'],
    domains: ['ufo', 'uap', 'computer science', 'information systems'],
    credibility_score: 85,
    notes: 'Pioneer UFO researcher. Computer scientist. Interdimensional hypothesis.',
  },
  {
    name: 'Garry Nolan',
    affiliations: ['Stanford University'],
    domains: ['uap', 'biology', 'immunology', 'materials'],
    credibility_score: 90,
    notes: 'Stanford professor. UAP materials analysis. Mainstream credentials.',
  },
  {
    name: 'Avi Loeb',
    affiliations: ['Harvard University'],
    domains: ['uap', 'astronomy', 'astrophysics', 'oumuamua'],
    website: 'https://www.cfa.harvard.edu/~loeb/',
    credibility_score: 90,
    notes: 'Harvard astronomy chair. Galileo Project. Oumuamua research.',
  },
  {
    name: 'Diana Walsh Pasulka',
    affiliations: ['University of North Carolina Wilmington'],
    domains: ['ufo', 'religion', 'technology', 'belief'],
    credibility_score: 75,
    notes: 'Religion professor. "American Cosmic" author. Cultural analysis.',
  },

  // ============================================
  // Geophysical Anomalies
  // ============================================
  {
    name: 'Michael Persinger',
    affiliations: ['Laurentian University (deceased 2018)'],
    domains: ['geophysical', 'electromagnetic', 'tectonic', 'haunt'],
    credibility_score: 80,
    notes: 'Tectonic strain theory. EM effects on consciousness. Legacy important.',
  },
  {
    name: 'John Derr',
    affiliations: ['USGS (retired)'],
    domains: ['geophysical', 'earthquake lights', 'seismic'],
    credibility_score: 85,
    notes: 'USGS geophysicist. Earthquake lights research. Peer-reviewed.',
  },

  // ============================================
  // Consciousness Research
  // ============================================
  {
    name: 'Bernardo Kastrup',
    affiliations: ['Essentia Foundation'],
    domains: ['consciousness', 'idealism', 'philosophy of mind'],
    website: 'https://www.bernardokastrup.com/',
    credibility_score: 75,
    notes: 'Analytic idealism proponent. PhD in philosophy and computer science.',
  },
  {
    name: 'Donald Hoffman',
    affiliations: ['UC Irvine'],
    domains: ['consciousness', 'perception', 'evolution'],
    credibility_score: 85,
    notes: 'Cognitive scientist. "Case Against Reality". Mathematical models.',
  },
  {
    name: 'David Chalmers',
    affiliations: ['NYU'],
    domains: ['consciousness', 'philosophy of mind', 'hard problem'],
    credibility_score: 95,
    notes: 'Defined hard problem of consciousness. Top philosopher.',
  },

  // ============================================
  // Remote Viewing
  // ============================================
  {
    name: 'Edwin May',
    affiliations: ['Laboratories for Fundamental Research'],
    domains: ['remote viewing', 'stargate', 'anomalous cognition'],
    credibility_score: 80,
    notes: 'STARGATE program director. Decades of RV research.',
  },
  {
    name: 'Stephan Schwartz',
    affiliations: ['The Mobius Group'],
    domains: ['remote viewing', 'archaeology', 'applied psi'],
    website: 'https://www.stephanschwartz.com/',
    credibility_score: 75,
    notes: 'Applied remote viewing in archaeology. Alexandria discoveries.',
  },
];

/**
 * Get researchers by domain
 */
export function getResearchersByDomain(domain: string): SeedResearcher[] {
  return SEED_RESEARCHERS.filter(r =>
    r.domains.some(d => d.toLowerCase().includes(domain.toLowerCase()))
  );
}

/**
 * Get high credibility researchers
 */
export function getHighCredibilityResearchers(minScore = 80): SeedResearcher[] {
  return SEED_RESEARCHERS.filter(r => r.credibility_score >= minScore);
}

/**
 * Get skeptics (important for balanced coverage)
 */
export function getSkepticalResearchers(): SeedResearcher[] {
  return SEED_RESEARCHERS.filter(r =>
    r.domains.includes('skepticism')
  );
}

/**
 * Format researchers for database insertion
 */
export function formatResearchersForDb(): Partial<TrackedResearcher>[] {
  return SEED_RESEARCHERS.map(r => ({
    name: r.name,
    affiliations: r.affiliations,
    domains: r.domains,
    email: r.email,
    website: r.website,
    google_scholar: r.google_scholar,
    credibility_score: r.credibility_score,
    notes: r.notes,
    active: true,
  }));
}

/**
 * Find researchers relevant to a topic
 */
export function findRelevantResearchers(
  keywords: string[],
  limit = 5
): SeedResearcher[] {
  const scored = SEED_RESEARCHERS.map(r => {
    let score = 0;
    for (const keyword of keywords) {
      const kw = keyword.toLowerCase();
      // Domain match
      if (r.domains.some(d => d.toLowerCase().includes(kw))) {
        score += 10;
      }
      // Name match
      if (r.name.toLowerCase().includes(kw)) {
        score += 5;
      }
      // Notes match
      if (r.notes?.toLowerCase().includes(kw)) {
        score += 3;
      }
    }
    // Credibility bonus
    score += r.credibility_score / 20;
    return { researcher: r, score };
  });

  return scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(s => s.researcher);
}
