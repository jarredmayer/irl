/**
 * Event Aggregator
 * Collects events from all sources and deduplicates
 */

import { getAllScrapers, type BaseScraper } from './sources/index.js';
import type { RawEvent, IRLEvent, ScrapeResult } from './types.js';
import { createHash } from 'crypto';
import { verifyEvents } from './verification.js';
import { findVenue, type Venue } from './venues.js';
import { extractUniqueVenues, batchVerifyLocations } from './geocoding.js';
import { OrchestratorAgent } from './agents/orchestrator.js';
import { hasAIEnabled, batchGenerateEditorial } from './ai.js';

export class EventAggregator {
  private scrapers: BaseScraper[];

  constructor(scrapers?: BaseScraper[]) {
    this.scrapers = scrapers || getAllScrapers();
  }

  /**
   * Run all scrapers and aggregate results
   */
  async aggregate(options?: { verifyLocations?: boolean; generateEditorial?: boolean; fullPipeline?: boolean; verifyEvents?: boolean }): Promise<{
    events: IRLEvent[];
    results: ScrapeResult[];
    stats: { total: number; deduplicated: number; bySource: Record<string, number> };
  }> {
    const enabledScrapers = this.scrapers.filter((s) => s.isEnabled());
    const disabledCount = this.scrapers.length - enabledScrapers.length;
    console.log(`\n🚀 Starting event aggregation with ${enabledScrapers.length} sources (${disabledCount} disabled)...\n`);

    // Per-scraper timeout (2 minutes — enough for multi-page scrapers)
    const SCRAPER_TIMEOUT_MS = 120_000;
    // Concurrency — run up to 6 scrapers in parallel
    const BATCH_SIZE = 6;

    const results: ScrapeResult[] = [];
    const allRawEvents: RawEvent[] = [];

    // Run scrapers in concurrent batches
    for (let i = 0; i < enabledScrapers.length; i += BATCH_SIZE) {
      const batch = enabledScrapers.slice(i, i + BATCH_SIZE);
      console.log(`── Batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(enabledScrapers.length / BATCH_SIZE)} (${batch.map((s) => s.getSourceName()).join(', ')}) ──`);

      const batchResults = await Promise.allSettled(
        batch.map(async (scraper) => {
          const result: ScrapeResult = {
            source: scraper.getSourceName(),
            events: [],
            errors: [],
            scrapedAt: new Date().toISOString(),
          };

          try {
            console.log(`📡 Scraping ${scraper.getSourceName()}...`);
            const events = await Promise.race([
              scraper.scrape(),
              new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error(`Timed out after ${SCRAPER_TIMEOUT_MS / 1000}s`)), SCRAPER_TIMEOUT_MS)
              ),
            ]);
            result.events = events;
            console.log(`   ✅ ${scraper.getSourceName()}: ${events.length} events`);
          } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            result.errors.push(errorMsg);
            console.log(`   ❌ ${scraper.getSourceName()}: ${errorMsg}`);
          }

          return result;
        })
      );

      for (const settled of batchResults) {
        if (settled.status === 'fulfilled') {
          results.push(settled.value);
          allRawEvents.push(...settled.value.events);
        }
      }
      console.log('');
    }

    // Filter out past events and sanity-check dates
    const now = new Date();
    const currentYear = now.getFullYear();
    const maxFutureDate = new Date(now);
    maxFutureDate.setFullYear(currentYear + 2); // Cap at 2 years out
    const futureEvents = allRawEvents.filter((event) => {
      const eventDate = new Date(event.startAt);
      if (isNaN(eventDate.getTime())) {
        console.warn(`   ⚠️  Invalid date skipped: "${event.title}" startAt="${event.startAt}"`);
        return false;
      }
      if (eventDate.getFullYear() < currentYear) {
        console.warn(`   ⚠️  Past-year event blocked: "${event.title}" (${event.startAt.slice(0, 10)}) from ${event.sourceName}`);
        return false;
      }
      if (eventDate > maxFutureDate) {
        console.warn(`   ⚠️  Too-far-future event blocked: "${event.title}" (${event.startAt.slice(0, 10)})`);
        return false;
      }
      return eventDate >= now;
    });
    console.log(`\n⏰ Filtered out ${allRawEvents.length - futureEvents.length} invalid/past events`);

    // Verify events (quality scoring + LLM verification)
    const verified = await verifyEvents(futureEvents);

    // Deduplicate events
    console.log(`\n🔄 Deduplicating ${verified.length} verified events...`);
    const deduplicated = this.deduplicateEvents(verified);
    console.log(`   ✅ ${deduplicated.length} unique events after deduplication\n`);

    // Generate AI editorial content (cached — recurring events reuse copy)
    let aiEditorial = new Map<string, { shortWhy: string; editorialWhy: string }>();
    if (options?.generateEditorial && hasAIEnabled()) {
      aiEditorial = await batchGenerateEditorial(deduplicated, {
        batchSize: 10,
        delayMs: 500,
      });
    } else if (options?.generateEditorial && !hasAIEnabled()) {
      console.log('⚠️  AI editorial requested but ANTHROPIC_API_KEY not set');
    }

    // Transform to IRL format
    console.log(`📝 Transforming to IRL format...`);
    const irlEvents = deduplicated.map((event) => this.transformToIRL(event, aiEditorial));
    console.log(`   ✅ ${irlEvents.length} events ready\n`);

    // Calculate stats
    const bySource: Record<string, number> = {};
    for (const result of results) {
      bySource[result.source] = result.events.length;
    }

    // Run the Orchestrator — always runs rule-based validation (free);
    // location agent only runs when AI is enabled (cached, so very low cost).
    // In fullPipeline mode: reset heuristic editorPick so CurationAgent is sole source of truth.
    const eventsForOrchestrator = options?.fullPipeline
      ? irlEvents.map((e) => ({ ...e, editorPick: false }))
      : irlEvents;

    let verifiedEvents: IRLEvent[];
    try {
      const orchestrator = new OrchestratorAgent();
      const orchResult = await orchestrator.run(eventsForOrchestrator, {
        skipLocationAgent: !hasAIEnabled() || !options?.verifyLocations,
        fullPipeline: options?.fullPipeline,
        verifyEvents: options?.verifyEvents,
      });
      verifiedEvents = orchResult.events;
    } catch (orchError) {
      console.error('⚠️  Orchestrator failed, using pre-orchestrator events:', orchError instanceof Error ? orchError.message : orchError);
      verifiedEvents = irlEvents;
    }

    return {
      events: verifiedEvents,
      results,
      stats: {
        total: allRawEvents.length,
        deduplicated: irlEvents.length,
        bySource,
      },
    };
  }

  /**
   * Deduplicate events using fuzzy matching
   */
  private deduplicateEvents(events: RawEvent[]): RawEvent[] {
    const seen = new Map<string, RawEvent>();
    const unique: RawEvent[] = [];

    // Sort by source weight (higher first) so better sources win
    const sorted = [...events].sort((a, b) => {
      // Prioritize events with coordinates
      if (a.lat && !b.lat) return -1;
      if (!a.lat && b.lat) return 1;
      // Prioritize longer descriptions
      return b.description.length - a.description.length;
    });

    for (const event of sorted) {
      const key = this.generateDedupeKey(event);

      // Check exact key match first
      if (seen.has(key)) {
        const existing = seen.get(key)!;
        const merged = this.mergeEvents(existing, event);
        seen.set(key, merged);
        const idx = unique.findIndex((e) => this.generateDedupeKey(e) === key);
        if (idx >= 0) {
          unique[idx] = merged;
        }
        continue;
      }

      // Check for fuzzy duplicates among existing events
      let foundDuplicate = false;
      for (const existing of unique) {
        if (this.areLikelyDuplicates(existing, event)) {
          // Merge into existing
          const existingKey = this.generateDedupeKey(existing);
          const merged = this.mergeEvents(existing, event);
          seen.set(existingKey, merged);
          const idx = unique.findIndex((e) => this.generateDedupeKey(e) === existingKey);
          if (idx >= 0) {
            unique[idx] = merged;
          }
          foundDuplicate = true;
          break;
        }
      }

      if (!foundDuplicate) {
        seen.set(key, event);
        unique.push(event);
      }
    }

    return unique;
  }

  /**
   * Generate a deduplication key for an event
   */
  private generateDedupeKey(event: RawEvent): string {
    // Extract key words, sorted alphabetically to catch reordered titles
    const words = event.title
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter((w) => w.length > 2) // Skip short words
      .filter((w) => !['the', 'at', 'and', 'for', 'with'].includes(w)) // Skip common words
      .sort()
      .join(' ');

    // Extract date only (not time)
    const dateOnly = event.startAt.slice(0, 10);

    // Use venue name if available (normalized)
    const venue = event.venueName?.toLowerCase().replace(/[^\w\s]/g, '').trim() || '';

    // Create composite key - sorted words + date + venue
    const keyParts = [words, dateOnly, venue || event.neighborhood?.toLowerCase() || 'miami'];

    return createHash('md5').update(keyParts.join('|')).digest('hex').slice(0, 16);
  }

  /**
   * Normalize venue name using the venue database
   */
  private normalizeVenue(venueName: string | undefined): { id: string; venue: Venue } | null {
    if (!venueName) return null;
    const venue = findVenue(venueName);
    return venue ? { id: venue.id, venue } : null;
  }

  /**
   * Check if two venues are the same (using venue database for aliases)
   */
  private isSameVenue(venueA: string | undefined, venueB: string | undefined): boolean {
    if (!venueA || !venueB) return false;

    // Direct match
    if (venueA.toLowerCase().trim() === venueB.toLowerCase().trim()) return true;

    // Check via venue database
    const normalizedA = this.normalizeVenue(venueA);
    const normalizedB = this.normalizeVenue(venueB);

    if (normalizedA && normalizedB) {
      return normalizedA.id === normalizedB.id;
    }

    // Fuzzy match - one contains the other
    const a = venueA.toLowerCase().trim();
    const b = venueB.toLowerCase().trim();
    if (a.includes(b) || b.includes(a)) return true;

    return false;
  }

  /**
   * Calculate title similarity score (0-1)
   */
  private getTitleSimilarity(titleA: string, titleB: string): number {
    const normalize = (s: string) =>
      s
        .toLowerCase()
        .replace(/[^\w\s]/g, '')
        .split(/\s+/)
        .filter((w) => w.length > 2)
        .filter((w) => !['the', 'at', 'and', 'for', 'with', 'presents', 'featuring', 'feat', 'live'].includes(w));

    const wordsA = normalize(titleA);
    const wordsB = normalize(titleB);

    if (wordsA.length === 0 || wordsB.length === 0) return 0;

    const setA = new Set(wordsA);
    const setB = new Set(wordsB);

    const intersection = [...setA].filter((w) => setB.has(w));
    const union = new Set([...setA, ...setB]);

    // Jaccard similarity
    return intersection.length / union.size;
  }

  /**
   * Check if two events are likely duplicates using fuzzy matching
   */
  private areLikelyDuplicates(a: RawEvent, b: RawEvent): boolean {
    // Must be on the same date
    if (a.startAt.slice(0, 10) !== b.startAt.slice(0, 10)) return false;

    // Check venue similarity
    const sameVenue = this.isSameVenue(a.venueName, b.venueName);

    // Calculate title similarity
    const titleSimilarity = this.getTitleSimilarity(a.title, b.title);

    // High title similarity alone is enough (e.g., same artist different venues would be different events)
    if (titleSimilarity >= 0.7) return true;

    // Same venue + moderate title similarity
    if (sameVenue && titleSimilarity >= 0.3) return true;

    // Same venue + same time is very suspicious
    if (sameVenue && a.startAt === b.startAt) return true;

    // Check for artist name match (common pattern: "Artist Name at Venue" vs "Artist Name")
    const extractArtist = (title: string) => {
      // Remove common suffixes like "at Venue", "Live at", etc.
      return title
        .toLowerCase()
        .replace(/\s+(at|@|live at|presents?)\s+.+$/i, '')
        .replace(/[^\w\s]/g, '')
        .trim();
    };

    const artistA = extractArtist(a.title);
    const artistB = extractArtist(b.title);

    if (artistA && artistB && artistA.length > 5 && artistB.length > 5) {
      if (artistA === artistB || artistA.includes(artistB) || artistB.includes(artistA)) {
        // Same artist on same date - check if same venue or close proximity
        if (sameVenue) return true;

        // Check if same neighborhood
        if (a.neighborhood && b.neighborhood && a.neighborhood === b.neighborhood) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Merge two similar events, keeping the most complete data
   */
  private mergeEvents(existing: RawEvent, incoming: RawEvent): RawEvent {
    return {
      ...existing,
      // Prefer non-null coordinates
      lat: existing.lat ?? incoming.lat,
      lng: existing.lng ?? incoming.lng,
      // Prefer longer description
      description:
        existing.description.length >= incoming.description.length
          ? existing.description
          : incoming.description,
      // Merge tags
      tags: [...new Set([...existing.tags, ...incoming.tags])].slice(0, 5),
      // Prefer specific venue name
      venueName: existing.venueName || incoming.venueName,
      address: existing.address || incoming.address,
      // Keep image if present
      image: existing.image || incoming.image,
      sourceUrl: existing.sourceUrl || incoming.sourceUrl,
    };
  }

  /**
   * Transform raw event to IRL format
   */
  private transformToIRL(
    event: RawEvent,
    aiEditorial?: Map<string, { shortWhy: string; editorialWhy: string }>
  ): IRLEvent {
    // Generate unique ID
    const id = this.generateEventId(event);

    // Use AI editorial if available, otherwise use templates
    const eventKey = `${event.title}|${event.startAt}`;
    const aiContent = aiEditorial?.get(eventKey);
    const shortWhy = aiContent?.shortWhy || this.generateShortWhy(event);
    const editorialWhy = aiContent?.editorialWhy || this.generateEditorialWhy(event);

    // Determine if it's an editor's pick
    const editorPick = this.isEditorPick(event);

    // Generate series info for recurring events
    let seriesId: string | undefined;
    let seriesName: string | undefined;
    if (event.recurring) {
      seriesId = this.generateSeriesId(event);
      seriesName = event.title;
    }

    // Use venue database for normalized data
    const normalizedVenue = this.normalizeVenue(event.venueName);
    let venueId: string | undefined;
    let venueName = event.venueName;
    let address = event.address;
    let neighborhood = event.neighborhood || 'Miami';
    let lat = event.lat ?? null;
    let lng = event.lng ?? null;
    let tags = [...event.tags];

    if (normalizedVenue) {
      const { id: vId, venue } = normalizedVenue;
      venueId = vId;
      // Use canonical venue data (source of truth)
      venueName = venue.name;
      address = venue.address;
      neighborhood = venue.neighborhood;
      // Always use verified venue coordinates
      lat = venue.lat;
      lng = venue.lng;
      // Add venue vibe tags if not already present
      for (const vibeTag of venue.vibeTags) {
        if (!tags.includes(vibeTag) && tags.length < 6) {
          tags.push(vibeTag);
        }
      }
    } else if (event.venueName) {
      // Generate venue ID from name if not in database
      venueId = createHash('md5')
        .update(event.venueName.toLowerCase())
        .digest('hex')
        .slice(0, 12);
    }

    return {
      id,
      title: event.title,
      startAt: event.startAt,
      endAt: event.endAt,
      timezone: 'America/New_York',
      venueName,
      address,
      neighborhood,
      lat,
      lng,
      city: event.city,
      tags,
      category: event.category,
      priceLabel: event.priceLabel || 'Free',
      isOutdoor: event.isOutdoor,
      shortWhy,
      editorialWhy,
      description: event.description,
      // Explicit ticketUrl wins; for paid events fall back to sourceUrl (where tickets are sold)
      ticketUrl: event.ticketUrl || (event.priceAmount && event.priceAmount > 0 ? event.sourceUrl : undefined),
      source: {
        name: event.sourceName,
        url: event.sourceUrl || '',
      },
      // Native event image only — BrandingAgent handles all fallbacks (venue, og:image, tags, category)
      image: event.image || undefined,
      editorPick,
      seriesId,
      seriesName,
      venueId,
    };
  }

  /**
   * Generate a unique event ID
   */
  private generateEventId(event: RawEvent): string {
    const input = `${event.title}|${event.startAt}|${event.venueName || event.neighborhood}`;
    return createHash('md5').update(input).digest('hex').slice(0, 16);
  }

  /**
   * Generate series ID for recurring events
   */
  private generateSeriesId(event: RawEvent): string {
    const input = `${event.title}|${event.venueName || event.neighborhood}`;
    return createHash('md5').update(input).digest('hex').slice(0, 12);
  }

  /**
   * Generate short editorial hook using actual event details.
   * Avoids generic templates — every shortWhy should feel specific to the event.
   */
  private generateShortWhy(event: RawEvent): string {
    const venue = event.venueName || '';
    const hood = event.neighborhood || '';
    const title = event.title;
    const isFree = event.priceLabel === 'Free' || event.priceAmount === 0;
    const isOutdoor = event.isOutdoor;

    // Try to extract a performer/artist name from the title
    // Common patterns: "Artist at Venue", "Artist: Tour Name", "Artist Live"
    const artistMatch = title.match(/^(.+?)(?:\s+at\s+|\s*[-–:]\s*|\s+live\s+at\s+)/i);
    const artist = artistMatch ? artistMatch[1].trim() : '';

    // Build context-specific shortWhy based on what we know
    if (artist && venue) {
      return `${artist} live at ${venue}.`;
    }

    if (artist) {
      return `${artist} live in ${hood || event.city}.`;
    }

    // Category-specific with real details
    switch (event.category) {
      case 'Music':
        if (venue && hood) return `Live music at ${venue}, ${hood}.`;
        if (venue) return `Live music at ${venue} tonight.`;
        return `Live music in ${hood || event.city}.`;

      case 'Food & Drink':
        if (isFree && venue) return `Free tasting at ${venue}.`;
        if (venue && hood) return `${venue} in ${hood} — worth the trip.`;
        return `Good food, good people in ${hood || event.city}.`;

      case 'Fitness':
        if (isFree) return `Free workout in ${hood || event.city}.`;
        if (venue) return `Get moving at ${venue}.`;
        return `Fitness in ${hood || event.city}.`;

      case 'Wellness':
        if (isFree && isOutdoor) return `Free outdoor wellness in ${hood || event.city}.`;
        if (venue) return `Reset at ${venue}.`;
        return `Wellness in ${hood || event.city}.`;

      case 'Comedy':
        if (venue) return `Laughs at ${venue} — locals know.`;
        return `Live comedy in ${hood || event.city}.`;

      case 'Sports':
        if (venue) return `Game day at ${venue}.`;
        return `Live sports in ${event.city}.`;

      case 'Art':
        if (venue) return `Art at ${venue}, ${hood}.`;
        return `Art in ${hood || event.city}.`;

      case 'Culture':
        if (venue) return `Culture at ${venue}, ${hood}.`;
        return `Cultural experience in ${hood || event.city}.`;

      case 'Nightlife':
        if (venue && hood) return `${venue} in ${hood} after dark.`;
        return `Night out in ${hood || event.city}.`;

      case 'Community':
        if (isFree) return `Free community event in ${hood || event.city}.`;
        if (venue) return `Community at ${venue}.`;
        return `${hood || event.city} comes together.`;

      default:
        if (venue && hood) return `${venue} in ${hood}.`;
        if (hood) return `Happening in ${hood}.`;
        return `Happening in ${event.city}.`;
    }
  }

  /**
   * Generate longer editorial description with venue and neighborhood context.
   * Avoids generic "is a local favorite" suffix — uses specific details instead.
   */
  private generateEditorialWhy(event: RawEvent): string {
    const parts: string[] = [];

    // Lead with the event description
    if (event.description && event.description.length > 20) {
      parts.push(event.description);
    } else {
      parts.push(`${event.title} in ${event.neighborhood || event.city}.`);
    }

    // Add neighborhood context only if it adds value
    if (event.venueName && event.neighborhood) {
      if (event.isOutdoor) {
        parts.push(`Outdoors at ${event.venueName} in ${event.neighborhood}.`);
      } else {
        parts.push(`At ${event.venueName} in ${event.neighborhood}.`);
      }
    }

    // Add price context
    if (event.priceLabel === 'Free' || event.priceAmount === 0) {
      parts.push('Free to attend.');
    } else if (event.priceAmount && event.priceAmount > 0) {
      parts.push(`Tickets from $${event.priceAmount}.`);
    }

    return parts.join(' ');
  }

  /**
   * Determine if event should be editor's pick.
   *
   * Targets ~15% of events. Rules:
   * - Recurring weekly events (yoga, run clubs, markets) are NEVER picks
   * - Template-generated events are NEVER picks by default
   * - Only genuinely special/unique/noteworthy events qualify
   * - A short list of truly iconic venues can qualify non-recurring events
   */
  private isEditorPick(event: RawEvent): boolean {
    // Recurring events are never editor picks (yoga, run clubs, farmers markets, etc.)
    if (event.recurring) return false;

    // Detect recurring-style events even if not explicitly marked
    const titleLower = event.title.toLowerCase();
    const recurringPatterns = [
      'weekly', 'every monday', 'every tuesday', 'every wednesday',
      'every thursday', 'every friday', 'every saturday', 'every sunday',
      'run club', 'yoga', 'pilates', 'bootcamp', 'farmers market',
      'happy hour', 'trivia night', 'open mic', 'karaoke night',
      'brunch', 'sunset session',
    ];
    if (recurringPatterns.some((p) => titleLower.includes(p))) return false;

    // Only a handful of truly iconic venues qualify as auto-picks
    const iconicVenues = [
      'Adrienne Arsht',
      'PAMM',
      'Vizcaya',
      'Faena',
      'Club Space',
    ];
    const isIconicVenue = iconicVenues.some(
      (v) => event.venueName?.includes(v)
    );

    // Must also have a specific/named event (not generic "Live Music at X")
    const genericTitlePatterns = [
      /^live music/i, /^dj night/i, /^happy hour/i, /^ladies night/i,
      /^wine night/i, /^game night/i, /^open mic/i,
    ];
    const isGenericTitle = genericTitlePatterns.some((p) => p.test(event.title));

    if (isIconicVenue && !isGenericTitle) return true;

    // High-signal keywords that indicate a genuinely special event
    const specialSignals = [
      'premiere', 'opening night', 'album release', 'book launch',
      'pop-up', 'popup', 'one night only', 'limited', 'sold out',
      'festival', 'art basel', 'iii points', 'ultra',
      'critical mass',
    ];
    const hasSpecialSignal = specialSignals.some((s) => titleLower.includes(s));

    if (hasSpecialSignal && !isGenericTitle) return true;

    return false;
  }
}
