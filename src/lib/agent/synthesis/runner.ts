/**
 * Synthesis Agent - Runner
 * Main orchestration for research report generation
 */

import { getAdminClient } from '../supabase-admin';
import type { SynthesisSession, SynthesisAgentConfig } from './types';
import { generateDomainDeepDive, saveDomainDeepDive } from './domain-deep-dive';
import { generateCrossDomainSynthesis, saveCrossDomainSynthesis, getSynthesisThemes } from './cross-domain-synthesizer';
import { generateResearchBrief, saveResearchBrief } from './research-brief-generator';


const DEFAULT_DOMAINS = ['nde', 'ufo', 'ganzfeld', 'haunting', 'bigfoot'];

/**
 * Synthesis Agent class
 */
export class SynthesisAgent {
  private config: SynthesisAgentConfig;
  private sessionId: string | null = null;
  private session: SynthesisSession | null = null;

  constructor(config: Partial<SynthesisAgentConfig> = {}) {
    this.config = {
      domains: config.domains || DEFAULT_DOMAINS,
      synthesis_types: config.synthesis_types || ['domain_deep_dive', 'cross_domain', 'research_brief'],
      target_audience: config.target_audience,
    };
  }

  /**
   * Create a new session
   */
  private async createSession(): Promise<void> {
    const { data, error } = await getAdminClient()
      .from('aletheia_synthesis_sessions')
      .insert({
        status: 'running',
        domains_analyzed: this.config.domains,
        synthesis_types: this.config.synthesis_types,
      })
      .select('id')
      .single();

    if (error) {
      throw new Error(`Failed to create session: ${error.message}`);
    }

    this.sessionId = data.id;
    this.session = {
      id: data.id,
      status: 'running',
      domains_analyzed: this.config.domains,
      synthesis_types: this.config.synthesis_types,
      deep_dives_generated: 0,
      syntheses_generated: 0,
      briefs_generated: 0,
      key_findings: [],
    };
  }

  /**
   * Update session stats
   */
  private async updateSession(updates: Partial<SynthesisSession>): Promise<void> {
    if (!this.sessionId) return;

    const { error } = await getAdminClient()
      .from('aletheia_synthesis_sessions')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', this.sessionId);

    if (error) {
      console.error('Update session error:', error);
    }

    if (this.session) {
      Object.assign(this.session, updates);
    }
  }

  /**
   * Complete the session
   */
  private async completeSession(status: 'completed' | 'failed', summary?: string): Promise<void> {
    if (!this.sessionId) return;

    await getAdminClient()
      .from('aletheia_synthesis_sessions')
      .update({
        status,
        ended_at: new Date().toISOString(),
        key_findings: this.session?.key_findings,
        summary,
      })
      .eq('id', this.sessionId);
  }

  /**
   * Add a key finding
   */
  private addKeyFinding(finding: string, domains: string[]): void {
    if (!this.session) return;
    if (!this.session.key_findings) {
      this.session.key_findings = [];
    }
    this.session.key_findings.push({ finding, domains });
  }

  /**
   * Generate domain deep dives
   */
  private async generateDeepDives(): Promise<number> {
    console.log('[Synthesis] Generating domain deep dives...');
    let generated = 0;

    for (const domain of this.config.domains) {
      const deepDive = await generateDomainDeepDive(domain);
      if (deepDive) {
        const id = await saveDomainDeepDive(deepDive, this.sessionId || undefined);
        if (id) {
          generated++;
          // Track key findings
          if (deepDive.consensus_findings && deepDive.consensus_findings.length > 0) {
            this.addKeyFinding(deepDive.consensus_findings[0], [domain]);
          }
        }
      }
    }

    return generated;
  }

