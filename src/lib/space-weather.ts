/**
 * Space Weather Integration Library
 *
 * Fetches and processes space weather data from NOAA SWPC and GFZ Potsdam
 * for correlation analysis with anomalous experiences.
 *
 * Data Sources:
 * - NOAA SWPC: Real-time Kp, solar wind, X-ray flux
 * - GFZ Potsdam: Historical Kp data (1932-present)
 * - NASA DONKI: CME and flare catalogs
 */

// Types
export interface SpaceWeatherRecord {
  timestamp: Date;
  kp_index: number | null;
  ap_index: number | null;
  dst_index: number | null;
  bz_component: number | null;
  solar_wind_speed: number | null;
  solar_wind_density: number | null;
  xray_flux: number | null;
  flare_class: string | null;
  geomagnetic_storm: boolean;
  major_storm: boolean;
  severe_storm: boolean;
  solar_flare_event: boolean;
  major_flare: boolean;
  data_source: string;
}

export interface SpaceWeatherContext {
  kp_index: number | null;
  ap_index: number | null;
  dst_index: number | null;
  bz_component: number | null;
  solar_wind_speed: number | null;
  solar_wind_density: number | null;
  conditions: string[];
  recent_flares: Array<{
    class: string;
    timestamp: string;
    hours_before: number;
  }>;
  recent_cme: {
    arrival: string;
    hours_before: number;
  } | null;
}

export interface KpIndexRecord {
  timestamp: Date;
  kp: number;
  ap: number;
}

// NOAA SWPC API endpoints
const NOAA_KP_URL = 'https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json';
const NOAA_PLASMA_URL = 'https://services.swpc.noaa.gov/products/solar-wind/plasma-7-day.json';
const NOAA_MAG_URL = 'https://services.swpc.noaa.gov/products/solar-wind/mag-7-day.json';
const NOAA_XRAY_URL = 'https://services.swpc.noaa.gov/json/goes/primary/xrays-7-day.json';

// GFZ Potsdam historical Kp data
const GFZ_KP_URL = 'https://www-app3.gfz-potsdam.de/kp_index/Kp_ap_since_1932.txt';

/**
 * Parse NOAA Kp index JSON response
 */
export function parseNoaaKpData(data: string[][]): KpIndexRecord[] {
  // Skip header row
  return data.slice(1).map(row => ({
    timestamp: new Date(row[0] + 'Z'),
    kp: parseFloat(row[1]),
    ap: parseInt(row[2], 10),
  }));
}

/**
 * Parse GFZ Potsdam historical Kp data
 * Format: YYYY MM DD hh.h hh._m days days_m Kp ap D
 */
export function parseGfzKpLine(line: string): KpIndexRecord | null {
  // Skip comment lines
  if (line.startsWith('#') || line.trim() === '') {
    return null;
  }

  const parts = line.trim().split(/\s+/);
  if (parts.length < 9) {
    return null;
  }

  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);
  const hour = parseFloat(parts[3]);
  const kp = parseFloat(parts[7]);
  const ap = parseInt(parts[8], 10);

  // Skip invalid data (-1 indicates missing)
  if (kp < 0 || ap < 0) {
    return null;
  }

  const timestamp = new Date(Date.UTC(year, month - 1, day, Math.floor(hour)));

  return { timestamp, kp, ap };
}

/**
 * Fetch current Kp index from NOAA SWPC
 */
