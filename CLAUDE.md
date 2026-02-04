# CLAUDE.md - Project Aletheia

## Project Overview

Aletheia is a "GitHub for Anomaly Research" - a collaborative platform for rigorous investigation of anomalous phenomena. It provides standardized data schemas, cross-domain pattern matching, falsifiable prediction tracking, and an autonomous research agent.

## Current Project State (Jan 29, 2026 - Agent System v2 Complete)

### Agent System v2 (Complete)

A comprehensive 5-phase agent upgrade for deep, systematic anomaly research at "Jeffrey Long-level" analysis depth.

#### Phase 6a: Deep Miner Agent
- **Exhaustive within-domain statistical analysis**
- **Variable Census** - Enumerate every variable in a domain with distributions
- **Cross-Tabulations** - Every pair of categorical variables with chi-square tests
- **Subgroup Analysis** - Break down by age, gender, cause, etc.
- **Temporal Stability** - Track if patterns hold across decades
- **UI**: `/agent/deep-miner` - Trigger analysis, view results by domain
- **Database Tables**:
  - `aletheia_deep_miner_sessions` - Session tracking
  - `aletheia_variable_census` - All extracted variables
  - `aletheia_cross_tabulations` - χ² tests, Cramér's V, effect sizes
  - `aletheia_subgroup_analyses` - Breakdowns by grouping variables
  - `aletheia_temporal_stability` - Trend analysis over time

#### Phase 6b: Discovery Agent v2 - Literature Deep Dives
- **Paper Extraction** - Structured extraction of claims, methods, effect sizes from academic papers via Claude API
- **Literature Synthesis** - Multi-paper synthesis generating consensus positions, contradictions, and research gaps
- **Replication Tracking** - Track replication attempts, calculate success rates, identify discrepancies
- **UI**: `/agent/discovery-v2` - Tabs for extractions, syntheses, replication tracking
- **API Endpoints**:
  - `POST /api/agent/discovery-v2/extract` - Extract structured data from paper
  - `GET /api/agent/discovery-v2/extractions` - List paper extractions
  - `POST /api/agent/discovery-v2/synthesize` - Create literature synthesis
  - `GET /api/agent/discovery-v2/syntheses` - List syntheses
  - `GET/POST /api/agent/discovery-v2/replication` - Replication tracking
- **Database Tables**:
  - `aletheia_paper_extractions` - Structured paper data with claims, methods, effect sizes
  - `aletheia_literature_syntheses` - Multi-paper synthesis reports
  - `aletheia_replication_attempts` - Replication attempt tracking

#### Phase 6c: Connection Agent - Cross-Domain Patterns
- **Variable Mapper** - Semantic mapping of variables across domains (e.g., NDE "out_of_body" ↔ UFO "missing_time")
- **Correlation Finder** - Pearson correlation, temporal co-occurrence, geographic clustering analysis
- **Keel Tester** - Tests John Keel's hypothesis that "weird stuff correlates" using weirdness indicators per domain
- **Witness Clusterer** - K-means clustering of witness profiles with silhouette scoring
- **UI**: `/agent/connection` - Tabs for overview, variable mappings, correlations, Keel tests, witness profiles
- **API Endpoints**:
  - `POST /api/agent/connection/trigger` - Start connection analysis session
  - `GET /api/agent/connection/sessions` - List sessions
  - `GET /api/agent/connection/results` - Get mappings, correlations, Keel tests, profiles
- **Database Tables**:
  - `aletheia_connection_sessions` - Connection Agent sessions
  - `aletheia_variable_mappings` - Semantic variable mappings across domains
  - `aletheia_cross_domain_correlations` - Correlation analysis results
  - `aletheia_keel_tests` - Keel hypothesis test results
  - `aletheia_keel_test_pairs` - Individual domain pair results
  - `aletheia_witness_profiles` - K-means clustered witness archetypes

