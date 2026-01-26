/**
 * Aletheia Research Agent Runner
 * Phase 2: Analysis Engine
 *
 * Autonomous research agent that:
 * 1. Scans for patterns in investigation data
 * 2. Generates testable hypotheses via Claude API
 * 3. Runs statistical tests with holdout validation
 * 4. Checks confounds to ensure rigor
 * 5. Queues validated findings for human review
 */

import { createAgentReadClient } from './supabase-admin';
import type {
  LogType,
  DomainCounts,
  PatternCandidate,
  GeneratedHypothesis,
  TestResult,
  ConfoundCheckResult,
  AgentConfigValues,
} from './types';
import { scanForPatterns } from './scanner';
import { generateHypothesis, saveHypothesis, updateHypothesisStatus } from './hypothesis-generator';
import { validateWithHoldout } from './validation';
import { checkAllConfounds, allConfoundsPassed } from './confounds';
import { generateFinding, saveFinding } from './findings';

// ============================================
// Agent Configuration Defaults
// ============================================

const DEFAULT_CONFIG: AgentConfigValues = {
  enabled: true,
  run_interval_hours: 6,
  min_sample_size: 30,
  significance_threshold: 0.01,
  effect_size_threshold: 0.3,
  max_hypotheses_per_session: 10,
};

// ============================================
// Main Agent Class
// ============================================

export class AletheiaAgent {
  private supabase;
  private sessionId: string | null = null;
  private isRunning = false;
  private config: AgentConfigValues = DEFAULT_CONFIG;

  // Session statistics
  private stats = {
    patterns_found: 0,
    hypotheses_generated: 0,
    tests_run: 0,
    findings_queued: 0,
  };

  constructor() {
    this.supabase = createAgentReadClient();
  }

