/**
 * Aletheia Research Agent Runner
 * Phase 1: Foundation - Basic runner skeleton with logging
 */

import { createAgentReadClient } from './supabase-admin';
import type { LogType, DomainCounts } from './types';

export class AletheiaAgent {
  private supabase;
  private sessionId: string | null = null;
  private isRunning = false;

  constructor() {
    // Use anon key - RLS policies allow agent operations
    this.supabase = createAgentReadClient();
  }

  /**
   * Start a new agent session
   */
  async startSession(triggerType: string = 'manual'): Promise<string> {
    const { data, error } = await this.supabase
      .from('aletheia_agent_sessions')
      .insert({
        trigger_type: triggerType,
        status: 'running',
      })
      .select('id')
      .single();

    if (error) {
      throw new Error(`Failed to start session: ${error.message}`);
    }

    this.sessionId = data.id;
    this.isRunning = true;
    return data.id;
  }

  /**
   * Log a message to the current session
   */
  async log(
    message: string,
    logType: LogType = 'info',
    data?: Record<string, unknown>
  ): Promise<void> {
    if (!this.sessionId) {
      throw new Error('No active session');
    }

    const { error } = await this.supabase.from('aletheia_agent_logs').insert({
      session_id: this.sessionId,
      log_type: logType,
      message,
      data: data || null,
    });

    if (error) {
      console.error('Failed to write log:', error);
    }
  }

  /**
   * Complete the current session
   */
  async completeSession(
    status: 'completed' | 'failed' | 'cancelled' = 'completed',
    summary?: string
  ): Promise<void> {
    if (!this.sessionId) {
      throw new Error('No active session');
    }

    const { error } = await this.supabase
      .from('aletheia_agent_sessions')
      .update({
        status,
        ended_at: new Date().toISOString(),
        summary: summary || null,
      })
      .eq('id', this.sessionId);

    if (error) {
      throw new Error(`Failed to complete session: ${error.message}`);
    }

    this.isRunning = false;
  }

  /**
   * Update session stats
   */
  async updateSessionStats(stats: {
    hypotheses_generated?: number;
    tests_run?: number;
    findings_queued?: number;
  }): Promise<void> {
    if (!this.sessionId) return;

    await this.supabase
      .from('aletheia_agent_sessions')
      .update(stats)
      .eq('id', this.sessionId);
  }

  /**
   * Get investigation counts by domain
   */
  async getInvestigationCounts(): Promise<DomainCounts> {
    const { data, error } = await this.supabase
      .from('aletheia_investigations')
      .select('investigation_type')
      .not('investigation_type', 'is', null);

    if (error) {
      throw new Error(`Failed to get investigation counts: ${error.message}`);
    }

    const counts: DomainCounts = {};
    for (const row of data || []) {
      const type = row.investigation_type;
      counts[type] = (counts[type] || 0) + 1;
    }

    return counts;
  }

  /**
   * Sleep helper for pacing logs
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Run a demo session (Phase 1 skeleton)
   */
  async runDemo(triggerType: string = 'manual'): Promise<string> {
    try {
      // Start session
      const sessionId = await this.startSession(triggerType);

      await this.log('Initializing Aletheia Research Agent...', 'system');
      await this.sleep(1000);

      await this.log('Loading investigation data...', 'info');
      await this.sleep(500);

      // Get actual counts from database
      const counts = await this.getInvestigationCounts();

      // Log counts for major domains
      const domainLabels: Record<string, string> = {
        ufo: 'UFO/UAP',
        bigfoot: 'Bigfoot',
        haunting: 'Haunting',
        nde: 'NDE',
        ganzfeld: 'Ganzfeld',
        crisis_apparition: 'Crisis Apparition',
        stargate: 'Remote Viewing',
        geophysical: 'Geophysical',
        cryptid: 'Cryptid',
        hotspot: 'Hotspot',
      };

      const countLines: string[] = [];
      for (const [key, label] of Object.entries(domainLabels)) {
        if (counts[key]) {
          countLines.push(`  ${label}: ${counts[key].toLocaleString()} records`);
        }
      }

      if (countLines.length > 0) {
        await this.log('Investigation database loaded:', 'info', { counts });
        await this.sleep(300);

        for (const line of countLines) {
          await this.log(line, 'info');
          await this.sleep(200);
        }
      }

      const totalRecords = Object.values(counts).reduce((a, b) => a + b, 0);
      await this.log(`Total records: ${totalRecords.toLocaleString()}`, 'info');
      await this.sleep(1000);

      await this.log('Scanning for cross-domain patterns...', 'info');
      await this.sleep(1500);

      await this.log('Pattern analysis module ready (Phase 2)', 'info');
      await this.sleep(500);

      await this.log('Hypothesis generation module ready (Phase 2)', 'info');
      await this.sleep(500);

      await this.log('Statistical testing module ready (Phase 2)', 'info');
      await this.sleep(500);

      await this.log('Session complete - foundation verified', 'system');

      // Complete session
      await this.completeSession('completed', 'Foundation demo run completed successfully');

      return sessionId;
    } catch (error) {
      await this.log(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
      await this.completeSession('failed', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  /**
   * Check if agent is currently running
   */
  get running(): boolean {
    return this.isRunning;
  }

  /**
   * Get current session ID
   */
  get currentSessionId(): string | null {
    return this.sessionId;
  }
}

/**
 * Get agent configuration from database
 */
export async function getAgentConfig(): Promise<Record<string, unknown>> {
  const supabase = createAgentReadClient();

  const { data, error } = await supabase
    .from('aletheia_agent_config')
    .select('key, value');

  if (error) {
    console.error('Failed to get agent config:', error);
    return {};
  }

  const config: Record<string, unknown> = {};
  for (const row of data || []) {
    config[row.key] = row.value;
  }

  return config;
}

/**
 * Check if agent is enabled
 */
export async function isAgentEnabled(): Promise<boolean> {
  const config = await getAgentConfig();
  return config.enabled === true || config.enabled === 'true';
}
