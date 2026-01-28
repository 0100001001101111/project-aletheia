/**
 * Known Researchers Database
 *
 * A curated list of researchers working in anomaly-related fields.
 * Used by the agent to suggest relevant contacts for findings.
 *
 * All contact information is publicly available.
 */

import type { KnownResearcher } from './types';

export const KNOWN_RESEARCHERS: KnownResearcher[] = [
  // NDE / Consciousness Researchers
  {
    name: "Bruce Greyson",
    affiliation: "University of Virginia DOPS",
    domains: ["nde", "consciousness", "crisis_apparition"],
    email: "cbg4d@virginia.edu",
    contact_url: "https://med.virginia.edu/perceptual-studies/",
    expertise: "Created the Greyson Scale for NDE research; pioneer in NDE studies"
  },
  {
    name: "Sam Parnia",
    affiliation: "NYU Langone Medical Center",
    domains: ["nde", "consciousness", "resuscitation"],
    email: "sam.parnia@nyulangone.org",
    contact_url: "https://nyulangone.org/doctors/1285791296/sam-parnia",
    expertise: "AWARE Study on consciousness during cardiac arrest"
  },
  {
    name: "Pim van Lommel",
    affiliation: "Independent Researcher (Netherlands)",
    domains: ["nde", "consciousness"],
    contact_url: "https://pimvanlommel.nl/en/",
    expertise: "Landmark prospective NDE study in The Lancet"
  },

  // Parapsychology / Ganzfeld Researchers
  {
    name: "Etzel Cardeña",
    affiliation: "Lund University",
    domains: ["parapsychology", "ganzfeld", "anomalous", "consciousness"],
    email: "etzel.cardena@psy.lu.se",
    contact_url: "https://www.psychology.lu.se/etzel-cardena",
    expertise: "Editor of Parapsychology: A Handbook for the 21st Century"
  },
  {
    name: "Dean Radin",
    affiliation: "Institute of Noetic Sciences",
    domains: ["parapsychology", "consciousness", "psi", "ganzfeld"],
    email: "dradin@noetic.org",
    contact_url: "https://noetic.org/profile/dean-radin/",
    expertise: "Chief Scientist at IONS; meta-analyses of psi research"
  },
  {
    name: "Daryl Bem",
    affiliation: "Cornell University (Emeritus)",
    domains: ["parapsychology", "psi", "precognition"],
    contact_url: "https://dbem.org/",
    expertise: "Feeling the Future studies; ganzfeld meta-analyses"
  },

  // UFO / UAP Researchers
  {
    name: "Garry Nolan",
    affiliation: "Stanford University",
    domains: ["ufo", "uap", "materials_analysis"],
    contact_url: "https://med.stanford.edu/profiles/garry-nolan",
    expertise: "Analysis of anomalous materials; Sol Foundation"
  },
  {
    name: "Jacques Vallée",
    affiliation: "Independent Researcher",
    domains: ["ufo", "uap", "high_strangeness", "consciousness"],
    contact_url: "https://www.jacquesvallee.net/",
    expertise: "Interdimensional hypothesis; pattern analysis of UFO reports"
  },
  {
    name: "Diana Pasulka",
    affiliation: "University of North Carolina Wilmington",
    domains: ["ufo", "uap", "religion", "consciousness"],
    contact_url: "https://uncw.edu/academics/colleges/cahss/departments/philosophy-religion/faculty-staff/diana-pasulka",
    expertise: "American Cosmic; religious dimensions of UFO phenomena"
  },

  // Cryptozoology / Bigfoot Researchers
  {
    name: "Jeff Meldrum",
    affiliation: "Idaho State University",
    domains: ["bigfoot", "cryptozoology", "primatology"],
    email: "meldjeff@isu.edu",
    contact_url: "https://www.isu.edu/biology/faculty-and-staff/jeff-meldrum/",
    expertise: "Sasquatch: Legend Meets Science; footprint analysis"
  },

  // Geophysical Anomalies
  {
    name: "Michael Persinger",
    affiliation: "Laurentian University (Deceased 2018)",
    domains: ["geophysical", "tectonic", "consciousness", "ufo"],
    expertise: "Tectonic Strain Theory; electromagnetic effects on perception"
  },
  {
    name: "John Derr",
    affiliation: "USGS (Retired)",
    domains: ["geophysical", "earthquake_lights", "ufo"],
    expertise: "Earthquake lights research; geological anomalies"
  },

  // Window Areas / High Strangeness
  {
    name: "John Keel",
    affiliation: "Independent Researcher (Deceased 2009)",
    domains: ["ufo", "bigfoot", "haunting", "high_strangeness", "window_areas"],
    expertise: "The Mothman Prophecies; window areas concept"
  },

  // Statistical / Meta-Analysis
  {
    name: "Jessica Utts",
    affiliation: "UC Irvine",
    domains: ["statistics", "parapsychology", "psi"],
    email: "jutts@uci.edu",
    contact_url: "https://www.ics.uci.edu/~jutts/",
    expertise: "Statistical evaluation of anomalous cognition; former ASA president"
  },
  {
    name: "Chris French",
    affiliation: "Goldsmiths, University of London",
    domains: ["anomalous", "skeptic", "parapsychology"],
    contact_url: "https://www.gold.ac.uk/psychology/staff/french/",
    expertise: "Anomalistic Psychology Research Unit; skeptical perspective"
  },

  // Haunting / Apparitions
  {
    name: "Erlendur Haraldsson",
    affiliation: "University of Iceland (Emeritus)",
    domains: ["crisis_apparition", "nde", "deathbed_visions"],
    expertise: "Crisis apparition surveys; deathbed visions research"
  },
  {
    name: "Carlos Alvarado",
    affiliation: "Atlantic University",
    domains: ["parapsychology", "crisis_apparition", "out_of_body"],
    email: "carlos.alvarado@atlanticuniv.edu",
    expertise: "Historical parapsychology; out-of-body experiences"
  }
];

/**
 * Find researchers whose domains match the given domains
 */
export function findMatchingResearchers(domains: string[]): KnownResearcher[] {
  const normalizedDomains = domains.map(d => d.toLowerCase().replace(/[_-]/g, ''));

  return KNOWN_RESEARCHERS.filter(researcher => {
    const researcherDomains = researcher.domains.map(d => d.toLowerCase().replace(/[_-]/g, ''));
    return researcherDomains.some(rd =>
      normalizedDomains.some(nd =>
        rd.includes(nd) || nd.includes(rd)
      )
    );
  });
}

/**
 * Score a researcher's relevance to a finding
 * Returns 0-100
 */
export function scoreResearcherRelevance(
  researcher: KnownResearcher,
  findingDomains: string[],
  citedInSources: boolean
): number {
  let score = 0;

  // Domain match: 0-40 points
  const normalizedFindingDomains = findingDomains.map(d => d.toLowerCase().replace(/[_-]/g, ''));
  const researcherDomains = researcher.domains.map(d => d.toLowerCase().replace(/[_-]/g, ''));

  const matchingDomains = researcherDomains.filter(rd =>
    normalizedFindingDomains.some(fd => rd.includes(fd) || fd.includes(rd))
  );

  score += Math.min(40, matchingDomains.length * 15);

  // Cited in research: 30 points
  if (citedInSources) {
    score += 30;
  }

  // Has public contact info: 0-15 points
  if (researcher.email) {
    score += 10;
  }
  if (researcher.contact_url) {
    score += 5;
  }

  // Still active (has affiliation that's not "Deceased"): 0-15 points
  if (!researcher.affiliation.includes('Deceased')) {
    score += 15;
  }

  return Math.min(100, score);
}
