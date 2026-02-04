/**
 * Deep Miner Variable Extractor
 * Recursively extracts and classifies all variables from JSONB data
 */

import type { ExtractedVariable, VariableType } from './types';

/**
 * Extract all variables from an array of JSONB records
 */
export function extractVariables(
  records: Record<string, unknown>[],
  maxSamples: number = 1000
): ExtractedVariable[] {
  if (records.length === 0) return [];

  const variableMap = new Map<string, ExtractedVariable>();
  const sampleRecords = records.slice(0, maxSamples);

  // Process each record
  sampleRecords.forEach(record => {
    extractFromObject(record, '', variableMap, sampleRecords);
  });

  return Array.from(variableMap.values());
}

/**
 * Recursively extract variables from an object
 */
function extractFromObject(
  obj: unknown,
  prefix: string,
  variableMap: Map<string, ExtractedVariable>,
  allRecords: Record<string, unknown>[]
): void {
  if (obj === null || obj === undefined) return;

  if (typeof obj !== 'object') return;

  if (Array.isArray(obj)) {
    // Handle arrays - collect all values
    obj.forEach((item, _i) => {
      if (typeof item === 'object' && item !== null) {
        extractFromObject(item, prefix, variableMap, allRecords);
      }
    });
    return;
  }

  const record = obj as Record<string, unknown>;

  Object.entries(record).forEach(([key, value]) => {
    // Skip internal fields
    if (key.startsWith('_') || key === 'id' || key === 'sid' || key === 'created_at') return;

    const path = prefix ? `${prefix}.${key}` : key;

    // Skip if already processed
    if (variableMap.has(path)) {
      // But add this value to the collected values
      const existing = variableMap.get(path)!;
      if (value !== null && value !== undefined) {
        existing.values.push(value);
      }
      return;
    }

    // Determine type and collect values
    const type = inferVariableType(key, value, allRecords, path);

    if (type === 'text' && typeof value === 'string' && value.length > 500) {
      // Skip long text fields for statistical analysis
      return;
    }

    // Collect all values for this path
    const values = collectValuesForPath(allRecords, path);

    variableMap.set(path, {
      name: key,
      path,
      type,
      values,
      sampleValue: value,
    });

    // Recurse into nested objects
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      extractFromObject(value, path, variableMap, allRecords);
    }
  });
}

/**
 * Infer variable type from key name and values
 */
function inferVariableType(
  key: string,
  value: unknown,
  allRecords: Record<string, unknown>[],
  path: string
): VariableType {
  // Check key name for hints
  const keyLower = key.toLowerCase();

  // Boolean patterns
  if (
    typeof value === 'boolean' ||
    keyLower.startsWith('is_') ||
    keyLower.startsWith('has_') ||
    keyLower.includes('_flag') ||
    value === 'true' ||
    value === 'false' ||
    value === 'Yes' ||
    value === 'No'
  ) {
    return 'boolean';
  }

  // Temporal patterns
  if (
    keyLower.includes('date') ||
    keyLower.includes('time') ||
    keyLower.includes('_at') ||
    keyLower === 'year' ||
    keyLower === 'month'
  ) {
    return 'temporal';
  }

  // Geographic patterns
  if (
    keyLower.includes('latitude') ||
    keyLower.includes('longitude') ||
    keyLower.includes('lat') ||
    keyLower.includes('lng') ||
    keyLower.includes('country') ||
    keyLower.includes('state') ||
    keyLower.includes('city') ||
    keyLower.includes('location')
  ) {
    return 'geographic';
  }

  // Numeric - check if most values are numbers
  if (typeof value === 'number') {
    return 'continuous';
  }

  // Check sample of values
  const values = collectValuesForPath(allRecords.slice(0, 100), path);
  const nonNullValues = values.filter(v => v !== null && v !== undefined);

  if (nonNullValues.length === 0) {
    return 'text';
  }

  // Check if numeric
  const numericCount = nonNullValues.filter(v => typeof v === 'number').length;
  if (numericCount > nonNullValues.length * 0.8) {
    return 'continuous';
  }

  // Check if boolean-like
  const booleanLike = nonNullValues.filter(
    v => v === true || v === false || v === 'true' || v === 'false' || v === 'Yes' || v === 'No'
  ).length;
  if (booleanLike > nonNullValues.length * 0.8) {
    return 'boolean';
  }

  // Check cardinality for categorical vs text
  const uniqueValues = new Set(nonNullValues.map(v => String(v)));
  const cardinality = uniqueValues.size;

  // Low cardinality = categorical
  if (cardinality <= 20 || cardinality / nonNullValues.length < 0.1) {
    return 'categorical';
  }

  // High cardinality strings = text
  if (typeof value === 'string') {
    const avgLength = nonNullValues.reduce((acc: number, v) => acc + String(v).length, 0) / nonNullValues.length;
    if (avgLength > 100) {
      return 'text';
    }
  }

  return 'categorical';
}

