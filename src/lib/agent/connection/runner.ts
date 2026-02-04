/**
 * Connection Agent - Runner
 * Main orchestration for cross-domain pattern detection
 */

import type { ConnectionSession, ConnectionAgentConfig, SignificantConnection } from './types';
import { findSemanticMappings, discoverMappingsWithAI, saveMappings, getMappings } from './variable-mapper';
import { findTemporalCorrelations, findGeographicCorrelations, saveCorrelations } from './correlation-finder';
import { runKeelBattery, saveKeelTests } from './keel-tester';
import { clusterWitnesses, saveWitnessProfile } from './witness-clusterer';
import { getAdminClient } from '../supabase-admin';

// Default domains for analysis
const DEFAULT_DOMAINS = ['nde', 'ufo', 'haunting', 'bigfoot', 'ganzfeld'];

/**
 * Connection Agent class
 */
export class ConnectionAgent {
  private config: ConnectionAgentConfig;
  private sessionId: string | null = null;
  private session: ConnectionSession | null = null;

  constructor(config: Partial<ConnectionAgentConfig> = {}) {
    this.config = {
      domains: config.domains || DEFAULT_DOMAINS,
      analysis_types: config.analysis_types || ['variable_mapping', 'cross_correlation', 'keel_test', 'witness_profiles'],
      min_sample_size: config.min_sample_size || 10,
      significance_threshold: config.significance_threshold || 0.05,
    };
  }

