/**
 * Resident Advisor Scraper
 * Queries RA's GraphQL API for Miami-area events.
 * Area ID 38 = Miami (covers South Florida / FLL).
 *
 * The RA GraphQL API at ra.co/graphql is accessible from datacenter IPs
 * and returns totalResults: 10000+ for area 38. If 0 results are returned,
 * debug the query variables and response parsing rather than assuming IP blocking.
 */

import { BaseScraper } from './base.js';
import type { RawEvent } from '../types.js';
import { addDays, format } from 'date-fns';

const RA_GRAPHQL = 'https://ra.co/graphql';
const MIAMI_AREA_ID = 38;

// Electronic/club genres that RA primarily covers → Nightlife category
const NIGHTLIFE_GENRES = new Set([
  'techno', 'house', 'club', 'electronic', 'electro', 'drum & bass',
  'dnb', 'jungle', 'trance', 'bass', 'ambient', 'experimental',
  'industrial', 'noise', 'hardcore', 'breakbeat', 'garage',
  'dubstep', 'uk bass', 'afrobeats', 'reggaeton', 'dancehall',
]);

const QUERY = `
  query GetMiamiEvents($filters: FilterInputDtoInput, $pageSize: Int, $page: Int) {
    eventListings(filters: $filters, pageSize: $pageSize, page: $page) {
      totalResults
      data {
        listingDate
        event {
          id
          title
          date
          startTime
          endTime
          contentUrl
          cost
          isTicketed
          venue {
            id
            name
            address
            area {
              id
              name
            }
          }
          pick {
            blurb
          }
          artists {
            name
          }
          genres {
            name
          }
          images {
            filename
            type
          }
        }
      }
    }
  }
`;

interface RAEvent {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string | null;
  contentUrl: string;
  cost: string;
  isTicketed: boolean;
  venue: {
    id: string;
    name: string;
    address: string;
    area: { id: string; name: string } | null;
  } | null;
  pick: { blurb: string } | null;
  artists: { name: string }[];
  genres: { name: string }[];
  images: { filename: string; type: string }[];
}

export class ResidentAdvisorScraper extends BaseScraper {
  constructor() {
    super('Resident Advisor', { weight: 1.5, rateLimit: 1500 });
  }

