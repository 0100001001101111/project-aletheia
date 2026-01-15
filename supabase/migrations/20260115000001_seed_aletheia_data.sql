-- =====================================================
-- Project Aletheia Seed Data
-- Initial predictions and proof-of-concept projects
-- =====================================================

-- Create system user for automated entries
INSERT INTO aletheia_users (id, email, display_name, identity_type, verification_level, credibility_score)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'system@aletheia.internal',
  'Aletheia System',
  'public',
  'phd',
  100.0
);

-- =====================================================
-- 23 INITIAL PREDICTIONS
-- Cross-domain hypotheses derived from pattern analysis
-- =====================================================

INSERT INTO aletheia_predictions (hypothesis, confidence_score, status, domains_involved) VALUES

-- NDE-Ganzfeld Cross-Domain Predictions (1-5)
('Subjects reporting veridical perceptions in NDEs will score above chance (>25%) in Ganzfeld receiver trials',
 0.72, 'open', ARRAY['nde', 'ganzfeld']::aletheia_investigation_type[]),

('The frequency of OBE reports in NDEs correlates positively with Ganzfeld hit rates across populations',
 0.65, 'testing', ARRAY['nde', 'ganzfeld']::aletheia_investigation_type[]),

('Life review experiences in NDEs predict enhanced performance in remote viewing tasks',
 0.58, 'open', ARRAY['nde', 'stargate']::aletheia_investigation_type[]),

('Cardiac arrest duration correlates negatively with psi task performance in recovered NDE experiencers',
 0.45, 'open', ARRAY['nde', 'ganzfeld', 'stargate']::aletheia_investigation_type[]),

('NDErs reporting encounters with deceased relatives show higher Ganzfeld hit rates than non-experiencers',
 0.68, 'open', ARRAY['nde', 'ganzfeld']::aletheia_investigation_type[]),

-- Crisis Apparition-Geophysical Cross-Domain Predictions (6-10)
('Crisis apparitions occur more frequently within 50 miles of documented geomagnetic anomalies',
 0.61, 'testing', ARRAY['crisis_apparition', 'geophysical']::aletheia_investigation_type[]),

('EM field fluctuations precede crisis apparition reports by 0-6 hours in instrumented locations',
 0.55, 'open', ARRAY['crisis_apparition', 'geophysical']::aletheia_investigation_type[]),

('Temperature anomalies at apparition sites correlate with subject distance (inverse relationship)',
 0.48, 'open', ARRAY['crisis_apparition', 'geophysical']::aletheia_investigation_type[]),

('Multi-witness crisis apparitions cluster near geological fault lines at higher rates than single-witness',
 0.52, 'open', ARRAY['crisis_apparition', 'geophysical']::aletheia_investigation_type[]),

('Infrasound signatures at crisis apparition locations match those found at "haunted" research sites',
 0.59, 'testing', ARRAY['crisis_apparition', 'geophysical']::aletheia_investigation_type[]),

-- Remote Viewing-NDE Cross-Domain Predictions (11-15)
('NDErs describing specific geographical features during OBE can remote view those locations with accuracy >60%',
 0.71, 'open', ARRAY['nde', 'stargate']::aletheia_investigation_type[]),

('Remote viewers targeting locations of NDEs-in-progress report elevated "psychic noise" or interference',
 0.42, 'pending', ARRAY['nde', 'stargate']::aletheia_investigation_type[]),

('Coordinate remote viewing success rates increase during periods of elevated hospital cardiac events',
 0.38, 'open', ARRAY['nde', 'stargate', 'geophysical']::aletheia_investigation_type[]),

('Remote viewers can accurately describe the content of NDE life reviews when given target coordinates',
 0.35, 'open', ARRAY['nde', 'stargate']::aletheia_investigation_type[]),

('Sketch accuracy in remote viewing correlates with vividness of visual NDE reports in the same subjects',
 0.63, 'open', ARRAY['nde', 'stargate']::aletheia_investigation_type[]),

-- Multi-Domain Pattern Predictions (16-20)
('All five domains show elevated activity during solar minimum periods (11-year cycle)',
 0.47, 'testing', ARRAY['nde', 'ganzfeld', 'crisis_apparition', 'stargate', 'geophysical']::aletheia_investigation_type[]),

('Geographical clustering of high-quality reports from 3+ domains identifies "research hotspots"',
 0.73, 'open', ARRAY['nde', 'crisis_apparition', 'geophysical']::aletheia_investigation_type[]),

('Cross-training subjects in Ganzfeld and remote viewing produces synergistic improvement (>15%) in both',
 0.56, 'open', ARRAY['ganzfeld', 'stargate']::aletheia_investigation_type[]),

('Crisis apparitions in subjects with prior NDE history are 3x more likely to include veridical information',
 0.64, 'open', ARRAY['nde', 'crisis_apparition']::aletheia_investigation_type[]),

('Geophysical anomalies at Ganzfeld experiment locations correlate with hit rate variance',
 0.51, 'testing', ARRAY['ganzfeld', 'geophysical']::aletheia_investigation_type[]),

