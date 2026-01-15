# CLAUDE.md - Project Aletheia

## Project Overview

Aletheia is a "GitHub for Anomaly Research" - a collaborative platform for rigorous investigation of anomalous phenomena. It provides standardized data schemas, cross-domain pattern matching, and falsifiable prediction tracking.

## Tech Stack

- Next.js 14 (App Router)
- Supabase (PostgreSQL + Auth)
- Tailwind CSS
- TypeScript
- Claude API (LLM parsing)

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
├── app/                    # Next.js pages
├── components/             # React components
├── contexts/               # Auth context
├── lib/                    # Utilities (supabase, auth, parser, triage, pattern-matcher)
├── schemas/                # Zod validation schemas
└── types/                  # TypeScript types
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

## The Five Schemas

| Schema | Focus |
|--------|-------|
| NDE | Biological triggers, veridicality |
| Ganzfeld | Information transfer vs noise |
| Crisis Apparition | Spontaneous transmission |
| STARGATE | Remote viewing, edit filter |
| Geophysical | Tectonic stress, EM anomalies |

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

## Current Seed Data

- 8 investigations (POC projects)
- 10 patterns
- 46 predictions (3 confirmed, 2 refuted)

## External Repos That Feed This

- crisis-apparitions-analysis
- ganzfeld-moderator-analysis
- consciousness-signal-noise-model (the hub)
- specter / specter-watch
- nde-analysis
- stargate extraction (~/Desktop/stargate_extraction/)

## Contact

Built by @0xTars
