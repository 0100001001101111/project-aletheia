'use client';

/**
 * Investigation View Page
 * View a single investigation submission
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SCHEMA_METADATA, flattenToDotNotation, getFieldDescriptions } from '@/schemas';
import { getTriageScoreColor, getTriageStatusColor } from '@/lib/triage';
import { formatFieldName, formatValue as formatVal } from '@/lib/format';
import { InfoTooltip, JARGON_TOOLTIPS } from '@/components/ui/Tooltip';
import type { InvestigationType, TriageStatus } from '@/types/database';

// Investigation type explainers
const TYPE_EXPLAINERS: Partial<Record<InvestigationType, string>> = {
  ganzfeld: "In a Ganzfeld experiment, a 'receiver' in sensory deprivation tries to identify a hidden 'target' image or video being viewed by a 'sender.' A 'hit' means they correctly identified the target from a set of decoys. This tests whether information can transfer between isolated individuals.",
  nde: "Near-death experiences occur during clinical death or life-threatening crisis. Researchers document what subjects report seeing or experiencing, then verify whether any details could be confirmed (veridical perception). This tests whether consciousness can perceive information without normal sensory input.",
  crisis_apparition: "Crisis apparitions are reports of seeing or sensing someone at the moment they experience death or severe trauma - often before the observer could have known. This tests whether extreme stress creates a detectable signal between connected individuals.",
  stargate: "Remote viewing sessions task a 'viewer' with describing a hidden target location or object using only mental focus. Responses are rated on accuracy. This tests whether humans can perceive distant information without physical access.",
  geophysical: "Geophysical investigations correlate unusual phenomena (lights, sounds, equipment malfunctions) with environmental factors like seismic activity, electromagnetic fields, or geological composition. This tests whether tectonic stress produces observable effects.",
  ufo: "UFO/UAP investigations document unidentified aerial phenomena with attention to potential correlations with geomagnetic conditions and physiological effects on witnesses. Note: The SPECTER seismic hypothesis was tested but did not survive rigorous statistical analysis.",
  bigfoot: "Bigfoot/Sasquatch sightings are reports of large, bipedal, ape-like creatures in wilderness areas. BFRO classifies sightings: Class A (clear visual), Class B (possible/obscured), Class C (secondhand report).",
  haunting: "Haunted location reports document unexplained phenomena at specific places - apparitions, sounds, cold spots, object movement. Often correlate with historical trauma or death at the location.",
  crop_circle: "Crop circles are geometric patterns of flattened crops, predominantly found in UK. While many are hoaxes, some exhibit unusual characteristics like bent (not broken) stalks and localized radiation.",
  bermuda_triangle: "Bermuda Triangle incidents involve ships and aircraft that disappeared in the Atlantic region between Miami, Bermuda, and Puerto Rico. Most have mundane explanations, but some remain unexplained.",
  hotspot: "High Strangeness Hotspots are locations with multiple types of anomalous reports - UFOs, cryptids, hauntings - often with unusual geological or magnetic properties.",
};

// Field-specific tooltips for investigation data
const FIELD_TOOLTIPS: Record<string, string> = {
  hit: "Did the receiver correctly identify the target? Yes = success, No = miss",
  target: "The image, video, or location the receiver was trying to identify",
  receiver: "Anonymous ID of the person attempting to receive information",
  source: "The database or study this trial came from",
  record_num: "The trial number in the original study database",
  phenomenon_type: "The category of anomalous phenomenon reported",
  delta_t_minutes: "Time difference between the apparition and the crisis event",
  distance_miles: "Physical distance between observer and the person in crisis",
  is_gold_standard: "Whether this case meets strict evidential criteria",
};

// Format phenomenon type for display
function formatPhenomenonType(type: string): string {
  const typeMap: Record<string, string> = {
    'ufo_uap': 'UFO/UAP sighting',
    'ufo': 'UFO sighting',
    'uap': 'UAP sighting',
    'light': 'anomalous light',
    'sphere': 'spherical object',
    'triangle': 'triangular craft',
    'disk': 'disk-shaped object',
    'cylinder': 'cylindrical object',
    'orb': 'orb/light phenomenon',
    'flash': 'unexplained flash',
  };
  return typeMap[type?.toLowerCase()] || type?.replace(/_/g, ' ') || 'unusual phenomenon';
}

// Generate a human-readable summary of what happened in this specific investigation
function generateInvestigationSummary(type: InvestigationType, data: Record<string, unknown>, description?: string): string {
  switch (type) {
    case 'ganzfeld': {
      // Check if this is a multi-site replication study
      if (data.total_sessions && (data.sites || data.p_value || data.hit_rate)) {
        const sessions = data.total_sessions;
        const hitRate = data.hit_rate;
        const pValue = data.p_value;
        const effectSize = data.effect_size_d;
        const sites = data.sites as string[] | undefined;
        const directHits = data.direct_hits;
        const chanceBaseline = data.chance_baseline || 0.25;

        let summary = 'This is a systematic Ganzfeld replication study';
        if (sites && sites.length > 0) {
          summary += ` coordinated across ${sites.length} research sites (${sites.slice(0, 2).join(', ')}${sites.length > 2 ? '...' : ''})`;
        }
        summary += '.';

        if (sessions) {
          summary += ` Over ${sessions} controlled sessions`;
          if (directHits) {
            summary += `, ${directHits} direct hits were recorded`;
          }
          if (hitRate) {
            const hitPercent = (Number(hitRate) * 100).toFixed(1);
            const chancePercent = (Number(chanceBaseline) * 100).toFixed(0);
            summary += ` (${hitPercent}% hit rate vs ${chancePercent}% chance)`;
          }
          summary += '.';
        }

        if (pValue) {
          summary += ` Statistical significance: p = ${pValue}.`;
        }
        if (effectSize) {
          summary += ` Effect size (Cohen's d): ${effectSize}.`;
        }

        return summary;
      }

      // Check if this is NLP training dataset (cross-domain metadata)
      if (data.total_cases && data.domain_distribution) {
        const totalCases = data.total_cases;
        const accuracy = data.model_accuracy_validation;
        const f1 = data.f1_score;
        const raters = data.human_raters;
        const kappa = data.inter_rater_reliability_kappa;

        let summary = `This is a curated training dataset of ${totalCases} case reports across all research domains, used to train the AI-assisted triage system.`;

        if (raters) {
          summary += ` ${raters} human raters scored the cases`;
          if (kappa) {
            summary += ` with inter-rater reliability (Cohen's κ) of ${kappa}`;
          }
          summary += '.';
        }

        if (accuracy || f1) {
          summary += ' Validation results:';
          if (accuracy) summary += ` ${(Number(accuracy) * 100).toFixed(0)}% model accuracy`;
          if (f1) summary += `${accuracy ? ',' : ''} F1 score of ${f1}`;
          summary += '.';
        }

        return summary;
      }

      // Individual trial
      const target = data.target || 'an unknown target';
      const receiver = data.receiver || 'unknown';
      const hit = data.hit;
      const recordNum = data.record_num;
      const result = hit === true ? 'a hit - the receiver successfully identified the correct target' :
                     hit === false ? 'a miss - the receiver did not identify the correct target' :
                     'an unknown outcome';

      return `In Trial #${recordNum}, Receiver #${receiver} was placed in sensory deprivation and attempted to mentally perceive the target "${target}" - an image or video clip being viewed by a sender in another room. The receiver then tried to pick the correct target from a set of four options. This trial was ${result}.`;
    }

    case 'stargate': {
      // Check if this is a study/aggregate or individual session
      if (data.total_sessions || data.participants_trained) {
        // This is a study with aggregate data
        const sessions = data.total_sessions;
        const hits = data.hits_above_threshold;
        const participants = data.participants_trained;
        const trainingMonths = data.training_duration_months;
        const avgScore = data.average_correspondence_score;
        const scoreScale = data.score_scale;

        let summary = 'This is a systematic remote viewing study';
        if (participants) summary += ` with ${participants} trained viewers`;
        if (trainingMonths) summary += ` after ${trainingMonths} months of training`;
        summary += '.';

        if (sessions) {
          summary += ` Over ${sessions} blind sessions`;
          if (hits) {
            const hitRate = ((Number(hits) / Number(sessions)) * 100).toFixed(1);
            summary += `, ${hits} (${hitRate}%) achieved hits above the threshold`;
          }
          if (avgScore && scoreScale) {
            summary += `. Average correspondence score: ${avgScore} on a ${scoreScale} scale`;
          }
          summary += '.';
        }

        return summary;
      }

      // Individual session record
      const docId = data.doc_id;
      const source = data.source || 'CIA STARGATE Archive';

      // Extract outcome from various possible locations
      let outcome: string | null = null;
      if (data.outcome) {
        outcome = String(data.outcome);
      } else if (data.ratings && typeof data.ratings === 'object') {
        const ratings = data.ratings as Record<string, unknown>;
        if (Array.isArray(ratings.binary) && ratings.binary[0]) {
          const firstRating = ratings.binary[0] as Record<string, unknown>;
          if (firstRating.match) {
            outcome = String(firstRating.match);
          } else if (Array.isArray(firstRating.groups) && firstRating.groups[0]) {
            outcome = String(firstRating.groups[0]);
          }
        }
      }

      let summary = `This is a declassified remote viewing session from the ${source}.`;

      if (docId) {
        summary += ` Document reference: ${docId}.`;
      }

      summary += ' A trained viewer attempted to describe a hidden target using only mental focus, with no prior knowledge or physical access.';

      if (outcome) {
        const isSuccess = outcome.toLowerCase().includes('success') || outcome.toLowerCase() === 'hit';
        summary += isSuccess
          ? ' **Result: SUCCESS** - independent judges determined the viewer\'s description matched the target.'
          : outcome.toLowerCase().includes('fail') || outcome.toLowerCase() === 'miss'
            ? ' Result: The session did not produce a match with the target.'
            : ` Outcome: ${outcome}.`;
      }

      // Also check the description for outcome info
      if (!outcome && description) {
        if (description.toLowerCase().includes('success')) {
          summary += ' **Result: SUCCESS** - the session produced a verified match.';
        } else if (description.toLowerCase().includes('fail') || description.toLowerCase().includes('miss')) {
          summary += ' Result: The session did not produce a match.';
        }
      }

      return summary;
    }

    case 'crisis_apparition': {
      // Check if this is a study/aggregate or individual case
      if (data.cases_digitized || data.cases_meeting_criteria) {
        const total = data.cases_digitized;
        const meetingCriteria = data.cases_meeting_criteria;
        const verifiedDeaths = data.verified_deaths;
        const within12h = data.time_coincidence_within_12h;
        const baseline = data.hallucination_baseline;

        let summary = 'This is a systematic analysis of crisis apparition cases';
        if (total) summary += ` reviewing ${total} documented reports`;
        summary += '.';

        if (meetingCriteria) {
          summary += ` ${meetingCriteria} cases met strict evidential criteria.`;
        }
        if (verifiedDeaths) {
          summary += ` ${verifiedDeaths} involved verified deaths.`;
        }
        if (within12h) {
          summary += ` ${within12h} apparitions occurred within 12 hours of the crisis event.`;
        }
        if (baseline) {
          summary += ` Baseline hallucination rate for comparison: ${(Number(baseline) * 100).toFixed(1)}%.`;
        }

        return summary;
      }

      // Individual case
      const deltaT = data.delta_t_minutes;
      const distance = data.distance_miles;
      const isGold = data.is_gold_standard;
      const caseId = data.case_id;
      const sourceBook = (data.source as Record<string, unknown>)?.book;

      // Try to get experience type from description
      let experienceType = 'a vision or sensing';
      if (description) {
        const expMatch = description.match(/^([^.]+?)(?:\s+with|\s+at|\s*\.)/i);
        if (expMatch) {
          experienceType = expMatch[1].toLowerCase();
        }
      }

      let summary = '';

      // Source attribution
      if (sourceBook) {
        summary += `From "${sourceBook}"${caseId ? ` (${caseId})` : ''}: `;
      }

      summary += `The observer experienced ${experienceType}`;

      // Timing
      if (deltaT !== undefined && deltaT !== null) {
        if (Number(deltaT) === 0) {
          summary += ' at the exact moment of the crisis event';
        } else if (Number(deltaT) < 0) {
          summary += ` ${Math.abs(Number(deltaT))} minutes before the crisis event`;
        } else {
          summary += ` ${deltaT} minutes after the crisis event`;
        }
      }

      // Distance
      if (distance) {
        summary += `, despite being ${distance} miles away from the person in crisis`;
      }

      summary += '. The observer had no normal means of knowing about the event at that time.';

      if (isGold) {
        summary += ' This case meets gold-standard evidential criteria with independent corroboration of both the apparition and the crisis.';
      }

      return summary;
    }

    case 'geophysical': {
      // Check if this is sensor-based monitoring data
      if (data.sensors_deployed || data.monitoring_period_days) {
        const location = data.location || 'an undisclosed location';
        const period = data.monitoring_period_days;
        const sensors = data.sensors_deployed as string[] | undefined;
        const anomalies = data.anomalous_events_detected;
        const emSpikes = data.em_spikes_above_3sigma;
        const tempDrops = data.temperature_drops_above_2sigma;
        const infrasound = data.infrasound_events;
        const witnesses = data.correlated_witness_reports;

        let summary = `Environmental monitoring study at ${location}`;
        if (period) summary += ` over ${period} days`;
        if (sensors) summary += ` using ${sensors.length} sensor types (${sensors.slice(0, 3).join(', ')}${sensors.length > 3 ? '...' : ''})`;
        summary += '.';

        if (anomalies) {
          summary += ` Detected ${anomalies} anomalous events:`;
          if (emSpikes) summary += ` ${emSpikes} electromagnetic spikes above 3σ.`;
          if (tempDrops) summary += ` ${tempDrops} temperature drops above 2σ.`;
          if (infrasound) summary += ` ${infrasound} infrasound events.`;
          if (witnesses) summary += ` ${witnesses} correlated with witness reports.`;
        }

        return summary;
      }

      // Check if this is a correlation/meta-analysis study
      if (data.experiments_analyzed || data.geomagnetic_indices || data.correlation_ganzfeld_kp !== undefined) {
        const experiments = data.experiments_analyzed;
        const dateRange = data.date_range;
        const geoIndices = data.geomagnetic_indices as string[] | undefined;
        const correlationGanzfeld = data.correlation_ganzfeld_kp;
        const correlationRV = data.correlation_rv_kp;
        const solarEffect = data.solar_minimum_effect;
        const lunarEffect = data.lunar_phase_effect;
        const schumannSource = data.schumann_data_source;
        const metaR2 = data.meta_regression_r2;

        let summary = 'This is a meta-analysis correlating psi experiment results with geophysical variables';
        if (dateRange) summary += ` spanning ${dateRange}`;
        summary += '.';

        if (experiments) {
          summary += ` Analyzed ${experiments.toLocaleString()} experiments`;
          if (schumannSource) summary += ` against Schumann resonance data from ${schumannSource}`;
          summary += '.';
        }

        if (geoIndices && geoIndices.length > 0) {
          summary += ` Geomagnetic indices tested: ${geoIndices.join(', ')}.`;
        }

        // Report correlations
        const correlations: string[] = [];
        if (correlationGanzfeld !== undefined) correlations.push(`Ganzfeld-Kp: r=${correlationGanzfeld}`);
        if (correlationRV !== undefined) correlations.push(`Remote Viewing-Kp: r=${correlationRV}`);
        if (correlations.length > 0) {
          summary += ` Correlations found: ${correlations.join('; ')}.`;
        }

        if (metaR2 !== undefined) {
          summary += ` Overall variance explained (R²): ${(Number(metaR2) * 100).toFixed(1)}%.`;
        }

        // Report effects
        const effects: string[] = [];
        if (solarEffect) effects.push('solar minimum effect detected');
        if (lunarEffect) effects.push('lunar phase effect detected');
        if (lunarEffect === false) effects.push('no lunar phase effect');
        if (effects.length > 0) {
          summary += ` Additional findings: ${effects.join(', ')}.`;
        }

        return summary;
      }

      // Sighting report data (SPECTER/NUFORC style)
      const city = data.city || 'an unknown location';
      const state = data.state || '';
      const phenomenonType = String(data.phenomenon_type || '');
      const subtype = data.phenomenon_subtype ? String(data.phenomenon_subtype) : null;
      const date = data.event_date;

      // Format the phenomenon type nicely
      const phenomenonDisplay = subtype && subtype !== 'null'
        ? formatPhenomenonType(subtype)
        : formatPhenomenonType(phenomenonType);

      let summary = `On ${date || 'an unknown date'}, witnesses in ${city}${state ? `, ${state}` : ''} reported a ${phenomenonDisplay}.`;

      // Use the table description if available (contains witness account)
      if (description && description.includes('Geophysical/paranormal report')) {
        // Extract the witness account from the description
        const witnessMatch = description.match(/\d{4}-\d{2}-\d{2}\.\s*(.+)$/);
        if (witnessMatch && witnessMatch[1]) {
          summary += ` Witness account: "${witnessMatch[1]}"`;
        }
      } else if (description) {
        summary += ` ${description}`;
      }

      summary += ' This sighting is being analyzed alongside seismic activity and electromagnetic data to identify potential environmental correlations.';

      return summary;
    }

    case 'nde': {
      const hospitals = data.hospitals;
      const ndeReports = data.nde_reports;
      const obeReports = data.obe_reports;
      const targetHits = data.target_hits;
      const cardiacArrests = data.cardiac_arrests;
      const methodology = data.methodology;
      const studyPeriod = data.study_period;
      const trigger = data.trigger || data.medical_event;
      const veridical = data.veridical_elements || data.verified_perceptions;

      // Longitudinal follow-up study detection
      const originalCohort = data.original_cohort;
      const retainedAt10yr = data.retained_at_10yr;
      const controlGroupSize = data.control_group_size;
      const spiritualTransformation = data.spiritual_transformation;
      const personalityChange = data.personality_change_significant;
      const healingExperiences = data.healing_experiences;
      const emSensitivity = data.em_sensitivity_reported;
      const precognitiveDreams = data.precognitive_dreams_frequent;

      // Check if this is a longitudinal/follow-up study
      if (originalCohort || retainedAt10yr) {
        let summary = 'This is a longitudinal follow-up study of NDE experiencers';

        if (originalCohort && retainedAt10yr) {
          const retentionRate = ((Number(retainedAt10yr) / Number(originalCohort)) * 100).toFixed(0);
          summary += `. Original cohort: ${originalCohort} participants, ${retainedAt10yr} (${retentionRate}%) retained at follow-up`;
        }
        if (controlGroupSize) {
          summary += `, compared against ${controlGroupSize} matched controls`;
        }
        summary += '.';

        // Report aftereffects
        const aftereffects: string[] = [];
        if (spiritualTransformation) aftereffects.push(`${spiritualTransformation} reported spiritual transformation`);
        if (personalityChange) aftereffects.push(`${personalityChange} significant personality changes`);
        if (healingExperiences) aftereffects.push(`${healingExperiences} healing experiences`);
        if (emSensitivity) aftereffects.push(`${emSensitivity} electromagnetic sensitivity`);
        if (precognitiveDreams) aftereffects.push(`${precognitiveDreams} frequent precognitive dreams`);

        if (aftereffects.length > 0) {
          summary += ' Reported aftereffects: ' + aftereffects.join('; ') + '.';
        }

        return summary;
      }

      // Check if this is a hospital/clinical study
      if (ndeReports || hospitals || cardiacArrests) {
        let summary = 'This is a systematic study of near-death experiences';

        if (hospitals) {
          summary += ` conducted across ${hospitals} hospital${Number(hospitals) > 1 ? 's' : ''}`;
        }
        if (methodology) {
          summary += ` using the ${methodology}`;
        }
        summary += '.';

        if (cardiacArrests || ndeReports) {
          summary += ' Results:';
          if (cardiacArrests) summary += ` ${cardiacArrests} cardiac arrest survivors interviewed.`;
          if (ndeReports) summary += ` ${ndeReports} reported near-death experiences.`;
          if (obeReports) summary += ` ${obeReports} reported out-of-body experiences.`;
          if (targetHits !== undefined && targetHits !== null) {
            const hits = Number(targetHits);
            summary += hits > 0
              ? ` ${hits} verified "hits" where patients accurately described hidden visual targets.`
              : ' No verified target hits (patients could not identify hidden visual targets).';
          }
        }

        if (studyPeriod) {
          summary += ` Study period: ${studyPeriod}.`;
        }

        return summary;
      }

      // Individual case
      let summary = `This near-death experience occurred during ${trigger || 'a life-threatening event'}. The subject reported experiences while clinically unconscious.`;

      if (veridical) {
        summary += ` Researchers verified specific details the subject reported perceiving during the event.`;
      }

      return summary;
    }

    case 'ufo': {
      const location = data.location as Record<string, unknown> | undefined;
      const city = location?.city || data.city || 'unknown location';
      const state = location?.state || data.state || '';
      const dateTime = data.date_time;
      const shape = data.shape;
      const duration = data.duration_seconds;
      const witnessCount = data.witness_count;
      const effects = data.effects as Record<string, unknown> | undefined;
      const geophysical = data.geophysical as Record<string, unknown> | undefined;
      const geomagnetic = data.geomagnetic as Record<string, unknown> | undefined;
      const confounds = data.confounds as Record<string, unknown> | undefined;

      let summary = '';

      // Basic sighting info
      if (dateTime) {
        const parsedDate = new Date(dateTime as string);
        const isValidDate = !isNaN(parsedDate.getTime());
        if (isValidDate) {
          const date = parsedDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
          summary += `On ${date}, `;
        }
      }

      summary += `witnesses in ${city}${state ? `, ${state}` : ''} reported `;

      if (shape) {
        summary += `a ${shape}-shaped `;
      }
      summary += 'unidentified aerial phenomenon';

      if (witnessCount && Number(witnessCount) > 1) {
        summary += ` (${witnessCount} witnesses)`;
      }

      if (duration && Number(duration) > 0) {
        const mins = Math.floor(Number(duration) / 60);
        const secs = Number(duration) % 60;
        if (mins > 0) {
          summary += ` lasting ${mins} minute${mins > 1 ? 's' : ''}`;
          if (secs > 0) summary += ` ${secs} seconds`;
        } else {
          summary += ` lasting ${secs} seconds`;
        }
      }
      summary += '.';

      // Effects
      const effectsList: string[] = [];
      if (effects?.physiological_effects) effectsList.push('physiological effects on witnesses');
      if (effects?.em_interference) effectsList.push('electromagnetic interference');
      if (effects?.physical_effects) effectsList.push('physical effects');

      if (effectsList.length > 0) {
        summary += ` Reported effects: ${effectsList.join(', ')}.`;
      }

      // Correlations
      const correlations: string[] = [];
      if (geophysical?.earthquake_nearby) correlations.push('seismic activity');
      if (geophysical?.piezoelectric_bedrock) correlations.push('piezoelectric bedrock');
      if (geomagnetic?.geomagnetic_storm) correlations.push('geomagnetic storm');

      if (correlations.length > 0) {
        summary += ` Environmental correlations: ${correlations.join(', ')}.`;
      }

      // Confounds
      if (confounds?.military_base_nearby_km && Number(confounds.military_base_nearby_km) < 50) {
        summary += ` Note: Military base within ${confounds.military_base_nearby_km}km.`;
      }
      if (confounds?.airport_nearby_km && Number(confounds.airport_nearby_km) < 30) {
        summary += ` Note: Airport within ${confounds.airport_nearby_km}km.`;
      }

      return summary;
    }

    default:
      return 'This investigation contains research data being analyzed for cross-domain patterns.';
  }
}

interface Investigation {
  id: string;
  title: string;
  description?: string;
  type: InvestigationType;
  raw_data: Record<string, unknown>;
  triage_score: number;
  triage_status: TriageStatus;
  created_at: string;
  updated_at: string;
  submitted_by_user?: {
    id: string;
    display_name: string;
    identity_type: string;
  };
  contributions?: Array<{
    id: string;
    contribution_type: string;
    details: Record<string, unknown>;
    created_at: string;
  }>;
  triage_reviews?: Array<{
    id: string;
    score_override: number | null;
    status_override: TriageStatus | null;
    review_notes: string;
    created_at: string;
  }>;
}

interface PageProps {
  params: { id: string };
}

export default function InvestigationPage({ params }: PageProps) {
  const { id } = params;
  const router = useRouter();
  const [investigation, setInvestigation] = useState<Investigation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchInvestigation() {
      try {
        const response = await fetch(`/api/submissions/${id}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch investigation');
        }

        setInvestigation(data);
      } catch (err) {
        console.error('Fetch error:', err);
        setError(err instanceof Error ? err.message : 'Failed to load investigation');
      } finally {
        setLoading(false);
      }
    }

    fetchInvestigation();
  }, [id]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-500 border-t-transparent" />
          <p className="mt-4 text-zinc-400">Loading investigation...</p>
        </div>
      </div>
    );
  }

  if (error || !investigation) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <div className="max-w-md rounded-xl border border-red-500/30 bg-red-500/10 p-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-500/20">
            <svg className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="mt-6 text-2xl font-bold text-red-400">Error</h2>
          <p className="mt-2 text-red-300/80">{error || 'Investigation not found'}</p>
          <button
            onClick={() => router.back()}
            className="mt-6 rounded-lg border border-zinc-700 bg-zinc-800 px-6 py-3 font-medium text-zinc-300 hover:bg-zinc-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const metadata = SCHEMA_METADATA[investigation.type] || { name: investigation.type, icon: '❓', color: 'text-zinc-400', description: '' };
  const fieldDescriptions = getFieldDescriptions(investigation.type);
  const flatData = flattenToDotNotation(investigation.raw_data);
  const scoreColor = getTriageScoreColor(investigation.triage_score);
  const statusColor = getTriageStatusColor(investigation.triage_status);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/50">
        <div className="mx-auto max-w-6xl px-4 py-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3">
                <span className={`text-3xl ${metadata.color}`}>{metadata.icon}</span>
                <div>
                  <h1 className="text-2xl font-bold text-zinc-100">{investigation.title}</h1>
                  <p className="text-zinc-400">{metadata.name}</p>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className={`text-4xl font-bold ${scoreColor}`}>
                {investigation.triage_score != null ? `${investigation.triage_score}/10` : '—'}
                <InfoTooltip text={JARGON_TOOLTIPS.triage_score} position="left" />
              </div>
              <span className={`mt-1 inline-flex items-center gap-1 rounded-full border px-3 py-1 text-sm capitalize ${statusColor}`}>
                {investigation.triage_status}
                {investigation.triage_status === 'verified' && (
                  <InfoTooltip text={JARGON_TOOLTIPS.verified} position="left" />
                )}
                {investigation.triage_status === 'provisional' && (
                  <InfoTooltip text={JARGON_TOOLTIPS.provisional} position="left" />
                )}
              </span>
            </div>
          </div>

          {/* Metadata */}
          <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-zinc-400">
            <span>
              ID: <code className="rounded bg-zinc-800 px-2 py-0.5 text-xs">{investigation.id}</code>
            </span>
            <span>
              Created: {new Date(investigation.created_at).toLocaleDateString()}
            </span>
            {investigation.submitted_by_user && (
              <span>
                By: {investigation.submitted_by_user.display_name}
                {investigation.submitted_by_user.identity_type !== 'public' && (
                  <span className="ml-1 rounded bg-zinc-800 px-1.5 py-0.5 text-xs">
                    {investigation.submitted_by_user.identity_type}
                  </span>
                )}
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-6xl px-4 py-8">
        {/* What Happened - Always visible summary */}
        <div className="mb-6 rounded-xl border border-zinc-700 bg-gradient-to-r from-zinc-900 to-zinc-800/50 p-6">
          <h2 className="text-lg font-semibold text-zinc-100 mb-3 flex items-center gap-2">
            <svg className="h-5 w-5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            What Happened
          </h2>
          <p className="text-zinc-300 leading-relaxed">
            {generateInvestigationSummary(investigation.type, investigation.raw_data, investigation.description)}
          </p>
        </div>

        {/* About This Investigation Type - Collapsible */}
        <details className="mb-6 rounded-xl border border-violet-500/30 bg-violet-500/5">
          <summary className="cursor-pointer px-6 py-4 text-sm font-medium text-violet-400 hover:text-violet-300 flex items-center gap-2">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            What am I looking at?
          </summary>
          <div className="border-t border-violet-500/20 px-6 py-4">
            <h3 className="text-base font-semibold text-zinc-100 mb-2">
              About {metadata.name}
            </h3>
            <p className="text-sm text-zinc-400 leading-relaxed">
              {TYPE_EXPLAINERS[investigation.type]}
            </p>
            <div className="mt-4 pt-4 border-t border-zinc-700/50">
              <h4 className="text-xs font-medium uppercase tracking-wide text-zinc-500 mb-2">Key Terms</h4>
              <div className="flex flex-wrap gap-2">
                {Object.entries(FIELD_TOOLTIPS)
                  .filter(([key]) => {
                    // Show relevant tooltips based on investigation type
                    const ganzfeldFields = ['hit', 'target', 'receiver', 'source', 'record_num'];
                    const stargateFields = ['target', 'source', 'record_num'];
                    const crisisFields = ['delta_t_minutes', 'distance_miles', 'is_gold_standard', 'source'];
                    const geoFields = ['phenomenon_type', 'source'];

                    if (investigation.type === 'ganzfeld') return ganzfeldFields.includes(key);
                    if (investigation.type === 'stargate') return stargateFields.includes(key);
                    if (investigation.type === 'crisis_apparition') return crisisFields.includes(key);
                    if (investigation.type === 'geophysical') return geoFields.includes(key);
                    return false;
                  })
                  .map(([key, tooltip]) => (
                    <span
                      key={key}
                      className="inline-flex items-center gap-1 rounded-full bg-zinc-800 px-3 py-1 text-xs text-zinc-300"
                      title={tooltip}
                    >
                      <span className="font-medium">{formatFieldName(key)}</span>
                      <InfoTooltip text={tooltip} position="top" />
                    </span>
                  ))}
              </div>
            </div>
          </div>
        </details>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main data panel */}
          <div className="space-y-6 lg:col-span-2">
            <div className="rounded-xl border border-zinc-700 bg-zinc-900/50 p-6">
              <h2 className="text-lg font-semibold text-zinc-100">Investigation Data</h2>

              <div className="mt-4 space-y-4">
                {Object.entries(groupByCategory(flatData)).map(([category, fields]) => (
                  <div key={category}>
                    <h3 className="mb-2 text-sm font-medium uppercase tracking-wide text-zinc-500">
                      {formatFieldName(category)}
                    </h3>
                    <div className="grid gap-2 md:grid-cols-2">
                      {Object.entries(fields).map(([key, value]) => {
                        // Get the field name without category prefix for tooltip lookup
                        const fieldKey = key.includes('.') ? key.split('.').pop()! : key;
                        const hasTooltip = FIELD_TOOLTIPS[fieldKey.toLowerCase()];

                        return (
                          <div key={key} className="rounded-lg bg-zinc-800/50 p-3">
                            <div className="text-xs text-zinc-500 flex items-center gap-1">
                              {fieldDescriptions?.[key] || formatFieldName(key)}
                              {hasTooltip && (
                                <InfoTooltip text={hasTooltip} position="top" />
                              )}
                            </div>
                            <div className="mt-1 text-sm text-zinc-200">
                              {formatValue(value)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Raw JSON */}
            <details className="rounded-xl border border-zinc-700 bg-zinc-900/50">
              <summary className="cursor-pointer px-6 py-4 font-medium text-zinc-300 hover:text-zinc-100">
                View Raw JSON
              </summary>
              <div className="border-t border-zinc-700 p-4">
                <pre className="max-h-96 overflow-auto rounded-lg bg-zinc-950 p-4 text-xs text-zinc-400">
                  {JSON.stringify(investigation.raw_data, null, 2)}
                </pre>
              </div>
            </details>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Actions */}
            <div className="rounded-xl border border-zinc-700 bg-zinc-900/50 p-4">
              <h3 className="font-medium text-zinc-100">Actions</h3>
              <div className="mt-3 space-y-2">
                <button
                  onClick={() => router.push(`/investigations/${id}/edit`)}
                  className="w-full rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500"
                >
                  Edit Submission
                </button>
                <button className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-700">
                  Request Review
                </button>
                <button className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-700">
                  Export Data
                </button>
              </div>
            </div>

            {/* Contributions */}
            {investigation.contributions && investigation.contributions.length > 0 && (
              <div className="rounded-xl border border-zinc-700 bg-zinc-900/50 p-4">
                <h3 className="font-medium text-zinc-100">Contributions</h3>
                <div className="mt-3 space-y-2">
                  {investigation.contributions.map((contrib) => (
                    <div key={contrib.id} className="rounded-lg bg-zinc-800/50 p-3 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="capitalize text-zinc-300">
                          {contrib.contribution_type.replace(/_/g, ' ')}
                        </span>
                        <span className="text-xs text-zinc-500">
                          {new Date(contrib.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Reviews */}
            {investigation.triage_reviews && investigation.triage_reviews.length > 0 && (
              <div className="rounded-xl border border-zinc-700 bg-zinc-900/50 p-4">
                <h3 className="font-medium text-zinc-100">Triage Reviews</h3>
                <div className="mt-3 space-y-2">
                  {investigation.triage_reviews.map((review) => (
                    <div key={review.id} className="rounded-lg bg-zinc-800/50 p-3 text-sm">
                      <div className="flex items-center gap-2">
                        {review.score_override && (
                          <span className="text-violet-400">
                            Score: {review.score_override}/10
                          </span>
                        )}
                        {review.status_override && (
                          <span className="capitalize text-zinc-400">
                            {review.status_override}
                          </span>
                        )}
                      </div>
                      {review.review_notes && (
                        <p className="mt-1 text-xs text-zinc-500">{review.review_notes}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

// Helper to group flat data by category
function groupByCategory(flatData: Record<string, unknown>): Record<string, Record<string, unknown>> {
  const groups: Record<string, Record<string, unknown>> = {};

  for (const [key, value] of Object.entries(flatData)) {
    const category = key.includes('.') ? key.split('.')[0] : 'general';
    if (!groups[category]) groups[category] = {};
    groups[category][key] = value;
  }

  return groups;
}

// Helper to format values for display
function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) return value.join(', ') || '-';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}