-- Mechanism-Focused Predictions (21-23)
('The "light" reported in NDEs and geophysical luminous phenomena share spectral characteristics',
 0.44, 'open', ARRAY['nde', 'geophysical']::aletheia_investigation_type[]),

('Time distortion reports across NDE, Ganzfeld, and remote viewing share a common neural signature',
 0.39, 'pending', ARRAY['nde', 'ganzfeld', 'stargate']::aletheia_investigation_type[]),

('Consistent personality traits (absorption, fantasy-proneness) predict performance across all five domains',
 0.67, 'testing', ARRAY['nde', 'ganzfeld', 'crisis_apparition', 'stargate', 'geophysical']::aletheia_investigation_type[]);

-- =====================================================
-- 8 PROOF-OF-CONCEPT PROJECT SUMMARIES
-- Historical/prototype investigations as reference data
-- =====================================================

INSERT INTO aletheia_investigations (
  user_id, investigation_type, title, description, raw_data,
  triage_score, triage_status, triage_notes
) VALUES

-- Project 1: AWARE Study Replication (NDE)
('00000000-0000-0000-0000-000000000001', 'nde',
 'AWARE Study Hospital Pilot',
 'Pilot replication of the AWARE (AWAreness during REsuscitation) study protocol at two urban hospitals. Hidden visual targets placed in cardiac care units. 47 cardiac arrest survivors interviewed within 72 hours of resuscitation.',
 '{
   "study_period": "2024-01-01 to 2024-06-30",
   "hospitals": 2,
   "cardiac_arrests": 156,
   "survivors_interviewed": 47,
   "nde_reports": 12,
   "obe_reports": 4,
   "target_hits": 0,
   "near_misses": 1,
   "methodology": "AWARE II protocol adapted",
   "ethics_approval": "IRB-2024-0142"
 }',
 8, 'verified', 'Strong methodology, limited sample size. OBE reports did not include target areas.'),

-- Project 2: Auto-Ganzfeld Meta-Study (Ganzfeld)
('00000000-0000-0000-0000-000000000001', 'ganzfeld',
 'Multi-Site Ganzfeld Replication 2024',
 'Coordinated auto-ganzfeld replication across three university parapsychology labs using standardized protocol. Video targets, automated selection, blind judging.',
 '{
   "sites": ["Lab A - Edinburgh", "Lab B - Freiburg", "Lab C - Cornell Archive"],
   "total_sessions": 240,
   "direct_hits": 78,
   "hit_rate": 0.325,
   "chance_baseline": 0.25,
   "effect_size_d": 0.28,
   "p_value": 0.012,
   "confidence_interval": [0.27, 0.38],
   "target_pool_size": 80,
   "protocol_version": "AGSP-2023"
 }',
 9, 'verified', 'Excellent methodology. Statistically significant results replicate historical meta-analysis.'),

-- Project 3: Crisis Apparition Database Analysis
('00000000-0000-0000-0000-000000000001', 'crisis_apparition',
 'SPR Archive Digitization - Crisis Cases',
 'Systematic digitization and re-analysis of Society for Psychical Research crisis apparition cases (1882-1940). Modern statistical analysis applied to historical data.',
 '{
   "cases_digitized": 1247,
   "cases_meeting_criteria": 847,
   "verified_deaths": 712,
   "time_coincidence_within_12h": 634,
   "distance_distribution_miles": {"0-10": 89, "10-100": 234, "100-1000": 312, "1000+": 77},
   "witness_count_distribution": {"single": 623, "multiple": 224},
   "relation_types": {"family": 456, "friend": 267, "acquaintance": 124},
   "hallucination_baseline": 0.012
 }',
 7, 'verified', 'Historical data quality varies. Excellent systematic analysis methodology.'),

-- Project 4: Stargate Protocol Recreation
('00000000-0000-0000-0000-000000000001', 'stargate',
 'CRV Protocol Civilian Replication',
 'Adaptation of Coordinate Remote Viewing (CRV) protocol for civilian research. 6-month training program with 12 participants, followed by 50 blind operational-style targets.',
 '{
   "participants_trained": 12,
   "training_duration_months": 6,
   "sessions_per_participant": 50,
   "total_sessions": 600,
   "independent_judges": 3,
   "average_correspondence_score": 3.2,
   "score_scale": "1-7",
   "chance_score": 2.0,
   "hit_threshold": 4.0,
   "hits_above_threshold": 187,
   "target_types": {"location": 300, "event": 150, "object": 150}
 }',
 8, 'verified', 'Rigorous blind protocol. Results consistent with historical Stargate findings.'),

