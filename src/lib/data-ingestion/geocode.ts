/**
 * Simple geocoding utilities
 * Uses state centroids for US records without precise coordinates
 */

// US State centroids (approximate geographic centers)
export const US_STATE_CENTROIDS: Record<string, { lat: number; lng: number }> = {
  'AL': { lat: 32.806671, lng: -86.791130 },
  'AK': { lat: 61.370716, lng: -152.404419 },
  'AZ': { lat: 33.729759, lng: -111.431221 },
  'AR': { lat: 34.969704, lng: -92.373123 },
  'CA': { lat: 36.116203, lng: -119.681564 },
  'CO': { lat: 39.059811, lng: -105.311104 },
  'CT': { lat: 41.597782, lng: -72.755371 },
  'DE': { lat: 39.318523, lng: -75.507141 },
  'FL': { lat: 27.766279, lng: -81.686783 },
  'GA': { lat: 33.040619, lng: -83.643074 },
  'HI': { lat: 21.094318, lng: -157.498337 },
  'ID': { lat: 44.240459, lng: -114.478828 },
  'IL': { lat: 40.349457, lng: -88.986137 },
  'IN': { lat: 39.849426, lng: -86.258278 },
  'IA': { lat: 42.011539, lng: -93.210526 },
  'KS': { lat: 38.526600, lng: -96.726486 },
  'KY': { lat: 37.668140, lng: -84.670067 },
  'LA': { lat: 31.169546, lng: -91.867805 },
  'ME': { lat: 44.693947, lng: -69.381927 },
  'MD': { lat: 39.063946, lng: -76.802101 },
  'MA': { lat: 42.230171, lng: -71.530106 },
  'MI': { lat: 43.326618, lng: -84.536095 },
  'MN': { lat: 45.694454, lng: -93.900192 },
  'MS': { lat: 32.741646, lng: -89.678696 },
  'MO': { lat: 38.456085, lng: -92.288368 },
  'MT': { lat: 46.921925, lng: -110.454353 },
  'NE': { lat: 41.125370, lng: -98.268082 },
  'NV': { lat: 38.313515, lng: -117.055374 },
  'NH': { lat: 43.452492, lng: -71.563896 },
  'NJ': { lat: 40.298904, lng: -74.521011 },
  'NM': { lat: 34.840515, lng: -106.248482 },
  'NY': { lat: 42.165726, lng: -74.948051 },
  'NC': { lat: 35.630066, lng: -79.806419 },
  'ND': { lat: 47.528912, lng: -99.784012 },
  'OH': { lat: 40.388783, lng: -82.764915 },
  'OK': { lat: 35.565342, lng: -96.928917 },
  'OR': { lat: 44.572021, lng: -122.070938 },
  'PA': { lat: 40.590752, lng: -77.209755 },
  'RI': { lat: 41.680893, lng: -71.511780 },
  'SC': { lat: 33.856892, lng: -80.945007 },
  'SD': { lat: 44.299782, lng: -99.438828 },
  'TN': { lat: 35.747845, lng: -86.692345 },
  'TX': { lat: 31.054487, lng: -97.563461 },
  'UT': { lat: 40.150032, lng: -111.862434 },
  'VT': { lat: 44.045876, lng: -72.710686 },
  'VA': { lat: 37.769337, lng: -78.169968 },
  'WA': { lat: 47.400902, lng: -121.490494 },
  'WV': { lat: 38.491226, lng: -80.954453 },
  'WI': { lat: 44.268543, lng: -89.616508 },
  'WY': { lat: 42.755966, lng: -107.302490 },
  'DC': { lat: 38.897438, lng: -77.026817 },
  // Canadian provinces (rough centers)
  'AB': { lat: 53.9333, lng: -116.5765 },
  'BC': { lat: 53.7267, lng: -127.6476 },
  'MB': { lat: 53.7609, lng: -98.8139 },
  'NB': { lat: 46.5653, lng: -66.4619 },
  'NL': { lat: 53.1355, lng: -57.6604 },
  'NS': { lat: 44.6820, lng: -63.7443 },
  'NT': { lat: 64.2823, lng: -119.1835 },
  'NU': { lat: 70.2998, lng: -83.1076 },
  'ON': { lat: 51.2538, lng: -85.3232 },
  'PE': { lat: 46.5107, lng: -63.4168 },
  'QC': { lat: 52.9399, lng: -73.5491 },
  'SK': { lat: 52.9399, lng: -106.4509 },
  'YT': { lat: 64.2823, lng: -135.0000 },
};

/**
 * Parse location string and return coordinates
 * Returns state centroid if city-level geocoding not available
 */
export function parseLocationToCoords(location: string): { lat: number; lng: number } | null {
  if (!location) return null;

  // Try "City, ST, USA" format
  const usMatch = location.match(/,\s*([A-Z]{2}),\s*USA$/i);
  if (usMatch) {
    const state = usMatch[1].toUpperCase();
    if (US_STATE_CENTROIDS[state]) {
      return US_STATE_CENTROIDS[state];
    }
  }

  // Try "City, Province, Canada" format
  const caMatch = location.match(/,\s*([A-Z]{2}),\s*Canada$/i);
  if (caMatch) {
    const province = caMatch[1].toUpperCase();
    if (US_STATE_CENTROIDS[province]) {
      return US_STATE_CENTROIDS[province];
    }
  }

  // Try to find any state code
  const stateMatch = location.match(/,\s*([A-Z]{2})(?:\s|,|$)/i);
  if (stateMatch) {
    const state = stateMatch[1].toUpperCase();
    if (US_STATE_CENTROIDS[state]) {
      return US_STATE_CENTROIDS[state];
    }
  }

  return null;
}

/**
 * Add some randomness to state centroid to distribute points
 * This prevents all records from the same state clustering at one point
 */
export function jitterCoords(
  coords: { lat: number; lng: number },
  maxOffsetDegrees: number = 1.5
): { lat: number; lng: number } {
  return {
    lat: coords.lat + (Math.random() - 0.5) * maxOffsetDegrees * 2,
    lng: coords.lng + (Math.random() - 0.5) * maxOffsetDegrees * 2,
  };
}
