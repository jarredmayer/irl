/**
 * Location Verifier Agent
 *
 * Uses Claude tool use to verify and correct venue coordinates.
 * Given a venue name, address, city, and current coordinates, this agent:
 * 1. Geocodes the address via Nominatim (OpenStreetMap)
 * 2. Checks the result against Miami/FLL metro bounds
 * 3. Reasons about which coordinates are correct
 * 4. Returns verified lat/lng with confidence + explanation
 *
 * Results are cached for 30 days — venues don't move.
 * On a warm cache, zero Claude calls are made.
 */

import { BaseAgent, type AgentTool } from './base-agent.js';
import { geocodeAddress, calculateDistance } from '../geocoding.js';
import { PersistentCache, cacheKey } from './cache.js';
import type { IRLEvent } from '../types.js';

// Miami/FLL metro bounding box (generous)
const METRO_BOUNDS = {
  minLat: 25.1,
  maxLat: 26.5,
  minLng: -80.9,
  maxLng: -79.9,
};

export interface VerifiedLocation {
  lat: number;
  lng: number;
  confidence: 'high' | 'medium' | 'low' | 'unverified';
  wasChanged: boolean;
  reasoning: string;
}

// 30-day cache — venues almost never move
const locationCache = new PersistentCache<VerifiedLocation>('venue-locations.json', 30);

export class LocationVerifierAgent extends BaseAgent {
  protected systemPrompt = `You are a location verification agent for an events app covering Miami and Fort Lauderdale, Florida.

Your job: given a venue name, address, and current coordinates, verify whether the coordinates are correct and return the best possible lat/lng.

Use your tools to:
1. Geocode the address using Nominatim to get authoritative coordinates
2. Check if the provided or geocoded coordinates are within the Miami/FLL metro area
3. Compare the two sets of coordinates and reason about which is more accurate

Rules:
- If geocoding succeeds and the result is within metro bounds, prefer those coordinates
- If current coordinates are already within 0.05 miles of geocoded result, they're fine — don't change them
- If current coordinates are outside metro bounds, always replace with geocoded result
- If geocoding fails, keep current coordinates if they're in metro bounds; otherwise flag as unverified
- Always respond in this exact JSON format (no markdown):
{
  "lat": <number>,
  "lng": <number>,
  "confidence": "high" | "medium" | "low" | "unverified",
  "wasChanged": <boolean>,
  "reasoning": "<one sentence>"
}`;

  protected tools: AgentTool[] = [
    {
      name: 'geocode_address',
      description: 'Geocode a venue address using OpenStreetMap Nominatim. Returns lat/lng or null if not found.',
      input_schema: {
        type: 'object',
        properties: {
          address: { type: 'string', description: 'Full venue address including city and state' },
        },
        required: ['address'],
      },
      handler: async (input) => {
        const address = String(input.address);
        const result = await geocodeAddress(address);
        if (!result) return { found: false };
        return {
          found: true,
          lat: result.lat,
          lng: result.lng,
          displayName: result.displayName,
          confidence: result.confidence,
        };
      },
    },
    {
      name: 'check_metro_bounds',
      description: 'Check if a lat/lng coordinate is within the Miami/Fort Lauderdale metro area.',
      input_schema: {
        type: 'object',
        properties: {
          lat: { type: 'number', description: 'Latitude' },
          lng: { type: 'number', description: 'Longitude' },
        },
        required: ['lat', 'lng'],
      },
      handler: async (input) => {
        const lat = Number(input.lat);
        const lng = Number(input.lng);
        const inBounds =
          lat >= METRO_BOUNDS.minLat &&
          lat <= METRO_BOUNDS.maxLat &&
          lng >= METRO_BOUNDS.minLng &&
          lng <= METRO_BOUNDS.maxLng;
        return { inBounds, bounds: METRO_BOUNDS };
      },
    },
    {
      name: 'calculate_distance',
      description: 'Calculate distance in miles between two lat/lng coordinates.',
      input_schema: {
        type: 'object',
        properties: {
          lat1: { type: 'number' },
          lng1: { type: 'number' },
          lat2: { type: 'number' },
          lng2: { type: 'number' },
        },
        required: ['lat1', 'lng1', 'lat2', 'lng2'],
      },
      handler: async (input) => {
        const miles = calculateDistance(
          Number(input.lat1), Number(input.lng1),
          Number(input.lat2), Number(input.lng2)
        );
        return { miles: Math.round(miles * 100) / 100 };
      },
    },
  ];

