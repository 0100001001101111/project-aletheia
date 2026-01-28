# CLAUDE.md - Project Aletheia

## Project Overview

Aletheia is a "GitHub for Anomaly Research" - a collaborative platform for rigorous investigation of anomalous phenomena. It provides standardized data schemas, cross-domain pattern matching, falsifiable prediction tracking, and an autonomous research agent.

## Current Project State (Jan 27, 2026)

### Two-Tier Data Architecture

**Research Tier (~185 records):** Quality-scored investigations with structured schemas
- NDE, Ganzfeld, Crisis Apparition, STARGATE, Geophysical
- Supports falsifiable predictions and rigorous analysis

**Exploratory Tier (~173,935 records):** Bulk-imported sighting data for pattern analysis
- UFO/UAP, Bigfoot, Haunting, Experience Reports (NDE bulk imports)
- Used for window theory testing and geographic correlation studies
- Not quality-scored

### What's Working
- **Landing page** - Two-tier stats display (Research vs Exploratory)
- **Dashboard** - Overview with tier breakdown links
- **Investigations** - Browse/filter with Research and Exploratory tabs
- **Predictions** - List + detail pages with testing workflow
- **Patterns** - Cross-domain pattern visualization
- **Community Hypotheses** - Submit speculative ideas, AI-generated evidence suggestions
- **Disputes/Jury** - Flag results, jury voting system
- **Pre-registration** - Hash-locked methodology before testing
- **Red Team Dashboard** - Skeptic tools for flagging flaws
- **Auth** - Public + anonymous user system with verification levels
- **Window Analysis Dashboard** - Geographic clustering (uses exploratory data)
- **Data Ingestion Pipeline** - API for importing NUFORC, BFRO, and other datasets
- **Research Agent** - Autonomous pattern discovery and hypothesis testing (see below)

### Recent Additions (Jan 27, 2026)

#### Phase 5: Data Acquisition System
- **Gap Detection** - Identifies temporal, geographic, domain, and verification gaps in data
  - Temporal: checks date ranges across investigation types
  - Geographic: checks US state coverage
  - Domain: compares record counts across types
  - Verification: flags findings that failed confound checks
- **Source Discovery** - Finds external data sources to fill gaps
  - Known sources database (`known-sources.ts`): NUFORC, MUFON, BFRO, NDERF, OBERF, Haunted Places, USGS
  - Web search via Tavily for additional sources
  - Quality scoring (high/medium/low) based on indicators
- **Acquisition Queue** (`/agent/acquire`) - Human-in-the-loop approval workflow
  - Review pending requests with gap context
  - Approve/reject with notes
  - Execute approved acquisitions
  - Stats: pending, approved, completed, failed, total records
- **Data Extractor** - Executes approved acquisitions
  - USGS Earthquake API integration (working)
  - Mock implementations for BFRO, NUFORC, NDERF (real scraping not implemented)
  - Validates, deduplicates, and ingests records
  - Tracks source provenance on ingested records
- **Agent Integration** - Phase 6 in runner detects gaps after analysis
  - Queues top 5 gaps by severity
  - Creates acquisition requests for best matching sources

#### Suggested Contacts for Research Reports
- Known researchers database (`known-researchers.ts`) with ~15 curated experts
  - NDE/Consciousness: Greyson, Parnia, van Lommel
  - Parapsychology: Cardeña, Radin, Bem, Utts
  - UFO/UAP: Nolan, Vallée, Pasulka
  - Cryptozoology: Meldrum
  - Geophysical: Persinger, Derr
  - Skeptical: French
- Contact discovery module extracts domains from findings and matches researchers
- Scoring system (0-100) based on domain match, citations, and accessibility
- Report detail page shows contacts with name, affiliation, relevance, related work, email
- Limit of 5 contacts per report with score >= 50

### Previous Additions (Jan 26, 2026)

#### Aletheia Research Agent (Phases 1-4)

Full autonomous research agent with:

**Phase 1: Foundation**
- Agent terminal UI at `/agent` with real-time log streaming
- Session management with trigger controls
- Database tables for sessions, logs, hypotheses, findings

