-- ============================================================================
-- Seed Patterns and Predictions
-- Populates the pattern_matches table with discovered patterns
-- and predictions table with testable hypotheses
-- ============================================================================

-- Insert seed patterns (the 5 discovered patterns)
INSERT INTO aletheia_pattern_matches (
  variable,
  pattern_description,
  domains_matched,
  correlations,
  prevalence_score,
  reliability_score,
  volatility_score,
  confidence_score,
  sample_size,
  detected_at
) VALUES
-- Pattern 1: High absorption predicts success
(
  'absorption_score',
  'High absorption predicts success across domains',
  ARRAY['nde', 'ganzfeld', 'stargate']::aletheia_investigation_type[],
  '[
    {"domain": "nde", "correlation": 0.42, "pValue": 0.02, "sampleSize": 45, "direction": "positive"},
    {"domain": "ganzfeld", "correlation": 0.38, "pValue": 0.03, "sampleSize": 120, "direction": "positive"},
    {"domain": "stargate", "correlation": 0.35, "pValue": 0.04, "sampleSize": 85, "direction": "positive"}
  ]'::jsonb,
  0.6,
  0.97,
  0.92,
  0.89,
  250,
  '2024-06-15T00:00:00.000Z'
),
-- Pattern 2: Stress produces signal
(
  'stress_index',
  'Stress produces signal at all scales',
  ARRAY['nde', 'crisis_apparition', 'geophysical']::aletheia_investigation_type[],
  '[
    {"domain": "nde", "correlation": 0.55, "pValue": 0.001, "sampleSize": 200, "direction": "positive"},
    {"domain": "crisis_apparition", "correlation": 0.48, "pValue": 0.01, "sampleSize": 150, "direction": "positive"},
    {"domain": "geophysical", "correlation": 0.32, "pValue": 0.05, "sampleSize": 80, "direction": "positive"}
  ]'::jsonb,
  0.6,
  0.98,
  0.88,
  0.92,
  430,
  '2024-05-20T00:00:00.000Z'
),
-- Pattern 3: Minimal editing predicts accuracy
(
  'edit_filter',
  'Minimal editing predicts accuracy',
  ARRAY['ganzfeld', 'stargate']::aletheia_investigation_type[],
  '[
    {"domain": "ganzfeld", "correlation": 0.29, "pValue": 0.04, "sampleSize": 180, "direction": "positive"},
    {"domain": "stargate", "correlation": 0.33, "pValue": 0.03, "sampleSize": 150, "direction": "positive"}
  ]'::jsonb,
  0.4,
  0.965,
  0.94,
  0.85,
  330,
  '2024-07-01T00:00:00.000Z'
),
-- Pattern 4: Dynamic targets reduce noise
(
  'target_type',
  'Dynamic targets reduce noise floor',
  ARRAY['ganzfeld']::aletheia_investigation_type[],
  '[
    {"domain": "ganzfeld", "correlation": 0.41, "pValue": 0.008, "sampleSize": 220, "direction": "positive"}
  ]'::jsonb,
  0.2,
  0.992,
  0.95,
  0.91,
  220,
  '2024-04-10T00:00:00.000Z'
),
-- Pattern 5: Creativity correlates with performance
(
  'creative_vocation',
  'Creativity correlates with receiver performance',
  ARRAY['nde', 'ganzfeld']::aletheia_investigation_type[],
  '[
    {"domain": "nde", "correlation": 0.31, "pValue": 0.04, "sampleSize": 90, "direction": "positive"},
    {"domain": "ganzfeld", "correlation": 0.36, "pValue": 0.02, "sampleSize": 140, "direction": "positive"}
  ]'::jsonb,
  0.4,
  0.97,
  0.91,
  0.87,
  230,
  '2024-08-05T00:00:00.000Z'
);

