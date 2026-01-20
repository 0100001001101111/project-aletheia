import { NextResponse } from 'next/server';

/**
 * Environmental Data Auto-Population API
 * Fetches environmental context from authoritative sources based on coordinates and timestamp.
 * User cannot override these values - they're used for objective scoring.
 */

interface EnvironmentalData {
  coordinates: { latitude: number; longitude: number };
  eventDate: string | null;
  autoPopulated: true;
  populatedAt: string;
  sources: string[];
  geology: GeologyData;
  seismic: SeismicData;
  geomagnetic: GeomagneticData;
  astronomical: AstronomicalData;
  environmentalModifiers: EnvironmentalModifier[];
}

interface GeologyData {
  bedrockType: string;
  piezoelectricContent: number;
  piezoelectricCategory: string;
  nearestFaultKm: number | null;
  faultName: string | null;
  source: string;
  error?: string;
}

interface SeismicData {
  eventsBefore7Days: number;
  eventsAfter7Days: number;
  largestMagnitude: number | null;
  eventCount: number;
  radiusKm: number;
  minMagnitude: number;
  source: string;
  error?: string;
}

interface GeomagneticData {
  kpIndex: number | null;
  kpCategory: 'quiet' | 'unsettled' | 'active' | 'minor_storm' | 'moderate_storm' | 'strong_storm' | 'unknown';
  solarWindSpeed: number | null;
  dstIndex: number | null;
  source: string;
  error?: string;
}

interface AstronomicalData {
  localSiderealTime: string;
  lstDecimalHours: number;
  inLstWindow: boolean;
  lstWindowNote: string;
  source: string;
  error?: string;
}

interface EnvironmentalModifier {
  type: string;
  factor: string;
  value: number;
  reason: string;
}

