/**
 * Aletheia Research Agent - Module Exports
 * Phase 2: Analysis Engine
 */

// Core runner
export { AletheiaAgent, getAgentConfig, isAgentEnabled } from './runner';

// Pattern scanning
export { scanForPatterns, scanCoLocation, scanTemporalClusters, scanGeographicAnomalies, scanAttributeCorrelations } from './scanner';

// Hypothesis generation
export { generateHypothesis, saveHypothesis, updateHypothesisStatus, generateHypothesesBatch } from './hypothesis-generator';

// Statistical tests
export {
  chiSquareTest,
  tTest,
  mannWhitneyTest,
  correlationTest,
  binomialTest,
  monteCarloTest,
  selectAndRunTest,
  mean,
  stdDev,
  variance,
  zScore,
} from './statistics';

// Confound checking
export { checkAllConfounds, allConfoundsPassed, checkPopulationDensityConfound, checkSeasonalityConfound, checkReportingBiasConfound, checkGeographicConfounds } from './confounds';

// Holdout validation
export { validateWithHoldout, splitData, getRelevantInvestigationIds } from './validation';

// Findings
export { generateFinding, saveFinding, updateFindingStatus, getPendingFindings, calculateConfidence } from './findings';

// Types
export type {
  AgentSession,
  AgentLog,
  AgentHypothesis,
  AgentTest,
  AgentFinding,
  AgentConfig,
  AgentStatus,
  LogType,
  PatternType,
  PatternCandidate,
  TestResult,
  ConfoundCheckResult,
  GeneratedHypothesis,
  HoldoutSplit,
  FindingData,
  AgentConfigValues,
  DomainCounts,
  InvestigationRecord,
  GridCellData,
} from './types';
