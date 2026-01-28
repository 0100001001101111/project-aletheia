/**
 * Discovery Agent Runner
 *
 * Main orchestration for the Discovery Agent.
 * Scours the internet for research, follows citations, finds connections.
 */

import { createAgentClient } from './supabase-admin';

// Helper to get admin client
function getSupabaseAdmin() {
  return createAgentClient();
}
import {
  createDiscoverySession,
  completeDiscoverySession,
  failDiscoverySession,
  createDiscoveryLead,
  getDiscoveryLeads,
  getSourcesDueForCheck,
  updateSourceChecked,
  getTrackedResearchers,
  updateResearcherChecked,
  createHandoff,
  getPendingHandoffs,
  pickUpHandoff,
  completeHandoff,
  seedDiscoverySources,
  seedTrackedResearchers,
} from './discovery-manager';
import { checkSource, contentToLead, checkResearcher } from './source-monitor';
import { findCrossDomainConnections, followCitationTrail, extractReferences, findCitedPaper } from './cross-domain-analyzer';
import { evaluateLead, checkDuplication } from './lead-evaluator';
import { formatSourcesForDb } from './discovery-sources';
import { formatResearchersForDb } from './tracked-researchers';
import type { DiscoverySession, DiscoveryLead, CrossDomainConnection } from './types';

// ============================================
// Discovery Agent Class
// ============================================

export class DiscoveryAgent {
  private sessionId: string | null = null;
  private logs: string[] = [];
  private stats = {
    leads_found: 0,
    connections_found: 0,
    sources_scanned: 0,
  };

  /**
   * Log a message (stored in memory, can be retrieved)
   */
  private log(message: string, type: 'info' | 'lead' | 'connection' | 'warning' | 'error' = 'info'): void {
    const timestamp = new Date().toISOString();
    const logLine = `[${timestamp}] [${type.toUpperCase()}] ${message}`;
    this.logs.push(logLine);
    console.log(logLine);

    // Also write to database if we have a session
    if (this.sessionId) {
      this.writeLog(type, message);
    }
  }

  /**
   * Write log to database
   */
  private async writeLog(logType: string, message: string): Promise<void> {
    const supabase = getSupabaseAdmin();
    await supabase.from('aletheia_agent_logs').insert({
      session_id: this.sessionId,
      log_type: logType === 'lead' ? 'result' : logType === 'connection' ? 'hypothesis' : logType,
      message,
      data: {},
    });
  }

  /**
   * Initialize seed data if needed
   */
  async initializeSeedData(): Promise<void> {
    this.log('Checking seed data...');

    const sourcesAdded = await seedDiscoverySources(formatSourcesForDb());
    if (sourcesAdded > 0) {
      this.log(`Seeded ${sourcesAdded} monitored sources`);
    }

    const researchersAdded = await seedTrackedResearchers(formatResearchersForDb());
    if (researchersAdded > 0) {
      this.log(`Seeded ${researchersAdded} tracked researchers`);
    }
  }

