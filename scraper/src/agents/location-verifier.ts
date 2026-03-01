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
 * This is a true agent — Claude decides how many tools to call,
 * in what order, and when it has enough information to conclude.
 */

import { BaseAgent, type AgentTool } from './base-agent.js';
import { geocodeAddress, calculateDistance } from '../geocoding.js';
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

export class LocationVerifierAgent extends BaseAgent {
  protected systemPrompt = `You are a location verification agent for an events app covering Miami and Fort Lauderdale, Florida.

Your job: given a venue name, address, and current coordinates, verify whether the coordinates are correct and return the best possible lat/lng.

Use your tools to:
1. Geocode the address using Nominatim to get authoritative coordinates
2. Check if the provided or geocoded coordinates are within the Miami/FLL metro area
3. Compare the two sets of coordinates and reason about which is more accurate

Rules:
- If geocoding succeeds and the result is within metro bounds, prefer those coordinates
- If current coordinates are already within 0.2 miles of geocoded result, they're fine — don't change them
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
    const fullAddress = address.includes(city) ? address : `${address}, ${city}, FL`;

    const prompt = `Verify the location for this venue:
Name: ${venueName}
Address: ${fullAddress}
Current coordinates: lat=${currentLat}, lng=${currentLng}

Use your tools to geocode the address and verify/correct the coordinates. Return JSON only.`;

    try {
      const response = await this.runLoop(prompt);
      const parsed = JSON.parse(response.trim());
      return {
        lat: parsed.lat,
        lng: parsed.lng,
        confidence: parsed.confidence,
        wasChanged: parsed.wasChanged,
        reasoning: parsed.reasoning,
      };
    } catch {
      // Fallback: if Claude response can't be parsed, keep current coords
      return {
        lat: currentLat ?? 0,
        lng: currentLng ?? 0,
        confidence: 'unverified',
        wasChanged: false,
        reasoning: 'Agent response unparseable — kept original coordinates',
      };
    }
  }
}

/**
 * Batch verify all events with addresses but suspect or null coordinates.
 * Only processes events missing coords or with coords outside metro bounds.
 */
export async function agentVerifyLocations(
  events: IRLEvent[],
  options: { onlyNullCoords?: boolean; maxEvents?: number } = {}
): Promise<{ events: IRLEvent[]; report: VerificationReport }> {
  const { onlyNullCoords = false, maxEvents = 50 } = options;

  const needsVerification = events.filter((e) => {
    if (!e.address && !e.venueName) return false;
    if (onlyNullCoords) return e.lat == null || e.lng == null;
    // Also flag coords outside metro bounds
    const outOfBounds =
      e.lat != null &&
      e.lng != null &&
      (e.lat < METRO_BOUNDS.minLat || e.lat > METRO_BOUNDS.maxLat ||
       e.lng < METRO_BOUNDS.minLng || e.lng > METRO_BOUNDS.maxLng);
    return e.lat == null || e.lng == null || outOfBounds;
  }).slice(0, maxEvents);

  if (needsVerification.length === 0) {
    console.log('  ✅ No events need location verification');
    return { events, report: { verified: 0, corrected: 0, unverified: 0, issues: [] } };
  }

  console.log(`\n🤖 Location Verifier Agent: checking ${needsVerification.length} venues...`);
  const agent = new LocationVerifierAgent();
  const report: VerificationReport = { verified: 0, corrected: 0, unverified: 0, issues: [] };

  const eventMap = new Map(events.map((e) => [e.id, e]));

  for (const event of needsVerification) {
    const address = event.address || event.venueName || '';
    const result = await agent.verifyVenue(
      event.venueName || '',
      address,
      event.lat,
      event.lng,
      event.city
    );

    if (result.confidence === 'unverified') {
      report.unverified++;
    } else {
      report.verified++;
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

  console.log(`  ✅ Verified: ${report.verified} | Corrected: ${report.corrected} | Unverified: ${report.unverified}`);
  if (report.issues.length > 0) {
    console.log('  📍 Corrections made:');
    for (const issue of report.issues) {
      console.log(`     ${issue.venueName}: (${issue.oldLat?.toFixed(4)}, ${issue.oldLng?.toFixed(4)}) → (${issue.newLat.toFixed(4)}, ${issue.newLng.toFixed(4)})`);
      console.log(`        ${issue.reasoning}`);
    }
  }

  return { events: Array.from(eventMap.values()), report };
}

interface VerificationReport {
  verified: number;
  corrected: number;
  unverified: number;
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
