/**
 * Mechanism Agent - Runner
 * Main orchestration for explanatory theory hunting
 */

import { getAdminClient } from '../supabase-admin';
import type { MechanismSession, MechanismAgentConfig, Priority } from './types';
import {
  seedMechanismCatalog,
  getMechanismsByDomain,
  getCrossdomainMechanisms,
} from './mechanism-catalog';
import {
  designTestsForDomain,
  saveDiscriminatingTests,
  designTestWithAI,
} from './test-designer';
import {
  buildUnifiedTheory,
  saveUnifiedTheory,
  proposeUnifiedTheoryWithAI,
} from './theory-builder';


const DEFAULT_DOMAINS = ['nde', 'ufo', 'ganzfeld', 'haunting', 'bigfoot', 'crisis_apparition'];

/**
 * Mechanism Agent class
 */
export class MechanismAgent {
  private config: MechanismAgentConfig;
  private sessionId: string | null = null;
  private session: MechanismSession | null = null;

  constructor(config: Partial<MechanismAgentConfig> = {}) {
    this.config = {
      domains: config.domains || DEFAULT_DOMAINS,
      focus_areas: config.focus_areas,
      include_speculative: config.include_speculative ?? true,
    };
  }

  /**
   * Create a new session
   */
  private async createSession(): Promise<void> {
    const { data, error } = await getAdminClient()
      .from('aletheia_mechanism_sessions')
      .insert({
        status: 'running',
        domains_analyzed: this.config.domains,
        focus_areas: this.config.focus_areas,
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
      focus_areas: this.config.focus_areas,
      mechanisms_cataloged: 0,
      tests_designed: 0,
      theories_proposed: 0,
      novel_mechanisms: [],
      critical_tests: [],
    };
  }

  /**
   * Update session stats
   */
  private async updateSession(updates: Partial<MechanismSession>): Promise<void> {
    if (!this.sessionId) return;

    const { error } = await getAdminClient()
      .from('aletheia_mechanism_sessions')
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
      .from('aletheia_mechanism_sessions')
      .update({
        status,
        ended_at: new Date().toISOString(),
        novel_mechanisms: this.session?.novel_mechanisms,
        critical_tests: this.session?.critical_tests,
        summary,
      })
      .eq('id', this.sessionId);
  }

  /**
   * Seed the mechanism catalog if needed
   */
  private async ensureCatalog(): Promise<number> {
    console.log('[Mechanism] Ensuring mechanism catalog...');
    return await seedMechanismCatalog();
  }

  /**
   * Design discriminating tests for each domain
   */
  private async designTests(): Promise<number> {
    console.log('[Mechanism] Designing discriminating tests...');
    let totalTests = 0;

    for (const domain of this.config.domains) {
      const mechanisms = await getMechanismsByDomain(domain);
      if (mechanisms.length < 2) continue;

      // Design algorithmic tests
      const tests = designTestsForDomain(mechanisms);
      if (tests.length > 0) {
        const saved = await saveDiscriminatingTests(tests, this.sessionId || undefined);
        totalTests += saved;

        // Track critical tests
        const critical = tests.filter(t => t.priority === 'critical' || t.priority === 'high');
        for (const test of critical) {
          this.session?.critical_tests?.push({
            name: test.test_name,
            priority: test.priority as Priority,
          });
        }
      }

      // Try AI-designed test for variety
      if (mechanisms.length >= 2) {
        const aiTest = await designTestWithAI(mechanisms.slice(0, 3));
        if (aiTest) {
          const saved = await saveDiscriminatingTests([aiTest], this.sessionId || undefined);
          totalTests += saved;
        }
      }
    }

    return totalTests;
  }

  /**
   * Build unified theories from cross-domain mechanisms
   */
  private async buildTheories(): Promise<number> {
    console.log('[Mechanism] Building unified theories...');
    let theoriesBuilt = 0;

    // Get mechanisms that span multiple domains
    const crossDomainMechs = await getCrossdomainMechanisms();

    if (crossDomainMechs.length > 0) {
      // Build theory from best cross-domain mechanism
      const theory = buildUnifiedTheory(crossDomainMechs, this.config.domains);
      if (theory) {
        const id = await saveUnifiedTheory(theory, this.sessionId || undefined);
        if (id) theoriesBuilt++;
      }
    }

    // Try AI-proposed theory if enabled
    if (this.config.include_speculative && crossDomainMechs.length > 0) {
      const aiTheory = await proposeUnifiedTheoryWithAI(
        crossDomainMechs.slice(0, 5),
        this.config.domains
      );
      if (aiTheory) {
        const id = await saveUnifiedTheory(aiTheory, this.sessionId || undefined);
        if (id) theoriesBuilt++;
      }
    }

    return theoriesBuilt;
  }

  /**
   * Generate summary
   */
  private generateSummary(): string {
    if (!this.session) return '';

    const parts: string[] = [
      `Analyzed mechanisms across ${this.config.domains.length} domains`,
    ];

    if (this.session.mechanisms_cataloged > 0) {
      parts.push(`Cataloged ${this.session.mechanisms_cataloged} mechanisms`);
    }

    if (this.session.tests_designed > 0) {
      parts.push(`Designed ${this.session.tests_designed} discriminating tests`);
    }

    if (this.session.theories_proposed > 0) {
      parts.push(`Proposed ${this.session.theories_proposed} unified theories`);
    }

    const criticalTests = this.session.critical_tests?.length || 0;
    if (criticalTests > 0) {
      parts.push(`Identified ${criticalTests} high-priority tests`);
    }

    return parts.join('. ') + '.';
  }

  /**
   * Run the Mechanism Agent
   */
  async run(): Promise<string> {
    try {
      await this.createSession();
      console.log(`[Mechanism] Session started: ${this.sessionId}`);

      // Ensure catalog is seeded
      const cataloged = await this.ensureCatalog();
      await this.updateSession({ mechanisms_cataloged: cataloged });

      // Design discriminating tests
      const testsDesigned = await this.designTests();
      await this.updateSession({ tests_designed: testsDesigned });

      // Build unified theories
      const theoriesProposed = await this.buildTheories();
      await this.updateSession({ theories_proposed: theoriesProposed });

      // Complete session
      const summary = this.generateSummary();
      await this.completeSession('completed', summary);

      console.log(`[Mechanism] Session completed: ${summary}`);
      return this.sessionId!;
    } catch (error) {
      console.error('[Mechanism] Session failed:', error);
      await this.completeSession('failed', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }
}

/**
 * Run Mechanism Agent with default settings
 */
export async function runMechanismAgent(
  domains?: string[],
  focusAreas?: string[]
): Promise<string> {
  const agent = new MechanismAgent({
    domains,
    focus_areas: focusAreas as any,
  });
  return agent.run();
}

/**
 * Get Mechanism Agent sessions
 */
export async function getMechanismSessions(limit: number = 20): Promise<MechanismSession[]> {
  const { data, error } = await getAdminClient()
    .from('aletheia_mechanism_sessions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Get mechanism sessions error:', error);
    return [];
  }

  return data || [];
}

/**
 * Get Mechanism Agent session by ID
 */
export async function getMechanismSession(id: string): Promise<MechanismSession | null> {
  const { data, error } = await getAdminClient()
    .from('aletheia_mechanism_sessions')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Get mechanism session error:', error);
    return null;
  }

  return data;
}