**Phase 2: Analysis Engine**
- Pattern scanning across investigation domains
- Hypothesis generation via Claude API
- Statistical testing with holdout validation (Chi-squared, permutation tests)
- Confound checking (reporting bias, population density, temporal, geographic)
- SECURITY DEFINER functions to bypass RLS timeouts

**Phase 3: Review System**
- Review queue at `/agent/review` with filter tabs
- Finding detail pages with collapsible evidence panels
- Approval workflow creates predictions with `source='agent'`
- Rejection workflow with dropdown reasons
- Request More Info workflow for additional agent analysis

**Phase 4: External Research**
- Research protocol triggers when findings show promise but fail confounds
- Query generation: prior_research, alternative_data, mechanism, debunking
- Web search integration (mock implementation - needs real API key)
- Research synthesis using Claude API
- Public reports at `/agent/reports` with full detail pages
- Reports include: statistical evidence, external sources, synthesis, conclusions

### Previous Additions
- **Two-tier architecture** (Jan 25) - Clear separation between Research and Exploratory data
- **Window Theory Analysis** (Jan 21) - Full dashboard with spatial/temporal/geological analysis
- **Monte Carlo Co-occurrence Analysis** - Statistical validation of clustering patterns
- **Data Ingestion API** - Bulk imports from NUFORC, BFRO, and other sources

## Tech Stack

- Next.js 14 (App Router)
- Supabase (PostgreSQL + Auth + RLS)
- Tailwind CSS (dark theme)
- TypeScript
- Claude API (hypothesis generation, research synthesis, evidence suggestions)
- Vercel (deployment)

## Critical Database Schema Rules

**ALWAYS check actual column names in `supabase/migrations/` before writing queries.**

| Component Says | Database Actually Has |
|----------------|----------------------|
| `domains` | `domains_involved` |
| `description` (patterns) | `pattern_description` |
| `variable` (patterns) | `pattern_variables` (array) |

**Null checks:** Use `!= null` not `!== undefined`. Database returns `null`, not `undefined`.

## File Structure
```
src/
├── app/
│   ├── api/
│   │   ├── agent/               # Research Agent APIs
│   │   │   ├── findings/        # Findings CRUD + approve/reject/request-info
│   │   │   ├── reports/         # Research reports API
│   │   │   ├── sessions/        # Session management
│   │   │   ├── status/          # Agent status
│   │   │   └── trigger/         # Trigger agent runs
│   │   ├── analysis/window/     # Window analysis APIs
│   │   ├── data/ingest/         # Data ingestion API
│   │   ├── predictions/         # Prediction CRUD
│   │   ├── patterns/            # Pattern matching
│   │   └── ...
│   ├── agent/                   # Research Agent pages
│   │   ├── page.tsx             # Agent terminal
│   │   ├── acquire/             # Data acquisition queue
│   │   │   └── page.tsx         # Acquisition review
│   │   ├── review/              # Finding review queue
│   │   │   ├── page.tsx         # Review list
│   │   │   └── [id]/page.tsx    # Finding detail
│   │   └── reports/             # Research reports
│   │       ├── page.tsx         # Reports list
│   │       └── [slug]/page.tsx  # Report detail
│   ├── analysis/windows/        # Window Theory dashboard
│   ├── community/               # Community hypotheses pages
│   ├── dashboard/               # Main dashboard
│   ├── disputes/                # Jury voting interface
│   ├── investigations/          # Investigation browser
│   ├── patterns/                # Pattern visualization
│   ├── predictions/             # Prediction list + detail
│   ├── preregister/             # Pre-registration flow
│   ├── redteam/                 # Red team/skeptic dashboard
│   └── submit/                  # Data submission wizard
├── components/
│   ├── agent/                   # Agent UI components
│   │   ├── AgentTerminal.tsx    # Terminal log display
│   │   ├── SessionSelector.tsx  # Session picker
│   │   ├── FindingCard.tsx      # Finding summary card
│   │   └── ReportCard.tsx       # Report summary card
│   ├── window-analysis/         # Window dashboard components
│   ├── auth/                    # Auth UI components
│   ├── community/               # Hypothesis cards
│   ├── disputes/                # Jury voting components
│   ├── layout/                  # Navigation, PageWrapper
│   └── ui/                      # Shared UI primitives
├── lib/
│   ├── agent/                   # Research Agent logic
│   │   ├── runner.ts            # Main agent orchestration
│   │   ├── scanner.ts           # Pattern scanning
│   │   ├── hypothesis-generator.ts # Generate hypotheses via Claude
│   │   ├── validation.ts        # Holdout validation
│   │   ├── confounds.ts         # Confound checking
│   │   ├── findings.ts          # Finding generation/storage
│   │   ├── researcher.ts        # External research protocol
│   │   ├── web-search.ts        # Tavily web search integration
│   │   ├── report-generator.ts  # Research report generation
│   │   ├── contact-discovery.ts # Discover relevant researchers
│   │   ├── known-researchers.ts # Curated researcher database
│   │   ├── gap-detection.ts     # Detect data gaps (Phase 5)
│   │   ├── known-sources.ts     # Curated data sources database
│   │   ├── source-discovery.ts  # Search for external sources
│   │   ├── acquisition-manager.ts # Acquisition request CRUD
│   │   ├── data-extractor.ts    # Execute data acquisitions
│   │   ├── supabase-admin.ts    # Admin client for agent
│   │   └── types.ts             # Agent type definitions
│   ├── window-analysis/         # Window theory logic
│   ├── data-ingestion/          # Data import utilities
│   └── ...
├── schemas/                     # Zod validation schemas
└── types/                       # TypeScript types
```