#### Phase 6d: Mechanism Agent - Explanatory Theory Hunting
- **Mechanism Catalog** - Predefined mechanisms per domain (e.g., NDE: anoxia, REM intrusion, temporal lobe; UFO: misidentification, plasma)
- **Test Designer** - Creates discriminating tests between competing mechanisms
- **Theory Builder** - Builds unified theories across domains with parsimony scoring
- **UI**: `/agent/mechanism` - Tabs for overview, mechanisms by domain, designed tests, unified theories
- **API Endpoints**:
  - `POST /api/agent/mechanism/trigger` - Start mechanism analysis session
  - `GET /api/agent/mechanism/sessions` - List sessions
  - `GET /api/agent/mechanism/results` - Get mechanisms, tests, theories
- **Database Tables**:
  - `aletheia_mechanism_sessions` - Mechanism Agent sessions
  - `aletheia_mechanisms` - Proposed mechanisms with plausibility ratings
  - `aletheia_mechanism_tests` - Designed discriminating tests
  - `aletheia_unified_theories` - Cross-domain unified theories
  - `aletheia_theory_evidence` - Evidence links for theories

#### Phase 6e: Synthesis Agent - Research Reports
- **Domain Deep Dive** - Comprehensive single-domain reports with key findings, open questions, research priorities
- **Cross-Domain Synthesizer** - Identifies cross-cutting patterns with themes (consciousness, perception, environmental, etc.)
- **Research Brief Generator** - Audience-specific briefs (academic, journalist, general_public, funder, skeptic) with domain experts
- **UI**: `/agent/synthesis` - Tabs for overview, deep dives, cross-domain syntheses, research briefs
- **API Endpoints**:
  - `POST /api/agent/synthesis/trigger` - Start synthesis session
  - `GET /api/agent/synthesis/sessions` - List sessions
  - `GET /api/agent/synthesis/results` - Get deep dives, syntheses, briefs
- **Database Tables**:
  - `aletheia_synthesis_sessions` - Synthesis Agent sessions
  - `aletheia_domain_deep_dives` - Comprehensive domain reports
  - `aletheia_cross_domain_syntheses` - Cross-cutting pattern syntheses
  - `aletheia_research_briefs` - Audience-specific briefs

### Agent Navigation
All agents accessible from `/agent` hub page:
- **Research Agent** (default) - Pattern discovery and hypothesis testing
- **Research Reports** - Published research reports
- **Review Queue** - Findings awaiting human review
- **Data Acquisition** - Gap detection and data sourcing
- **Discovery Agent** - External research and source monitoring
- **Discovery v2** (teal) - Literature deep dives
- **Connection Agent** (indigo) - Cross-domain patterns
- **Mechanism Agent** (emerald) - Explanatory theories
- **Synthesis Agent** (rose) - Research report generation

## Previous Project State (Jan 27, 2026 - Evening Update)

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

#### Phase 6: Discovery Agent
- **Second autonomous agent** that hunts for external research and cross-domain connections
- Complements Research Agent: Discovery finds leads, Research tests hypotheses
- **Source Monitoring** - Checks 28 curated sources across 7 types:
  - Journals: JSE, J. Parapsychology, JNDS, EdgeScience, JCS
  - Archives: CIA Reading Room, NSA, FBI Vault, UK National Archives, DIA FOIA
  - Organizations: SSE, PA, IONS, IANDS, Rhine, UVA DOPS
  - Preprints: arXiv (q-bio.NC), PsyArXiv, OSF
  - Conferences: PA, SSE, MUFON, IANDS
- **Researcher Tracking** - Follows 24 curated researchers:
  - Parapsychology: Radin, Cardeña, Bem, Utts, Mossbridge, Tressoldi
  - NDE: Greyson, Parnia, van Lommel, Sartori
  - Skeptics: French, Wiseman, Blackmore
  - UFO/UAP: Vallée, Nolan, Loeb, Pasulka
  - Geophysical: Persinger, Derr
  - Consciousness: Kastrup, Hoffman, Chalmers
  - Remote Viewing: May, Schwartz
