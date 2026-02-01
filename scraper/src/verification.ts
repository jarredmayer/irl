/**
 * Event Verification Module
 * Uses LLM to verify events are real and scores quality
 */

import Anthropic from '@anthropic-ai/sdk';
import type { RawEvent } from './types.js';

// Source confidence levels
export type SourceConfidence = 'high' | 'medium' | 'low';

// VERIFIED sources - ONLY these are trusted
// Must be: real API scrape, real calendar, or manually curated real events
const VERIFIED_SOURCES = [
  'Miami New Times',           // Real calendar scrape from their website
  'Professional Sports',       // Real game schedules (Heat, Dolphins, etc.)
  'III Points',                // Real festival with known dates
  'SOBEWFF',                   // Real food & wine festival
  'World Cup 2026',            // Real scheduled matches
  'Miami Festivals',           // Real festivals with known dates
  'Resident Advisor',          // Real event listings from RA
  'Dice.fm',                   // Real ticketed events
  'Shotgun',                   // Real ticketed events
  // Manually verified REAL recurring events
  'Farmers Markets',           // Known real weekly markets
  'Beach Cleanups',            // Real scheduled cleanups with orgs
  "Don't Tell Comedy",         // Real comedy shows (specific locations)
  // Community fitness (verified from official sources)
  'Coffee & Chill',            // Verified bi-weekly wellness events (coffeeandchill.com)
  'Free Yoga Miami',           // Verified free yoga in parks (miamiandbeaches.com)
  'Run Clubs',                 // Verified run clubs (Nike, On Running, Lululemon)
  'Cycling Group Rides',       // Verified group rides (themiamibikescene.com)
  // Manually curated real events (in cultural-attractions.ts)
  'Cultural Attractions',      // Hand-picked REAL events only
  'Real Venue Events',         // Hand-picked REAL events only
  'Pop-Ups',                   // Hand-picked pop-up events
  'Curated Recurring',         // Verified recurring events (jazz, hotels, etc.)
  'Dice.fm Real',              // Puppeteer scraper for real Dice events
  // Real HTTP scrapers
  'Dice.fm',                   // Real club/music events from Dice
  'Miami Improv',              // Real comedy shows
  'Fort Lauderdale Improv',    // Real comedy shows
  'Broward Center',            // Real performing arts events
  'Coral Gables',              // Real city calendar events
  'Verified Recurring',        // Confirmed recurring events only
];

// ALL OTHER SOURCES ARE SYNTHETIC - they generate assumed events
// These will be automatically rejected
const SYNTHETIC_SOURCES = [
  // These generate fake "events" without real calendar data
  'Adrienne Arsht Center',     // SYNTHETIC: generates "Broadway in Miami" etc.
  'Fillmore Miami Beach',      // SYNTHETIC: generates "Live Rock at Fillmore"
  'Miami Improv',              // SYNTHETIC: generates generic comedy shows
  'Dania Beach Improv',        // SYNTHETIC: generates generic comedy shows
  'Candlelight Concerts',      // SYNTHETIC: generates assumed concerts
  'Music Venues',              // SYNTHETIC: "Live Jazz at Lagniappe"
  'Cultural Venues',           // SYNTHETIC: "ICA Miami Free Admission"
  'Nightlife & Clubs',         // SYNTHETIC: club nights without verification
  'Hotels & Hospitality',      // SYNTHETIC: pool parties, yoga, etc.
  'Wellness & Fitness',        // SYNTHETIC: assumed fitness classes
  'Wine Tastings',             // SYNTHETIC: assumed wine events
  'Food Events',               // SYNTHETIC: assumed food events
  'SoFlo Popups',              // SYNTHETIC: assumed popup events
  'Design District',           // SYNTHETIC: assumed events
  'Deering Estate',            // SYNTHETIC: assumed events
  'Regatta Grove',             // SYNTHETIC: assumed events
  'South Pointe Park',         // SYNTHETIC: assumed events
  'Fort Lauderdale',           // SYNTHETIC: assumed events
  'Instagram Sources',         // SYNTHETIC: unverified
  'Latin Parties',             // SYNTHETIC: assumed parties
  'Coral Gables & Neighborhood Venues',
  'Coconut Grove',
  'Brickell Venues',
];

// Blacklisted venues - low signal venues that clutter results
const VENUE_BLACKLIST = [
  'hard rock cafe',
  'hard rock café',
  'rainforest cafe',
  'bubba gump',
  'senor frogs',
  'señor frogs',
  'hooters',
  'dave & busters',
  'dave and busters',
  'topgolf',
];

