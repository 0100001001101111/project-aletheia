import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@/lib/supabase-server';

const anthropic = new Anthropic();

const DOMAIN_DESCRIPTIONS = {
  nde: 'Near-Death Experience - Cardiac arrest survivors, out-of-body experiences, veridical perceptions during clinical death, life reviews, encounters with deceased relatives during medical emergencies',
  ganzfeld: 'Ganzfeld Experiment - Controlled telepathy experiments with sensory deprivation, psi research with sender/receiver protocols, dream telepathy studies',
  crisis_apparition: 'Crisis Apparition - Spontaneous apparitions at time of death or crisis, visions of family members at moment of their death, deathbed apparitions',
  stargate: 'Remote Viewing (STARGATE-style) - Coordinate remote viewing sessions, operational remote viewing with feedback, controlled viewing experiments with blind judging',
  geophysical: 'Geophysical Anomaly - EMF measurements, temperature fluctuations, radiation readings, seismic correlations, instrumented environmental data',
  ufo: 'UFO/UAP Encounter - Aerial anomalies, close encounters, entity observations, physical trace cases, multiple witness sightings',
};

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { description } = await request.json();

    if (!description || typeof description !== 'string') {
      return NextResponse.json(
        { error: 'Description is required' },
        { status: 400 }
      );
    }

    const prompt = `You are a research classifier for Project Aletheia, a scientific anomaly research platform.

Given the following research description, classify it into one of these domains:

${Object.entries(DOMAIN_DESCRIPTIONS)
  .map(([key, desc]) => `- ${key}: ${desc}`)
  .join('\n')}

Research description:
"${description}"

Respond in JSON format:
{
  "suggestedType": "<domain_key>",
  "confidence": <0.0-1.0>,
  "reasoning": "<1-2 sentence explanation>",
  "alternativeTypes": [
    {"type": "<domain_key>", "confidence": <0.0-1.0>}
  ]
}

Only include alternativeTypes if there are other plausible domains with confidence > 0.2.
Be conservative with confidence scores. Use 0.9+ only for very clear matches.`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    // Extract JSON from response
    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const result = JSON.parse(jsonMatch[0]);

    // Validate the suggested type
    const validTypes = ['nde', 'ganzfeld', 'crisis_apparition', 'stargate', 'geophysical', 'ufo'];
    if (!validTypes.includes(result.suggestedType)) {
      result.suggestedType = 'ufo'; // Default fallback
      result.confidence = 0.3;
    }

    // Filter alternative types to valid ones
    if (result.alternativeTypes) {
      result.alternativeTypes = result.alternativeTypes.filter(
        (alt: { type: string }) => validTypes.includes(alt.type) && alt.type !== result.suggestedType
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Domain classification error:', error);
    return NextResponse.json(
      { error: 'Classification failed' },
      { status: 500 }
    );
  }
}
