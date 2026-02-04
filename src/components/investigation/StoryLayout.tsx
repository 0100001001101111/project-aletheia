'use client';

/**
 * Story-First Layout for Investigation Detail Pages
 *
 * Transforms raw investigation data into a compelling narrative structure:
 * 1. THE CHALLENGE - What was the setup?
 * 2. WHAT THEY SAW/EXPERIENCED - Actual words/impressions
 * 3. THE TARGET/REALITY - What was it really?
 * 4. THE VERDICT - Did it match?
 */

import type { InvestigationType } from '@/types/database';

interface StorySection {
  icon: string;
  title: string;
  content: string | React.ReactNode;
  highlight?: boolean;
}

interface StoryData {
  sections: StorySection[];
  hasStory: boolean;
}

// Extract story elements from STARGATE data
function extractStargateStory(data: Record<string, unknown>, description?: string): StoryData {
  const session = data.session as Record<string, unknown> | undefined;
  const target = data.target as Record<string, unknown> | undefined;
  const impressions = data.impressions as Record<string, unknown> | undefined;
  const evaluation = data.evaluation as Record<string, unknown> | undefined;
  const protocol = data.protocol as Record<string, unknown> | undefined;
  const transcript = data.session_transcript as string | undefined;
  const researcherNotes = data.researcher_notes as string | undefined;

  // Build the challenge section
  const sessionDate = session?.date || data.session_date;
  const coordinates = target?.coordinates || data.coordinate;
  const protocolType = protocol?.type || 'remote viewing';
  const blindLevel = protocol?.blind_level || 'blind';
  const viewerLocation = (data.environment as Record<string, unknown>)?.viewer_location;

  let challengeText = '';
  if (sessionDate) {
    const date = new Date(sessionDate as string);
    challengeText += `${date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}. `;
  }
  if (viewerLocation) {
    challengeText += `A viewer sits in a secure room at ${viewerLocation}. `;
  } else {
    challengeText += 'A viewer sits in a windowless room. ';
  }
  if (coordinates) {
    challengeText += `Given only a coordinate: **${coordinates}**. `;
  }
  challengeText += `No maps. No hints. No context. Protocol: ${String(protocolType).toUpperCase()}, ${blindLevel}-blind. `;
  challengeText += 'Task: describe what exists at this location using only mental focus.';

  // Build the "what they saw" section from transcript or impressions
  let sawContent: React.ReactNode = null;

  if (transcript) {
    // Format transcript entries
    const lines = transcript.split('\n').slice(0, 6); // First 6 lines
    sawContent = (
      <div className="space-y-2 font-mono text-sm">
        {lines.map((line, i) => (
          <div key={i} className="text-zinc-300">{line}</div>
        ))}
        {transcript.split('\n').length > 6 && (
          <div className="text-zinc-500 italic">... {transcript.split('\n').length - 6} more entries</div>
        )}
      </div>
    );
  } else if (impressions) {
    const sensory = impressions.sensory as Record<string, string[]> | undefined;
    const summary = impressions.summary_description as string;
    const visual = sensory?.visual?.slice(0, 4) || [];
    const olfactory = sensory?.olfactory || [];
    const emotional = sensory?.emotional || [];

    sawContent = (
      <div className="space-y-3">
        {visual.length > 0 && (
          <p className="text-zinc-300">
            <span className="text-zinc-500">Visual:</span> "{visual.join(', ')}"
          </p>
        )}
        {olfactory.length > 0 && (
          <p className="text-zinc-300">
            <span className="text-zinc-500">Smell:</span> "{olfactory.join(', ')}"
          </p>
        )}
        {emotional.length > 0 && (
          <p className="text-zinc-300">
            <span className="text-zinc-500">Feeling:</span> "{emotional.join(', ')}"
          </p>
        )}
        {summary && (
          <p className="text-zinc-200 font-medium mt-2">"{summary}"</p>
        )}
      </div>
    );
  }

  // Build the target section
  const targetDesc = target?.target_description_post_session || target?.description;
  const targetType = target?.type;
  const distance = (data.environment as Record<string, unknown>)?.target_distance_miles;

  let targetText = '';
  if (targetDesc) {
    targetText = String(targetDesc);
    if (distance) {
      targetText += ` — ${Number(distance).toLocaleString()} miles away`;
    }
  }

  // Build the verdict section
  const hitMiss = evaluation?.hit_miss || data.outcome;
  const correspondenceScore = evaluation?.correspondence_score;
  const scoreMax = evaluation?.score_scale_max || 7;
  const isHit = String(hitMiss).toLowerCase().includes('hit') ||
                String(hitMiss).toLowerCase().includes('success');

  let verdictText = isHit ? '✓ VERIFIED MATCH' : '✗ NO MATCH';
  if (correspondenceScore !== undefined) {
    verdictText += ` • Score: ${correspondenceScore}/${scoreMax}`;
  }
  if (researcherNotes) {
    verdictText += `\n\n"${researcherNotes.substring(0, 200)}${researcherNotes.length > 200 ? '...' : ''}"`;
  }

  const sections: StorySection[] = [
    {
      icon: '🎯',
      title: 'THE CHALLENGE',
      content: challengeText,
    },
  ];

  if (sawContent) {
    sections.push({
      icon: '👁️',
      title: 'WHAT THEY SAW',
      content: sawContent,
    });
  }

  if (targetText) {
    sections.push({
      icon: '📍',
      title: 'THE TARGET',
      content: targetText,
      highlight: true,
    });
  }

  sections.push({
    icon: isHit ? '✓' : '✗',
    title: 'THE VERDICT',
    content: verdictText,
    highlight: isHit,
  });

  return { sections, hasStory: sawContent !== null || !!targetText };
}

