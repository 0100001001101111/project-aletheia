# Quick-Start Checklist - Pre-Flight for Data Custodians

**Complete these steps before your first submission to Aletheia.**

---

## Account Setup

- [ ] **Create account** at aletheia.io/signup
- [ ] **Verify email** - check spam folder if needed
- [ ] **Set display name** - or choose anonymous mode
- [ ] **Select identity type** - Public, Anonymous Verified, or Anonymous Unverified
- [ ] **Link institutional affiliation** (optional) - for credibility boost

---

## Read the Docs

- [ ] **Email 1: Welcome** - Understand your role as data custodian
- [ ] **Email 2: Schema Guide** - Know the data formats for your domain
- [ ] **Email 3: Parser & Triage** - Understand how submissions are processed
- [ ] **Platform FAQ** - at /help

---

## Prepare Your Data

### Choose Your Domain
- [ ] NDE (Near-Death Experiences)
- [ ] Ganzfeld (Telepathy/Sensory Isolation)
- [ ] Crisis Apparition (Spontaneous Apparitions)
- [ ] STARGATE (Remote Viewing)
- [ ] Geophysical (Tectonic/EM Correlations)

### Gather Required Fields
For your chosen domain, ensure you have:

| Domain | Required Fields |
|--------|-----------------|
| NDE | case_id, date, biological_trigger, veridical_elements |
| Ganzfeld | session_id, date, hit/miss, target_pool_size |
| Crisis | case_id, apparition_date, crisis_date, temporal_gap |
| STARGATE | session_id, date, viewer_id, judge_score |
| Geophysical | event_id, date, location, phenomena_type |

### Prepare Source Documentation
- [ ] Publication links (if peer-reviewed)
- [ ] Methodology description
- [ ] Original data files (JSON/CSV preferred)

---

## Test Submission

Before bulk uploading, submit one record manually:

1. Go to **/submit**
2. Select your domain
3. Fill in required fields
4. Click **Submit**
5. Check triage score - aim for 7+

### If Score < 7
Review which criteria scored low:
- Missing source link? Add it.
- No methodology? Document protocol.
- No raw data? Provide individual trials.

---

## Bulk Upload (Optional)

For large datasets:

1. Format as JSON array or CSV
2. Ensure all required fields are present
3. Go to **/submit/bulk**
4. Upload file
5. Review parsed results
6. Confirm submission

### JSON Example
```json
[
  {
    "session_id": "G-2024-001",
    "date": "2024-01-15",
    "hit": true,
    "rank": 1,
    "target_pool_size": 4,
    "source_url": "https://example.com/study"
  },
  {
    "session_id": "G-2024-002",
    "date": "2024-01-16",
    "hit": false,
    "rank": 3,
    "target_pool_size": 4
  }
]
```

---

## Pre-Registration (Recommended)

If you plan to test predictions:

1. Go to **/preregister**
2. Select the prediction you'll test
3. Document your methodology
4. Submit - receive hash ID
5. Run your experiment
6. Submit results with pre-registration link

Pre-registered submissions get **+2 triage boost**.

---

## Common Issues

### "I can't find my domain's schema"
All schemas are at /submit -> Select Domain -> "View Schema"

### "My bulk upload failed"
- Check JSON syntax at jsonlint.com
- Ensure all required fields are present
- Date format must be ISO 8601 (YYYY-MM-DD)

### "Triage score is 0"
- Did you include a case_id?
- Did you include a date?
- Check for empty required fields

---

## Support Channels

- **Platform help**: /help
- **Email**: support@aletheia.io
- **Discord**: discord.gg/aletheia (coming soon)

---

## Ready?

When you've completed this checklist:

1. Make your first submission
2. Check your triage score
3. Review for any flags
4. You're officially a data custodian!

Welcome to Aletheia.

---

*Last updated: January 2026*