  async verifyVenue(
    venueName: string,
    address: string,
    currentLat: number | null,
    currentLng: number | null,
    city: string
  ): Promise<VerifiedLocation> {
    // Check cache first — venues don't move
    const key = cacheKey(venueName || address, city);
    const cached = locationCache.get(key);
    if (cached) {
      // Return cached result with wasChanged=false since coords already applied
      return { ...cached, wasChanged: false };
    }

    const fullAddress = address.includes(city) ? address : `${address}, ${city}, FL`;

    const prompt = `Verify the location for this venue:
Name: ${venueName}
Address: ${fullAddress}
Current coordinates: lat=${currentLat}, lng=${currentLng}

Use your tools to geocode the address and verify/correct the coordinates. Return JSON only.`;

    try {
      const response = await this.runLoop(prompt);
      const parsed = JSON.parse(response.trim()) as VerifiedLocation;
      const result: VerifiedLocation = {
        lat: parsed.lat,
        lng: parsed.lng,
        confidence: parsed.confidence,
        wasChanged: parsed.wasChanged,
        reasoning: parsed.reasoning,
      };
      // Only cache successful verifications — don't cache 'unverified' (transient failures)
      if (result.confidence !== 'unverified') {
        locationCache.set(key, result);
      }
      return result;
    } catch {
      // Fallback: keep current coords, never cache parse failures.
      // Use 'low' confidence (not 'unverified') when coords exist — transient parse
      // errors should not cause ValidationAgent to hardblock valid events.
      // Only 'unverified' when there are no coords to fall back to.
      return {
        lat: currentLat ?? 0,
        lng: currentLng ?? 0,
        confidence: currentLat != null ? 'low' : 'unverified',
        wasChanged: false,
        reasoning: 'Agent response unparseable — kept original coordinates',
      };
    }
  }
}

/**
 * Batch verify all events with addresses but suspect or null coordinates.
 * Only processes events missing coords or with coords outside metro bounds.
 * Uses a 30-day cache — known-good venues are never re-verified.
 */