// Blacklisted event titles - low signal events
const TITLE_BLACKLIST = [
  'backstage & burgers',
  'backstage and burgers',
  'ride and dine',
  'big bus tour',
  'hop on hop off',
  'segway tour',
  'jet ski rental',
  'parasailing',
];

// Government/administrative content - NOT entertainment events
const GOVERNMENT_PATTERNS = [
  /\bboard\s+(of|meeting)/i,
  /\badvisory\s+board/i,
  /\bcommittee\s+meeting/i,
  /\bcouncil\s+meeting/i,
  /\bcity\s+commission/i,
  /\bplanning\s+(board|commission|meeting)/i,
  /\bzoning\s+(board|hearing|meeting)/i,
  /\bdevelopment\s+review/i,
  /\bpublic\s+hearing/i,
  /\btown\s+hall\s+meeting/i,
  /\bbudget\s+(hearing|meeting|workshop)/i,
  /\bcode\s+enforcement/i,
  /\bpermit\s+(hearing|review)/i,
  /\bvariance\s+hearing/i,
  /\barchitects.*board/i,
  /\bhistoric\s+preservation\s+(board|commission)/i,
];

export function isGovernmentContent(title: string, description?: string): boolean {
  const text = `${title} ${description || ''}`.toLowerCase();
  return GOVERNMENT_PATTERNS.some(pattern => pattern.test(text));
}

export function getSourceConfidence(sourceName: string): SourceConfidence {
  if (VERIFIED_SOURCES.includes(sourceName)) return 'high';
  if (SYNTHETIC_SOURCES.includes(sourceName)) return 'low';
  return 'medium'; // Unknown sources get medium
}

export function isBlacklistedVenue(venueName: string | undefined): boolean {
  if (!venueName) return false;
  const lower = venueName.toLowerCase();
  return VENUE_BLACKLIST.some(v => lower.includes(v));
}

export function isBlacklistedTitle(title: string): boolean {
  const lower = title.toLowerCase();
  return TITLE_BLACKLIST.some(t => lower.includes(t));
}

/**
 * Quality score for an event (0-100)
 */
export function scoreEventQuality(event: RawEvent): number {
  const confidence = getSourceConfidence(event.sourceName);

  // SYNTHETIC SOURCES ARE AUTOMATICALLY REJECTED
  // These generate assumed events without verification
  if (confidence === 'low') {
    return 0; // Fail immediately
  }

  // Filter out blacklisted low-quality venues and titles
  if (isBlacklistedVenue(event.venueName)) {
    return 0; // Low-quality venue
  }
  if (isBlacklistedTitle(event.title)) {
    return 0; // Low-quality event
  }

  // Filter out government/administrative content (not entertainment)
  if (isGovernmentContent(event.title, event.description)) {
    return 0; // Government meeting, not entertainment
  }

  // Filter out tour/activity listings (not events)
  const tourPatterns = [
    /speedboat/i,
    /boat tour/i,
    /bus tour/i,
    /walking tour/i,
    /helicopter/i,
    /jet ski/i,
    /kayak rental/i,
    /ride and dine/i,
    /segway/i,
  ];
  if (tourPatterns.some(p => p.test(event.title) || p.test(event.description))) {
    return 0; // Tours are not events
  }

  // Verified sources pass by default
  let score = 70;

  // Positive signals
  if (event.sourceUrl) score += 10;
  if (event.description.length > 100) score += 5;

  // Named performer/artist in title
  const hasNamedPerformer = /\b(with|featuring|presents|ft\.?|feat\.?)\b/i.test(event.title) ||
    /vs\.?|versus/i.test(event.title);
  if (hasNamedPerformer) score += 10;

  // Short description penalty
  if (event.description.length < 30) score -= 15;

  return Math.max(0, Math.min(100, score));
}

/**
 * Filter events based on quality score threshold
 */
export function filterByQuality(events: RawEvent[], minScore: number = 50): RawEvent[] {
  const results: { event: RawEvent; score: number; passed: boolean }[] = [];

  for (const event of events) {
    const score = scoreEventQuality(event);
    results.push({ event, score, passed: score >= minScore });
  }

  const passed = results.filter(r => r.passed).map(r => r.event);
  const failed = results.filter(r => !r.passed);

  if (failed.length > 0) {
    console.log(`\n📊 Quality filter removed ${failed.length} low-scoring events:`);
    failed.slice(0, 10).forEach(r => {
      console.log(`   - [${r.score}] ${r.event.title} (${r.event.sourceName})`);
    });
    if (failed.length > 10) {
      console.log(`   ... and ${failed.length - 10} more`);
    }
  }

  return passed;
}