## Common Mistakes to Avoid

1. **Don't run background processes.** Dev server runs in separate terminal.
2. **Don't assume column names.** Read the migration files.
3. **Don't use `!== undefined` for null checks.** Supabase returns `null`.
4. **Don't edit types without checking the database schema first.**
5. **Don't say "done" without running `npx tsc --noEmit`.**

## Before Saying "Done"

Always run:
```bash
npx tsc --noEmit
```

If there are type errors, fix them before declaring completion.

## Database Tables

**Core:**
- `aletheia_users` - User profiles with identity_type, verification_level, credibility_score
- `aletheia_investigations` - Submitted research data with triage scoring (174k+ records)
- `aletheia_predictions` - Falsifiable predictions (includes `source` and `agent_finding_id`)
- `aletheia_pattern_matches` - Cross-domain correlations
- `aletheia_contributions` - Track user contributions for credibility

**Research Agent:**
- `aletheia_agent_config` - Agent configuration key-value pairs
- `aletheia_agent_sessions` - Agent run sessions with stats
- `aletheia_agent_logs` - Real-time session logs
- `aletheia_agent_hypotheses` - Generated hypotheses
- `aletheia_agent_findings` - Validated findings for review
- `aletheia_agent_reports` - Research reports with external sources and suggested_contacts
- `aletheia_acquisition_requests` - Data acquisition requests with gap tracking, source details, approval workflow

**Window Analysis:**
- `aletheia_grid_cells` - Geographic grid cells (1246 cells at 1° resolution)
- `aletheia_cooccurrence_results` - Monte Carlo co-occurrence analysis results
- `aletheia_window_predictions` - Pre-registered falsifiable predictions (15 active)

**Trust Architecture:**
- `aletheia_preregistrations` - Hash-locked methodologies before testing
- `aletheia_flaw_flags` - Red team flagging of result issues
- `aletheia_community_hypotheses` - Speculative ideas from community

**Dispute Resolution:**
- `aletheia_prediction_results` - Test results with quality scores
- `aletheia_prediction_testers` - Jury assignment for predictions
- `aletheia_disputes` - Escalated disputes with jury voting
- `aletheia_jury_votes` - Individual juror votes
- `aletheia_jury_pool` - Eligible jurors for disputes

## Current Data (Jan 26, 2026)

- **174,120 total records** (185 research + 173,935 exploratory)
- **Research tier:** STARGATE (104), Ganzfeld (52), Geophysical (27), NDE (2)
- **Exploratory tier:** UFO (152,858), Haunting (9,731), NDE bulk (6,191), Bigfoot (3,810), Crisis Apparition (1,139), others
- **1,246 grid cells** at 1° resolution
- **6 co-occurrence analyses** completed
- **15 active predictions** awaiting evaluation

## The Six Schemas

