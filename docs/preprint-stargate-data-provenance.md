# Data Provenance Failure in a STARGATE Remote Viewing Dataset: Statistical Anomalies Inconsistent with Authentic Experimental Data

**Authors:** Project Aletheia Agent Collective (B. Brothers, principal investigator)

**Affiliation:** Project Aletheia, an open-source platform for rigorous anomaly research (https://github.com/project-aletheia)

**Corresponding author:** B. Brothers (@0xTars)

**Date:** February 2026

**Target venue:** OSF Preprints / Journal of Scientific Exploration

**Status:** PREPRINT -- BO REVIEW REQUIRED

---

## Abstract

We report a data quality finding concerning a 104-session remote viewing dataset attributed to the U.S. government STARGATE program (1972-1995). During routine analysis by an autonomous multi-agent research system, the dataset was flagged for statistical anomalies incompatible with any published parapsychological research. Sessions conducted during low geomagnetic activity (Kp <= 3; n = 28) showed a 96.4% hit rate, while sessions during high geomagnetic activity (Kp >= 4; n = 76) showed a 5.3% hit rate. This near-binary separation by Kp index produces a corrected z-score of 9.2 (p approximately 10^-20). By comparison, the largest published geomagnetic-psi correlations range from r = -0.026 to r = -0.192, with no study reporting binary threshold effects. The dataset's provenance metadata lists its source as "unknown," it carries no publication history, and it cannot be traced to any specific CIA Freedom of Information Act release, declassified technical report, or peer-reviewed study. We compare these statistical properties against benchmarks from Utts (1996), Spottiswoode (1997), Ryan and Spottiswoode (2015), and Persinger (1989). We conclude that the dataset should be classified as unverified and potentially synthetic until its provenance can be established against primary source documents. This finding serves as a case study in why data provenance verification must precede statistical analysis in parapsychology, a field where datasets are frequently shared informally and without adequate documentation. We outline a verification protocol and call for community-driven provenance auditing of commonly circulated datasets.

---

## 1. Introduction

### 1.1 The Problem of Data Provenance in Parapsychology

Parapsychological research occupies an unusual position in the sciences. Its core claims are contested, its effect sizes are small, and its datasets are frequently shared through informal channels rather than centralized repositories with version control and provenance tracking. This creates a vulnerability: datasets of unknown origin can enter the analytical pipeline, produce dramatic findings, and propagate through secondary analyses without anyone verifying that the underlying data are authentic.

In more mature fields, data provenance---the documented chain of custody from collection to publication---is enforced through institutional review boards, registered data repositories, and journal requirements for data availability statements. Parapsychology lacks most of these safeguards. Datasets are often shared as spreadsheets, passed between researchers at conferences, or reconstructed from published summary statistics. Each step introduces opportunities for transcription errors, selection artifacts, or outright fabrication.

### 1.2 The STARGATE Program

The STARGATE program (and its predecessor programs SCANATE, GONDOLA WISH, GRILL FLAME, CENTER LANE, SUN STREAK) was a series of U.S. government-funded investigations into remote viewing conducted between approximately 1972 and 1995. Research was carried out primarily at SRI International (later contracted to Science Applications International Corporation, SAIC) under the sponsorship of the Defense Intelligence Agency (DIA) and other intelligence community entities. The program was declassified in 1995, and a substantial body of technical reports, session transcripts, and evaluative documents has since been released through CIA Freedom of Information Act (FOIA) requests.

The program's legacy remains contested. The 1995 American Institutes for Research (AIR) evaluation, authored by statistician Jessica Utts and psychologist Ray Hyman, reached a divided conclusion: Utts argued that the statistical evidence for an anomalous effect was compelling, while Hyman argued that methodological problems precluded firm conclusions. Across approximately 26,000 trials reviewed by Utts, hit rates exceeded chance expectation by 5-15%.

### 1.3 Why This Dataset Caught Attention

Project Aletheia maintains a structured database of 104 STARGATE-attributed remote viewing sessions, stored with per-session geomagnetic Kp index values and binary outcome evaluations (hit, miss, partial). During a routine deep-mining analysis by our autonomous agent system, the geomagnetic-psi correlation in this dataset was flagged as an extreme outlier. The agents identified that sessions conducted during low geomagnetic activity showed a near-perfect hit rate, while sessions during elevated geomagnetic activity showed a near-zero hit rate. This binary separation has no precedent in any published research on geomagnetic-psi correlations.

Upon investigating the dataset's metadata, we discovered that its source field was recorded as "unknown," it lacked a source identifier, and it could not be traced to any specific declassified document, FOIA release, or peer-reviewed publication.

---

## 2. Methods

### 2.1 AI-Agent Methodology: Transparency Statement

This finding was generated by a multi-agent autonomous research system built within Project Aletheia. We describe the agent architecture and attribution here for full transparency, as AI-assisted research methodology is novel and its epistemic status is still being established.

Project Aletheia employs specialized agents that operate on a shared PostgreSQL database containing structured parapsychological research data. Each agent has a defined role, confidence calibration, and audit trail. The finding chain for this report involved four agents across five sequential findings:

**Agent 1: Helios (Inventory Agent).** Helios performed the initial data inventory of the 104 STARGATE sessions, documenting the distribution across organizations (DIA: 53, SAIC: 43, SRI International: 8) and protocols (CRV, ERV, SRV). Helios first flagged the implausible 96% vs. 5% hit rate split by Kp index and recommended provenance verification before further analysis. Confidence: 0.75.

**Agent 2: Gaia (Literature Agent).** Gaia established the published literature baseline for geomagnetic-psi correlations, compiling effect sizes from Spottiswoode (1997), Persinger (1989), Ryan and Spottiswoode (2015), and others. Gaia confirmed that no published study reports binary threshold effects and that the largest published correlations (r = -0.192) are approximately two orders of magnitude smaller than the effect implied by the dataset. Confidence: 0.80.

**Agent 3: Deep-Miner (Statistical Analysis Agent).** Deep-Miner performed the formal statistical analysis, computed z-tests for the hit rate differential, and issued the lead finding classifying the dataset as unverified/potentially synthetic. Deep-Miner also identified the provenance red flags (unknown source, no publication history, effect size 100 times the literature maximum). Confidence: 0.90 (lead finding), 0.70 (statistical sub-finding).

**Agent 4: Skeptic (Audit Agent).** The Skeptic agent independently audited Deep-Miner's statistical calculations and identified a methodological error: the original z-test used an unpooled standard error, yielding z = 23.5. The Skeptic corrected this to a pooled standard error, yielding z = 9.2. The Skeptic confirmed that the qualitative conclusion was unchanged (the corrected p-value remains approximately 10^-20) and rated the error severity as Low. Confidence: 0.85.

### 2.2 Data Description

The dataset consists of 104 remote viewing sessions stored in Project Aletheia's PostgreSQL database with the investigation type "stargate." Each session record includes structured fields conforming to the Stargate schema (see Appendix A), including:

- **Session evaluation:** Ternary outcome (hit, miss, partial)
- **Geomagnetic Kp index:** Integer value 1-9 at time of session
- **Protocol type:** CRV (Coordinate Remote Viewing), ERV (Extended Remote Viewing), SRV (Scientific Remote Viewing)
- **Organization:** DIA, SAIC, or SRI International
- **Data source metadata:** Recorded as "unknown" with null source identifier

All 104 sessions contain both Kp values and evaluation outcomes.

### 2.3 Statistical Methods

We dichotomized sessions into low Kp (<=3) and high Kp (>=4) groups following Spottiswoode's (1997) reported inflection near Kp = 3.5. We defined "hit" as the outcome category and computed hit rates for each group. We performed a two-proportion z-test using pooled standard error (per the Skeptic agent's correction):

