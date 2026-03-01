/**
 * Event Aggregator
 * Collects events from all sources and deduplicates
 */

import { getAllScrapers, type BaseScraper } from './sources/index.js';
import type { RawEvent, IRLEvent, ScrapeResult } from './types.js';
import { createHash } from 'crypto';
import { verifyEvents } from './verification.js';
import { findVenue, CATEGORY_IMAGES, type Venue } from './venues.js';
import { extractUniqueVenues, batchVerifyLocations, type VerificationResult } from './geocoding.js';
import { agentVerifyLocations } from './agents/location-verifier.js';
import { hasAIEnabled, batchGenerateEditorial } from './ai.js';

export class EventAggregator {
  private scrapers: BaseScraper[];

  constructor(scrapers?: BaseScraper[]) {
    this.scrapers = scrapers || getAllScrapers();
  }

  /**
   * Run all scrapers and aggregate results
   */
  async aggregate(options?: { verifyLocations?: boolean; generateEditorial?: boolean }): Promise<{
    events: IRLEvent[];
    results: ScrapeResult[];
    stats: { total: number; deduplicated: number; bySource: Record<string, number> };
    locationIssues?: VerificationResult[];
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

    // Generate AI editorial content if enabled
    let aiEditorial = new Map<string, { shortWhy: string; editorialWhy: string }>();
    if (options?.generateEditorial && hasAIEnabled()) {
      aiEditorial = await batchGenerateEditorial(deduplicated, {
        batchSize: 5, // Conservative batch size to avoid rate limits
        delayMs: 1000,
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

    // Verify locations using agent (agentic tool-use loop) or legacy batch verifier
    let locationIssues: VerificationResult[] | undefined;
    let verifiedEvents = irlEvents;
    if (options?.verifyLocations) {
      const useAgent = hasAIEnabled();
      if (useAgent) {
        // Agent path: Claude reasons about each venue's coordinates
        console.log(`\n🤖 Using Location Verifier Agent (Claude tool use)...`);
        const result = await agentVerifyLocations(irlEvents, { maxEvents: 30 });
        verifiedEvents = result.events;
      } else {
        // Legacy path: Nominatim batch geocode without AI reasoning
        console.log(`\n🗺️  Verifying venue locations (legacy geocoder)...`);
        const venues = extractUniqueVenues(irlEvents);
        console.log(`   Found ${venues.length} unique venues to verify`);

        if (venues.length > 0) {
          const verificationResults = await batchVerifyLocations(venues);
          locationIssues = verificationResults.filter(
            (r) => !r.isValid && r.discrepancyMiles > 0
          );

          if (locationIssues.length > 0) {
            console.log(`\n⚠️  ${locationIssues.length} venues have coordinate issues:`);
            for (const issue of locationIssues.slice(0, 5)) {
              console.log(`   • ${issue.name}: ${issue.discrepancyMiles.toFixed(2)} miles off`);
            }
            if (locationIssues.length > 5) {
              console.log(`   ... and ${locationIssues.length - 5} more`);
            }
          } else {
            console.log(`   ✅ All venue locations verified!`);
          }
        }
      }
    }

    return {
      events: verifiedEvents,
      results,
      stats: {
        total: allRawEvents.length,
        deduplicated: irlEvents.length,
        bySource,
      },
      locationIssues,
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
      priceLabel: event.priceLabel,
      isOutdoor: event.isOutdoor,
      shortWhy,
      editorialWhy,
      description: event.description,
      // Explicit ticketUrl wins; for paid events fall back to sourceUrl (where tickets are sold)
      ticketUrl: event.ticketUrl || (event.priceAmount && event.priceAmount > 0 ? event.sourceUrl : undefined),
      source: event.sourceUrl
        ? {
            name: event.sourceName,
            url: event.sourceUrl,
          }
        : undefined,
      // Use event image, venue image, or category fallback
      image: event.image ||
        (normalizedVenue?.venue.imageUrl) ||
        CATEGORY_IMAGES[event.category] ||
        undefined,
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
