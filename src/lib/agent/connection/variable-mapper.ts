/**
 * Connection Agent - Variable Mapper
 * Find semantic links between variables across domains
 */

import Anthropic from '@anthropic-ai/sdk';
import { getAdminClient } from '../supabase-admin';
import type { VariableMapping, MappingType, DomainSemantics } from './types';


// Predefined domain semantics for common concepts
const DOMAIN_SEMANTICS: DomainSemantics[] = [
  {
    domain: 'nde',
    concepts: [
      {
        name: 'light_experience',
        variables: ['bright_light', 'light_tunnel', 'golden_light', 'being_of_light'],
        description: 'Experience of bright or supernatural light',
      },
      {
        name: 'out_of_body',
        variables: ['obe', 'floating', 'above_body', 'separation', 'detachment'],
        description: 'Feeling of leaving the physical body',
      },
      {
        name: 'entity_encounter',
        variables: ['deceased_relatives', 'beings', 'guides', 'angels'],
        description: 'Meeting non-physical entities',
      },
      {
        name: 'altered_time',
        variables: ['time_distortion', 'timelessness', 'life_review'],
        description: 'Perception of altered time flow',
      },
      {
        name: 'boundary',
        variables: ['point_of_no_return', 'barrier', 'choice_to_return'],
        description: 'Reaching a boundary or limit',
      },
    ],
  },
  {
    domain: 'ufo',
    concepts: [
      {
        name: 'light_experience',
        variables: ['bright_lights', 'beam_of_light', 'glowing', 'illumination'],
        description: 'Observation of unusual lights',
      },
      {
        name: 'out_of_body',
        variables: ['floating', 'levitation', 'abduction_lift', 'paralysis'],
        description: 'Loss of physical control or floating sensation',
      },
      {
        name: 'entity_encounter',
        variables: ['beings', 'occupants', 'grays', 'humanoids', 'aliens'],
        description: 'Observation of non-human entities',
      },
      {
        name: 'altered_time',
        variables: ['missing_time', 'time_loss', 'temporal_anomaly'],
        description: 'Unexplained gaps in time perception',
      },
      {
        name: 'boundary',
        variables: ['craft_interior', 'threshold', 'return'],
        description: 'Entering or leaving a contained space',
      },
    ],
  },
  {
    domain: 'ganzfeld',
    concepts: [
      {
        name: 'light_experience',
        variables: ['red_field', 'visual_phenomena', 'colors'],
        description: 'Visual experiences during sensory deprivation',
      },
      {
        name: 'altered_state',
        variables: ['relaxation', 'trance', 'altered_consciousness', 'hypnagogic'],
        description: 'Altered state of consciousness',
      },
      {
        name: 'information_transfer',
        variables: ['hit', 'target_match', 'correspondence'],
        description: 'Apparent transfer of information',
      },
    ],
  },
  {
    domain: 'haunting',
    concepts: [
      {
        name: 'light_experience',
        variables: ['orbs', 'glowing', 'anomalous_lights'],
        description: 'Unexplained light phenomena',
      },
      {
        name: 'entity_encounter',
        variables: ['apparition', 'ghost', 'figure', 'presence'],
        description: 'Perception of non-physical entity',
      },
      {
        name: 'altered_state',
        variables: ['cold_spot', 'dread', 'unease', 'electromagnetic'],
        description: 'Unusual physical or emotional sensations',
      },
    ],
  },
  {
    domain: 'crisis_apparition',
    concepts: [
      {
        name: 'entity_encounter',
        variables: ['apparition', 'vision', 'perceiving_person'],
        description: 'Seeing someone at moment of crisis',
      },
      {
        name: 'information_transfer',
        variables: ['message', 'communication', 'knowing'],
        description: 'Receiving information about distant event',
      },
      {
        name: 'temporal_link',
        variables: ['synchronicity', 'death_moment', 'crisis_time'],
        description: 'Correlation with actual event timing',
      },
    ],
  },
];

/**
 * Find semantic mappings between domains using predefined concepts
 */
