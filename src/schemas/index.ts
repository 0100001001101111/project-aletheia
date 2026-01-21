/**
 * Schema Index
 * Central export for all investigation type schemas
 */

import { z } from 'zod';
import { NDESchema, NDE_REQUIRED_FIELDS, NDE_TRIAGE_INDICATORS, NDE_FIELD_DESCRIPTIONS, type NDEData } from './nde';
import { GanzfeldSchema, GANZFELD_REQUIRED_FIELDS, GANZFELD_TRIAGE_INDICATORS, GANZFELD_FIELD_DESCRIPTIONS, type GanzfeldData } from './ganzfeld';
import { CrisisApparitionSchema, CRISIS_APPARITION_REQUIRED_FIELDS, CRISIS_APPARITION_TRIAGE_INDICATORS, CRISIS_APPARITION_FIELD_DESCRIPTIONS, type CrisisApparitionData } from './crisis-apparition';
import { StargateSchema, STARGATE_REQUIRED_FIELDS, STARGATE_TRIAGE_INDICATORS, STARGATE_FIELD_DESCRIPTIONS, type StargateData } from './stargate';
import { GeophysicalSchema, GEOPHYSICAL_REQUIRED_FIELDS, GEOPHYSICAL_TRIAGE_INDICATORS, GEOPHYSICAL_FIELD_DESCRIPTIONS, type GeophysicalData } from './geophysical';
import { UFOSchema, UFO_REQUIRED_FIELDS, UFO_TRIAGE_INDICATORS, UFO_FIELD_DESCRIPTIONS, type UFOData } from './ufo';
import type { InvestigationType, ResearchInvestigationType } from '../types/database';
import { ALL_DOMAINS } from '@/lib/domain-config';

// Re-export all schemas
export { NDESchema, NDE_REQUIRED_FIELDS, NDE_TRIAGE_INDICATORS, NDE_FIELD_DESCRIPTIONS, type NDEData };
export { GanzfeldSchema, GANZFELD_REQUIRED_FIELDS, GANZFELD_TRIAGE_INDICATORS, GANZFELD_FIELD_DESCRIPTIONS, type GanzfeldData };
export { CrisisApparitionSchema, CRISIS_APPARITION_REQUIRED_FIELDS, CRISIS_APPARITION_TRIAGE_INDICATORS, CRISIS_APPARITION_FIELD_DESCRIPTIONS, type CrisisApparitionData };
export { StargateSchema, STARGATE_REQUIRED_FIELDS, STARGATE_TRIAGE_INDICATORS, STARGATE_FIELD_DESCRIPTIONS, type StargateData };
export { GeophysicalSchema, GEOPHYSICAL_REQUIRED_FIELDS, GEOPHYSICAL_TRIAGE_INDICATORS, GEOPHYSICAL_FIELD_DESCRIPTIONS, type GeophysicalData };
export { UFOSchema, UFO_REQUIRED_FIELDS, UFO_TRIAGE_INDICATORS, UFO_FIELD_DESCRIPTIONS, type UFOData };

// Schema map by research investigation type (exploratory types don't have schemas)
export const SCHEMAS: Record<ResearchInvestigationType, z.ZodSchema> = {
  nde: NDESchema,
  ganzfeld: GanzfeldSchema,
  crisis_apparition: CrisisApparitionSchema,
  stargate: StargateSchema,
  geophysical: GeophysicalSchema,
  ufo: UFOSchema,
};

// Required fields map (research types only)
export const REQUIRED_FIELDS: Record<ResearchInvestigationType, readonly string[]> = {
  nde: NDE_REQUIRED_FIELDS,
  ganzfeld: GANZFELD_REQUIRED_FIELDS,
  crisis_apparition: CRISIS_APPARITION_REQUIRED_FIELDS,
  stargate: STARGATE_REQUIRED_FIELDS,
  geophysical: GEOPHYSICAL_REQUIRED_FIELDS,
  ufo: UFO_REQUIRED_FIELDS,
};

// Triage indicators map (research types only)
export const TRIAGE_INDICATORS: Record<ResearchInvestigationType, Record<string, string[]>> = {
  nde: NDE_TRIAGE_INDICATORS,
  ganzfeld: GANZFELD_TRIAGE_INDICATORS,
  crisis_apparition: CRISIS_APPARITION_TRIAGE_INDICATORS,
  stargate: STARGATE_TRIAGE_INDICATORS,
  geophysical: GEOPHYSICAL_TRIAGE_INDICATORS,
  ufo: UFO_TRIAGE_INDICATORS,
};

