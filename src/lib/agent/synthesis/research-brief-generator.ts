/**
 * Synthesis Agent - Research Brief Generator
 * Generate audience-specific research briefs
 */

import { getAdminClient } from '../supabase-admin';
import Anthropic from '@anthropic-ai/sdk';
import type { ResearchBrief, AudienceType, ContactSuggestion } from './types';


// Audience-specific templates
const AUDIENCE_TEMPLATES: Record<AudienceType, {
  title_prefix: string;
  tone: string;
  focus_areas: string[];
  action_types: string[];
}> = {
  academic_researcher: {
    title_prefix: 'Research Summary',
    tone: 'technical and precise, with statistical details',
    focus_areas: ['methodology', 'statistical findings', 'replication needs', 'theoretical implications'],
    action_types: ['propose replication study', 'collaborate on analysis', 'share data'],
  },
  funding_body: {
    title_prefix: 'Funding Brief',
    tone: 'clear and impact-focused',
    focus_areas: ['significance', 'feasibility', 'expected outcomes', 'budget considerations'],
    action_types: ['fund research', 'request proposal', 'arrange presentation'],
  },
  journalist: {
    title_prefix: 'Press Brief',
    tone: 'accessible and newsworthy',
    focus_areas: ['key findings', 'human interest', 'broader implications', 'expert quotes'],
    action_types: ['interview researcher', 'write story', 'fact-check claims'],
  },
  policymaker: {
    title_prefix: 'Policy Brief',
    tone: 'evidence-based with policy implications',
    focus_areas: ['public interest', 'regulatory relevance', 'risk assessment', 'recommendations'],
    action_types: ['request briefing', 'commission review', 'consult experts'],
  },
  general_public: {
    title_prefix: 'Research Highlights',
    tone: 'accessible and engaging',
    focus_areas: ['what we learned', 'why it matters', 'what comes next', 'how to participate'],
    action_types: ['share information', 'participate in study', 'contact researchers'],
  },
  practitioner: {
    title_prefix: 'Practitioner Guide',
    tone: 'practical and actionable',
    focus_areas: ['clinical relevance', 'assessment tools', 'intervention implications', 'case studies'],
    action_types: ['apply findings', 'refer patients', 'report cases'],
  },
};

// Known experts by domain
const DOMAIN_EXPERTS: Record<string, ContactSuggestion[]> = {
  nde: [
    { name: 'Bruce Greyson', affiliation: 'University of Virginia', relevance: 'NDE research pioneer', contact_type: 'expert' },
    { name: 'Sam Parnia', affiliation: 'NYU Langone', relevance: 'AWARE study lead', contact_type: 'expert' },
    { name: 'Pim van Lommel', affiliation: 'Rijnstate Hospital', relevance: 'Prospective NDE studies', contact_type: 'expert' },
  ],
  ufo: [
    { name: 'Jacques Vallée', affiliation: 'Independent', relevance: 'UFO pattern analysis', contact_type: 'expert' },
    { name: 'Garry Nolan', affiliation: 'Stanford University', relevance: 'UAP materials analysis', contact_type: 'expert' },
  ],
  ganzfeld: [
    { name: 'Daryl Bem', affiliation: 'Cornell University', relevance: 'Psi meta-analyses', contact_type: 'expert' },
    { name: 'Dean Radin', affiliation: 'IONS', relevance: 'Consciousness research', contact_type: 'expert' },
  ],
  haunting: [
    { name: 'Christopher French', affiliation: 'Goldsmiths', relevance: 'Anomalistic psychology', contact_type: 'expert' },
  ],
};

/**
 * Get key findings from recent analyses
 */
async function getKeyFindings(): Promise<Array<{ finding: string; domain: string; strength: string }>> {
  const findings: Array<{ finding: string; domain: string; strength: string }> = [];

  // Get from cross-domain correlations
  const { data: correlations } = await getAdminClient()
    .from('aletheia_cross_domain_correlations')
    .select('domain_a, domain_b, correlation_type, correlation_coefficient, is_significant')
    .eq('is_significant', true)
    .order('correlation_coefficient', { ascending: false })
    .limit(5);

  (correlations || []).forEach(c => {
    findings.push({
      finding: `${c.domain_a} and ${c.domain_b} show ${c.correlation_type} correlation (r=${c.correlation_coefficient.toFixed(3)})`,
      domain: `${c.domain_a}, ${c.domain_b}`,
      strength: c.correlation_coefficient > 0.3 ? 'strong' : 'moderate',
    });
  });

  // Get from Keel tests
  const { data: keelTests } = await getAdminClient()
    .from('aletheia_keel_tests')
    .select('test_name, supports_keel_hypothesis, overall_correlation')
    .eq('supports_keel_hypothesis', true)
    .order('overall_correlation', { ascending: false })
    .limit(3);

  (keelTests || []).forEach(k => {
    findings.push({
      finding: `${k.test_name} supports cross-domain correlation hypothesis`,
      domain: 'multiple',
      strength: k.overall_correlation > 0.3 ? 'strong' : 'moderate',
    });
  });

  return findings;
}

/**
 * Get total records analyzed
 */
async function getTotalRecordsAnalyzed(): Promise<number> {
  const { count } = await getAdminClient()
    .from('aletheia_investigations')
    .select('*', { count: 'exact', head: true });

  return count || 0;
}

/**
 * Generate brief content using AI
 */