/**
 * LLM-based event verification
 * Verifies batches of events are real and removes hallucinations
 */
export class EventVerifier {
  private client: Anthropic;
  private enabled: boolean;

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    this.enabled = !!apiKey;

    if (this.enabled) {
      this.client = new Anthropic({ apiKey });
    } else {
      console.log('⚠️  ANTHROPIC_API_KEY not set - LLM verification disabled');
      this.client = null as any;
    }
  }

  /**
   * Verify a batch of events using Claude
   * Returns only events that pass verification
   */
  async verifyBatch(events: RawEvent[]): Promise<RawEvent[]> {
    if (!this.enabled || events.length === 0) {
      return events;
    }

    // Only verify medium/low confidence events
    const needsVerification = events.filter(e => {
      const confidence = getSourceConfidence(e.sourceName);
      return confidence !== 'high';
    });

    const highConfidence = events.filter(e => {
      const confidence = getSourceConfidence(e.sourceName);
      return confidence === 'high';
    });

    if (needsVerification.length === 0) {
      return events;
    }

    console.log(`\n🔍 Verifying ${needsVerification.length} events with LLM...`);

    // Process in batches of 25
    const batchSize = 25;
    const verified: RawEvent[] = [...highConfidence];
    let rejected = 0;

    for (let i = 0; i < needsVerification.length; i += batchSize) {
      const batch = needsVerification.slice(i, i + batchSize);
      const batchVerified = await this.verifyEventBatch(batch);
      verified.push(...batchVerified);
      rejected += batch.length - batchVerified.length;

      // Rate limiting
      if (i + batchSize < needsVerification.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    console.log(`   ✅ Verified: ${verified.length - highConfidence.length} events`);
    console.log(`   ❌ Rejected: ${rejected} events`);

    return verified;
  }

  private async verifyEventBatch(events: RawEvent[]): Promise<RawEvent[]> {
    const eventList = events.map((e, i) =>
      `${i + 1}. "${e.title}" at ${e.venueName || e.neighborhood} on ${e.startAt.slice(0, 10)} (Source: ${e.sourceName})`
    ).join('\n');

    const prompt = `You are an event verification assistant. Review these events and determine which ones are likely REAL events that actually happen, versus FAKE/HALLUCINATED events that were generated or assumed.

EVENTS TO VERIFY:
${eventList}

For each event, consider:
1. Is this a specific, real event or a generic assumption (like "Weekly DJ Night")?
2. Does the venue actually host this type of event?
3. Is the event plausible for the date/time?
4. Is there enough specificity to believe this is a real scheduled event?

RULES:
- Generic recurring events like "Happy Hour", "Weekly Yoga", "Sunday Brunch" without specific programming are FAKE
- Events with specific performers, artists, or show names are more likely REAL
- One-time events (festivals, concerts, games) are more likely REAL
- Events from verified sources (sports teams, official venues) are more likely REAL

Respond with ONLY a JSON array of the event numbers (1-indexed) that are REAL. Example: [1, 3, 5, 7]

If all events seem fake, respond with: []
If all events seem real, respond with all numbers: [1, 2, 3, ...]`;

    try {
      const response = await this.client.messages.create({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 500,
        messages: [{ role: 'user', content: prompt }],
      });

      const text = response.content[0].type === 'text' ? response.content[0].text : '';

      // Parse the JSON array from response
      const match = text.match(/\[[\d,\s]*\]/);
      if (!match) {
        console.log(`   ⚠️  Could not parse verification response, keeping all events`);
        return events;
      }

      const verifiedIndices: number[] = JSON.parse(match[0]);
      return events.filter((_, i) => verifiedIndices.includes(i + 1));
    } catch (error) {
      console.error(`   ⚠️  Verification API error:`, error);
      // On error, fall back to quality-based filtering
      return events.filter(e => scoreEventQuality(e) >= 55);
    }
  }
}

/**
 * Main verification pipeline
 * 1. Filter by quality score
 * 2. Verify remaining events with LLM
 */
export async function verifyEvents(events: RawEvent[]): Promise<RawEvent[]> {
  console.log(`\n🔬 Starting event verification pipeline...`);
  console.log(`   Input: ${events.length} events`);

  // Step 1: Quality filtering (threshold 50 = must have positive signals)
  const qualityFiltered = filterByQuality(events, 50);
  console.log(`   After quality filter: ${qualityFiltered.length} events`);

  // Step 2: LLM verification (only if API key is set)
  const verifier = new EventVerifier();
  const verified = await verifier.verifyBatch(qualityFiltered);
  console.log(`   After LLM verification: ${verified.length} events`);

  return verified;
}
