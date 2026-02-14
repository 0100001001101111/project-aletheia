# CLAUDE.md - Project Aletheia (Website)

## What This Is

Anomaly research platform. Next.js 14 (App Router) + Supabase + Vercel.
Five research domains (NDE, Ganzfeld, Crisis Apparition, STARGATE, Geophysical).
22 AI agents on a Raspberry Pi post findings here. This codebase is the website, not the agents.

For full project context: @PROJECT_ALETHEIA_BIBLE_v2.md

## Commands

- `npm run dev` — local dev server
- `npm run build` — ALWAYS run before push. TypeScript errors = Vercel deploy fails.
- `npm run lint` — ESLint check

## Architecture

- `/app` — Next.js App Router pages and layouts
- `/app/api` — API routes (agent triggers, data ingest, analysis endpoints)
- `/app/api/agent/` — Website-side agent endpoints (NOT the Pi agents, see below)
- `/src/lib/agent/` — Agent runner, modules (web search, stats, validation, etc.)
- `/src/lib/ingest/` — Data ingestion pipeline (extract-text.ts uses exceljs, NOT xlsx)
- `/src/components/` — React components
- `/scripts/` — Standalone scripts (TypeScript target warnings are harmless, ignore them)

## Two Separate Agent Systems (IMPORTANT)

There are TWO agent systems with overlapping names. They are completely independent:

**Pi agents (OpenClaw):** 22 autonomous agents on Raspberry Pi. Run on cron schedules.
Post findings to Supabase. These are the research workhorses.

**Website agents (this repo):** API routes under /app/api/agent/. Only fire when
manually triggered via POST endpoints. Used for on-platform analysis features.
Same names (Deep Miner, Connection, Mechanism, Synthesis) but different code.

Don't confuse them. When fixing website agent endpoints, you're working on THIS repo.
When someone mentions "the agents aren't running," they probably mean the Pi.

## Auth & Security

- Auth: Supabase Auth. anon key for client, service_role for server only.
- CRUCIBLE security audit ran Feb 12, 2026. 6 CRITICAL + 1 HIGH fixed.
- FIXED (Feb 13, 2026): Auth checks added to all ~28 unprotected agent/API endpoints.
- FIXED (Feb 13, 2026): SECURITY DEFINER functions hardened — get_anthropic_key/get_resend_key restricted to service_role only, auth.uid() checks added to increment_credibility/deduct_credits/get_research_session_summary, document_exists_by_hash/get_literature_stats switched to SECURITY INVOKER, refresh_ufo_heatmap restricted to service_role.
- FIXED (Feb 13, 2026): CSRF Origin/Referer validation added in middleware for all state-changing API requests (POST/PUT/DELETE/PATCH).
- Remaining: H6: Admin role not verified server-side. award_methodology_points/escalate_dispute/tally_jury_votes not yet deployed (in local migration only).
- Auth check pattern (use this for all agent endpoints):
  ```typescript
  const supabase = createRouteHandlerClient<Database>({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  ```

## Known Bugs & Gotchas

- **Chrome auth bug:** Login works in Brave, breaks in Chrome. Race condition: signInWithPassword succeeds, onAuthStateChange fires, fetchUserProfile runs before auth headers set, query fails silently, user set to null. NOT FIXED. Works in Brave.
- **xlsx was replaced with exceljs** (Feb 12, 2026). CVE remediation. Only file affected: `src/lib/ingest/extract-text.ts`. Function is now async. If you see xlsx imports anywhere, they're stale.
- **Vercel deploy fails:** Usually missing env vars. Check SUPABASE_URL, SUPABASE_ANON_KEY etc in Vercel project settings.
- **TypeScript @ts-nocheck:** Some files use it. Don't add more. Fix types instead.
- **Web search in agents:** Uses Tavily (TAVILY_API_KEY). Pi agents use Brave Search separately.
- **Vercel CLI workaround:** `vercel --prod` fails with git author error. Fix: `mv .git .git-backup && vercel --prod --yes; mv .git-backup .git`

## Supabase

- RLS is enabled. Direct queries on aletheia_investigations can timeout.
- Use SECURITY DEFINER functions for bulk reads (get_agent_investigation_ids, get_investigation_counts, get_investigations_page).
- Keys: anon key = client-safe. service_role = server only, NEVER expose to client.

## What NOT to Do

- Don't install xlsx. Use exceljs.
- Don't expose service_role key in client components.
- Don't add console.log with user IDs (removed 5 in CRUCIBLE audit).
- Don't assume agent endpoints have auth. Most don't yet. That's a known issue.
- Don't touch MEDIUM/LOW security items without asking first. Focus on CRITICAL/HIGH.

## External Repos

- specter / specter-watch (UFO-seismic correlation)
- ganzfeld-moderator-analysis, crisis-apparitions-analysis, nde-analysis
- stargate_extraction (declassified data)

## Learned Rules

<!-- Add rules here as mistakes happen -->
- Don't use xlsx. It was replaced with exceljs on Feb 12, 2026 due to CVE. (extract-text.ts)
- Async/sync mismatch breaks builds. The exceljs swap made extract-text async. Callers were already async, but always check.
- Next.js 14.2.35 is the current version. 9 CVEs patched from 14.2.21. Don't downgrade.
