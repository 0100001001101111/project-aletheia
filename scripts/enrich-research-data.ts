/**
 * Research Tier Data Enrichment Script
 *
 * Enriches sparse research tier records with comprehensive, realistic data
 * using Claude API and validates against Zod schemas.
 *
 * Usage:
 *   npx tsx scripts/enrich-research-data.ts --domain stargate --batch-size 10
 *   npx tsx scripts/enrich-research-data.ts --domain all --dry-run
 */

import * as fs from 'fs';
import * as path from 'path';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

// Load .env.local if present
const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2];
    }
  }
}

// Import schemas
import { StargateSchema } from '../src/schemas/stargate';
import { GanzfeldSchema } from '../src/schemas/ganzfeld';
import { GeophysicalSchema } from '../src/schemas/geophysical';
import { NDESchema } from '../src/schemas/nde';

// Types
type Domain = 'stargate' | 'ganzfeld' | 'geophysical' | 'nde';

interface EnrichmentResult {
  id: string;
  success: boolean;
  error?: string;
}

// Initialize clients
const anthropic = new Anthropic();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://diwkdydpjakvwmzyijrk.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// Domain configurations
const DOMAIN_CONFIG: Record<Domain, {
  schema: z.ZodObject<z.ZodRawShape>;
  systemPrompt: string;
  exampleData: string;
}> = {
  stargate: {
    schema: StargateSchema,
    systemPrompt: `You are a research data generator for the STARGATE remote viewing program archives.
Generate realistic, internally consistent data for declassified remote viewing sessions.

STRICT ENUM VALUES (use EXACTLY these values):
- operational_vs_research: "operational" | "research" | "training"
- target.type: "geographical_location" | "event" | "object" | "person" | "document" | "other"
- protocol.type: "crv" | "erv" | "srv" | "arv" | "grv" | "other"
- protocol.blind_level: "single" | "double" | "triple"
- viewer.training_background: "military" | "civilian_trained" | "natural" | "self_taught"
- evaluation.scoring_method: "binary" | "rating_scale" | "ranking" | "sum_of_ranks" | "fuzzy_set"
- evaluation.hit_miss: "hit" | "miss" | "partial"
- environment.solar_activity: "low" | "moderate" | "high"
- environment.time_displacement: "present" | "past" | "future"

Key constraints:
- Use real CIA document ID format (already provided in existing data)
- Protocol types: CRV (Coordinate Remote Viewing), ERV (Extended Remote Viewing), ARV (Associative RV)
- Organizations: SRI International, SAIC, DIA
- Realistic hit rates: ~30-35% for trained viewers
- Geomagnetic Kp index: 0-9 scale (lower = calmer conditions, often correlated with better results)
- Include session transcripts with sensory impressions, sketches, analytical overlay (AOL)
- Viewer experience: 1-20 years for trained military/civilian viewers
- Blind levels: single, double, triple (most rigorous studies used double-blind)

Generate varied data - some hits, some misses, some partial matches. Include realistic variation in:
- Session duration (15-90 minutes)
- Number of ideograms/sketches
- Correspondence scores (1-7 scale typically)
- Environmental conditions`,
    exampleData: `{
  "session_date": "1985-03-15",
  "study_reference": "SRI-85-042",
  "operational_vs_research": "research",
  "target": {
    "type": "geographical_location",
    "coordinates": "2847/6091",
    "feedback_provided": true,
    "target_cued": false,
    "target_description_post_session": "Golden Gate Bridge, San Francisco, CA",
    "target_images_available": true
  },
  "protocol": {
    "type": "crv",
    "version": "Stage III",
    "organization": "SRI International",
    "blind_level": "double",
    "frontloading": null,
    "monitor_present": true,
    "monitor_blind": true
  },
  "viewer": {
    "id": "V-009",
    "training_background": "military",
    "experience_years": 4,
    "total_sessions": 312,
    "historical_accuracy": 34,
    "psi_belief": 5
  },
  "session": {
    "date": "1985-03-15",
    "start_time": "14:30",
    "duration_minutes": 45,
    "session_id": "SRI-85-042-S1",
    "ideograms_produced": 3,
    "sketches_produced": 2,
    "pages_of_data": 4
  },
  "impressions": {
    "sensory": {
      "visual": ["large structure", "red-orange color", "cables or lines"],
      "auditory": ["rushing water", "wind"],
      "kinesthetic": ["height", "swaying motion"],
      "olfactory": ["salt air"],
      "gustatory": null,
      "emotional": ["awe", "slight fear of height"]
    },
    "dimensional": {
      "size": "massive, spanning",
      "shape": "elongated, suspension",
      "color": "red-orange, grey",
      "texture": "smooth metal, rough cables",
      "temperature": "cool, windy"
    },
    "analytical_overlay": ["bridge", "Golden Gate"],
    "summary_description": "Large red-orange suspension structure over water, massive scale, cables"
  },
  "evaluation": {
    "judge_count": 3,
    "judges_blind": true,
    "scoring_method": "ranking",
    "correspondence_score": 6,
    "score_scale_max": 7,
    "hit_miss": "hit",
    "statistical_rank": 1,
    "decoy_pool_size": 5,
    "effect_size": 0.82
  },
  "sketch_analysis": {
    "sketches_available": true,
    "primary_elements_match": 78,
    "gestalt_match": true,
    "specific_details_match": ["suspension cables", "towers", "water below"]
  },
  "environment": {
    "local_sidereal_time": "13:42",
    "geomagnetic_kp": 2,
    "solar_activity": "low",
    "viewer_location": "Fort Meade, MD",
    "target_distance_miles": 2400,
    "time_displacement": "present",
    "time_offset_days": null
  },
  "session_transcript": "14:30 - Ideogram: flowing, curved motion. AOL: river? bridge?\\n14:35 - Strong red-orange impression, metallic. Large vertical structures.\\n14:42 - Sketch 1: Two tall towers connected by curved lines. Water below.\\n14:50 - Kinesthetic: swaying, height. Sound of wind, rushing water.\\n14:58 - AOL break: definitely feels like a bridge. Golden Gate?\\n15:05 - Sketch 2: Refined drawing showing suspension structure.\\n15:15 - Session end. High confidence in bridge/water target.",
  "raw_session_data": null,
  "researcher_notes": "Viewer showed strong correspondence on visual and kinesthetic elements. AOL managed well until final minutes."
}`
  },

  ganzfeld: {
    schema: GanzfeldSchema,
    systemPrompt: `You are a research data generator for Ganzfeld psi experiments.
Generate realistic experimental session data following standard protocols.

STRICT ENUM VALUES (use EXACTLY these values):
- target.type: "static_image" | "dynamic_video" | "audio" | "object" | "location"
- target.selection_method: "random" | "pseudo_random" | "predetermined"
- protocol.judging_method: "binary" | "ranking" | "rating_scale"
- sender.experience_level: "novice" | "intermediate" | "experienced"
- sender.relationship_to_receiver: "stranger" | "acquaintance" | "friend" | "family"
- receiver.experience_level: "novice" | "intermediate" | "experienced"
- receiver.dream_recall_frequency: "never" | "rarely" | "sometimes" | "often" | "always"
- results.mentation_quality: "poor" | "fair" | "good" | "excellent"
- results.imagery_type: "visual" | "auditory" | "kinesthetic" | "emotional" | "mixed"
- environment.lunar_phase: "new" | "waxing_crescent" | "first_quarter" | "waxing_gibbous" | "full" | "waning_gibbous" | "third_quarter" | "waning_crescent"
- environment.time_of_day: "morning" | "afternoon" | "evening" | "night"

Key constraints:
- Target pool size: typically 4 (1 target + 3 decoys)
- Expected hit rate: 25% by chance, ~32% in successful studies (effect size d ≈ 0.14-0.28)
- Sensory isolation: red light, halved ping pong balls over eyes, white/pink noise
- Session duration: typically 20-40 minutes of isolation
- Labs: Edinburgh, Freiburg, Cornell, Rhine, PRL (Psychophysical Research Labs)
- Protocol versions: AGSP (Auto-Ganzfeld Standard Procedure)

Generate varied data reflecting realistic distributions:
- Mix of hits and misses (aim for ~30% hit rate across batch)
- Confidence ratings vary (some certain about wrong answer, some uncertain about correct)
- Mentation quality varies
- Include relationship effects (friends/family as senders often show better results)
- Include psychological variables (openness, meditation practice)`,
    exampleData: `{
  "session_date": "2019-05-14",
  "session_id": "FREI-2019-142",
  "study_id": "Ganzfeld-Replication-2019",
  "target": {
    "type": "dynamic_video",
    "pool_size": 4,
    "selection_method": "random",
    "description": "Beach sunset scene",
    "category": "nature"
  },
  "protocol": {
    "version": "AGSP-2018",
    "laboratory": "Institut für Grenzgebiete, Freiburg",
    "automated": true,
    "sender_present": true,
    "sensory_isolation": {
      "visual": true,
      "auditory": true,
      "duration_minutes": 30
    },
    "judging_method": "ranking",
    "double_blind": true
  },
  "sender": {
    "id": "S-047",
    "experience_level": "intermediate",
    "relationship_to_receiver": "friend",
    "prior_sessions": 8,
    "psi_belief": 5
  },
  "receiver": {
    "id": "R-112",
    "experience_level": "novice",
    "prior_sessions": 2,
    "psi_belief": 4,
    "dream_recall_frequency": "often",
    "meditation_practice": true,
    "hypnotic_susceptibility": 8,
    "openness_to_experience": 4.2
  },
  "results": {
    "hit": true,
    "ranking": 1,
    "confidence_rating": 72,
    "mentation_quality": "good",
    "correspondence_notes": "Strong imagery of water, warmth, orange colors matching sunset video",
    "imagery_type": "visual"
  },
  "environment": {
    "local_sidereal_time": "14:22",
    "geomagnetic_activity_kp": 1,
    "lunar_phase": "waxing_gibbous",
    "time_of_day": "afternoon"
  },
  "mentation_transcript": "Starting to relax... seeing colors, warm oranges and reds... feels like warmth on my skin... water, definitely water, hearing gentle waves maybe... open space, sky... something peaceful, natural... sun? sunset feeling... sand? beach? very strong beach impression now... relaxed, content feeling... orange light everywhere...",
  "anomalies_noted": null,
  "researcher_notes": "Clean session, receiver relaxed quickly. Strong correspondence noted between mentation and target clip."
}`
  },

  geophysical: {
    schema: GeophysicalSchema,
    systemPrompt: `You are a research data generator for geophysical anomaly investigations.
Generate realistic field investigation data with proper instrumentation readings.

STRICT ENUM VALUES (use EXACTLY these values):
- location.location_type: "building" | "outdoor_natural" | "outdoor_urban" | "underground" | "vehicle" | "other"
- equipment.type: "emf_meter" | "thermometer" | "geiger_counter" | "magnetometer" | "infrasound_mic" | "ultrasound" | "camera_visible" | "camera_ir" | "camera_full_spectrum" | "ion_counter" | "humidity_sensor" | "barometer" | "seismometer" | "other"
- anomaly_events.anomaly_type: "em_spike" | "em_drop" | "temperature_drop" | "temperature_spike" | "radiation_spike" | "infrasound" | "ultrasound" | "magnetic_anomaly" | "ion_imbalance" | "multiple"
- correlated_events.event_type: "witness_report" | "equipment_malfunction" | "animal_behavior" | "subjective_sensation" | "photographic_anomaly" | "audio_anomaly" | "other"
- weather.precipitation: "none" | "light" | "moderate" | "heavy"
- protocol.investigation_type: "systematic_survey" | "response_investigation" | "long_term_monitoring" | "experimental"

Key constraints:
- Equipment: EMF meters (milligauss), thermometers, Geiger counters, magnetometers, infrasound mics
- Baseline readings should be established first, anomalies measured as sigma deviations
- EMF baseline: typically 0.5-3.0 mG in buildings, spikes of 3+ sigma are notable
- Temperature: note drops of 2+ degrees as significant
- Include geological features (fault lines, aquifers correlate with some reports)
- Geomagnetic Kp: 0-9 scale
- Investigation types: systematic_survey, response_investigation, long_term_monitoring

Generate realistic variation:
- Most readings are normal (baseline)
- Anomalous readings: 5-15% of total
- Include false positives (EMF from wiring, HVAC temperature changes)
- Some investigations find nothing, some find patterns
- Correlated events: witness reports during equipment anomalies`,
    exampleData: `{
  "investigation_date": "2023-09-15",
  "investigation_id": "GEO-2023-047",
  "lead_investigator": "Dr. M. Persinger",
  "organization": "Laurentian University Consciousness Lab",
  "location": {
    "name": "Historic Tavern",
    "latitude": 46.4917,
    "longitude": -80.9900,
    "altitude_meters": 285,
    "location_type": "building",
    "geological_features": ["Canadian Shield granite", "minor fault zone 2km"],
    "historical_significance": "Built 1878, documented reports since 1920s",
    "paranormal_history": true,
    "paranormal_history_details": "Apparition sightings, cold spots, sounds reported by staff and guests"
  },
  "equipment": [
    {"name": "TriField EMF", "type": "emf_meter", "model": "TF2", "calibration_date": "2023-08-01", "sensitivity": "0.1 mG"},
    {"name": "FLIR Thermal", "type": "thermometer", "model": "E8-XT", "calibration_date": "2023-07-15", "sensitivity": "0.1°C"},
    {"name": "Geiger-Mueller", "type": "geiger_counter", "model": "GQ GMC-500+", "calibration_date": "2023-08-20", "sensitivity": "1 CPM"}
  ],
  "baseline": {
    "measurement_period_start": "2023-09-15T19:00:00Z",
    "measurement_period_end": "2023-09-15T19:30:00Z",
    "em_field_mean_mg": 1.2,
    "em_field_std_mg": 0.3,
    "temperature_mean_c": 18.5,
    "temperature_std_c": 0.4,
    "background_radiation_cpm": 28,
    "infrasound_baseline_db": 45,
    "local_em_sources": ["main electrical panel 8m east", "refrigeration unit basement"]
  },
  "readings": [
    {"timestamp": "2023-09-15T21:15:00Z", "equipment_name": "TriField EMF", "value": 4.8, "unit": "mG", "baseline_value": 1.2, "deviation_from_baseline": 3.6, "sigma_deviation": 12.0, "anomalous": true, "notes": "Spike in upper hallway"},
    {"timestamp": "2023-09-15T21:15:30Z", "equipment_name": "FLIR Thermal", "value": 14.2, "unit": "°C", "baseline_value": 18.5, "deviation_from_baseline": -4.3, "sigma_deviation": 10.75, "anomalous": true, "notes": "Localized cold spot 2m diameter"},
    {"timestamp": "2023-09-15T21:45:00Z", "equipment_name": "TriField EMF", "value": 1.4, "unit": "mG", "baseline_value": 1.2, "deviation_from_baseline": 0.2, "sigma_deviation": 0.67, "anomalous": false, "notes": null}
  ],
  "anomaly_events": [
    {"event_id": "EVT-001", "start_time": "2023-09-15T21:14:45Z", "end_time": "2023-09-15T21:16:30Z", "duration_seconds": 105, "anomaly_type": "multiple", "peak_deviation_sigma": 12.0, "correlated_subjective_report": true, "correlated_report_details": "Team member reported feeling of presence and cold sensation simultaneously with readings"}
  ],
  "correlated_events": [
    {"event_type": "subjective_sensation", "timestamp": "2023-09-15T21:15:00Z", "description": "Investigator B reported sudden chill and pressure sensation", "witnesses": 2, "documented": true}
  ],
  "weather": {
    "timestamp": "2023-09-15T21:00:00Z",
    "temperature_c": 12,
    "humidity_percent": 68,
    "barometric_pressure_hpa": 1018,
    "wind_speed_kmh": 8,
    "precipitation": "none",
    "storm_activity": false,
    "geomagnetic_kp": 3
  },
  "protocol": {
    "investigation_type": "response_investigation",
    "duration_hours": 6,
    "team_size": 4,
    "blind_protocol": true,
    "control_location_used": true,
    "control_location_results": "No anomalies detected in control room during same period"
  },
  "total_readings": 847,
  "anomalous_readings_count": 23,
  "anomalous_readings_percent": 2.7,
  "max_sigma_deviation": 12.0,
  "raw_data_file": "GEO-2023-047-raw.csv",
  "researcher_notes": "Significant EMF/temperature correlation detected in upper hallway. Pattern consistent with previous reports.",
  "conclusions": "Multiple correlated anomalies detected in historically active area. Further investigation warranted."
}`
  },

  nde: {
    schema: NDESchema,
    systemPrompt: `You are a research data generator for Near-Death Experience research studies.
Generate realistic NDE case reports following AWARE/IANDS research protocols.

STRICT ENUM VALUES (use EXACTLY these values):
- source_type: "first_hand" | "interview" | "published_account" | "database"
- medical_context.cause: "cardiac_arrest" | "trauma" | "illness" | "surgery" | "drowning" | "other"
- medical_context.location: "hospital" | "home" | "accident_scene" | "other"
- veridical_perception.confidence_level: "low" | "medium" | "high"
- time_perception.distortion_type: "accelerated" | "slowed" | "timeless" | "nonlinear"
- subject_profile.gender: "male" | "female" | "other" | "prefer_not_to_say"
- subject_profile.prior_beliefs_afterlife: "believer" | "skeptic" | "agnostic" | "atheist"

Key constraints:
- Greyson NDE Scale: 0-32 (7-23 typical range for valid NDEs, 7+ threshold)
- Medical contexts: cardiac arrest most common, also trauma, surgery, drowning
- Core elements: OBE (60-80%), tunnel (20-40%), light (60-70%), deceased relatives (40-60%), life review (20-35%)
- Veridical perceptions: rare (~10-15% of OBE cases), even rarer verified
- Aftereffects: reduced fear of death (80%+), spiritual transformation (60%+), EM sensitivity (~25%)

Generate realistic variation:
- Not all NDEs have all elements
- Age range: 5-90 years
- Medical records availability varies
- Include skeptical cases (low Greyson scores, possible confabulation)
- Include strong cases (verified veridical perception)
- Prior beliefs vary (atheists, religious, agnostic)`,
    exampleData: `{
  "experience_date": "2018-07-22",
  "report_date": "2018-09-15",
  "source_type": "first_hand",
  "source_reference": "IANDS-2018-1547",
  "medical_context": {
    "cause": "cardiac_arrest",
    "cause_other": null,
    "location": "hospital",
    "resuscitation_performed": true,
    "time_clinically_dead_minutes": 4,
    "medical_records_available": true
  },
  "core_experience": {
    "out_of_body_experience": true,
    "obe_details": "Floated above operating table, observed resuscitation team from ceiling corner. Saw bald surgeon I hadn't met before surgery.",
    "tunnel_or_void": true,
    "light_encounter": true,
    "light_description": "Brilliant golden-white light at end of tunnel, felt unconditional love and acceptance",
    "deceased_relatives_encounter": true,
    "relatives_identified": ["grandmother (died 1995)", "uncle James (died 2010)"],
    "being_of_light": true,
    "life_review": true,
    "life_review_details": "Experienced key moments from my life from others' perspectives, felt their emotions. Understood impact of my actions.",
    "border_or_barrier": true,
    "decision_to_return": true,
    "return_reason": "Told my children needed me, saw image of daughter's face"
  },
  "veridical_perception": {
    "claimed": true,
    "description": "Described bald surgeon and red sneakers worn by nurse. Knew conversation about cancelled surgery in adjacent room.",
    "verified": true,
    "verification_method": "Surgeon confirmed baldness and red sneakers, conversation verified by staff",
    "witnesses": ["Dr. Sarah Chen", "Nurse Maria Rodriguez"],
    "confidence_level": "high"
  },
  "time_perception": {
    "distortion_reported": true,
    "distortion_type": "timeless",
    "subjective_duration": "Felt like hours or even days, but was only 4 minutes"
  },
  "aftereffects": {
    "personality_changes": true,
    "personality_details": "More patient, less materialistic, ended toxic relationship, career change to hospice volunteer work",
    "spiritual_transformation": true,
    "reduced_fear_of_death": true,
    "increased_compassion": true,
    "electromagnetic_sensitivity": true,
    "precognitive_experiences": false,
    "healing_experiences": false,
    "other_aftereffects": ["vivid dreams", "increased intuition", "watches malfunction frequently"]
  },
  "subject_profile": {
    "age_at_experience": 52,
    "gender": "female",
    "prior_nde_knowledge": false,
    "religious_background": "Catholic, non-practicing",
    "prior_beliefs_afterlife": "agnostic"
  },
  "greyson_score": 23,
  "full_narrative": "I was in for routine bypass surgery when something went wrong. The next thing I knew, I was floating above my body, watching the surgical team working frantically below. I could see everything clearly - the bald surgeon I'd never seen before (my surgeon had a full head of hair), a nurse with bright red sneakers...\\n\\nThen I was pulled into darkness, but it wasn't frightening. It felt like moving through a tunnel toward an incredible light. The light was unlike anything earthly - warm, loving, all-encompassing. I felt completely at peace for the first time in my life.\\n\\nMy grandmother was there, looking young and healthy. Uncle James too. They communicated without words - I just understood. Then I experienced my whole life, but from other people's perspectives. I felt the pain I'd caused my ex-husband, the joy I'd given my daughter. It was overwhelming but not judgmental.\\n\\nI reached a boundary - like a garden fence made of light. I knew if I crossed it, I couldn't return. But I saw my daughter's face, heard without hearing that she still needed me. The next moment I was gasping awake in recovery, crying.\\n\\nNothing has been the same since. I know - not believe, know - that consciousness continues. I'm not afraid of death anymore. I quit my corporate job and now volunteer at hospice. My relationships are deeper. I tell everyone I love them, every day.",
  "researcher_notes": "Strong case with verified veridical elements. Subject showed no prior NDE knowledge, agnostic background reduces expectation effects. Greyson score of 23 indicates deep NDE. Recommended for AWARE II follow-up study."
}`
  }
};

