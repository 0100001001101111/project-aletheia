# Launch Cleanup Report

## Date: January 30, 2026

---

## 1. Multi-Swarm UI Hidden

### Landing Page (`/src/app/page.tsx`)
- **Removed**: Swarms section with 4 swarm cards (HELIOS, METHUSELAH, FLORA, ANOMALY)
- **Removed**: "Swarms" link from navigation
- **Changed**: Hero CTA from "Explore Swarms" → "Explore Research" (links to /investigations)
- **Changed**: Hero CTA from "Submit Research" → "Submit Data"

### Swarms Page (`/src/app/swarms/page.tsx`)
- **Hidden**: "In Development" section (HELIOS, METHUSELAH, FLORA)
- **Visible**: Only ANOMALY swarm shown
- **Added**: "More research domains coming soon" footer note
- **Updated**: Stats to only count active swarms

### Database
- Swarm data preserved in database (HELIOS, METHUSELAH, FLORA marked as 'development')
- API routes preserved but UI only shows active swarms

---

## 2. Errors Fixed

### /patterns - TypeError (FIXED)
- **File**: `src/lib/prediction-display.ts:319-321`
- **Error**: `Cannot read properties of null (reading 'toLowerCase')`
- **Fix**: Added null checks for `description` and `variable` parameters
```typescript
const d = (description || '').toLowerCase();
const v = (variable || '').toLowerCase();
```

### /chat - "Failed to load sessions" (EXPECTED)
- **Cause**: API requires authentication
- **Status**: Expected behavior - users must log in to use chat
- **Action**: No fix needed - feature requires auth

---

## 3. Coming Soon Placeholders

### /about (`src/app/about/page.tsx`) - NEW
- Simple placeholder page
- Message: "We're building the infrastructure for rigorous anomaly research. Full documentation coming soon."
- Back to Home button

### /methodology (`src/app/methodology/page.tsx`) - NEW
- Simple placeholder page
- Message: "Our research methodology documentation is being prepared. It will cover data quality scoring, statistical validation, and cross-domain pattern detection."
- Back to Home button

### /swarms
- Added footer: "More research domains coming soon"

---

## 4. Route Status

| Route | Status | Notes |
|-------|--------|-------|
| `/` | ✅ Working | Landing page updated |
| `/investigations` | ✅ Working | |
| `/investigations/[id]` | ✅ Working | |
| `/predictions` | ✅ Working | |
| `/predictions/[id]` | ✅ Working | |
| `/patterns` | ✅ Fixed | Null check added |
| `/statistics` | ✅ Working | |
| `/statistics/[domain]` | ✅ Working | |
| `/submit` | ✅ Working | |
| `/swarms` | ✅ Working | ANOMALY only |
| `/swarms/[id]` | ✅ Working | |
| `/agent` | ✅ Working | |
| `/agent/*` | ✅ Working | All agent routes |
| `/dashboard` | ✅ Working | |
| `/community` | ✅ Working | |
| `/analysis/windows` | ✅ Working | |
| `/chat` | ⚠️ Auth Required | Shows error when not logged in |
| `/about` | ✅ Created | Coming Soon placeholder |
| `/methodology` | ✅ Created | Coming Soon placeholder |

---

## 5. Navigation Links

### Landing Page Nav
- Predictions ✅
- Investigations ✅
- Agent ✅
- Submit Data ✅

### Internal Nav (Dashboard, etc.)
- Dashboard ✅
- Predictions ✅
- Patterns ✅
- Investigations ✅
- Window Analysis ✅
- Community ✅
- Agent ✅
- Submit Data ✅

### Footer Links
- Dashboard ✅
- Predictions ✅
- Patterns ✅
- Investigations ✅
- Submit Data ✅
- About ✅ (placeholder)
- Methodology ✅ (placeholder)

---

## 6. Remaining Items (Manual Attention)

### Low Priority
1. **Chat Authentication UX**: Consider adding a "Please sign in" message instead of error banner
2. **Console Warnings**: React setState warning on InvestigationPage (doesn't affect functionality)

### Future Work
1. Complete /about page content
2. Complete /methodology page content
3. Enable additional swarms when ready (HELIOS, METHUSELAH, FLORA)

---

## 7. Quick Wins (Jan 30)

### Stats Display Improvements
- **Predictions**: Changed from "0/10 Confirmed/Total" → "10 Active hypotheses"
- **Domains**: Changed from "5 + 3 Research + Exploratory" → "6 Interconnected fields"
- **Hero text**: Changed from "Four research domains" → "Six research domains"

### Empty Section Hidden
- **"Predictions Under Investigation"**: Section now only appears when there are predictions with `status='testing'`
- Previously showed "No predictions currently being tested" - now completely hidden when empty

---

## 8. Files Modified

| File | Change |
|------|--------|
| `src/app/page.tsx` | Removed swarms section, updated nav/CTAs, fixed stats display, hide empty predictions section |
| `src/app/swarms/page.tsx` | Uses central registry, shows only active swarms |
| `src/lib/prediction-display.ts` | Added null checks for pattern display |
| `src/app/about/page.tsx` | **NEW** - Coming soon placeholder |
| `src/app/methodology/page.tsx` | **NEW** - Coming soon placeholder |
| `src/config/swarms.ts` | **NEW** - Central swarm registry (15 swarms, 1 active) |
| `src/app/api/swarms/route.ts` | Uses registry instead of database |
| `src/app/api/swarms/[swarmId]/route.ts` | Uses registry instead of database |
| `src/components/swarms/SwarmCard.tsx` | Added 'planned' status type |

---

## Summary

Site is ready for ANOMALY-only launch:
- Multi-swarm UI hidden but code preserved
- All navigation links working
- No 404 errors on linked pages
- Placeholder pages for incomplete sections
- Stats display cleaned up (no "0" shown, domains = "6")
- Empty "Predictions Under Investigation" section hidden
- Central swarm registry with 15 swarms (1 active, 14 planned)
- TypeScript compiles without errors