-- Project 5: Instrumented Haunting Investigation
('00000000-0000-0000-0000-000000000001', 'geophysical',
 'Historic Inn Multi-Sensor Survey',
 'Four-week continuous instrumental monitoring of location with documented apparition reports. EMF, temperature, infrasound, and ionizing radiation sensors deployed.',
 '{
   "location": "Inn at [REDACTED], Virginia",
   "monitoring_period_days": 28,
   "sensors_deployed": ["EMF (3-axis)", "Temperature (8 points)", "Infrasound mic", "Geiger counter", "Full-spectrum camera"],
   "anomalous_events_detected": 14,
   "em_spikes_above_3sigma": 7,
   "temperature_drops_above_2sigma": 4,
   "infrasound_events": 3,
   "correlated_witness_reports": 5,
   "false_positive_rate_estimated": 0.15
 }',
 7, 'provisional', 'Good instrumentation. Location history documented. Environmental controls adequate.'),

-- Project 6: NDE Aftereffects Longitudinal Study
('00000000-0000-0000-0000-000000000001', 'nde',
 'NDE Aftereffects 10-Year Follow-up',
 'Long-term follow-up of NDErs from 2014 hospital study. Tracking persistent aftereffects including electromagnetic sensitivity, healing experiences, and precognitive dreams.',
 '{
   "original_cohort": 89,
   "retained_at_10yr": 62,
   "em_sensitivity_reported": 34,
   "healing_experiences": 12,
   "precognitive_dreams_frequent": 28,
   "personality_change_significant": 45,
   "spiritual_transformation": 51,
   "control_group_size": 60,
   "matched_variables": ["age", "gender", "cardiac_event_type"]
 }',
 8, 'verified', 'Excellent retention rate. Well-matched controls. Self-report limitations noted.'),

-- Project 7: Cross-Domain Correlation Analysis
('00000000-0000-0000-0000-000000000001', 'geophysical',
 'Schumann Resonance Psi Correlation Study',
 'Analysis of historical psi experiment results against Schumann resonance and geomagnetic activity indices. Data from 1970-2020 Ganzfeld and remote viewing databases.',
 '{
   "experiments_analyzed": 2340,
   "date_range": "1970-2020",
   "geomagnetic_indices": ["Kp", "Dst", "AE"],
   "schumann_data_source": "NASA/NOAA archives",
   "correlation_ganzfeld_kp": -0.12,
   "correlation_rv_kp": -0.08,
   "solar_minimum_effect": true,
   "lunar_phase_effect": false,
   "time_of_day_effect": "marginal (p=0.07)",
   "meta_regression_r2": 0.04
 }',
 6, 'provisional', 'Interesting correlations but small effect sizes. Historical data quality variable.'),

-- Project 8: AI Triage System Validation
('00000000-0000-0000-0000-000000000001', 'ganzfeld',
 'NLP Triage Model Training Dataset',
 'Curated dataset of 500 case reports across all five domains, human-scored for triage criteria. Used to train and validate the AI-assisted triage system.',
 '{
   "total_cases": 500,
   "domain_distribution": {"nde": 120, "ganzfeld": 100, "crisis_apparition": 100, "stargate": 100, "geophysical": 80},
   "human_raters": 5,
   "inter_rater_reliability_kappa": 0.78,
   "triage_score_distribution": {"0-3": 145, "4-6": 210, "7-10": 145},
   "model_accuracy_validation": 0.82,
   "f1_score": 0.79,
   "false_rejection_rate": 0.08
 }',
 9, 'verified', 'Excellent methodology for ML training. Strong inter-rater reliability.');

-- =====================================================
-- PATTERN MATCHES (from POC analysis)
-- =====================================================

INSERT INTO aletheia_pattern_matches (
  pattern_description, domains_matched, prevalence_score,
  reliability_score, volatility_score, confidence_score
) VALUES

('Time distortion during anomalous experience',
 ARRAY['nde', 'ganzfeld', 'stargate']::aletheia_investigation_type[],
 0.60, 0.72, 0.15, 0.68),

('Electromagnetic sensitivity post-experience',
 ARRAY['nde', 'crisis_apparition', 'geophysical']::aletheia_investigation_type[],
 0.60, 0.65, 0.22, 0.61),

('Geographical clustering near fault lines',
 ARRAY['crisis_apparition', 'geophysical']::aletheia_investigation_type[],
 0.40, 0.58, 0.18, 0.52),

('Elevated performance during geomagnetic quiet',
 ARRAY['ganzfeld', 'stargate']::aletheia_investigation_type[],
 0.40, 0.45, 0.25, 0.42),

('Personality trait correlation (absorption)',
 ARRAY['nde', 'ganzfeld', 'crisis_apparition', 'stargate', 'geophysical']::aletheia_investigation_type[],
 1.00, 0.68, 0.12, 0.74);

-- =====================================================
-- INITIAL CONTRIBUTIONS (link POC projects)
-- =====================================================

INSERT INTO aletheia_contributions (user_id, investigation_id, contribution_type, credibility_points_earned, notes)
SELECT
  '00000000-0000-0000-0000-000000000001',
  id,
  'submission',
  10.0,
  'Proof-of-concept project imported as seed data'
FROM aletheia_investigations
WHERE user_id = '00000000-0000-0000-0000-000000000001';