- **Lead Evaluation** - Quality scoring (0-100) with signals/concerns
- **Cross-Domain Analysis** - Detects connections across research domains
- **Citation Trail Following** - Follows references 2 levels deep
- **Agent Handoffs** - Discovery → Research hypothesis handoffs
- **UI Pages**:
  - `/agent/discovery` - Terminal with session management
  - `/agent/discovery/leads` - Review queue with filtering
  - `/agent/discovery/sources` - Manage monitored sources
  - `/agent/discovery/researchers` - Track researchers

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
- Rejection workflow with dropdown reasons (duplicate, methodology, insufficient_evidence, already_known, not_actionable, other)
- Bulk select/reject for efficient queue management
- Request More Info workflow for additional agent analysis
- Confidence scores capped at 85% (epistemic humility)

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
│   │   ├── page.tsx             # Agent terminal (hub)
│   │   ├── acquire/             # Data acquisition queue
│   │   │   └── page.tsx         # Acquisition review
│   │   ├── deep-miner/          # Deep Miner Agent
│   │   │   └── page.tsx         # Deep mining UI
│   │   ├── discovery/           # Discovery Agent pages
│   │   │   ├── page.tsx         # Discovery terminal
│   │   │   ├── leads/page.tsx   # Leads review queue
│   │   │   ├── sources/page.tsx # Monitored sources
│   │   │   └── researchers/page.tsx # Tracked researchers
│   │   ├── discovery-v2/        # Discovery v2 (Literature)
│   │   │   └── page.tsx         # Literature deep dives UI
│   │   ├── connection/          # Connection Agent
│   │   │   └── page.tsx         # Cross-domain patterns UI
│   │   ├── mechanism/           # Mechanism Agent
│   │   │   └── page.tsx         # Theory hunting UI
│   │   ├── synthesis/           # Synthesis Agent
│   │   │   └── page.tsx         # Research reports UI
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
│   │   ├── discovery-runner.ts  # Discovery Agent orchestration
│   │   ├── discovery-manager.ts # Discovery CRUD operations
│   │   ├── discovery-sources.ts # Seed data for monitored sources
│   │   ├── tracked-researchers.ts # Seed data for researchers
│   │   ├── source-monitor.ts    # Check sources for new content
│   │   ├── cross-domain-analyzer.ts # Find connections across domains
│   │   ├── lead-evaluator.ts    # Quality scoring and deduplication
│   │   ├── supabase-admin.ts    # Admin client for agent
│   │   ├── types.ts             # Agent type definitions
│   │   ├── deep-miner/          # Deep Miner Agent
│   │   │   ├── runner.ts        # Deep miner orchestration
│   │   │   ├── variable-census.ts # Variable enumeration
│   │   │   ├── cross-tabulator.ts # Chi-square analysis
│   │   │   ├── subgroup-analyzer.ts # Subgroup breakdowns
│   │   │   └── temporal-stability.ts # Trend analysis
│   │   ├── discovery-v2/        # Discovery v2 (Literature)
│   │   │   ├── paper-extractor.ts # Structured paper extraction
│   │   │   ├── literature-synthesizer.ts # Multi-paper synthesis
│   │   │   └── replication-tracker.ts # Replication tracking
│   │   ├── connection/          # Connection Agent
│   │   │   ├── runner.ts        # Connection orchestration
│   │   │   ├── variable-mapper.ts # Semantic variable mapping
│   │   │   ├── correlation-finder.ts # Cross-domain correlations
│   │   │   ├── keel-tester.ts   # Keel hypothesis testing
│   │   │   └── witness-clusterer.ts # K-means witness profiling
│   │   ├── mechanism/           # Mechanism Agent
│   │   │   ├── runner.ts        # Mechanism orchestration
│   │   │   ├── mechanism-catalog.ts # Predefined mechanisms
│   │   │   ├── test-designer.ts # Discriminating test design
│   │   │   └── theory-builder.ts # Unified theory construction
│   │   └── synthesis/           # Synthesis Agent
│   │       ├── runner.ts        # Synthesis orchestration
│   │       ├── domain-deep-dive.ts # Domain-specific reports
│   │       ├── cross-domain-synthesizer.ts # Cross-cutting patterns
│   │       └── research-brief-generator.ts # Audience-specific briefs
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
- `aletheia_discovery_sessions` - Discovery Agent run sessions
- `aletheia_discovery_leads` - Discovered papers, datasets, connections
- `aletheia_discovery_sources` - Monitored journals, archives, organizations
- `aletheia_researchers_tracked` - Researchers being followed
- `aletheia_agent_handoffs` - Communication between Discovery and Research agents

