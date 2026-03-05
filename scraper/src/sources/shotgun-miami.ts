/**
 * Shotgun Miami Scraper
 *
 * Fetches real events from Shotgun (shotgun.live) for Miami.
 * Electronic music and nightlife events.
 *
 * Shotgun is a Next.js app on Vercel with security checkpoint protection.
 * Multiple strategies are attempted:
 *  1. Public API at api.shotgun.live/v1/events (may require auth)
 *  2. Next.js RSC data endpoints
 *  3. HTML scraping with __NEXT_DATA__ extraction
 *
 * Returns [] gracefully if all strategies fail (Vercel challenge blocks bots).
 */

import { BaseScraper } from './base.js';
import type { RawEvent } from '../types.js';

interface ShotgunVenue {
  name: string;
  address?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
}

interface ShotgunEvent {
  id: string | number;
  name: string;
  slug?: string;
  startDate: string;
  endDate?: string;
  description?: string;
  coverImage?: string;
  image?: string;
  organizer?: { name: string };
  venue?: ShotgunVenue;
  tickets?: Array<{ price: number }>;
  tags?: Array<{ name: string }>;
  lineup?: Array<{ name: string }>;
}

export class ShotgunMiamiScraper extends BaseScraper {
  constructor() {
    super('Shotgun Miami', { weight: 1.4, rateLimit: 2000 });
  }

  async scrape(): Promise<RawEvent[]> {
    this.log('Fetching Shotgun Miami events...');

    // Strategy 1: Try public API (v1 endpoint)
    try {
      const events = await this.tryApiV1();
      if (events.length > 0) {
        this.log(`Found ${events.length} Shotgun events via API`);
        return events;
      }
    } catch (e) {
      this.log(`  API v1 failed: ${e instanceof Error ? e.message : String(e)}`);
    }

    // Strategy 2: Try HTML scrape with __NEXT_DATA__
    try {
      const events = await this.tryHtmlScrape();
      if (events.length > 0) {
        this.log(`Found ${events.length} Shotgun events via HTML`);
        return events;
      }
    } catch (e) {
      this.log(`  HTML scrape failed: ${e instanceof Error ? e.message : String(e)}`);
    }

    // Strategy 3: Try Next.js data routes
    try {
      const events = await this.tryNextDataRoute();
      if (events.length > 0) {
        this.log(`Found ${events.length} Shotgun events via Next.js data`);
        return events;
      }
    } catch (e) {
      this.log(`  Next.js data route failed: ${e instanceof Error ? e.message : String(e)}`);
    }

    this.log('All Shotgun strategies failed (likely Vercel security checkpoint)');
    return [];
  }

  /**
   * Strategy 1: Shotgun public REST API.
   */
  private async tryApiV1(): Promise<RawEvent[]> {
    const today = new Date().toISOString().split('T')[0];
    const futureDate = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Try multiple API base URLs
    const apiUrls = [
      `https://api.shotgun.live/v1/events?citySlug=miami&page=1&perPage=40&startDate=${today}&endDate=${futureDate}`,
      `https://api.shotgun.live/v2/events?city_slug=miami&from_date=${today}&to_date=${futureDate}&page=1&per_page=40`,
    ];

    for (const url of apiUrls) {
      try {
        const data = await this.fetchJSONNativeGet<any>(url, 10_000);
        const events = data?.data || data?.events || data?.results || [];
        if (Array.isArray(events) && events.length > 0) {
          return this.mapEvents(events);
        }
      } catch {
        continue;
      }
    }
    return [];
  }

  /**
   * Strategy 2: HTML scrape - look for __NEXT_DATA__ or inline JSON.
   */
  private async tryHtmlScrape(): Promise<RawEvent[]> {
    const $ = await this.fetchHTMLNativeRetry('https://shotgun.live/en/cities/miami', 2, 15_000);
    const html = $.html();

    // Check for Vercel security checkpoint
    if (html.includes('Vercel Security Checkpoint')) {
      throw new Error('Vercel security checkpoint');
    }

    // Try __NEXT_DATA__
    const nextDataScript = $('script#__NEXT_DATA__').html();
    if (nextDataScript) {
      const nextData = JSON.parse(nextDataScript);
      const events = nextData?.props?.pageProps?.events
        || nextData?.props?.pageProps?.initialEvents
        || nextData?.props?.pageProps?.data?.events
        || [];
      if (Array.isArray(events) && events.length > 0) {
        return this.mapEvents(events);
      }
    }

    // Try JSON-LD structured data
    const ldJsonEvents: ShotgunEvent[] = [];
    $('script[type="application/ld+json"]').each((_i, el) => {
      try {
        const data = JSON.parse($(el).html() || '');
        if (data['@type'] === 'MusicEvent' || data['@type'] === 'Event') {
          ldJsonEvents.push({
            id: data.url || '',
            name: data.name || '',
            startDate: data.startDate || '',
            endDate: data.endDate,
            description: data.description,
            coverImage: data.image,
            venue: data.location ? {
              name: data.location.name || '',
              address: data.location.address?.streetAddress,
              city: data.location.address?.addressLocality,
              latitude: data.location.geo?.latitude,
              longitude: data.location.geo?.longitude,
            } : undefined,
          });
        } else if (data['@type'] === 'ItemList' && data.itemListElement) {
          // Process item list
        }
      } catch {
        // Ignore
      }
    });

    if (ldJsonEvents.length > 0) {
      return this.mapEvents(ldJsonEvents);
    }

    return [];
  }