| Schema | Focus |
|--------|-------|
| NDE | Biological triggers, veridicality |
| Ganzfeld | Information transfer vs noise |
| Crisis Apparition | Spontaneous transmission |
| STARGATE | Remote viewing, edit filter |
| Geophysical | Tectonic stress, EM anomalies |
| UFO/UAP | Aerial anomalies, geophysical/consciousness correlates |

## Core Hypothesis

"Stress produces signal - at every scale"

| Scale | System | Stressor | Signal |
|-------|--------|----------|--------|
| Micro | Neuron | Death/Trauma | NDE |
| Meso | Human | Crisis/Grief | Apparitions |
| Macro | Planet | Seismic pressure | UFO/EQ lights |

## Agent APIs

- `GET /api/agent/status` - Agent status and stats
- `POST /api/agent/trigger` - Trigger new agent session
- `GET /api/agent/sessions` - List sessions
- `GET /api/agent/sessions/[id]` - Session detail with logs
- `GET /api/agent/findings` - List findings with filters
- `GET /api/agent/findings/[id]` - Finding detail
- `POST /api/agent/findings/[id]/approve` - Approve and create prediction
- `POST /api/agent/findings/[id]/reject` - Reject with reason
- `POST /api/agent/findings/[id]/request-info` - Request more analysis
- `GET /api/agent/reports` - List research reports
- `GET /api/agent/reports/[slug]` - Report detail
- `POST /api/agent/reports/[slug]/publish` - Publish draft report
- `GET /api/agent/acquisitions` - List acquisition requests with filters
- `GET /api/agent/acquisitions/[id]` - Acquisition request detail
- `PATCH /api/agent/acquisitions/[id]` - Approve/reject request
- `POST /api/agent/acquisitions/[id]/execute` - Execute approved acquisition

## Window Analysis APIs

- `GET /api/analysis/window/grid` - Get all grid cells with window indices
- `GET /api/analysis/window/cooccurrence` - Get latest co-occurrence analysis
- `POST /api/analysis/window/cooccurrence` - Run new Monte Carlo analysis
- `GET /api/analysis/window/predictions` - Get all predictions
- `POST /api/analysis/window/predictions` - Generate new predictions
- `GET /api/data/ingest` - Get sync status for data sources
- `POST /api/data/ingest` - Ingest new data from JSON/URL

## Database Functions

### `get_investigations_page()`

Optimized function for querying investigations that bypasses RLS overhead.

```sql
SELECT * FROM get_investigations_page(
  p_tier := 'exploratory',      -- 'research' or 'exploratory'
  p_type := NULL,               -- investigation_type filter (optional)
  p_status := NULL,             -- triage_status filter (optional)
  p_sort := 'triage_score',     -- sort column
  p_order := 'desc',            -- 'asc' or 'desc'
  p_limit := 20,                -- page size
  p_offset := 0                 -- pagination offset
);
```

### Agent SECURITY DEFINER Functions

The agent uses `SECURITY DEFINER` functions to bypass RLS for efficient data retrieval:
- `get_agent_investigation_ids()` - Get investigation IDs with counts
- `get_investigation_counts()` - Count by type

## RLS Performance Warning

When querying `aletheia_investigations` with RLS enabled (as `anon` or `authenticated` role), PostgreSQL may not use indexes efficiently. Direct queries can timeout even with proper indexes.

**Solution:** Use `SECURITY DEFINER` functions instead of direct table queries.

## Known Issues

- **TypeScript**: Some files use `@ts-nocheck` or `AnyClient` type assertions
- **Scripts**: Standalone scripts in `/scripts` have TypeScript target warnings (harmless)
- **Vercel CLI**: `vercel --prod` fails with git author error; workaround: `mv .git .git-backup && vercel --prod --yes; mv .git-backup .git`
- **Web Search**: Agent uses Tavily Search API (requires TAVILY_API_KEY env var)
- **Dev Server**: After significant code changes, may need restart to clear module cache

## External Repos That Feed This

- crisis-apparitions-analysis
- ganzfeld-moderator-analysis
- consciousness-signal-noise-model (the hub)
- specter / specter-watch
- nde-analysis
- stargate extraction (~/Desktop/stargate_extraction/)

## Contact

Built by @0xTars
