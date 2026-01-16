# TODO.md - Project Aletheia

*Last updated: January 16, 2026*

## Immediate Priority

### 1. Regenerate TypeScript Types
The Supabase type cache is stale. New tables use type assertions (`AnyClient`).

```bash
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/types/supabase.ts
```

### 2. Implement Random Jury Selection
Currently jury members are manually assigned. Need algorithm to:
- Select 5 random users from eligible pool
- Exclude parties involved in dispute
- Weight by methodology points

**Files to modify:**
- `src/app/api/disputes/[id]/escalate/route.ts` (add jury selection when escalating to Tier 2)

### 3. Per-User Upvote Tracking
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
- [ ] Tooltips explaining each factor

### Community Hypothesis Promotion
- [ ] Add admin UI to promote hypothesis to prediction
- [ ] Auto-link evidence_needed to new prediction
- [ ] Notification to hypothesis author

### Data Import Pipeline
- [ ] Import STARGATE sessions from ~/Desktop/stargate_extraction/
- [ ] Import Ganzfeld meta-analysis data
- [ ] Import crisis apparition Victorian cases
- [ ] Import SPECTER geophysical correlations

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
- [ ] Add pagination to investigation list API
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
- [ ] Architecture overview diagram

---

## Database Migrations Applied

| Date | Migration | Description |
|------|-----------|-------------|
| 2026-01-15 | create_aletheia_schema | Core tables |
| 2026-01-15 | seed_aletheia_data | Initial seed data |
| 2026-01-16 | add_prediction_testing_tables | Results + testers |
| 2026-01-16 | add_dispute_resolution_tables | Disputes + jury |

---

## Notes

- Dev server runs separately (don't run from Claude Code)
- TypeScript check: `npx tsc --noEmit`
- All new tables have RLS enabled
- Dispute resolution uses three-tier system: Data Request -> Blind Jury -> Nullification
