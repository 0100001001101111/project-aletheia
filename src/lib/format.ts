/**
 * Format Utilities
 * Functions for formatting display text
 */

/**
 * Convert snake_case to Title Case
 * e.g., "nde_reports" -> "NDE Reports"
 * e.g., "cardiac_arrests" -> "Cardiac Arrests"
 */
export function snakeToTitle(str: string): string {
  // Special case abbreviations that should stay uppercase
  const abbreviations = ['nde', 'obe', 'uap', 'em', 'rv', 'id'];

  return str
    .split('_')
    .map(word => {
      if (abbreviations.includes(word.toLowerCase())) {
        return word.toUpperCase();
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

/**
 * Format a field name for display
 * Uses known field mappings or falls back to snakeToTitle
 */
const FIELD_NAME_OVERRIDES: Record<string, string> = {
  // NDE fields
  nde_reports: 'NDE Reports',
  obe_reports: 'OBE Reports',
  cardiac_arrests: 'Cardiac Arrests',
  survivors_interviewed: 'Survivors Interviewed',
  near_misses: 'Near Misses',
  target_hits: 'Target Hits',
  // Common fields
  study_period: 'Study Period',
  ethics_approval: 'Ethics Approval',
  hospitals: 'Hospitals',
  methodology: 'Methodology',
  p_value: 'P-Value',
  hit_rate: 'Hit Rate',
  sample_size: 'Sample Size',
  // Timestamps
  created_at: 'Created',
  updated_at: 'Updated',
  resolved_at: 'Resolved',
};

export function formatFieldName(fieldName: string): string {
  // Check for override first
  if (FIELD_NAME_OVERRIDES[fieldName]) {
    return FIELD_NAME_OVERRIDES[fieldName];
  }
  // Fall back to automatic conversion
  return snakeToTitle(fieldName);
}

/**
 * Format a value for display
 * Handles various types appropriately
 */
export function formatValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '—';
  }
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }
  if (typeof value === 'number') {
    // Format percentages
    if (value > 0 && value <= 1) {
      return `${(value * 100).toFixed(1)}%`;
    }
    return value.toLocaleString();
  }
  if (Array.isArray(value)) {
    return value.join(', ') || '—';
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
}
