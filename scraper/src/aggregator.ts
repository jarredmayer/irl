/**
 * Event Aggregator
 * Collects events from all sources and deduplicates
 */

import { getAllScrapers, type BaseScraper } from './sources/index.js';
import type { RawEvent, IRLEvent, ScrapeResult } from './types.js';
import { createHash } from 'crypto';
import { verifyEvents } from './verification.js';

export class EventAggregator {
  private scrapers: BaseScraper[];

  constructor(scrapers?: BaseScraper[]) {
    this.scrapers = scrapers || getAllScrapers();
  }

  /**
   * Run all scrapers and aggregate results
   */
  async aggregate(): Promise<{
    events: IRLEvent[];
    results: ScrapeResult[];
    stats: { total: number; deduplicated: number; bySource: Record<string, number> };
  }> {
    console.log(`\n🚀 Starting event aggregation with ${this.scrapers.length} sources...\n`);

    const results: ScrapeResult[] = [];
    const allRawEvents: RawEvent[] = [];

    // Run each scraper
    for (const scraper of this.scrapers) {
      if (!scraper.isEnabled()) {
        console.log(`⏭️  Skipping disabled source: ${scraper.getSourceName()}`);
        continue;
      }

      const result: ScrapeResult = {
        source: scraper.getSourceName(),
        events: [],
        errors: [],
        scrapedAt: new Date().toISOString(),
      };

      try {
        console.log(`📡 Scraping ${scraper.getSourceName()}...`);
        const events = await scraper.scrape();
        result.events = events;
        allRawEvents.push(...events);
        console.log(`   ✅ Got ${events.length} events\n`);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        result.errors.push(errorMsg);
        console.log(`   ❌ Error: ${errorMsg}\n`);
      }

      results.push(result);
    }

    // Filter out past events
    const now = new Date();
    const futureEvents = allRawEvents.filter((event) => {
      const eventDate = new Date(event.startAt);
      return eventDate >= now;
    });
    console.log(`\n⏰ Filtered out ${allRawEvents.length - futureEvents.length} past events`);

    // Verify events (quality scoring + LLM verification)
    const verified = await verifyEvents(futureEvents);

    // Deduplicate events
    console.log(`\n🔄 Deduplicating ${verified.length} verified events...`);
    const deduplicated = this.deduplicateEvents(verified);
    console.log(`   ✅ ${deduplicated.length} unique events after deduplication\n`);

    // Transform to IRL format
    console.log(`📝 Transforming to IRL format...`);
    const irlEvents = deduplicated.map((event) => this.transformToIRL(event));
    console.log(`   ✅ ${irlEvents.length} events ready\n`);

    // Calculate stats
    const bySource: Record<string, number> = {};
    for (const result of results) {
      bySource[result.source] = result.events.length;
    }

    return {
      events: irlEvents,
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
   * Check if two events are likely duplicates using fuzzy matching
   */
  private areLikelyDuplicates(a: RawEvent, b: RawEvent): boolean {
    // Must be on the same date
    if (a.startAt.slice(0, 10) !== b.startAt.slice(0, 10)) return false;

    // Same venue is a strong signal
    const sameVenue =
      a.venueName &&
      b.venueName &&
      a.venueName.toLowerCase() === b.venueName.toLowerCase();

    if (sameVenue) {
      // Check if titles share significant words
      const wordsA = new Set(
        a.title
          .toLowerCase()
          .replace(/[^\w\s]/g, '')
          .split(/\s+/)
          .filter((w) => w.length > 3)
      );
      const wordsB = new Set(
        b.title
          .toLowerCase()
          .replace(/[^\w\s]/g, '')
          .split(/\s+/)
          .filter((w) => w.length > 3)
      );

      const intersection = [...wordsA].filter((w) => wordsB.has(w));
      // If they share 2+ significant words at the same venue on the same day, likely duplicate
      if (intersection.length >= 2) return true;
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
  private transformToIRL(event: RawEvent): IRLEvent {
    // Generate unique ID
    const id = this.generateEventId(event);

    // Generate editorial content
    const shortWhy = this.generateShortWhy(event);
    const editorialWhy = this.generateEditorialWhy(event);

    // Determine if it's an editor's pick
    const editorPick = this.isEditorPick(event);

    // Generate series info for recurring events
    let seriesId: string | undefined;
    let seriesName: string | undefined;
    if (event.recurring) {
      seriesId = this.generateSeriesId(event);
      seriesName = event.title;
    }

    // Generate venue ID if we have a venue name
    let venueId: string | undefined;
    if (event.venueName) {
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
      venueName: event.venueName,
      address: event.address,
      neighborhood: event.neighborhood || 'Miami',
      lat: event.lat ?? null,
      lng: event.lng ?? null,
      city: event.city,
      tags: event.tags,
      category: event.category,
      priceLabel: event.priceLabel,
      isOutdoor: event.isOutdoor,
      shortWhy,
      editorialWhy,
      description: event.description,
      source: event.sourceUrl
        ? {
            name: event.sourceName,
            url: event.sourceUrl,
          }
        : undefined,
      image: event.image,
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
   * Generate short editorial hook
   */
  private generateShortWhy(event: RawEvent): string {
    const isMiami = event.city === 'Miami';
    const cityName = isMiami ? 'Miami' : 'Fort Lauderdale';
    const regionName = isMiami ? 'the Magic City' : 'the Venice of America';

    const templates: Record<string, string[]> = {
      Music: [
        `Live sounds in one of ${cityName}'s best spots.`,
        'Get your music fix with locals who know.',
        `The kind of night ${cityName} does best.`,
      ],
      'Food & Drink': [
        `Taste what makes ${cityName}'s food scene special.`,
        'Local flavors and community vibes.',
        'Fresh, local, and full of character.',
      ],
      Fitness: [
        `Move your body with ${cityName}'s fitness community.`,
        'Free workout with good people.',
        'Start your day right with locals.',
      ],
      Wellness: [
        `Find your calm in ${regionName}.`,
        'Wellness done right.',
        'Reset and recharge.',
      ],
      Sports: [
        `Cheer on ${cityName}'s finest.`,
        'Game day energy at its peak.',
        'Nothing beats live sports.',
      ],
      Art: [
        `See what ${cityName}'s art scene is about.`,
        'Culture in full color.',
        'Art worth the trip.',
      ],
      Culture: [
        `Dive into ${cityName}'s cultural richness.`,
        'History and culture, local-style.',
        'Experience local heritage.',
      ],
      Community: [
        `Connect with the ${cityName} community.`,
        'Local vibes, real connections.',
        `Where ${cityName} comes together.`,
      ],
      Nightlife: [
        'Where South Florida comes alive after dark.',
        'The kind of night you\'ll remember.',
        'Dance floors and good energy.',
      ],
      Comedy: [
        `Laugh out loud with ${cityName}'s comedy scene.`,
        'Comedians who know how to deliver.',
        'The perfect night out.',
      ],
    };

    const categoryTemplates = templates[event.category] || templates.Community;
    return categoryTemplates[Math.floor(Math.random() * categoryTemplates.length)];
  }

  /**
   * Generate longer editorial description
   */
  private generateEditorialWhy(event: RawEvent): string {
    let why = event.description;

    // Add venue context if available
    if (event.venueName && event.neighborhood) {
      why += ` Located in ${event.neighborhood}, ${event.venueName} is a local favorite.`;
    }

    // Add price context
    if (event.priceLabel === 'Free') {
      why += ' Best of all, it\'s free.';
    }

    return why;
  }

  /**
   * Determine if event should be editor's pick
   */
  private isEditorPick(event: RawEvent): boolean {
    // Mark as editor's pick based on various criteria
    const isLocalFavorite = event.tags.includes('local-favorite');
    const isPopularVenue = [
      // Miami venues
      'Lagniappe',
      'Ball & Chain',
      'Smorgasburg',
      'Wynwood Walls',
      'PAMM',
      'Vizcaya',
      'Fairchild',
      'The Standard',
      'Faena',
      'Broken Shaker',
      'Club Space',
      'Adrienne Arsht',
      'Fillmore',
      "Don't Tell Comedy",
      'Critical Mass',
      // Fort Lauderdale venues
      'NSU Art Museum',
      'Broward Center',
      'Bonnet House',
      'Las Olas',
      'FAT Village',
      'Riverwalk Fort Lauderdale',
    ].some((v) => event.venueName?.includes(v) || event.title.includes(v));

    return isLocalFavorite || isPopularVenue;
  }
}
