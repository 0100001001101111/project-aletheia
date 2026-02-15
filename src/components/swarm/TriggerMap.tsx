'use client';

import { getAgentMeta } from '@/lib/agent-meta';

interface TriggerStatus {
  trigger_id: string;
  last_checked: string | null;
  last_fired: string | null;
  condition_met: boolean;
  blocked_by_dedup: boolean;
  fire_count: number;
}

interface TriggerMapProps {
  triggers: TriggerStatus[];
}

/**
 * Static metadata for triggers — maps trigger_id to human-readable info.
 * This data lives in the Pi's trigger_map.json; we mirror it here for display.
 */
const TRIGGER_META: Record<string, { watches: string; agent: string }> = {
  'rongorongo-download': { watches: '/data/datasets/thoth/rongorongo/', agent: 'thoth' },
  'earthquake-catalog-update': { watches: '/data/datasets/gaia/earthquake*.csv', agent: 'gaia' },
  'kp-data-to-deepminer': { watches: '/data/datasets/helios/kp_index*.csv', agent: 'deep-miner' },
  'sunspot-to-helios': { watches: '/data/datasets/helios/sunspot*.csv', agent: 'helios' },
  'ocean-temp-to-poseidon': { watches: '/data/datasets/poseidon/ocean_temp*', agent: 'poseidon' },
  'plate-boundaries-to-gaia': { watches: '/data/datasets/gaia/plate_boundaries*', agent: 'gaia' },
  'ufo-sightings-to-phaethon': { watches: '/data/datasets/phaethon/ufo_sightings*', agent: 'phaethon' },
  'dreambank-to-chronos': { watches: '/data/datasets/chronos/dreambank*', agent: 'chronos' },
  'finding-approved-to-publisher': { watches: 'aletheia_agent_findings (approved)', agent: 'publisher' },
  'whispers-to-poseidon': { watches: '/data/datasets/poseidon/whispers*', agent: 'poseidon' },
};

function relativeTime(dateStr: string | null): string {
  if (!dateStr) return 'Never';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function getStatusInfo(trigger: TriggerStatus): { label: string; color: string } {
  if (trigger.last_fired && trigger.fire_count > 0) {
    const firedRecently = trigger.last_fired
      ? (Date.now() - new Date(trigger.last_fired).getTime()) < 7 * 24 * 60 * 60 * 1000
      : false;
    if (firedRecently) return { label: 'Fired', color: 'text-emerald-400' };
  }
  if (trigger.condition_met && trigger.blocked_by_dedup) return { label: 'Blocked (dedup)', color: 'text-yellow-400' };
  if (trigger.condition_met) return { label: 'Condition met', color: 'text-yellow-400' };
  return { label: 'Watching', color: 'text-zinc-500' };
}

export function TriggerMap({ triggers }: TriggerMapProps) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
      <h3 className="text-sm font-semibold text-zinc-200 mb-4">Data Flow / Trigger Map</h3>

      {triggers.length === 0 ? (
        <p className="text-xs text-zinc-600 py-4 text-center">No triggers configured</p>
      ) : (
        <div className="overflow-x-auto -mx-5 px-5">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-zinc-500 border-b border-zinc-800">
                <th className="text-left py-2 pr-3 font-medium">Trigger</th>
                <th className="text-left py-2 pr-3 font-medium">Watches</th>
                <th className="text-left py-2 pr-3 font-medium">Agent</th>
                <th className="text-left py-2 pr-3 font-medium">Status</th>
                <th className="text-right py-2 font-medium">Last Fired</th>
              </tr>
            </thead>
            <tbody>
              {triggers.map(trigger => {
                const meta = TRIGGER_META[trigger.trigger_id] || { watches: '-', agent: '-' };
                const agentMeta = getAgentMeta(meta.agent);
                const status = getStatusInfo(trigger);
                return (
                  <tr key={trigger.trigger_id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                    <td className="py-2 pr-3 text-zinc-300 font-mono">{trigger.trigger_id}</td>
                    <td className="py-2 pr-3 text-zinc-500 font-mono max-w-[200px] truncate" title={meta.watches}>
                      {meta.watches}
                    </td>
                    <td className="py-2 pr-3">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] ${agentMeta.badge}`}>{agentMeta.name}</span>
                    </td>
                    <td className={`py-2 pr-3 ${status.color}`}>{status.label}</td>
                    <td className="py-2 text-right text-zinc-500">{relativeTime(trigger.last_fired)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