// Field descriptions map (research types only)
export const FIELD_DESCRIPTIONS: Record<ResearchInvestigationType, Record<string, string>> = {
  nde: NDE_FIELD_DESCRIPTIONS,
  ganzfeld: GANZFELD_FIELD_DESCRIPTIONS,
  crisis_apparition: CRISIS_APPARITION_FIELD_DESCRIPTIONS,
  stargate: STARGATE_FIELD_DESCRIPTIONS,
  geophysical: GEOPHYSICAL_FIELD_DESCRIPTIONS,
  ufo: UFO_FIELD_DESCRIPTIONS,
};

// Schema metadata - uses centralized domain config
export const SCHEMA_METADATA: Record<InvestigationType, {
  name: string;
  description: string;
  icon: string;
  color: string;
}> = Object.fromEntries(
  Object.entries(ALL_DOMAINS).map(([type, meta]) => [
    type,
    {
      name: meta.name,
      description: meta.description,
      icon: meta.icon,
      color: `text-${meta.color}-400`,
    },
  ])
) as Record<InvestigationType, { name: string; description: string; icon: string; color: string }>;

// Union type for all schema data
export type SchemaData = NDEData | GanzfeldData | CrisisApparitionData | StargateData | GeophysicalData | UFOData;

/**
 * Check if type has a schema (research types only)
 */
export function hasSchema(type: InvestigationType): type is ResearchInvestigationType {
  return type in SCHEMAS;
}

/**
 * Get schema for investigation type (research types only)
 */
export function getSchema(type: InvestigationType): z.ZodSchema | null {
  if (hasSchema(type)) {
    return SCHEMAS[type];
  }
  return null;
}

/**
 * Get field descriptions for investigation type (research types only)
 */
export function getFieldDescriptions(type: InvestigationType): Record<string, string> | null {
  if (hasSchema(type)) {
    return FIELD_DESCRIPTIONS[type];
  }
  return null;
}

/**
 * Get required fields for investigation type (research types only)
 */
export function getRequiredFields(type: InvestigationType): readonly string[] | null {
  if (hasSchema(type)) {
    return REQUIRED_FIELDS[type];
  }
  return null;
}

/**
 * Get triage indicators for investigation type (research types only)
 */
export function getTriageIndicators(type: InvestigationType): Record<string, string[]> | null {
  if (hasSchema(type)) {
    return TRIAGE_INDICATORS[type];
  }
  return null;
}

/**
 * Validate data against schema (research types only)
 */
export function validateData(type: InvestigationType, data: unknown): {
  success: boolean;
  data?: SchemaData;
  errors?: z.ZodError;
} {
  if (!hasSchema(type)) {
    // Exploratory types don't have schemas - always valid
    return { success: true, data: data as SchemaData };
  }

  const schema = SCHEMAS[type];
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data as SchemaData };
  }

  return { success: false, errors: result.error };
}

/**
 * Get empty data object for schema type (research types only)
 */
export function getEmptyData(type: InvestigationType): Record<string, unknown> {
  if (!hasSchema(type)) {
    // Exploratory types don't have required fields
    return {};
  }

  // Return a minimal object with null values for required fields
  const requiredFields = REQUIRED_FIELDS[type];
  const data: Record<string, unknown> = {};

  for (const field of requiredFields) {
    const parts = field.split('.');
    let current = data;

    for (let i = 0; i < parts.length - 1; i++) {
      if (!current[parts[i]]) {
        current[parts[i]] = {};
      }
      current = current[parts[i]] as Record<string, unknown>;
    }

    current[parts[parts.length - 1]] = null;
  }

  return data;
}

/**
 * Format Zod errors for display
 */
export function formatZodErrors(errors: z.ZodError): Array<{ path: string; message: string }> {
  return errors.issues.map((err) => ({
    path: err.path.join('.'),
    message: err.message,
  }));
}

/**
 * Get nested value from object by dot-notation path
 */
export function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce((current, key) => {
    if (current && typeof current === 'object') {
      return (current as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj as unknown);
}

/**
 * Set nested value in object by dot-notation path
 */
export function setNestedValue(obj: Record<string, unknown>, path: string, value: unknown): void {
  const parts = path.split('.');
  let current = obj;

  for (let i = 0; i < parts.length - 1; i++) {
    if (!current[parts[i]] || typeof current[parts[i]] !== 'object') {
      current[parts[i]] = {};
    }
    current = current[parts[i]] as Record<string, unknown>;
  }

  current[parts[parts.length - 1]] = value;
}

/**
 * Flatten nested object to dot-notation keys
 */
export function flattenToDotNotation(
  obj: Record<string, unknown>,
  prefix = ''
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}.${key}` : key;

    if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
      Object.assign(result, flattenToDotNotation(value as Record<string, unknown>, newKey));
    } else {
      result[newKey] = value;
    }
  }

  return result;
}
