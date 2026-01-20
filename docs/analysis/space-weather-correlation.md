# Space Weather Correlation Analysis

**Date:** January 20, 2026
**Status:** HYPOTHESIS REFUTED
**Dataset:** 4,966 UFO sightings enriched with Kp index data (1932-2014)
**Baseline:** 242,528 Kp measurements from GFZ Potsdam

## Executive Summary

**The space weather hypothesis for UFO sightings is refuted.** The observed Kp correlation is explained by observation and reporting bias, not geomagnetic effects on perception.

- Kp 0 excess (+41%) reflects clear sky visibility, not geomagnetic sensitivity
- High-Kp excess is driven by NON-physiological sightings (opposite of prediction)
- Physiological-effect sightings show LESS extreme Kp patterns than non-physiological

## Statistical Results

Chi-square test:
- **χ² = 244.89**, df = 9, **p < 10⁻⁴⁰**
- The distribution differs significantly from baseline, but bias explains the pattern

### Observed vs Expected Table

| Kp Bin | Observed | Expected | Obs/Exp Ratio | Chi² Component |
|--------|----------|----------|---------------|----------------|
| **0** | 1,310 | 927.6 | **1.41** | 157.62 (64%) |
| 1 | 1,241 | 1,299.1 | 0.96 | 2.60 |
| 2 | 1,065 | 1,194.9 | 0.89 | 14.12 |
| 3 | 745 | 852.4 | 0.87 | 13.53 |
| 4 | 351 | 433.6 | 0.81 | 15.74 |
| 5 | 157 | 168.5 | 0.93 | 0.79 |
| 6 | 43 | 59.0 | 0.73 | 4.33 |
| 7 | 31 | 21.6 | 1.43 | 4.05 |
| 8 | 19 | 8.6 | 2.21 | 12.58 |
| 9 | 4 | 0.6 | 6.71 | 19.54 |

## Control Analysis: Physiological Effects

**Key test:** If geomagnetic activity affects human perception, sightings WITH physiological effects should show different (more extreme) Kp patterns.

### Results (χ² = 42.66, df = 9, p < 0.001)

| Metric | WITH Physio Effects | WITHOUT Physio Effects |
|--------|---------------------|------------------------|
| Sample size | 2,231 | 2,735 |
| Mean Kp | 1.989 | 2.072 |
| Kp 0 events | 25.4% (1.36x baseline) | **27.2% (1.45x baseline)** |
| Kp 7+ events | **0.63%** (n=14) | **1.46%** (n=40) |

### Interpretation

**The pattern is opposite to the hypothesis prediction:**

1. **Non-physiological sightings** show STRONGER Kp 0 excess (27.2% vs 25.4%)
2. **Non-physiological sightings** show 2.3x MORE high-Kp events (1.46% vs 0.63%)
3. **Physiological-effect sightings** have a flatter, more baseline-like distribution

This refutes the hypothesis that geomagnetic activity triggers physiological experiences. The high-Kp cluster reflects **reporting bias during publicized space weather events** - people without physiological effects are more likely to report during storms when media coverage prompts "maybe that was a UFO" thinking.

## Bias Mechanisms Identified

### 1. Observation Bias (Kp 0 Excess)
- Low geomagnetic activity correlates with stable atmospheric conditions
- Clear skies = better visibility = more sightings reported
- Affects both physiological and non-physiological reports

### 2. Reporting Bias (High-Kp Excess)
- Major geomagnetic storms receive media coverage
- Bastille Day 2000, Halloween Storms 2003 show clustering
- Disproportionately affects NON-physiological reports
- People with genuine physiological experiences don't need news prompts

## Data Limitations by Domain

### UFO (n=4,966 with Kp data)
**Status: Full analysis complete. Hypothesis refuted.**

Individual event timestamps enabled Kp enrichment. The correlation is explained by observation/reporting bias, not geomagnetic effects on perception.

### Ganzfeld (n=52 records)
**Status: Cannot test. Data consists of study-level aggregations.**

Current records contain meta-analysis statistics (hit_rate, total_sessions, effect_size_d) without individual trial timestamps. To test the Spottiswoode/Persinger hypothesis would require raw session logs with:
- Precise session start times
- Binary hit/miss outcomes per trial
- Ideally: Local Sidereal Time (LST) for replication of prior findings

### STARGATE/Remote Viewing (n=104 records)
**Status: Cannot test. Data consists of program summaries.**

Records are either aggregate program statistics or CIA document references without session timestamps. Would require declassified session records with precise timing to test Kp correlation.

### NDE (n=2 records)
**Status: Insufficient data.**

Only 2 records. Even with timestamps, sample size inadequate for statistical analysis.

### Crisis Apparitions (n=18 records)
**Status: Cannot test. Data consists of case summaries.**

Records contain aggregate statistics from historical collections (e.g., "Phantasms of the Living"). Individual cases lack precise timestamps for both the percipient experience and the distant crisis event.

### Geophysical (n=27 records)
**Status: Not evaluated.**

Domain focuses on earthquake/tectonic correlations rather than space weather.

## Future Data Collection

All new investigations submitted to Aletheia are automatically enriched with Kp at event time. As individual-level data accumulates (particularly for Ganzfeld and controlled psi experiments), the space weather hypothesis can be tested in domains with less observation bias.

**Requirements for testable Ganzfeld data:**
- Individual session records (not study summaries)
- Precise timestamp (date + time to the hour minimum)
- Binary outcome (hit/miss) or continuous measure
- Ideally: receiver identity for within-subject analysis

## Conclusion

**The UFO-Kp correlation is a methodological artifact, not evidence of geomagnetic effects on perception.**

The control analysis using physiological effects as a proxy for genuine anomalous experiences shows the opposite pattern from what the hypothesis predicts. Statistical significance (p < 10⁻⁴⁰) does not imply meaningful signal when bias mechanisms are identified.

The hypothesis remains untestable for other domains until individual trial-level data with timestamps becomes available.

---

*Analysis performed January 20, 2026 using PostgreSQL on Supabase.*
*Raw data: `aletheia_investigations`, `aletheia_space_weather` tables.*
