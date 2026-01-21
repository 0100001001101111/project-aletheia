# CLAUDE.md - Project Aletheia

## Project Overview

Aletheia is a "GitHub for Anomaly Research" - a collaborative platform for rigorous investigation of anomalous phenomena. It provides standardized data schemas, cross-domain pattern matching, and falsifiable prediction tracking.

## Current Project State (Jan 21, 2026)

### What's Working
- **Landing page** - Domain statistics, live counts
- **Dashboard** - Overview with stats cards
- **Investigations** - Browse/filter verified investigations (166k+ records)
- **Predictions** - List + detail pages with testing workflow
- **Patterns** - Cross-domain pattern visualization
- **Community Hypotheses** - Submit speculative ideas, AI-generated evidence suggestions
- **Disputes/Jury** - Flag results, jury voting system
- **Pre-registration** - Hash-locked methodology before testing
- **Red Team Dashboard** - Skeptic tools for flagging flaws
- **Auth** - Public + anonymous user system with verification levels
- **Window Analysis Dashboard** - Geographic clustering analysis (John Keel's hypothesis)
- **Data Ingestion Pipeline** - API for importing NUFORC, BFRO, and other datasets

### Recent Additions (Jan 21, 2026)
- **Window Theory Analysis** - Full dashboard at `/analysis/windows` with:
  - Spatial analysis (multi-resolution grid, scale-dependent clustering)
  - Temporal analysis tab
  - Geological correlates tab
  - Pre-registered falsifiable predictions (15 active)
  - Data status tracking
- **Monte Carlo Co-occurrence Analysis** - Statistical validation of clustering patterns
- **Prediction Generator** - Creates testable hypotheses from grid data
- **Data Ingestion API** - `/api/data/ingest` for bulk imports
- **Grid Builder** - Assigns investigations to 1246 geographic cells

## Tech Stack

- Next.js 14 (App Router)
- Supabase (PostgreSQL + Auth + RLS)
- Tailwind CSS (dark theme)
- TypeScript
- Claude API (LLM parsing, evidence generation)
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
│   │   ├── analysis/window/    # Window analysis APIs (grid, cooccurrence, predictions)
│   │   ├── data/ingest/        # Data ingestion API
│   │   ├── predictions/        # Prediction CRUD
│   │   ├── patterns/           # Pattern matching
│   │   └── ...
│   ├── analysis/windows/       # Window Theory dashboard
│   ├── community/              # Community hypotheses pages
│   ├── dashboard/              # Main dashboard
│   ├── disputes/               # Jury voting interface
│   ├── investigations/         # Investigation browser
│   ├── patterns/               # Pattern visualization
│   ├── predictions/            # Prediction list + detail
│   ├── preregister/            # Pre-registration flow
│   ├── redteam/                # Red team/skeptic dashboard
│   └── submit/                 # Data submission wizard
├── components/
│   ├── window-analysis/        # Window dashboard components
│   │   ├── SpatialAnalysisTab.tsx
│   │   ├── TemporalAnalysisTab.tsx
│   │   ├── GeologicalAnalysisTab.tsx
│   │   ├── PredictionsPanel.tsx
│   │   ├── DataStatusTab.tsx
│   │   ├── TopWindowsTable.tsx
│   │   └── WindowMap.tsx
│   ├── auth/                   # Auth UI components
│   ├── community/              # Hypothesis cards
│   ├── disputes/               # Jury voting components
│   ├── layout/                 # Navigation, PageWrapper
│   └── ui/                     # Shared UI primitives
├── lib/
│   ├── window-analysis/        # Window theory logic
│   │   ├── grid.ts             # Geographic grid assignment
│   │   ├── monte-carlo.ts      # Statistical simulations
│   │   ├── predictor.ts        # Prediction generation
│   │   ├── temporal.ts         # Time-series analysis
│   │   └── window-index.ts     # Window index calculations
│   ├── data-ingestion/         # Data import utilities
│   │   ├── ingest.ts           # Core ingestion logic
│   │   ├── parsers.ts          # Source-specific parsers
│   │   ├── geocode.ts          # Geocoding utilities
│   │   └── types.ts            # Ingestion types
│   └── ...
├── schemas/                    # Zod validation schemas
└── types/                      # TypeScript types
scripts/
├── rebuild-grid.ts             # Rebuild geographic grid
├── generate-predictions.ts     # Generate new predictions
├── import-nuforc.ts            # NUFORC data import
└── ...
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
- `aletheia_investigations` - Submitted research data with triage scoring (166k+ records)
- `aletheia_predictions` - Falsifiable predictions from pattern matches
- `aletheia_pattern_matches` - Cross-domain correlations
- `aletheia_contributions` - Track user contributions for credibility

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

## Current Data (Jan 21, 2026)

- **166,808 investigations** across domains (UFO, Bigfoot, Haunting, etc.)
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

**Why this exists:** RLS policies prevent PostgreSQL from using composite indexes efficiently, causing queries to take 5+ seconds instead of ~50ms. This `SECURITY DEFINER` function runs with elevated privileges and uses proper enum type casting to enable index usage.

**Used by:** `/api/submissions` GET endpoint

## RLS Performance Warning

When querying `aletheia_investigations` with RLS enabled (as `anon` or `authenticated` role), PostgreSQL may not use indexes efficiently. Direct queries can timeout even with proper indexes.

**Solution:** Use `get_investigations_page()` function instead of direct table queries for paginated investigation lists.

## Known Issues

- **TypeScript**: Some files use `@ts-nocheck` or `AnyClient` type assertions
- **Scripts**: Standalone scripts in `/scripts` have TypeScript target warnings (harmless)
- **Vercel CLI**: `vercel --prod` fails with git author error; workaround: `mv .git .git-backup && vercel --prod --yes; mv .git-backup .git`

## External Repos That Feed This

- crisis-apparitions-analysis
- ganzfeld-moderator-analysis
- consciousness-signal-noise-model (the hub)
- specter / specter-watch
- nde-analysis
- stargate extraction (~/Desktop/stargate_extraction/)

## Contact

Built by @0xTars