  async scrape(): Promise<RawEvent[]> {
    this.log('Querying Resident Advisor GraphQL API...');

    const today = new Date();
    const dateFrom = format(today, 'yyyy-MM-dd');
    const dateTo = format(addDays(today, 30), 'yyyy-MM-dd');

    this.log(`  Date range: ${dateFrom} to ${dateTo}, area: ${MIAMI_AREA_ID}`);

    const allEvents: RawEvent[] = [];
    const pageSize = 100;
    let page = 1;
    let totalResults = Infinity;

    type RAResponse = {
      data?: {
        eventListings?: {
          totalResults: number;
          data: { listingDate: string; event: RAEvent }[];
        };
      };
      errors?: { message: string }[];
    };

    const raHeaders = {
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Accept: 'application/json',
      'Accept-Language': 'en-US,en;q=0.9',
      Referer: 'https://ra.co/events/us/miami',
      Origin: 'https://ra.co',
      'x-requested-with': 'XMLHttpRequest',
    };

    while (allEvents.length < totalResults) {
      const body = JSON.stringify({
        query: QUERY,
        variables: {
          filters: {
            areas: { eq: MIAMI_AREA_ID },
            listingDate: { gte: dateFrom, lte: dateTo },
          },
          pageSize,
          page,
        },
      });

      this.log(`  [DEBUG] Full query body (page ${page}): ${body}`);

      let data: RAResponse;

      // Try undici fetch first (handles DNS/TLS better in CI), then native https as fallback
      try {
        this.log(`  Requesting page ${page} (fetch)...`);
        data = await this.fetchJSONFetch<RAResponse>(RA_GRAPHQL, body, raHeaders, 15_000);
        const responseStr = JSON.stringify(data);
        this.log(`  [DEBUG] Response body length: ${responseStr.length} chars`);
        this.log(`  [DEBUG] Response top-level keys: ${Object.keys(data).join(', ')}`);
        if (data.data) {
          this.log(`  [DEBUG] data keys: ${Object.keys(data.data).join(', ')}`);
          if (data.data.eventListings) {
            this.log(`  [DEBUG] eventListings keys: ${Object.keys(data.data.eventListings).join(', ')}`);
          }
        }
        this.log(`  Got response, totalResults: ${data.data?.eventListings?.totalResults}`);
      } catch (e) {
        this.logError(`fetch() failed (page ${page})`, e);
        try {
          this.log('  Retrying with native https...');
          data = await this.fetchJSONNative<RAResponse>(RA_GRAPHQL, body, raHeaders);
          const responseStr = JSON.stringify(data);
          this.log(`  [DEBUG] Native response body length: ${responseStr.length} chars`);
          this.log(`  [DEBUG] Native response top-level keys: ${Object.keys(data).join(', ')}`);
        } catch (e2) {
          this.logError(`Native https also failed`, e2);
          break;
        }
      }

      if (data.errors?.length) {
        this.logError('GraphQL errors', data.errors.map((e) => e.message).join(', '));
        break;
      }

      const listing = data.data?.eventListings;
      if (!listing) {
        this.log(`  [DEBUG] No eventListings in response. data.data = ${JSON.stringify(data.data)?.slice(0, 500)}`);
        break;
      }

      totalResults = listing.totalResults;

      this.log(`  totalResults: ${totalResults}, data items: ${listing.data?.length || 0}`);

      if (totalResults === 0 && page === 1) {
        this.log('  Named query returned totalResults=0 — trying confirmed simpler inline query as fallback...');
        const fallbackEvents = await this.scrapeFallbackSimpleQuery(dateFrom, raHeaders);
        if (fallbackEvents.length > 0) {
          this.log(`  Fallback simple query found ${fallbackEvents.length} events`);
          return fallbackEvents;
        }
        this.log('  Fallback simple query also returned 0 events');
        break;
      }

      for (const { event } of listing.data) {
        const mapped = this.mapEvent(event);
        if (mapped) allEvents.push(mapped);
      }

      if (listing.data.length < pageSize) break;
      page++;
    }

    // If GraphQL returned 0, try HTML scraping as fallback
    if (allEvents.length === 0) {
      this.log('GraphQL returned 0 events — trying HTML __NEXT_DATA__ fallback...');
      const htmlEvents = await this.scrapeHtmlFallback();
      if (htmlEvents.length > 0) {
        this.log(`Found ${htmlEvents.length} events from HTML fallback`);
        return htmlEvents;
      }
    }

    this.log(`Found ${allEvents.length} events`);
    return allEvents;
  }

