# CLAUDE.md - Project Aletheia

## Project Overview

Aletheia is a "GitHub for Anomaly Research" - a collaborative platform for rigorous investigation of anomalous phenomena. It provides standardized data schemas, cross-domain pattern matching, and falsifiable prediction tracking.

## Current Project State (Jan 2026)

### What's Working
- **Landing page** - Domain statistics, live counts
- **Dashboard** - Overview with stats cards
- **Investigations** - Browse/filter verified investigations (6,018 total records)
- **Predictions** - List + detail pages with testing workflow
- **Patterns** - Cross-domain pattern visualization
- **Community Hypotheses** - Submit speculative ideas, AI-generated evidence suggestions
- **Disputes/Jury** - Flag results, jury voting system
- **Pre-registration** - Hash-locked methodology before testing
- **Red Team Dashboard** - Skeptic tools for flagging flaws
- **Auth** - Public + anonymous user system with verification levels
- **UFO/UAP Schema** - Full schema with geophysical, temporal, and consciousness correlates

### Recent Additions (Jan 16, 2026)
- **UFO/UAP Data Import** - 5,815 NUFORC sightings with parsed structured data
- **Sixth Domain Schema** - UFO schema added to all components (PatternCard, PredictionCard, etc.)
- **Dispute Resolution System** - Three-tier conflict resolution with blind jury voting
- Trust architecture tables (preregistrations, flaw_flags, community_hypotheses, disputes, jury_pool, jury_votes)
- Methodology points + credibility scoring
- Community hypotheses with Claude-generated "evidence needed"
- Onboarding documentation for data custodians (docs/onboarding/)
- **Defensive SCHEMA_METADATA access** - Bulletproof null checks with optional chaining throughout

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
│   ├── api/                # API routes (predictions, patterns, community, disputes, etc.)
│   ├── community/          # Community hypotheses pages
│   ├── dashboard/          # Main dashboard
│   ├── disputes/           # Jury voting interface
│   ├── investigations/     # Investigation browser
│   ├── patterns/           # Pattern visualization
│   ├── predictions/        # Prediction list + detail
│   ├── preregister/        # Pre-registration flow
│   ├── redteam/            # Red team/skeptic dashboard
│   └── submit/             # Data submission wizard
├── components/
│   ├── auth/               # Auth UI components
│   ├── community/          # Hypothesis cards
│   ├── disputes/           # Jury voting components
│   ├── layout/             # Navigation, PageWrapper
│   ├── predictions/        # Prediction cards, quality assessment
│   ├── patterns/           # Pattern visualization
│   ├── submission/         # Submission wizard steps
│   └── ui/                 # Shared UI primitives
├── contexts/               # Auth context
├── lib/                    # Utilities (supabase, auth, parser, triage, pattern-matcher, statistics)
├── schemas/                # Zod validation schemas (5 domains)
└── types/                  # TypeScript types
docs/
└── onboarding/             # Data custodian onboarding emails
supabase/
└── migrations/             # Database schema (SOURCE OF TRUTH)
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

## Verification Steps

For UI changes:
1. Check browser console for errors (user will provide screenshot or paste)
2. Verify data loads by checking Network tab
3. Test with actual database data, not mocks

For database changes:
1. Run migration
2. Verify with: `SELECT * FROM table_name LIMIT 5;`
3. Check RLS policies don't have recursion

For API changes:
1. Test endpoint with curl or browser
2. Check error handling for null/undefined cases
3. Verify auth middleware works

## The Six Schemas

| Schema | Focus | Records |
|--------|-------|---------|
| NDE | Biological triggers, veridicality | 2 |
| Ganzfeld | Information transfer vs noise | 52 |
| Crisis Apparition | Spontaneous transmission | 18 |
| STARGATE | Remote viewing, edit filter | 104 |
| Geophysical | Tectonic stress, EM anomalies | 27 |
| UFO/UAP | Aerial anomalies, geophysical/consciousness correlates | 5,815 |

## Core Hypothesis

"Stress produces signal - at every scale"

| Scale | System | Stressor | Signal |
|-------|--------|----------|--------|
| Micro | Neuron | Death/Trauma | NDE |
| Meso | Human | Crisis/Grief | Apparitions |
| Macro | Planet | Seismic pressure | UFO/EQ lights |

## Pattern Matcher Logic

Confidence Score = (Prevalence × 0.3) + (Reliability × 0.4) + (Stability × 0.3)

- Prevalence: Pattern appears in 3+ domains
- Reliability: p-value consistently < 0.05
- Stability: Pattern holds when new data added
- Threshold: C_s > 0.85 triggers prediction generation

## Triage Scoring (0-10)

| Criterion | Points |
|-----------|--------|
| Source traceable | 0-2 |
| First-hand account | 0-2 |
| Methodology documented | 0-2 |
| Receiver profile present | 0-2 |
| Raw data included | 0-2 |

Score 7+ = Verified status

## Auth System

- Public users: Full attribution
- Anonymous verified: ZKP credential claim
- Anonymous unverified: Read-only + provisional submissions

## Slash Commands

- `/fix-ui` - Run tsc, check component errors
- `/deploy` - Deploy to Vercel
- `/test-db` - Query Supabase to verify data
- `/commit-push` - Git add, commit, push

## Database Tables

**Core:**
- `aletheia_users` - User profiles with identity_type, verification_level, credibility_score
- `aletheia_investigations` - Submitted research data with triage scoring
- `aletheia_predictions` - Falsifiable predictions from pattern matches
- `aletheia_pattern_matches` - Cross-domain correlations
- `aletheia_contributions` - Track user contributions for credibility

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

## Current Data (Jan 20, 2026)

- **5,171 investigations** across 6 domains
  - UFO/UAP: 4,968 (NUFORC import, deduplicated)
  - STARGATE: 104
  - Ganzfeld: 52
  - Geophysical: 27
  - Crisis Apparition: 18
  - NDE: 2
- **0 patterns** (seed data removed - awaiting real calculations)
- **0 predictions** (fake predictions removed - awaiting real test results)

### IMPORTANT: earthquake_nearby Field

The `earthquake_nearby` field in UFO records shows 53% = true. **This is NOT a validated correlation.**

**Methodology:**
- Time window: 7 days
- Radius: 150-200km (inconsistent documentation)
- Magnitude: M≥2.5
- Source: USGS API

**Why it's meaningless:**
The M≥2.5 threshold is too low. California has ~15,000 M≥2.5 earthquakes/year. Within 200km of any California location, there's almost always a recent earthquake.

**Rigorous testing (specter-watch methodological_review.py) found:**
- At M≥4.0 threshold: effect ratio drops from 8.32x to ~1.5x
- After Bonferroni correction: most findings non-significant
- Verdict: **SPECTER earthquake hypothesis FAILED**

Do NOT claim "53% seismic correlation" without this context.

## Known Issues

- **TypeScript**: Some new tables use `AnyClient` type assertions until Supabase types regenerated
- **Upvote tracking**: No per-user vote tracking yet (users can upvote multiple times)
- **Community hypothesis promotion**: Manual process, no auto-promotion triggers
- **Jury selection**: Currently manual, needs random selection algorithm
- **Vercel CLI permissions**: `vercel --prod` fails with git author error; workaround is to temporarily move `.git` folder before deploying

## External Repos That Feed This

- crisis-apparitions-analysis
- ganzfeld-moderator-analysis
- consciousness-signal-noise-model (the hub)
- specter / specter-watch
- nde-analysis
- stargate extraction (~/Desktop/stargate_extraction/)

## Contact

Built by @0xTars