export async function fetchCurrentKp(): Promise<KpIndexRecord[]> {
  const response = await fetch(NOAA_KP_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch NOAA Kp data: ${response.status}`);
  }
  const data = await response.json();
  return parseNoaaKpData(data);
}

/**
 * Fetch current solar wind data from NOAA SWPC
 */
export async function fetchSolarWind(): Promise<{
  plasma: Array<{ timestamp: Date; density: number; speed: number; temperature: number }>;
  mag: Array<{ timestamp: Date; bz: number; bt: number }>;
}> {
  const [plasmaRes, magRes] = await Promise.all([
    fetch(NOAA_PLASMA_URL),
    fetch(NOAA_MAG_URL),
  ]);

  if (!plasmaRes.ok || !magRes.ok) {
    throw new Error('Failed to fetch solar wind data');
  }

  const plasmaData = await plasmaRes.json();
  const magData = await magRes.json();

  // Parse plasma data (skip header)
  const plasma = plasmaData.slice(1).map((row: string[]) => ({
    timestamp: new Date(row[0] + 'Z'),
    density: parseFloat(row[1]),
    speed: parseFloat(row[2]),
    temperature: parseFloat(row[3]),
  }));

  // Parse mag data (skip header) - bz_gsm is index 3
  const mag = magData.slice(1).map((row: string[]) => ({
    timestamp: new Date(row[0] + 'Z'),
    bz: parseFloat(row[3]),
    bt: parseFloat(row[6]),
  }));

  return { plasma, mag };
}

/**
 * Classify geomagnetic activity level from Kp index
 */
export function classifyGeomagneticActivity(kp: number): {
  level: string;
  storm: boolean;
  majorStorm: boolean;
  severeStorm: boolean;
} {
  if (kp >= 8) {
    return { level: 'Severe Storm (G4-G5)', storm: true, majorStorm: true, severeStorm: true };
  } else if (kp >= 7) {
    return { level: 'Strong Storm (G3)', storm: true, majorStorm: true, severeStorm: false };
  } else if (kp >= 6) {
    return { level: 'Moderate Storm (G2)', storm: true, majorStorm: false, severeStorm: false };
  } else if (kp >= 5) {
    return { level: 'Minor Storm (G1)', storm: true, majorStorm: false, severeStorm: false };
  } else if (kp >= 4) {
    return { level: 'Active', storm: false, majorStorm: false, severeStorm: false };
  } else if (kp >= 3) {
    return { level: 'Unsettled', storm: false, majorStorm: false, severeStorm: false };
  } else {
    return { level: 'Quiet', storm: false, majorStorm: false, severeStorm: false };
  }
}

/**
 * Classify solar flare from X-ray class
 */
export function classifyFlare(flareClass: string): {
  isFlare: boolean;
  isMajor: boolean;
  intensity: number;
} {
  if (!flareClass) {
    return { isFlare: false, isMajor: false, intensity: 0 };
  }

  const classLetter = flareClass.charAt(0).toUpperCase();
  const classNumber = parseFloat(flareClass.slice(1)) || 1;

  // X-ray flux class scale: A < B < C < M < X
  const classMultipliers: Record<string, number> = {
    'A': 1,
    'B': 10,
    'C': 100,
    'M': 1000,
    'X': 10000,
  };

  const multiplier = classMultipliers[classLetter] || 0;
  const intensity = multiplier * classNumber;

  return {
    isFlare: classLetter === 'M' || classLetter === 'X',
    isMajor: classLetter === 'X',
    intensity,
  };
}

/**
 * Find Kp index at a specific timestamp from historical records
 * Uses binary search for efficiency
 */
export function findKpAtTimestamp(
  records: KpIndexRecord[],
  targetTimestamp: Date,
  maxHoursOffset: number = 3
): KpIndexRecord | null {
  const targetTime = targetTimestamp.getTime();
  const maxOffsetMs = maxHoursOffset * 60 * 60 * 1000;

  // Binary search for closest record
  let left = 0;
  let right = records.length - 1;
  let closest: KpIndexRecord | null = null;
  let closestDiff = Infinity;

  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    const record = records[mid];
    const recordTime = record.timestamp.getTime();
    const diff = Math.abs(targetTime - recordTime);

    if (diff < closestDiff) {
      closestDiff = diff;
      closest = record;
    }

    if (recordTime < targetTime) {
      left = mid + 1;
    } else if (recordTime > targetTime) {
      right = mid - 1;
    } else {
      return record; // Exact match
    }
  }

  // Return null if closest record is beyond max offset
  if (closestDiff > maxOffsetMs) {
    return null;
  }

  return closest;
}

/**
 * Build space weather context object for an investigation
 */
export function buildSpaceWeatherContext(
  kpRecord: KpIndexRecord | null,
  bzValue: number | null = null,
  solarWindSpeed: number | null = null
): SpaceWeatherContext {
  const conditions: string[] = [];

  if (kpRecord) {
    const activity = classifyGeomagneticActivity(kpRecord.kp);
    if (activity.severeStorm) {
      conditions.push('severe_storm');
    } else if (activity.majorStorm) {
      conditions.push('major_storm');
    } else if (activity.storm) {
      conditions.push('geomagnetic_storm');
    } else if (kpRecord.kp >= 4) {
      conditions.push('elevated_kp');
    } else if (kpRecord.kp < 2) {
      conditions.push('quiet');
    }
  }

  if (bzValue !== null && bzValue < -5) {
    conditions.push('negative_bz');
  }

  if (solarWindSpeed !== null && solarWindSpeed > 600) {
    conditions.push('high_solar_wind');
  }

  return {
    kp_index: kpRecord?.kp ?? null,
    ap_index: kpRecord?.ap ?? null,
    dst_index: null, // Would need separate data source
    bz_component: bzValue,
    solar_wind_speed: solarWindSpeed,
    solar_wind_density: null,
    conditions,
    recent_flares: [], // Would need flare data
    recent_cme: null, // Would need CME data
  };
}

/**
 * Get current space weather summary
 */
export async function getCurrentSpaceWeather(): Promise<{
  timestamp: Date;
  kp_index: number;
  ap_index: number;
  bz_component: number | null;
  solar_wind_speed: number | null;
  solar_wind_density: number | null;
  conditions: string[];
  activity_level: string;
}> {
  const [kpRecords, solarWind] = await Promise.all([
    fetchCurrentKp(),
    fetchSolarWind(),
  ]);

  // Get most recent Kp
  const latestKp = kpRecords[kpRecords.length - 1];

  // Get most recent solar wind data (average last 10 minutes)
  const recentPlasma = solarWind.plasma.slice(-10);
  const recentMag = solarWind.mag.slice(-10);

  const avgSpeed = recentPlasma.length > 0
    ? recentPlasma.reduce((sum, p) => sum + p.speed, 0) / recentPlasma.length
    : null;
  const avgDensity = recentPlasma.length > 0
    ? recentPlasma.reduce((sum, p) => sum + p.density, 0) / recentPlasma.length
    : null;
  const avgBz = recentMag.length > 0
    ? recentMag.reduce((sum, m) => sum + m.bz, 0) / recentMag.length
    : null;

  const context = buildSpaceWeatherContext(latestKp, avgBz, avgSpeed);
  const activity = classifyGeomagneticActivity(latestKp.kp);

  return {
    timestamp: latestKp.timestamp,
    kp_index: latestKp.kp,
    ap_index: latestKp.ap,
    bz_component: avgBz,
    solar_wind_speed: avgSpeed,
    solar_wind_density: avgDensity,
    conditions: context.conditions,
    activity_level: activity.level,
  };
}

/**
 * Stream-parse GFZ historical data and return records in date range
 */
export async function* streamGfzKpData(
  startYear?: number,
  endYear?: number
): AsyncGenerator<KpIndexRecord> {
  const response = await fetch(GFZ_KP_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch GFZ Kp data: ${response.status}`);
  }

  const text = await response.text();
  const lines = text.split('\n');

  for (const line of lines) {
    const record = parseGfzKpLine(line);
    if (!record) continue;

    const year = record.timestamp.getUTCFullYear();
    if (startYear && year < startYear) continue;
    if (endYear && year > endYear) continue;

    yield record;
  }
}

/**
 * Fetch all GFZ Kp data for a date range (returns array)
 */
export async function fetchGfzKpData(
  startYear?: number,
  endYear?: number
): Promise<KpIndexRecord[]> {
  const records: KpIndexRecord[] = [];

  for await (const record of streamGfzKpData(startYear, endYear)) {
    records.push(record);
  }

  return records;
}