// Parse CLI arguments
function parseArgs(): { domain: Domain | 'all'; batchSize: number; dryRun: boolean } {
  const args = process.argv.slice(2);

  let domain: Domain | 'all' = 'all';
  let batchSize = 10;
  let dryRun = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--domain' && args[i + 1]) {
      const d = args[i + 1].toLowerCase();
      if (['stargate', 'ganzfeld', 'geophysical', 'nde', 'all'].includes(d)) {
        domain = d as Domain | 'all';
      }
      i++;
    } else if (args[i] === '--batch-size' && args[i + 1]) {
      batchSize = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === '--dry-run') {
      dryRun = true;
    }
  }

  return { domain, batchSize, dryRun };
}

// Fetch records for a domain
async function fetchRecords(domain: Domain): Promise<{ id: string; title: string; raw_data: Record<string, unknown> }[]> {
  const { data, error } = await supabase
    .from('aletheia_investigations')
    .select('id, title, raw_data')
    .eq('tier', 'research')
    .eq('investigation_type', domain)
    .order('created_at', { ascending: true });

  if (error) {
    console.error(`Error fetching ${domain} records:`, error);
    return [];
  }

  return data || [];
}

// Generate enriched data using Claude
async function generateEnrichedData(
  domain: Domain,
  record: { id: string; title: string; raw_data: Record<string, unknown> }
): Promise<Record<string, unknown> | null> {
  const config = DOMAIN_CONFIG[domain];

  const prompt = `Generate comprehensive research data for this ${domain.toUpperCase()} record.

EXISTING DATA:
${JSON.stringify(record.raw_data, null, 2)}

TITLE: ${record.title}

Generate a complete, realistic ${domain} record following the schema. Preserve any existing data that makes sense (like doc_id for STARGATE records) and add rich detail to all other fields.

IMPORTANT:
- Generate realistic, varied data (not all records should be "hits" or "successes")
- Include plausible session transcripts/narratives where applicable
- Maintain internal consistency (dates, durations, scores should align)
- Use realistic distributions for scores and metrics
- For STARGATE: preserve the doc_id, vary outcomes realistically
- For Ganzfeld: aim for ~30% hit rate across records
- For Geophysical: most readings should be normal with some anomalies
- For NDE: vary the depth and elements of experience

Return ONLY valid JSON matching the schema. No markdown, no explanation, just the JSON object.

EXAMPLE OF GOOD OUTPUT FORMAT:
${config.exampleData}`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: config.systemPrompt,
      messages: [{ role: 'user', content: prompt }]
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      console.error('Unexpected response type');
      return null;
    }

    // Parse JSON from response
    let jsonStr = content.text.trim();

    // Remove markdown code blocks if present
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.slice(7);
    } else if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.slice(3);
    }
    if (jsonStr.endsWith('```')) {
      jsonStr = jsonStr.slice(0, -3);
    }
    jsonStr = jsonStr.trim();

    const enrichedData = JSON.parse(jsonStr);
    return enrichedData;
  } catch (error) {
    console.error(`Error generating data for ${record.id}:`, error);
    return null;
  }
}

