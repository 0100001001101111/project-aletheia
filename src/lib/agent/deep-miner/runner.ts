/**
 * Deep Miner Agent Runner
 * Orchestrates exhaustive within-domain statistical analysis
 */

import { createAgentClient } from '../supabase-admin';
import type {
  DeepMinerSession,
  DeepMinerConfig,
  VariableCensusEntry,
  CrossTabulation,
  SubgroupAnalysis,
  SubgroupResult,
  TemporalStabilityAnalysis,
  ExtractedVariable,
} from './types';
import {
  extractVariables,
  getValueAtPath,
  filterCategoricalVariables,
  filterGroupingVariables,
  filterTargetVariables,
  getValueDistribution,
  getMode,
  normalizeBooleanValue,
} from './variable-extractor';
import {
  chiSquareTest,
  calculateDescriptiveStats,
  determineDistributionShape,
  categorizeEffectSize,
  determineTrend,
  proportionCI,
  formatPValue,
  significanceStars,
} from './statistics';

const DEFAULT_CONFIG: DeepMinerConfig = {
  domain: 'nde',
  max_cross_tabs: 200,
  significance_threshold: 0.05,
  min_cell_count: 5,
  min_sample_for_subgroup: 20,
  include_text_analysis: false,
  temporal_periods: 'year',
};

export class DeepMinerAgent {
  private supabase;
  private sessionId: string | null = null;
  private config: DeepMinerConfig;
  private stats = {
    records_analyzed: 0,
    variables_found: 0,
    cross_tabs_computed: 0,
    significant_associations: 0,
    subgroups_analyzed: 0,
    outliers_found: 0,
  };

