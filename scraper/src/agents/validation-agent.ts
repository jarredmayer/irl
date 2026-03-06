/**
 * ValidationAgent
 *
 * The data quality firewall. Runs after scraping, before editorial.
 * Catches problems that rule-based scrapers can't catch on their own.
 *
 * Checks (in order, cheapest first):
 *  1. Date sanity   – blocks past-year dates, invalid ISO strings, >2yr future
 *  2. Coord bounds  – blocks anything outside Miami/FLL metro bbox
 *  3. Location fix  – Claude tool-use to geocode & correct misplaced pins;
 *                     hardblocks events where location could not be verified
 *  4. Category fix  – re-assigns obviously wrong categories (rule-based)
 *
 * Only step 3 uses the LLM. Steps 1, 2, 4 are pure code → zero API cost.
 */

import type { IRLEvent } from '../types.js';
import { agentVerifyLocations } from './location-verifier.js';

// South Florida metro bounding box (Homestead to Jupiter)
const METRO_BOUNDS = {
  minLat: 25.2,
  maxLat: 27.0,
  minLng: -80.9,
  maxLng: -79.9,
};

// Category → keywords that must appear for the category to make sense
const CATEGORY_KEYWORD_MAP: Record<string, RegExp[]> = {
  Music:        [/music|concert|dj|band|live|jazz|hip.?hop|edm|orchestra|choir/i],
  Fitness:      [/run|yoga|workout|gym|crossfit|cycling|fitness|bootcamp|hiit|pilates/i],
  Wellness:     [/wellness|meditat|mindful|spa|reiki|breath|sound.?bath|healing/i],
  Art:          [/art|gallery|exhibit|mural|sculpt|paint|museum|curator/i],
  Comedy:       [/comedy|comedian|improv|stand.?up|funny|laugh/i],
  Nightlife:    [/nightlife|club|bar|dj|dance|cocktail|rooftop|lounge/i],
  Sports:       [/sport|game|match|league|tournament|swim|soccer|football|basketball|tennis/i],
  'Food & Drink': [/food|drink|brunch|dinner|tasting|market|chef|restaurant|cocktail|beer|wine/i],
  Community:    [/community|volunteer|neighborhood|local|festival|parade|fair/i],
  Culture:      [/culture|heritage|history|theater|theatre|performance|dance|film/i],
};

export interface ValidationReport {
  totalIn: number;
  totalOut: number;
  blockedByDate: number;
  blockedByBounds: number;
  blockedByUnverifiedLocation: number;
  locationsCorrected: number;
  locationConfidence: { high: number; medium: number; low: number; unverified: number };
  categoriesFixed: number;
}