// POST /api/environmental/lookup - Fetch environmental data for coordinates
export async function POST(request: Request) {
  try {
    const { latitude, longitude, date } = await request.json();

    if (!latitude || !longitude) {
      return NextResponse.json(
        { error: 'Latitude and longitude are required' },
        { status: 400 }
      );
    }

    const eventDate = date ? new Date(date) : null;
    const sources: string[] = [];

    const results: EnvironmentalData = {
      coordinates: { latitude, longitude },
      eventDate: eventDate?.toISOString() || null,
      autoPopulated: true,
      populatedAt: new Date().toISOString(),
      sources: [],
      geology: await fetchGeologyData(latitude, longitude, sources),
      seismic: await fetchSeismicData(latitude, longitude, eventDate, sources),
      geomagnetic: await fetchGeomagneticData(eventDate, sources),
      astronomical: calculateAstronomicalData(longitude, eventDate, sources),
      environmentalModifiers: [],
    };

    results.sources = sources;

    // Calculate environmental modifiers for scoring
    results.environmentalModifiers = calculateEnvironmentalModifiers(results);

    return NextResponse.json(results);
  } catch (error) {
    console.error('Environmental lookup error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Fetch geology data from USGS
 */
async function fetchGeologyData(
  lat: number,
  lng: number,
  sources: string[]
): Promise<GeologyData> {
  try {
    // USGS StateGeology doesn't have a simple point query API
    // We'll use a simplified approach based on known geological patterns
    // In production, you'd use USGS WMS/WFS services or the Macrostrat API

    // Try Macrostrat API for geological data
    const geoResponse = await fetch(
      `https://macrostrat.org/api/v2/geologic_units/map?lat=${lat}&lng=${lng}&format=json`,
      { next: { revalidate: 86400 } }
    );

    if (geoResponse.ok) {
      const geoData = await geoResponse.json();
      sources.push('Macrostrat Geology API');

      if (geoData.success && geoData.success.data && geoData.success.data.length > 0) {
        const unit = geoData.success.data[0];
        const rockType = unit.lith || unit.name || 'Unknown';
        const piezoContent = calculatePiezoelectricContent(rockType);

        return {
          bedrockType: rockType,
          piezoelectricContent: piezoContent,
          piezoelectricCategory: categorizePiezoelectric(piezoContent),
          nearestFaultKm: null, // Would need separate fault database
          faultName: null,
          source: 'Macrostrat Geology API',
        };
      }
    }

    // Fallback to region-based estimation
    sources.push('Estimated (regional)');
    return {
      bedrockType: 'Unknown',
      piezoelectricContent: 0.3,
      piezoelectricCategory: 'Unknown',
      nearestFaultKm: null,
      faultName: null,
      source: 'Estimated',
    };
  } catch (error) {
    console.error('Geology fetch error:', error);
    return {
      bedrockType: 'Unknown',
      piezoelectricContent: 0.3,
      piezoelectricCategory: 'Unknown',
      nearestFaultKm: null,
      faultName: null,
      source: 'Error',
      error: String(error),
    };
  }
}

/**
 * Calculate piezoelectric content based on rock type
 * Quartz-bearing rocks score higher
 */
function calculatePiezoelectricContent(rockType: string): number {
  const piezoRatings: Record<string, number> = {
    granite: 0.8,
    quartzite: 0.9,
    quartz: 0.95,
    sandstone: 0.6,
    rhyolite: 0.7,
    gneiss: 0.6,
    schist: 0.5,
    pegmatite: 0.85,
    basalt: 0.2,
    limestone: 0.1,
    marble: 0.1,
    shale: 0.15,
    clay: 0.05,
    alluvium: 0.1,
    sedimentary: 0.3,
    volcanic: 0.4,
    metamorphic: 0.5,
    igneous: 0.6,
  };

  const rockTypeLower = rockType.toLowerCase();
  for (const [rock, rating] of Object.entries(piezoRatings)) {
    if (rockTypeLower.includes(rock)) {
      return rating;
    }
  }

  return 0.3; // Unknown default
}

function categorizePiezoelectric(content: number): string {
  if (content >= 0.7) return 'High (quartz-bearing)';
  if (content >= 0.4) return 'Medium';
  if (content >= 0.2) return 'Low';
  return 'Very Low';
}

/**
 * Fetch seismic data from USGS Earthquake API
 */
async function fetchSeismicData(
  lat: number,
  lng: number,
  eventDate: Date | null,
  sources: string[]
): Promise<SeismicData> {
  try {
    const radius = 100; // km
    const minMagnitude = 2.5;
    const referenceDate = eventDate || new Date();

    // Calculate date ranges
    const beforeStart = new Date(referenceDate.getTime() - 7 * 24 * 60 * 60 * 1000);
    const beforeEnd = new Date(referenceDate.getTime());
    const afterStart = new Date(referenceDate.getTime());
    const afterEnd = new Date(referenceDate.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Don't query future dates
    const now = new Date();
    const actualAfterEnd = afterEnd > now ? now : afterEnd;

    // Fetch earthquakes before event
    const beforeUrl = `https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&latitude=${lat}&longitude=${lng}&maxradiuskm=${radius}&starttime=${beforeStart.toISOString()}&endtime=${beforeEnd.toISOString()}&minmagnitude=${minMagnitude}`;
    const beforeResponse = await fetch(beforeUrl, { next: { revalidate: 3600 } });

    let eventsBefore = 0;
    let largestMagnitude: number | null = null;

    if (beforeResponse.ok) {
      const beforeData = await beforeResponse.json();
      eventsBefore = beforeData.features?.length || 0;
      if (beforeData.features?.length > 0) {
        largestMagnitude = Math.max(
          ...beforeData.features.map((f: { properties: { mag: number } }) => f.properties.mag || 0)
        );
      }
    }

    // Fetch earthquakes after event (if not in future)
    let eventsAfter = 0;
    if (actualAfterEnd > afterStart) {
      const afterUrl = `https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&latitude=${lat}&longitude=${lng}&maxradiuskm=${radius}&starttime=${afterStart.toISOString()}&endtime=${actualAfterEnd.toISOString()}&minmagnitude=${minMagnitude}`;
      const afterResponse = await fetch(afterUrl, { next: { revalidate: 3600 } });

      if (afterResponse.ok) {
        const afterData = await afterResponse.json();
        eventsAfter = afterData.features?.length || 0;
        if (afterData.features?.length > 0) {
          const afterMax = Math.max(
            ...afterData.features.map((f: { properties: { mag: number } }) => f.properties.mag || 0)
          );
          largestMagnitude = largestMagnitude !== null
            ? Math.max(largestMagnitude, afterMax)
            : afterMax;
        }
      }
    }

    sources.push('USGS Earthquake Catalog');

    return {
      eventsBefore7Days: eventsBefore,
      eventsAfter7Days: eventsAfter,
      largestMagnitude,
      eventCount: eventsBefore + eventsAfter,
      radiusKm: radius,
      minMagnitude,
      source: 'USGS Earthquake Catalog',
    };
  } catch (error) {
    console.error('Seismic fetch error:', error);
    return {
      eventsBefore7Days: 0,
      eventsAfter7Days: 0,
      largestMagnitude: null,
      eventCount: 0,
      radiusKm: 100,
      minMagnitude: 2.5,
      source: 'Error',
      error: String(error),
    };
  }
}

/**
 * Fetch geomagnetic data from NOAA SWPC
 */
async function fetchGeomagneticData(
  eventDate: Date | null,
  sources: string[]
): Promise<GeomagneticData> {
  try {
    const now = new Date();
    const referenceDate = eventDate || now;
    const daysDiff = Math.floor((now.getTime() - referenceDate.getTime()) / (1000 * 60 * 60 * 24));

    if (daysDiff <= 30) {
      // Recent date - use NOAA real-time
      const kpResponse = await fetch(
        'https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json',
        { next: { revalidate: 300 } }
      );

      if (kpResponse.ok) {
        const kpData = await kpResponse.json();
        if (kpData.length > 1) {
          // Find closest entry to event date
          let closestEntry = kpData[kpData.length - 1];
          let closestDiff = Infinity;

          for (let i = 1; i < kpData.length; i++) {
            const entryDate = new Date(kpData[i][0]);
            const diff = Math.abs(entryDate.getTime() - referenceDate.getTime());
            if (diff < closestDiff) {
              closestDiff = diff;
              closestEntry = kpData[i];
            }
          }

          const kpValue = parseFloat(closestEntry[1]);
          sources.push('NOAA SWPC');

          return {
            kpIndex: kpValue,
            kpCategory: categorizeKp(kpValue),
            solarWindSpeed: null,
            dstIndex: null,
            source: 'NOAA SWPC',
          };
        }
      }
    }

    // Historical date - would need GFZ archive
    sources.push('Historical (unavailable)');
    return {
      kpIndex: null,
      kpCategory: 'unknown',
      solarWindSpeed: null,
      dstIndex: null,
      source: 'Historical data requires archive lookup',
    };
  } catch (error) {
    console.error('Geomagnetic fetch error:', error);
    return {
      kpIndex: null,
      kpCategory: 'unknown',
      solarWindSpeed: null,
      dstIndex: null,
      source: 'Error',
      error: String(error),
    };
  }
}

/**
 * Categorize Kp index
 */
function categorizeKp(kp: number): GeomagneticData['kpCategory'] {
  if (kp < 2) return 'quiet';
  if (kp < 4) return 'unsettled';
  if (kp < 5) return 'active';
  if (kp < 6) return 'minor_storm';
  if (kp < 7) return 'moderate_storm';
  return 'strong_storm';
}

/**
 * Calculate astronomical data including LST
 */
function calculateAstronomicalData(
  longitude: number,
  eventDate: Date | null,
  sources: string[]
): AstronomicalData {
  try {
    if (!eventDate) {
      return {
        localSiderealTime: 'N/A',
        lstDecimalHours: 0,
        inLstWindow: false,
        lstWindowNote: 'Event date required for LST calculation',
        source: 'Calculated',
      };
    }

    const lst = calculateLST(longitude, eventDate);
    const inWindow = isInLstWindow(lst, 13, 14.5);

    sources.push('Calculated (astronomical algorithms)');

    return {
      localSiderealTime: formatLST(lst),
      lstDecimalHours: lst,
      inLstWindow: inWindow,
      lstWindowNote: inWindow
        ? 'Event occurred during 13:00-14:30 LST window (Spottiswoode/STARGATE correlation)'
        : 'Event outside 13:00-14:30 LST window',
      source: 'Calculated',
    };
  } catch (error) {
    console.error('Astronomical calculation error:', error);
    return {
      localSiderealTime: 'Error',
      lstDecimalHours: 0,
      inLstWindow: false,
      lstWindowNote: 'Calculation failed',
      source: 'Error',
      error: String(error),
    };
  }
}

/**
 * Calculate Local Sidereal Time
 */
function calculateLST(longitude: number, date: Date): number {
  // Julian Date calculation
  const JD = date.getTime() / 86400000 + 2440587.5;

  // Days since J2000.0
  const D = JD - 2451545.0;

  // Greenwich Mean Sidereal Time (in hours)
  let GMST = 18.697374558 + 24.06570982441908 * D;
  GMST = GMST % 24;
  if (GMST < 0) GMST += 24;

  // Local Sidereal Time (adjust for longitude)
  let LST = GMST + longitude / 15;
  LST = LST % 24;
  if (LST < 0) LST += 24;

  return LST;
}

function formatLST(lst: number): string {
  const hours = Math.floor(lst);
  const minutes = Math.round((lst - hours) * 60);
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

function isInLstWindow(lst: number, start: number, end: number): boolean {
  return lst >= start && lst <= end;
}

/**
 * Calculate environmental scoring modifiers based on auto-populated data
 */
function calculateEnvironmentalModifiers(data: EnvironmentalData): EnvironmentalModifier[] {
  const modifiers: EnvironmentalModifier[] = [];

  // High piezoelectric content supports geophysical hypothesis
  if (data.geology.piezoelectricContent >= 0.7) {
    modifiers.push({
      type: 'environmental_support',
      factor: 'piezoelectric_geology',
      value: 0.1,
      reason: `Location has high piezoelectric bedrock content (${data.geology.bedrockType})`,
    });
  }

  // Seismic activity correlation
  if (data.seismic.eventsBefore7Days > 0) {
    modifiers.push({
      type: 'environmental_support',
      factor: 'seismic_correlation',
      value: 0.15,
      reason: `${data.seismic.eventsBefore7Days} seismic event(s) within 7 days prior`,
    });
  }

  // Geomagnetic storm
  if (data.geomagnetic.kpIndex !== null && data.geomagnetic.kpIndex >= 5) {
    modifiers.push({
      type: 'environmental_support',
      factor: 'geomagnetic_activity',
      value: 0.1,
      reason: `Elevated geomagnetic activity (Kp=${data.geomagnetic.kpIndex}, ${data.geomagnetic.kpCategory})`,
    });
  }

  // LST window (STARGATE/Spottiswoode correlation)
  if (data.astronomical.inLstWindow) {
    modifiers.push({
      type: 'environmental_support',
      factor: 'lst_window',
      value: 0.05,
      reason: 'Event occurred during 13:00-14:30 LST window',
    });
  }

  return modifiers;
}
