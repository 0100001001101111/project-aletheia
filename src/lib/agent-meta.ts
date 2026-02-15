/**
 * Agent metadata - names, descriptions, and Tailwind color classes
 * Used by /agent-review pages
 */

export interface AgentMeta {
  name: string;
  description: string;
  badge: string;
  dot: string;
}

export const AGENT_META: Record<string, AgentMeta> = {
  argus: { name: 'Argus', description: 'Coordinator. Assigns tasks, manages workflow', badge: 'bg-violet-500/15 text-violet-400', dot: 'bg-violet-500' },
  'deep-miner': { name: 'Deep Miner', description: 'Statistical analysis within domains', badge: 'bg-amber-500/15 text-amber-400', dot: 'bg-amber-500' },
  discovery: { name: 'Discovery', description: 'Literature search and dataset survey', badge: 'bg-blue-500/15 text-blue-400', dot: 'bg-blue-500' },
  connection: { name: 'Connection', description: 'Cross-domain pattern matching', badge: 'bg-indigo-500/15 text-indigo-400', dot: 'bg-indigo-500' },
  mechanism: { name: 'Mechanism', description: 'Theory testing and experimental design', badge: 'bg-emerald-500/15 text-emerald-400', dot: 'bg-emerald-500' },
  synthesis: { name: 'Synthesis', description: 'Report generation and research briefs', badge: 'bg-rose-500/15 text-rose-400', dot: 'bg-rose-500' },
  flora: { name: 'Flora', description: 'Plant intelligence and bioelectric research', badge: 'bg-green-500/15 text-green-400', dot: 'bg-green-500' },
  helios: { name: 'Helios', description: 'Space physics and solar correlations', badge: 'bg-yellow-500/15 text-yellow-400', dot: 'bg-yellow-500' },
  methuselah: { name: 'Methuselah', description: 'Longevity and aging research', badge: 'bg-orange-500/15 text-orange-400', dot: 'bg-orange-500' },
  librarian: { name: 'Librarian', description: 'Paper retrieval and verification', badge: 'bg-sky-500/15 text-sky-400', dot: 'bg-sky-500' },
  skeptic: { name: 'Skeptic', description: 'Quality auditing and error detection', badge: 'bg-red-500/15 text-red-400', dot: 'bg-red-500' },
  mnemosyne: { name: 'Mnemosyne', description: 'Memory and cognition research', badge: 'bg-purple-500/15 text-purple-400', dot: 'bg-purple-500' },
  orpheus: { name: 'Orpheus', description: 'Consciousness and altered states', badge: 'bg-cyan-500/15 text-cyan-400', dot: 'bg-cyan-500' },
  hypnos: { name: 'Hypnos', description: 'Sleep and dream research', badge: 'bg-teal-500/15 text-teal-400', dot: 'bg-teal-500' },
  hermes: { name: 'Hermes', description: 'Prediction tracking and forecasting', badge: 'bg-lime-500/15 text-lime-400', dot: 'bg-lime-500' },
  thoth: { name: 'Thoth', description: 'Historical and archival research', badge: 'bg-amber-600/15 text-amber-300', dot: 'bg-amber-600' },
  chronos: { name: 'Chronos', description: 'Temporal pattern analysis', badge: 'bg-fuchsia-500/15 text-fuchsia-400', dot: 'bg-fuchsia-500' },
  daedalus: { name: 'Daedalus', description: 'Engineering and methodology design', badge: 'bg-pink-500/15 text-pink-400', dot: 'bg-pink-500' },
  vulcan: { name: 'Vulcan', description: 'EM shielding and equipment specs', badge: 'bg-orange-600/15 text-orange-300', dot: 'bg-orange-600' },
  gaia: { name: 'Gaia', description: 'Earth sciences and environmental data', badge: 'bg-emerald-600/15 text-emerald-300', dot: 'bg-emerald-600' },
  poseidon: { name: 'Poseidon', description: 'Ocean and water-related research', badge: 'bg-blue-600/15 text-blue-300', dot: 'bg-blue-600' },
  asclepius: { name: 'Asclepius', description: 'Medical and physiological research', badge: 'bg-rose-600/15 text-rose-300', dot: 'bg-rose-600' },
  aether: { name: 'Aether', description: 'Atmospheric and upper-atmosphere phenomena', badge: 'bg-sky-600/15 text-sky-300', dot: 'bg-sky-600' },
  phaethon: { name: 'Phaethon', description: 'UFO/UAP sighting analysis and correlation', badge: 'bg-amber-500/15 text-amber-300', dot: 'bg-amber-500' },
  publisher: { name: 'Publisher', description: 'Approved findings to public reports', badge: 'bg-lime-600/15 text-lime-300', dot: 'bg-lime-600' },
};

const FALLBACK: AgentMeta = { name: 'Unknown', description: '', badge: 'bg-zinc-500/15 text-zinc-400', dot: 'bg-zinc-500' };

export function getAgentMeta(agentId: string | null): AgentMeta {
  if (!agentId) return FALLBACK;
  return AGENT_META[agentId] || {
    name: agentId.charAt(0).toUpperCase() + agentId.slice(1),
    description: '',
    badge: 'bg-zinc-500/15 text-zinc-400',
    dot: 'bg-zinc-500',
  };
}

export const DESTINATION_TYPES = [
  { value: '', label: 'All Types' },
  { value: 'investigation', label: 'Investigation' },
  { value: 'prediction', label: 'Prediction' },
  { value: 'pattern', label: 'Pattern' },
  { value: 'research_brief', label: 'Research Brief' },
  { value: 'informational', label: 'Informational' },
];