-- Insert 23 predictions (using domains_involved column)
INSERT INTO aletheia_predictions (
  hypothesis,
  domains_involved,
  confidence_score,
  testing_protocol,
  status,
  p_value,
  brier_score,
  created_at,
  resolved_at
) VALUES
-- Confirmed predictions
(
  'Participants with high absorption scores (>75th percentile) will show 15-20% higher hit rates in Ganzfeld experiments',
  ARRAY['ganzfeld']::aletheia_investigation_type[],
  0.89,
  '1. Screen participants using Tellegen Absorption Scale\n2. Run standard Ganzfeld protocol\n3. Compare hit rates between high/low absorption groups\n4. Minimum 30 participants per group',
  'confirmed',
  0.023,
  0.18,
  '2024-06-20T00:00:00.000Z',
  '2024-11-15T00:00:00.000Z'
),
(
  'NDEs occurring during cardiac arrest will have higher veridical perception rates than those during other medical crises',
  ARRAY['nde']::aletheia_investigation_type[],
  0.85,
  '1. Collect NDE reports from cardiac arrest and non-cardiac cases\n2. Document all claimed veridical perceptions\n3. Independently verify each claim\n4. Compare verification rates between groups',
  'confirmed',
  0.031,
  0.22,
  '2024-05-25T00:00:00.000Z',
  '2024-10-20T00:00:00.000Z'
),
(
  'Crisis apparitions will correlate with actual time of death within a 30-minute window in >70% of documented cases',
  ARRAY['crisis_apparition']::aletheia_investigation_type[],
  0.91,
  '1. Collect crisis apparition reports with documented apparition times\n2. Obtain death certificates for time of death\n3. Calculate time difference\n4. Determine percentage within 30-minute window',
  'confirmed',
  0.008,
  0.12,
  '2024-04-15T00:00:00.000Z',
  '2024-09-30T00:00:00.000Z'
),

-- Refuted predictions
(
  'Geomagnetic activity (Kp > 4) will significantly reduce Ganzfeld hit rates',
  ARRAY['ganzfeld']::aletheia_investigation_type[],
  0.72,
  '1. Record Kp index during all Ganzfeld sessions\n2. Group sessions by Kp level (high vs low)\n3. Compare hit rates between groups\n4. Minimum 50 sessions per group',
  'refuted',
  0.34,
  0.58,
  '2024-07-10T00:00:00.000Z',
  '2024-12-01T00:00:00.000Z'
),
(
  'Remote viewers with military training will outperform civilian-trained viewers',
  ARRAY['stargate']::aletheia_investigation_type[],
  0.65,
  '1. Compare hit rates between military and civilian viewers\n2. Control for total experience years\n3. Use blind judging protocol\n4. Minimum 100 sessions per group',
  'refuted',
  0.28,
  0.62,
  '2024-06-01T00:00:00.000Z',
  '2024-11-20T00:00:00.000Z'
),

-- Testing predictions
(
  'EMF spikes (>3 sigma) at allegedly haunted locations will correlate with witness reports of anomalous experiences',
  ARRAY['geophysical']::aletheia_investigation_type[],
  0.78,
  '1. Deploy EMF monitoring at reportedly haunted locations\n2. Blind investigators to location history\n3. Record all subjective experiences with timestamps\n4. Correlate EMF spikes with experience reports',
  'testing',
  NULL,
  NULL,
  '2024-08-15T00:00:00.000Z',
  NULL
),
(
  'Ganzfeld hit rates will be significantly higher when using dynamic video clips vs static images as targets',
  ARRAY['ganzfeld']::aletheia_investigation_type[],
  0.91,
  '1. Randomly assign sessions to static or dynamic targets\n2. Use matched difficulty ratings for targets\n3. Run 100 sessions per condition\n4. Compare hit rates with chi-square test',
  'testing',
  NULL,
  NULL,
  '2024-09-01T00:00:00.000Z',
  NULL
),
(
  'Remote viewing accuracy will peak during 13:30 Local Sidereal Time window',
  ARRAY['stargate']::aletheia_investigation_type[],
  0.83,
  '1. Schedule remote viewing sessions across all LST hours\n2. Record accuracy ratings for each session\n3. Plot accuracy vs LST\n4. Test for significant peak at 13:30 LST',
  'testing',
  NULL,
  NULL,
  '2024-09-15T00:00:00.000Z',
  NULL
),

