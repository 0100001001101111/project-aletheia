# TODO.md - Project Aletheia

*Last updated: January 23, 2026*

## Next Steps

### 1. Verify NDERF Import
~5400 NDE accounts were imported from nderf.org. Verify count:
```bash
npx tsx scripts/count-nde.ts
```

### 2. Evaluate Window Predictions
The 15 active predictions need evaluation against new data as it comes in.

### 3. Regenerate Supabase Types
Some API routes still use @ts-nocheck due to missing Supabase type definitions.
Run `supabase gen types typescript` when CLI is available.

---

## Data Pipeline

### Current State
- **166,808+ investigations** loaded (including ~5400 new NDEs)
- **1,246 grid cells** computed
- Sources: NUFORC, BFRO, Haunted Places, **NDERF (new)**

### NDERF Import (Jan 23, 2026)
- [x] Imported ~160 recent NDEs via API (2024-2025)
- [x] Imported ~5300 historical NDEs via HTML scraping (1998-2023)
- Scripts created: `scripts/import-nderf*.ts`, `scripts/analyze-nde.ts`
- See `SESSION_NOTES_2026-01-23.md` for full details

### Pending Imports
- [ ] Update BFRO data (currently ends 2017)
- [ ] Import more recent NUFORC data
- [ ] Add paranormal witness database

---

## Technical Debt

### Performance (PRIORITY)
- [x] **Add pagination to investigations API** (fixed - added `get_investigations_page()` function)
- [ ] Implement virtual scrolling for large lists
- [ ] Cache grid cell data (rarely changes)

### Type Safety
- [x] Removed `@ts-nocheck` from window-analysis lib files (grid.ts, window-index.ts, geological.ts)
- [ ] Replace remaining `@ts-nocheck` in API routes (needs Supabase types regeneration)
- [ ] Replace `AnyClient` assertions after regenerating Supabase types

### Testing
- [ ] Unit tests for Monte Carlo simulation
- [ ] Integration tests for prediction evaluation

---

## Completed This Session

- [x] Added `get_investigations_page()` database function to fix investigations page timeout
- [x] Added composite indexes on tier column for efficient pagination queries
- [x] Fixed admin authorization bypass in gaming-flags endpoints (now requires PhD verification)
- [x] Added Window Analysis link to main navigation
- [x] Fixed hardcoded dashboard stats - now fetches real data from `/api/stats` and `/api/user/stats`
- [x] Fixed hardcoded TemporalAnalysisTab - now fetches from `/api/analysis/window/temporal`
- [x] Fixed N+1 query pattern in submissions route
- [x] Added security headers (CSP, HSTS, X-Permitted-Cross-Domain-Policies)
- [x] Improved rate limiting with better client identification and production warnings
- [x] Added audit logging to credential verification route
- [x] Removed @ts-nocheck from window-analysis lib files (grid.ts, window-index.ts, geological.ts)
- [x] Fixed cooccurrence API response structure
- [x] Fixed seasonal distribution charts (bar rendering)
- [x] Added location names to Top Windows table
- [x] Switched correlation metric to z-scores with explanation
- [x] Added verification notes for geological metrics
- [x] Cleaned up misplaced files from brothers-command-center
- [x] Fixed Supabase client instantiation for Vercel builds
- [x] Deployed to Vercel

---

## Notes

- Dev server runs separately (`npm run dev` in another terminal)
- TypeScript check: `npx tsc --noEmit`
- Scripts use tsx: `npx tsx scripts/rebuild-grid.ts`
- Window analysis page: http://localhost:3000/analysis/windows
- Vercel deploy workaround: `mv .git .git-backup && vercel --prod --yes; mv .git-backup .git`
