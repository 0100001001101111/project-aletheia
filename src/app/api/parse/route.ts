/**
 * Parse API Route
 * Uses Claude API to parse narrative text into structured schema data
 */

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { generateParsePrompt, parseLLMResponse } from '@/lib/parser';
import { validateData, formatZodErrors } from '@/schemas';
import { calculateTriageScore } from '@/lib/triage';
import { checkRateLimit, getClientId, RATE_LIMITS, rateLimitResponse } from '@/lib/rate-limit';
import { createClient } from '@/lib/supabase-server';
import type { InvestigationType } from '@/types/database';

const anthropic = new Anthropic();

export async function POST(request: NextRequest) {
  // Rate limit AI generation calls
  const clientId = getClientId(request);
  const rateLimit = checkRateLimit(`parse:${clientId}`, RATE_LIMITS.AI_GENERATION);
  if (!rateLimit.success) {
    return rateLimitResponse(rateLimit);
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { narrative, schemaType } = body as {
      narrative: string;
      schemaType: InvestigationType;
    };

    // Validate input
    if (!narrative || typeof narrative !== 'string') {
      return NextResponse.json(
        { error: 'Narrative text is required' },
        { status: 400 }
      );
    }

    if (!schemaType) {
      return NextResponse.json(
        { error: 'Schema type is required' },
        { status: 400 }
      );
    }

    const validTypes: InvestigationType[] = ['nde', 'ganzfeld', 'crisis_apparition', 'stargate', 'geophysical'];
    if (!validTypes.includes(schemaType)) {
      return NextResponse.json(
        { error: `Invalid schema type. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // Generate prompt for LLM
    const prompt = generateParsePrompt(schemaType, narrative);

    // Call Claude API
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    // Extract text response
    const responseText = message.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('');

    // Parse LLM response
    const parseResult = parseLLMResponse(responseText);

    // Validate against schema
    const validation = validateData(schemaType, parseResult.data);

    // Calculate triage score
    const triageScore = calculateTriageScore(parseResult.data, schemaType);

    return NextResponse.json({
      success: true,
      data: parseResult.data,
      confidence: parseResult.confidence,
      missingRequired: parseResult.missingRequired,
      parserNotes: parseResult.parserNotes,
      validation: {
        valid: validation.success,
        errors: validation.errors ? formatZodErrors(validation.errors) : [],
      },
      triage: triageScore,
      usage: {
        inputTokens: message.usage.input_tokens,
        outputTokens: message.usage.output_tokens,
      },
    });
  } catch (error) {
    console.error('Parse API error:', error);

    if (error instanceof Anthropic.APIError) {
      return NextResponse.json(
        { error: `Claude API error: ${error.message}` },
        { status: error.status || 500 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to parse narrative' },
      { status: 500 }
    );
  }
}
