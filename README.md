# Project Aletheia Database Schema

Cross-domain anomalous phenomena research platform. This schema supports collecting, triaging, and analyzing data across five distinct research domains to identify cross-domain patterns and generate testable predictions.

## Schema Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           PROJECT ALETHEIA SCHEMA                            │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────┐       ┌───────────────────┐       ┌─────────────────┐
│    USERS     │──────▶│  INVESTIGATIONS   │◀──────│ TRIAGE_REVIEWS  │
│              │       │                   │       │                 │
│ identity     │       │ investigation_type│       │ source_integrity│
│ verification │       │ raw_data (JSONB)  │       │ methodology     │
│ credibility  │       │ triage_status     │       │ variable_capture│
└──────────────┘       └───────────────────┘       └─────────────────┘
       │                        │
       │                        │
       ▼                        ▼
┌──────────────┐       ┌───────────────────┐       ┌─────────────────┐
│ CONTRIBUTIONS│       │  PATTERN_MATCHES  │──────▶│  PREDICTIONS    │
│              │       │                   │       │                 │
│ contribution │       │ prevalence_score  │       │ hypothesis      │
│   _type      │       │ reliability_score │       │ confidence      │
│ credibility  │       │ volatility_score  │       │ p_value         │
│   _points    │       │ confidence_score  │       │ brier_score     │
└──────────────┘       └───────────────────┘       └─────────────────┘
```

## Tables

### `aletheia_users`
User accounts supporting both verified researchers and anonymous contributors.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `email` | TEXT | Nullable - anonymous users may not have email |
| `display_name` | TEXT | Public display name |
| `identity_type` | ENUM | `public`, `anonymous_verified`, `anonymous_unverified` |
| `verification_level` | ENUM | `none`, `phd`, `researcher`, `lab_tech`, `independent` |
| `credibility_score` | FLOAT | Calculated from contribution history |
| `created_at` | TIMESTAMPTZ | Account creation time |
| `updated_at` | TIMESTAMPTZ | Last profile update |

### `aletheia_investigations`
Core data submissions from any of the five research domains.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | FK to users |
| `investigation_type` | ENUM | Domain: `nde`, `ganzfeld`, `crisis_apparition`, `stargate`, `geophysical` |
| `title` | TEXT | Short descriptive title |
| `description` | TEXT | Detailed description |
| `raw_data` | JSONB | Schema-validated structured data (domain-specific) |
| `raw_narrative` | TEXT | Original unstructured narrative (if applicable) |
| `triage_score` | INTEGER | 0-10 quality score |
| `triage_status` | ENUM | `pending`, `provisional`, `verified`, `rejected` |
| `triage_notes` | TEXT | Reviewer notes |

### `aletheia_predictions`
Testable hypotheses generated from cross-domain pattern analysis.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `hypothesis` | TEXT | The testable prediction statement |
| `confidence_score` | FLOAT | 0-1 confidence level |
| `status` | ENUM | `open`, `testing`, `confirmed`, `refuted`, `pending` |
| `source_investigations` | UUID[] | Array of investigation IDs that support this |
| `domains_involved` | ENUM[] | Array of investigation types involved |
| `p_value` | FLOAT | Statistical significance (if tested) |
| `brier_score` | FLOAT | Prediction accuracy metric |

### `aletheia_pattern_matches`
Cross-domain correlations discovered by pattern analysis.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `pattern_description` | TEXT | Human-readable pattern description |
| `investigations_matched` | UUID[] | Array of matching investigation IDs |
| `domains_matched` | ENUM[] | Domains where pattern appears |
| `prevalence_score` | FLOAT | % of domains containing pattern |
| `reliability_score` | FLOAT | P-value consistency across domains |
| `volatility_score` | FLOAT | Stability when new data added |
| `confidence_score` | FLOAT | Combined C_s score |
| `generated_prediction_id` | UUID | FK to prediction (if pattern generated one) |

### `aletheia_contributions`
Tracks user participation for credibility scoring.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | FK to users |
| `investigation_id` | UUID | FK to investigations |
| `contribution_type` | ENUM | `submission`, `validation`, `refutation`, `replication` |
| `credibility_points_earned` | FLOAT | Points earned for this contribution |
| `notes` | TEXT | Contribution notes |

### `aletheia_triage_reviews`
Quality assessment scores for investigations.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `investigation_id` | UUID | FK to investigations |
| `reviewer_id` | UUID | FK to users (nullable for system reviews) |
| `source_integrity_score` | INTEGER | 0-3 source quality |
| `methodology_score` | INTEGER | 0-3 methodology quality |
| `variable_capture_score` | INTEGER | 0-2 variable capture quality |
| `overall_score` | INTEGER | 0-10 weighted overall |
| `notes` | TEXT | Reviewer comments |

## Investigation Types (Domains)

| Type | Description |
|------|-------------|
| `nde` | Near-Death Experiences - cardiac arrest survivors, OBEs, veridical perceptions |
| `ganzfeld` | Ganzfeld/Psi Experiments - controlled telepathy experiments |
| `crisis_apparition` | Crisis Apparitions - spontaneous apparitions at time of death/crisis |
| `stargate` | Remote Viewing - Stargate-style coordinate remote viewing |
| `geophysical` | Geophysical Anomalies - EM fields, temperature anomalies, instrumented observations |

## Raw Data Schemas

Each `investigation_type` has a corresponding structured schema for the `raw_data` JSONB field. See `src/types/database.ts` for TypeScript interfaces:

- `NDERawData` - cardiac_arrest, veridical_perception, obe_reported, etc.
- `GanzfeldRawData` - sender_id, receiver_id, target_type, hit, etc.
- `CrisisApparitionRawData` - apparition_date, subject_status, distance_miles, etc.
- `StargateRawData` - target_coordinates, correspondence_score, blind_protocol, etc.
- `GeophysicalRawData` - location_lat/lng, anomaly_type, deviation_sigma, etc.

## Row Level Security

| Table | Read | Write |
|-------|------|-------|
| `users` | Own profile + admins | Own profile only |
| `investigations` | Verified investigations (public) + own (private) | Own only, admins all |
| `predictions` | Public read | Admin only |
| `pattern_matches` | Public read | Admin only |
| `contributions` | Own + admins | Own only |
| `triage_reviews` | Reviews on own investigations | Verified researchers + admins |

Admin = user with `verification_level = 'phd'`

## Key Relationships

1. **User → Investigations**: One user can submit many investigations
2. **Investigation → Contributions**: One investigation can have multiple contributions (original + validations)
3. **Investigation → Triage Reviews**: Multiple reviewers can score one investigation
4. **Pattern Match → Prediction**: A pattern match can generate a prediction
5. **Prediction → Investigations**: A prediction tracks which investigations support it (via array)

## Indexes

- `investigations`: user_id, investigation_type, triage_status, created_at
- `predictions`: status, confidence_score, created_at
- `pattern_matches`: confidence_score, created_at
- `contributions`: user_id, investigation_id
- `triage_reviews`: investigation_id
- GIN indexes on array columns for efficient `@>` containment queries

## Helper Functions

### `aletheia_calculate_triage_score(source, methodology, variable)`
Calculates weighted overall triage score from component scores.

### `aletheia_get_domain_prevalence(investigation_ids[])`
Returns domain distribution for a set of investigations.

## Setup

1. Run the migration:
```bash
supabase db push
# or apply directly
psql -f supabase/migrations/20260115000000_create_aletheia_schema.sql
```

2. Configure environment:
```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=your_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key
```

3. Import types:
```typescript
import { supabase, TABLES } from './src/lib/supabase';
import type { Investigation, Prediction } from './src/types/database';
```

## Seed Data

Run the seed migration to populate:
- Reference data for the 5 investigation types
- Initial 23 predictions
- Summary records for 8 proof-of-concept projects

---

## Authentication System

Project Aletheia uses Supabase Auth with three identity types:

### Identity Types

| Type | Description | Capabilities |
|------|-------------|--------------|
| `public` | Email/password signup | Full attribution, unlimited submissions after email verification |
| `anonymous_verified` | Anonymous with claimed credentials | Submit as provisional, build credibility, optional ZKP verification |
| `anonymous_unverified` | Fully anonymous | Read-only + limited provisional submissions (2/hour) |

### User Flows

**Public Signup:**
1. Enter email, password, display name
2. Select verification level (PhD, researcher, etc.)
3. Receive verification email
4. After verification, can submit investigations

**Anonymous Signup:**
1. Click "Continue Anonymously"
2. System generates `ANON-XXXXXX` ID
3. Optionally claim credentials
4. Save the anonymous ID to login later

### File Structure

```
src/
├── contexts/
│   └── AuthContext.tsx          # Global auth state provider
├── lib/
│   ├── auth.ts                  # Auth utilities and permission checks
│   ├── supabase-browser.ts      # Client-side Supabase client
│   ├── supabase-server.ts       # Server-side Supabase client
│   └── supabase-middleware.ts   # Middleware session handling
├── components/auth/
│   ├── LoginForm.tsx            # Email + anonymous ID login
│   ├── SignupForm.tsx           # Public account creation
│   ├── AnonymousSignup.tsx      # Anonymous account creation
│   ├── AuthModal.tsx            # Modal wrapper for auth forms
│   └── UserMenu.tsx             # User dropdown with stats
├── app/
│   ├── api/auth/
│   │   ├── callback/route.ts    # OAuth/email verification callback
│   │   └── verify-credentials/  # ZKP verification endpoint (placeholder)
│   ├── auth-test/page.tsx       # Auth testing page
│   └── auth-required/page.tsx   # Protected route redirect
└── middleware.ts                # Route protection
```

### Protected Routes

| Route Pattern | Requirement |
|---------------|-------------|
| `/submit`, `/profile`, `/settings` | Authenticated |
| `/review` | Authenticated + PhD or Researcher |
| `/admin` | Authenticated + PhD |

### Usage

```tsx
// In a client component
import { useAuth } from '@/contexts/AuthContext';

function MyComponent() {
  const { user, isAuthenticated, login, logout } = useAuth();

  if (!isAuthenticated) {
    return <button onClick={() => login(email, password)}>Sign In</button>;
  }

  return <div>Welcome, {user.display_name}</div>;
}
```

```tsx
// Permission checks
import { canSubmitData, canReviewSubmissions, isAdmin } from '@/lib/auth';

if (canSubmitData(user)) {
  // Allow submission
}

if (canReviewSubmissions(user)) {
  // Show review interface
}
```

### Test Page

Visit `/auth-test` to:
- View current authentication state
- Test all auth flows (login, signup, anonymous)
- See permission levels
- Claim verification (test mode)

### Security Features

- Rate limiting on auth endpoints (5 verification attempts/hour)
- Email verification required for public users before submitting
- Anonymous submissions marked as provisional
- Session refresh via middleware
- RLS policies enforce row-level security
