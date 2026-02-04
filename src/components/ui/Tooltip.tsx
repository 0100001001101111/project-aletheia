'use client';

/**
 * Tooltip Component
 * Reusable tooltip for explaining technical jargon
 */

import { useState, useRef, useEffect } from 'react';

interface TooltipProps {
  text: string;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export function Tooltip({ text, children, position = 'top' }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  const arrowClasses = {
    top: 'top-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-b-transparent border-t-zinc-700',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-t-transparent border-b-zinc-700',
    left: 'left-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-r-transparent border-l-zinc-700',
    right: 'right-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-l-transparent border-r-zinc-700',
  };

  return (
    <span className="relative inline-flex items-center">
      <span
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onFocus={() => setIsVisible(true)}
        onBlur={() => setIsVisible(false)}
        className="cursor-help"
      >
        {children}
      </span>
      {isVisible && (
        <div
          ref={tooltipRef}
          role="tooltip"
          className={`absolute z-50 w-64 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-300 shadow-lg ${positionClasses[position]}`}
        >
          {text}
          <div className={`absolute h-0 w-0 border-4 ${arrowClasses[position]}`} />
        </div>
      )}
    </span>
  );
}

/**
 * Info icon with tooltip
 * Use next to technical terms
 */
interface InfoTooltipProps {
  text: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export function InfoTooltip({ text, position = 'top' }: InfoTooltipProps) {
  return (
    <Tooltip text={text} position={position}>
      <span
        className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-zinc-700/50 text-xs text-zinc-400 hover:bg-zinc-600/50 hover:text-zinc-300 cursor-help"
        aria-label="More information"
      >
        ?
      </span>
    </Tooltip>
  );
}

/**
 * Pre-defined jargon tooltips
 */
export const JARGON_TOOLTIPS: Record<string, string> = {
  // Core metrics
  confidence_score: "How certain we are this pattern is real, based on how many domains show it and how consistent the data is. Higher = more certain.",
  p_value: "Probability this result happened by chance. Lower = more likely to be real. Scientists typically want p < 0.05 (less than 5% chance of being random).",
  triage_score: "Quality rating from 0-10 based on methodology, data completeness, and source reliability. 7+ means verified.",
  brier_score: "Measures prediction accuracy. Lower = better predictions. 0 = perfect, 1 = completely wrong.",
  domains: "Research categories: Near-Death Experiences, Ganzfeld, Crisis Apparitions, Remote Viewing, and Geophysical anomalies.",
  pattern_matcher: "AI system that scans all investigations to find correlations that appear across multiple research domains.",
  verified: "This submission passed our 4-stage quality check for methodology, source integrity, and data completeness. This verifies the research process, not the phenomenon itself.",
  provisional: "Awaiting review. Data is included in pattern matching but not yet fully verified.",

  // Triage subscores
  source_integrity: "How reliable is the source? 0 = anonymous/unverified, 3 = published study or verified official record.",
  methodology: "How rigorous was the data collection? 0 = no controls, 3 = double-blind with pre-registration.",
  variable_capture: "Were all relevant variables recorded? 0 = minimal data, 2 = comprehensive environmental and temporal data.",
  data_quality: "Is the data complete and consistent? 0 = major gaps, 2 = complete with validation.",

  // Remote viewing protocols
  crv: "Coordinate Remote Viewing. A structured method developed at SRI where viewers describe targets using only coordinates, following specific stages.",
  erv: "Extended Remote Viewing. A deeper, more meditative approach to remote viewing allowing longer sessions and richer imagery.",
  arv: "Associative Remote Viewing. Uses remote viewing to predict future events by associating targets with possible outcomes.",
  sri: "Stanford Research Institute. The laboratory where the US government's remote viewing program was originally developed in the 1970s.",

  // Geophysical terms
  kp_index: "Planetary K-index. Measures global geomagnetic disturbance on a 0-9 scale. Higher values indicate stronger geomagnetic storms.",
  schumann_resonance: "Earth's electromagnetic 'heartbeat' at ~7.83 Hz, caused by lightning activity in the cavity between Earth and ionosphere.",
  piezoelectric: "The ability of certain rocks (especially quartz-bearing) to generate electric charge under mechanical stress like earthquakes.",
  tectonic_stress: "Pressure building along fault lines before earthquakes. Some researchers hypothesize this can produce anomalous lights or EM effects.",

  // NDE terms
  veridical_perception: "Information perceived during an NDE that was later verified as accurate - things the experiencer couldn't have known normally.",
  obe: "Out-of-Body Experience. The sensation of consciousness being located outside the physical body, often reported during NDEs.",
  greyson_scale: "A standardized 16-question scale for measuring the depth and characteristics of near-death experiences. Max score = 32.",

  // Ganzfeld terms
  sender: "In Ganzfeld experiments, the person who views the target and attempts to mentally transmit it to the receiver.",
  receiver: "The participant in sensory deprivation who tries to perceive the target being viewed by the sender.",
  mentation: "The stream of mental imagery, thoughts, and impressions reported by the receiver during a Ganzfeld session.",
  direct_hit: "When the receiver correctly identifies the actual target from a set of options (typically 4), giving a 25% chance baseline.",

  // Statistics
  effect_size: "How strong an effect is, independent of sample size. Cohen's d: 0.2 = small, 0.5 = medium, 0.8 = large.",
  holdout_validation: "Testing a hypothesis on data not used to generate it, preventing overfitting and false positives.",
  confound: "An alternative explanation for results. Good research controls for confounds like selection bias or environmental factors.",
  chi_squared: "A statistical test comparing observed frequencies to expected frequencies. Used to detect non-random patterns.",
  cramers_v: "Effect size measure for chi-squared tests. Ranges 0-1 where 0 = no association, 1 = perfect association.",
};

/**
 * Jargon term with built-in tooltip
 */
interface JargonTermProps {
  term: keyof typeof JARGON_TOOLTIPS;
  children?: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export function JargonTerm({ term, children, position = 'top' }: JargonTermProps) {
  const tooltip = JARGON_TOOLTIPS[term];
  if (!tooltip) {
    return <span>{children || term}</span>;
  }
  return (
    <span className="inline-flex items-center">
      <span>{children || term}</span>
      <InfoTooltip text={tooltip} position={position} />
    </span>
  );
}

/**
 * Submission Form Field Tooltips
 * Help text for all wizard fields
 */
export const FIELD_HELP_TOOLTIPS: Record<string, string> = {
  // Basic Info
  title: "A clear, descriptive title for this investigation. Be specific - e.g., 'NDE during cardiac arrest, Memorial Hospital, 2023'",
  eventDate: "When did this event occur? As precise as possible helps with environmental correlation analysis.",
  eventTime: "Time of day can correlate with geomagnetic activity and other environmental factors.",
  location: "City, state, or region where the event occurred. Used for geographic pattern analysis.",
  latitude: "GPS coordinates enable precise correlation with seismic, geomagnetic, and weather data.",
  longitude: "GPS coordinates enable precise correlation with seismic, geomagnetic, and weather data.",
  description: "Detailed account of what happened. Include all relevant details - duration, sequence of events, any unusual circumstances.",

  // Witnesses
  witnessCount: "How many people directly observed this event? Multiple independent witnesses strengthen credibility.",
  witnessCredibility: "Professional background, expertise, or training relevant to what was observed.",
  primaryWitnessName: "Anonymous ID or name of the main witness (will be anonymized in public data).",
  witnessStatement: "First-hand account in the witness's own words. Direct quotes are more valuable than summaries.",

  // Evidence
  evidenceType: "What kind of documentation do you have? Photos, videos, audio, documents, medical records, etc.",
  sourceReliability: "Where did this evidence come from? Original recordings, official records, and verified sources score higher.",
  chainOfCustody: "Can you trace who has handled this evidence from creation to now? Unbroken chains prevent tampering concerns.",
  analysisNotes: "Any technical analysis performed - equipment used, methodology, findings.",

  // Domain-Specific
  // NDE
  veridicalElements: "Details the experiencer reported that were later verified - things they couldn't have known through normal means.",
  medicalContext: "What medical event triggered this? Cardiac arrest, surgery, accident, etc.",
  obeReported: "Did the experiencer report perceiving events from outside their physical body?",

  // Ganzfeld
  targetType: "What was the sender viewing - static image, video clip, or other?",
  receiverBlinded: "Was the receiver isolated with no way to know what the target was?",
  hitOrMiss: "Did the receiver correctly identify the target from the options?",

  // UFO/UAP
  shape: "Describe the object's shape - disc, triangle, sphere, cigar, lights only, etc.",
  duration: "How long was the object visible? Seconds, minutes, hours?",
  flightCharacteristics: "Movement patterns - hovering, accelerating, sharp turns, etc.",
  physiologicalEffects: "Did observers experience any physical effects? Nausea, burns, time perception changes?",
  emInterference: "Any electronics malfunction during the sighting? Car stalls, radio static, phone issues?",

  // Geophysical
  phenomenonType: "What kind of anomaly? Earthquake lights, unexplained sounds, compass anomalies, etc.",
  seismicActivity: "Any nearby earthquake activity before, during, or after the event?",
  geologicalContext: "What's the local geology? Fault lines, bedrock type, mining activity nearby?",

  // Crisis Apparition
  relationship: "What was the relationship between observer and the person in crisis?",
  crisisType: "What happened to the person who appeared - death, serious injury, danger?",
  timingCoincidence: "How close in time was the apparition to the actual crisis event?",
  verificationMethod: "How was the crisis event independently confirmed?",

  // Remote Viewing
  targetCoordinates: "Geographic or random coordinates used as the target identifier.",
  viewerBlinding: "Was the viewer completely blind to the target's identity?",
  sessionProtocol: "What remote viewing protocol was used? CRV, ERV, ARV, etc.",
  correspondenceScore: "Rating of how well the viewer's impressions matched the actual target.",
};

/**
 * Form Field with Label and Help Tooltip
 */
interface FormFieldProps {
  label: string;
  helpKey?: keyof typeof FIELD_HELP_TOOLTIPS;
  helpText?: string;
  required?: boolean;
  children: React.ReactNode;
}

export function FormField({ label, helpKey, helpText, required, children }: FormFieldProps) {
  const tooltip = helpKey ? FIELD_HELP_TOOLTIPS[helpKey] : helpText;

  return (
    <div className="space-y-1">
      <label className="flex items-center gap-1 text-sm font-medium text-zinc-300">
        {label}
        {required && <span className="text-red-400">*</span>}
        {tooltip && <InfoTooltip text={tooltip} />}
      </label>
      {children}
    </div>
  );
}
