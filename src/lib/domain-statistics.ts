/**
 * Domain-Specific Statistics Router
 * Routes statistical calculations to appropriate methods based on research domain
 */

import type { InvestigationType } from '@/types/database';
import {
  binomialTest,
  poissonTest,
  qualitativeCoding,
  type BinomialResult,
  type PoissonResult,
  type QualitativeResult,
} from './statistics';

// ============================================================================
// DOMAIN CONFIGURATIONS
// ============================================================================

export interface DomainConfig {
  type: 'binomial' | 'poisson' | 'qualitative';
  name: string;
  expectedProportion?: number; // For binomial domains
  expectedRate?: number; // For Poisson domains
  description: string;
  fields: {
    primary: string;
    secondary?: string;
    description?: string;
  };
}

export const DOMAIN_CONFIGS: Record<InvestigationType, DomainConfig> = {
  ganzfeld: {
    type: 'binomial',
    name: 'Ganzfeld',
    expectedProportion: 0.25, // 4-choice task
    description: 'Psi experiments using sensory deprivation. Success measured against 25% chance.',
    fields: {
      primary: 'hits',
      secondary: 'trials',
      description: 'Number of correct target identifications out of total trials',
    },
  },
  stargate: {
    type: 'binomial',
    name: 'Remote Viewing',
    expectedProportion: 0.25, // 4-choice task (typical)
    description: 'Remote viewing experiments. Success measured against chance baseline.',
    fields: {
      primary: 'hits',
      secondary: 'trials',
      description: 'Number of successful remote viewing sessions',
    },
  },
  geophysical: {
    type: 'poisson',
    name: 'Geophysical Anomalies',
    expectedRate: 1, // Events per unit time (configurable)
    description: 'Temporal clustering of anomalous events near geological activity.',
    fields: {
      primary: 'events',
      secondary: 'timeWindow',
      description: 'Number of anomalous events in observation window',
    },
  },
  nde: {
    type: 'qualitative',
    name: 'Near-Death Experiences',
    description: 'Qualitative analysis of near-death experience reports.',
    fields: {
      primary: 'description',
      description: 'Detailed narrative of the experience',
    },
  },
  crisis_apparition: {
    type: 'qualitative',
    name: 'Crisis Apparitions',
    description: 'Qualitative analysis of crisis telepathy/apparition reports.',
    fields: {
      primary: 'description',
      description: 'Detailed narrative of the apparition experience',
    },
  },
  ufo: {
    type: 'poisson',
    name: 'UFO/UAP Sightings',
    expectedRate: 1, // Events per unit time (configurable)
    description: 'UFO/UAP sightings with geophysical and geomagnetic correlations (SPECTER hypothesis).',
    fields: {
      primary: 'events',
      secondary: 'timeWindow',
      description: 'Number of sightings in observation window with environmental correlations',
    },
  },
};

// ============================================================================
// RESULT TYPES
// ============================================================================

export type DomainStatisticsResult =
  | { type: 'binomial'; data: BinomialResult }
  | { type: 'poisson'; data: PoissonResult }
  | { type: 'qualitative'; data: QualitativeResult };

// ============================================================================
// INPUT TYPES
// ============================================================================

export interface BinomialInput {
  hits: number;
  trials: number;
}

export interface PoissonInput {
  events: number;
  expectedRate?: number;
  timeWindow?: number;
}

export interface QualitativeInput {
  description: string;
}

export type DomainInput = BinomialInput | PoissonInput | QualitativeInput;

// ============================================================================
// MAIN ROUTER
// ============================================================================

/**
 * Get statistics for a given domain and input data
 * Automatically routes to the appropriate statistical test
 */
