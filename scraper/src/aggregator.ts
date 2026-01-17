/**
 * Event Aggregator
 * Collects events from all sources and deduplicates
 */

import { getAllScrapers, type BaseScraper } from './sources/index.js';
import type { RawEvent, IRLEvent, ScrapeResult } from './types.js';
import { createHash } from 'crypto';

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

    // Deduplicate events
    console.log(`\n🔄 Deduplicating ${allRawEvents.length} total events...`);
    const deduplicated = this.deduplicateEvents(allRawEvents);
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
      return 0;
    });

    for (const event of sorted) {
      const key = this.generateDedupeKey(event);

      if (!seen.has(key)) {
        seen.set(key, event);
        unique.push(event);
      } else {
        // Merge with existing event if this one has more data
        const existing = seen.get(key)!;
        const merged = this.mergeEvents(existing, event);
        seen.set(key, merged);
        const idx = unique.findIndex((e) => this.generateDedupeKey(e) === key);
        if (idx >= 0) {
          unique[idx] = merged;
        }
      }
    }

    return unique;
  }

  /**
   * Generate a deduplication key for an event
   */
  private generateDedupeKey(event: RawEvent): string {
    // Normalize title for comparison
    const normalizedTitle = event.title
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 50);

    // Extract date only (not time)
    const dateOnly = event.startAt.slice(0, 10);

    // Create composite key
    const keyParts = [normalizedTitle, dateOnly, event.neighborhood?.toLowerCase() || 'miami'];

    return createHash('md5').update(keyParts.join('|')).digest('hex').slice(0, 16);
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
    const templates: Record<string, string[]> = {
      Music: [
        'Live sounds in one of Miami\'s best spots.',
        'Get your music fix with locals who know.',
        'The kind of night Miami does best.',
      ],
      'Food & Drink': [
        'Taste what makes Miami\'s food scene special.',
        'Local flavors and community vibes.',
        'Fresh, local, and full of character.',
      ],
      Fitness: [
        'Move your body with Miami\'s fitness community.',
        'Free workout with good people.',
        'Start your day right with locals.',
      ],
      Wellness: [
        'Find your calm in the Magic City.',
        'Wellness the Miami way.',
        'Reset and recharge.',
      ],
      Sports: [
        'Cheer on Miami\'s finest.',
        'Game day energy at its peak.',
        'Nothing beats live sports.',
      ],
      Art: [
        'See what Miami\'s art scene is about.',
        'Culture in full color.',
        'Art worth the trip.',
      ],
      Culture: [
        'Dive into Miami\'s cultural richness.',
        'History and culture, Miami-style.',
        'Experience local heritage.',
      ],
      Community: [
        'Connect with the Miami community.',
        'Local vibes, real connections.',
        'Where Miami comes together.',
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
    const isFreeEvent = event.priceLabel === 'Free';
    const isPopularVenue = [
      'Lagniappe',
      'Ball & Chain',
      'Smorgasburg',
      'Wynwood Walls',
      'PAMM',
      'Vizcaya',
      'Fairchild',
    ].some((v) => event.venueName?.includes(v) || event.title.includes(v));

    return isLocalFavorite || isPopularVenue;
  }
}