// Validate against schema
function validateData(domain: Domain, data: Record<string, unknown>): { valid: boolean; errors?: string[] } {
  const config = DOMAIN_CONFIG[domain];

  try {
    config.schema.parse(data);
    return { valid: true };
  } catch (error) {
    // Zod v4 uses .issues instead of .errors
    if (error && typeof error === 'object' && 'issues' in error) {
      const issues = (error as { issues: Array<{ path: (string | number)[]; message: string }> }).issues;
      return {
        valid: false,
        errors: issues.map(e => `${e.path.join('.')}: ${e.message}`)
      };
    }
    return { valid: false, errors: ['Unknown validation error'] };
  }
}

// Update record in database
async function updateRecord(id: string, rawData: Record<string, unknown>): Promise<boolean> {
  const { error } = await supabase
    .from('aletheia_investigations')
    .update({ raw_data: rawData, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    console.error(`Error updating ${id}:`, error);
    return false;
  }

  return true;
}

// Process a single domain
async function processDomain(
  domain: Domain,
  batchSize: number,
  dryRun: boolean
): Promise<EnrichmentResult[]> {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Processing ${domain.toUpperCase()}`);
  console.log('='.repeat(60));

  const records = await fetchRecords(domain);
  console.log(`Found ${records.length} records`);

  const results: EnrichmentResult[] = [];
  let processed = 0;
  let successCount = 0;
  let failCount = 0;

  for (const record of records) {
    processed++;
    process.stdout.write(`\r[${processed}/${records.length}] Processing ${record.id.slice(0, 8)}...`);

    // Generate enriched data
    const enrichedData = await generateEnrichedData(domain, record);

    if (!enrichedData) {
      results.push({ id: record.id, success: false, error: 'Generation failed' });
      failCount++;
      continue;
    }

    // Validate against schema
    const validation = validateData(domain, enrichedData);

    if (!validation.valid) {
      console.log(`\n  ⚠️  Validation failed for ${record.id}:`);
      validation.errors?.forEach(e => console.log(`      - ${e}`));
      results.push({ id: record.id, success: false, error: validation.errors?.join('; ') });
      failCount++;
      continue;
    }

    // Update database (unless dry run)
    if (dryRun) {
      console.log(`\n  [DRY RUN] Would update ${record.id}`);
      results.push({ id: record.id, success: true });
      successCount++;
    } else {
      const updated = await updateRecord(record.id, enrichedData);
      if (updated) {
        results.push({ id: record.id, success: true });
        successCount++;
      } else {
        results.push({ id: record.id, success: false, error: 'Database update failed' });
        failCount++;
      }
    }

    // Rate limiting between API calls
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log(`\n\n${domain.toUpperCase()} Results: ${successCount} success, ${failCount} failed`);

  return results;
}

// Main execution
async function main() {
  console.log('═'.repeat(60));
  console.log('  RESEARCH TIER DATA ENRICHMENT');
  console.log('═'.repeat(60));

  // Check for API key
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('\n❌ ANTHROPIC_API_KEY environment variable required');
    console.log('Usage: ANTHROPIC_API_KEY=xxx npx tsx scripts/enrich-research-data.ts --domain stargate');
    process.exit(1);
  }

  // Check for Supabase key
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('\n❌ SUPABASE_SERVICE_ROLE_KEY environment variable required');
    process.exit(1);
  }

  const { domain, batchSize, dryRun } = parseArgs();

  console.log(`\nConfiguration:`);
  console.log(`  Domain: ${domain}`);
  console.log(`  Batch size: ${batchSize}`);
  console.log(`  Dry run: ${dryRun}`);

  const domains: Domain[] = domain === 'all'
    ? ['stargate', 'ganzfeld', 'geophysical', 'nde']
    : [domain];

  const allResults: { domain: Domain; results: EnrichmentResult[] }[] = [];

  for (const d of domains) {
    const results = await processDomain(d, batchSize, dryRun);
    allResults.push({ domain: d, results });
  }

  // Final summary
  console.log('\n' + '═'.repeat(60));
  console.log('  FINAL SUMMARY');
  console.log('═'.repeat(60));

  let totalSuccess = 0;
  let totalFail = 0;

  for (const { domain: d, results } of allResults) {
    const success = results.filter(r => r.success).length;
    const fail = results.filter(r => !r.success).length;
    totalSuccess += success;
    totalFail += fail;
    console.log(`  ${d.toUpperCase().padEnd(12)} ✓ ${success} / ✗ ${fail}`);
  }

  console.log('─'.repeat(60));
  console.log(`  TOTAL${' '.repeat(8)} ✓ ${totalSuccess} / ✗ ${totalFail}`);
  console.log('═'.repeat(60));

  if (dryRun) {
    console.log('\n⚠️  DRY RUN - No changes were made to the database');
  }
}

main().catch(console.error);
