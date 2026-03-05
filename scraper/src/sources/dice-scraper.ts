/**
 * Dice.fm Real Scraper
 *
 * Switched from Puppeteer to fetch-based scraper (2026-03-05).
 * The Puppeteer version failed because Chrome binary wasn't available in CI.
 *
 * Approach: Fetch the Dice.fm Miami browse page and extract event data from
 * the __NEXT_DATA__ JSON embedded in the HTML (Next.js SSR).
 * Fallback: Parse JSON-LD structured data from the page.
 */

import { BaseScraper } from './base.js';
import type { RawEvent } from '../types.js';
import { findVenue } from '../venues.js';

interface DiceEventData {
  name?: string;
  title?: string;
  date?: string;
  start_date?: string;
  startDate?: string;
  end_date?: string;
  endDate?: string;
  venue?: string | { name?: string; address?: string; city?: string };
  location?: string | { name?: string; address?: string };
  url?: string;
  event_url?: string;
  slug?: string;
  image_url?: string;
  image?: string | { url?: string };
  price?: string | number;
  raw_price?: number;
  currency?: string;
  lineup?: Array<{ name?: string }>;
  artists?: Array<{ name?: string }>;
  genre?: string;
  genres?: string[];
  type?: string;
}

export class DiceRealScraper extends BaseScraper {
  private browseUrl = 'https://dice.fm/browse/miami-5e3bf1b0fe75488ec46cdf9f';

  constructor() {
    super('Dice.fm Real', { weight: 1.5, rateLimit: 2000 });
  }

  async scrape(): Promise<RawEvent[]> {
    this.log('Fetching Dice.fm Miami events (fetch-based)...');
    const events: RawEvent[] = [];

    try {
      const response = await this.fetch(this.browseUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
        },
      });
      const html = await response.text();