export async function agentVerifyLocations(
  events: IRLEvent[],
  options: { onlyNullCoords?: boolean; maxEvents?: number } = {}
): Promise<{ events: IRLEvent[]; report: VerificationReport }> {
  const { onlyNullCoords = false, maxEvents = 100 } = options;

  const needsVerification = events.filter((e) => {
    if (!e.address && !e.venueName) return false;
    if (onlyNullCoords) return e.lat == null || e.lng == null;
    const outOfBounds =
      e.lat != null &&
      e.lng != null &&
      (e.lat < METRO_BOUNDS.minLat || e.lat > METRO_BOUNDS.maxLat ||
       e.lng < METRO_BOUNDS.minLng || e.lng > METRO_BOUNDS.maxLng);
    return e.lat == null || e.lng == null || outOfBounds;
  }).slice(0, maxEvents);

  if (needsVerification.length === 0) {
    console.log('  ✅ No events need location verification');
    return {
      events,
      report: { verified: 0, corrected: 0, unverified: 0, unverifiedIds: [], cacheHits: 0, confidenceBreakdown: { high: 0, medium: 0, low: 0, unverified: 0 }, issues: [] },
    };
  }

  // Log cache stats before run
  const cacheStats = locationCache.stats();
  console.log(`\n🤖 Location Verifier Agent: ${needsVerification.length} venues to check`);
  console.log(`   Cache: ${cacheStats.valid} valid entries, ${cacheStats.expired} expired`);

  const agent = new LocationVerifierAgent();
  const report: VerificationReport = {
    verified: 0,
    corrected: 0,
    unverified: 0,
    unverifiedIds: [],
    cacheHits: 0,
    confidenceBreakdown: { high: 0, medium: 0, low: 0, unverified: 0 },
    issues: [],
  };

  const eventMap = new Map(events.map((e) => [e.id, e]));
  let parseErrors = 0; // Track non-cache misses that returned 'unverified' confidence

  for (const event of needsVerification) {
    const address = event.address || event.venueName || '';
    const key = cacheKey(event.venueName || address, event.city);
    const isCacheHit = locationCache.get(key) !== null;

    const result = await agent.verifyVenue(
      event.venueName || '',
      address,
      event.lat,
      event.lng,
      event.city
    );

    if (isCacheHit) {
      report.cacheHits++;
    } else if (result.confidence === 'unverified') {
      report.unverified++;
      report.confidenceBreakdown.unverified++;
      parseErrors++;
      // Only hardblock events that are genuinely unlocatable (no existing coords).
      // Parse errors on events with valid coords return confidence='low', not 'unverified'.
      if (event.lat == null || event.lng == null) {
        report.unverifiedIds.push(event.id);
      }
    } else {
      report.verified++;
      report.confidenceBreakdown[result.confidence]++;
      if (result.wasChanged) {
        report.corrected++;
        report.issues.push({
          eventId: event.id,
          venueName: event.venueName || 'Unknown',
          oldLat: event.lat,
          oldLng: event.lng,
          newLat: result.lat,
          newLng: result.lng,
          reasoning: result.reasoning,
        });
        eventMap.set(event.id, { ...event, lat: result.lat, lng: result.lng });
      }
    }
  }

  // Persist cache after batch
  locationCache.flush();

  // Warn if geocoding appears degraded (high parse-error rate on non-cached events)
  const nonCacheChecks = needsVerification.length - report.cacheHits;
  if (nonCacheChecks > 0 && parseErrors / nonCacheChecks > 0.2) {
    console.warn(
      `  ⚠️  LocationVerifier DEGRADED: ${parseErrors}/${nonCacheChecks} non-cached verifications failed` +
      ` (${Math.round((parseErrors / nonCacheChecks) * 100)}% error rate). Nominatim may be unreachable.`
    );
  }

  console.log(
    `  ✅ Location check: ${report.verified} verified (${report.confidenceBreakdown.high} high/${report.confidenceBreakdown.medium} med/${report.confidenceBreakdown.low} low),` +
    ` ${report.corrected} corrected, ${report.cacheHits} cache hits, ${report.unverified} unverified`
  );
  if (report.issues.length > 0) {
    console.log('  📍 Corrections made:');
    for (const issue of report.issues) {
      console.log(`     ${issue.venueName}: (${issue.oldLat?.toFixed(4)}, ${issue.oldLng?.toFixed(4)}) → (${issue.newLat.toFixed(4)}, ${issue.newLng.toFixed(4)})`);
      console.log(`        ${issue.reasoning}`);
    }
  }

  return { events: Array.from(eventMap.values()), report };
}

export interface VerificationReport {
  verified: number;
  corrected: number;
  unverified: number;
  /** Event IDs where location could not be verified — used by ValidationAgent to hardblock */
  unverifiedIds: string[];
  cacheHits: number;
  confidenceBreakdown: { high: number; medium: number; low: number; unverified: number };
  issues: Array<{
    eventId: string;
    venueName: string;
    oldLat: number | null;
    oldLng: number | null;
    newLat: number;
    newLng: number;
    reasoning: string;
  }>;
}
