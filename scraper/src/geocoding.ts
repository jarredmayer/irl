/**
 * Geocoding Service
 * Uses OpenStreetMap Nominatim API to verify and correct coordinates
 */

import { setTimeout } from 'timers/promises';

interface GeocodingResult {
  lat: number;
  lng: number;
  displayName: string;
  confidence: 'high' | 'medium' | 'low';
}

interface NominatimResponse {
  lat: string;
  lon: string;
  display_name: string;
  importance: number;
  type: string;
  class: string;
}

// Rate limit: Nominatim requires max 1 request per second
const RATE_LIMIT_MS = 1100;
let lastRequestTime = 0;

/**
 * Geocode an address using OpenStreetMap Nominatim
 */
export async function geocodeAddress(address: string): Promise<GeocodingResult | null> {
  // Respect rate limit
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  if (timeSinceLastRequest < RATE_LIMIT_MS) {
    await setTimeout(RATE_LIMIT_MS - timeSinceLastRequest);
  }
  lastRequestTime = Date.now();

  try {
    const encodedAddress = encodeURIComponent(address);
    const url = `https://nominatim.openstreetmap.org/search?q=${encodedAddress}&format=json&limit=1&countrycodes=us`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'IRL-Miami-Events-App/1.0',
        'Accept': 'application/json',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    if (!response.ok) {
      console.error(`Geocoding failed: ${response.status}`);
      return null;
    }

    const results: NominatimResponse[] = await response.json();

    if (results.length === 0) {
      return null;
    }

    const result = results[0];
    const confidence = result.importance > 0.5 ? 'high' : result.importance > 0.3 ? 'medium' : 'low';

    return {
      lat: parseFloat(result.lat),
      lng: parseFloat(result.lon),
      displayName: result.display_name,
      confidence,
    };
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
}

/**
 * Calculate distance between two points in miles (Haversine formula)
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 3959; // Earth's radius in miles
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

/**
 * Verify if coordinates match an address
 * Returns the discrepancy in miles and suggests correction if needed
 */
export async function verifyLocation(
  address: string,
  providedLat: number,
  providedLng: number
): Promise<{
  isValid: boolean;
  discrepancyMiles: number;
  suggestedLat?: number;
  suggestedLng?: number;
  geocodedAddress?: string;
}> {
  const geocoded = await geocodeAddress(address);

  if (!geocoded) {
    return {
      isValid: false,
      discrepancyMiles: -1, // Unable to verify
    };
  }

  const distance = calculateDistance(providedLat, providedLng, geocoded.lat, geocoded.lng);

  // Allow up to 0.5 miles discrepancy (accounts for venue placement within a building/complex)
  const TOLERANCE_MILES = 0.5;
  const isValid = distance <= TOLERANCE_MILES;

  return {
    isValid,
    discrepancyMiles: distance,
    suggestedLat: geocoded.lat,
    suggestedLng: geocoded.lng,
    geocodedAddress: geocoded.displayName,
  };
}

/**
 * Batch verify multiple locations
 */
export interface LocationToVerify {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
}

export interface VerificationResult extends LocationToVerify {
  isValid: boolean;
  discrepancyMiles: number;
  suggestedLat?: number;
  suggestedLng?: number;
  geocodedAddress?: string;
}

export async function batchVerifyLocations(
  locations: LocationToVerify[]
): Promise<VerificationResult[]> {
  const results: VerificationResult[] = [];

  console.log(`\n🗺️  Verifying ${locations.length} locations...`);

  for (let i = 0; i < locations.length; i++) {
    const location = locations[i];
    console.log(`   [${i + 1}/${locations.length}] ${location.name}...`);

    const verification = await verifyLocation(location.address, location.lat, location.lng);

    results.push({
      ...location,
      ...verification,
    });

    if (!verification.isValid && verification.discrepancyMiles > 0) {
      console.log(
        `   ⚠️  ${location.name}: ${verification.discrepancyMiles.toFixed(2)} miles off`
      );
    }
  }

  const invalid = results.filter((r) => !r.isValid && r.discrepancyMiles > 0);
  const unverified = results.filter((r) => r.discrepancyMiles < 0);

  console.log(`\n📊 Verification Summary:`);
  console.log(`   ✅ Valid: ${results.length - invalid.length - unverified.length}`);
  console.log(`   ⚠️  Invalid: ${invalid.length}`);
  console.log(`   ❓ Unable to verify: ${unverified.length}`);

  return results;
}

/**
 * Extract unique venues from events for verification
 */
export function extractUniqueVenues(events: Array<{
  venueName?: string;
  address?: string;
  lat?: number | null;
  lng?: number | null;
}>): LocationToVerify[] {
  const venueMap = new Map<string, LocationToVerify>();

  for (const event of events) {
    if (event.venueName && event.address && event.lat != null && event.lng != null) {
      const key = `${event.venueName}-${event.address}`;
      if (!venueMap.has(key)) {
        venueMap.set(key, {
          id: key,
          name: event.venueName,
          address: event.address,
          lat: event.lat,
          lng: event.lng,
        });
      }
    }
  }

  return Array.from(venueMap.values());
}
