'use client';

/**
 * Investigation View Page
 * View a single investigation submission
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { SCHEMA_METADATA, flattenToDotNotation, getFieldDescriptions } from '@/schemas';
import { getTriageScoreColor, getTriageStatusColor } from '@/lib/triage';
import { formatFieldName, formatValue as formatVal } from '@/lib/format';
import { InfoTooltip, JARGON_TOOLTIPS } from '@/components/ui/Tooltip';
import { CollapsibleSection } from '@/components/ui/CollapsibleSection';
import { StoryLayout, extractStoryData } from '@/components/investigation/StoryLayout';
import type { InvestigationType, TriageStatus } from '@/types/database';

// Investigation type explainers
const TYPE_EXPLAINERS: Partial<Record<InvestigationType, string>> = {
  ganzfeld: "In a Ganzfeld experiment, a 'receiver' in sensory deprivation tries to identify a hidden 'target' image or video being viewed by a 'sender.' A 'hit' means they correctly identified the target from a set of decoys. This tests whether information can transfer between isolated individuals.",
  nde: "Near-death experiences occur during clinical death or life-threatening crisis. Researchers document what subjects report seeing or experiencing, then verify whether any details could be confirmed (veridical perception).",
  crisis_apparition: "Crisis apparitions are reports of seeing or sensing someone at the moment they experience death or severe trauma, often before the observer could have known.",
  stargate: "Remote viewing sessions task a 'viewer' with describing a hidden target location or object using only mental focus. Responses are rated on accuracy.",
  geophysical: "Geophysical investigations correlate unusual phenomena with environmental factors like seismic activity, electromagnetic fields, or geological composition.",
  ufo: "UFO/UAP investigations document unidentified aerial phenomena with attention to potential correlations with geomagnetic conditions and physiological effects on witnesses. Note: The SPECTER seismic hypothesis was tested but did not survive rigorous statistical analysis.",
  bigfoot: "Bigfoot/Sasquatch sightings are reports of large, bipedal, ape-like creatures in wilderness areas. BFRO classifies sightings: Class A (clear visual), Class B (possible/obscured), Class C (secondhand report).",
  haunting: "Haunted location reports document unexplained phenomena at specific places - apparitions, sounds, cold spots, object movement. Often correlate with historical trauma or death at the location.",
  crop_circle: "Crop circles are geometric patterns of flattened crops, predominantly found in UK. While many are hoaxes, some exhibit unusual characteristics like bent (not broken) stalks and localized radiation.",
  bermuda_triangle: "Bermuda Triangle incidents involve ships and aircraft that disappeared in the Atlantic region between Miami, Bermuda, and Puerto Rico. Most have mundane explanations, but some remain unexplained.",
  hotspot: "High Strangeness Hotspots are locations with multiple types of anomalous reports - UFOs, cryptids, hauntings - often with unusual geological or magnetic properties.",
};

// Field-specific tooltips for investigation data
const FIELD_TOOLTIPS: Record<string, string> = {
  hit: "Did the receiver correctly identify the target?",
  target: "The image, video, or location being identified",
  receiver: "Anonymous ID of the person attempting to receive",
  source: "The database or study this came from",
  triage_score: "Quality rating from 0-10 based on methodology, not results",
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
function generateInvestigationSummary(type: InvestigationType, data: Record<string, unknown>, description?: string, title?: string): string {
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

    case 'bigfoot': {
      const classification = data.classification as Record<string, unknown> | undefined;
      const classType = classification?.class as string;
      const classDesc = classification?.class_description as string;
      const reportMeta = data.report_metadata as Record<string, unknown> | undefined;
      const source = reportMeta?.source || 'BFRO';
      const reportNum = reportMeta?.report_number;
      const location = data.location as Record<string, unknown> | undefined;

      // Extract the sighting narrative from title (format: "Report XXXX: <description>")
      const titleMatch = title?.match(/Report \d+:\s*(.+)$/i);
      const narrative = titleMatch?.[1] || description || title || 'Sighting details not available';

      let summary = `**${source} Report #${reportNum}**: ${narrative}`;

      if (classType) {
        const classExplain: Record<string, string> = {
          'A': 'Class A sighting - clear, unambiguous visual observation at close range in good conditions.',
          'B': 'Class B sighting - possible sighting but conditions (distance, lighting, foliage) leave some ambiguity.',
          'C': 'Class C report - secondhand account or other less direct evidence.',
        };
        summary += ` ${classExplain[classType] || `Classification: ${classType} (${classDesc})`}`;
      }

      if (location?.lat && location?.lng) {
        summary += ` Location: ${location.lat}, ${location.lng}.`;
      }

      return summary;
    }

    case 'haunting': {
      const location = data.location as Record<string, unknown> | undefined;
      const phenomena = data.phenomena as string[] | undefined;
      const historicalContext = data.historical_context as string | undefined;
      const witnesses = data.witness_count || data.witnesses;

      // Extract location name from title (format: "Location Name, ST - Haunted Location")
      const titleMatch = title?.match(/^([^-]+)\s*-/i);
      const locationName = titleMatch?.[1]?.trim() || title || 'Haunted location';

      let summary = `**${locationName}**: `;

      if (phenomena && phenomena.length > 0) {
        summary += `Reported phenomena include ${phenomena.join(', ')}. `;
      } else {
        summary += 'This location has documented reports of unexplained phenomena. ';
      }

      if (historicalContext) {
        summary += `Historical context: ${historicalContext} `;
      }

      if (witnesses) {
        summary += `Number of documented witnesses: ${witnesses}. `;
      }

      if (location?.lat && location?.lng) {
        summary += `Coordinates: ${location.lat}, ${location.lng}.`;
      }

      return summary;
    }

    case 'bermuda_triangle': {
      const vessel = data.vessel as string;
      const vesselType = data.type as string;
      const crew = data.crew as number;
      const date = data.date || data.event_date;
      const location = data.location as Record<string, unknown> | undefined;
      const lastKnown = location?.last_known || location?.route;
      const source = data.source as string;

      let summary = '';

      if (description) {
        summary = description;
      } else {
        summary = `The ${vesselType || 'vessel'} ${vessel || 'unknown'}`;
        if (crew) summary += ` with ${crew} aboard`;
        summary += ' disappeared in the Bermuda Triangle region.';
      }

      if (lastKnown && !description?.includes(String(lastKnown))) {
        summary += ` Last known position: ${lastKnown}.`;
      }

      if (date) {
        summary += ` Date: ${date}.`;
      }

      if (source && !description?.includes(source)) {
        summary += ` Source: ${source}.`;
      }

      return summary;
    }

    case 'cryptid': {
      const cryptidType = data.cryptid_type || data.creature_type;
      const location = data.location as Record<string, unknown> | undefined;
      const witnesses = data.witness_count || data.witnesses;
      const classification = data.classification as Record<string, unknown> | undefined;

      let summary = description || `Sighting of ${cryptidType || 'unidentified creature'}`;

      if (classification?.class) {
        summary += ` Classification: ${classification.class}`;
        if (classification.class_description) {
          summary += ` (${classification.class_description})`;
        }
        summary += '.';
      }

      if (witnesses) {
        summary += ` Witnesses: ${witnesses}.`;
      }

      if (location?.lat && location?.lng) {
        summary += ` Location: ${location.lat}, ${location.lng}.`;
      }

      return summary;
    }

    case 'cattle_mutilation': {
      const date = data.date || data.event_date;
      const location = data.location as Record<string, unknown> | undefined;
      const animalType = String(data.animal_type || 'cattle');
      const characteristics = data.characteristics as string[] | undefined;
      const source = data.source;

      let summary = description || `${animalType.charAt(0).toUpperCase() + animalType.slice(1)} mutilation incident`;

      if (date && !summary.includes(String(date))) {
        summary += ` Date: ${date}.`;
      }

      if (characteristics && characteristics.length > 0) {
        summary += ` Noted characteristics: ${characteristics.join(', ')}.`;
      }

      if (location?.lat && location?.lng) {
        summary += ` Location: ${location.lat}, ${location.lng}.`;
      }

      if (source) {
        summary += ` Source: ${source}.`;
      }

      return summary;
    }

    case 'crop_circle': {
      const date = data.date || data.event_date;
      const location = data.location as Record<string, unknown> | undefined;
      const diameter = data.diameter || data.size;
      const pattern = data.pattern_type || data.design;
      const country = data.country || 'UK';

      let summary = description || 'Crop circle formation discovered';

      if (pattern && !summary.includes(String(pattern))) {
        summary += ` Pattern: ${pattern}.`;
      }

      if (diameter) {
        summary += ` Size: ${diameter}${typeof diameter === 'number' ? ' meters' : ''}.`;
      }

      if (date && !summary.includes(String(date))) {
        summary += ` Date: ${date}.`;
      }

      if (location?.lat && location?.lng) {
        summary += ` Location: ${location.lat}, ${location.lng} (${country}).`;
      }

      return summary;
    }

    case 'hotspot': {
      const location = data.location as Record<string, unknown> | undefined;
      const phenomena = (data.phenomena_types || data.phenomena) as string[] | undefined;
      const incidentCount = data.incident_count || data.reports;
      const notes = data.notes as string | undefined;
      const sources = data.sources as string | undefined;

      let summary = notes || description || 'High strangeness hotspot - location with multiple types of anomalous reports';

      if (phenomena && phenomena.length > 0) {
        summary += ` Reported phenomena: ${phenomena.join(', ')}.`;
      }

      if (incidentCount) {
        summary += ` Total documented incidents: ${incidentCount}.`;
      }

      if (sources) {
        summary += ` Sources: ${sources}.`;
      }

      if (location?.lat && location?.lng) {
        summary += ` Coordinates: ${location.lat}, ${location.lng}.`;
      }

      return summary;
    }

    case 'men_in_black': {
      const date = data.date || data.event_date;
      const location = data.location as Record<string, unknown> | undefined;
      const context = data.context || data.related_incident;
      const witnesses = data.witness_count || data.witnesses;

      let summary = description || 'Men in Black encounter reported';

      if (context && !summary.includes(String(context))) {
        summary += ` Context: ${context}.`;
      }

      if (date && !summary.includes(String(date))) {
        summary += ` Date: ${date}.`;
      }

      if (witnesses) {
        summary += ` Witnesses: ${witnesses}.`;
      }

      if (location?.lat && location?.lng) {
        summary += ` Location: ${location.lat}, ${location.lng}.`;
      }

      return summary;
    }

    default:
      // For unknown types, try to construct something useful from available data
      if (description) {
        return description;
      }
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
  triage_source_integrity: number | null;
  triage_methodology: number | null;
  triage_variable_capture: number | null;
  triage_data_quality: number | null;
  tier: 'research' | 'exploratory';
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

// Generate human-readable display title from investigation data
function generateDisplayTitle(type: InvestigationType, data: Record<string, unknown>, originalTitle: string): string {
  switch (type) {
    case 'stargate': {
      const docId = data.doc_id as string;
      const outcome = data.outcome as string;
      const year = docId?.match(/(\d{4})/)?.[1] || '';

      // Try to extract meaningful target description
      let targetDesc = 'Unknown Target';
      const targetType = data.target_type;
      const target = data.target;

      // Handle various target formats
      if (typeof targetType === 'string' && targetType.length > 0) {
        targetDesc = targetType;
      } else if (typeof target === 'string' && target.length > 0) {
        targetDesc = target.substring(0, 40);
      } else if (target && typeof target === 'object' && 'name' in target) {
        targetDesc = String((target as Record<string, unknown>).name);
      } else if (originalTitle && !originalTitle.startsWith('CIA') && !originalTitle.startsWith('STARGATE')) {
        // Use original title if it's descriptive
        const titleMatch = originalTitle.match(/Session[:\s]+(.+)$/i);
        targetDesc = titleMatch?.[1] || 'Classified Target';
      } else {
        targetDesc = 'Classified Target';
      }

      const yearSuffix = year ? ` (${year})` : '';
      const resultSuffix = outcome?.toLowerCase().includes('success') ? ' - Hit' : '';
      return `Remote Viewing: ${targetDesc}${yearSuffix}${resultSuffix}`;
    }

    case 'ganzfeld': {
      const hit = data.hit as boolean;
      const target = data.target;
      const recordNum = data.record_num;

      // Try to extract target from various sources
      let targetDesc = 'Trial';

      // First try to extract from original title like "Ganzfeld Trial #38: TWO HUNTERS AND LARGE TREE"
      const titleMatch = originalTitle?.match(/Ganzfeld Trial #\d+:\s*(.+)$/i);
      if (titleMatch && titleMatch[1]) {
        targetDesc = titleMatch[1].length > 30 ? titleMatch[1].substring(0, 30) + '...' : titleMatch[1];
      } else if (typeof target === 'string' && target.length > 0) {
        targetDesc = target.length > 30 ? target.substring(0, 30) + '...' : target;
      } else if (recordNum && typeof recordNum !== 'object') {
        targetDesc = `#${recordNum}`;
      }

      const result = hit === true ? 'Hit' : hit === false ? 'Miss' : 'Unknown';
      return `Ganzfeld Trial: ${targetDesc} (${result})`;
    }

    case 'nde': {
      const trigger = data.trigger || data.medical_event as string;
      const veridical = data.veridical_elements || data.verified_perceptions;
      const triggerDesc = trigger ? String(trigger).substring(0, 30) : 'Medical Event';
      const veridicalNote = veridical ? ' with Veridical Perception' : '';
      return `NDE${veridicalNote}: ${triggerDesc}`;
    }

    case 'crisis_apparition': {
      const deltaT = data.delta_t_minutes as number;
      const isGold = data.is_gold_standard as boolean;
      const timingDesc = deltaT === 0 ? 'Simultaneous' :
                         deltaT < 0 ? 'Precognitive' : 'Post-event';
      const goldNote = isGold ? ' (Gold Standard)' : '';
      return `Crisis Apparition: ${timingDesc}${goldNote}`;
    }

    case 'ufo': {
      const shape = data.shape as string;
      const location = data.location as Record<string, unknown>;
      const city = location?.city || data.city as string;
      const state = location?.state || data.state as string;
      const shapeDesc = shape ? `${shape} Object` : 'UAP';
      const locationDesc = city ? `${city}${state ? `, ${state}` : ''}` : 'Unknown Location';
      return `UAP Sighting: ${shapeDesc} - ${locationDesc}`;
    }

    case 'geophysical': {
      const phenomenonType = data.phenomenon_type as string;
      const city = data.city as string;
      const typeDesc = phenomenonType?.replace(/_/g, ' ') || 'Anomaly';
      return `Geophysical: ${typeDesc}${city ? ` - ${city}` : ''}`;
    }

    case 'bigfoot': {
      const classification = data.classification as Record<string, unknown>;
      const classType = classification?.class as string;
      const reportMeta = data.report_metadata as Record<string, unknown>;
      const reportNum = reportMeta?.report_number;
      const reportNumStr = reportNum && typeof reportNum !== 'object' ? String(reportNum) : null;
      return `Bigfoot Sighting: Class ${classType || '?'}${reportNumStr ? ` (#${reportNumStr})` : ''}`;
    }

    case 'haunting': {
      const phenomena = data.phenomena as string[];
      const phenomenaDesc = phenomena?.slice(0, 2).join(', ') || 'Unexplained Activity';
      return `Haunting: ${phenomenaDesc}`;
    }

    default:
      return originalTitle;
  }
}

// Generate plain-English TL;DR summary
function generateTldrSummary(type: InvestigationType, data: Record<string, unknown>, score: number): string {
  const isHighQuality = score >= 7;

  switch (type) {
    case 'stargate': {
      const outcome = data.outcome as string;
      const isSuccess = outcome?.toLowerCase().includes('success');
      if (isSuccess) {
        return "A trained remote viewer successfully described a hidden target using only mental focus - matching details they had no normal way to know.";
      }
      return "A remote viewing session where a trained viewer attempted to describe a hidden target. Results are documented for pattern analysis.";
    }

    case 'ganzfeld': {
      const hit = data.hit as boolean;
      if (hit === true) {
        return "In sensory deprivation, a receiver correctly identified a hidden target image from a set of options - beating 25% chance.";
      } else if (hit === false) {
        return "A Ganzfeld trial where the receiver did not identify the correct target. Included for statistical analysis of overall hit rates.";
      }
      return "A controlled telepathy experiment using sensory deprivation to test information transfer between isolated individuals.";
    }

    case 'nde': {
      const veridical = data.veridical_elements || data.verified_perceptions;
      if (veridical) {
        return "A near-death experience where the subject reported verifiable details they couldn't have known through normal means while clinically unconscious.";
      }
      return "A documented near-death experience during a life-threatening medical event, with detailed phenomenological data for pattern analysis.";
    }

    case 'crisis_apparition': {
      const isGold = data.is_gold_standard as boolean;
      const deltaT = data.delta_t_minutes as number;
      if (isGold) {
        return "A verified case where someone perceived a person in crisis before learning about it - meeting strict evidential standards with independent corroboration.";
      }
      const timing = deltaT === 0 ? 'at the exact moment' : deltaT < 0 ? 'before' : 'shortly after';
      return `An apparition was observed ${timing} the crisis event, with no normal means of knowing about it at that time.`;
    }

    case 'ufo': {
      const witnessCount = data.witness_count as number;
      const effects = data.effects as Record<string, unknown>;
      const hasEffects = effects?.physiological_effects || effects?.em_interference;
      const witnessNote = witnessCount > 1 ? `Multiple witnesses (${witnessCount}) observed` : 'Witness observed';
      const effectNote = hasEffects ? ' with associated physical or electromagnetic effects.' : '.';
      return `${witnessNote} an unidentified aerial phenomenon${effectNote}`;
    }

    case 'geophysical': {
      return "An anomalous phenomenon being analyzed for correlations with seismic activity, electromagnetic fields, and geological factors.";
    }

    default:
      return isHighQuality
        ? "A high-quality investigation record used for cross-domain pattern analysis."
        : "An investigation record included in the exploratory dataset for pattern detection.";
  }
}

// Generate domain-specific significance statement for high-scoring records
function generateSignificance(type: InvestigationType, data: Record<string, unknown>, score: number): string | null {
  if (score < 6) return null;

  switch (type) {
    case 'stargate': {
      const outcome = data.outcome as string;
      if (outcome?.toLowerCase().includes('success')) {
        return "If replicated, remote viewing would suggest consciousness can access information beyond the physical senses, challenging our understanding of perception and physics.";
      }
      return null;
    }

    case 'ganzfeld': {
      const hit = data.hit as boolean;
      if (hit === true) {
        return "Consistent above-chance hit rates in Ganzfeld studies would indicate information can transfer between isolated minds - a phenomenon with no conventional explanation.";
      }
      return null;
    }

    case 'nde': {
      const veridical = data.veridical_elements || data.verified_perceptions;
      if (veridical) {
        return "Verified perceptions during clinical death raise fundamental questions about consciousness, suggesting it may not be entirely dependent on brain activity.";
      }
      return "Well-documented NDEs contribute to our understanding of consciousness during extreme physiological states.";
    }

    case 'crisis_apparition': {
      const isGold = data.is_gold_standard as boolean;
      if (isGold) {
        return "Gold-standard crisis apparitions, if validated, would demonstrate a form of non-local connection between individuals under extreme stress.";
      }
      return null;
    }

    case 'ufo': {
      const effects = data.effects as Record<string, unknown>;
      if (effects?.physiological_effects || effects?.em_interference) {
        return "Physical effects associated with UAP sightings suggest something measurable is occurring, whether conventional or unexplained.";
      }
      return null;
    }

    case 'geophysical': {
      return "Understanding correlations between anomalous phenomena and geophysical factors could reveal natural explanations or new physics.";
    }

    default:
      return null;
  }
}

interface PageProps {
  params: { id: string };
}

// Technical fields to hide by default per domain
const TECHNICAL_FIELDS: Record<string, string[]> = {
  stargate: ['doc_id', 'source', 'session_id', 'ratings', 'viewer_number', 'coordinate'],
  ganzfeld: ['record_num', 'receiver', 'source', 'sender_id', 'session_id'],
  nde: ['case_id', 'source', 'study_code', 'patient_id'],
  crisis_apparition: ['case_id', 'source', 'catalog_id'],
  ufo: ['case_id', 'source', 'report_id', 'geomagnetic', 'confounds'],
  geophysical: ['source', 'station_id', 'sensor_id', 'raw_readings'],
  bigfoot: ['report_metadata', 'source'],
  haunting: ['case_id', 'source'],
};

export default function InvestigationPage({ params }: PageProps) {
  const { id } = params;
  const router = useRouter();
  const [investigation, setInvestigation] = useState<Investigation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showTechnical, setShowTechnical] = useState(false);

  // Load preference from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('investigation-show-technical');
    if (saved === 'true') setShowTechnical(true);
  }, []);

  // Save preference to localStorage
  const toggleTechnical = () => {
    const newValue = !showTechnical;
    setShowTechnical(newValue);
    localStorage.setItem('investigation-show-technical', String(newValue));
  };

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
  const displayTitle = generateDisplayTitle(investigation.type, investigation.raw_data, investigation.title);
  const tldrSummary = generateTldrSummary(investigation.type, investigation.raw_data, investigation.triage_score);
  const significance = generateSignificance(investigation.type, investigation.raw_data, investigation.triage_score);
  const hasSubscores = investigation.triage_source_integrity != null || investigation.triage_methodology != null;

  // Filter out technical fields when toggle is off
  const technicalFieldsForType = TECHNICAL_FIELDS[investigation.type] || [];
  const isTechnicalField = (key: string): boolean => {
    const rootKey = key.split('.')[0];
    return technicalFieldsForType.includes(rootKey);
  };
  const visibleData = showTechnical
    ? flatData
    : Object.fromEntries(Object.entries(flatData).filter(([key]) => !isTechnicalField(key)));
  const hiddenCount = Object.keys(flatData).length - Object.keys(visibleData).length;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Top Navigation Bar */}
      <nav className="border-b border-zinc-800 bg-zinc-900/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-zinc-400 hover:text-zinc-100 transition-colors">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-blue-500 flex items-center justify-center">
              <span className="text-white font-bold">A</span>
            </div>
            <span className="font-semibold text-zinc-100">Aletheia</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/investigations" className="text-sm text-zinc-400 hover:text-zinc-100 transition-colors">
              ← Back to Investigations
            </Link>
          </div>
        </div>
      </nav>

      {/* Tier Badge Banner */}
      {investigation.tier === 'exploratory' && (
        <div className="border-b border-zinc-700 bg-zinc-800/50">
          <div className="mx-auto max-w-6xl px-4 py-3">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium bg-zinc-600/30 text-zinc-300 border border-zinc-500/30">
                <span className="w-2 h-2 rounded-full bg-zinc-400" />
                Exploratory Data
              </span>
              <span className="text-sm text-zinc-400">
                This record is from bulk import and hasn&apos;t been individually verified. Quality score is estimated.
              </span>
            </div>
          </div>
        </div>
      )}
      {investigation.tier === 'research' && (
        <div className="border-b border-emerald-500/20 bg-emerald-900/10">
          <div className="mx-auto max-w-6xl px-4 py-3">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium bg-emerald-600/20 text-emerald-400 border border-emerald-500/30">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                Research Data
              </span>
              <span className="text-sm text-emerald-300/70">
                This record passed quality review and is used for pattern analysis and predictions.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Header with Display Title */}
      <header className="border-b border-zinc-800 bg-zinc-900/50">
        <div className="mx-auto max-w-6xl px-4 py-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span className={`text-3xl ${metadata.color}`}>{metadata.icon}</span>
                <div>
                  <h1 className="text-2xl font-bold text-zinc-100">{displayTitle}</h1>
                  <p className="text-zinc-400">{metadata.name}</p>
                </div>
              </div>
              {/* Original ID shown as metadata */}
              {displayTitle !== investigation.title && (
                <p className="text-xs text-zinc-500 mt-1 ml-12">
                  Original ID: <code className="rounded bg-zinc-800 px-1.5 py-0.5">{investigation.title}</code>
                </p>
              )}
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
        {/* What am I looking at? - Collapsed explainer at top */}
        {TYPE_EXPLAINERS[investigation.type] && (
          <CollapsibleSection
            title="What am I looking at?"
            defaultOpen={false}
            icon={
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            className="mb-6"
          >
            <p className="text-sm text-zinc-400 leading-relaxed mb-4">
              {TYPE_EXPLAINERS[investigation.type]}
            </p>
            <div className="pt-4 border-t border-zinc-700/50">
              <h4 className="text-xs font-medium uppercase tracking-wide text-zinc-500 mb-2">Key Terms</h4>
              <div className="flex flex-wrap gap-2">
                {Object.entries(FIELD_TOOLTIPS)
                  .filter(([key]) => {
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
                    >
                      <span className="font-medium">{formatFieldName(key)}</span>
                      <InfoTooltip text={tooltip} position="top" />
                    </span>
                  ))}
              </div>
            </div>
          </CollapsibleSection>
        )}

        {/* Story-First Layout - Shows narrative structure when available */}
        {(() => {
          const storyData = extractStoryData(investigation.type, investigation.raw_data, investigation.description);
          if (storyData.hasStory) {
            return (
              <div className="mb-6">
                <StoryLayout
                  type={investigation.type}
                  data={investigation.raw_data}
                  description={investigation.description}
                />
                {/* Quick stats bar below story */}
                <div className="mt-4 flex flex-wrap items-center gap-4 text-sm px-1">
                  <span className={`font-medium ${scoreColor}`}>
                    Quality: {investigation.triage_score}/10
                  </span>
                  <span className={`capitalize ${statusColor}`}>
                    {investigation.triage_status}
                  </span>
                  <span className="text-zinc-500">
                    {metadata.name}
                  </span>
                </div>
              </div>
            );
          }
          // Fallback to generic TL;DR for types without story extraction
          return (
            <div className="mb-6 rounded-xl border border-violet-500/30 bg-gradient-to-r from-violet-950/30 to-zinc-900 p-6">
              <div className="flex items-start gap-4">
                <span className={`text-4xl ${metadata.color}`}>{metadata.icon}</span>
                <div className="flex-1">
                  <h2 className="text-lg font-semibold text-zinc-100 mb-2">TL;DR</h2>
                  <p className="text-zinc-300 leading-relaxed">{tldrSummary}</p>
                  <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
                    <span className={`font-medium ${scoreColor}`}>
                      Quality: {investigation.triage_score}/10
                    </span>
                    <span className={`capitalize ${statusColor}`}>
                      {investigation.triage_status}
                    </span>
                    <span className="text-zinc-500">
                      {metadata.name}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Why This Matters - For high-scoring records */}
        {significance && (
          <div className="mb-6 rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-6">
            <h2 className="text-lg font-semibold text-emerald-400 mb-3 flex items-center gap-2">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Why This Matters
            </h2>
            <p className="text-emerald-200/80 leading-relaxed">{significance}</p>
          </div>
        )}

        {/* Score Breakdown - Open by default */}
        {hasSubscores && (
          <CollapsibleSection
            title="Quality Score Breakdown"
            defaultOpen={true}
            icon={
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            }
            className="mb-6"
          >
            <div className="space-y-4">
              <p className="text-sm text-zinc-400">
                Quality score is calculated by multiplying four factors. Each factor rates a different aspect of data quality.
              </p>
              <div className="flex items-center gap-2 flex-wrap font-mono text-sm">
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-zinc-800">
                  <span className="text-zinc-400">Source</span>
                  <span className={investigation.triage_source_integrity === 3 ? 'text-emerald-400' : investigation.triage_source_integrity === 2 ? 'text-amber-400' : 'text-red-400'}>
                    {investigation.triage_source_integrity ?? 0}/3
                  </span>
                  <InfoTooltip text={JARGON_TOOLTIPS.source_integrity} position="top" />
                </span>
                <span className="text-zinc-500">×</span>
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-zinc-800">
                  <span className="text-zinc-400">Method</span>
                  <span className={investigation.triage_methodology === 3 ? 'text-emerald-400' : investigation.triage_methodology === 2 ? 'text-amber-400' : 'text-red-400'}>
                    {investigation.triage_methodology ?? 0}/3
                  </span>
                  <InfoTooltip text={JARGON_TOOLTIPS.methodology} position="top" />
                </span>
                <span className="text-zinc-500">×</span>
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-zinc-800">
                  <span className="text-zinc-400">Variables</span>
                  <span className={investigation.triage_variable_capture === 2 ? 'text-emerald-400' : investigation.triage_variable_capture === 1 ? 'text-amber-400' : 'text-red-400'}>
                    {investigation.triage_variable_capture ?? 0}/2
                  </span>
                  <InfoTooltip text={JARGON_TOOLTIPS.variable_capture} position="top" />
                </span>
                <span className="text-zinc-500">×</span>
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-zinc-800">
                  <span className="text-zinc-400">Data</span>
                  <span className={investigation.triage_data_quality === 2 ? 'text-emerald-400' : investigation.triage_data_quality === 1 ? 'text-amber-400' : 'text-red-400'}>
                    {investigation.triage_data_quality ?? 0}/2
                  </span>
                  <InfoTooltip text={JARGON_TOOLTIPS.data_quality} position="top" />
                </span>
                <span className="text-zinc-500">=</span>
                <span className={`px-2 py-1 rounded bg-zinc-700 font-bold ${scoreColor}`}>
                  {investigation.triage_score}/10
                </span>
              </div>
            </div>
          </CollapsibleSection>
        )}

        {/* What Happened - Open by default */}
        <CollapsibleSection
          title="What Happened"
          defaultOpen={true}
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          className="mb-6"
        >
          <p className="text-zinc-300 leading-relaxed">
            {generateInvestigationSummary(investigation.type, investigation.raw_data, investigation.description, investigation.title)}
          </p>
        </CollapsibleSection>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main data panel */}
          <div className="space-y-6 lg:col-span-2">
            {/* Investigation Data - Collapsed by default */}
            <CollapsibleSection
              title="Investigation Data"
              defaultOpen={false}
              icon={
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2 1 3 3 3h10c2 0 3-1 3-3V7c0-2-1-3-3-3H7C5 4 4 5 4 7z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9h6M9 13h6M9 17h4" />
                </svg>
              }
              badge={
                <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded-full">
                  {Object.keys(visibleData).length} fields
                  {hiddenCount > 0 && !showTechnical && ` (${hiddenCount} hidden)`}
                </span>
              }
            >
              <div className="space-y-4">
                {/* Technical fields toggle */}
                {hiddenCount > 0 && (
                  <button
                    onClick={toggleTechnical}
                    className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1.5"
                  >
                    <svg className={`h-3.5 w-3.5 transition-transform ${showTechnical ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                    {showTechnical ? 'Hide technical fields' : `Show all (${hiddenCount} hidden)`}
                  </button>
                )}
                {Object.entries(groupByCategory(visibleData)).map(([category, fields]) => (
                  <div key={category}>
                    <h3 className="mb-2 text-sm font-medium uppercase tracking-wide text-zinc-500">
                      {formatFieldName(category)}
                    </h3>
                    <div className="grid gap-2 md:grid-cols-2">
                      {Object.entries(fields).map(([key, value]) => {
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
            </CollapsibleSection>

            {/* Raw JSON - Collapsed by default */}
            <CollapsibleSection
              title="Raw JSON"
              defaultOpen={false}
              icon={
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
              }
            >
              <pre className="max-h-96 overflow-auto rounded-lg bg-zinc-950 p-4 text-xs text-zinc-400">
                {JSON.stringify(investigation.raw_data, null, 2)}
              </pre>
            </CollapsibleSection>
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
