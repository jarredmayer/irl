/**
 * VenueSearchAgent
 *
 * Fills in missing coordinates for events where lat/lng is null.
 * Unlike LocationVerifierAgent (which corrects wrong coords),
 * this agent finds coords for events that have NONE.
 *
 * Strategy (cheapest first):
 *  1. Check persistent cache — if we've seen this venue name before, reuse result
 *  2. Check VENUES database — 39+ pre-verified venues with exact coords (zero API cost)
 *  3. Geocode the address if available
 *  4. Search by venue name + city if address fails
 *  5. If still unresolved, log and leave null (map will handle gracefully)
 *
 * Results cached for 30 days — same as LocationVerifierAgent.
 */

import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { BaseAgent, type AgentTool } from './base-agent.js';
import { geocodeAddress } from '../geocoding.js';
import { PersistentCache, cacheKey } from './cache.js';
import { findVenue } from '../venues.js';
import type { IRLEvent } from '../types.js';

const CACHE_DIR = join(dirname(fileURLToPath(import.meta.url)), '../../cache');
const NOT_FOUND_LOG = join(CACHE_DIR, 'venue-not-found.json');

function appendNotFound(venueName: string, city: string): void {
  try {
    const existing: Array<{ venueName: string; city: string; lastSeen: string }> =
      existsSync(NOT_FOUND_LOG) ? JSON.parse(readFileSync(NOT_FOUND_LOG, 'utf-8')) : [];
    const key = `${venueName}|${city}`;
    if (!existing.some((e) => `${e.venueName}|${e.city}` === key)) {
      existing.push({ venueName, city, lastSeen: new Date().toISOString() });
      writeFileSync(NOT_FOUND_LOG, JSON.stringify(existing, null, 2));
    }
  } catch {
    // Non-fatal — logging failure shouldn't break the pipeline
  }
}

/** Load known not-found venues — avoids retrying previously failed lookups */
function loadKnownNotFound(): Set<string> {
  try {
    if (!existsSync(NOT_FOUND_LOG)) return new Set();
    const entries = JSON.parse(readFileSync(NOT_FOUND_LOG, 'utf-8')) as Array<{ venueName: string; city: string }>;
    return new Set(entries.map((e) => `${e.venueName}|${e.city}`));
  } catch {
    return new Set();
  }
}

// Shares the same cache file as LocationVerifierAgent — both verify venues
const venueCache = new PersistentCache<{ lat: number; lng: number; confidence: string }>(
  'venue-locations.json',
  30
);

const METRO_BOUNDS = { minLat: 25.1, maxLat: 26.5, minLng: -80.9, maxLng: -79.9 };

function inBounds(lat: number, lng: number): boolean {
  return lat >= METRO_BOUNDS.minLat && lat <= METRO_BOUNDS.maxLat &&
         lng >= METRO_BOUNDS.minLng && lng <= METRO_BOUNDS.maxLng;
}

export class VenueSearchAgent extends BaseAgent {
  protected systemPrompt = `You are a venue location finder for an events app covering Miami and Fort Lauderdale, Florida.

Given a venue name and optional partial address, find the correct lat/lng coordinates.

Use geocode_address to try different query variations until you find a result that is within the Miami/FLL metro area.

Try in order:
1. Full address if available
2. Venue name + city (e.g. "Gramps Miami" or "Gramps Wynwood Miami FL")
3. Venue name alone

Stop as soon as you find coordinates inside the metro bounds.

Respond ONLY with JSON (no markdown):
{"lat": <number>, "lng": <number>, "confidence": "high"|"medium"|"low", "reasoning": "<one sentence>"}

If nothing works, respond: {"lat": null, "lng": null, "confidence": "not-found", "reasoning": "Could not locate venue"}`;

