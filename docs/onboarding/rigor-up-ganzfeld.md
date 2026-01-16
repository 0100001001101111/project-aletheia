# Rigor-Up: Ganzfeld Protocol Enhancement Guide

**A step-by-step guide to maximizing your Ganzfeld study's triage score and scientific rigor.**

---

## Why This Guide Exists

Ganzfeld studies have historically suffered from methodological criticisms:
- Sensory leakage between sender/receiver
- Selection bias in target ranking
- Statistical errors in hit rate calculation
- Lack of pre-registration

This guide shows you how to address each concern and achieve **Verified (7+)** status on Aletheia.

---

## The Multiplicative Quality Score

Aletheia uses a multiplicative formula:

```
Quality Score = Isolation x Target Selection x Data Integrity x Baseline x 10
```

**If ANY factor = 0, your score = 0.**

| Factor | 1.0 (Best) | 0.5 (Acceptable) | 0.0 (Fatal) |
|--------|------------|------------------|-------------|
| Isolation | Faraday cage, no phones | Separate rooms, phones off | Same room as sender |
| Target Selection | True random, timestamped | Pseudo-random generator | Manual selection |
| Data Integrity | Video + auto-logging | Manual log with witness | Self-reported only |
| Baseline | Pre-registered 25% | Historical baseline stated | No baseline mentioned |

---

## Step-by-Step Protocol Enhancement

### 1. Isolation (Critical)

**Goal: Eliminate sensory leakage**

#### Minimum Standard (0.5)
- [ ] Sender and receiver in separate rooms
- [ ] No line-of-sight between rooms
- [ ] All phones powered off (not just silenced)
- [ ] No shared ventilation that could carry sound

#### Gold Standard (1.0)
- [ ] Receiver in acoustically isolated chamber
- [ ] Faraday cage or EM shielding
- [ ] White noise masking
- [ ] Video monitoring (no audio) to confirm isolation

#### Red Flags (0.0)
- Sender and receiver in same room
- Open doors between rooms
- Active phones present
- Verbal communication possible

---

### 2. Target Selection (Critical)

**Goal: Ensure true randomness**

#### Minimum Standard (0.5)
- [ ] Computer-generated random selection
- [ ] Selection happens after receiver is isolated
- [ ] Target pool has exactly 4 equally probable options

#### Gold Standard (1.0)
- [ ] Hardware random number generator (HRNG)
- [ ] Timestamped selection log
- [ ] Selection algorithm publicly documented
- [ ] No human involvement in target choice

#### Red Flags (0.0)
- Manual target selection by experimenter
- Selection before isolation
- Unequal target probabilities
- Selection algorithm not documented

---

### 3. Data Integrity (Critical)

**Goal: Create verifiable, tamper-evident records**

#### Minimum Standard (0.5)
- [ ] Written log of each trial
- [ ] Independent witness signs log
- [ ] Session recording (audio/video)
- [ ] No post-hoc editing of rankings

#### Gold Standard (1.0)
- [ ] Automated logging system
- [ ] Video of receiver during session
- [ ] Blockchain/hash timestamping of records
- [ ] Raw data publicly available

#### Red Flags (0.0)
- Self-reported results only
- No contemporaneous records
- Results reported long after session
- Selective reporting of trials

---

### 4. Baseline Establishment (Important)

**Goal: Define what "chance" means**

#### Minimum Standard (0.5)
- [ ] State expected hit rate (typically 25% for 4-choice)
- [ ] Reference historical baselines
- [ ] Report total trials, not just hits

#### Gold Standard (1.0)
- [ ] Pre-registered hypothesis with specific hit rate prediction
- [ ] Control sessions (no sender) to establish local baseline
- [ ] Monte Carlo simulation of expected distribution

#### Red Flags (0.0)
- No baseline mentioned
- Only successful trials reported
- Unclear what "hit" means

---

## Sample Session Protocol

```
PRE-SESSION (30 min before)
1. Pre-register methodology at aletheia.io/preregister
2. Record hash ID: ________________
3. Power off all phones
4. Verify isolation of rooms

SESSION START
5. Receiver enters isolation chamber
6. Confirm isolation via video monitor
7. Start white noise
8. Computer selects random target (log timestamp)
9. Sender views target
10. Receiver enters relaxation state (15-30 min)
11. Receiver reports impressions
12. Experimenter records impressions (no interpretation)

TARGET REVEAL
13. Receiver views all 4 targets
14. Receiver ranks targets 1-4 (1 = best match)
15. Record all rankings before revealing correct answer
16. Reveal correct target
17. Record hit (rank=1) or miss (rank>1)

POST-SESSION
18. Both parties sign session log
19. Upload to Aletheia within 24 hours
20. Include pre-registration hash ID
```

---

## Data Submission Checklist

For each Ganzfeld session, submit:

- [ ] Session ID (unique)
- [ ] Date and time
- [ ] Sender ID (can be anonymized)
- [ ] Receiver ID (can be anonymized)
- [ ] Receiver experience level
- [ ] Target type (static/dynamic/video)
- [ ] Target pool size (should be 4)
- [ ] Hit (true/false)
- [ ] Rank (1-4)
- [ ] Receiver confidence (0-100)
- [ ] Isolation method
- [ ] Randomization method
- [ ] Pre-registration hash (if applicable)

---

## Expected Triage Scores

| Configuration | Expected Score |
|---------------|----------------|
| Gold standard (all 1.0 factors) | 10.0 |
| Minimum standard (all 0.5 factors) | 0.625 |
| One fatal flaw (one 0.0 factor) | 0.0 |

### Score Boosters
| Action | Boost |
|--------|-------|
| Pre-registered | +2 |
| Video documented | +1 |
| Independent replication | +2 |

---

## Common Mistakes

### 1. "We used a random number app"
**Problem:** Most apps use pseudo-random generators
**Fix:** Use hardware RNG or document the algorithm

### 2. "The sender was in the next room"
**Problem:** Sound can travel through walls
**Fix:** Add sound masking, verify with audio test

### 3. "We recorded 50 sessions but only submitted the significant ones"
**Problem:** Selection bias invalidates statistics
**Fix:** Submit ALL sessions, positive and negative

### 4. "The receiver saw the targets before ranking"
**Problem:** This isn't blind ranking
**Fix:** Rank BEFORE revealing correct target

---

## Resources

- **Pre-registration portal:** aletheia.io/preregister
- **Ganzfeld schema:** aletheia.io/submit -> Ganzfeld -> View Schema
- **Statistical calculator:** aletheia.io/tools/binomial

---

## Questions?

Contact support@aletheia.io or visit the Ganzfeld channel on Discord.

---

*This guide is based on the Ganzfeld autoganzfeld protocol recommendations and Aletheia's multiplicative quality scoring system.*

*Last updated: January 2026*