  /**
   * Fallback: use the confirmed working simpler inline GraphQL query format.
   * This avoids named queries and variables — the query is fully self-contained.
   */
  private async scrapeFallbackSimpleQuery(dateFrom: string, headers: Record<string, string>): Promise<RawEvent[]> {
    const simpleQuery = `{eventListings(filters:{areas:{eq:${MIAMI_AREA_ID}},listingDate:{gte:"${dateFrom}"}},pageSize:20){data{event{title date venue{name}}}}}`;
    const body = JSON.stringify({ query: simpleQuery });

    this.log(`  [DEBUG] Fallback simple query body: ${body}`);

    type SimpleRAResponse = {
      data?: {
        eventListings?: {
          data: { event: { title: string; date: string; venue: { name: string } | null } }[];
        };
      };
      errors?: { message: string }[];
    };

    let data: SimpleRAResponse;
    try {
      data = await this.fetchJSONFetch<SimpleRAResponse>(RA_GRAPHQL, body, headers, 15_000);
      const responseStr = JSON.stringify(data);
      this.log(`  [DEBUG] Fallback response length: ${responseStr.length} chars`);
      this.log(`  [DEBUG] Fallback response keys: ${Object.keys(data).join(', ')}`);
    } catch (e) {
      this.logError('Fallback fetch failed', e);
      try {
        data = await this.fetchJSONNative<SimpleRAResponse>(RA_GRAPHQL, body, headers);
      } catch (e2) {
        this.logError('Fallback native also failed', e2);
        return [];
      }
    }

    if (data.errors?.length) {
      this.logError('Fallback GraphQL errors', data.errors.map((e) => e.message).join(', '));
      return [];
    }

    const listings = data.data?.eventListings?.data;
    if (!listings || listings.length === 0) {
      this.log('  [DEBUG] Fallback returned no listings');
      return [];
    }

    this.log(`  [DEBUG] Fallback returned ${listings.length} events`);

    const events: RawEvent[] = [];
    for (const { event } of listings) {
      if (!event.title || !event.venue) continue;
      events.push({
        title: event.title,
        startAt: event.date,
        venueName: event.venue.name,
        address: '',
        neighborhood: 'Miami',
        city: 'Miami',
        tags: ['live-music'],
        category: 'Music',
        isOutdoor: false,
        description: `${event.title} at ${event.venue.name}`,
        sourceUrl: 'https://ra.co/events/us/miami',
        sourceName: this.name,
      });
    }
    return events;
  }