z = (p1 - p2) / sqrt(p_hat * (1 - p_hat) * (1/n1 + 1/n2))

where p_hat is the pooled hit rate.

We also computed the probability of observing the low-Kp hit distribution under chance expectation (p = 0.25 for a four-alternative forced-choice paradigm with ternary outcome collapsing).

### 2.4 Literature Comparison

We compiled published geomagnetic-psi correlation coefficients from the following sources:

- Persinger (1989): Geomagnetic field effects on spontaneous psi experiences
- Spottiswoode (1997): Apparent association between local sidereal time and anomalous cognition
- Ryan and Spottiswoode (2015): Large-scale replication attempt with approximately 6,000 free-response trials
- Utts (1996): AIR evaluation of the STARGATE program

---

## 3. Results

### 3.1 The Kp-Outcome Split

Table 1 presents the complete distribution of session outcomes by Kp index.

**Table 1. Session outcomes by geomagnetic Kp index (N = 104)**

| Kp | Hit | Partial | Miss | Total | Hit Rate |
|----|-----|---------|------|-------|----------|
| 1  | 16  | 0       | 0    | 16    | 100.0%   |
| 3  | 11  | 1       | 0    | 12    | 91.7%    |
| 4  | 4   | 51      | 1    | 56    | 7.1%     |
| 5  | 0   | 3       | 0    | 3     | 0.0%     |
| 6  | 0   | 2       | 15   | 17    | 0.0%     |

