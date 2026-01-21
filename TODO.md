# TODO.md - Project Aletheia

*Last updated: January 21, 2026*

## CRITICAL: Investigations Page Timeout

**Status:** BROKEN

The investigations page times out with 166k+ records:
```
Failed to fetch submissions: canceling statement due to statement timeout
```

**Fix needed:**
- Add server-side pagination to `/api/submissions` route
- Limit initial fetch to 50-100 records
- Add "Load More" or infinite scroll

**Affected URL:** `/investigations?tier=exploratory`

---

## Next Steps

### 1. Fix Investigations Page Timeout (URGENT)
Add pagination to handle 166k+ records without timeout.

**Files to modify:**
- `src/app/api/submissions/route.ts` - Add limit/offset params
- `src/app/investigations/page.tsx` - Add pagination UI

### 2. Add Navigation to Window Analysis
Add link to Window Analysis dashboard in main navigation sidebar.

**Files to modify:**
- `src/components/layout/Sidebar.tsx` or equivalent nav component

### 3. Evaluate Window Predictions
The 15 active predictions need evaluation against new data as it comes in.

### 4. Temporal Analysis Implementation
The TemporalAnalysisTab has working charts now but uses hardcoded data. Need to:
- Connect to actual temporal data from database
- Add time-series visualization

---

## Data Pipeline

### Current State
- **166,808 investigations** loaded
- **1,246 grid cells** computed
- Sources: NUFORC, BFRO, Haunted Places

### Pending Imports
- [ ] Update BFRO data (currently ends 2017)
- [ ] Import more recent NUFORC data
- [ ] Add paranormal witness database

---

## Technical Debt

### Performance (PRIORITY)
- [ ] **Add pagination to investigations API** (causes timeout)
- [ ] Implement virtual scrolling for large lists
- [ ] Cache grid cell data (rarely changes)

### Type Safety
- [ ] Replace `@ts-nocheck` with proper types
- [ ] Replace `AnyClient` assertions after regenerating Supabase types

### Testing
- [ ] Unit tests for Monte Carlo simulation
- [ ] Integration tests for prediction evaluation

---

## Completed This Session

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
