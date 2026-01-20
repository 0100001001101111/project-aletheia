/**
 * Current Space Weather API Endpoint
 * Returns real-time space weather conditions from NOAA SWPC
 */

import { NextResponse } from 'next/server';
import { getCurrentSpaceWeather } from '@/lib/space-weather';

export const revalidate = 300; // Cache for 5 minutes

export async function GET() {
  try {
    const spaceWeather = await getCurrentSpaceWeather();

    return NextResponse.json({
      ...spaceWeather,
      timestamp: spaceWeather.timestamp.toISOString(),
      cached_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Space weather API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch space weather data' },
      { status: 500 }
    );
  }
}
