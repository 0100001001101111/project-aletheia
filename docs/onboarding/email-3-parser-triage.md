# LLM Parser & Triage System - How Submissions Are Processed

**Subject: Understanding Aletheia's Data Processing Pipeline**

---

## The Submission Pipeline

When you submit data to Aletheia, it goes through four stages:

```
Submit -> Parse -> Triage -> Integrate
```

---

## Stage 1: LLM Parser

The LLM Parser is an AI system that extracts structured data from unstructured text. It's particularly useful for:

- Converting narrative case reports into schema fields
- Extracting dates, names, and metrics from prose
- Identifying missing fields that need manual completion

### How to Use the Parser

1. Navigate to **Submit -> Free Text**
2. Paste your unstructured report
3. Select the target domain (NDE, Ganzfeld, etc.)
4. Click **Parse**
5. Review and correct the extracted fields
6. Submit

### Parser Accuracy

| Field Type | Accuracy |
|------------|----------|
| Dates | ~95% |
| Names/IDs | ~90% |
| Numeric values | ~92% |
| Categorical fields | ~88% |
| Free-text descriptions | ~85% |

**Always review parser output before submitting.**

### What the Parser Can't Do

- Verify factual accuracy
- Access external sources
- Resolve ambiguities without context
- Generate data that isn't in the source text

---

## Stage 2: Triage Scoring

Every submission receives an automated triage score (0-10) based on methodology quality and documentation.

### Scoring Criteria

| Criterion | Points | What We Check |
|-----------|--------|---------------|
| **Source Traceable** | 0-2 | Is there a link to the original report? |
| **First-hand Account** | 0-2 | Is the data from a direct participant? |
| **Methodology Documented** | 0-2 | Is the experimental protocol described? |
| **Receiver Profile Present** | 0-2 | For Ganzfeld/RV: is receiver info included? |
| **Raw Data Included** | 0-2 | Are individual trials available, not just summaries? |

### Score Interpretation

| Score | Status | Meaning |
|-------|--------|---------|
| 0-3 | **Provisional** | Needs significant additional documentation |
| 4-6 | **Pending** | Acceptable with minor gaps |
| 7-10 | **Verified** | Meets rigorous standards |

### Triage Boosts

Certain actions automatically boost your score:

| Action | Boost |
|--------|-------|
| Pre-registered methodology | +2 |
| Video documentation | +1 |
| Independent replication | +2 |
| Peer-reviewed publication | +2 |

---

## Stage 3: Human Review (If Needed)

Submissions scoring 4-6 may be flagged for human review. Reviewers check:

1. **Completeness** - Are required fields filled?
2. **Consistency** - Do dates and descriptions align?
3. **Plausibility** - Does the data fit known patterns?

### Red-Team Flagging

Any verified user can flag a submission for:

| Flag Type | Description |
|-----------|-------------|
| Sensory Leakage | Could they have seen/heard the answer? |
| Selection Bias | Were targets cherry-picked? |
| Statistical Error | Wrong baseline or calculation |
| Protocol Violation | Broke stated rules |
| Data Integrity | Evidence of tampering |

Flags can be disputed through the three-tier resolution system (Data Request -> Blind Jury -> Nullification).

---

## Stage 4: Integration

Once verified, your data:

1. **Feeds pattern detection** - Algorithms scan for cross-domain correlations
2. **Informs predictions** - New falsifiable hypotheses are generated
3. **Becomes testable** - Other researchers can attempt replication

---

## Best Practices

### Before Submitting

- [ ] Verify all dates are correct
- [ ] Include source links where available
- [ ] Document any deviations from standard protocols
- [ ] Note any potential confounds or limitations

### After Submitting

- Monitor your submission for flags
- Respond promptly to data requests
- Provide additional documentation if asked

---

## Troubleshooting

### "Parser didn't extract my dates correctly"
- Ensure dates are in unambiguous formats (e.g., "January 15, 2024" not "1/15/24")

### "My triage score is lower than expected"
- Check which criteria scored 0-1 and add documentation

### "My submission was flagged"
- Don't panic - flags are opportunities to strengthen your data
- Respond within 7 days to avoid automatic escalation

---

*Questions? Visit /help or email support@aletheia.io*