  /**
   * Fallback: scrape RA's Miami events page HTML for __NEXT_DATA__ JSON.
   * RA uses Next.js — event data is embedded in a script tag.
   */
  private async scrapeHtmlFallback(): Promise<RawEvent[]> {
    try {
      // Try undici fetch first, fall back to native https
      let html: string;
      try {
        const res = await fetch('https://ra.co/events/us/miami', {
          signal: AbortSignal.timeout(15_000),
          headers: { 'User-Agent': this.userAgent },
        });
        html = await res.text();
      } catch {
        html = await this.fetchHTMLNative('https://ra.co/events/us/miami', 15_000);
      }

      // Try __NEXT_DATA__
      const nextDataMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>(.*?)<\/script>/s);
      if (nextDataMatch) {
        const nextData = JSON.parse(nextDataMatch[1]);
        return this.extractEventsFromNextData(nextData);
      }

      // Try JSON-LD
      const jsonLdMatches = html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs);
      const events: RawEvent[] = [];
      for (const match of jsonLdMatches) {
        try {
          const data = JSON.parse(match[1]);
          const items = Array.isArray(data) ? data : [data];
          for (const item of items) {
            if (item['@type'] === 'Event' || item['@type'] === 'MusicEvent') {
              const mapped = this.mapJsonLdEvent(item);
              if (mapped) events.push(mapped);
            }
            if (item['@type'] === 'ItemList' && Array.isArray(item.itemListElement)) {
              for (const li of item.itemListElement) {
                const inner = li.item || li;
                const mapped = this.mapJsonLdEvent(inner);
                if (mapped) events.push(mapped);
              }
            }
          }
        } catch { /* skip invalid JSON-LD */ }
      }
      return events;
    } catch (e) {
      this.logError('HTML fallback failed', e);
      return [];
    }
  }

  private extractEventsFromNextData(data: any): RawEvent[] {
    const events: RawEvent[] = [];

    // Navigate Next.js data — try common paths
    const paths = [
      data?.props?.pageProps?.eventListings?.data,
      data?.props?.pageProps?.listing?.data,
      data?.props?.pageProps?.data,
      data?.props?.pageProps?.initialData?.data,
    ];

    for (const path of paths) {
      if (!Array.isArray(path) || path.length === 0) continue;

      for (const item of path) {
        const event = item?.event || item;
        if (!event?.title && !event?.name) continue;

        const mapped = this.mapEvent({
          id: event.id || '',
          title: event.title || event.name || '',
          date: event.date || event.startDate || '',
          startTime: event.startTime || event.date || '',
          endTime: event.endTime || null,
          contentUrl: event.contentUrl || event.url || '',
          cost: event.cost || '',
          isTicketed: event.isTicketed ?? true,
          venue: event.venue || null,
          pick: event.pick || null,
          artists: event.artists || [],
          genres: event.genres || [],
          images: event.images || [],
        });
        if (mapped) events.push(mapped);
      }

      if (events.length > 0) break;
    }

    return events;
  }

  private mapJsonLdEvent(item: any): RawEvent | null {
    if (!item.name || !item.startDate) return null;
    const now = new Date();
    if (new Date(item.startDate) < now) return null;

    const venueName = typeof item.location === 'object' ? item.location?.name : item.location || 'Miami Venue';
    const address = typeof item.location === 'object' ? item.location?.address?.streetAddress || '' : '';

    return {
      title: item.name,
      startAt: item.startDate,
      endAt: item.endDate || undefined,
      venueName,
      address,
      neighborhood: this.neighborhoodFromAddress(address, venueName),
      city: this.cityFromAddress(address),
      tags: ['live-music'],
      category: 'Music',
      isOutdoor: false,
      description: item.description || `${item.name} at ${venueName}`,
      sourceUrl: item.url || 'https://ra.co/events/us/miami',
      sourceName: this.name,
    };
  }

  private mapEvent(event: RAEvent): RawEvent | null {
    if (!event.venue) return null;

    // Include events with lineup, editorial pick, OR a named venue+title
    // RA events are already quality-curated — no need to over-filter
    const hasLineup = event.artists.length > 0;
    const hasPick = !!event.pick?.blurb;
    const hasGenres = event.genres.length > 0;
    const hasTitle = event.title.length > 3;
    if (!hasLineup && !hasPick && !hasGenres && !hasTitle) return null;

    const venue = event.venue;
    const address = venue.address || '';
    const neighborhood = this.neighborhoodFromAddress(address, venue.name);
    const city = this.cityFromAddress(address);

    // Build lineup string
    const lineup = event.artists.map((a) => a.name).join(', ');

    // Category: Nightlife for DJ/electronic genres, Music for live acts
    const genreNames = event.genres.map((g) => g.name.toLowerCase());
    const isNightlife = genreNames.some((g) => NIGHTLIFE_GENRES.has(g));
    const category = isNightlife ? 'Nightlife' : 'Music';

    // Tags
    const tags: string[] = ['live-music'];
    if (isNightlife) tags.push('dj');
    if (genreNames.some((g) => g.includes('electronic') || g.includes('techno') || g.includes('house'))) {
      tags.push('electronic');
    }
    if (genreNames.some((g) => g.includes('latin') || g.includes('afro') || g.includes('reggaeton'))) {
      tags.push('latin');
    }
    if (genreNames.some((g) => g.includes('jazz'))) tags.push('jazz');
    if (genreNames.some((g) => g.includes('hip-hop') || g.includes('hip hop') || g.includes('rap'))) {
      tags.push('hip-hop');
    }

    // Description
    const pickBlurb = event.pick?.blurb || '';
    const description = [
      pickBlurb,
      lineup ? `Featuring: ${lineup}.` : '',
      `Tickets: https://ra.co${event.contentUrl}`,
    ]
      .filter(Boolean)
      .join(' ');

    // Price
    const priceAmount = parseFloat(event.cost || '0') || 0;
    const priceLabel = priceAmount === 0
      ? ('Free' as const)
      : priceAmount <= 25
        ? ('$' as const)
        : priceAmount <= 75
          ? ('$$' as const)
          : ('$$$' as const);

    // Flyer image
    const flyer = event.images.find((i) => i.type === 'FLYERFRONT');

    return {
      title: event.title,
      startAt: event.startTime || event.date,
      endAt: event.endTime || undefined,
      venueName: venue.name,
      address,
      neighborhood,
      lat: null,
      lng: null,
      city,
      tags: [...new Set(tags)],
      category,
      priceLabel: event.isTicketed && priceAmount === 0 ? '$' : priceLabel,
      priceAmount,
      isOutdoor: false,
      description,
      sourceUrl: `https://ra.co${event.contentUrl}`,
      ticketUrl: event.isTicketed ? `https://ra.co${event.contentUrl}` : undefined,
      sourceName: this.name,
      image: flyer?.filename,
    };
  }

  private neighborhoodFromAddress(address: string, venueName: string): string {
    const text = `${address} ${venueName}`.toLowerCase();

    // Street / area keywords → neighborhood
    const mappings: [string[], string][] = [
      [['wynwood', 'nw 2nd ave', 'nw 23rd', 'nw 24th', 'nw 25th', 'nw 26th', 'do not sit', 'floyd', 'jolene', 'bardot'], 'Wynwood'],
      [['brickell', 'sw 8th st', 'sw 7th st', 'brickell ave', 'bayfront', 'epic', 'east hotel'], 'Brickell'],
      [['south beach', 'ocean dr', 'collins ave', 'washington ave', 'lincoln rd', 'espanola way', 'faena', 'delano', 'miami beach', 'south of 5th', 'sobe'], 'South Beach'],
      [['mid-beach', 'mid beach', 'fountainebleau', 'fontainebleau', '44th st', '46th st'], 'Mid-Beach'],
      [['downtown', 'biscayne blvd', 'brickell key', 'bayside', 'museum park', 'overtown', 'club space', 'ground', 'nc200'], 'Downtown Miami'],
      [['little havana', 'sw 8th', 'calle ocho', 'ball & chain', 'cafe la trova', 'leah & louisas', 'tower theater'], 'Little Havana'],
      [['design district', 'ne 39th', 'ne 40th', 'ne 41st', 'ne 2nd ave', 'buena vista'], 'Design District'],
      [['edgewater', 'ne 27th', 'ne 28th', 'ne 29th', 'ne 30th', 'miami norfolk'], 'Edgewater'],
      [['coconut grove', 'grand ave', 'main hwy', 'peacock park', 'coconut'], 'Coconut Grove'],
      [['little haiti', 'ne 2nd ave', 'ne 54th', 'ne 55th', 'ne 62nd', 'lagniappe', 'butter miami'], 'Little Haiti'],
      [['allapattah', 'nw 36th', 'nw 7th ave', 'rubell'], 'Allapattah'],
      [['coral gables', 'miracle mile', 'giralda', 'salzedo', 'ponce de leon'], 'Coral Gables'],
      [['fort lauderdale', 'las olas', 'broward', 'flagler village', 'wilton manors'], 'Fort Lauderdale'],
      [['sunrise', 'amerant bank arena', 'BB&T', 'sunlife'], 'Sunrise'],
    ];

    for (const [keywords, neighborhood] of mappings) {
      if (keywords.some((kw) => text.includes(kw))) {
        return neighborhood;
      }
    }

    // Default: if address has FL and not FLL area, Miami
    return text.includes('fort lauderdale') || text.includes('broward') ? 'Fort Lauderdale' : 'Miami';
  }

  private cityFromAddress(address: string): 'Miami' | 'Fort Lauderdale' | 'Palm Beach' {
    const lower = address.toLowerCase();
    if (
      lower.includes('fort lauderdale') ||
      lower.includes('lauderdale') ||
      lower.includes('broward') ||
      lower.includes('wilton manors') ||
      lower.includes('sunrise') ||
      lower.includes('hollywood, fl') ||
      lower.includes('pompano')
    ) {
      return 'Fort Lauderdale';
    }
    if (
      lower.includes('palm beach') ||
      lower.includes('boca raton') ||
      lower.includes('delray') ||
      lower.includes('boynton') ||
      lower.includes('jupiter') ||
      lower.includes('wellington')
    ) {
      return 'Palm Beach';
    }
    return 'Miami';
  }
}