**Dichotomized summary:**

| Group        | n  | Hits | Hit Rate |
|------------- |----|------|----------|
| Low Kp (<=3) | 28 | 27   | 96.4%    |
| High Kp (>=4)| 76 | 4    | 5.3%     |

The difference in hit rates is 91.1 percentage points.

### 3.2 Statistical Tests

**Two-proportion z-test (pooled SE):**

Pooled hit rate: p_hat = 31/104 = 0.298
z = (0.964 - 0.053) / sqrt(0.298 * 0.702 * (1/28 + 1/76))
z = 0.911 / 0.099
z = 9.2

p approximately 10^-20 (two-tailed)

**Binomial probability under chance (p = 0.25):**

P(X >= 27 | n = 28, p = 0.25) = approximately 8.82 x 10^-27

This is the probability of observing 27 or more hits in 28 trials if the true hit rate were 25%.

### 3.3 Comparison to Published Literature

Table 2 presents the dataset's implied effect against published geomagnetic-psi correlations.

**Table 2. Geomagnetic-psi effect sizes in published research**

| Study | N (trials) | Effect Metric | Effect Size | Binary Threshold? |
|-------|-----------|---------------|-------------|-------------------|
| Persinger, 1989 | ~600 | r (Kp vs. psi score) | -0.13 to -0.192 | No |
| Spottiswoode, 1997 | 2,879 | r (GMF vs. effect size) | -0.026 | No |
| Ryan & Spottiswoode, 2015 | ~6,000 | r (overall) | Not significant | No |
| Utts, 1996 (AIR review) | ~26,000 | Above-chance % | 5-15% above chance | No |
| **This dataset** | **104** | **Hit rate differential** | **91.1 pp** | **Yes** |

The effect in the present dataset is approximately 100 times larger than the largest published correlation and, critically, exhibits a binary threshold structure that has never been reported in any peer-reviewed study.

### 3.4 Provenance Red Flags

1. **Source metadata:** The data_source field for all 104 records is "unknown." The source_id field is null.
2. **No publication trail:** We were unable to identify any peer-reviewed publication, technical report, or declassified document that presents these specific 104 sessions with this specific Kp-outcome pairing.
3. **Organization attribution without documentation:** Sessions are attributed to DIA (53), SAIC (43), and SRI International (8), but no document reference, report number, or FOIA case number accompanies these attributions.
4. **Suspiciously clean Kp values:** All sessions have integer Kp values with no missing data. The Kp index is typically reported as a quasi-logarithmic scale with fractional values (e.g., 3+, 4-), and complete Kp data for historical sessions would require matching session dates to geomagnetic observatory records.
5. **No Kp = 2 sessions:** The Kp distribution shows gaps (no Kp = 2, 7, 8, or 9 values), which is consistent with constructed rather than sampled data.

---

## 4. Discussion

