# Aletheia Schema Guide - Data Formatting Requirements

**Subject: How to Format Your Data for Aletheia**

---

## The Five Domains

Aletheia supports five research domains, each with a specialized schema:

| Domain | Focus | Key Metrics |
|--------|-------|-------------|
| **NDE** | Near-death experiences | Biological triggers, veridical elements, timeline |
| **Ganzfeld** | Sensory isolation telepathy | Hit rate, sender/receiver data, isolation quality |
| **Crisis Apparition** | Spontaneous apparitions | Temporal proximity, percipient relationship, corroboration |
| **STARGATE** | Remote viewing | Target type, judge ratings, AOL contamination |
| **Geophysical** | Tectonic/EM correlations | Location, seismic data, temporal clustering |

---

## Schema Field Reference

### NDE Schema
```typescript
{
  case_id: string;              // Your internal identifier
  date_of_event: string;        // ISO 8601 date
  biological_trigger: string;   // cardiac_arrest, trauma, drowning, etc.
  veridical_elements: string[]; // What they reported seeing/knowing
  timeline: {
    duration_estimate: number;  // Minutes (subjective)
    clinical_death_duration: number; // Minutes (objective)
  };
  corroboration: {
    medical_records: boolean;
    witness_statements: number;
  };
  source_url?: string;          // Link to original report
}
```

### Ganzfeld Schema
```typescript
{
  session_id: string;
  date: string;
  sender: {
    id: string;
    relationship_to_receiver: string;
  };
  receiver: {
    id: string;
    experience_level: 'novice' | 'experienced' | 'expert';
  };
  target: {
    pool_size: number;          // Typically 4
    type: 'static' | 'dynamic' | 'video';
  };
  result: {
    hit: boolean;
    rank: number;               // 1-4 (1 = direct hit)
    confidence: number;         // Receiver's confidence 0-100
  };
  isolation: {
    separate_rooms: boolean;
    no_phones: boolean;
    faraday_cage: boolean;
  };
}
```

### Crisis Apparition Schema
```typescript
{
  case_id: string;
  apparition_date: string;
  crisis_date: string;          // When the crisis occurred
  temporal_gap_hours: number;   // Time between crisis and apparition
  percipient: {
    relationship: string;       // spouse, sibling, friend, stranger
    prior_knowledge: boolean;   // Knew of crisis beforehand?
  };
  apparition_type: 'visual' | 'auditory' | 'tactile' | 'sense_of_presence';
  crisis_type: 'death' | 'injury' | 'illness' | 'danger';
  corroboration: {
    witnesses: number;
    documented_timeline: boolean;
  };
}
```

### STARGATE Schema
```typescript
{
  session_id: string;
  date: string;
  viewer_id: string;
  target: {
    type: 'geographic' | 'object' | 'event' | 'person';
    coordinates?: string;       // If geographic
    description: string;
  };
  rating: {
    judge_score: number;        // 0-7 scale
    summary_score: number;      // Overall quality
  };
  aol_contamination: boolean;   // Analytical overlay present?
  edit_filter: string;          // Viewer's post-session notes
}
```

### Geophysical Schema
```typescript
{
  event_id: string;
  date: string;
  location: {
    latitude: number;
    longitude: number;
    region: string;
  };
  phenomena: {
    type: 'ufo_sighting' | 'earthquake_light' | 'ball_lightning' | 'animal_behavior';
    description: string;
  };
  correlations: {
    seismic_activity?: {
      magnitude: number;
      distance_km: number;
      time_delta_hours: number;
    };
    em_anomalies?: boolean;
    solar_activity?: {
      kp_index: number;
    };
  };
}
```

---

## Data Quality Requirements

### Required Fields
Every submission MUST include:
- Unique identifier (case_id, session_id, etc.)
- Date of event
- Primary data (hit/miss, rating, or description)

### Highly Recommended
- Source URL or citation
- Methodology documentation
- Witness/corroboration count

### Triage Scoring Impact
| Field Present | Points |
|---------------|--------|
| Source traceable | +2 |
| First-hand account | +2 |
| Methodology documented | +2 |
| Receiver/percipient profile | +2 |
| Raw data included | +2 |

**Target: 7+ points for "Verified" status**

---

## Submission Methods

1. **Web Interface** - Manual entry at /submit
2. **Bulk Upload** - JSON/CSV at /submit/bulk
3. **API** - POST to /api/investigations (requires API key)
4. **LLM Parser** - Paste unstructured text, AI extracts fields

---

## Common Mistakes

1. **Missing dates** - Always include ISO 8601 dates
2. **Ambiguous identifiers** - Use unique IDs, not just names
3. **Missing source links** - Always link to original when available
4. **Inconsistent units** - Use metric (km, hours, meters)

---

*Questions? See the Quick-Start Checklist or contact support@aletheia.io*