// Extract story elements from Ganzfeld data
function extractGanzfeldStory(data: Record<string, unknown>): StoryData {
  const target = data.target as Record<string, unknown> | undefined;
  const receiver = data.receiver as Record<string, unknown> | undefined;
  const protocol = data.protocol as Record<string, unknown> | undefined;
  const results = data.results as Record<string, unknown> | undefined;
  const mentation = data.mentation_transcript as string | undefined;
  const sessionDate = data.session_date as string | undefined;
  const researcherNotes = data.researcher_notes as string | undefined;

  // Build challenge
  const isolation = protocol?.sensory_isolation as Record<string, unknown> | undefined;
  const duration = isolation?.duration_minutes || 30;
  const lab = protocol?.laboratory || 'the laboratory';

  let challengeText = '';
  if (sessionDate) {
    const date = new Date(sessionDate);
    challengeText += `${date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}. `;
  }
  challengeText += `At ${lab}, a receiver enters sensory deprivation. `;
  challengeText += `Red light fills their vision. White noise fills their ears. `;
  challengeText += `For ${duration} minutes, they will try to perceive a hidden target — `;
  challengeText += 'one of four video clips being watched by a sender in another room.';

  // Build what they experienced from mentation
  let experiencedContent: React.ReactNode = null;
  if (mentation) {
    // Show mentation as flowing thoughts
    const cleaned = mentation.replace(/\.\.\./g, '…');
    experiencedContent = (
      <div className="text-zinc-300 italic leading-relaxed">
        "{cleaned.substring(0, 400)}{cleaned.length > 400 ? '…' : ''}"
      </div>
    );
  }

  // Build the target reveal
  const targetDesc = target?.description as string;
  const targetCategory = target?.category as string;

  // Build verdict
  const hit = results?.hit as boolean;
  const ranking = results?.ranking as number;
  const poolSize = target?.pool_size || 4;
  const confidence = results?.confidence_rating as number;
  const notes = results?.correspondence_notes as string;

  let verdictText = hit ? '✓ DIRECT HIT' : `✗ MISS (ranked #${ranking} of ${poolSize})`;
  if (confidence) {
    verdictText += ` • Confidence: ${confidence}%`;
  }
  if (notes) {
    verdictText += `\n\n"${notes.substring(0, 200)}${notes.length > 200 ? '...' : ''}"`;
  }

  const sections: StorySection[] = [
    {
      icon: '🎯',
      title: 'THE CHALLENGE',
      content: challengeText,
    },
  ];

  if (experiencedContent) {
    sections.push({
      icon: '💭',
      title: 'WHAT THEY EXPERIENCED',
      content: experiencedContent,
    });
  }

  if (targetDesc) {
    sections.push({
      icon: '🎬',
      title: 'THE TARGET',
      content: targetDesc,
      highlight: true,
    });
  }

  sections.push({
    icon: hit ? '✓' : '✗',
    title: 'THE VERDICT',
    content: verdictText,
    highlight: hit,
  });

  return { sections, hasStory: !!experiencedContent || !!targetDesc };
}

// Extract story from Crisis Apparition - often the story IS the description
function extractCrisisStory(data: Record<string, unknown>, description?: string): StoryData {
  const deltaT = data.delta_t_minutes as number | undefined;
  const distance = data.distance_miles as number | undefined;
  const isGold = data.is_gold_standard as boolean;
  const source = data.source as Record<string, unknown> | string | undefined;

  // For crisis apparitions, the description often IS the story
  // Try to extract key moments
  if (!description || description.length < 50) {
    return { sections: [], hasStory: false };
  }

  // Try to find the crisis moment in the text
  const lowerDesc = description.toLowerCase();
  const hasDeath = lowerDesc.includes('died') || lowerDesc.includes('death') || lowerDesc.includes('passed away');
  const hasApparition = lowerDesc.includes('saw') || lowerDesc.includes('felt') || lowerDesc.includes('appeared');

  let timingText = '';
  if (deltaT !== undefined) {
    if (deltaT === 0) {
      timingText = 'at the exact moment of';
    } else if (deltaT < 0) {
      timingText = `${Math.abs(deltaT)} minutes before`;
    } else {
      timingText = `${deltaT} minutes after`;
    }
  }

  let distanceText = '';
  if (distance) {
    distanceText = `${distance} miles away`;
  }

  // Extract a compelling excerpt (first 500 chars that seem relevant)
  const storyExcerpt = description.length > 600
    ? description.substring(0, 600) + '...'
    : description;

  const sections: StorySection[] = [
    {
      icon: '📖',
      title: 'THE ACCOUNT',
      content: (
        <div className="text-zinc-300 leading-relaxed">
          {storyExcerpt}
        </div>
      ),
    },
  ];

  if (timingText || distanceText) {
    const keyFactsContent = [];
    if (timingText) keyFactsContent.push(`Apparition occurred ${timingText} the crisis event`);
    if (distanceText) keyFactsContent.push(`Physical distance: ${distanceText}`);
    if (isGold) keyFactsContent.push('✓ Meets gold-standard evidential criteria');

    sections.push({
      icon: '📊',
      title: 'KEY FACTS',
      content: keyFactsContent.join('\n'),
      highlight: isGold,
    });
  }

  return { sections, hasStory: true };
}