**Agent System v2:**
- `aletheia_deep_miner_sessions` - Deep Miner Agent sessions
- `aletheia_variable_census` - Enumerated variables with distributions
- `aletheia_cross_tabulations` - Chi-square tests and Cramér's V effect sizes
- `aletheia_subgroup_analyses` - Breakdowns by grouping variables
- `aletheia_temporal_stability` - Pattern stability over time
- `aletheia_paper_extractions` - Structured paper extractions (claims, methods, effects)
- `aletheia_literature_syntheses` - Multi-paper synthesis reports
- `aletheia_replication_attempts` - Replication tracking with success rates
- `aletheia_connection_sessions` - Connection Agent sessions
- `aletheia_variable_mappings` - Semantic variable mappings across domains
- `aletheia_cross_domain_correlations` - Correlation analysis results
- `aletheia_keel_tests` - Keel hypothesis battery results
- `aletheia_keel_test_pairs` - Individual domain pair Keel tests
- `aletheia_witness_profiles` - K-means clustered witness archetypes
- `aletheia_mechanism_sessions` - Mechanism Agent sessions
- `aletheia_mechanisms` - Proposed mechanisms with plausibility ratings
- `aletheia_mechanism_tests` - Designed discriminating tests
- `aletheia_unified_theories` - Cross-domain unified theories
- `aletheia_theory_evidence` - Evidence links for theories
- `aletheia_synthesis_sessions` - Synthesis Agent sessions
- `aletheia_domain_deep_dives` - Comprehensive domain reports
- `aletheia_cross_domain_syntheses` - Cross-cutting pattern syntheses
- `aletheia_research_briefs` - Audience-specific research briefs

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

## Discovery Agent APIs

- `GET /api/agent/discovery/status` - Discovery Agent status and stats
- `POST /api/agent/discovery/trigger` - Trigger discovery session
- `GET /api/agent/discovery/sessions` - List discovery sessions
- `GET /api/agent/discovery/leads` - List leads with filters
- `GET /api/agent/discovery/leads/[id]` - Lead detail
- `PATCH /api/agent/discovery/leads/[id]` - Approve/reject/investigate lead
- `GET /api/agent/discovery/sources` - List monitored sources
- `POST /api/agent/discovery/sources` - Add new source
- `GET /api/agent/discovery/researchers` - List tracked researchers
- `POST /api/agent/discovery/researchers` - Add new researcher

## Agent System v2 APIs

**Deep Miner:**
- `POST /api/agent/deep-miner/trigger` - Start deep mining session
- `GET /api/agent/deep-miner/sessions` - List sessions
- `GET /api/agent/deep-miner/results` - Get census, crosstabs, subgroups, temporal

**Discovery v2 (Literature):**
- `POST /api/agent/discovery-v2/extract` - Extract structured data from paper
- `GET /api/agent/discovery-v2/extractions` - List paper extractions
- `POST /api/agent/discovery-v2/synthesize` - Create literature synthesis
- `GET /api/agent/discovery-v2/syntheses` - List syntheses
- `GET/POST /api/agent/discovery-v2/replication` - Replication tracking

**Connection Agent:**
- `POST /api/agent/connection/trigger` - Start connection analysis
- `GET /api/agent/connection/sessions` - List sessions
- `GET /api/agent/connection/results?type=` - Get mappings|correlations|keel_tests|profiles

**Mechanism Agent:**
- `POST /api/agent/mechanism/trigger` - Start mechanism analysis
- `GET /api/agent/mechanism/sessions` - List sessions
- `GET /api/agent/mechanism/results?type=` - Get mechanisms|tests|theories

**Synthesis Agent:**
- `POST /api/agent/synthesis/trigger` - Start synthesis session
- `GET /api/agent/synthesis/sessions` - List sessions
- `GET /api/agent/synthesis/results?type=` - Get deep_dives|syntheses|briefs

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
- **Data Acquisition**: Web scrapers for BFRO, NUFORC, NDERF are mocked (only USGS API works)
- **Agent Scheduling**: No automatic cron - agents must be triggered manually or via API

## External Repos That Feed This

- crisis-apparitions-analysis
- ganzfeld-moderator-analysis
- consciousness-signal-noise-model (the hub)
- specter / specter-watch
- nde-analysis
- stargate extraction (~/Desktop/stargate_extraction/)

## Contact

Built by @0xTars
