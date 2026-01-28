/**
 * Known Data Sources
 *
 * Curated list of reliable data sources for anomaly research.
 * Used by the agent to find data to fill identified gaps.
 */

import type { KnownDataSource } from './types';

export const KNOWN_DATA_SOURCES: KnownDataSource[] = [
  // UFO / UAP Sources
  {
    name: 'NUFORC',
    url: 'https://nuforc.org',
    domain: 'ufo',
    type: 'scrape',
    quality: 'high',
    description: 'National UFO Reporting Center - primary US UFO database since 1974',
    scrape_config: {
      list_url: 'https://nuforc.org/subndx/',
      pagination: 'by-state',
      record_selector: 'table tr',
      field_mappings: {
        date: 'td:nth-child(1)',
        location: 'td:nth-child(2)',
        shape: 'td:nth-child(3)',
        duration: 'td:nth-child(4)',
        description: 'td:nth-child(5)',
      },
    },
  },
  {
    name: 'MUFON',
    url: 'https://mufon.com',
    domain: 'ufo',
    type: 'api',
    quality: 'high',
    description: 'Mutual UFO Network - field-investigated sightings',
    api_config: {
      endpoint: 'https://api.mufon.com/v1/sightings',
      auth_type: 'api_key',
      rate_limit: 100,
    },
  },

  // Bigfoot / Cryptid Sources
  {
    name: 'BFRO',
    url: 'https://bfro.net',
    domain: 'bigfoot',
    type: 'scrape',
    quality: 'high',
    description: 'Bigfoot Field Researchers Organization - field-investigated sightings',
    scrape_config: {
      list_url: 'https://bfro.net/GDB/',
      pagination: 'by-state',
      record_selector: '.reportList a',
      field_mappings: {
        report_url: 'href',
        title: 'text',
      },
    },
  },

  // NDE / Consciousness Sources
  {
    name: 'NDERF',
    url: 'https://nderf.org',
    domain: 'nde',
    type: 'scrape',
    quality: 'high',
    description: 'Near Death Experience Research Foundation - extensive NDE accounts',
    scrape_config: {
      list_url: 'https://nderf.org/NDERF/NDE_Experiences/nde_experiences.htm',
      record_selector: '.experience-link',
      field_mappings: {
        title: 'text',
        url: 'href',
      },
    },
  },
  {
    name: 'OBERF',
    url: 'https://oberf.org',
    domain: 'nde',
    type: 'scrape',
    quality: 'medium',
    description: 'Out-of-Body Experience Research Foundation - OBE accounts',
    scrape_config: {
      list_url: 'https://oberf.org/obe_stories.htm',
      record_selector: '.obe-link',
      field_mappings: {
        title: 'text',
        url: 'href',
      },
    },
  },

  // Haunting / Paranormal Sources
  {
    name: 'Haunted Places',
    url: 'https://www.hauntedplaces.org',
    domain: 'haunting',
    type: 'scrape',
    quality: 'medium',
    description: 'Directory of allegedly haunted locations in the US',
    scrape_config: {
      list_url: 'https://www.hauntedplaces.org/state/',
      pagination: 'by-state',
      record_selector: '.location-item',
      field_mappings: {
        name: '.location-name',
        location: '.location-address',
        description: '.location-description',
      },
    },
  },

  // Geophysical / Scientific Sources
  {
    name: 'USGS Earthquakes',
    url: 'https://earthquake.usgs.gov',
    domain: 'geophysical',
    type: 'api',
    quality: 'high',
    description: 'US Geological Survey earthquake catalog',
    api_config: {
      endpoint: 'https://earthquake.usgs.gov/fdsnws/event/1/query',
      auth_type: 'none',
      rate_limit: 1000,
    },
  },

  // Crisis Apparition Sources
  {
    name: 'SPR Cases',
    url: 'https://www.spr.ac.uk',
    domain: 'crisis_apparition',
    type: 'archive',
    quality: 'high',
    description: 'Society for Psychical Research historical case archive',
  },

  // Multi-domain Sources
  {
    name: 'Phantoms & Monsters',
    url: 'https://www.phantomsandmonsters.com',
    domain: 'multiple',
    type: 'scrape',
    quality: 'low',
    description: 'Aggregator of paranormal reports - lower verification standards',
    scrape_config: {
      list_url: 'https://www.phantomsandmonsters.com/search',
      record_selector: '.post-title a',
      field_mappings: {
        title: 'text',
        url: 'href',
      },
    },
  },
];

/**
 * Find known sources that match a domain
 */
export function findSourcesForDomain(domain: string): KnownDataSource[] {
  const normalizedDomain = domain.toLowerCase();

  return KNOWN_DATA_SOURCES.filter(source => {
    const sourceDomain = source.domain.toLowerCase();
    return (
      sourceDomain === normalizedDomain ||
      sourceDomain === 'multiple' ||
      // Handle aliases
      (normalizedDomain === 'ufo' && sourceDomain === 'uap') ||
      (normalizedDomain === 'uap' && sourceDomain === 'ufo') ||
      (normalizedDomain === 'bigfoot' && sourceDomain === 'cryptid') ||
      (normalizedDomain === 'cryptid' && sourceDomain === 'bigfoot')
    );
  });
}

/**
 * Find high-quality sources only
 */
export function findHighQualitySources(domain?: string): KnownDataSource[] {
  let sources = KNOWN_DATA_SOURCES.filter(s => s.quality === 'high');

  if (domain) {
    sources = sources.filter(s =>
      s.domain.toLowerCase() === domain.toLowerCase() ||
      s.domain === 'multiple'
    );
  }

  return sources;
}

/**
 * Get a source by name
 */
export function getSourceByName(name: string): KnownDataSource | undefined {
  return KNOWN_DATA_SOURCES.find(
    s => s.name.toLowerCase() === name.toLowerCase()
  );
}