  constructor(config: Partial<DeepMinerConfig> = {}) {
    this.supabase = createAgentClient();
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Start a new Deep Miner session
   */
  async startSession(): Promise<string> {
    const { data, error } = await this.supabase
      .from('aletheia_deep_miner_sessions')
      .insert({
        domain: this.config.domain,
        status: 'running',
        trigger_type: 'manual',
      })
      .select('id')
      .single();

    if (error) throw new Error(`Failed to start session: ${error.message}`);

    this.sessionId = data.id;
    return data.id;
  }

  /**
   * Complete the session
   */
  async completeSession(status: 'completed' | 'failed', summary?: string): Promise<void> {
    if (!this.sessionId) return;

    await this.supabase
      .from('aletheia_deep_miner_sessions')
      .update({
        status,
        ended_at: new Date().toISOString(),
        summary,
        ...this.stats,
      })
      .eq('id', this.sessionId);
  }

  /**
   * Load investigation data for the domain
   */
  async loadDomainData(): Promise<Record<string, unknown>[]> {
    // Use SECURITY DEFINER function if available, else direct query
    const { data, error } = await this.supabase
      .from('aletheia_investigations')
      .select('id, raw_data, exploratory_data, created_at')
      .eq('investigation_type', this.config.domain)
      .not('raw_data', 'is', null)
      .limit(50000);

    if (error) throw new Error(`Failed to load data: ${error.message}`);

    // Combine raw_data and exploratory_data
    return (data || []).map(row => ({
      _id: row.id,
      _created_at: row.created_at,
      ...(row.raw_data || {}),
      ...(row.exploratory_data || {}),
    }));
  }

  /**
   * Run variable census
   */
  async runVariableCensus(records: Record<string, unknown>[]): Promise<ExtractedVariable[]> {
    console.log(`[DeepMiner] Extracting variables from ${records.length} records...`);

    const variables = extractVariables(records, 5000);
    this.stats.variables_found = variables.length;

    console.log(`[DeepMiner] Found ${variables.length} variables`);

    // Save to database
    for (const variable of variables) {
      const nonNullValues = variable.values.filter(v => v !== null && v !== undefined);
      const distribution = getValueDistribution(variable.values);

      const entry: Partial<VariableCensusEntry> = {
        session_id: this.sessionId!,
        domain: this.config.domain,
        variable_name: variable.name,
        variable_path: variable.path,
        variable_type: variable.type,
        total_records: records.length,
        non_null_count: nonNullValues.length,
        null_count: records.length - nonNullValues.length,
        missing_rate: 1 - nonNullValues.length / records.length,
      };

      if (variable.type === 'categorical' || variable.type === 'boolean') {
        entry.possible_values = Object.keys(distribution);
        entry.value_distribution = distribution;
        entry.mode_value = getMode(distribution) ?? undefined;
      }

      if (variable.type === 'continuous') {
        const numValues = nonNullValues.filter(v => typeof v === 'number') as number[];
        const stats = calculateDescriptiveStats(numValues);
        if (stats) {
          entry.min_value = stats.min;
          entry.max_value = stats.max;
          entry.mean_value = stats.mean;
          entry.median_value = stats.median;
          entry.std_dev = stats.std_dev;
          entry.percentile_25 = stats.percentile_25;
          entry.percentile_75 = stats.percentile_75;
          entry.distribution_shape = determineDistributionShape(numValues);
        }
      }

      if (variable.type === 'temporal') {
        const dates = nonNullValues
          .map(v => new Date(String(v)))
          .filter(d => !isNaN(d.getTime()))
          .sort((a, b) => a.getTime() - b.getTime());

        if (dates.length > 0) {
          entry.earliest_date = dates[0].toISOString();
          entry.latest_date = dates[dates.length - 1].toISOString();
        }
      }

      await this.supabase.from('aletheia_variable_census').insert(entry);
    }

    return variables;
  }

  /**
   * Run exhaustive cross-tabulations
   */
  async runCrossTabulations(
    records: Record<string, unknown>[],
    variables: ExtractedVariable[]
  ): Promise<CrossTabulation[]> {
    const categorical = filterCategoricalVariables(variables);
    console.log(`[DeepMiner] Running cross-tabs on ${categorical.length} categorical variables`);

    const results: CrossTabulation[] = [];
    const pairs: [ExtractedVariable, ExtractedVariable][] = [];

    // Generate all pairs
    for (let i = 0; i < categorical.length; i++) {
      for (let j = i + 1; j < categorical.length; j++) {
        pairs.push([categorical[i], categorical[j]]);
      }
    }

    // Limit if too many
    const pairsToProcess = pairs.slice(0, this.config.max_cross_tabs || 200);
    console.log(`[DeepMiner] Processing ${pairsToProcess.length} cross-tab pairs`);

    for (const [varA, varB] of pairsToProcess) {
      const crossTabPartial = this.computeCrossTab(records, varA, varB);
      if (crossTabPartial) {
        const crossTab: CrossTabulation = {
          session_id: this.sessionId!,
          domain: this.config.domain,
          ...crossTabPartial,
        };
        results.push(crossTab);
        this.stats.cross_tabs_computed++;

        if (crossTab.significant) {
          this.stats.significant_associations++;
        }

        // Save to database
        await this.supabase.from('aletheia_cross_tabulations').insert(crossTab);
      }
    }

    console.log(`[DeepMiner] Found ${this.stats.significant_associations} significant associations`);
    return results;
  }

  /**
   * Compute a single cross-tabulation
   */
  private computeCrossTab(
    records: Record<string, unknown>[],
    varA: ExtractedVariable,
    varB: ExtractedVariable
  ): Omit<CrossTabulation, 'session_id' | 'domain'> | null {
    // Build contingency table
    const contingencyTable: Record<string, Record<string, number>> = {};
    let validN = 0;

    records.forEach(record => {
      let valA = getValueAtPath(record, varA.path);
      let valB = getValueAtPath(record, varB.path);

      // Normalize boolean values
      if (varA.type === 'boolean') valA = normalizeBooleanValue(valA);
      if (varB.type === 'boolean') valB = normalizeBooleanValue(valB);

      if (valA === null || valA === undefined || valB === null || valB === undefined) return;

      const keyA = String(valA);
      const keyB = String(valB);

      if (!contingencyTable[keyA]) contingencyTable[keyA] = {};
      contingencyTable[keyA][keyB] = (contingencyTable[keyA][keyB] || 0) + 1;
      validN++;
    });

    // Need minimum sample size
    if (validN < 30) return null;

    // Check cell counts
    const rows = Object.keys(contingencyTable);
    if (rows.length < 2) return null;

    const cols = new Set<string>();
    rows.forEach(row => Object.keys(contingencyTable[row]).forEach(col => cols.add(col)));
    if (cols.size < 2) return null;

    // Run chi-square test
    const result = chiSquareTest(contingencyTable);
    if (!result) return null;

    const significant = result.p_value < (this.config.significance_threshold || 0.05);
    const effectCategory = categorizeEffectSize(result.cramers_v, result.degrees_of_freedom);

    // Generate interpretation
    let interpretation = `${varA.name} × ${varB.name}: `;
    interpretation += `χ²=${result.chi_square.toFixed(1)}, p=${formatPValue(result.p_value)}, `;
    interpretation += `V=${result.cramers_v.toFixed(2)} ${significanceStars(result.p_value)}`;

    if (significant && effectCategory !== 'negligible') {
      interpretation += ` - ${effectCategory} effect`;
    }

    return {
      variable_a: varA.name,
      variable_a_path: varA.path,
      variable_b: varB.name,
      variable_b_path: varB.path,
      contingency_table: contingencyTable,
      chi_square: result.chi_square,
      degrees_of_freedom: result.degrees_of_freedom,
      p_value: result.p_value,
      cramers_v: result.cramers_v,
      significant,
      effect_size_category: effectCategory,
      interpretation,
      total_n: records.length,
      valid_n: validN,
    };
  }

  /**
   * Run subgroup analyses
   */
  async runSubgroupAnalyses(
    records: Record<string, unknown>[],
    variables: ExtractedVariable[]
  ): Promise<SubgroupAnalysis[]> {
    const groupingVars = filterGroupingVariables(variables);
    const targetVars = filterTargetVariables(variables);

    console.log(`[DeepMiner] Running subgroup analyses: ${groupingVars.length} grouping × ${targetVars.length} target vars`);

    const results: SubgroupAnalysis[] = [];

    for (const groupVar of groupingVars) {
      for (const targetVar of targetVars) {
        const analysisPartial = this.computeSubgroupAnalysis(records, groupVar, targetVar);
        if (analysisPartial) {
          const analysis: SubgroupAnalysis = {
            session_id: this.sessionId!,
            domain: this.config.domain,
            ...analysisPartial,
          };
          results.push(analysis);
          this.stats.subgroups_analyzed++;

          await this.supabase.from('aletheia_subgroup_analyses').insert(analysis);
        }
      }
    }

    console.log(`[DeepMiner] Completed ${this.stats.subgroups_analyzed} subgroup analyses`);
    return results;
  }

  /**
   * Compute subgroup analysis for a grouping/target pair
   */
  private computeSubgroupAnalysis(
    records: Record<string, unknown>[],
    groupVar: ExtractedVariable,
    targetVar: ExtractedVariable
  ): Omit<SubgroupAnalysis, 'session_id' | 'domain'> | null {
    // Group records by grouping variable
    const groups: Record<string, unknown[]> = {};

    records.forEach(record => {
      const groupVal = getValueAtPath(record, groupVar.path);
      let targetVal = getValueAtPath(record, targetVar.path);

      if (groupVal === null || groupVal === undefined) return;
      if (targetVal === null || targetVal === undefined) return;

      // Normalize boolean targets
      if (targetVar.type === 'boolean') {
        targetVal = normalizeBooleanValue(targetVal);
        if (targetVal === null) return;
      }

      const groupKey = String(groupVal);
      if (!groups[groupKey]) groups[groupKey] = [];
      groups[groupKey].push(targetVal);
    });

    // Need at least 2 groups with sufficient data
    const validGroups = Object.entries(groups).filter(
      ([_, vals]) => vals.length >= (this.config.min_sample_for_subgroup || 20)
    );

    if (validGroups.length < 2) return null;

    // Calculate overall statistic
    const allTargetValues = validGroups.flatMap(([_, vals]) => vals);

    let overallStatistic: number;
    if (targetVar.type === 'boolean') {
      const trueCount = allTargetValues.filter(v => v === true).length;
      overallStatistic = trueCount / allTargetValues.length;
    } else {
      const numValues = allTargetValues.filter(v => typeof v === 'number') as number[];
      const stats = calculateDescriptiveStats(numValues);
      overallStatistic = stats?.mean || 0;
    }

    // Calculate per-group statistics
    const subgroups: SubgroupResult[] = validGroups.map(([name, values]) => {
      let statistic: number;
      let ci: { lower: number; upper: number } | null = null;

      if (targetVar.type === 'boolean') {
        const trueCount = values.filter(v => v === true).length;
        statistic = trueCount / values.length;
        ci = proportionCI(trueCount, values.length);
      } else {
        const numValues = values.filter(v => typeof v === 'number') as number[];
        const stats = calculateDescriptiveStats(numValues);
        statistic = stats?.mean || 0;
      }

      const diffFromOverall = Math.abs(statistic - overallStatistic);
      const threshold = targetVar.type === 'boolean' ? 0.1 : overallStatistic * 0.2;

      return {
        name,
        n: values.length,
        statistic,
        ci_lower: ci?.lower,
        ci_upper: ci?.upper,
        differs_from_overall: diffFromOverall > threshold,
      };
    });

    // Check if any subgroup differs
    const differsFromOverall = subgroups.some(s => s.differs_from_overall);

    // Generate notable findings
    const notableFindings: string[] = [];

    // Find highest and lowest
    const sorted = [...subgroups].sort((a, b) => b.statistic - a.statistic);
    if (sorted.length >= 2) {
      const highest = sorted[0];
      const lowest = sorted[sorted.length - 1];

      if (targetVar.type === 'boolean') {
        notableFindings.push(
          `${highest.name}: ${(highest.statistic * 100).toFixed(0)}% (n=${highest.n})`
        );
        notableFindings.push(
          `${lowest.name}: ${(lowest.statistic * 100).toFixed(0)}% (n=${lowest.n})`
        );
      } else {
        notableFindings.push(
          `${highest.name}: ${highest.statistic.toFixed(2)} (n=${highest.n})`
        );
        notableFindings.push(
          `${lowest.name}: ${lowest.statistic.toFixed(2)} (n=${lowest.n})`
        );
      }
    }

    return {
      subgroup_variable: groupVar.name,
      subgroup_variable_path: groupVar.path,
      target_variable: targetVar.name,
      target_variable_path: targetVar.path,
      subgroups,
      overall_statistic: overallStatistic,
      overall_n: allTargetValues.length,
      test_type: null, // TODO: Add ANOVA/Kruskal-Wallis
      test_statistic: null,
      p_value: null,
      effect_size: null,
      notable_findings: notableFindings,
      differs_from_overall: differsFromOverall,
    };
  }

  /**
   * Run temporal stability analysis
   */
  async runTemporalStability(
    records: Record<string, unknown>[],
    variables: ExtractedVariable[]
  ): Promise<TemporalStabilityAnalysis[]> {
    console.log(`[DeepMiner] Running temporal stability analysis...`);

    const results: TemporalStabilityAnalysis[] = [];
    const booleanVars = variables.filter(v => v.type === 'boolean');

    // Find date field
    const dateFields = ['created_at', '_created_at', 'date', 'experience_date', 'date_time', 'EXPDATE'];
    let dateField: string | null = null;

    for (const field of dateFields) {
      const hasDate = records.some(r => {
        const val = getValueAtPath(r, field);
        return val && !isNaN(new Date(String(val)).getTime());
      });
      if (hasDate) {
        dateField = field;
        break;
      }
    }

    if (!dateField) {
      console.log(`[DeepMiner] No date field found, skipping temporal analysis`);
      return results;
    }

    // Analyze each boolean variable over time
    for (const variable of booleanVars.slice(0, 20)) {
      const analysisPartial = this.computeTemporalStability(records, variable, dateField);
      if (analysisPartial) {
        const analysis: TemporalStabilityAnalysis = {
          session_id: this.sessionId!,
          domain: this.config.domain,
          ...analysisPartial,
        };
        results.push(analysis);

        await this.supabase.from('aletheia_temporal_stability').insert(analysis);
      }
    }

    console.log(`[DeepMiner] Completed ${results.length} temporal stability analyses`);
    return results;
  }

  /**
   * Compute temporal stability for a single variable
   */
  private computeTemporalStability(
    records: Record<string, unknown>[],
    variable: ExtractedVariable,
    dateField: string
  ): Omit<TemporalStabilityAnalysis, 'session_id' | 'domain'> | null {
    // Group by year
    const yearGroups: Record<string, { true: number; total: number }> = {};

    records.forEach(record => {
      const dateVal = getValueAtPath(record, dateField);
      let targetVal = getValueAtPath(record, variable.path);

      if (!dateVal) return;
      targetVal = normalizeBooleanValue(targetVal);
      if (targetVal === null) return;

      const date = new Date(String(dateVal));
      if (isNaN(date.getTime())) return;

      const year = date.getFullYear().toString();

      if (!yearGroups[year]) yearGroups[year] = { true: 0, total: 0 };
      yearGroups[year].total++;
      if (targetVal === true) yearGroups[year].true++;
    });

    // Need at least 3 time periods with sufficient data
    const validPeriods = Object.entries(yearGroups)
      .filter(([_, data]) => data.total >= 10)
      .sort(([a], [b]) => a.localeCompare(b));

    if (validPeriods.length < 3) return null;

    const timePeriods = validPeriods.map(([period, data]) => ({
      period,
      n: data.total,
      statistic: data.true / data.total,
    }));

    // Determine trend
    const trendData = timePeriods.map(p => ({ period: p.period, value: p.statistic }));
    const { trend, stability_score } = determineTrend(trendData);

    // Generate interpretation
    const firstPeriod = timePeriods[0];
    const lastPeriod = timePeriods[timePeriods.length - 1];
    const change = lastPeriod.statistic - firstPeriod.statistic;

    let interpretation = `"${variable.name}" over ${validPeriods.length} years: `;
    interpretation += `${(firstPeriod.statistic * 100).toFixed(0)}% → ${(lastPeriod.statistic * 100).toFixed(0)}% `;
    interpretation += `(${change >= 0 ? '+' : ''}${(change * 100).toFixed(1)}pp). `;
    interpretation += `Trend: ${trend}, stability: ${(stability_score * 100).toFixed(0)}%`;

    return {
      finding: `Rate of "${variable.name}" over time`,
      variable_path: variable.path,
      time_periods: timePeriods,
      trend,
      stability_score,
      trend_test_type: null,
      trend_test_statistic: null,
      trend_p_value: null,
      interpretation,
    };
  }

  /**
   * Main run method - orchestrate full analysis
   */
  async run(): Promise<string> {
    try {
      const sessionId = await this.startSession();
      console.log(`[DeepMiner] Started session ${sessionId} for domain: ${this.config.domain}`);

      // Load data
      const records = await this.loadDomainData();
      this.stats.records_analyzed = records.length;
      console.log(`[DeepMiner] Loaded ${records.length} records`);

      if (records.length === 0) {
        await this.completeSession('completed', 'No data found for domain');
        return sessionId;
      }

      // Phase 1: Variable Census
      console.log(`[DeepMiner] Phase 1: Variable Census`);
      const variables = await this.runVariableCensus(records);

      // Phase 2: Cross-Tabulations
      console.log(`[DeepMiner] Phase 2: Cross-Tabulations`);
      await this.runCrossTabulations(records, variables);

      // Phase 3: Subgroup Analysis
      console.log(`[DeepMiner] Phase 3: Subgroup Analysis`);
      await this.runSubgroupAnalyses(records, variables);

      // Phase 4: Temporal Stability
      console.log(`[DeepMiner] Phase 4: Temporal Stability`);
      await this.runTemporalStability(records, variables);

      // Generate summary
      const summary = `Analyzed ${this.stats.records_analyzed} ${this.config.domain} records. ` +
        `Found ${this.stats.variables_found} variables, ` +
        `${this.stats.significant_associations} significant associations out of ${this.stats.cross_tabs_computed} cross-tabs, ` +
        `${this.stats.subgroups_analyzed} subgroup analyses.`;

      await this.completeSession('completed', summary);
      console.log(`[DeepMiner] Session complete: ${summary}`);

      return sessionId;
    } catch (error) {
      console.error('[DeepMiner] Error:', error);
      await this.completeSession('failed', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }
}

/**
 * Convenience function to run Deep Miner for a domain
 */
export async function runDeepMiner(domain: string): Promise<string> {
  const agent = new DeepMinerAgent({ domain });
  return agent.run();
}