  /**
   * Load configuration from database
   */
  private async loadConfig(): Promise<void> {
    const dbConfig = await getAgentConfig();
    this.config = {
      enabled: dbConfig.enabled === true || dbConfig.enabled === 'true',
      run_interval_hours: (dbConfig.run_interval_hours as number) || DEFAULT_CONFIG.run_interval_hours,
      min_sample_size: (dbConfig.min_sample_size as number) || DEFAULT_CONFIG.min_sample_size,
      significance_threshold:
        (dbConfig.significance_threshold as number) || DEFAULT_CONFIG.significance_threshold,
      effect_size_threshold:
        (dbConfig.effect_size_threshold as number) || DEFAULT_CONFIG.effect_size_threshold,
      max_hypotheses_per_session:
        (dbConfig.max_hypotheses_per_session as number) || DEFAULT_CONFIG.max_hypotheses_per_session,
    };
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
    this.stats = { patterns_found: 0, hypotheses_generated: 0, tests_run: 0, findings_queued: 0 };
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
        hypotheses_generated: this.stats.hypotheses_generated,
        tests_run: this.stats.tests_run,
        findings_queued: this.stats.findings_queued,
      })
      .eq('id', this.sessionId);

    if (error) {
      throw new Error(`Failed to complete session: ${error.message}`);
    }

    this.isRunning = false;
  }

  /**
   * Update session stats in database
   */
  async updateSessionStats(): Promise<void> {
    if (!this.sessionId) return;

    await this.supabase
      .from('aletheia_agent_sessions')
      .update({
        hypotheses_generated: this.stats.hypotheses_generated,
        tests_run: this.stats.tests_run,
        findings_queued: this.stats.findings_queued,
      })
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
      const sessionId = await this.startSession(triggerType);

      await this.log('Initializing Aletheia Research Agent...', 'system');
      await this.sleep(1000);

      await this.log('Loading investigation data...', 'info');
      await this.sleep(500);

      const counts = await this.getInvestigationCounts();

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

      await this.log('Pattern analysis module ready', 'info');
      await this.sleep(500);

      await this.log('Hypothesis generation module ready', 'info');
      await this.sleep(500);

      await this.log('Statistical testing module ready', 'info');
      await this.sleep(500);

      await this.log('Session complete - foundation verified', 'system');

      await this.completeSession('completed', 'Foundation demo run completed successfully');

      return sessionId;
    } catch (error) {
      await this.log(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
      await this.completeSession('failed', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  /**
   * Run full analysis session (Phase 2)
   */
  async run(triggerType: string = 'manual'): Promise<string> {
    try {
      // Load config and start session
      await this.loadConfig();
      const sessionId = await this.startSession(triggerType);

      await this.log('═══════════════════════════════════════════════════════════', 'system');
      await this.log('     ALETHEIA RESEARCH AGENT - Phase 2 Analysis Engine     ', 'system');
      await this.log('═══════════════════════════════════════════════════════════', 'system');
      await this.sleep(500);

      // Phase 1: Load data overview
      await this.log('', 'info');
      await this.log('▸ PHASE 1: Data Loading', 'system');
      await this.log('─────────────────────────────────────────────────────────────', 'info');

      const counts = await this.getInvestigationCounts();
      const totalRecords = Object.values(counts).reduce((a, b) => a + b, 0);
      await this.log(`Database: ${totalRecords.toLocaleString()} investigation records`, 'info');

      const topDomains = Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
      for (const [domain, count] of topDomains) {
        await this.log(`  ${domain}: ${count.toLocaleString()}`, 'info');
      }

      // Phase 2: Pattern Scanning
      await this.log('', 'info');
      await this.log('▸ PHASE 2: Pattern Scanning', 'system');
      await this.log('─────────────────────────────────────────────────────────────', 'info');

      await this.log('Scanning for patterns across domains...', 'info');
      const patterns = await scanForPatterns();
      this.stats.patterns_found = patterns.length;

      if (patterns.length === 0) {
        await this.log('No significant patterns found in current data', 'warning');
        await this.completeSession('completed', 'No patterns found');
        return sessionId;
      }

      await this.log(`Found ${patterns.length} pattern candidates`, 'result');

      // Log top patterns
      for (const pattern of patterns.slice(0, 5)) {
        await this.log(
          `  [${pattern.type.toUpperCase()}] ${pattern.description} (strength: ${(pattern.preliminary_strength * 100).toFixed(0)}%)`,
          'info'
        );
      }

      // Phase 3: Hypothesis Generation & Testing
      await this.log('', 'info');
      await this.log('▸ PHASE 3: Hypothesis Testing', 'system');
      await this.log('─────────────────────────────────────────────────────────────', 'info');

      const maxHypotheses = Math.min(patterns.length, this.config.max_hypotheses_per_session);
      await this.log(`Examining top ${maxHypotheses} patterns...`, 'info');
      await this.sleep(300);

      for (let i = 0; i < maxHypotheses; i++) {
        const pattern = patterns[i];
        await this.log('', 'info');
        await this.log(`━━━ Hypothesis ${i + 1}/${maxHypotheses} ━━━`, 'hypothesis');
        await this.log(`Pattern: ${pattern.description}`, 'info');

        // Generate hypothesis
        await this.log('Generating testable hypothesis...', 'info');
        let hypothesis: GeneratedHypothesis;
        try {
          hypothesis = await generateHypothesis(pattern);
        } catch (error) {
          await this.log(`Failed to generate hypothesis: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
          continue;
        }

        this.stats.hypotheses_generated++;
        await this.updateSessionStats();

        await this.log(`Hypothesis: "${hypothesis.display_title}"`, 'hypothesis');

        if (!hypothesis.testable) {
          await this.log('⚠ Not statistically testable, skipping', 'warning');
          continue;
        }

        // Save hypothesis to database
        let hypothesisId: string | null = null;
        try {
          hypothesisId = await saveHypothesis(hypothesis, sessionId);
          await updateHypothesisStatus(hypothesisId, 'testing');
        } catch (error) {
          await this.log(`Warning: Could not save hypothesis: ${error instanceof Error ? error.message : 'Unknown'}`, 'warning');
        }

        // Run statistical test with holdout validation
        await this.log(`Running ${hypothesis.suggested_test} test with holdout validation...`, 'test');

        const validation = await validateWithHoldout(
          hypothesis,
          this.config.significance_threshold,
          this.config.effect_size_threshold
        );
        this.stats.tests_run++;
        await this.updateSessionStats();

        // Log training results
        const training = validation.training;
        await this.log(
          `Training: p=${training.p_value.toFixed(4)}, effect=${training.effect_size.toFixed(3)}, n=${training.sample_size}`,
          'result'
        );

        if (!training.passed_threshold) {
          await this.log('✗ Below significance threshold', 'warning');
          if (hypothesisId) {
            await updateHypothesisStatus(hypothesisId, 'rejected');
          }
          continue;
        }

        // Log holdout results
        const holdout = validation.holdout;
        await this.log(
          `Holdout:  p=${holdout.p_value.toFixed(4)}, effect=${holdout.effect_size.toFixed(3)}`,
          'result'
        );

        if (!holdout.passed_threshold) {
          await this.log('✗ Failed holdout validation (did not replicate)', 'warning');
          if (hypothesisId) {
            await updateHypothesisStatus(hypothesisId, 'rejected');
          }
          continue;
        }

        await this.log('✓ Passed holdout validation', 'result');

        // Phase 4: Confound Checks
        await this.log('Checking confounds...', 'test');
        const confounds = await checkAllConfounds(hypothesis, training);

        for (const check of confounds) {
          if (!check.controlled) {
            await this.log(`  ${check.confound_type}: N/A (${check.notes})`, 'info');
          } else {
            const status = check.effect_survived ? '✓' : '✗';
            await this.log(`  ${check.confound_type}: ${status} ${check.notes}`, 'info');
          }
        }

        if (!allConfoundsPassed(confounds)) {
          await this.log('✗ Failed confound checks', 'warning');
          if (hypothesisId) {
            await updateHypothesisStatus(hypothesisId, 'rejected');
          }
          continue;
        }

        await this.log('✓ Survived confound checks', 'result');

        // Phase 5: Generate and Queue Finding
        await this.log('Generating finding for review...', 'info');

        try {
          const finding = await generateFinding(hypothesis, training, holdout, confounds);
          const findingId = await saveFinding(finding, hypothesisId, sessionId);
          this.stats.findings_queued++;
          await this.updateSessionStats();

          if (hypothesisId) {
            await updateHypothesisStatus(hypothesisId, 'confirmed');
          }

          await this.log('', 'info');
          await this.log('★★★ FINDING QUEUED FOR REVIEW ★★★', 'result');
          await this.log(`Title: ${finding.display_title}`, 'result');
          await this.log(`Confidence: ${(finding.confidence * 100).toFixed(0)}%`, 'result');
          await this.log(`Finding ID: ${findingId}`, 'info');
        } catch (error) {
          await this.log(`Error saving finding: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
        }
      }

      // Session Summary
      await this.log('', 'info');
      await this.log('═══════════════════════════════════════════════════════════', 'system');
      await this.log('                    SESSION COMPLETE                        ', 'system');
      await this.log('═══════════════════════════════════════════════════════════', 'system');
      await this.log(`Patterns found:    ${this.stats.patterns_found}`, 'info');
      await this.log(`Hypotheses tested: ${this.stats.hypotheses_generated}`, 'info');
      await this.log(`Tests run:         ${this.stats.tests_run}`, 'info');
      await this.log(`Findings queued:   ${this.stats.findings_queued}`, 'info');

      const summaryText =
        this.stats.findings_queued > 0
          ? `Found ${this.stats.findings_queued} potential finding(s) from ${this.stats.patterns_found} patterns`
          : `Analyzed ${this.stats.patterns_found} patterns, no findings met threshold`;

      await this.completeSession('completed', summaryText);

      return sessionId;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.log(`Fatal error: ${errorMessage}`, 'error');
      await this.completeSession('failed', errorMessage);
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

// ============================================
// Helper Functions
// ============================================

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
