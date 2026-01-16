# TODO.md - Project Aletheia

*Last updated: January 16, 2026*

## Completed This Session

- [x] **UFO/UAP Schema** - Added sixth domain with full Zod validation
- [x] **NUFORC Data Import** - 5,815 UFO sightings imported to database
- [x] **SCHEMA_METADATA Defensive Coding** - Bulletproof null checks with `meta?.property || fallback` pattern
- [x] **Dashboard Fix** - Resolved TypeError crash from undefined domain lookups
- [x] **Vercel Deployment** - Deployed with `.git` folder workaround

---

## Immediate Priority

### 1. Regenerate TypeScript Types
The Supabase type cache is stale. New tables use type assertions (`AnyClient`).

```bash
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/types/supabase.ts
```

### 2. Fix Vercel Git Integration
Git pushes don't trigger deployments. Current workaround:
```bash
mv .git .git-backup && vercel --prod --yes; mv .git-backup .git
```

**Proper fix:** Go to Vercel Settings > Git and reconnect the repository.

### 3. Implement Random Jury Selection
Currently jury members are manually assigned. Need algorithm to:
- Select 5 random users from eligible pool
- Exclude parties involved in dispute
- Weight by methodology points

**Files to modify:**
- `src/app/api/disputes/[id]/escalate/route.ts`

### 4. Per-User Upvote Tracking
Community hypotheses allow multiple upvotes per user.

**Solution:** Create `aletheia_hypothesis_votes` table:
```sql
CREATE TABLE aletheia_hypothesis_votes (
  hypothesis_id UUID REFERENCES aletheia_community_hypotheses(id),
  user_id UUID REFERENCES auth.users(id),
  PRIMARY KEY (hypothesis_id, user_id)
);
```

---

## Data Import Pipeline

### Completed
- [x] UFO/UAP - 5,815 NUFORC sightings

### Pending
- [ ] Import STARGATE sessions from ~/Desktop/stargate_extraction/
- [ ] Import Ganzfeld meta-analysis data
- [ ] Import crisis apparition Victorian cases
- [ ] Import NDE AWARE study data
- [ ] Import SPECTER geophysical correlations

---

## Feature Backlog

### Simple Mode for Result Submission
- [ ] Create `SimpleModeStepper.tsx` component
- [ ] Add trials/hits input with auto-statistics
- [ ] Client-side binomial test calculation
- [ ] Domain-specific baseline defaults

### Quality Assessment UI
- [ ] Create `QualityAssessment.tsx` component
- [ ] Four slider inputs (Isolation, Target Selection, Data Integrity, Baseline)
- [ ] Real-time multiplicative score preview

### Community Hypothesis Promotion
- [ ] Add admin UI to promote hypothesis to prediction
- [ ] Auto-link evidence_needed to new prediction
- [ ] Notification to hypothesis author

### Cross-Domain Pattern Scanner
- [ ] Run pattern matcher on UFO data vs geophysical
- [ ] Correlate UFO sightings with seismic activity
- [ ] Generate predictions from new patterns

---

## Technical Debt

### Type Safety
- Replace `AnyClient` assertions with proper types after regenerating
- Add strict null checks to API routes
- Create shared type definitions for API responses

### Testing
- [ ] Add unit tests for `src/lib/statistics.ts`
- [ ] Add integration tests for dispute resolution flow
- [ ] Add E2E tests for prediction testing workflow

### Performance
- [ ] Add pagination to investigation list API (needed now with 6k+ records)
- [ ] Implement virtual scrolling for large lists
- [ ] Add caching headers to static pages

---

## Documentation

### Completed
- [x] `docs/onboarding/email-1-welcome.md`
- [x] `docs/onboarding/email-2-schema-guide.md`
- [x] `docs/onboarding/email-3-parser-triage.md`
- [x] `docs/onboarding/quick-start-checklist.md`
- [x] `docs/onboarding/rigor-up-ganzfeld.md`

### Needed
- [ ] API documentation (OpenAPI spec)
- [ ] Contributing guide
- [ ] UFO schema field documentation

---

## Database Migrations Applied

| Date | Migration | Description |
|------|-----------|-------------|
| 2026-01-15 | create_aletheia_schema | Core tables |
| 2026-01-15 | seed_aletheia_data | Initial seed data |
| 2026-01-16 | add_prediction_testing_tables | Results + testers |
| 2026-01-16 | add_dispute_resolution_tables | Disputes + jury |
| 2026-01-16 | add_ufo_schema | UFO investigation type |

---

## Notes

- Dev server runs separately (don't run from Claude Code)
- TypeScript check: `npx tsc --noEmit`
- All new tables have RLS enabled
- Dispute resolution uses three-tier system: Data Request -> Blind Jury -> Nullification
- **Vercel deploy workaround**: Move `.git` folder before `vercel --prod`
