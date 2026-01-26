/**
 * Domain Configuration
 * Centralized metadata for all investigation types (research + exploratory)
 */

import type { InvestigationType, ResearchInvestigationType, ExploratoryInvestigationType } from '@/types/database';

export interface DomainMeta {
  name: string;
  description: string;
  icon: string;
  color: string;
  tier: 'research' | 'exploratory';
}

// Research tier domains (rigorous science)
export const RESEARCH_DOMAINS: Record<ResearchInvestigationType, DomainMeta> = {
  nde: {
    name: 'Near-Death Experiences',
    description: 'Cardiac arrest survivors with veridical perception',
    icon: '💀',
    color: 'indigo',
    tier: 'research',
  },
  ganzfeld: {
    name: 'Ganzfeld/Psi',
    description: 'Controlled telepathy experiments',
    icon: '🔮',
    color: 'purple',
    tier: 'research',
  },
  crisis_apparition: {
    name: 'Crisis Apparitions',
    description: 'Spontaneous transmission at moment of death',
    icon: '👻',
    color: 'pink',
    tier: 'research',
  },
  stargate: {
    name: 'Remote Viewing',
    description: 'Declassified STARGATE program data',
    icon: '👁️',
    color: 'cyan',
    tier: 'research',
  },
  geophysical: {
    name: 'Geophysical',
    description: 'Tectonic stress anomalies',
    icon: '🌋',
    color: 'orange',
    tier: 'research',
  },
  ufo: {
    name: 'UFO/UAP',
    description: 'Aerial anomalies with geophysical correlates',
    icon: '🛸',
    color: 'green',
    tier: 'research',
  },
};

// Exploratory tier domains (pattern exploration)
export const EXPLORATORY_DOMAINS: Record<ExploratoryInvestigationType, DomainMeta> = {
  bigfoot: {
    name: 'Bigfoot/Sasquatch',
    description: 'BFRO sightings database',
    icon: '🦶',
    color: 'amber',
    tier: 'exploratory',
  },
  bermuda_triangle: {
    name: 'Bermuda Triangle',
    description: 'Anomalous disappearances and phenomena',
    icon: '🔺',
    color: 'teal',
    tier: 'exploratory',
  },
  crop_circle: {
    name: 'Crop Circles',
    description: 'Formation patterns and anomalies',
    icon: '🌾',
    color: 'lime',
    tier: 'exploratory',
  },
  cattle_mutilation: {
    name: 'Cattle Mutilations',
    description: 'Unexplained animal cases',
    icon: '🐄',
    color: 'red',
    tier: 'exploratory',
  },
  hotspot: {
    name: 'Hotspots',
    description: 'High strangeness locations with anomaly clustering',
    icon: '📍',
    color: 'fuchsia',
    tier: 'exploratory',
  },
  cryptid: {
    name: 'Cryptids',
    description: 'Unidentified creature sightings',
    icon: '🐉',
    color: 'emerald',
    tier: 'exploratory',
  },
  haunting: {
    name: 'Hauntings',
    description: 'Documented paranormal locations',
    icon: '🏚️',
    color: 'slate',
    tier: 'exploratory',
  },
  men_in_black: {
    name: 'Men in Black',
    description: 'MIB encounter reports',
    icon: '🕴️',
    color: 'gray',
    tier: 'exploratory',
  },
};

// Combined domains
export const ALL_DOMAINS: Record<InvestigationType, DomainMeta> = {
  ...RESEARCH_DOMAINS,
  ...EXPLORATORY_DOMAINS,
};

// Helper functions
export function getDomainMeta(type: InvestigationType): DomainMeta {
  return ALL_DOMAINS[type] ?? {
    name: type,
    description: 'Unknown domain',
    icon: '❓',
    color: 'gray',
    tier: 'research',
  };
}

export function getDomainColor(type: InvestigationType): string {
  return ALL_DOMAINS[type]?.color ?? 'gray';
}

export function getDomainIcon(type: InvestigationType): string {
  return ALL_DOMAINS[type]?.icon ?? '❓';
}

export function getDomainName(type: InvestigationType): string {
  return ALL_DOMAINS[type]?.name ?? type;
}

export function isExploratory(type: InvestigationType): boolean {
  return ALL_DOMAINS[type]?.tier === 'exploratory';
}

export function isResearch(type: InvestigationType): boolean {
  return ALL_DOMAINS[type]?.tier === 'research';
}

// Domain lists by tier
export const RESEARCH_TYPE_LIST: ResearchInvestigationType[] = ['nde', 'ganzfeld', 'crisis_apparition', 'stargate', 'geophysical', 'ufo'];
export const EXPLORATORY_TYPE_LIST: ExploratoryInvestigationType[] = ['bigfoot', 'bermuda_triangle', 'crop_circle', 'cattle_mutilation', 'hotspot', 'cryptid', 'haunting', 'men_in_black'];
export const ALL_TYPE_LIST: InvestigationType[] = [...RESEARCH_TYPE_LIST, ...EXPLORATORY_TYPE_LIST];
