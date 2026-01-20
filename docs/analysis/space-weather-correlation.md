# Space Weather Correlation Analysis

**Date:** January 20, 2026
**Dataset:** 4,966 UFO sightings enriched with Kp index data (1932-2014)
**Baseline:** 242,528 Kp measurements from GFZ Potsdam

## Summary

Chi-square test results:
- **χ² = 244.89**, df = 9, **p < 10⁻⁴⁰**
- The UFO sighting Kp distribution differs significantly from the baseline geomagnetic activity distribution

## Key Finding

**The primary signal is excess sightings during geomagnetically quiet conditions (Kp 0).**

| Metric | Value |
|--------|-------|
| Observed at Kp 0 | 1,310 |
| Expected at Kp 0 | 927.6 |
| Excess | **+41%** |
| Chi-square contribution | 157.62 (64% of total) |

This finding is statistically robust with adequate sample size.

## Full Observed vs Expected Table

| Kp Bin | Observed | Expected | Obs/Exp Ratio | Chi² Component | Interpretation |
|--------|----------|----------|---------------|----------------|----------------|
| **0** | 1,310 | 927.6 | **1.41** | 157.62 | +41% excess |
| 1 | 1,241 | 1,299.1 | 0.96 | 2.60 | -4% |
| 2 | 1,065 | 1,194.9 | 0.89 | 14.12 | -11% |
| 3 | 745 | 852.4 | 0.87 | 13.53 | -13% |
| 4 | 351 | 433.6 | 0.81 | 15.74 | -19% |
| 5 | 157 | 168.5 | 0.93 | 0.79 | -7% |
| 6 | 43 | 59.0 | 0.73 | 4.33 | -27% |
| **7** | 31 | 21.6 | **1.43** | 4.05 | +43% (n=31) |
| **8** | 19 | 8.6 | **2.21** | 12.58 | +121% (n=19) |
| **9** | 4 | 0.6 | **6.71** | 19.54 | +571% (n=4) |

## Interpretation

### Likely Explanation: Observation Bias

The Kp 0 excess is most parsimoniously explained by **observation bias**:

1. **Clear sky conditions** - Low geomagnetic activity correlates with stable atmospheric conditions
2. **Better visibility** - Quiet geomagnetic conditions mean fewer auroral displays that could explain away sightings
3. **More time outdoors** - Pleasant weather encourages sky-watching

This interpretation aligns with the fact that Kp 1-6 shows consistent underrepresentation (4-27% fewer events than expected).

### High-Kp Findings: Insufficient Data

The elevated ratios at Kp 7-9 (1.43x to 6.71x) are **suggestive but unreliable**:

| Kp Range | Total Events | Expected | Assessment |
|----------|--------------|----------|------------|
| Kp 7-9 | 54 | 30.8 | Sample too small for confidence |
| Kp 9 alone | 4 | 0.6 | Anecdotal at best |

The Kp 9 events cluster around famous historical storms (Bastille Day 2000, Halloween Storms 2003), which may reflect **reporting bias** during widely-publicized space weather events.

## Caveats

1. **No weather/visibility controls** - The Kp 0 excess may simply reflect clear skies
2. **Temporal clustering** - Events are not uniformly distributed across the 82-year period
3. **Reporting bias** - Major geomagnetic storms receive media coverage, potentially increasing UFO reports
4. **Selection bias** - NUFORC data skews toward certain demographics and regions

## Next Steps to Distinguish Signal from Bias

### Control Analysis Required

1. **Weather/Visibility Control**
   - Compare Kp distribution for daytime vs nighttime sightings
   - If available, cross-reference with historical weather data

2. **Physiological Effect Subset**
   - Compare Kp distribution for sightings WITH physiological effects (nausea, tingling, etc.) vs WITHOUT
   - Hypothesis: If geomagnetic activity affects human perception, physiological-effect sightings should show different Kp pattern

3. **Urban vs Rural Comparison**
   - Urban sightings may have different observation bias patterns
   - Light pollution affects visibility regardless of Kp

4. **Shape/Duration Analysis**
   - Do "light" sightings (possibly auroral) show different Kp patterns than "structured craft"?

## Conclusion

**Current Status:** The Kp 0 correlation is likely observation bias pending control analysis.

The statistical significance (p < 10⁻⁴⁰) confirms the distribution differs from baseline, but **statistical significance ≠ meaningful signal**. The most parsimonious explanation remains that people see more UFOs when sky conditions are good, and sky conditions are good when geomagnetic activity is low.

The high-Kp excess (n=54) requires additional data before drawing conclusions.

---

*Analysis performed using PostgreSQL on Supabase. Raw data available in `aletheia_investigations` and `aletheia_space_weather` tables.*
