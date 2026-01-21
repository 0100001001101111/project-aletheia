# TODO.md - Project Aletheia

*Last updated: January 21, 2026*

## Completed This Session

- [x] **Window Analysis Dashboard** - Full dashboard at `/analysis/windows`
- [x] **Monte Carlo Co-occurrence Analysis** - Statistical validation of clustering
- [x] **Data Ingestion Pipeline** - API and utilities for bulk imports
- [x] **15 Pre-registered Predictions** - Falsifiable hypotheses from grid data
- [x] **Fixed cooccurrence API** - Response structure now matches frontend expectations
- [x] **Cleaned up misplaced files** - Moved Aletheia code from brothers-command-center

---

## Next Steps

### 1. Evaluate Window Predictions
The 15 active predictions need evaluation against new data as it comes in.

```bash
# Generate evaluation report
curl -X POST http://localhost:3000/api/analysis/window/predictions/evaluate
```

### 2. Add Navigation to Window Analysis
Add link to Window Analysis dashboard in main navigation sidebar.

**Files to modify:**
- `src/components/layout/Sidebar.tsx` or equivalent nav component

### 3. Temporal Analysis Implementation
The TemporalAnalysisTab is mostly placeholder. Need to:
- Connect to actual temporal data
- Add time-series visualization
- Correlate events across domains by date

### 4. Geological Correlates Data
GeologicalAnalysisTab needs real data connections:
- Fault line proximity calculations
- Bedrock type mapping
- Aquifer data integration

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
- [ ] Import historical UFO cases (pre-1990)

---

## Technical Debt

### Type Safety
- [ ] Replace `@ts-nocheck` with proper types
- [ ] Replace `AnyClient` assertions after regenerating Supabase types
- [ ] Run: `npx supabase gen types typescript --project-id YOUR_ID > src/types/supabase.ts`

### Performance
- [ ] Add pagination to investigations API (166k+ records)
- [ ] Implement virtual scrolling for large lists
- [ ] Cache grid cell data (rarely changes)

### Testing
- [ ] Unit tests for Monte Carlo simulation
- [ ] Integration tests for prediction evaluation
- [ ] E2E tests for window analysis dashboard

---

## Feature Backlog

### Interactive Map
- [ ] Add Leaflet/Mapbox integration to WindowMap component
- [ ] Show hotspots with click-to-zoom
- [ ] Layer toggle for different phenomena types

### Prediction Tracking UI
- [ ] Visual timeline of prediction status
- [ ] Notification when evaluation period ends
- [ ] Historical accuracy display

### Export/API
- [ ] Public API for grid data
- [ ] CSV export for researchers
- [ ] GeoJSON export for mapping tools

---

## Notes

- Dev server runs separately (`npm run dev` in another terminal)
- TypeScript check: `npx tsc --noEmit`
- Scripts use tsx: `npx tsx scripts/rebuild-grid.ts`
- Window analysis page: http://localhost:3000/analysis/windows
