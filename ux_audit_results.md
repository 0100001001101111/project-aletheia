# UX Audit Results - Project Aletheia
## First-Time User Walkthrough (Dr. Sarah Chen, NDE Researcher)
**Date:** January 29, 2026
**Reviewer Persona:** Skeptical academic with 200 NDE cases to contribute

---

## Executive Summary

The platform has **strong fundamentals** - clear value proposition, good data structure, methodologically sound approach. However, **critical API failures** and **confusing UX elements** would cause a skeptical researcher to abandon the site before engaging.

**Overall Grade:** B- (Good bones, needs polish before outreach)

---

## Critical Issues (Must Fix Before Outreach)

### 1. API Failures / Data Loading Errors
- **Investigations page:** Initial load fails with "statement timeout" error
- **Statistics page:** Completely broken - "Failed to fetch statistics"
- **Submission flow:** "Failed to save draft" error
- **Impact:** Destroys credibility immediately. A researcher seeing errors will assume the platform is amateur or abandoned.
- **Fix:** Investigate database query timeouts, add better error handling, implement loading states

### 2. Statistics Dashboard Non-Functional
- `/statistics` shows all zeros and "No data"
- This page is critical for demonstrating data quality - the platform's core value prop
- **Fix:** Debug API endpoint, ensure cache population, add fallback data

### 3. Wrong Placeholder Examples in Submission Wizard
- Selected "Near-Death Experiences" but got "Varginha Entity Encounter" (UFO case) as placeholder
- Coordinates show Brazilian UFO location instead of NDE-relevant example
- **Impact:** Makes users question if the system understood their selection
- **Fix:** Domain-specific placeholder examples (e.g., "AWARE II Hospital Study - 2024" for NDE)

---

## Important Issues (Fix Soon)

### 4. "What am I looking at?" Explainer Doesn't Work
- On investigation detail page, this accordion/link doesn't expand
- Score "?" help icon also non-functional
- **Impact:** New users can't understand the scoring system
- **Fix:** Implement the expandable content or tooltip

### 5. Mixing Research and Exploratory Domains in Submission
- Submission wizard shows NDE alongside Bigfoot, Bermuda Triangle, Crop Circles
- The careful Research/Exploratory tier separation on homepage is lost
- **Impact:** Serious researchers may be put off by association with fringe topics
- **Fix:** Add visual separation, show tier labels, or split into Research vs Exploratory submission flows

### 6. "Become a Custodian" - Unclear Jargon
- Homepage CTA uses insider terminology without explanation
- **Impact:** First-time visitors don't know what this means
- **Fix:** Change to "Join as Researcher" or "Contribute Data" + add tooltip explaining the role

### 7. No "About" or "How It Works" Page
- No way to learn who's behind the platform
- No team, no institutions, no methodology documentation
- **Impact:** Critical for academic credibility
- **Fix:** Add About page with team info, methodology whitepaper, institutional affiliations

### 8. Agent Pages - Unclear Audience
- `/agent` shows powerful tools but unclear if researcher-facing or admin-only
- "Run Agent" button implies users can trigger analysis
- **Impact:** Confusion about user capabilities
- **Fix:** Add explanatory text about who can use agents and when

---

## Nice-to-Haves

### 9. Only 2 NDE Studies
- NDE filter shows only 2 research investigations
- May signal "too early to contribute" or "they need my data"
- **Suggestion:** Frame as opportunity: "Be among the first NDE researchers on the platform"

### 10. 0/10 Predictions Confirmed
- Honest but potentially concerning
- **Suggestion:** Add context: "Platform launched [date] - predictions awaiting testing"

### 11. Error Messages Too Technical
- "canceling statement due to statement timeout" means nothing to users
- **Fix:** User-friendly messages: "Data is loading slowly. Please try again."

### 12. No Bulk Import Option Visible
- Dr. Chen has 200 cases - no obvious way to batch upload
- **Suggestion:** Add "Bulk Import" option for researchers with datasets

---

## What's Working Well

### Landing Page
- Clean, professional design
- "GitHub for Anomaly Research" analogy is compelling
- Problem/Solution structure resonates with researchers
- Stats (185 Research, 173k Exploratory) build credibility
- Research/Exploratory tier separation is smart

### Predictions System
- Excellent science communication
- Clear "What We're Testing" / "Why It Matters" / "What You Can Do"
- Confidence scores with methodology explanation
- "What We're Looking For" submission criteria is rigorous

### Investigation Detail Page
- Good data structure visible
- Ethics Approval field (IRB number) - credibility signal
- Honest about null results (Target Hits: 0)
- Export Data option for researchers

### Submission Flow (When Working)
- Clear Simple vs Full mode choice
- Score tradeoff explicit (6.0 vs 10.0 max)
- "Approximate date" option for historical cases
- Domain selection with helpful descriptions

---

## Specific Copy Suggestions

| Current | Suggested |
|---------|-----------|
| "Become a Custodian" | "Contribute as Researcher" |
| "We don't chase ghosts. We find patterns." | "We don't speculate. We test hypotheses." (less dismissive) |
| "Failed to fetch submissions: canceling statement due to statement timeout" | "Data is taking longer than usual to load. Click Retry or refresh the page." |
| "Quick Submit - Recommended" | "Quick Submit - For Personal Experiences" (clarify when to use) |
| "Full Mode" | "Research-Grade Submission" (already has badge, but make title clearer) |
| Placeholder: "Varginha Entity Encounter" | Domain-specific: "AWARE II Cardiac Study - Southampton 2024" |

---

## Priority Fixes for Tonight's Outreach

1. **Fix API timeouts** on Investigations page (or add graceful retry)
2. **Fix Statistics page** or hide it from nav until working
3. **Fix submission draft saving**
4. **Change domain-specific placeholders** in submission wizard
5. **Add About page** even if minimal (team name, methodology summary)

---

## Testing Notes

- Tested on localhost:3000
- Some issues may be dev-environment specific
- Recommend testing on production (project-aletheia.vercel.app) before outreach
- Consider having a non-technical person do the same walkthrough

---

*Audit completed by Claude as Dr. Sarah Chen persona*