  /**
   * Create a new session
   */
  private async createSession(): Promise<void> {
    const { data, error } = await getAdminClient()
      .from('aletheia_connection_sessions')
      .insert({
        status: 'running',
        domains_analyzed: this.config.domains,
        analysis_types: this.config.analysis_types,
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
      analysis_types: this.config.analysis_types,
      mappings_discovered: 0,
      correlations_found: 0,
      keel_tests_run: 0,
      profiles_generated: 0,
      significant_connections: [],
    };
  }

  /**
   * Update session stats
   */
  private async updateSession(updates: Partial<ConnectionSession>): Promise<void> {
    if (!this.sessionId) return;

    const { error } = await getAdminClient()
      .from('aletheia_connection_sessions')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', this.sessionId);

    if (error) {
      console.error('Update session error:', error);
    }

    // Update local session
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
      .from('aletheia_connection_sessions')
      .update({
        status,
        ended_at: new Date().toISOString(),
        significant_connections: this.session?.significant_connections,
        summary,
      })
      .eq('id', this.sessionId);
  }

  /**
   * Add a significant connection
   */
  private addSignificantConnection(connection: SignificantConnection): void {
    if (!this.session) return;
    if (!this.session.significant_connections) {
      this.session.significant_connections = [];
    }
    this.session.significant_connections.push(connection);
  }

  /**
   * Run variable mapping analysis
   */
  private async runVariableMapping(): Promise<number> {
    console.log('[Connection] Running variable mapping...');
    let totalMappings = 0;

    // Generate semantic mappings between all domain pairs
    for (let i = 0; i < this.config.domains.length; i++) {
      for (let j = i + 1; j < this.config.domains.length; j++) {
        const domainA = this.config.domains[i];
        const domainB = this.config.domains[j];

        // Get semantic mappings
        const semanticMappings = findSemanticMappings(domainA, domainB);
        if (semanticMappings.length > 0) {
          const saved = await saveMappings(semanticMappings);
          totalMappings += saved;
        }

        // Also try reverse direction
        const reverseMappings = findSemanticMappings(domainB, domainA);
        if (reverseMappings.length > 0) {
          const saved = await saveMappings(reverseMappings);
          totalMappings += saved;
        }
      }
    }

    // Track significant mappings
    const strongMappings = await getMappings(undefined, undefined, 0.8);
    for (const mapping of strongMappings.slice(0, 3)) {
      this.addSignificantConnection({
        type: 'mapping',
        description: `${mapping.source_variable} (${mapping.source_domain}) ↔ ${mapping.target_variable} (${mapping.target_domain})`,
        domains: [mapping.source_domain, mapping.target_domain],
        strength: mapping.mapping_strength,
      });
    }

    return totalMappings;
  }

  /**
   * Run cross-domain correlation analysis
   */
  private async runCrossCorrelation(): Promise<number> {
    console.log('[Connection] Running cross-domain correlation analysis...');
    let totalCorrelations = 0;

    for (let i = 0; i < this.config.domains.length; i++) {
      for (let j = i + 1; j < this.config.domains.length; j++) {
        const domainA = this.config.domains[i];
        const domainB = this.config.domains[j];

        // Temporal correlation
        const temporal = await findTemporalCorrelations(domainA, domainB);
        if (temporal) {
          await saveCorrelations([temporal], this.sessionId || undefined);
          totalCorrelations++;

          if (temporal.is_significant) {
            this.addSignificantConnection({
              type: 'correlation',
              description: `Temporal: ${domainA} ↔ ${domainB} (r=${temporal.correlation_coefficient?.toFixed(3)})`,
              domains: [domainA, domainB],
              strength: Math.abs(temporal.correlation_coefficient || 0),
            });
          }
        }

        // Geographic correlation
        const geographic = await findGeographicCorrelations(domainA, domainB);
        if (geographic) {
          await saveCorrelations([geographic], this.sessionId || undefined);
          totalCorrelations++;

          if (geographic.is_significant) {
            this.addSignificantConnection({
              type: 'correlation',
              description: `Geographic: ${domainA} ↔ ${domainB} (r=${geographic.correlation_coefficient?.toFixed(3)})`,
              domains: [domainA, domainB],
              strength: Math.abs(geographic.correlation_coefficient || 0),
            });
          }
        }
      }
    }

    return totalCorrelations;
  }

  /**
   * Run Keel tests
   */
  private async runKeelTests(): Promise<number> {
    console.log('[Connection] Running Keel tests...');

    const tests = await runKeelBattery();
    const saved = await saveKeelTests(tests, this.sessionId || undefined);

    // Track supporting tests
    for (const test of tests) {
      if (test.supports_keel_hypothesis) {
        this.addSignificantConnection({
          type: 'keel',
          description: `${test.test_name}: ${test.strength} support (r=${test.overall_correlation?.toFixed(3)})`,
          domains: test.domains_tested,
          strength: test.overall_correlation || 0,
        });
      }
    }

    return saved;
  }

  /**
   * Run witness profile clustering
   */
  private async runWitnessProfiles(): Promise<number> {
    console.log('[Connection] Running witness profile clustering...');

    const result = await clusterWitnesses(this.config.domains, 4);
    if (!result) {
      console.log('[Connection] Not enough data for clustering');
      return 0;
    }

    const profileId = await saveWitnessProfile(
      result.profile,
      result.assignments,
      this.sessionId || undefined
    );

    if (profileId) {
      this.addSignificantConnection({
        type: 'cluster',
        description: `${result.profile.n_clusters} witness clusters identified (silhouette=${result.profile.silhouette_score?.toFixed(3)})`,
        domains: this.config.domains,
        strength: result.profile.silhouette_score || 0,
      });
      return 1;
    }

    return 0;
  }

  /**
   * Generate summary
   */
  private generateSummary(): string {
    if (!this.session) return '';

    const parts: string[] = [
      `Analyzed ${this.config.domains.length} domains: ${this.config.domains.join(', ')}`,
    ];

    if (this.session.mappings_discovered > 0) {
      parts.push(`Discovered ${this.session.mappings_discovered} variable mappings`);
    }

    if (this.session.correlations_found > 0) {
      parts.push(`Found ${this.session.correlations_found} cross-domain correlations`);
    }

    if (this.session.keel_tests_run > 0) {
      parts.push(`Ran ${this.session.keel_tests_run} Keel tests`);
    }

    if (this.session.profiles_generated > 0) {
      parts.push(`Generated ${this.session.profiles_generated} witness profiles`);
    }

    const significantCount = this.session.significant_connections?.length || 0;
    if (significantCount > 0) {
      parts.push(`Identified ${significantCount} significant connections`);
    }

    return parts.join('. ') + '.';
  }

  /**
   * Run the Connection Agent
   */
  async run(): Promise<string> {
    try {
      await this.createSession();
      console.log(`[Connection] Session started: ${this.sessionId}`);

      // Run variable mapping
      if (this.config.analysis_types.includes('variable_mapping')) {
        const mappings = await this.runVariableMapping();
        await this.updateSession({ mappings_discovered: mappings });
      }

      // Run cross-correlation
      if (this.config.analysis_types.includes('cross_correlation')) {
        const correlations = await this.runCrossCorrelation();
        await this.updateSession({ correlations_found: correlations });
      }

      // Run Keel tests
      if (this.config.analysis_types.includes('keel_test')) {
        const keelTests = await this.runKeelTests();
        await this.updateSession({ keel_tests_run: keelTests });
      }

      // Run witness profiles
      if (this.config.analysis_types.includes('witness_profiles')) {
        const profiles = await this.runWitnessProfiles();
        await this.updateSession({ profiles_generated: profiles });
      }

      // Complete session
      const summary = this.generateSummary();
      await this.completeSession('completed', summary);

      console.log(`[Connection] Session completed: ${summary}`);
      return this.sessionId!;
    } catch (error) {
      console.error('[Connection] Session failed:', error);
      await this.completeSession('failed', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }
}

/**
 * Run Connection Agent with default settings
 */
export async function runConnectionAgent(
  domains?: string[],
  analysisTypes?: ('variable_mapping' | 'cross_correlation' | 'keel_test' | 'witness_profiles')[]
): Promise<string> {
  const agent = new ConnectionAgent({
    domains,
    analysis_types: analysisTypes,
  });
  return agent.run();
}

/**
 * Get Connection Agent sessions
 */
export async function getConnectionSessions(limit: number = 20): Promise<ConnectionSession[]> {
  const { data, error } = await getAdminClient()
    .from('aletheia_connection_sessions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Get connection sessions error:', error);
    return [];
  }

  return data || [];
}

/**
 * Get Connection Agent session by ID
 */
export async function getConnectionSession(id: string): Promise<ConnectionSession | null> {
  const { data, error } = await getAdminClient()
    .from('aletheia_connection_sessions')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Get connection session error:', error);
    return null;
  }

  return data;
}