export function findSemanticMappings(
  sourceDomain: string,
  targetDomain: string
): VariableMapping[] {
  const sourceSemantics = DOMAIN_SEMANTICS.find(d => d.domain === sourceDomain);
  const targetSemantics = DOMAIN_SEMANTICS.find(d => d.domain === targetDomain);

  if (!sourceSemantics || !targetSemantics) {
    return [];
  }

  const mappings: VariableMapping[] = [];

  // Find matching concepts
  for (const sourceConcept of sourceSemantics.concepts) {
    const matchingConcept = targetSemantics.concepts.find(
      tc => tc.name === sourceConcept.name
    );

    if (matchingConcept) {
      // Create mappings between variables in the same concept
      for (const sourceVar of sourceConcept.variables) {
        for (const targetVar of matchingConcept.variables) {
          mappings.push({
            source_domain: sourceDomain,
            source_variable: sourceVar,
            source_description: sourceConcept.description,
            target_domain: targetDomain,
            target_variable: targetVar,
            target_description: matchingConcept.description,
            mapping_type: 'semantic',
            mapping_strength: 0.7, // Base strength for same-concept
            mapping_rationale: `Both relate to "${sourceConcept.name}" concept`,
            confidence_score: 0.6,
            created_by: 'agent',
          });
        }
      }
    }
  }

  return mappings;
}

/**
 * Use Claude to discover novel variable mappings
 */
export async function discoverMappingsWithAI(
  sourceDomain: string,
  sourceVariables: string[],
  targetDomain: string,
  targetVariables: string[]
): Promise<VariableMapping[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.log('ANTHROPIC_API_KEY not configured, skipping AI mapping');
    return [];
  }

  const anthropic = new Anthropic({ apiKey });

  const prompt = `You are analyzing anomalous phenomena research data.

Given variables from two different domains, identify potential semantic links - variables that might represent similar underlying phenomena despite different terminology.

Source Domain: ${sourceDomain}
Source Variables: ${sourceVariables.slice(0, 30).join(', ')}

Target Domain: ${targetDomain}
Target Variables: ${targetVariables.slice(0, 30).join(', ')}

For each meaningful mapping, provide:
1. source_variable
2. target_variable
3. mapping_type: semantic (meaning), structural (data shape), temporal (time-related), experiential (subjective experience), physical (physical phenomenon)
4. mapping_strength: 0-1 (how strong is the connection)
5. rationale: brief explanation

Return JSON array of mappings. Only include mappings with strength >= 0.5.
Focus on the most theoretically interesting connections.

Example output:
[
  {
    "source_variable": "bright_light",
    "target_variable": "beam_of_light",
    "mapping_type": "experiential",
    "mapping_strength": 0.8,
    "rationale": "Both describe perception of anomalous bright light"
  }
]`;

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = message.content[0];
    if (content.type !== 'text') return [];

    const jsonMatch = content.text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];

    const parsed = JSON.parse(jsonMatch[0]) as Array<{
      source_variable: string;
      target_variable: string;
      mapping_type: string;
      mapping_strength: number;
      rationale: string;
    }>;

    return parsed.map(m => ({
      source_domain: sourceDomain,
      source_variable: m.source_variable,
      target_domain: targetDomain,
      target_variable: m.target_variable,
      mapping_type: m.mapping_type as MappingType,
      mapping_strength: m.mapping_strength,
      mapping_rationale: m.rationale,
      confidence_score: 0.7,
      created_by: 'agent_ai',
    }));
  } catch (error) {
    console.error('AI mapping discovery error:', error);
    return [];
  }
}

/**
 * Save variable mappings to database
 */
export async function saveMappings(mappings: VariableMapping[]): Promise<number> {
  if (mappings.length === 0) return 0;

  const { data, error } = await getAdminClient()
    .from('aletheia_variable_mappings')
    .insert(mappings)
    .select('id');

  if (error) {
    console.error('Save mappings error:', error);
    return 0;
  }

  return data?.length || 0;
}

/**
 * Get existing mappings between domains
 */
export async function getMappings(
  sourceDomain?: string,
  targetDomain?: string,
  minStrength?: number
): Promise<VariableMapping[]> {
  let query = getAdminClient()
    .from('aletheia_variable_mappings')
    .select('*')
    .order('mapping_strength', { ascending: false });

  if (sourceDomain) {
    query = query.eq('source_domain', sourceDomain);
  }
  if (targetDomain) {
    query = query.eq('target_domain', targetDomain);
  }
  if (minStrength !== undefined) {
    query = query.gte('mapping_strength', minStrength);
  }

  const { data, error } = await query.limit(100);

  if (error) {
    console.error('Get mappings error:', error);
    return [];
  }

  return data || [];
}

/**
 * Get all unique domains from semantics
 */
export function getKnownDomains(): string[] {
  return DOMAIN_SEMANTICS.map(d => d.domain);
}

/**
 * Get domain semantics
 */
export function getDomainSemantics(domain: string): DomainSemantics | undefined {
  return DOMAIN_SEMANTICS.find(d => d.domain === domain);
}