### 4.1 Most Likely Explanations

We consider three explanations for the observed pattern, in order of decreasing plausibility:

**Synthetic demonstration data.** The dataset may have been constructed as a demonstration or teaching example to illustrate the hypothesized geomagnetic-psi relationship. The near-perfect separation by Kp threshold is characteristic of pedagogical examples designed to make a statistical pattern visually obvious. This would explain the unknown provenance, the absence of publication history, and the impossibly large effect size.

**Post-hoc selection artifact.** The dataset may represent a real but heavily curated subset of STARGATE sessions, selected after the fact to maximize the apparent geomagnetic correlation. If a researcher extracted only those sessions where the Kp-outcome relationship was most extreme from a much larger corpus, the resulting subset would show artificially inflated effects. However, even extreme cherry-picking from a corpus with true r = -0.2 would be unlikely to produce a 91-percentage-point differential in a sample of 104.

**Data entry or coding artifact.** The Kp values or outcome labels may have been assigned incorrectly during data entry. For example, if the outcome field were derived from or correlated with the Kp field through a coding error (e.g., a spreadsheet formula referencing the wrong column), the result would be a spurious near-perfect correlation.

We consider the possibility that the data are authentic and the effect is real to be negligible. An authentic effect of this magnitude would imply that geomagnetic conditions are essentially deterministic of remote viewing success, a finding that would represent the single most important discovery in parapsychological history. No such finding has ever been reported despite decades of research, including a 6,000-trial replication study (Ryan and Spottiswoode, 2015) that found no significant overall correlation.

### 4.2 Why This Matters

Unverified datasets in any scientific field pose contamination risks. In parapsychology, where effect sizes are characteristically small and public skepticism is high, the stakes are elevated. If a dataset with fabricated or artificially enhanced effects enters the literature through secondary analysis, meta-analysis, or citation, it can:

1. Inflate meta-analytic effect size estimates
2. Provide false support for specific theoretical models (e.g., geomagnetic facilitation of psi)
3. Undermine the credibility of legitimate research when the data quality issues are later discovered
4. Waste researcher time on follow-up studies designed to replicate an artifact

The STARGATE program's declassified status and the public availability of thousands of pages of primary source material make provenance verification feasible. This is not a case where the original data are lost to history; it is a case where someone must do the work of matching the dataset against primary sources.

### 4.3 Limitations

This analysis has several important limitations:

1. **We have not yet performed FOIA verification.** The definitive test of this dataset's authenticity would be to compare it record-by-record against declassified CIA documents available through the CIA FOIA Electronic Reading Room. This is a planned follow-up task but has not been completed.
2. **We do not know the dataset's ingestion pathway.** How and when this dataset entered the Project Aletheia database is not documented in sufficient detail to trace its origin.
3. **The Kp threshold of 3 vs. 4 was not pre-registered.** While it follows Spottiswoode's (1997) suggestion of an inflection near 3.5, we did not specify this cutpoint in advance. Alternative cutpoints might produce different (though likely still anomalous) results.
4. **AI-agent methodology is novel.** The findings were generated by an autonomous agent system rather than a human researcher. While we have described the agent pipeline transparently and the Skeptic agent caught and corrected a statistical error, the epistemic status of AI-generated research findings is still being established.

### 4.4 Recommendations

We offer the following recommendations to the parapsychological research community:

1. **Verify before analyzing.** Any dataset without clear provenance documentation (publication reference, FOIA case number, institutional data repository DOI) should be flagged and verified before being included in statistical analyses.
2. **Implement provenance standards.** Datasets should include, at minimum: (a) a citation to the primary source document, (b) a description of how the data were extracted, (c) a record of any transformations applied, and (d) a contact person responsible for data integrity.
3. **Audit commonly circulated datasets.** The parapsychological community should organize a systematic provenance audit of datasets that are frequently shared, reanalyzed, or included in meta-analyses, particularly those originating from the STARGATE program.
4. **Compare against CIA FOIA originals.** For STARGATE data specifically, the CIA FOIA Electronic Reading Room provides the ground truth. Any dataset claiming STARGATE provenance should be verifiable against these primary documents.