-- Open predictions
(
  'Individuals reporting crisis apparitions will score higher on measures of thin mental boundaries',
  ARRAY['crisis_apparition']::aletheia_investigation_type[],
  0.82,
  '1. Administer Hartmann Boundary Questionnaire to percipients\n2. Compare with matched controls\n3. Test for significant difference\n4. Minimum 50 participants per group',
  'open',
  NULL,
  NULL,
  '2024-10-01T00:00:00.000Z',
  NULL
),
(
  'Temperature drops during geophysical investigations will correlate with infrasound readings',
  ARRAY['geophysical']::aletheia_investigation_type[],
  0.76,
  '1. Deploy synchronized temperature and infrasound monitoring\n2. Record all anomalous events\n3. Calculate correlation coefficient\n4. Minimum 20 anomalous events for analysis',
  'open',
  NULL,
  NULL,
  '2024-10-05T00:00:00.000Z',
  NULL
),
(
  'NDE experiencers will show reduced fear of death compared to matched controls',
  ARRAY['nde']::aletheia_investigation_type[],
  0.88,
  '1. Administer death anxiety scale to NDE experiencers\n2. Compare with matched controls (same medical event, no NDE)\n3. Test for significant difference\n4. Control for time since event',
  'open',
  NULL,
  NULL,
  '2024-10-10T00:00:00.000Z',
  NULL
),
(
  'Receivers in Ganzfeld experiments who report more vivid mental imagery will have higher hit rates',
  ARRAY['ganzfeld']::aletheia_investigation_type[],
  0.84,
  '1. Administer Vividness of Visual Imagery Questionnaire pre-session\n2. Correlate VVIQ scores with hit/miss outcomes\n3. Test for significant correlation\n4. Minimum 100 participants',
  'open',
  NULL,
  NULL,
  '2024-10-15T00:00:00.000Z',
  NULL
),
(
  'Remote viewing sketch accuracy will be higher for emotionally significant targets',
  ARRAY['stargate']::aletheia_investigation_type[],
  0.79,
  '1. Rate targets for emotional significance\n2. Compare sketch accuracy between high/low emotional targets\n3. Use blind judging of sketches\n4. Minimum 50 sessions per condition',
  'open',
  NULL,
  NULL,
  '2024-10-20T00:00:00.000Z',
  NULL
),
(
  'Crisis apparitions will be more frequently reported by individuals with close emotional bonds to the dying person',
  ARRAY['crisis_apparition']::aletheia_investigation_type[],
  0.86,
  '1. Rate relationship closeness for each case\n2. Correlate with apparition occurrence\n3. Control for physical proximity\n4. Minimum 100 death events with potential percipients',
  'open',
  NULL,
  NULL,
  '2024-10-25T00:00:00.000Z',
  NULL
),
(
  'Meditation practitioners will show higher hit rates in Ganzfeld experiments than non-meditators',
  ARRAY['ganzfeld']::aletheia_investigation_type[],
  0.81,
  '1. Screen for regular meditation practice (>6 months)\n2. Compare hit rates with non-meditators\n3. Control for absorption and openness\n4. Minimum 40 participants per group',
  'open',
  NULL,
  NULL,
  '2024-11-01T00:00:00.000Z',
  NULL
),
(
  'Geophysical anomalies will cluster around geological fault lines',
  ARRAY['geophysical']::aletheia_investigation_type[],
  0.74,
  '1. Map all documented geophysical anomalies\n2. Calculate distance to nearest fault line\n3. Compare with random baseline\n4. Test for significant clustering',
  'open',
  NULL,
  NULL,
  '2024-11-05T00:00:00.000Z',
  NULL
),
(
  'NDE accounts with veridical perceptions will have higher Greyson scale scores',
  ARRAY['nde']::aletheia_investigation_type[],
  0.87,
  '1. Administer Greyson NDE Scale to all experiencers\n2. Categorize by presence of veridical claims\n3. Compare mean Greyson scores\n4. Test for significant difference',
  'open',
  NULL,
  NULL,
  '2024-11-10T00:00:00.000Z',
  NULL
),
(
  'First-time remote viewers will show above-chance accuracy within their first 5 sessions',
  ARRAY['stargate']::aletheia_investigation_type[],
  0.77,
  '1. Test completely naive participants\n2. Run 5 sessions per participant\n3. Calculate overall hit rate\n4. Compare to chance expectation (25%)',
  'open',
  NULL,
  NULL,
  '2024-11-15T00:00:00.000Z',
  NULL
),
(
  'Artists and musicians will show higher hit rates across all psi domains',
  ARRAY['ganzfeld', 'stargate', 'nde']::aletheia_investigation_type[],
  0.85,
  '1. Screen participants for creative profession\n2. Run standard protocols in each domain\n3. Compare hit rates with non-artists\n4. Minimum 30 participants per group per domain',
  'open',
  NULL,
  NULL,
  '2024-11-20T00:00:00.000Z',
  NULL
),
(
  'Double-blind protocols will not significantly reduce effect sizes compared to single-blind',
  ARRAY['ganzfeld', 'stargate']::aletheia_investigation_type[],
  0.72,
  '1. Run matched experiments with different blinding levels\n2. Calculate effect sizes for each condition\n3. Test for significant difference\n4. Meta-analyze existing studies',
  'open',
  NULL,
  NULL,
  '2024-11-25T00:00:00.000Z',
  NULL
),
(
  'Stress-related crisis apparitions will occur more frequently during sleep or drowsy states',
  ARRAY['crisis_apparition']::aletheia_investigation_type[],
  0.80,
  '1. Document state of consciousness at time of apparition\n2. Calculate proportion in altered states\n3. Compare with baseline occurrence of these states\n4. Test for significant over-representation',
  'open',
  NULL,
  NULL,
  '2024-12-01T00:00:00.000Z',
  NULL
),
(
  'Infrasound below 20Hz will be present during >50% of reported anomalous experiences at investigation sites',
  ARRAY['geophysical']::aletheia_investigation_type[],
  0.75,
  '1. Deploy infrasound monitoring at all investigation sites\n2. Record all subjective anomalous experiences\n3. Check for infrasound presence during experiences\n4. Calculate percentage with infrasound present',
  'open',
  NULL,
  NULL,
  '2024-12-05T00:00:00.000Z',
  NULL
),
(
  'Shared crisis apparitions (multiple percipients) will have higher verification rates',
  ARRAY['crisis_apparition']::aletheia_investigation_type[],
  0.83,
  '1. Categorize cases by number of percipients\n2. Independently verify each apparition\n3. Compare verification rates for shared vs individual\n4. Minimum 50 cases per category',
  'open',
  NULL,
  NULL,
  '2024-12-10T00:00:00.000Z',
  NULL
);

-- Link predictions to their source patterns
UPDATE aletheia_predictions
SET pattern_id = (SELECT id FROM aletheia_pattern_matches WHERE variable = 'absorption_score')
WHERE hypothesis LIKE '%absorption%' AND pattern_id IS NULL;

UPDATE aletheia_predictions
SET pattern_id = (SELECT id FROM aletheia_pattern_matches WHERE variable = 'stress_index')
WHERE (hypothesis LIKE '%stress%' OR hypothesis LIKE '%crisis%') AND pattern_id IS NULL;

UPDATE aletheia_predictions
SET pattern_id = (SELECT id FROM aletheia_pattern_matches WHERE variable = 'target_type')
WHERE hypothesis LIKE '%dynamic%' AND pattern_id IS NULL;

UPDATE aletheia_predictions
SET pattern_id = (SELECT id FROM aletheia_pattern_matches WHERE variable = 'creative_vocation')
WHERE (hypothesis LIKE '%artist%' OR hypothesis LIKE '%creative%' OR hypothesis LIKE '%musician%') AND pattern_id IS NULL;