  protected tools: AgentTool[] = [
    {
      name: 'geocode_address',
      description: 'Geocode a query string using OpenStreetMap Nominatim.',
      input_schema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Address or venue name + city to geocode' },
        },
        required: ['query'],
      },
      handler: async (input) => {
        const result = await geocodeAddress(String(input.query));
        if (!result) return { found: false };
        const valid = inBounds(result.lat, result.lng);
        return { found: true, lat: result.lat, lng: result.lng, inMetro: valid, displayName: result.displayName };
      },
    },
  ];

  async findVenueCoords(
    venueName: string,
    address: string | undefined,
    city: string
  ): Promise<{ lat: number | null; lng: number | null; confidence: string } | null> {
    const key = cacheKey(venueName, city);

    // 1. Persistent cache check
    const cached = venueCache.get(key);
    if (cached) return cached;

    // 2. VENUES database check — pre-verified coords, zero API cost
    if (venueName) {
      const dbVenue = findVenue(venueName);
      if (dbVenue && inBounds(dbVenue.lat, dbVenue.lng)) {
        const result = { lat: dbVenue.lat, lng: dbVenue.lng, confidence: 'high' };
        venueCache.set(key, result);
        return result;
      }
    }

    // 3. LLM + Nominatim fallback
    const prompt = `Find coordinates for this venue:
Name: ${venueName}
${address ? `Address: ${address}` : ''}
City: ${city}, FL

Try geocoding variations until you find metro-area coordinates. Return JSON only.`;

    try {
      const response = await this.runLoop(prompt, { maxTurns: 5 });
      const parsed = JSON.parse(response.trim());

      if (parsed.lat == null || parsed.confidence === 'not-found') {
        return null;
      }

      const result = { lat: parsed.lat as number, lng: parsed.lng as number, confidence: parsed.confidence as string };
      venueCache.set(key, result);
      return result;
    } catch {
      return null;
    }
  }
}

/**
 * Fill in missing coordinates for events.
 * Only processes events where lat or lng is null.
 */
export async function fillMissingCoordinates(
  events: IRLEvent[],
  options: { max?: number } = {}
): Promise<{ events: IRLEvent[]; filled: number; notFound: number; dbHits: number }> {
  const { max = 150 } = options;

  const missing = events
    .filter((e) => (e.lat == null || e.lng == null) && (e.venueName || e.address))
    .slice(0, max);

  if (missing.length === 0) {
    return { events, filled: 0, notFound: 0, dbHits: 0 };
  }

  const cacheStats = venueCache.stats();
  const knownNotFound = loadKnownNotFound();
  console.log(`\n🔍 VenueSearchAgent: ${missing.length} events missing coordinates`);
  console.log(`   Cache: ${cacheStats.valid} valid entries | Known not-found: ${knownNotFound.size} venues`);

  const agent = new VenueSearchAgent();
  const eventMap = new Map(events.map((e) => [e.id, e]));
  let filled = 0;
  let notFound = 0;
  let dbHits = 0;
  let skipped = 0;

  for (const event of missing) {
    // Skip venues that previously couldn't be found — avoid wasting API calls
    const notFoundKey = `${event.venueName || ''}|${event.city}`;
    if (knownNotFound.has(notFoundKey)) {
      skipped++;
      notFound++;
      continue;
    }

    // Check VENUES db directly before calling agent (fast path, no API)
    const dbVenue = event.venueName ? findVenue(event.venueName) : undefined;
    if (dbVenue && inBounds(dbVenue.lat, dbVenue.lng)) {
      filled++;
      dbHits++;
      eventMap.set(event.id, { ...event, lat: dbVenue.lat, lng: dbVenue.lng });
      continue;
    }

    const result = await agent.findVenueCoords(
      event.venueName || '',
      event.address,
      event.city
    );

    if (result?.lat != null) {
      filled++;
      eventMap.set(event.id, { ...event, lat: result.lat, lng: result.lng });
      console.log(`   ✅ ${event.venueName}: (${result.lat!.toFixed(4)}, ${result.lng!.toFixed(4)}) [${result.confidence}]`);
    } else {
      notFound++;
      if (event.venueName) appendNotFound(event.venueName, event.city);
    }
  }

  venueCache.flush();
  console.log(`   VenueSearch: ${filled} filled (${dbHits} from DB, ${filled - dbHits} via geocoding), ${notFound} not found (${skipped} skipped-known)`);

  return { events: Array.from(eventMap.values()), filled, notFound, dbHits };
}
