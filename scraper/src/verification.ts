/**
 * Event Verification Module
 * Uses LLM to verify events are real and scores quality
 */

import Anthropic from '@anthropic-ai/sdk';
import type { RawEvent } from './types.js';

// Source confidence levels
export type SourceConfidence = 'high' | 'medium' | 'low';

// Sources that scrape real data from APIs/websites or are verified real events
const HIGH_CONFIDENCE_SOURCES = [
  'Miami New Times',
  'Resident Advisor',
  'Dice.fm',
  'Shotgun',
  'Adrienne Arsht Center',
  'Fillmore Miami Beach',
  'Miami Improv',
  'Dania Beach Improv',
  'Professional Sports',
  'Candlelight Concerts',
  'III Points',
  'SOBEWFF',
  'World Cup 2026',
  'Miami Festivals',
  // Real recurring events that actually happen
  'Farmers Markets',
  'Beach Cleanups',
  "Don't Tell Comedy",
  'Coffee & Chill',
  'Diplo Run Club',
];

// Sources with curated real events (manually added) or known venue programming
const MEDIUM_CONFIDENCE_SOURCES = [
  'Cultural Attractions',
  'Real Venue Events',
  'Music Venues',
  'Cultural Venues',
  'Nightlife & Clubs',
  'Food Events',
  'Wine Tastings',
  'SoFlo Popups',
  'Design District',
  'Deering Estate',
  'Regatta Grove',
  'South Pointe Park',
  'Fort Lauderdale',
  'Instagram Sources',
  'Latin Parties',
  'Wellness & Fitness', // Known fitness classes at real venues
];

// Sources that generate SYNTHETIC/ASSUMED events - not verified
// These are the problematic ones that assume events exist
const LOW_CONFIDENCE_SOURCES = [
  'Hotels & Hospitality', // Assumes pool parties, yoga, etc. without verification
  'Coral Gables & Neighborhood Venues', // Generic venue suggestions
  'Coconut Grove', // Generic venue suggestions
  'Brickell Venues', // Generic venue suggestions
];

export function getSourceConfidence(sourceName: string): SourceConfidence {
  if (HIGH_CONFIDENCE_SOURCES.includes(sourceName)) return 'high';
  if (MEDIUM_CONFIDENCE_SOURCES.includes(sourceName)) return 'medium';
  return 'low';
}

/**
 * Quality score for an event (0-100)
 */
export function scoreEventQuality(event: RawEvent): number {
  let score = 60; // Base score - most events should pass

  // Source confidence is the primary factor
  const confidence = getSourceConfidence(event.sourceName);
  if (confidence === 'high') score += 20;
  if (confidence === 'medium') score += 10;
  if (confidence === 'low') score -= 30; // Strong penalty for synthetic sources

  // Positive signals
  if (event.sourceUrl) score += 5;
  if (event.description.length > 100) score += 5;

  // Named performer/artist in title (strong signal for real events)
  const hasNamedPerformer = /\b(with|featuring|presents|ft\.?|feat\.?)\b/i.test(event.title) ||
    /vs\.?|versus/i.test(event.title);
  if (hasNamedPerformer) score += 10;

  // ONLY penalize generic patterns from LOW confidence sources
  // These are the synthetic/assumed events we want to filter
  if (confidence === 'low') {
    // Generic hotel/hospitality patterns
    const genericHospitalityPatterns = [
      /pool party/i,
      /sunset (session|sound|cocktails?)/i,
      /morning (yoga|meditation)/i,
      /sound bath/i,
      /breathwork/i,
      /theater performance$/i, // Generic "Faena Theater Performance"
    ];
    if (genericHospitalityPatterns.some(p => p.test(event.title))) score -= 25;

    // Generic venue suggestion patterns
    const venuesuggestionPatterns = [
      /^live (music|jazz|band) at /i,
      /^dj at /i,
      /^happy hour at /i,
      /^brunch at /i,
      /^(monday|tuesday|wednesday|thursday|friday|saturday|sunday) at /i,
    ];
    if (venuesuggestionPatterns.some(p => p.test(event.title))) score -= 25;
  }

  // Short description penalty (applies to all)
  if (event.description.length < 30) score -= 10;

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