  /**
   * Strategy 3: Try Next.js data routes.
   */
  private async tryNextDataRoute(): Promise<RawEvent[]> {
    // Next.js apps serve JSON at /_next/data/{buildId}/path.json
    // We need to find the build ID first
    try {
      const html = await this.fetchHTMLNative('https://shotgun.live/en/cities/miami', 10_000);
      const buildIdMatch = html.match(/"buildId"\s*:\s*"([^"]+)"/);
      if (buildIdMatch) {
        const buildId = buildIdMatch[1];
        const dataUrl = `https://shotgun.live/_next/data/${buildId}/en/cities/miami.json`;
        const data = await this.fetchJSONNativeGet<any>(dataUrl, 10_000);
        const events = data?.pageProps?.events
          || data?.pageProps?.initialEvents
          || [];
        if (Array.isArray(events) && events.length > 0) {
          return this.mapEvents(events);
        }
      }
    } catch {
      // Ignore
    }
    return [];
  }

  private mapEvents(events: ShotgunEvent[]): RawEvent[] {
    const rawEvents: RawEvent[] = [];
    const now = new Date();

    for (const ev of events) {
      if (!ev.name || !ev.startDate) continue;

      const startDate = new Date(ev.startDate);
      if (startDate < now) continue;

      const startAt = ev.startDate.includes('T')
        ? ev.startDate.replace('Z', '').replace(/\.\d+$/, '')
        : `${ev.startDate}T21:00:00`;

      const endAt = ev.endDate
        ? ev.endDate.replace('Z', '').replace(/\.\d+$/, '')
        : undefined;

      // Price
      const minPrice = ev.tickets?.length
        ? Math.min(...ev.tickets.map(t => t.price).filter(p => p >= 0))
        : 0;
      const priceLabel = minPrice === 0 ? 'Free' as const
        : minPrice <= 25 ? '$' as const
        : minPrice <= 75 ? '$$' as const
        : '$$$' as const;

      // Venue
      const venue = ev.venue;
      const venueName = venue?.name || undefined;
      const lat = venue?.latitude || null;
      const lng = venue?.longitude || null;
      const venueCity = venue?.city || '';

      const city = this.resolveCityFromText(venueCity, venueName || '');
      const neighborhood = this.resolveNeighborhoodFromText(venue?.address || '', venueName || '');

      // Tags
      const tagNames = (ev.tags || []).map(t => t.name.toLowerCase().replace(/\s+/g, '-'));
      const description = ev.description || '';
      const category = this.categorize(ev.name, description, venueName || '');
      const tags = [...new Set([...this.generateTags(ev.name, description, category), ...tagNames])].slice(0, 5);

      // Image
      const image = ev.coverImage || ev.image || undefined;

      // Source URL
      const slug = ev.slug || ev.id;
      const sourceUrl = `https://shotgun.live/events/${slug}`;

      rawEvents.push({
        title: ev.name,
        startAt,
        endAt,
        venueName,
        address: venue?.address,
        neighborhood,
        lat,
        lng,
        city,
        tags,
        category,
        priceLabel,
        priceAmount: minPrice,
        isOutdoor: this.isOutdoor(ev.name, description, venueName || ''),
        description: description ? description.slice(0, 300) : `${ev.name} — via Shotgun`,
        sourceUrl,
        sourceName: this.name,
        ticketUrl: sourceUrl,
        image,
      });
    }

    return rawEvents;
  }

  private resolveCityFromText(city: string, venue: string): 'Miami' | 'Fort Lauderdale' | 'Palm Beach' {
    const text = `${city} ${venue}`.toLowerCase();
    if (/fort lauderdale|hollywood|dania|pompano|davie|plantation|pembroke|hallandale|wilton manors/.test(text)) {
      return 'Fort Lauderdale';
    }
    if (/palm beach|boca raton|delray|boynton|jupiter|lake worth/.test(text)) {
      return 'Palm Beach';
    }
    return 'Miami';
  }

  private resolveNeighborhoodFromText(address: string, venue: string): string {
    const text = `${address} ${venue}`.toLowerCase();
    if (/wynwood/.test(text)) return 'Wynwood';
    if (/brickell/.test(text)) return 'Brickell';
    if (/south beach|ocean dr|collins/.test(text)) return 'South Beach';
    if (/design district/.test(text)) return 'Design District';
    if (/little havana/.test(text)) return 'Little Havana';
    if (/coconut grove/.test(text)) return 'Coconut Grove';
    if (/coral gables/.test(text)) return 'Coral Gables';
    if (/downtown/.test(text)) return 'Downtown Miami';
    if (/miami beach/.test(text)) return 'Miami Beach';
    if (/edgewater/.test(text)) return 'Edgewater';
    if (/midtown/.test(text)) return 'Midtown';
    if (/club space/.test(text)) return 'Downtown Miami';
    if (/e11even/.test(text)) return 'Downtown Miami';
    return 'Miami';
  }
}
