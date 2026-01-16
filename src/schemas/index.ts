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
import type { InvestigationType } from '../types/database';

// Re-export all schemas
export { NDESchema, NDE_REQUIRED_FIELDS, NDE_TRIAGE_INDICATORS, NDE_FIELD_DESCRIPTIONS, type NDEData };
export { GanzfeldSchema, GANZFELD_REQUIRED_FIELDS, GANZFELD_TRIAGE_INDICATORS, GANZFELD_FIELD_DESCRIPTIONS, type GanzfeldData };
export { CrisisApparitionSchema, CRISIS_APPARITION_REQUIRED_FIELDS, CRISIS_APPARITION_TRIAGE_INDICATORS, CRISIS_APPARITION_FIELD_DESCRIPTIONS, type CrisisApparitionData };
export { StargateSchema, STARGATE_REQUIRED_FIELDS, STARGATE_TRIAGE_INDICATORS, STARGATE_FIELD_DESCRIPTIONS, type StargateData };
export { GeophysicalSchema, GEOPHYSICAL_REQUIRED_FIELDS, GEOPHYSICAL_TRIAGE_INDICATORS, GEOPHYSICAL_FIELD_DESCRIPTIONS, type GeophysicalData };
export { UFOSchema, UFO_REQUIRED_FIELDS, UFO_TRIAGE_INDICATORS, UFO_FIELD_DESCRIPTIONS, type UFOData };

// Schema map by investigation type
export const SCHEMAS: Record<InvestigationType, z.ZodSchema> = {
  nde: NDESchema,
  ganzfeld: GanzfeldSchema,
  crisis_apparition: CrisisApparitionSchema,
  stargate: StargateSchema,
  geophysical: GeophysicalSchema,
  ufo: UFOSchema,
};

// Required fields map
export const REQUIRED_FIELDS: Record<InvestigationType, readonly string[]> = {
  nde: NDE_REQUIRED_FIELDS,
  ganzfeld: GANZFELD_REQUIRED_FIELDS,
  crisis_apparition: CRISIS_APPARITION_REQUIRED_FIELDS,
  stargate: STARGATE_REQUIRED_FIELDS,
  geophysical: GEOPHYSICAL_REQUIRED_FIELDS,
  ufo: UFO_REQUIRED_FIELDS,
};

// Triage indicators map
export const TRIAGE_INDICATORS: Record<InvestigationType, Record<string, string[]>> = {
  nde: NDE_TRIAGE_INDICATORS,
  ganzfeld: GANZFELD_TRIAGE_INDICATORS,
  crisis_apparition: CRISIS_APPARITION_TRIAGE_INDICATORS,
  stargate: STARGATE_TRIAGE_INDICATORS,
  geophysical: GEOPHYSICAL_TRIAGE_INDICATORS,
  ufo: UFO_TRIAGE_INDICATORS,
};

// Field descriptions map
export const FIELD_DESCRIPTIONS: Record<InvestigationType, Record<string, string>> = {
  nde: NDE_FIELD_DESCRIPTIONS,
  ganzfeld: GANZFELD_FIELD_DESCRIPTIONS,
  crisis_apparition: CRISIS_APPARITION_FIELD_DESCRIPTIONS,
  stargate: STARGATE_FIELD_DESCRIPTIONS,
  geophysical: GEOPHYSICAL_FIELD_DESCRIPTIONS,
  ufo: UFO_FIELD_DESCRIPTIONS,
};

// Schema metadata
export const SCHEMA_METADATA: Record<InvestigationType, {
  name: string;
  description: string;
  icon: string;
  color: string;
}> = {
  nde: {
    name: 'Near-Death Experience',
    description: 'Cardiac arrest survivors, out-of-body experiences, veridical perceptions',
    icon: '💫',
    color: 'text-purple-400',
  },
  ganzfeld: {
    name: 'Ganzfeld Experiment',
    description: 'Controlled telepathy experiments with sensory isolation',
    icon: '🎯',
    color: 'text-blue-400',
  },
  crisis_apparition: {
    name: 'Crisis Apparition',
    description: 'Spontaneous apparitions at time of death or crisis',
    icon: '👻',
    color: 'text-emerald-400',
  },
  stargate: {
    name: 'Remote Viewing',
    description: 'Coordinate remote viewing, operational and research sessions',
    icon: '🔮',
    color: 'text-amber-400',
  },
  geophysical: {
    name: 'Geophysical Anomaly',
    description: 'EMF, temperature, and other instrumented environmental measurements',
    icon: '📡',
    color: 'text-cyan-400',
  },
  ufo: {
    name: 'UFO/UAP Sighting',
    description: 'Aerial anomalies with geophysical, temporal, and consciousness correlates',
    icon: '🛸',
    color: 'text-rose-400',
  },
};

// Union type for all schema data
export type SchemaData = NDEData | GanzfeldData | CrisisApparitionData | StargateData | GeophysicalData | UFOData;

/**
 * Get schema for investigation type
 */
export function getSchema(type: InvestigationType): z.ZodSchema {
  return SCHEMAS[type];
}

/**
 * Validate data against schema
 */
export function validateData(type: InvestigationType, data: unknown): {
  success: boolean;
  data?: SchemaData;
  errors?: z.ZodError;
} {
  const schema = SCHEMAS[type];
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data as SchemaData };
  }

  return { success: false, errors: result.error };
}

/**
 * Get empty data object for schema type
 */
export function getEmptyData(type: InvestigationType): Record<string, unknown> {
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