  /**
   * Run a discovery session
   */
  async run(options: {
    triggerType?: string;
    focusAreas?: string[];
    demoMode?: boolean;
  } = {}): Promise<DiscoverySession> {
    const { triggerType = 'manual', focusAreas, demoMode = false } = options;

    this.logs = [];
    this.stats = { leads_found: 0, connections_found: 0, sources_scanned: 0 };

    this.log('═══════════════════════════════════════════════════════════');
    this.log('DISCOVERY AGENT SESSION STARTED');
    this.log('═══════════════════════════════════════════════════════════');

    // Initialize seed data
    await this.initializeSeedData();

    // Create session
    const session = await createDiscoverySession(triggerType, focusAreas);
    this.sessionId = session.id;

    this.log(`Session ID: ${session.id}`);
    if (focusAreas?.length) {
      this.log(`Focus areas: ${focusAreas.join(', ')}`);
    }

    try {
      if (demoMode) {
        await this.runDemoMode();
      } else {
        await this.runFullMode(focusAreas);
      }

      // Complete session
      const summary = this.generateSummary();
      await completeDiscoverySession(session.id, this.stats, summary);

      this.log('───────────────────────────────────────────────────────────');
      this.log('SESSION COMPLETE');
      this.log(`  Sources scanned: ${this.stats.sources_scanned}`);
      this.log(`  Leads found: ${this.stats.leads_found}`);
      this.log(`  Connections: ${this.stats.connections_found}`);
      this.log('═══════════════════════════════════════════════════════════');

      return {
        ...session,
        status: 'completed',
        ended_at: new Date().toISOString(),
        leads_found: this.stats.leads_found,
        connections_found: this.stats.connections_found,
        sources_scanned: this.stats.sources_scanned,
        summary,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.log(`FATAL ERROR: ${errorMsg}`, 'error');
      await failDiscoverySession(session.id, errorMsg);

      return {
        ...session,
        status: 'failed',
        ended_at: new Date().toISOString(),
        summary: `Error: ${errorMsg}`,
      };
    }
  }

  /**
   * Demo mode - quick test of capabilities
   */
  private async runDemoMode(): Promise<void> {
    this.log('Running in DEMO MODE');
    this.log('───────────────────────────────────────────────────────────');

    // Check one source
    this.log('Phase 1: Testing source monitoring...');
    const sources = await getSourcesDueForCheck();
    if (sources.length > 0) {
      const source = sources[0];
      this.log(`  Checking: ${source.name}`);
      this.stats.sources_scanned = 1;
      await updateSourceChecked(source.id!, 0);
      this.log('  ✓ Source monitoring operational');
    } else {
      this.log('  No sources due for check');
    }

    // Check one researcher
    this.log('Phase 2: Testing researcher tracking...');
    const researchers = await getTrackedResearchers({ active: true });
    if (researchers.length > 0) {
      const researcher = researchers[0];
      this.log(`  Checking: ${researcher.name}`);
      await updateResearcherChecked(researcher.id!);
      this.log('  ✓ Researcher tracking operational');
    }

    // Test lead evaluation
    this.log('Phase 3: Testing lead evaluation...');
    const testEval = evaluateLead(
      'A meta-analysis of ganzfeld experiments',
      'Peer-reviewed study with N=100 participants showing significant effect',
      'https://example.edu/paper.pdf',
      ['Storm', 'Tressoldi'],
      'Journal of Parapsychology'
    );
    this.log(`  Test lead scored: ${testEval.quality_score}/100`);
    this.log(`  Signals: ${testEval.quality_signals.slice(0, 3).join(', ')}`);
    this.log('  ✓ Lead evaluation operational');

    // Test handoff system
    this.log('Phase 4: Testing handoff system...');
    const pendingHandoffs = await getPendingHandoffs('discovery');
    this.log(`  Found ${pendingHandoffs.length} pending handoffs from Research Agent`);
    this.log('  ✓ Handoff system operational');

    this.log('───────────────────────────────────────────────────────────');
    this.log('DEMO COMPLETE - All systems operational');
  }

  /**
   * Full discovery mode
   */
  private async runFullMode(focusAreas?: string[]): Promise<void> {
    // Get existing leads to check for duplicates
    const existingLeads = await getDiscoveryLeads({ limit: 100 });

    // Phase 1: Check monitored sources
    this.log('───────────────────────────────────────────────────────────');
    this.log('Phase 1: Checking monitored sources');
    await this.checkMonitoredSources(existingLeads);

    // Phase 2: Check tracked researchers
    this.log('───────────────────────────────────────────────────────────');
    this.log('Phase 2: Checking tracked researchers');
    await this.checkTrackedResearchers(existingLeads);

    // Phase 3: Process handoffs from Research Agent
    this.log('───────────────────────────────────────────────────────────');
    this.log('Phase 3: Processing Research Agent handoffs');
    await this.processHandoffs(existingLeads);

    // Phase 4: Follow citation trails from high-quality leads
    this.log('───────────────────────────────────────────────────────────');
    this.log('Phase 4: Following citation trails');
    await this.followCitations(existingLeads);

    // Phase 5: Cross-domain analysis
    this.log('───────────────────────────────────────────────────────────');
    this.log('Phase 5: Cross-domain connection analysis');
    await this.analyzeCrossDomain();

    // Phase 6: Focus area deep dive (if specified)
    if (focusAreas?.length) {
      this.log('───────────────────────────────────────────────────────────');
      this.log('Phase 6: Focus area deep dive');
      await this.deepDiveFocusAreas(focusAreas, existingLeads);
    }
  }

  /**
   * Check all monitored sources due for checking
   */
  private async checkMonitoredSources(existingLeads: DiscoveryLead[]): Promise<void> {
    const sources = await getSourcesDueForCheck();
    this.log(`Found ${sources.length} source(s) due for check`);

    for (const source of sources.slice(0, 10)) {
      this.log(`  Checking: ${source.name}`);
      this.stats.sources_scanned++;

      try {
        const discovered = await checkSource(source);
        let leadsQueued = 0;

        for (const content of discovered) {
          // Check for duplicates
          const { isDuplicate } = checkDuplication(content.title, content.url, existingLeads);
          if (isDuplicate) {
            continue;
          }

          // Create lead
          const leadData = contentToLead(content, this.sessionId!);
          const lead = await createDiscoveryLead(leadData);
          existingLeads.push(lead);
          leadsQueued++;
          this.stats.leads_found++;

          this.log(`    LEAD: ${content.title.substring(0, 60)}... (${leadData.quality_score}/100)`, 'lead');
        }

        await updateSourceChecked(source.id!, leadsQueued);

        if (leadsQueued > 0) {
          this.log(`    → Queued ${leadsQueued} new lead(s)`);
        }
      } catch (error) {
        this.log(`    Error: ${error instanceof Error ? error.message : 'Unknown'}`, 'warning');
      }
    }
  }

  /**
   * Check tracked researchers for new publications
   */
  private async checkTrackedResearchers(existingLeads: DiscoveryLead[]): Promise<void> {
    const researchers = await getTrackedResearchers({ active: true });
    this.log(`Checking ${researchers.length} tracked researcher(s)`);

    for (const researcher of researchers.slice(0, 5)) {
      this.log(`  Checking: ${researcher.name}`);

      try {
        const publications = await checkResearcher(
          researcher.name,
          researcher.domains || [],
          researcher.google_scholar
        );

        for (const pub of publications.slice(0, 2)) {
          const { isDuplicate } = checkDuplication(pub.title, pub.url, existingLeads);
          if (isDuplicate) continue;

          const evaluation = evaluateLead(
            pub.title,
            pub.snippet,
            pub.url,
            [researcher.name],
            undefined
          );

          const lead = await createDiscoveryLead({
            session_id: this.sessionId!,
            lead_type: 'paper',
            title: pub.title,
            description: pub.snippet,
            source_url: pub.url,
            authors: [researcher.name],
            quality_score: evaluation.quality_score,
            quality_signals: evaluation.quality_signals,
            quality_concerns: evaluation.quality_concerns,
            domains: evaluation.domains.length > 0 ? evaluation.domains : researcher.domains,
            status: 'pending',
            priority: evaluation.priority,
          });

          existingLeads.push(lead);
          this.stats.leads_found++;
          this.log(`    LEAD: ${pub.title.substring(0, 50)}... (${evaluation.quality_score}/100)`, 'lead');
        }

        await updateResearcherChecked(researcher.id!);
      } catch (error) {
        this.log(`    Error: ${error instanceof Error ? error.message : 'Unknown'}`, 'warning');
      }
    }
  }

  /**
   * Process handoffs from Research Agent
   */
  private async processHandoffs(existingLeads: DiscoveryLead[]): Promise<void> {
    const handoffs = await getPendingHandoffs('discovery');
    this.log(`Found ${handoffs.length} handoff(s) from Research Agent`);

    for (const handoff of handoffs) {
      this.log(`  Processing handoff: ${handoff.handoff_type}`);
      await pickUpHandoff(handoff.id!);

      try {
        switch (handoff.handoff_type) {
          case 'data_request': {
            // Research Agent wants more data on a topic
            const topic = handoff.payload?.topic as string;
            if (topic) {
              this.log(`    Searching for data on: ${topic}`);
              // Create a lead to investigate this topic
              await createDiscoveryLead({
                session_id: this.sessionId!,
                lead_type: 'dataset',
                title: `Data request: ${topic}`,
                description: `Research Agent requested more data on: ${topic}`,
                domains: handoff.payload?.domains as string[] || [],
                status: 'pending',
                priority: 'high',
              });
              this.stats.leads_found++;
            }
            break;
          }
          case 'verification_needed': {
            // Research Agent wants independent verification of a finding
            const finding = handoff.payload?.finding as string;
            if (finding) {
              this.log(`    Searching for verification of: ${finding.substring(0, 50)}...`);
              await createDiscoveryLead({
                session_id: this.sessionId!,
                lead_type: 'replication',
                title: `Verification needed: ${finding.substring(0, 100)}`,
                description: `Research Agent needs independent verification: ${finding}`,
                status: 'pending',
                priority: 'high',
              });
              this.stats.leads_found++;
            }
            break;
          }
        }

        await completeHandoff(handoff.id!, { processed: true });
      } catch (error) {
        this.log(`    Error processing handoff: ${error instanceof Error ? error.message : 'Unknown'}`, 'error');
      }
    }
  }

  /**
   * Follow citation trails from high-quality leads
   */
  private async followCitations(existingLeads: DiscoveryLead[]): Promise<void> {
    // Get high-quality leads to follow
    const highQualityLeads = existingLeads.filter(l =>
      l.lead_type === 'paper' &&
      (l.quality_score || 0) >= 70
    ).slice(0, 3);

    this.log(`Following citations from ${highQualityLeads.length} high-quality lead(s)`);

    for (const lead of highQualityLeads) {
      this.log(`  Following: ${lead.title.substring(0, 50)}...`);

      // Extract references from description
      const refs = extractReferences(lead.description || '');
      this.log(`    Found ${refs.length} reference(s) to follow`);

      for (const ref of refs.slice(0, 2)) {
        const cited = await findCitedPaper(ref);
        if (cited) {
          const { isDuplicate } = checkDuplication(cited.title, cited.url, existingLeads);
          if (!isDuplicate) {
            const evaluation = evaluateLead(cited.title, cited.snippet, cited.url);

            await createDiscoveryLead({
              session_id: this.sessionId!,
              lead_type: 'paper',
              title: cited.title,
              description: cited.snippet,
              source_url: cited.url,
              quality_score: evaluation.quality_score,
              quality_signals: evaluation.quality_signals,
              quality_concerns: evaluation.quality_concerns,
              domains: evaluation.domains,
              status: 'pending',
              priority: evaluation.priority,
            });

            this.stats.leads_found++;
            this.log(`    CITED: ${cited.title.substring(0, 50)}...`, 'lead');
          }
        }
      }
    }
  }

  /**
   * Analyze for cross-domain connections
   */
  private async analyzeCrossDomain(): Promise<void> {
    // Get recent leads for analysis
    const recentLeads = await getDiscoveryLeads({ limit: 20 });

    if (recentLeads.length < 5) {
      this.log('Not enough leads for cross-domain analysis');
      return;
    }

    this.log(`Analyzing ${recentLeads.length} leads for cross-domain connections`);

    const connections = await findCrossDomainConnections(recentLeads);

    for (const connection of connections) {
      this.stats.connections_found++;

      // Create a connection lead
      await createDiscoveryLead({
        session_id: this.sessionId!,
        lead_type: 'connection',
        title: `Connection: ${connection.source_a.domain} ↔ ${connection.source_b.domain}`,
        description: connection.connection,
        connection_sources: connection,
        potential_hypothesis: connection.potential_hypothesis,
        quality_score: Math.round(connection.confidence * 100),
        domains: [connection.source_a.domain, connection.source_b.domain],
        status: 'pending',
        priority: connection.confidence > 0.7 ? 'high' : 'normal',
      });

      this.log(`  CONNECTION: ${connection.source_a.domain} ↔ ${connection.source_b.domain}`, 'connection');
      this.log(`    Hypothesis: ${connection.potential_hypothesis.substring(0, 80)}...`);

      // If high confidence, create handoff to Research Agent
      if (connection.confidence > 0.7) {
        await createHandoff({
          from_agent: 'discovery',
          to_agent: 'research',
          handoff_type: 'hypothesis',
          payload: {
            hypothesis: connection.potential_hypothesis,
            connection: connection.connection,
            sources: [connection.source_a, connection.source_b],
            confidence: connection.confidence,
          },
          status: 'pending',
        });
        this.log(`    → Handed off to Research Agent for testing`);
      }
    }
  }

  /**
   * Deep dive into focus areas
   */
  private async deepDiveFocusAreas(focusAreas: string[], existingLeads: DiscoveryLead[]): Promise<void> {
    for (const area of focusAreas.slice(0, 3)) {
      this.log(`  Deep diving: ${area}`);

      // Follow citation trails more deeply for this topic
      const citationResults = await followCitationTrail(area, 2);

      for (const result of citationResults.slice(0, 3)) {
        const { isDuplicate } = checkDuplication(result.title, result.url, existingLeads);
        if (!isDuplicate) {
          const evaluation = evaluateLead(result.title, result.snippet, result.url);

          const lead = await createDiscoveryLead({
            session_id: this.sessionId!,
            lead_type: 'paper',
            title: result.title,
            description: result.snippet,
            source_url: result.url,
            quality_score: evaluation.quality_score,
            quality_signals: evaluation.quality_signals,
            quality_concerns: evaluation.quality_concerns,
            domains: evaluation.domains,
            keywords: [area],
            status: 'pending',
            priority: evaluation.priority,
          });

          existingLeads.push(lead);
          this.stats.leads_found++;
          this.log(`    FOUND: ${result.title.substring(0, 50)}...`, 'lead');
        }
      }
    }
  }

  /**
   * Generate session summary
   */
  private generateSummary(): string {
    const parts: string[] = [];

    parts.push(`Scanned ${this.stats.sources_scanned} source(s).`);
    parts.push(`Found ${this.stats.leads_found} new lead(s).`);

    if (this.stats.connections_found > 0) {
      parts.push(`Detected ${this.stats.connections_found} cross-domain connection(s).`);
    }

    return parts.join(' ');
  }

  /**
   * Get logs from current/last run
   */
  getLogs(): string[] {
    return this.logs;
  }
}

// ============================================
// Export singleton instance
// ============================================

export const discoveryAgent = new DiscoveryAgent();