/**
 * Collect all values for a given JSON path across records
 */
function collectValuesForPath(records: Record<string, unknown>[], path: string): unknown[] {
  const values: unknown[] = [];
  const parts = path.split('.');

  records.forEach(record => {
    let current: unknown = record;

    for (const part of parts) {
      if (current === null || current === undefined) break;

      if (typeof current === 'object' && !Array.isArray(current)) {
        current = (current as Record<string, unknown>)[part];
      } else if (Array.isArray(current)) {
        // Handle array - collect from all items
        current.forEach(item => {
          if (typeof item === 'object' && item !== null) {
            const val = (item as Record<string, unknown>)[part];
            if (val !== undefined) values.push(val);
          }
        });
        return;
      } else {
        break;
      }
    }

    if (current !== undefined) {
      values.push(current);
    }
  });

  return values;
}

/**
 * Get value at path from a single record
 */
export function getValueAtPath(record: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.');
  let current: unknown = record;

  for (const part of parts) {
    if (current === null || current === undefined) return undefined;

    if (typeof current === 'object' && !Array.isArray(current)) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }

  return current;
}

/**
 * Convert boolean-like values to actual booleans
 */
export function normalizeBooleanValue(value: unknown): boolean | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'boolean') return value;
  if (value === 'true' || value === 'True' || value === 'yes' || value === 'Yes' || value === 1) return true;
  if (value === 'false' || value === 'False' || value === 'no' || value === 'No' || value === 0) return false;
  return null;
}

/**
 * Filter variables suitable for cross-tabulation
 */
export function filterCategoricalVariables(variables: ExtractedVariable[]): ExtractedVariable[] {
  return variables.filter(v => {
    if (v.type !== 'categorical' && v.type !== 'boolean') return false;

    const nonNullValues = v.values.filter(val => val !== null && val !== undefined);
    if (nonNullValues.length < 30) return false; // Not enough data

    const uniqueValues = new Set(nonNullValues.map(val => String(val)));
    // Need at least 2 categories but not too many
    return uniqueValues.size >= 2 && uniqueValues.size <= 15;
  });
}

/**
 * Filter variables suitable for subgroup analysis (grouping variable)
 */
export function filterGroupingVariables(variables: ExtractedVariable[]): ExtractedVariable[] {
  return variables.filter(v => {
    if (v.type !== 'categorical') return false;

    const nonNullValues = v.values.filter(val => val !== null && val !== undefined);
    if (nonNullValues.length < 50) return false;

    const uniqueValues = new Set(nonNullValues.map(val => String(val)));
    // Good grouping variables have 2-10 categories
    return uniqueValues.size >= 2 && uniqueValues.size <= 10;
  });
}

/**
 * Filter variables suitable as targets for subgroup analysis
 */
export function filterTargetVariables(variables: ExtractedVariable[]): ExtractedVariable[] {
  return variables.filter(v => {
    if (v.type !== 'boolean' && v.type !== 'continuous') return false;

    const nonNullValues = v.values.filter(val => val !== null && val !== undefined);
    return nonNullValues.length >= 30;
  });
}

/**
 * Get unique value counts for a categorical variable
 */
export function getValueDistribution(values: unknown[]): Record<string, number> {
  const distribution: Record<string, number> = {};

  values.forEach(v => {
    if (v === null || v === undefined) return;
    const key = String(v);
    distribution[key] = (distribution[key] || 0) + 1;
  });

  return distribution;
}

/**
 * Get mode (most frequent value) from distribution
 */
export function getMode(distribution: Record<string, number>): string | null {
  let mode: string | null = null;
  let maxCount = 0;

  Object.entries(distribution).forEach(([value, count]) => {
    if (count > maxCount) {
      maxCount = count;
      mode = value;
    }
  });

  return mode;
}
