/**
 * Discovery Sources - Seed Data
 *
 * Curated list of sources for the Discovery Agent to monitor.
 */

import type { DiscoverySource, DiscoverySourceType, MonitorFrequency, QualityEstimate } from './types';

interface SeedSource {
  name: string;
  url: string;
  source_type: DiscoverySourceType;
  monitor_frequency: MonitorFrequency;
  quality_tier: QualityEstimate;
  notes?: string;
}

export const SEED_SOURCES: SeedSource[] = [
  // ============================================
  // Journals
  // ============================================
  {
    name: 'Journal of Scientific Exploration',
    url: 'https://journalofscientificexploration.org/',
    source_type: 'journal',
    monitor_frequency: 'weekly',
    quality_tier: 'high',
    notes: 'Peer-reviewed journal covering anomalies. Publishes quarterly.',
  },
  {
    name: 'Journal of Parapsychology',
    url: 'https://www.parapsych.org/journal.html',
    source_type: 'journal',
    monitor_frequency: 'weekly',
    quality_tier: 'high',
    notes: 'Oldest peer-reviewed parapsychology journal. Published by PA.',
  },
  {
    name: 'Journal of Near-Death Studies',
    url: 'https://digital.library.unt.edu/explore/collections/JNDS/',
    source_type: 'journal',
    monitor_frequency: 'monthly',
    quality_tier: 'high',
    notes: 'Academic journal on NDE research. IANDS publication.',
  },
  {
    name: 'EdgeScience',
    url: 'https://www.scientificexploration.org/edgescience',
    source_type: 'journal',
    monitor_frequency: 'monthly',
    quality_tier: 'medium',
    notes: 'SSE magazine. Less rigorous than JSE but good leads.',
  },
  {
    name: 'Journal of Consciousness Studies',
    url: 'https://www.imprint.co.uk/jcs/',
    source_type: 'journal',
    monitor_frequency: 'monthly',
    quality_tier: 'high',
    notes: 'Mainstream consciousness research. Occasional anomalous topics.',
  },
  {
    name: 'Explore: The Journal of Science and Healing',
    url: 'https://www.explorejournal.com/',
    source_type: 'journal',
    monitor_frequency: 'monthly',
    quality_tier: 'medium',
    notes: 'Elsevier journal. Mixed quality, some good consciousness research.',
  },

  // ============================================
  // Government Archives
  // ============================================
  {
    name: 'CIA Reading Room',
    url: 'https://www.cia.gov/readingroom/',
    source_type: 'archive',
    monitor_frequency: 'daily',
    quality_tier: 'high',
    notes: 'STARGATE, remote viewing, psychic research documents.',
  },
  {
    name: 'NSA Declassified',
    url: 'https://www.nsa.gov/news-features/declassified-documents/',
    source_type: 'archive',
    monitor_frequency: 'weekly',
    quality_tier: 'high',
    notes: 'Occasional parapsychology/anomalous docs.',
  },
  {
    name: 'FBI Vault',
    url: 'https://vault.fbi.gov/',
    source_type: 'archive',
    monitor_frequency: 'weekly',
    quality_tier: 'high',
    notes: 'UFO files, ESP investigations, unexplained cases.',
  },
  {
    name: 'UK National Archives',
    url: 'https://www.nationalarchives.gov.uk/',
    source_type: 'archive',
    monitor_frequency: 'monthly',
    quality_tier: 'high',
    notes: 'British government UFO/anomaly files.',
  },
  {
    name: 'DIA FOIA Reading Room',
    url: 'https://www.dia.mil/FOIA/',
    source_type: 'archive',
    monitor_frequency: 'weekly',
    quality_tier: 'high',
    notes: 'Defense Intelligence Agency declassified docs.',
  },

  // ============================================
  // Research Organizations
  // ============================================
  {
    name: 'Society for Scientific Exploration',
    url: 'https://www.scientificexploration.org/',
    source_type: 'organization',
    monitor_frequency: 'weekly',
    quality_tier: 'high',
    notes: 'Hosts JSE, EdgeScience, annual conferences.',
  },
  {
    name: 'Parapsychological Association',
    url: 'https://www.parapsych.org/',
    source_type: 'organization',
    monitor_frequency: 'weekly',
    quality_tier: 'high',
    notes: 'AAAS-affiliated. Annual conference proceedings.',
  },
  {
    name: 'Institute of Noetic Sciences',
    url: 'https://noetic.org/',
    source_type: 'organization',
    monitor_frequency: 'weekly',
    quality_tier: 'high',
    notes: 'Dean Radin and team. Consciousness research.',
  },
  {
    name: 'IANDS',
    url: 'https://iands.org/',
    source_type: 'organization',
    monitor_frequency: 'monthly',
    quality_tier: 'high',
    notes: 'International Association for Near-Death Studies.',
  },
  {
    name: 'Rhine Research Center',
    url: 'https://www.rhine.org/',
    source_type: 'organization',
    monitor_frequency: 'monthly',
    quality_tier: 'high',
    notes: 'Continuation of J.B. Rhine legacy. Lab research.',
  },
  {
    name: 'Division of Perceptual Studies (UVA)',
    url: 'https://med.virginia.edu/perceptual-studies/',
    source_type: 'organization',
    monitor_frequency: 'monthly',
    quality_tier: 'high',
    notes: 'Ian Stevenson legacy. Reincarnation, NDE research.',
  },

  // ============================================
  // Preprint Servers
  // ============================================
  {
    name: 'arXiv (q-bio.NC)',
    url: 'https://arxiv.org/list/q-bio.NC/recent',
    source_type: 'preprint',
    monitor_frequency: 'daily',
    quality_tier: 'high',
    notes: 'Neurons and Cognition preprints. Consciousness research.',
  },
  {
    name: 'PsyArXiv',
    url: 'https://psyarxiv.com/',
    source_type: 'preprint',
    monitor_frequency: 'weekly',
    quality_tier: 'high',
    notes: 'Psychology preprints. Parapsychology occasionally.',
  },
  {
    name: 'OSF Preprints',
    url: 'https://osf.io/preprints/',
    source_type: 'preprint',
    monitor_frequency: 'weekly',
    quality_tier: 'high',
    notes: 'Open Science Framework. Replications often posted here.',
  },

  // ============================================
  // Conference Proceedings
  // ============================================
  {
    name: 'PA Annual Convention',
    url: 'https://www.parapsych.org/convention.html',
    source_type: 'conference',
    monitor_frequency: 'monthly',
    quality_tier: 'high',
    notes: 'Annual Parapsychological Association conference.',
  },
  {
    name: 'SSE Annual Meeting',
    url: 'https://www.scientificexploration.org/meetings',
    source_type: 'conference',
    monitor_frequency: 'monthly',
    quality_tier: 'high',
    notes: 'Society for Scientific Exploration annual meeting.',
  },
  {
    name: 'MUFON Symposium',
    url: 'https://mufon.com/symposium/',
    source_type: 'conference',
    monitor_frequency: 'monthly',
    quality_tier: 'medium',
    notes: 'UFO research symposium. Variable quality.',
  },
  {
    name: 'IANDS Conference',
    url: 'https://iands.org/events/',
    source_type: 'conference',
    monitor_frequency: 'monthly',
    quality_tier: 'high',
    notes: 'Near-death experience research conference.',
  },

  // ============================================
  // Databases
  // ============================================
  {
    name: 'NUFORC',
    url: 'https://nuforc.org/',
    source_type: 'database',
    monitor_frequency: 'weekly',
    quality_tier: 'medium',
    notes: 'National UFO Reporting Center. Large dataset.',
  },
  {
    name: 'MUFON CMS',
    url: 'https://www.mufon.com/',
    source_type: 'database',
    monitor_frequency: 'weekly',
    quality_tier: 'medium',
    notes: 'Field-investigated UFO reports.',
  },
  {
    name: 'BFRO',
    url: 'https://www.bfro.net/',
    source_type: 'database',
    monitor_frequency: 'monthly',
    quality_tier: 'medium',
    notes: 'Bigfoot Field Researchers Organization. Curated reports.',
  },
  {
    name: 'NDERF',
    url: 'https://www.nderf.org/',
    source_type: 'database',
    monitor_frequency: 'weekly',
    quality_tier: 'high',
    notes: 'Near-Death Experience Research Foundation.',
  },
];

/**
 * Get sources by type
 */
export function getSourcesByType(type: DiscoverySourceType): SeedSource[] {
  return SEED_SOURCES.filter(s => s.source_type === type);
}

/**
 * Get sources by quality tier
 */
export function getHighQualitySources(): SeedSource[] {
  return SEED_SOURCES.filter(s => s.quality_tier === 'high');
}

/**
 * Get sources due for checking based on frequency
 */
export function getSourcesDueForCheck(frequency: MonitorFrequency): SeedSource[] {
  return SEED_SOURCES.filter(s => s.monitor_frequency === frequency);
}

/**
 * Format sources for database insertion
 */
export function formatSourcesForDb(): Partial<DiscoverySource>[] {
  return SEED_SOURCES.map(s => ({
    name: s.name,
    url: s.url,
    source_type: s.source_type,
    monitor_frequency: s.monitor_frequency,
    quality_tier: s.quality_tier,
    notes: s.notes,
    leads_found: 0,
    leads_approved: 0,
    active: true,
  }));
}
