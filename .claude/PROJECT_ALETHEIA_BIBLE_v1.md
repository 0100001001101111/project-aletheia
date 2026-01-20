# PROJECT ALETHEIA BIBLE

**Version:** 1.0  
**Created:** January 15, 2026  
**Mission:** Rigorous Infrastructure for Anomaly Research  
**Tagline:** "We don't chase ghosts. We find patterns."

---

# TABLE OF CONTENTS

1. [Core Vision & Philosophy](#1-core-vision--philosophy)
2. [The Hypothesis](#2-the-hypothesis)
3. [Platform Architecture](#3-platform-architecture)
4. [The Five Domains](#4-the-five-domains)
5. [Data Schemas](#5-data-schemas)
6. [Trust Architecture](#6-trust-architecture)
7. [AI Agent System](#7-ai-agent-system)
8. [Quality Scoring (Decision Matrix)](#8-quality-scoring-decision-matrix)
9. [Pre-Registration System](#9-pre-registration-system)
10. [Red-Team & Skeptic System](#10-red-team--skeptic-system)
11. [Conflict Resolution](#11-conflict-resolution)
12. [Community Hypotheses](#12-community-hypotheses)
13. [User Journeys](#13-user-journeys)
14. [Onboarding Flows](#14-onboarding-flows)
15. [Tech Stack](#15-tech-stack)
16. [Database Schema](#16-database-schema)
17. [API Endpoints](#17-api-endpoints)
18. [Deployment & Infrastructure](#18-deployment--infrastructure)
19. [Funding & Sustainability](#19-funding--sustainability)
20. [Roadmap](#20-roadmap)
21. [Connected Projects](#21-connected-projects)

---

# 1. CORE VISION & PHILOSOPHY

## What Aletheia Is

A decentralized infrastructure platform for anomaly research. Think "GitHub for consciousness studies" - standardized data, distributed testing, rigorous peer review.

## What Aletheia Is NOT

- Not a "paranormal" forum or believer community
- Not a debunking site
- Not entertainment or content
- Not a place for speculation without evidence

## Core Principles

1. **Rigor over belief** - Every claim must be testable and falsifiable
2. **Data over narrative** - Structured data enables pattern matching
3. **Skepticism as feature** - Critics earn points for finding flaws
4. **Null results matter** - Failed experiments are as valuable as successes
5. **Transparency always** - Methods, data, and code are public

## The Differentiator

Most anomaly research exists in silos. NDE researchers don't talk to Ganzfeld researchers. Remote viewing data sits in classified archives. Crisis apparition reports rot in Victorian journals.

Aletheia connects these silos. When the same pattern appears across unrelated domains, that's signal. When it doesn't, that's also data.

---

# 2. THE HYPOTHESIS

## Core Thesis

**"Stress Produces Signal - At Every Scale"**

| Scale | System | Stressor | Signal |
|-------|--------|----------|--------|
| Micro | Neuron | Death/trauma | NDE phenomena |
| Meso | Human | Crisis/grief | Apparitions, telepathy |
| Macro | Planet | Tectonic pressure | Earthquake lights, UAP |

## The Pattern

Systems under extreme stress emit detectable signals. This appears in:
- Dying brains producing NDEs
- Grieving humans perceiving distant deaths
- Tectonic plates producing light phenomena

If this pattern is real, it should be:
- Measurable across domains
- Predictable based on stress levels
- Replicable by independent researchers

Aletheia tests this.

---

# 3. PLATFORM ARCHITECTURE

## User Types

| Type | Can Do | Credibility |
|------|--------|-------------|
| **Visitor** | Browse, read | None |
| **User** | Submit, vote, comment | Public profile |
| **Anonymous Verified** | Submit (ZKP credential) | Verified but private |
| **Data Custodian** | Bulk import, schema access | Vetted researcher |
| **Moderator** | Triage, flag review | High methodology points |
| **Admin** | Promote predictions, resolve conflicts | Platform team |

## Core Features

1. **Investigations** - Structured research data across 5 domains
2. **Patterns** - Cross-domain correlations detected by AI
3. **Predictions** - Testable hypotheses generated from patterns
4. **Testing** - Distributed experiments with standardized protocols
5. **Community** - Speculative hypotheses awaiting evidence

## Data Flow

```
Raw Data → Submission → Triage (0-10) → Pattern Matcher → Predictions
                ↓
        Quality < 7? → Feedback + Rigor-Up Guide
                ↓
        Quality ≥ 7? → Verified → Enters Pattern Network
```

---

# 4. THE FIVE DOMAINS

## Domain 1: Near-Death Experience (NDE)

**Focus:** Consciousness during clinical death  
**Key Variables:** Cardiac arrest duration, veridicality, Greyson scale  
**Question:** Does consciousness perceive accurately without brain function?

## Domain 2: Ganzfeld

**Focus:** Information transfer under sensory deprivation  
**Key Variables:** Hit rate, target type, receiver profile  
**Question:** Can isolated subjects identify hidden targets above chance?

## Domain 3: Crisis Apparition

**Focus:** Perceiving distant trauma/death in real-time  
**Key Variables:** Time sync, relationship to agent, physical effects  
**Question:** Do crisis events transmit to connected individuals?

## Domain 4: Remote Viewing (STARGATE)

**Focus:** Describing distant/hidden targets through mental focus  
**Key Variables:** Coordinate accuracy, AOL separation, LST timing  
**Question:** Can viewers accurately describe unknown targets?

## Domain 5: Geophysical Anomaly

**Focus:** Environmental correlates of anomalous phenomena  
**Key Variables:** Seismic activity, piezoelectric geology, EM fields  
**Question:** Do tectonic/EM stressors produce observable phenomena?

## Domain 6: UFO/UAP (Planned)

**Focus:** Correlation layer for sighting data  
**Key Variables:** Location, time (LST), physical effects, geology  
**Question:** Do UAP reports correlate with other domain patterns?

---

# 5. DATA SCHEMAS

## Universal Fields (All Domains)

```json
{
  "id": "uuid",
  "investigation_type": "nde|ganzfeld|crisis|stargate|geophysical",
  "title": "string",
  "created_at": "timestamp",
  "created_by": "user_id",
  "triage_score": 0-10,
  "status": "provisional|verified|rejected",
  "raw_data": {},
  "methodology": "string",
  "null_results_included": boolean
}
```

## NDE Schema

```json
{
  "cardiac_arrest_duration": "seconds",
  "greyson_scale_score": 0-32,
  "veridical_elements": [],
  "verified_by_medical_staff": boolean,
  "time_to_documentation": "hours",
  "physiological_markers": {}
}
```

## Ganzfeld Schema

```json
{
  "hit": boolean,
  "target_type": "static|dynamic",
  "target_id": "string",
  "receiver_id": "anonymized",
  "sender_id": "anonymized",
  "isolation_method": "string",
  "mentation_transcript": "string",
  "receiver_profile": {
    "absorption_score": 0-34,
    "creativity_index": 0-10,
    "openness_score": 0-10
  }
}
```

## Crisis Apparition Schema

```json
{
  "crisis_type": "death|injury|extreme_distress",
  "crisis_timestamp": "ISO datetime",
  "perception_timestamp": "ISO datetime",
  "time_delta_seconds": number,
  "relationship": "family|friend|acquaintance|stranger",
  "perception_type": "visual|auditory|somatic|cognitive",
  "verified_independently": boolean,
  "documentation_delay_hours": number
}
```

## STARGATE Schema

```json
{
  "session_id": "string",
  "coordinate": "8-digit blind",
  "target_description": "string",
  "viewer_response": "string",
  "accuracy_rating": 0-7,
  "local_sidereal_time": "HH:MM",
  "aol_documented": boolean,
  "frontloading": boolean
}
```

## Geophysical Schema

```json
{
  "location": {"lat": number, "lng": number},
  "bedrock_type": "string",
  "piezoelectric_content": 0-1,
  "nearest_fault_km": number,
  "seismic_events_7day": [],
  "em_readings": {},
  "kp_index": 0-9,
  "phenomenon_type": "light|sound|em_interference|other",
  "witness_count": number
}
```

---

# 6. TRUST ARCHITECTURE

## The Problem

Without quality control:
- Garbage data equals good data
- Roommate experiments count same as lab studies
- Platform loses credibility with serious researchers
- Predictions become meaningless

## The Solution

8 interconnected systems that create scientific credibility:

| System | Purpose |
|--------|---------|
| AI Agent | Calculate stats, parse methodology, score quality |
| Decision Matrix | Multiplicative scoring, reject bad data |
| Domain Math | Correct statistics for each research type |
| Rigor-Up Guides | Help normies improve their methods |
| Red-Team Checklist | AI tries to debunk every submission |
| Rebuttal Interface | Community peer review with points |
| Conflict Resolution | Blind jury when people disagree |
| Pre-Registration | Lock methodology before testing |

---

# 7. AI AGENT SYSTEM

## What It Does

When a user submits results:

1. **Calculates statistics (deterministic)**
   - Hit rate: hits / total
   - Expected rate by chance
   - p-value (binomial, Poisson, etc.)
   - Effect size

2. **Parses methodology (LLM)**
   - Extracts setup details from plain English
   - Compares to required protocol
   - Flags deviations

3. **Scores quality (multiplicative)**
   - Isolation: 0-1.0
   - Target selection: 0-1.0
   - Data integrity: 0-1.0
   - Baseline documentation: 0-1.0
   - Total = product × 10

4. **Generates verdict (LLM)**
   - Plain English summary
   - Whether result supports/opposes prediction
   - What it means for overall evidence

## Domain-Specific Math

| Domain | Statistical Method |
|--------|-------------------|
| Ganzfeld | Binomial distribution, Z-score |
| STARGATE | Binomial, LST correlation |
| Geophysical | Poisson, cross-correlation, SEA |
| NDE | Qualitative coding, Greyson scale |
| Crisis | Time-sync probability |

---

# 8. QUALITY SCORING (DECISION MATRIX)

## Multiplicative Scoring

**Critical:** If ANY category = 0.0, Total Score = 0

| Category | 1.0 (High) | 0.5 (Moderate) | 0.1 (Low) | 0.0 (Fail) |
|----------|------------|----------------|-----------|------------|
| **Isolation** | Double-blind, separate buildings | Single-blind, separate rooms | Same room, "roommate" | Direct contact possible |
| **Target Selection** | Machine randomized | 3rd party randomized | Subjective choice | Predictable sequence |
| **Data Integrity** | Raw logs uploaded | Detailed notes parsed | Summary only | Hearsay |
| **Baseline** | Null trials documented | Informal baseline | None recorded | No concept of chance |

## Tiers

| Score | Tier | Impact |
|-------|------|--------|
| 8-10 | **Verified** | Counts toward prediction confirmation |
| 4-7 | **Provisional** | Shows in "Community Findings" only |
| <4 | **Rejected** | Not included, user gets feedback |

## User Feedback

When rejected or provisional:

> "Your result is a great Pilot Study! But because [specific reason], it's in our Exploratory Pool. To make it count toward confirmation: [Link to Rigor-Up Guide]"

---

# 9. PRE-REGISTRATION SYSTEM

## Purpose

Prevent p-hacking and hindsight bias. Researchers must commit to methodology BEFORE seeing results.

## Workflow

1. **Select Prediction** - Which hypothesis are you testing?
2. **Specify Direction** - What outcome do you expect?
3. **Lock Methodology** - Sample size, protocol, analysis plan
4. **Generate Hash** - Immutable timestamp proves commitment
5. **Run Experiment** - Follow your registered plan
6. **Submit Results** - Link to pre-registration

## Requirements for Confirmed Status

To move a prediction from "Testing" to "Confirmed":
- Aggregate N ≥ 500 across Verified submissions
- 80%+ results support prediction
- Pattern observed in 2+ domains
- Pre-registered studies carry 2x weight

---

# 10. RED-TEAM & SKEPTIC SYSTEM

## Philosophy

Skeptics aren't enemies. They're quality control.

## Flaw Flagging

Users can flag specific issues:
- [!] Sensory Leakage
- [!] Statistical Artifact
- [!] Missing Variable
- [!] Data Inconsistency

## Methodology Points (MP)

| Action | MP Change |
|--------|-----------|
| Flag upheld | +10 to +50 |
| Flag rejected (frivolous) | -20 |
| Investigation survives challenge | +10 to investigator |
| Reach MP threshold | Become moderator |

## Red-Team Checklist (What AI Checks)

### Sensory Leakage (Ganzfeld/STARGATE)
- Same Wi-Fi network?
- Acoustic path between rooms?
- Post-trial interaction before judging?

### Pattern Bias (Geophysical)
- Population density controlled?
- Satellite/aircraft ruled out?
- Piezoelectric bedrock confirmed?

### Memory Issues (NDE/Crisis)
- Account recorded within 24 hours?
- Free recall or prompted questions?
- Media contamination checked?

### Statistical Red Flags
- Optional stopping detected?
- Multiple comparisons corrected?
- Only positive results submitted?

---

# 11. CONFLICT RESOLUTION

## When It Triggers

High-credibility Investigator vs High-MP Skeptic disagree on a flag.

## Three Tiers

### Tier 1: Data Request
- AI identifies specific missing data
- If investigator can't provide → flag upheld
- Example: "Provide decibel log from sender's room"

### Tier 2: Blind Jury
- 3 verified researchers (random, different domain)
- See raw data and challenge, not identities
- 2/3 majority is binding

### Tier 3: Nullification
- Fundamentally ambiguous data
- Investigation marked "Inconclusive"
- Removed from prediction aggregate
- Neither party gains/loses reputation

## Anti-Spam

To challenge high-credibility work:
- Must "stake" portion of MP
- Frivolous flag = lose stake
- Upheld flag = earn bonus

---

# 12. COMMUNITY HYPOTHESES

## Purpose

Let curious normies contribute speculative ideas without contaminating rigorous data.

## How It Works

1. **Submit Hypothesis** - "I think X connects to Y"
2. **AI Generates Evidence Needed** - What would make this testable
3. **Community Upvotes** - Interesting ideas rise
4. **Gather Evidence** - Users contribute sources
5. **Promotion** - If evidence sufficient, becomes real Prediction

## Status Tiers

| Status | Meaning |
|--------|---------|
| Speculative | Just an idea, no evidence |
| Gathering Evidence | Some support, needs more |
| Promoted | Graduated to real Prediction |

## The Vibe

**Not:** "Your idea is rejected"  
**Instead:** "Cool idea. Here's what it would take to test it."

---

# 13. USER JOURNEYS

## Journey 1: Curious Normie

1. Lands on site from Reddit/Twitter
2. Browses predictions, sees "Testing" status
3. Clicks into one, reads "How Testing Works"
4. Thinks "I could try this"
5. Runs informal Ganzfeld with roommate
6. Submits results (Simple Mode)
7. Gets score 4/10: "Great pilot study! Here's how to level up"
8. Reads Rigor-Up Guide, tries again with better method
9. Score 8/10: Verified, counts toward prediction

## Journey 2: Academic Researcher

1. Hears about Aletheia at conference
2. Has existing Ganzfeld dataset (500 trials)
3. Applies as Data Custodian
4. Maps data to JSON schema
5. Bulk imports with methodology documentation
6. Score 9/10 across submissions
7. Data triggers new pattern detection
8. Pattern generates prediction
9. Other researchers begin testing

## Journey 3: Professional Skeptic

1. Sees Aletheia mentioned, expects woo-woo
2. Surprised by rigor, explores
3. Finds high-scoring investigation with subtle flaw
4. Flags "Acoustic leakage not documented"
5. Investigator can't provide audio logs
6. Flag upheld, investigation downgraded
7. Skeptic earns MP, appears on leaderboard
8. Continues finding flaws, becomes moderator

## Journey 4: Ancient Aliens Enthusiast

1. Wants to submit Nazca lines theory
2. Sees "Community Hypotheses" section
3. Submits: "Nazca correlates with NDE imagery"
4. AI generates: "To test this, we need: standardized Nazca catalog, coded NDE imagery database, blind comparison methodology"
5. Hypothesis sits at "Speculative"
6. If they actually gather evidence, could be promoted

---

# 14. ONBOARDING FLOWS

## Data Custodian Onboarding

### Email 1: Welcome
- What is Aletheia (not a forum, infrastructure)
- What makes good submissions (baselines, stress variables, null results)
- Set expectations

### Email 2: Schema Guide
- Identify your domain
- JSON mapping examples
- Full documentation link

### Email 3: Parser & Triage
- How to use LLM parser for narrative data
- How triage scoring works
- Credibility points system

### Quick-Start Checklist
- [ ] Identity selection (public vs anonymous)
- [ ] Data audit (baseline + stressor + outcome)
- [ ] Null integrity (failed trials included)
- [ ] De-identification (IRB compliance)
- [ ] Schema mapping
- [ ] Format check (JSON ready or needs parser)
- [ ] Self-triage (could skeptic replicate?)

---

# 15. TECH STACK

## Frontend
- Next.js 14 (App Router)
- React
- Tailwind CSS
- TypeScript

## Backend
- Supabase (PostgreSQL + Auth + Storage)
- Edge Functions
- Row Level Security

## AI
- Claude API (methodology parsing, verdict generation)
- Client-side stats (binomial test, etc.)

## Deployment
- Vercel (frontend)
- Supabase Cloud (database)

## Repositories
- project-aletheia (main platform)
- specter (geophysical correlation research)
- ganzfeld-moderator-analysis
- crisis-apparitions-analysis
- nde-analysis
- stargate_extraction

---

# 16. DATABASE SCHEMA

## Core Tables

```sql
aletheia_users
aletheia_investigations
aletheia_patterns
aletheia_pattern_matches
aletheia_predictions
aletheia_prediction_testers
aletheia_prediction_results
aletheia_preregistrations
aletheia_flaw_flags
aletheia_jury_votes
aletheia_community_hypotheses
aletheia_hypothesis_upvotes
```

## Key Relationships

```
investigations → pattern_matches → patterns → predictions
                                            ↓
                              prediction_testers
                                            ↓
                              prediction_results
                                            ↓
                                    flaw_flags
                                            ↓
                                    jury_votes
```

---

# 17. API ENDPOINTS

## Investigations
- GET /api/investigations
- GET /api/investigations/[id]
- POST /api/investigations
- PATCH /api/investigations/[id]

## Predictions
- GET /api/predictions
- GET /api/predictions/[id]
- GET /api/predictions/[id]/testers
- POST /api/predictions/[id]/testers
- GET /api/predictions/[id]/results
- POST /api/predictions/[id]/results

## Patterns
- GET /api/patterns
- POST /api/patterns/scan (triggers pattern matcher)

## Community
- GET /api/community
- GET /api/community/[id]
- POST /api/community
- POST /api/community/[id]/upvote

## Flags
- GET /api/flags
- POST /api/flags
- POST /api/flags/[id]/resolve

---

# 18. DEPLOYMENT & INFRASTRUCTURE

## Current State
- Vercel: project-aletheia.vercel.app (or custom domain)
- Supabase: Production project with RLS enabled
- Claude API: Anthropic account

## Costs (Estimated Monthly)
- Vercel Pro: $20
- Supabase Pro: $25
- Claude API: $50-200 (usage dependent)
- Domain: $1
- **Total: ~$100-250/month**

## Scaling Considerations
- Supabase can handle 10k+ users on Pro
- Claude API costs scale with submissions
- May need caching layer at 1k+ daily submissions

---

# 19. FUNDING & SUSTAINABILITY

## Grant Targets

| Funder | Amount | Fit |
|--------|--------|-----|
| Bial Foundation | $50-100k | Perfect (parapsychology infrastructure) |
| Templeton Foundation | $100k+ | Strong (consciousness research) |
| Protocol Labs | $50k | Good (DeSci, open science) |
| Gitcoin | $10-50k | Good (public goods) |

## The Pitch (One Paragraph)

"Project Aletheia is open-source infrastructure for anomaly research. We standardize data across five domains, enable distributed replication of testable predictions, and implement quality controls more rigorous than traditional peer review. Our platform has identified cross-domain patterns from 200+ investigations and generated 46 falsifiable predictions currently being tested. We're seeking funding to scale the platform, onboard research institutions, and build the pre-registration and peer-review systems that will make this the definitive repository for consciousness and anomaly science."

## What Funding Buys
- Your time (6-12 months salary)
- Infrastructure costs (1 year runway)
- Pilot studies (prove the model)
- Security/legal review
- Community building

---

# 20. ROADMAP

## v1.0 (Current)
- ✓ 5 domain schemas
- ✓ Investigation submission + triage
- ✓ Pattern matcher
- ✓ Prediction board
- ✓ Testing flow (Simple + Advanced modes)
- ✓ Quality scoring
- ✓ Basic trust architecture

## v1.1 (Next)
- [ ] Pre-registration portal (full UI)
- [ ] Domain-specific statistics (all 5)
- [ ] UFO/UAP as 6th domain
- [ ] Enhanced pattern visualization

## v1.2
- [ ] Full Red-Team system
- [ ] Methodology Points leaderboard
- [ ] Conflict resolution workflow
- [ ] Blind jury system

## v2.0
- [ ] Mobile app
- [ ] Institutional accounts
- [ ] API for external researchers
- [ ] Historical archives domain

---

# 21. CONNECTED PROJECTS

## Research Repositories

| Repo | Purpose | Status |
|------|---------|--------|
| specter | UFO-seismic correlation | Published |
| specter-watch | Real-time monitoring | Active |
| ganzfeld-moderator-analysis | Meta-analysis | Complete |
| crisis-apparitions-analysis | Victorian cases | Complete |
| nde-analysis | NDE patterns | Active |
| stargate_extraction | Declassified data | Complete |

## Interstellar Network (Content)

Aletheia is the research infrastructure. Interstellar Network is the content layer:
- QTKMUAN YouTube channel draws from Aletheia findings
- Substack fiction references real patterns
- Cross-pollination without contamination

## SPECTER Relationship

SPECTER was the proof-of-concept. It demonstrated:
- UFO reports correlate with seismic activity
- Piezoelectric geology is the mechanism
- Rigorous methods work on "fringe" topics

SPECTER findings are now integrated into Aletheia's Geophysical domain.

---

# APPENDIX A: RIGOR-UP PROTOCOLS

## Ganzfeld Protocol

1. **Equipment:** Ping-pong balls, headphones, red light, white noise, 2 devices
2. **Isolation:** 2+ walls between rooms, acoustic blocking, double-blind target selection
3. **Randomization:** TRNG only, dynamic video targets preferred
4. **Documentation:** Exact timestamps, unedited mentation transcript, receiver profile scores
5. **Score Tankers:** Any Sender-Receiver contact before judging = instant 0.0

## STARGATE Protocol

1. **Setup:** Plain paper, black pen, quiet room, no windows
2. **Blinding:** Coordinate-only tasking, zero target knowledge
3. **Documentation:** First ideogram (2 seconds), AOL separation, no interpretation during session
4. **Timing:** Track LST, target 13:30 window for potential boost

## Geophysical Protocol

1. **Equipment:** Magnetometer (app or dedicated), geological maps
2. **Location:** Identify bedrock type, piezoelectric content
3. **Verification:** Triangulate with multiple observers, cross-reference USGS seismic data
4. **Weighting:** Precursor reports (before quake) weighted 8x higher than post-event

---

# APPENDIX B: RED-TEAM QUESTIONS

## Sensory Leakage
- Same Wi-Fi network?
- Audio path between rooms?
- Post-trial contact before judging?
- Roommate/cohabitant bias documented?

## Pattern Bias
- Population density controlled?
- Known satellites/aircraft ruled out?
- Sensor reliability verified?
- Bedrock type confirmed?

## Memory & Social
- Account recorded within 24 hours?
- Free recall or prompted?
- Media trope contamination?
- Leading questions avoided?

## Statistical
- Optional stopping detected?
- Multiple comparisons reported?
- Only positive results submitted?
- Data dredging evident?

---

# APPENDIX C: GLOSSARY

| Term | Definition |
|------|------------|
| **AOL** | Analytical Overlay - conscious interpretation that contaminates raw perception |
| **Brier Score** | Prediction accuracy metric (0=perfect, 1=worst) |
| **Crisis Apparition** | Perceiving someone at moment of their death/trauma |
| **Double-Blind** | Neither subject nor experimenter knows target |
| **Ganzfeld** | Sensory deprivation protocol using uniform visual/audio field |
| **Greyson Scale** | 32-point NDE depth measurement |
| **Hit** | Correct target identification in forced-choice test |
| **LST** | Local Sidereal Time - astronomical time based on star positions |
| **Mentation** | Stream of consciousness verbal report during Ganzfeld |
| **NDE** | Near-Death Experience |
| **Piezoelectric** | Materials that generate EM fields under pressure (quartz, etc.) |
| **Pre-Registration** | Committing to methodology before collecting data |
| **p-value** | Probability result occurred by chance (< 0.05 = significant) |
| **Receiver** | Person attempting to perceive hidden information |
| **Red-Team** | Adversarial review seeking to disprove claims |
| **RLS** | Row Level Security (database access control) |
| **Sender** | Person viewing/thinking about target in telepathy tests |
| **SEA** | Superposed Epoch Analysis (time-series statistical method) |
| **Triage Score** | 0-10 quality rating for submissions |
| **UAP** | Unidentified Anomalous Phenomena (modern term for UFO) |
| **Veridicality** | Accuracy of perception that could be independently verified |
| **ZKP** | Zero-Knowledge Proof (cryptographic anonymous verification) |

---

*Project Aletheia: We don't chase ghosts. We find patterns.*
