# TODO.md - Project Aletheia

*Last updated: January 25, 2026*

## Next Steps

### 1. Add Navigation to Window Analysis
Add link to Window Analysis dashboard in main navigation sidebar.

**Files to modify:**
- `src/components/layout/Sidebar.tsx` or equivalent nav component

### 2. Evaluate Window Predictions
The 15 active predictions need evaluation against new data as it comes in.

### 3. Temporal Analysis Implementation
The TemporalAnalysisTab has working charts now but uses hardcoded data. Need to:
- Connect to actual temporal data from database
- Add time-series visualization

---

## Data Pipeline

### Current State
- **174,120 investigations** loaded (185 research + 173,935 exploratory)
- **1,246 grid cells** computed
- Sources: NUFORC, BFRO, Haunted Places, NDERF, OBERF, ADCRF

### Pending Imports
- [ ] Update BFRO data (currently ends 2017)
- [ ] Import more recent NUFORC data
- [ ] Add paranormal witness database

---

## Technical Debt

### Performance
- [x] **Add pagination to investigations API** - DONE (uses get_investigations_page RPC)
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

## Completed (Jan 25, 2026)

- [x] Fixed tier assignments - UFO data now correctly in exploratory tier
- [x] Updated landing page with two-tier stats display
- [x] Updated dashboard with Research/Exploratory tier links
- [x] Added explanatory banners to investigations tabs
- [x] Updated ExploratoryDisclaimer component text
- [x] Added data source note to Window Analysis page
- [x] Updated API to query actual tier counts dynamically
- [x] Imported 7,312 experience reports (NDEs, OBEs, ADCs)
- [x] Added human-readable titles to prediction pages
- [x] Added ELI5 sections to prediction detail pages
- [x] Fixed prediction detail page loading (removed auth blocking)
- [x] Fixed dashboard prediction "Open" button navigation
- [x] Fixed "High" domain tag bug (renamed hotspot domain)

## Completed (Jan 21, 2026)

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