  /**
   * Generate cross-domain syntheses
   */
  private async generateSyntheses(): Promise<number> {
    console.log('[Synthesis] Generating cross-domain syntheses...');
    let generated = 0;

    // Generate syntheses for relevant themes
    const themes = getSynthesisThemes();
    for (const theme of themes) {
      // Check if we have data for at least 2 relevant domains
      const relevantDomains = theme.relevant_domains.filter(d =>
        this.config.domains.includes(d)
      );

      if (relevantDomains.length >= 2) {
        const synthesis = await generateCrossDomainSynthesis(theme.id, relevantDomains);
        if (synthesis) {
          const id = await saveCrossDomainSynthesis(synthesis, this.sessionId || undefined);
          if (id) {
            generated++;
            // Track key findings
            if (synthesis.cross_cutting_patterns && synthesis.cross_cutting_patterns.length > 0) {
              const pattern = synthesis.cross_cutting_patterns[0];
              this.addKeyFinding(pattern.pattern, pattern.domains);
            }
          }
        }
      }
    }

    return generated;
  }

  /**
   * Generate research briefs
   */
  private async generateBriefs(): Promise<number> {
    console.log('[Synthesis] Generating research briefs...');
    let generated = 0;

    // Generate for target audience or default audiences
    const audiences = this.config.target_audience
      ? [this.config.target_audience]
      : ['academic_researcher', 'general_public'];

    for (const audience of audiences) {
      const brief = await generateResearchBrief(audience as any, this.config.domains);
      if (brief) {
        const id = await saveResearchBrief(brief, this.sessionId || undefined);
        if (id) {
          generated++;
        }
      }
    }

    return generated;
  }

  /**
   * Generate summary
   */
  private generateSummary(): string {
    if (!this.session) return '';

    const parts: string[] = [
      `Synthesis complete for ${this.config.domains.length} domains`,
    ];

    if (this.session.deep_dives_generated > 0) {
      parts.push(`Generated ${this.session.deep_dives_generated} domain deep dives`);
    }

    if (this.session.syntheses_generated > 0) {
      parts.push(`Generated ${this.session.syntheses_generated} cross-domain syntheses`);
    }

    if (this.session.briefs_generated > 0) {
      parts.push(`Generated ${this.session.briefs_generated} research briefs`);
    }

    const keyFindingsCount = this.session.key_findings?.length || 0;
    if (keyFindingsCount > 0) {
      parts.push(`Identified ${keyFindingsCount} key findings`);
    }

    return parts.join('. ') + '.';
  }

  /**
   * Run the Synthesis Agent
   */
  async run(): Promise<string> {
    try {
      await this.createSession();
      console.log(`[Synthesis] Session started: ${this.sessionId}`);

      // Generate domain deep dives
      if (this.config.synthesis_types.includes('domain_deep_dive')) {
        const deepDives = await this.generateDeepDives();
        await this.updateSession({ deep_dives_generated: deepDives });
      }

      // Generate cross-domain syntheses
      if (this.config.synthesis_types.includes('cross_domain')) {
        const syntheses = await this.generateSyntheses();
        await this.updateSession({ syntheses_generated: syntheses });
      }

      // Generate research briefs
      if (this.config.synthesis_types.includes('research_brief')) {
        const briefs = await this.generateBriefs();
        await this.updateSession({ briefs_generated: briefs });
      }

      // Complete session
      const summary = this.generateSummary();
      await this.completeSession('completed', summary);

      console.log(`[Synthesis] Session completed: ${summary}`);
      return this.sessionId!;
    } catch (error) {
      console.error('[Synthesis] Session failed:', error);
      await this.completeSession('failed', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }
}

/**
 * Run Synthesis Agent with default settings
 */
export async function runSynthesisAgent(
  domains?: string[],
  synthesisTypes?: ('domain_deep_dive' | 'cross_domain' | 'research_brief')[]
): Promise<string> {
  const agent = new SynthesisAgent({
    domains,
    synthesis_types: synthesisTypes,
  });
  return agent.run();
}

/**
 * Get Synthesis Agent sessions
 */
export async function getSynthesisSessions(limit: number = 20): Promise<SynthesisSession[]> {
  const { data, error } = await getAdminClient()
    .from('aletheia_synthesis_sessions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Get synthesis sessions error:', error);
    return [];
  }

  return data || [];
}

/**
 * Get Synthesis Agent session by ID
 */
export async function getSynthesisSession(id: string): Promise<SynthesisSession | null> {
  const { data, error } = await getAdminClient()
    .from('aletheia_synthesis_sessions')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Get synthesis session error:', error);
    return null;
  }

  return data;
}