      // Strategy 1: Extract __NEXT_DATA__ JSON from the page
      const nextDataMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>(.*?)<\/script>/s);
      if (nextDataMatch) {
        try {
          const nextData = JSON.parse(nextDataMatch[1]);
          const extracted = this.extractFromNextData(nextData);
          events.push(...extracted);
          this.log(`  __NEXT_DATA__: found ${extracted.length} events`);
        } catch (e) {
          this.log(`  __NEXT_DATA__ parse failed: ${e instanceof Error ? e.message : String(e)}`);
        }
      }

      // Strategy 2: Extract JSON-LD structured data
      if (events.length === 0) {
        const jsonLdMatches = html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs);
        for (const match of jsonLdMatches) {
          try {
            const data = JSON.parse(match[1]);
            const extracted = this.extractFromJsonLd(data);
            events.push(...extracted);
          } catch { /* skip invalid JSON-LD */ }
        }
        if (events.length > 0) {
          this.log(`  JSON-LD: found ${events.length} events`);
        }
      }

      // Strategy 3: Extract event links and basic info from HTML
      if (events.length === 0) {
        const linkPattern = /href="(\/event\/[^"]+)"[^>]*>([^<]*)</g;
        let linkMatch;
        const seen = new Set<string>();
        while ((linkMatch = linkPattern.exec(html)) !== null) {
          const [, path, text] = linkMatch;
          if (seen.has(path)) continue;
          seen.add(path);

          const title = text.trim();
          if (!title || title.length < 3) continue;

          events.push({
            title,
            startAt: this.getDefaultDate(),
            venueName: 'Miami Venue',
            neighborhood: 'Miami',
            city: 'Miami',
            tags: ['live-music', 'nightlife'],
            category: 'Music',
            isOutdoor: false,
            description: `${title} — Get tickets on Dice.fm.`,
            sourceUrl: `https://dice.fm${path}`,
            sourceName: this.name,
            ticketUrl: `https://dice.fm${path}`,
          });
        }
        if (events.length > 0) {
          this.log(`  HTML links: found ${events.length} events`);
        }
      }
    } catch (error) {
      this.logError('Failed to fetch Dice.fm', error);
    }

    this.log(`Found ${events.length} Dice.fm events`);
    return events;
  }

  private extractFromNextData(data: any): RawEvent[] {
    const events: RawEvent[] = [];
    const now = new Date();

    // Navigate the Next.js data structure to find events
    // Common paths: props.pageProps.events, props.pageProps.initialData.events
    const possiblePaths = [
      data?.props?.pageProps?.events,
      data?.props?.pageProps?.initialData?.events,
      data?.props?.pageProps?.data?.events,
      data?.props?.pageProps?.eventListings,
      data?.props?.pageProps?.initialData?.data,
    ];

    let eventList: DiceEventData[] = [];
    for (const path of possiblePaths) {
      if (Array.isArray(path) && path.length > 0) {
        eventList = path;
        break;
      }
    }

    // Also try to find events in deeply nested structures
    if (eventList.length === 0) {
      eventList = this.findEventsDeep(data);
    }

    for (const item of eventList) {
      const event = this.mapDiceEvent(item, now);
      if (event) events.push(event);
    }

    return events;
  }

  private findEventsDeep(obj: any, depth = 0): DiceEventData[] {
    if (depth > 6 || !obj || typeof obj !== 'object') return [];

    // If this looks like an event array, return it
    if (Array.isArray(obj)) {
      if (obj.length > 0 && obj[0] && (obj[0].name || obj[0].title) && (obj[0].date || obj[0].start_date || obj[0].startDate)) {
        return obj;
      }
      // Search each element
      for (const item of obj.slice(0, 5)) {
        const found = this.findEventsDeep(item, depth + 1);
        if (found.length > 0) return found;
      }
      return [];
    }

    // Search object properties
    for (const key of Object.keys(obj)) {
      if (/events?|listings?|data|results/i.test(key)) {
        const found = this.findEventsDeep(obj[key], depth + 1);
        if (found.length > 0) return found;
      }
    }

    return [];
  }

  private extractFromJsonLd(data: any): RawEvent[] {
    const events: RawEvent[] = [];
    const now = new Date();

    const items = Array.isArray(data) ? data : [data];
    for (const item of items) {
      if (item['@type'] === 'Event' || item['@type'] === 'MusicEvent') {
        const event = this.mapDiceEvent({
          name: item.name,
          date: item.startDate,
          end_date: item.endDate,
          venue: typeof item.location === 'object' ? item.location?.name : item.location,
          url: item.url,
          image: typeof item.image === 'string' ? item.image : item.image?.url,
          price: item.offers?.price,
        }, now);
        if (event) events.push(event);
      }
      // ItemList of events
      if (item['@type'] === 'ItemList' && Array.isArray(item.itemListElement)) {
        for (const listItem of item.itemListElement) {
          const innerItem = listItem.item || listItem;
          if (innerItem.name && (innerItem.startDate || innerItem.url)) {
            const event = this.mapDiceEvent({
              name: innerItem.name,
              date: innerItem.startDate,
              venue: typeof innerItem.location === 'object' ? innerItem.location?.name : innerItem.location,
              url: innerItem.url,
              image: typeof innerItem.image === 'string' ? innerItem.image : innerItem.image?.url,
              price: innerItem.offers?.price,
            }, now);
            if (event) events.push(event);
          }
        }
      }
    }

    return events;
  }

  private mapDiceEvent(item: DiceEventData, now: Date): RawEvent | null {
    const title = item.name || item.title;
    if (!title || title.length < 3) return null;

    // Parse date
    const dateStr = item.date || item.start_date || item.startDate;
    const startAt = dateStr ? this.parseDate(dateStr) : null;
    if (!startAt) return null;
    if (new Date(startAt) < now) return null;

    // Parse venue
    let venueName = 'Miami Venue';
    let address: string | undefined;
    if (typeof item.venue === 'object' && item.venue) {
      venueName = item.venue.name || venueName;
      address = item.venue.address;
    } else if (typeof item.venue === 'string') {
      venueName = item.venue;
    } else if (typeof item.location === 'object' && item.location) {
      venueName = item.location.name || venueName;
      address = item.location.address;
    } else if (typeof item.location === 'string') {
      venueName = item.location;
    }

    // Find venue in database
    const knownVenue = findVenue(venueName);

    // Parse price
    const price = this.parsePriceAmount(item.price);

    // Build URL
    let sourceUrl = item.url || item.event_url || '';
    if (item.slug && !sourceUrl) {
      sourceUrl = `https://dice.fm/event/${item.slug}`;
    }
    if (sourceUrl && !sourceUrl.startsWith('http')) {
      sourceUrl = `https://dice.fm${sourceUrl}`;
    }

    // Parse image
    let image: string | undefined;
    if (typeof item.image === 'string') image = item.image;
    else if (typeof item.image === 'object' && item.image?.url) image = item.image.url;
    if (!image) image = item.image_url;

    // Lineup
    const lineup = (item.lineup || item.artists || [])
      .map((a) => a.name)
      .filter(Boolean)
      .join(', ');

    const endAt = item.end_date || item.endDate;

    return {
      title,
      startAt,
      endAt: endAt ? this.parseDate(endAt) || undefined : undefined,
      venueName: knownVenue?.name || venueName,
      address: knownVenue?.address || address,
      neighborhood: knownVenue?.neighborhood || this.inferNeighborhood(venueName),
      lat: knownVenue?.lat,
      lng: knownVenue?.lng,
      city: 'Miami',
      tags: ['live-music', 'nightlife', ...(knownVenue?.vibeTags?.slice(0, 2) || [])],
      category: 'Music',
      priceLabel: price === 0 ? 'Free' : price > 50 ? '$$' : '$',
      priceAmount: price,
      isOutdoor: false,
      description: lineup
        ? `${title} ft. ${lineup} at ${venueName}. Get tickets on Dice.fm.`
        : `${title} at ${venueName}. Get tickets on Dice.fm.`,
      sourceUrl: sourceUrl || this.browseUrl,
      sourceName: this.name,
      image,
      ticketUrl: sourceUrl || undefined,
      recurring: false,
    };
  }

  private parseDate(dateStr: string): string | null {
    if (!dateStr) return null;
    const now = new Date();
    const currentYear = now.getFullYear();

    // ISO format: "2026-03-15T21:00:00" or "2026-03-15T21:00:00Z"
    if (/^\d{4}-\d{2}-\d{2}T/.test(dateStr)) {
      return dateStr.replace('Z', '').replace(/\.\d+$/, '');
    }

    // ISO date only: "2026-03-15"
    const isoMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (isoMatch) {
      return `${isoMatch[0]}T21:00:00`;
    }

    const lower = dateStr.toLowerCase();

    if (lower.includes('tonight') || lower.includes('today')) {
      return `${now.toISOString().slice(0, 10)}T21:00:00`;
    }

    if (lower.includes('tomorrow')) {
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return `${tomorrow.toISOString().slice(0, 10)}T21:00:00`;
    }

    // "Sat 25 Jan" or "25 Jan" format
    const dayMonthMatch = dateStr.match(/(\d{1,2})\s*(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i);
    if (dayMonthMatch) {
      const day = parseInt(dayMonthMatch[1], 10);
      const monthStr = dayMonthMatch[2].toLowerCase();
      const months: Record<string, number> = {
        jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
        jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
      };
      const month = months[monthStr];

      if (month !== undefined) {
        let year = currentYear;
        if (month < now.getMonth()) year = currentYear + 1;
        const date = new Date(year, month, day);
        return `${date.toISOString().slice(0, 10)}T21:00:00`;
      }
    }

    // "March 15, 2026" format
    const fullDateMatch = dateStr.match(/(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2}),?\s*(\d{4})?/i);
    if (fullDateMatch) {
      const monthMap: Record<string, string> = {
        january: '01', february: '02', march: '03', april: '04', may: '05', june: '06',
        july: '07', august: '08', september: '09', october: '10', november: '11', december: '12',
      };
      const month = monthMap[fullDateMatch[1].toLowerCase()];
      if (month) {
        const day = fullDateMatch[2].padStart(2, '0');
        const year = fullDateMatch[3] || currentYear;
        return `${year}-${month}-${day}T21:00:00`;
      }
    }

    return null;
  }

  private parsePriceAmount(price: string | number | undefined): number {
    if (price === undefined || price === null) return 0;
    if (typeof price === 'number') return price;

    const lower = price.toLowerCase();
    if (lower.includes('free') || lower.includes('rsvp')) return 0;

    const match = price.match(/\$?\s*(\d+(?:\.\d{2})?)/);
    if (match) return parseFloat(match[1]);

    return 20; // Default estimate for Dice events
  }

  private inferNeighborhood(venue: string): string {
    const v = venue.toLowerCase();
    if (v.includes('wynwood') || v.includes('do not sit') || v.includes('bardot')) return 'Wynwood';
    if (v.includes('space') || v.includes('ground') || v.includes('club space')) return 'Downtown Miami';
    if (v.includes('floyd') || v.includes('jolene')) return 'Edgewater';
    if (v.includes('beach') || v.includes('faena') || v.includes('edition')) return 'South Beach';
    if (v.includes('brickell')) return 'Brickell';
    if (v.includes('little havana') || v.includes('ball & chain')) return 'Little Havana';
    return 'Miami';
  }

  private getDefaultDate(): string {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return `${d.toISOString().slice(0, 10)}T21:00:00`;
  }
}
