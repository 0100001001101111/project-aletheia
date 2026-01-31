/**
 * Swarm Registry
 *
 * Central configuration for all research swarms.
 * Only ANOMALY is active for launch. Others are planned for future development.
 */

export type SwarmStatus = 'active' | 'development' | 'planned';
export type SwarmTier = 1 | 2 | 3;

export interface SwarmAgent {
  id: string;
  name: string;
  role: string;
}

export interface SwarmSchema {
  id: string;
  name: string;
  description: string;
}

export interface SwarmDataSource {
  id: string;
  name: string;
  type: 'api' | 'database' | 'scraper' | 'manual';
  url?: string;
}

export interface Swarm {
  id: string;
  name: string;
  domain: string;
  tagline: string;
  description: string;
  icon: string;
  color: string;
  status: SwarmStatus;
  tier: SwarmTier;
  agents: SwarmAgent[];
  schemas: SwarmSchema[];
  dataSources: SwarmDataSource[];
}

/**
 * Complete swarm registry
 */
export const SWARMS: Swarm[] = [
  // ==================== TIER 1: Core Four ====================
  {
    id: 'anomaly',
    name: 'ANOMALY',
    domain: 'Paranormal Research',
    tagline: 'Hunting patterns in the unexplained',
    description: 'Cross-domain analysis of anomalous phenomena including NDEs, remote viewing, crisis apparitions, UFO/UAP sightings, and geophysical correlates. Rigorous methodology meets open-minded inquiry.',
    icon: '👁️',
    color: 'purple',
    status: 'active',
    tier: 1,
    agents: [
      { id: 'research', name: 'Research Agent', role: 'Pattern discovery and hypothesis testing' },
      { id: 'discovery', name: 'Discovery Agent', role: 'Literature monitoring and lead generation' },
      { id: 'deep-miner', name: 'Deep Miner', role: 'Exhaustive statistical analysis' },
      { id: 'connection', name: 'Connection Agent', role: 'Cross-domain pattern detection' },
      { id: 'mechanism', name: 'Mechanism Agent', role: 'Explanatory theory development' },
      { id: 'synthesis', name: 'Synthesis Agent', role: 'Research report generation' },
    ],
    schemas: [
      { id: 'nde', name: 'NDE', description: 'Near-death experiences with veridical perception tracking' },
      { id: 'ganzfeld', name: 'Ganzfeld', description: 'Controlled telepathy experiments' },
      { id: 'crisis_apparition', name: 'Crisis Apparition', description: 'Spontaneous perception of distant events' },
      { id: 'stargate', name: 'STARGATE', description: 'Declassified remote viewing sessions' },
      { id: 'geophysical', name: 'Geophysical', description: 'Earthquake lights and environmental anomalies' },
      { id: 'ufo', name: 'UFO/UAP', description: 'Unidentified aerial phenomena reports' },
    ],
    dataSources: [
      { id: 'nderf', name: 'NDERF', type: 'scraper', url: 'https://nderf.org' },
      { id: 'nuforc', name: 'NUFORC', type: 'scraper', url: 'https://nuforc.org' },
      { id: 'bfro', name: 'BFRO', type: 'scraper', url: 'https://bfro.net' },
      { id: 'cia-stargate', name: 'CIA STARGATE Archive', type: 'manual' },
      { id: 'usgs', name: 'USGS Earthquake API', type: 'api', url: 'https://earthquake.usgs.gov' },
    ],
  },
  {
    id: 'helios',
    name: 'HELIOS',
    domain: 'Space & Physics',
    tagline: 'Mapping the unknown universe',
    description: 'Analysis of astrophysical anomalies, dark matter candidates, unexplained signals, and fringe physics theories. From SETI data to plasma cosmology debates.',
    icon: '☀️',
    color: 'yellow',
    status: 'planned',
    tier: 1,
    agents: [],
    schemas: [],
    dataSources: [],
  },
  {
    id: 'methuselah',
    name: 'METHUSELAH',
    domain: 'Longevity Research',
    tagline: 'Decoding the aging process',
    description: 'Cross-referencing longevity interventions, centenarian studies, and anti-aging research. Finding patterns in what actually extends healthspan.',
    icon: '🧬',
    color: 'green',
    status: 'planned',
    tier: 1,
    agents: [],
    schemas: [],
    dataSources: [],
  },
  {
    id: 'flora',
    name: 'FLORA',
    domain: 'Plant Intelligence',
    tagline: 'Understanding botanical cognition',
    description: 'Research on plant communication, forest networks, botanical memory, and phytochemical signaling. The hidden intelligence of the green world.',
    icon: '🌱',
    color: 'emerald',
    status: 'planned',
    tier: 1,
    agents: [],
    schemas: [],
    dataSources: [],
  },

  // ==================== TIER 2: Next Up ====================
  {
    id: 'vulcan',
    name: 'VULCAN',
    domain: 'Materials Science',
    tagline: 'Engineering impossible materials',
    description: 'Hunting for room-temperature superconductors, metamaterials, and exotic matter. Separating real breakthroughs from replication failures.',
    icon: '🔨',
    color: 'orange',
    status: 'planned',
    tier: 2,
    agents: [],
    schemas: [],
    dataSources: [],
  },
  {
    id: 'asclepius',
    name: 'ASCLEPIUS',
    domain: 'Drug Repurposing',
    tagline: 'Old drugs, new cures',
    description: 'Finding unexpected therapeutic uses for existing medications. Pattern matching across clinical trials, case reports, and molecular targets.',
    icon: '⚕️',
    color: 'red',
    status: 'planned',
    tier: 2,
    agents: [],
    schemas: [],
    dataSources: [],
  },
  {
    id: 'gaia',
    name: 'GAIA',
    domain: 'Ecology & Climate',
    tagline: 'Earth system patterns',
    description: 'Cross-correlating ecological datasets, climate anomalies, and biodiversity patterns. Finding signals in complex earth systems.',
    icon: '🌍',
    color: 'teal',
    status: 'planned',
    tier: 2,
    agents: [],
    schemas: [],
    dataSources: [],
  },
  {
    id: 'poseidon',
    name: 'POSEIDON',
    domain: 'Ocean Research',
    tagline: 'Depths unknown',
    description: 'Deep sea anomalies, marine biology mysteries, and oceanographic patterns. 80% of the ocean remains unexplored.',
    icon: '🌊',
    color: 'blue',
    status: 'planned',
    tier: 2,
    agents: [],
    schemas: [],
    dataSources: [],
  },

  // ==================== TIER 3: Future ====================
  {
    id: 'chronos',
    name: 'CHRONOS',
    domain: 'Historical Analysis',
    tagline: 'Patterns across time',
    description: 'Cross-referencing historical records, archaeological findings, and ancient texts. Finding patterns mainstream history missed.',
    icon: '⏳',
    color: 'amber',
    status: 'planned',
    tier: 3,
    agents: [],
    schemas: [],
    dataSources: [],
  },
  {
    id: 'daedalus',
    name: 'DAEDALUS',
    domain: 'Aviation Mysteries',
    tagline: 'Sky anomalies decoded',
    description: 'Unexplained aviation incidents, radar anomalies, and aerospace mysteries. From MH370 to foo fighters.',
    icon: '✈️',
    color: 'sky',
    status: 'planned',
    tier: 3,
    agents: [],
    schemas: [],
    dataSources: [],
  },
  {
    id: 'hypnos',
    name: 'HYPNOS',
    domain: 'Sleep & Dreams',
    tagline: 'The dreaming mind',
    description: 'Dream content analysis, sleep anomalies, and consciousness during rest. Precognitive dreams, shared dreams, and sleep phenomena.',
    icon: '🌙',
    color: 'indigo',
    status: 'planned',
    tier: 3,
    agents: [],
    schemas: [],
    dataSources: [],
  },
  {
    id: 'mnemosyne',
    name: 'MNEMOSYNE',
    domain: 'Memory Research',
    tagline: 'How we remember',
    description: 'Anomalous memory phenomena, false memories, past-life memories, and memory enhancement. The mysteries of human recall.',
    icon: '🧠',
    color: 'pink',
    status: 'planned',
    tier: 3,
    agents: [],
    schemas: [],
    dataSources: [],
  },
  {
    id: 'hermes',
    name: 'HERMES',
    domain: 'Prediction Markets',
    tagline: 'Forecasting the future',
    description: 'Analyzing prediction market accuracy, superforecaster patterns, and collective intelligence. What actually predicts the future?',
    icon: '📈',
    color: 'lime',
    status: 'planned',
    tier: 3,
    agents: [],
    schemas: [],
    dataSources: [],
  },
  {
    id: 'thoth',
    name: 'THOTH',
    domain: 'Ancient Languages',
    tagline: 'Decoding the past',
    description: 'Undeciphered scripts, lost languages, and ancient texts. AI-assisted translation and pattern recognition in historical linguistics.',
    icon: '📜',
    color: 'stone',
    status: 'planned',
    tier: 3,
    agents: [],
    schemas: [],
    dataSources: [],
  },
  {
    id: 'orpheus',
    name: 'ORPHEUS',
    domain: 'Music & Audio',
    tagline: 'Patterns in sound',
    description: 'Audio anomalies, unexplained recordings, and music cognition research. From EVP analysis to therapeutic sound patterns.',
    icon: '🎵',
    color: 'violet',
    status: 'planned',
    tier: 3,
    agents: [],
    schemas: [],
    dataSources: [],
  },
];

// ==================== Helper Functions ====================

/**
 * Get only active swarms (for production display)
 */
export function getActiveSwarms(): Swarm[] {
  return SWARMS.filter(s => s.status === 'active');
}

/**
 * Get swarms by tier
 */
export function getSwarmsByTier(tier: SwarmTier): Swarm[] {
  return SWARMS.filter(s => s.tier === tier);
}

/**
 * Get swarms by status
 */
export function getSwarmsByStatus(status: SwarmStatus): Swarm[] {
  return SWARMS.filter(s => s.status === status);
}

/**
 * Get a single swarm by ID
 */
export function getSwarmById(id: string): Swarm | undefined {
  return SWARMS.find(s => s.id === id);
}

/**
 * Get count of swarms by status
 */
export function getSwarmCounts(): { active: number; development: number; planned: number; total: number } {
  return {
    active: SWARMS.filter(s => s.status === 'active').length,
    development: SWARMS.filter(s => s.status === 'development').length,
    planned: SWARMS.filter(s => s.status === 'planned').length,
    total: SWARMS.length,
  };
}
