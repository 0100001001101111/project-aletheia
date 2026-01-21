/**
 * Data parsers for different source formats
 */

import {
  RawNuforcRecord,
  RawBfroRecord,
  ParsedInvestigation,
  DataSource,
} from './types';
import { parseLocationToCoords, jitterCoords } from './geocode';

/**
 * Parse location string into lat/lng
 * Examples: "San Francisco, CA", "Los Angeles (CA)"
 */
function parseLocation(location: string | undefined): { city?: string; state?: string } {
  if (!location) return {};

  // Try "City, State" format
  const commaMatch = location.match(/^([^,]+),\s*([A-Z]{2})$/i);
  if (commaMatch) {
    return { city: commaMatch[1].trim(), state: commaMatch[2].toUpperCase() };
  }

  // Try "City (State)" format
  const parenMatch = location.match(/^([^(]+)\s*\(([A-Z]{2})\)$/i);
  if (parenMatch) {
    return { city: parenMatch[1].trim(), state: parenMatch[2].toUpperCase() };
  }

  return { city: location };
}

/**
 * Parse date string into Date object
 * Handles various formats: "2024-01-15", "01/15/2024", "January 15, 2024"
 */
function parseDate(dateStr: string | undefined): Date | null {
  if (!dateStr) return null;

  const parsed = new Date(dateStr);
  if (!isNaN(parsed.getTime())) {
    // Sanity check: year between 1800 and 2100
    const year = parsed.getFullYear();
    if (year >= 1800 && year <= 2100) {
      return parsed;
    }
  }

  return null;
}

/**
 * Parse NUFORC record into standard investigation format
 */
export function parseNuforcRecord(record: RawNuforcRecord): ParsedInvestigation | null {
  // Generate source ID
  const sourceId = record.Sighting?.toString() ||
    `nuforc_${record.Occurred}_${record.Location}`.replace(/[^a-zA-Z0-9]/g, '_');

  // Parse location
  const location = parseLocation(record.Location);

  // Get coordinates (prefer direct lat/lng if available, fallback to geocoding)
  let latitude = record.latitude ?? record.city_latitude ?? null;
  let longitude = record.longitude ?? record.city_longitude ?? null;

  // If no coordinates, try to geocode from location string
  if (latitude === null || longitude === null) {
    const geocoded = parseLocationToCoords(record.Location || '');
    if (geocoded) {
      // Jitter to prevent all records from same state clustering at one point
      const jittered = jitterCoords(geocoded, 1.0);
      latitude = jittered.lat;
      longitude = jittered.lng;
    }
  }

  // Parse event date
  const eventDate = parseDate(record.Occurred);

  // Build title
  const title = record.Summary ||
    `UFO sighting in ${record.Location || 'Unknown location'}`;

  // Build description
  const description = record.Text || record.Summary || '';

  // Build characteristics array
  const characteristics: string[] = [];
  if (record['Lights on object']) characteristics.push('Lights on object');
  if (record['Aura or haze around object']) characteristics.push('Aura/haze');
  if (record['Aircraft nearby']) characteristics.push('Aircraft nearby');
  if (record['Animals reacted']) characteristics.push('Animals reacted');
  if (record['Left a trail']) characteristics.push('Trail');
  if (record['Emitted other objects']) characteristics.push('Emitted objects');
  if (record['Changed Color']) characteristics.push('Color change');
  if (record['Emitted beams']) characteristics.push('Beams');
  if (record['Electrical or magnetic effects']) characteristics.push('EM effects');
  if (record['Possible abduction']) characteristics.push('Possible abduction');
  if (record['Missing Time']) characteristics.push('Missing time');
  if (record.Landed) characteristics.push('Landed');

  return {
    sourceId,
    dataSource: 'nuforc',
    investigationType: 'ufo',
    title: title.slice(0, 500),
    description,
    latitude,
    longitude,
    eventDate,
    rawData: {
      ...record,
      date_time: record.Occurred,
      shape: record.Shape,
      duration: record.Duration,
      observers: record['No of observers'],
      reported_at: record.Reported,
      posted_at: record.Posted,
      characteristics,
      explanation: record.Explanation,
      location: {
        city: location.city,
        state: location.state,
        latitude,
        longitude,
        details: record['Location details'],
      },
    },
  };
}

/**
 * Parse BFRO record into standard investigation format
 */
export function parseBfroRecord(record: RawBfroRecord): ParsedInvestigation | null {
  // Generate source ID
  const sourceId = record.number?.toString() ||
    `bfro_${record.date}_${record.county}_${record.state}`.replace(/[^a-zA-Z0-9]/g, '_');

  // Get coordinates
  const latitude = record.latitude ?? null;
  const longitude = record.longitude ?? null;

  // Parse event date
  const eventDate = parseDate(record.date || record.observed);

  // Build title
  const title = record.title ||
    `Bigfoot sighting in ${record.county || ''}, ${record.state || 'Unknown'}`;

  // Build description
  const description = record.observed_text || record.observed || '';

  return {
    sourceId,
    dataSource: 'bfro',
    investigationType: 'bigfoot',
    title: title.slice(0, 500),
    description,
    latitude,
    longitude,
    eventDate,
    rawData: {
      ...record,
      classification: record.classification,
      location: {
        county: record.county,
        state: record.state,
        latitude,
        longitude,
        nearest_town: record.nearest_town,
        nearest_road: record.nearest_road,
        details: record.location_details,
        environment: record.environment,
      },
      time_and_conditions: record.time_and_conditions,
      also_noticed: record.also_noticed,
      other_witnesses: record.other_witnesses,
      other_stories: record.other_stories,
    },
  };
}

/**
 * Parse CSV row based on source type
 */
export function parseRecord(
  record: Record<string, unknown>,
  source: DataSource
): ParsedInvestigation | null {
  switch (source) {
    case 'nuforc':
      return parseNuforcRecord(record as RawNuforcRecord);
    case 'bfro':
      return parseBfroRecord(record as RawBfroRecord);
    default:
      return null;
  }
}

/**
 * Validate parsed investigation
 */
export function validateInvestigation(inv: ParsedInvestigation): string[] {
  const errors: string[] = [];

  if (!inv.sourceId) {
    errors.push('Missing source ID');
  }

  if (!inv.title) {
    errors.push('Missing title');
  }

  // Validate coordinates if present
  if (inv.latitude !== null) {
    if (inv.latitude < -90 || inv.latitude > 90) {
      errors.push(`Invalid latitude: ${inv.latitude}`);
    }
  }

  if (inv.longitude !== null) {
    if (inv.longitude < -180 || inv.longitude > 180) {
      errors.push(`Invalid longitude: ${inv.longitude}`);
    }
  }

  // Validate event date if present
  if (inv.eventDate) {
    const year = inv.eventDate.getFullYear();
    if (year < 1800 || year > 2100) {
      errors.push(`Invalid event year: ${year}`);
    }
  }

  return errors;
}
