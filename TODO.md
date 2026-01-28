# TODO.md - Project Aletheia

*Last updated: January 27, 2026*

## High Priority

### Agent Web Search Integration
- [x] Get API key for Tavily Search
- [x] Implement real search in `src/lib/agent/web-search.ts`
- [x] Replace mock results with actual web queries
- [x] Add rate limiting and error handling

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
- [ ] Multi-variable regression analysis

### Discovery Agent
- [ ] Add more monitored sources (currently 28)
- [ ] Add more tracked researchers (currently 24)
- [ ] Foreign language research (Portuguese, German, Russian, Japanese)
- [ ] Google Scholar integration for researcher tracking
- [ ] Declassified document keyword alerts
- [ ] Scheduled discovery runs (cron/Edge Function)

### Data Acquisition
- [ ] Implement real scrapers for BFRO, NUFORC, NDERF (currently mocked)
- [ ] Add more known sources to `known-sources.ts`
- [ ] Automated scheduling for approved acquisitions

### Review System
- [ ] Bulk approval/rejection actions
- [ ] Export findings to CSV/JSON
- [ ] Review assignment to specific users

### Reports
- [ ] Social sharing (Twitter/X cards, Open Graph)
- [ ] PDF export for reports
- [ ] Citation generation (BibTeX, APA)
- [ ] Email suggested contacts directly from report page
- [ ] Expand known researchers database (currently ~15)

---

## Low Priority / Future

### Data Pipeline
- [ ] Update BFRO data (currently ends 2017)
- [ ] Import more recent NUFORC data
- [ ] Duplicate detection for imported data

### Technical Debt
- [ ] Replace remaining `@ts-nocheck` in API routes
- [ ] Virtual scrolling for large lists
- [ ] Cache grid cell data

### Testing
- [ ] Unit tests for Monte Carlo simulation
- [ ] Integration tests for prediction evaluation
- [ ] Agent runner unit tests

---

## Completed (Jan 27, 2026)

- [x] **Phase 6: Discovery Agent**
  - Second autonomous agent for hunting external research
  - Source monitoring (28 curated sources across journals, archives, orgs, preprints)
  - Researcher tracking (24 researchers across parapsychology, NDE, UFO, consciousness)
  - Lead evaluation with quality scoring (signals/concerns)
  - Cross-domain connection detection
  - Citation trail following (2 levels deep)
  - Agent handoff system (Discovery → Research)
  - UI: terminal, leads queue, sources management, researcher tracking
  - Database: sessions, leads, sources, researchers, handoffs tables
- [x] **Phase 5: Data Acquisition System**
  - Gap detection (temporal, geographic, domain, verification)
  - Known sources database (NUFORC, MUFON, BFRO, NDERF, OBERF, Haunted Places, USGS)
  - Source discovery via Tavily web search
  - Acquisition queue at `/agent/acquire` with approve/reject/execute workflow
  - Data extractor with USGS API integration (mock implementations for others)
  - Agent Phase 6 integration - auto-queues acquisition requests
  - Database migration for `aletheia_acquisition_requests` table
- [x] **Suggested Contacts** - Known researchers database with ~15 experts
- [x] Contact discovery module with domain matching and scoring
- [x] Report detail page displays contacts with links and emails
- [x] Fixed agent reports page filtering (status=all works correctly)
- [x] Fixed report detail page params handling for Next.js 14

## Completed (Jan 26, 2026)

- [x] **Phase 1: Agent Foundation** - Terminal UI, sessions, logs, database tables
- [x] **Phase 2: Analysis Engine** - Pattern scanning, hypotheses, testing, confounds
- [x] **Phase 3: Review System** - Queue, approve/reject, prediction creation
- [x] **Phase 4: External Research** - Query generation, synthesis, reports
- [x] SECURITY DEFINER functions for RLS bypass in agent
- [x] Added 'research' log type with teal styling
- [x] Predictions show "Discovered by Agent" badge when source='agent'
- [x] Agent link added to main navigation
- [x] Tavily Search API integration for real web searches

## Completed (Jan 25, 2026)

- [x] Fixed tier assignments - UFO data in exploratory tier
- [x] Two-tier stats display on landing page and dashboard
- [x] Imported 7,312 experience reports (NDEs, OBEs, ADCs)
- [x] Added human-readable titles to prediction pages
- [x] Added ELI5 sections to prediction detail pages

## Completed (Jan 21, 2026)

- [x] Window Theory Analysis dashboard at `/analysis/windows`
- [x] `get_investigations_page()` database function
- [x] Monte Carlo co-occurrence analysis
- [x] Pre-registered falsifiable predictions
- [x] Data ingestion pipeline

---

## Notes

- Dev server runs separately (`npm run dev` in another terminal)
- TypeScript check: `npx tsc --noEmit`
- Scripts use tsx: `npx tsx scripts/rebuild-grid.ts`
- Agent terminal: http://localhost:3000/agent
- Window analysis: http://localhost:3000/analysis/windows
- Vercel deploy workaround: `mv .git .git-backup && vercel --prod --yes; mv .git-backup .git`
