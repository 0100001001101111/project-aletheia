/**
 * LLM Narrative Parser
 * Uses Claude API to parse narrative text into structured schema data
 */

import type { InvestigationType } from '../types/database';
import { getFieldDescriptions, SCHEMA_METADATA } from '../schemas';

export interface ParsedField {
  value: unknown;
  confidence: number;
}

export interface ParseResult {
  data: Record<string, unknown>;
  confidence: Record<string, number>;
  missingRequired: string[];
  parserNotes: string[];
  rawResponse?: string;
}

/**
 * Generate the LLM prompt for parsing a narrative
 */
export function generateParsePrompt(
  schemaType: InvestigationType,
  narrative: string
): string {
  const metadata = SCHEMA_METADATA[schemaType];
  const fieldDescriptions = getFieldDescriptions(schemaType);

  if (!metadata || !fieldDescriptions) {
    throw new Error(`No schema configuration for type: ${schemaType}`);
  }

  // Format field descriptions for the prompt
  const fieldList = Object.entries(fieldDescriptions)
    .map(([field, description]) => `- ${field}: ${description}`)
    .join('\n');

  return `You are parsing a research narrative into structured data for the ${metadata.name} schema.

## Task
Extract the following fields from the text. If a field is not mentioned or cannot be determined, use null.
For each field you extract, also provide a confidence score (0-1) indicating how certain you are about the extraction.

## Schema Fields
${fieldList}

## Important Guidelines
1. Only extract information explicitly stated or clearly implied in the text
2. Do not make assumptions or infer information not present
3. Use exact values from the text when possible
4. For dates, use ISO format (YYYY-MM-DD) when possible
5. For enums, use the exact enum value from the field description
6. If a required field is not found, note it in missing_required

## Text to Parse
${narrative}

## Response Format
Respond with valid JSON only, no other text:
{
  "data": {
    // extracted field values using dot notation keys
    // e.g., "medical_context.cause": "cardiac_arrest"
  },
  "confidence": {
    // confidence scores for each extracted field
    // e.g., "medical_context.cause": 0.95
  },
  "missing_required": [
    // list of required fields that could not be found
  ],
  "parser_notes": [
    // any notes about ambiguities or assumptions made
  ]
}`;
}

/**
 * Parse LLM response into ParseResult
 */
export function parseLLMResponse(response: string): ParseResult {
  try {
    // Try to extract JSON from the response
    let jsonStr = response;

    // Handle cases where JSON is wrapped in markdown code blocks
    const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    }

    const parsed = JSON.parse(jsonStr.trim());

    return {
      data: expandDotNotation(parsed.data || {}),
      confidence: parsed.confidence || {},
      missingRequired: parsed.missing_required || [],
      parserNotes: parsed.parser_notes || [],
      rawResponse: response,
    };
  } catch (error) {
    console.error('Failed to parse LLM response:', error);
    return {
      data: {},
      confidence: {},
      missingRequired: [],
      parserNotes: [`Failed to parse LLM response: ${error}`],
      rawResponse: response,
    };
  }
}

/**
 * Expand dot notation keys into nested objects
 * e.g., { "a.b.c": 1 } -> { a: { b: { c: 1 } } }
 */
function expandDotNotation(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    const parts = key.split('.');
    let current = result;

    for (let i = 0; i < parts.length - 1; i++) {
      if (!current[parts[i]] || typeof current[parts[i]] !== 'object') {
        current[parts[i]] = {};
      }
      current = current[parts[i]] as Record<string, unknown>;
    }

    current[parts[parts.length - 1]] = value;
  }

  return result;
}

/**
 * Get confidence level label and color
 */
export function getConfidenceLevel(confidence: number): {
  label: string;
  color: string;
} {
  if (confidence >= 0.9) {
    return { label: 'High', color: 'text-emerald-400' };
  }
  if (confidence >= 0.7) {
    return { label: 'Medium', color: 'text-amber-400' };
  }
  if (confidence >= 0.5) {
    return { label: 'Low', color: 'text-orange-400' };
  }
  return { label: 'Very Low', color: 'text-red-400' };
}

/**
 * Merge parsed data with manually edited data
 * Manual edits take precedence
 */
export function mergeParserResults(
  parsedData: Record<string, unknown>,
  manualEdits: Record<string, unknown>
): Record<string, unknown> {
  return deepMerge(parsedData, manualEdits);
}

/**
 * Deep merge two objects
 */
function deepMerge(
  target: Record<string, unknown>,
  source: Record<string, unknown>
): Record<string, unknown> {
  const result = { ...target };

  for (const key of Object.keys(source)) {
    if (
      source[key] &&
      typeof source[key] === 'object' &&
      !Array.isArray(source[key]) &&
      target[key] &&
      typeof target[key] === 'object' &&
      !Array.isArray(target[key])
    ) {
      result[key] = deepMerge(
        target[key] as Record<string, unknown>,
        source[key] as Record<string, unknown>
      );
    } else if (source[key] !== undefined) {
      result[key] = source[key];
    }
  }

  return result;
}

/**
 * Flatten nested object to dot notation
 * e.g., { a: { b: { c: 1 } } } -> { "a.b.c": 1 }
 */
export function flattenToDotNotation(
  obj: Record<string, unknown>,
  prefix = ''
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (value && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(result, flattenToDotNotation(value as Record<string, unknown>, fullKey));
    } else {
      result[fullKey] = value;
    }
  }

  return result;
}

/**
 * Estimate token count for text (rough estimate)
 */
export function estimateTokens(text: string): number {
  // Rough estimate: ~4 characters per token for English text
  return Math.ceil(text.length / 4);
}

/**
 * Check if narrative is too long for parsing
 */
export function isNarrativeTooLong(narrative: string, maxTokens = 4000): boolean {
  return estimateTokens(narrative) > maxTokens;
}

/**
 * Truncate narrative if too long
 */
export function truncateNarrative(narrative: string, maxTokens = 4000): string {
  const maxChars = maxTokens * 4;
  if (narrative.length <= maxChars) return narrative;

  // Truncate at word boundary
  const truncated = narrative.slice(0, maxChars);
  const lastSpace = truncated.lastIndexOf(' ');
  return truncated.slice(0, lastSpace) + '... [truncated]';
}