export class ValidationAgent {
  /**
   * Run all validation steps on a batch of events.
   * Returns cleaned events + a report of what was changed/blocked.
   */
  async run(
    events: IRLEvent[],
    options: { skipLocationAgent?: boolean } = {}
  ): Promise<{ events: IRLEvent[]; report: ValidationReport }> {
    const report: ValidationReport = {
      totalIn: events.length,
      totalOut: 0,
      blockedByDate: 0,
      blockedByBounds: 0,
      blockedByUnverifiedLocation: 0,
      locationsCorrected: 0,
      locationConfidence: { high: 0, medium: 0, low: 0, unverified: 0 },
      categoriesFixed: 0,
    };

    // Step 1: Date sanity (zero API cost)
    const now = new Date();
    const currentYear = now.getFullYear();
    const maxFuture = new Date(now);
    maxFuture.setFullYear(currentYear + 2);
    // 1-hour grace period: allow events that started up to 60 minutes ago
    // (catches early-morning events that might be ongoing, avoids blocking today's events)
    const pastCutoff = new Date(now.getTime() - 60 * 60 * 1000);

    let after: IRLEvent[] = events.filter((e) => {
      const d = new Date(e.startAt);
      if (isNaN(d.getTime())) {
        report.blockedByDate++;
        return false;
      }
      if (d.getFullYear() < currentYear || d < pastCutoff) {
        report.blockedByDate++;
        console.log(`  [Validation] ❌ Past event blocked: "${e.title}" (${e.startAt.slice(0, 10)})`);
        return false;
      }
      if (d > maxFuture) {
        report.blockedByDate++;
        return false;
      }
      return true;
    });

    // Step 2: Coordinate bounds check (zero API cost)
    after = after.filter((e) => {
      if (e.lat == null || e.lng == null) return true; // No coords → keep, location agent will handle
      const inBounds =
        e.lat >= METRO_BOUNDS.minLat &&
        e.lat <= METRO_BOUNDS.maxLat &&
        e.lng >= METRO_BOUNDS.minLng &&
        e.lng <= METRO_BOUNDS.maxLng;
      if (!inBounds) {
        report.blockedByBounds++;
        console.log(`  [Validation] ❌ Out-of-bounds coords: "${e.title}" (${e.lat}, ${e.lng})`);
        return false;
      }
      return true;
    });

    // Step 3: Location verification (Claude tool-use, only if AI enabled)
    if (!options.skipLocationAgent) {
      try {
        const locResult = await agentVerifyLocations(after, { maxEvents: 100 });
        after = locResult.events;
        report.locationsCorrected = locResult.report?.corrected ?? 0;
        report.locationConfidence = locResult.report?.confidenceBreakdown ?? report.locationConfidence;

        // Hardblock events where location could not be verified
        const unverifiedIds = new Set(locResult.report?.unverifiedIds ?? []);
        if (unverifiedIds.size > 0) {
          const before = after.length;
          after = after.filter((e) => !unverifiedIds.has(e.id));
          report.blockedByUnverifiedLocation = before - after.length;
          if (report.blockedByUnverifiedLocation > 0) {
            console.log(`  [Validation] 🚫 ${report.blockedByUnverifiedLocation} events blocked: location unverifiable`);
          }
        }
      } catch (err) {
        console.warn('  [Validation] ⚠️  Location agent error, skipping:', err);
      }
    }

    // Step 4: Category sanity (rule-based, zero API cost)
    after = after.map((e) => {
      const fixed = fixCategory(e);
      if (fixed.category !== e.category) {
        report.categoriesFixed++;
        console.log(`  [Validation] 🏷  Category: "${e.title}" ${e.category} → ${fixed.category}`);
      }
      return fixed;
    });

    report.totalOut = after.length;
    console.log(
      `\n✅ ValidationAgent: ${report.totalIn} in → ${report.totalOut} out` +
      ` (−${report.blockedByDate} date, −${report.blockedByBounds} bounds,` +
      ` −${report.blockedByUnverifiedLocation} unverifiable,` +
      ` ${report.locationsCorrected} loc fixed, ${report.categoriesFixed} cat fixed)`
    );

    return { events: after, report };
  }
}

/**
 * Re-assign category if description/title strongly suggest a different one.
 * Only overrides when the current category clearly doesn't fit.
 */
// Map tags to categories — tags like 'live-music' should strongly signal Music category
const TAG_TO_CATEGORY: Record<string, string> = {
  'live-music': 'Music', 'jazz': 'Music', 'dj': 'Music', 'electronic': 'Music', 'hip-hop': 'Music',
  'comedy': 'Comedy',
  'yoga': 'Fitness', 'running': 'Fitness', 'cycling': 'Fitness', 'fitness-class': 'Fitness',
  'meditation': 'Wellness',
  'art-gallery': 'Art', 'museum': 'Art',
  'theater': 'Culture',
  'brunch': 'Food & Drink', 'happy-hour': 'Food & Drink', 'cocktails': 'Food & Drink',
  'wine-tasting': 'Food & Drink', 'craft-beer': 'Food & Drink', 'food-market': 'Food & Drink',
  'outdoor-dining': 'Food & Drink',
};

function fixCategory(event: IRLEvent): IRLEvent {
  const text = `${event.title} ${event.description ?? ''} ${event.tags.join(' ')}`;
  const current = event.category;

  // Only re-classify if current category has ZERO matching keywords
  const currentKeywords = CATEGORY_KEYWORD_MAP[current];
  if (currentKeywords && currentKeywords.some((re) => re.test(text))) {
    return event; // Current category fits — leave it
  }

  // Check tags for strong category signals (most reliable)
  for (const tag of event.tags) {
    const tagCategory = TAG_TO_CATEGORY[tag];
    if (tagCategory && tagCategory !== current) {
      return { ...event, category: tagCategory as IRLEvent['category'] };
    }
  }

  // Find a better category from text
  for (const [cat, patterns] of Object.entries(CATEGORY_KEYWORD_MAP)) {
    if (cat !== current && patterns.some((re) => re.test(text))) {
      return { ...event, category: cat as IRLEvent['category'] };
    }
  }

  return event; // No better match — leave as-is
}
