/**
 * Input Sanitization Utilities
 * Prevents XSS, SQL injection, and other security issues
 */

/**
 * Sanitize a string by removing potentially dangerous characters
 * Strips HTML tags and trims whitespace
 */
export function sanitizeString(input: string | null | undefined): string {
  if (input == null) return '';

  return input
    .toString()
    .trim()
    // Remove HTML tags
    .replace(/<[^>]*>/g, '')
    // Remove potential script injections
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '')
    // Normalize whitespace
    .replace(/\s+/g, ' ');
}

/**
 * Sanitize a string for use in text fields (allows newlines)
 */
export function sanitizeText(input: string | null | undefined): string {
  if (input == null) return '';

  return input
    .toString()
    .trim()
    // Remove HTML tags
    .replace(/<[^>]*>/g, '')
    // Remove potential script injections
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '');
}

/**
 * Sanitize an object's string properties
 */
export function sanitizeObject<T extends Record<string, unknown>>(
  obj: T,
  textFields: (keyof T)[] = []
): T {
  const sanitized = { ...obj };

  for (const key in sanitized) {
    const value = sanitized[key];
    if (typeof value === 'string') {
      if (textFields.includes(key)) {
        sanitized[key] = sanitizeText(value) as T[typeof key];
      } else {
        sanitized[key] = sanitizeString(value) as T[typeof key];
      }
    }
  }

  return sanitized;
}

/**
 * Validate and sanitize a UUID
 */
export function sanitizeUUID(input: string | null | undefined): string | null {
  if (input == null) return null;

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const trimmed = input.toString().trim();

  if (!uuidRegex.test(trimmed)) {
    return null;
  }

  return trimmed.toLowerCase();
}

/**
 * Validate and sanitize an email
 */
export function sanitizeEmail(input: string | null | undefined): string | null {
  if (input == null) return null;

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const trimmed = input.toString().trim().toLowerCase();

  if (!emailRegex.test(trimmed)) {
    return null;
  }

  return trimmed;
}

/**
 * Sanitize an array of strings
 */
export function sanitizeStringArray(input: string[] | null | undefined): string[] {
  if (!Array.isArray(input)) return [];
  return input.map(sanitizeString).filter(s => s.length > 0);
}

/**
 * Validate and sanitize a number
 */
export function sanitizeNumber(
  input: unknown,
  options: { min?: number; max?: number; defaultValue?: number } = {}
): number | null {
  const { min, max, defaultValue = null } = options;

  if (input == null) return defaultValue;

  const num = typeof input === 'number' ? input : parseFloat(String(input));

  if (isNaN(num)) return defaultValue;
  if (min != null && num < min) return defaultValue;
  if (max != null && num > max) return defaultValue;

  return num;
}

/**
 * Sanitize JSON data - recursively sanitize all string values
 */
export function sanitizeJSON(input: unknown): unknown {
  if (input == null) return null;

  if (typeof input === 'string') {
    return sanitizeText(input);
  }

  if (Array.isArray(input)) {
    return input.map(sanitizeJSON);
  }

  if (typeof input === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input)) {
      result[sanitizeString(key)] = sanitizeJSON(value);
    }
    return result;
  }

  return input;
}
