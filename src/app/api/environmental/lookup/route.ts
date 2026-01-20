import { NextResponse } from 'next/server';

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

    const results: Record<string, unknown> = {
      coordinates: { latitude, longitude },
      fetchedAt: new Date().toISOString(),
    };

    // Fetch Kp index from NOAA (if date provided)
    if (date) {
      try {
        // For historical dates, we use our space_weather table
        // For current/recent, we could use NOAA API
        const eventDate = new Date(date);
        const now = new Date();
        const daysDiff = Math.floor((now.getTime() - eventDate.getTime()) / (1000 * 60 * 60 * 24));

        if (daysDiff <= 30) {
          // Recent date - try NOAA real-time
          const kpResponse = await fetch(
            'https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json',
            { next: { revalidate: 300 } } // Cache for 5 minutes
          );

          if (kpResponse.ok) {
            const kpData = await kpResponse.json();
            // kpData is array of [timestamp, Kp, a_running, station_count]
            if (kpData.length > 1) {
              const latestKp = kpData[kpData.length - 1];
              results.kpIndex = {
                value: parseFloat(latestKp[1]),
                timestamp: latestKp[0],
                source: 'NOAA SWPC',
              };
            }
          }
        } else {
          // Historical date - would need to query our space_weather table
          results.kpIndex = {
            value: null,
            note: 'Historical Kp data requires database lookup',
            source: 'GFZ Potsdam archive',
          };
        }
      } catch (kpError) {
        console.error('Kp fetch error:', kpError);
        results.kpIndex = { error: 'Failed to fetch Kp data' };
      }
    }

    // Fetch geology data from USGS
    try {
      // USGS Geology API - get bedrock information
      // Note: This is a simplified example. Real implementation would use proper USGS API
      const geoResponse = await fetch(
        `https://mrdata.usgs.gov/geology/state/json/state-geol-polygons.json?lat=${latitude}&lon=${longitude}`,
        { next: { revalidate: 86400 } } // Cache for 24 hours
      );

      if (geoResponse.ok) {
        const geoData = await geoResponse.json();
        results.geology = {
          bedrockType: geoData.rocktype || 'Unknown',
          piezoelectricContent: estimatePiezoelectric(geoData.rocktype),
          source: 'USGS',
        };
      } else {
        // Fallback to basic estimation
        results.geology = {
          bedrockType: 'Unknown',
          piezoelectricContent: 'Unknown',
          note: 'USGS API unavailable',
        };
      }
    } catch (geoError) {
      console.error('Geology fetch error:', geoError);
      results.geology = { error: 'Failed to fetch geology data' };
    }

    // Fetch seismic data from USGS
    try {
      // Query recent earthquakes within 200km
      const radius = 200; // km
      const startTime = date
        ? new Date(new Date(date).getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const endTime = date
        ? new Date(date).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0];

      const seismicResponse = await fetch(
        `https://earthquake.usgs.gov/fdsnws/event/1/count?format=geojson&latitude=${latitude}&longitude=${longitude}&maxradiuskm=${radius}&starttime=${startTime}&endtime=${endTime}&minmagnitude=2.5`,
        { next: { revalidate: 3600 } } // Cache for 1 hour
      );

      if (seismicResponse.ok) {
        const seismicData = await seismicResponse.json();
        results.seismic = {
          earthquakesNearby: seismicData.count || 0,
          radius: radius,
          period: '7 days before event',
          minMagnitude: 2.5,
          source: 'USGS Earthquake Catalog',
        };
      }
    } catch (seismicError) {
      console.error('Seismic fetch error:', seismicError);
      results.seismic = { error: 'Failed to fetch seismic data' };
    }

    // Calculate Local Sidereal Time (LST)
    if (date) {
      try {
        const lst = calculateLST(longitude, new Date(date));
        results.localSiderealTime = {
          value: lst,
          formatted: formatLST(lst),
          note: 'Relevant for Spottiswoode hypothesis testing',
        };
      } catch (lstError) {
        console.error('LST calculation error:', lstError);
        results.localSiderealTime = { error: 'Failed to calculate LST' };
      }
    }

    // Estimate fault distance (simplified)
    results.faultDistance = {
      nearestFault: 'Unknown',
      distance: null,
      note: 'Requires detailed fault database query',
    };

    return NextResponse.json(results);
  } catch (error) {
    console.error('Environmental lookup error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Helper function to estimate piezoelectric content based on rock type
function estimatePiezoelectric(rockType: string | null): string {
  if (!rockType) return 'Unknown';

  const highPiezo = ['granite', 'quartz', 'quartzite', 'pegmatite'];
  const mediumPiezo = ['gneiss', 'schist', 'sandstone'];

  const rockLower = rockType.toLowerCase();

  if (highPiezo.some(r => rockLower.includes(r))) {
    return 'High (quartz-bearing)';
  }
  if (mediumPiezo.some(r => rockLower.includes(r))) {
    return 'Medium';
  }
  return 'Low';
}

// Calculate Local Sidereal Time
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

// Format LST as hours:minutes
function formatLST(lst: number): string {
  const hours = Math.floor(lst);
  const minutes = Math.round((lst - hours) * 60);
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}