// Extract story from NDE data
function extractNdeStory(data: Record<string, unknown>, description?: string): StoryData {
  const trigger = data.trigger || data.medical_event;
  const veridical = data.veridical_elements || data.verified_perceptions;
  const hospitals = data.hospitals;
  const ndeReports = data.nde_reports;
  const obeReports = data.obe_reports;
  const targetHits = typeof data.target_hits === 'number' ? data.target_hits : undefined;

  // Check if this is a study vs individual case
  if (hospitals || ndeReports) {
    // This is a study - use different format
    const sections: StorySection[] = [
      {
        icon: '🏥',
        title: 'THE STUDY',
        content: `A systematic study across ${hospitals || 'multiple'} hospitals documenting near-death experiences during cardiac arrest.`,
      },
    ];

    if (ndeReports || obeReports) {
      let resultsText = '';
      if (ndeReports) resultsText += `${ndeReports} patients reported near-death experiences. `;
      if (obeReports) resultsText += `${obeReports} reported out-of-body experiences. `;
      if (targetHits !== undefined) {
        resultsText += targetHits > 0
          ? `${targetHits} patients accurately described hidden visual targets placed near the ceiling.`
          : 'No patients identified hidden visual targets (targets may not have been visible from reported vantage points).';
      }
      sections.push({
        icon: '📊',
        title: 'FINDINGS',
        content: resultsText,
        highlight: targetHits !== undefined && targetHits > 0,
      });
    }

    return { sections, hasStory: true };
  }

  // Individual case
  if (!description && !trigger) {
    return { sections: [], hasStory: false };
  }

  const sections: StorySection[] = [];

  if (trigger) {
    sections.push({
      icon: '⚡',
      title: 'THE CRISIS',
      content: `Clinical emergency: ${trigger}. The patient's heart stopped.`,
    });
  }

  if (description) {
    sections.push({
      icon: '✨',
      title: 'WHAT THEY EXPERIENCED',
      content: (
        <div className="text-zinc-300 leading-relaxed italic">
          {description.length > 500 ? description.substring(0, 500) + '...' : description}
        </div>
      ),
    });
  }

  if (veridical) {
    sections.push({
      icon: '✓',
      title: 'VERIFIED DETAILS',
      content: 'Researchers confirmed specific details the patient reported perceiving during clinical death.',
      highlight: true,
    });
  }

  return { sections, hasStory: sections.length > 0 };
}

// Main extraction function
export function extractStoryData(
  type: InvestigationType,
  data: Record<string, unknown>,
  description?: string
): StoryData {
  switch (type) {
    case 'stargate':
      return extractStargateStory(data, description);
    case 'ganzfeld':
      return extractGanzfeldStory(data);
    case 'crisis_apparition':
      return extractCrisisStory(data, description);
    case 'nde':
      return extractNdeStory(data, description);
    default:
      return { sections: [], hasStory: false };
  }
}

// Story Layout Component
interface StoryLayoutProps {
  type: InvestigationType;
  data: Record<string, unknown>;
  description?: string;
}

export function StoryLayout({ type, data, description }: StoryLayoutProps) {
  const story = extractStoryData(type, data, description);

  if (!story.hasStory || story.sections.length === 0) {
    return null;
  }

  return (
    <div className="space-y-1">
      {story.sections.map((section, index) => (
        <div
          key={index}
          className={`rounded-lg border p-4 ${
            section.highlight
              ? 'border-emerald-500/30 bg-emerald-950/20'
              : 'border-zinc-800 bg-zinc-900/50'
          }`}
        >
          <h3 className={`text-sm font-semibold uppercase tracking-wide mb-3 flex items-center gap-2 ${
            section.highlight ? 'text-emerald-400' : 'text-zinc-400'
          }`}>
            <span>{section.icon}</span>
            {section.title}
          </h3>
          <div className={`${section.highlight ? 'text-emerald-200' : 'text-zinc-300'} whitespace-pre-line`}>
            {section.content}
          </div>
        </div>
      ))}
    </div>
  );
}