async function generateBriefContent(
  audience: AudienceType,
  findings: Array<{ finding: string; domain: string }>,
  totalRecords: number,
  template: typeof AUDIENCE_TEMPLATES[AudienceType]
): Promise<{ summary: string; takeaways: string[] }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      summary: `Analysis of ${totalRecords} records across multiple domains of anomalous phenomena research.`,
      takeaways: findings.slice(0, 3).map(f => f.finding),
    };
  }

  const anthropic = new Anthropic({ apiKey });

  const findingsList = findings.map(f => `- ${f.finding}`).join('\n');

  const prompt = `Generate a research brief for ${audience.replace('_', ' ')} audience.

Total records analyzed: ${totalRecords}
Key findings:
${findingsList || 'Analysis ongoing'}

Write in a ${template.tone} tone.
Focus on: ${template.focus_areas.join(', ')}

Return JSON with:
{
  "summary": "2-3 paragraph summary appropriate for this audience",
  "takeaways": ["3-5 key takeaways as bullet points"]
}`;

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = message.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        summary: parsed.summary,
        takeaways: parsed.takeaways,
      };
    }
    throw new Error('No JSON found');
  } catch (error) {
    console.error('Brief generation error:', error);
    return {
      summary: `Analysis of ${totalRecords} records across multiple domains.`,
      takeaways: findings.slice(0, 3).map(f => f.finding),
    };
  }
}

/**
 * Generate a research brief
 */
export async function generateResearchBrief(
  audience: AudienceType,
  focusDomains?: string[]
): Promise<ResearchBrief | null> {
  const template = AUDIENCE_TEMPLATES[audience];
  if (!template) {
    console.log('Unknown audience type');
    return null;
  }

  // Get key findings
  const findings = await getKeyFindings();

  // Filter by domains if specified
  const filteredFindings = focusDomains
    ? findings.filter(f => focusDomains.some(d => f.domain.includes(d)))
    : findings;

  // Get total records
  const totalRecords = await getTotalRecordsAnalyzed();

  // Generate content
  const { summary, takeaways } = await generateBriefContent(
    audience,
    filteredFindings,
    totalRecords,
    template
  );

  // Get relevant contacts
  const contacts: ContactSuggestion[] = [];
  const domains = focusDomains || ['nde', 'ufo', 'ganzfeld'];
  domains.forEach(d => {
    const experts = DOMAIN_EXPERTS[d] || [];
    contacts.push(...experts.slice(0, 2));
  });

  // Build recommended actions
  const actions = template.action_types.map(type => {
    switch (type) {
      case 'propose replication study':
        return 'Consider replicating key findings with independent datasets';
      case 'collaborate on analysis':
        return 'Contact research team for collaboration opportunities';
      case 'share data':
        return 'Contribute data through our standardized submission portal';
      case 'fund research':
        return 'Support continued data collection and analysis efforts';
      case 'request proposal':
        return 'Request a detailed research proposal for funding consideration';
      case 'interview researcher':
        return 'Contact lead researchers for interviews';
      case 'write story':
        return 'Access our press materials for accurate reporting';
      case 'request briefing':
        return 'Schedule a briefing with the research team';
      case 'participate in study':
        return 'Share your experience through our secure reporting system';
      default:
        return type;
    }
  });

  return {
    title: `${template.title_prefix}: Anomalous Phenomena Research`,
    audience,
    key_takeaways: takeaways,
    summary,
    background: 'This brief summarizes findings from a comprehensive analysis of anomalous phenomena reports across multiple domains, including near-death experiences, UFO sightings, haunting reports, and psi phenomena.',
    supporting_data: {
      total_records: totalRecords,
      domains_analyzed: domains,
      findings_count: filteredFindings.length,
    },
    source_references: [
      'Aletheia Platform database',
      'Cross-domain correlation analysis',
      'Keel hypothesis testing framework',
    ],
    recommended_actions: actions,
    contact_suggestions: contacts.slice(0, 5),
    status: 'draft',
  };
}

/**
 * Save research brief
 */
export async function saveResearchBrief(
  brief: ResearchBrief,
  sessionId?: string
): Promise<string | null> {
  const { data, error } = await getAdminClient()
    .from('aletheia_research_briefs')
    .insert({
      session_id: sessionId,
      title: brief.title,
      audience: brief.audience,
      key_takeaways: brief.key_takeaways,
      summary: brief.summary,
      background: brief.background,
      supporting_data: brief.supporting_data,
      source_references: brief.source_references,
      recommended_actions: brief.recommended_actions,
      contact_suggestions: brief.contact_suggestions,
      status: brief.status || 'draft',
    })
    .select('id')
    .single();

  if (error) {
    console.error('Save research brief error:', error);
    return null;
  }

  return data.id;
}

/**
 * Get research briefs
 */
export async function getResearchBriefs(options: {
  audience?: AudienceType;
  status?: string;
  limit?: number;
}): Promise<ResearchBrief[]> {
  let query = getAdminClient()
    .from('aletheia_research_briefs')
    .select('*')
    .order('created_at', { ascending: false });

  if (options.audience) {
    query = query.eq('audience', options.audience);
  }
  if (options.status) {
    query = query.eq('status', options.status);
  }

  const { data, error } = await query.limit(options.limit || 20);

  if (error) {
    console.error('Get research briefs error:', error);
    return [];
  }

  return data || [];
}

/**
 * Get available audience types
 */
export function getAudienceTypes(): AudienceType[] {
  return Object.keys(AUDIENCE_TEMPLATES) as AudienceType[];
}