export function getDomainStatistics(
  domain: InvestigationType,
  input: DomainInput
): DomainStatisticsResult {
  const config = DOMAIN_CONFIGS[domain];

  switch (config.type) {
    case 'binomial': {
      const binomialInput = input as BinomialInput;
      if (typeof binomialInput.hits !== 'number' || typeof binomialInput.trials !== 'number') {
        throw new Error(`${config.name} requires hits and trials`);
      }
      return {
        type: 'binomial',
        data: binomialTest(
          binomialInput.hits,
          binomialInput.trials,
          config.expectedProportion || 0.25
        ),
      };
    }

    case 'poisson': {
      const poissonInput = input as PoissonInput;
      if (typeof poissonInput.events !== 'number') {
        throw new Error(`${config.name} requires events count`);
      }
      return {
        type: 'poisson',
        data: poissonTest(
          poissonInput.events,
          poissonInput.expectedRate || config.expectedRate || 1,
          poissonInput.timeWindow || 1
        ),
      };
    }

    case 'qualitative': {
      const qualInput = input as QualitativeInput;
      if (typeof qualInput.description !== 'string') {
        throw new Error(`${config.name} requires description`);
      }
      return {
        type: 'qualitative',
        data: qualitativeCoding(qualInput.description),
      };
    }

    default:
      throw new Error(`Unknown domain type: ${config.type}`);
  }
}

/**
 * Check if a domain uses Simple Mode (binomial statistics)
 */
export function isSimpleModeCompatible(domain: InvestigationType): boolean {
  return DOMAIN_CONFIGS[domain].type === 'binomial';
}

/**
 * Get the expected proportion for a binomial domain
 */
export function getExpectedProportion(domain: InvestigationType): number {
  const config = DOMAIN_CONFIGS[domain];
  if (config.type !== 'binomial') {
    throw new Error(`${domain} is not a binomial domain`);
  }
  return config.expectedProportion || 0.25;
}

/**
 * Get form fields required for a domain
 */
export function getDomainFields(domain: InvestigationType): DomainConfig['fields'] {
  return DOMAIN_CONFIGS[domain].fields;
}

/**
 * Get human-readable description of statistical method for domain
 */
export function getDomainMethodDescription(domain: InvestigationType): string {
  const config = DOMAIN_CONFIGS[domain];

  switch (config.type) {
    case 'binomial':
      return `Uses binomial test against ${((config.expectedProportion || 0.25) * 100).toFixed(0)}% chance baseline. P-value indicates how likely the results are due to random chance.`;
    case 'poisson':
      return `Uses Poisson distribution to detect unusual clustering of events. Compares observed event rate to expected background rate.`;
    case 'qualitative':
      return `Uses qualitative coding to identify key features: veridical perception, timeline matching, corroboration, and documentation.`;
    default:
      return 'Unknown statistical method';
  }
}

/**
 * Validate input data for a domain
 */
export function validateDomainInput(domain: InvestigationType, input: DomainInput): string[] {
  const config = DOMAIN_CONFIGS[domain];
  const errors: string[] = [];

  switch (config.type) {
    case 'binomial': {
      const binInput = input as BinomialInput;
      if (typeof binInput.trials !== 'number' || binInput.trials <= 0) {
        errors.push('Trials must be a positive number');
      }
      if (typeof binInput.hits !== 'number' || binInput.hits < 0) {
        errors.push('Hits must be a non-negative number');
      }
      if (binInput.hits > binInput.trials) {
        errors.push('Hits cannot exceed total trials');
      }
      break;
    }
    case 'poisson': {
      const poisInput = input as PoissonInput;
      if (typeof poisInput.events !== 'number' || poisInput.events < 0) {
        errors.push('Events must be a non-negative number');
      }
      if (poisInput.timeWindow !== undefined && poisInput.timeWindow <= 0) {
        errors.push('Time window must be positive');
      }
      break;
    }
    case 'qualitative': {
      const qualInput = input as QualitativeInput;
      if (typeof qualInput.description !== 'string' || qualInput.description.trim().length < 20) {
        errors.push('Description must be at least 20 characters');
      }
      break;
    }
  }

  return errors;
}
