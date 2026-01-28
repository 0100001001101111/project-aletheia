# TODO.md - Project Aletheia

*Last updated: January 27, 2026 (Evening)*

## High Priority

### Agent Scheduling
- [ ] Set up cron job or Vercel Edge Function for scheduled agent runs
- [ ] Configure run frequency in agent config
- [ ] Add email/webhook notifications for new findings

### Evaluate Window Predictions
- [ ] The 15 active predictions need evaluation against new data

---

## Medium Priority

### Agent Enhancements
- [ ] Add more pattern types beyond co-location
- [ ] Temporal pattern detection (time-of-day, seasonal)
- [ ] Attribute correlation patterns (weather, moon phase)

### Discovery Agent
- [ ] Add more monitored sources (currently 28)
- [ ] Add more tracked researchers (currently 24)
- [ ] Foreign language research (Portuguese, German, Russian, Japanese)
- [ ] Google Scholar integration for researcher tracking

### Data Acquisition
- [ ] Implement real scrapers for BFRO, NUFORC, NDERF (currently mocked)
- [ ] Add more known sources to `known-sources.ts`

### Reports
- [ ] PDF export for reports
- [ ] Citation generation (BibTeX, APA)
- [ ] Export findings to CSV/JSON

---

## Low Priority / Future

### Data Pipeline
- [ ] Update BFRO data (currently ends 2017)
- [ ] Import more recent NUFORC data

### Technical Debt
- [ ] Replace remaining `@ts-nocheck` in API routes
- [ ] Virtual scrolling for large lists

### Testing
- [ ] Unit tests for Monte Carlo simulation
- [ ] Integration tests for prediction evaluation

---

## Completed (Jan 27, 2026 - Evening)

- [x] **Bulk select/reject** for findings review queue
- [x] **Rejection reasons** - dropdown with specific reasons (duplicate, methodology, etc.)
- [x] **Confidence formula fix** - was showing 100%, now capped at 85%
- [x] **Self-referential connection fix** - Discovery Agent no longer creates "nde ↔ nde" connections
- [x] **Garbage title filtering** - Leads with bad titles (like "All Requests") are filtered out
- [x] **Pipeline documentation** - Saved to `docs/agent-pipeline.txt`
- [x] Approved 6 high-quality discovery leads
- [x] Cleaned up duplicate acquisition requests

## Completed (Jan 27, 2026)

- [x] **Phase 6: Discovery Agent** - Full implementation
- [x] **Phase 5: Data Acquisition System** - Gap detection, source discovery, acquisition queue
- [x] **Suggested Contacts** - Known researchers with domain matching
- [x] **Tavily Search API** - Real web search integration

## Completed (Jan 26, 2026)

- [x] **Phases 1-4: Research Agent** - Foundation, Analysis, Review, External Research
- [x] SECURITY DEFINER functions for RLS bypass
- [x] Agent navigation and UI

## Completed (Jan 25, 2026)

- [x] Two-tier architecture (Research vs Exploratory)
- [x] Experience reports import (7,312 records)

## Completed (Jan 21, 2026)

- [x] Window Theory Analysis dashboard
- [x] Monte Carlo co-occurrence analysis
- [x] Pre-registered predictions

---

## Quick Reference

```bash
# Dev server (run in separate terminal)
npm run dev

# TypeScript check
npx tsc --noEmit

# Agent terminal
http://localhost:3000/agent

# Discovery leads
http://localhost:3000/agent/discovery/leads

# Findings review
http://localhost:3000/agent/review

# Vercel deploy workaround
mv .git .git-backup && vercel --prod --yes; mv .git-backup .git
```