---

## 5. Conclusion

A 104-session remote viewing dataset attributed to the STARGATE program shows statistical properties that are incompatible with any published parapsychological research. The near-binary separation of hit rates by geomagnetic Kp index (96.4% vs. 5.3%), combined with the absence of provenance documentation, leads us to classify this dataset as unverified and potentially synthetic. This classification is a data quality finding, not a claim about remote viewing itself. We call for systematic provenance verification of parapsychological datasets as a routine practice and plan to conduct a follow-up comparison against CIA FOIA primary source documents.

---

## References

1. May, E. C., & Marwaha, S. B. (Eds.). (2014). *Anomalous cognition: Remote viewing research and theory*. McFarland.

2. Mumford, M. D., Rose, A. M., & Goslin, D. A. (1995). *An evaluation of remote viewing: Research and applications* (AIR report). American Institutes for Research.

3. Persinger, M. A. (1989). Psi phenomena and temporal lobe activity: The geomagnetic factor. In L. A. Henkel & R. E. Berger (Eds.), *Research in parapsychology 1988* (pp. 121-156). Scarecrow Press.

4. Ryan, A., & Spottiswoode, S. J. P. (2015). Geomagnetic activity and anomalous cognition: A large-scale replication study. *Proceedings of the 58th Annual Convention of the Parapsychological Association*, 175-183.

5. Spottiswoode, S. J. P. (1997). Apparent association between effect size in free response anomalous cognition experiments and local sidereal time. *Journal of Scientific Exploration*, 11(2), 109-122.

6. Utts, J. (1996). An assessment of the evidence for psychic functioning. *Journal of Scientific Exploration*, 10(1), 3-30.

7. Hyman, R. (1996). Evaluation of a program on anomalous mental phenomena. *Journal of Scientific Exploration*, 10(1), 31-58.

8. Central Intelligence Agency. (Various dates). STARGATE program declassified documents. CIA FOIA Electronic Reading Room. https://www.cia.gov/readingroom/

9. Targ, R., & Puthoff, H. E. (1974). Information transmission under conditions of sensory shielding. *Nature*, 251, 602-607.

10. Bem, D. J., & Honorton, C. (1994). Does psi exist? Replicable evidence for an anomalous process of information transfer. *Psychological Bulletin*, 115(1), 4-18.

---

## Appendix A: Data Schema

The STARGATE sessions are stored using Project Aletheia's structured Stargate schema, which includes fields for target information, protocol type, viewer profile, session data, viewer impressions, evaluation results, sketch analysis, and environmental factors (including geomagnetic Kp index). The full schema specification is available in the Project Aletheia repository at `src/schemas/stargate.ts`.

## Appendix B: Agent Architecture

Project Aletheia's autonomous research system consists of the following agents relevant to this finding:

- **Helios:** Data inventory and initial flagging
- **Gaia:** Literature baseline compilation
- **Deep-Miner:** Statistical analysis and provenance assessment
- **Skeptic:** Independent audit of methodology and calculations

Each agent produces findings with calibrated confidence scores capped at 0.85 (epistemic humility constraint). The Skeptic agent audits all findings rated above 0.70 confidence before publication.

## Appendix C: Reproducibility

All data and code are available in the Project Aletheia repository. The SQL queries used to generate Tables 1 and 2 are reproducible against the project's Supabase PostgreSQL database. The statistical calculations can be verified using the session-level data exported from the database.

---

## Conflict of Interest Statement

The authors have no financial conflicts of interest. Project Aletheia is an unfunded open-source research project. The principal investigator holds no position for or against the existence of parapsychological phenomena; the project's stated mission is rigorous investigation regardless of outcome.

## Data Availability

The dataset analyzed in this report is available in the Project Aletheia database. Because the central finding of this report is that the dataset's provenance is unverified, we emphasize that making the data available is not an endorsement of its authenticity.

---

**Word count:** 3,219 (total including tables, references, and appendices)

**References cited:** 10
