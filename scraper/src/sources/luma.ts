/**
 * Luma (lu.ma) Event Scraper
 *
 * Fetches events from Luma's Miami and Fort Lauderdale pages.
 * Luma is a Next.js app — event data is embedded in __NEXT_DATA__ JSON.
 *
 * Pre-filters out tech/startup/crypto events BEFORE CurationAgent scoring
 * (saves LLM cost). Hard-filters IN music, art, food, fitness, and cultural events.
 *
 * All events tagged with source: 'luma' for monitoring.
 */

import { BaseScraper } from './base.js';
import type { RawEvent } from '../types.js';

// Pre-filter: exclude tech/startup/crypto events (saves LLM curation cost)
const EXCLUDE_TITLE_PATTERNS = /\b(AI|Web3|crypto|blockchain|NFT|VC|startup|pitch|investor|SaaS|hackathon|tech meetup|networking happy hour|accelerator|fundrais|series [A-C]|seed round|token|DeFi|fintech|devops|kubernetes|AWS|cloud computing)\b/i;

const EXCLUDE_CATEGORIES = new Set([
  'business', 'technology', 'networking', 'tech', 'startup',
  'venture capital', 'cryptocurrency', 'blockchain',
]);

// Hard-filter IN: always pass through regardless of other signals
const INCLUDE_PATTERNS = /\b(concert|live music|dj set|gallery opening|art (show|walk|opening|exhibit)|film screening|book reading|poetry|chef dinner|wine tasting|pop-up|yoga|run club|salsa|mambo|jazz|blues|comedy|improv|theater|dance|drum circle|sound bath|meditation)\b/i;

// Known cultural venue keywords that signal IRL-relevant events
const CULTURAL_VENUE_KEYWORDS = /wynwood|brickell|little havana|little haiti|overtown|allapattah|coconut grove|design district|south beach|edgewater|midtown|coral gables|flagler village|lake worth/i;

interface LumaEventRaw {
  api_id?: string;
  name?: string;
  title?: string;
  start_at?: string;
  startAt?: string;
  end_at?: string;
  endAt?: string;
  cover_url?: string;
  coverUrl?: string;
  event_url?: string;
  url?: string;
  slug?: string;
  geo_address_json?: {
    full_address?: string;
    city?: string;
    region?: string;
    place_id?: string;
    description?: string;
    latitude?: number;
    longitude?: number;
  };
  location?: {
    address?: string;
    city?: string;
    lat?: number;
    lng?: number;
  };
  geo_latitude?: number;
  geo_longitude?: number;
  ticket_cost_cents?: number;
  cost?: number;
  category?: string;
  tags?: string[];
  description?: string;
  summary?: string;
  timezone?: string;
}

export class LumaScraper extends BaseScraper {
  private pages = [
    { url: 'https://lu.ma/miami', label: 'Miami' },
    { url: 'https://lu.ma/fort-lauderdale', label: 'Fort Lauderdale' },
    { url: 'https://lu.ma/fortlauderdale', label: 'Fort Lauderdale (alt)' },
  ];

  constructor() {
    super('Luma', { weight: 1.2, rateLimit: 2000 });
  }

  async scrape(): Promise<RawEvent[]> {
    this.log('Fetching Luma events for Miami/FLL...');
    const allEvents: RawEvent[] = [];
    const seen = new Set<string>();

    // Strategy 1: Try Luma's discover API (most reliable)
    try {
      const apiEvents = await this.scrapeFromApi();
      for (const event of apiEvents) {
        const key = `${event.title}|${event.startAt}`;
        if (!seen.has(key)) {
          seen.add(key);
          allEvents.push(event);
        }
      }
      if (allEvents.length > 0) {
        this.log(`Found ${allEvents.length} Luma events from API (after curation filter)`);
        return allEvents;
      }
    } catch (e) {
      this.log(`  Luma API failed: ${e instanceof Error ? e.message : String(e)}`);
    }

    // Strategy 2: Scrape HTML pages (fallback)
    for (const page of this.pages) {
      try {
        const events = await this.scrapeLumaPage(page.url, page.label);
        for (const event of events) {
          const key = `${event.title}|${event.startAt}`;
          if (!seen.has(key)) {
            seen.add(key);
            allEvents.push(event);
          }
        }
      } catch (e) {
        this.log(`  ${page.label} failed: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    this.log(`Found ${allEvents.length} Luma events (after curation filter)`);
    return allEvents;
  }

  /**
   * Fetch events from Luma's public API.
   * Luma exposes discover/calendar endpoints that return JSON event data.
   */
  private async scrapeFromApi(): Promise<RawEvent[]> {
    const apiUrls = [
      'https://api.lu.ma/public/v2/event/get-events-for-calendar?calendar_api_id=cal-miami&period=future&pagination_limit=100',
      'https://api.lu.ma/public/v1/calendar/get-items?calendar_api_id=cal-miami&period=future&pagination_limit=100',
    ];

    for (const apiUrl of apiUrls) {
      try {
        this.log(`  Trying Luma API: ${apiUrl.slice(0, 70)}...`);
        const data = await this.fetchJSON<any>(apiUrl);

        // Extract entries from API response
        const entries = data?.entries || data?.events || data?.data || [];
        if (!Array.isArray(entries) || entries.length === 0) continue;

        const events: RawEvent[] = [];
        const now = new Date();
        let filtered = 0;

        for (const entry of entries) {
          const raw: LumaEventRaw = entry.event || entry;
          if (!this.passesPreFilter(raw)) {
            filtered++;
            continue;
          }
          const event = this.mapEvent(raw, now);
          if (event) events.push(event);
        }

        if (filtered > 0) {
          this.log(`  API: filtered out ${filtered} tech/startup events`);
        }

        if (events.length > 0) return events;
      } catch {
        continue;
      }
    }

    return [];
  }

  private async scrapeLumaPage(url: string, label: string): Promise<RawEvent[]> {
    // Use native fetch for DNS fallback in CI
    let html: string;
    try {
      html = await this.fetchHTMLNative(url, 15_000);
    } catch {
      // Fallback to undici fetch
      const response = await this.fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      });
      html = await response.text();
    }

    // Extract __NEXT_DATA__ JSON
    const nextDataMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>(.*?)<\/script>/s);
    if (!nextDataMatch) {
      // Also try RSC payload or inline JSON
      const rscMatch = html.match(/self\.__next_f\.push\(\[1,"(.+?)"\]\)/s);
      if (rscMatch) {
        this.log(`  ${label}: found RSC payload, attempting parse...`);
        // RSC payloads are harder to parse — skip for now
      }
      this.log(`  ${label}: no __NEXT_DATA__ found`);
      return [];
    }

    let nextData: any;
    try {
      nextData = JSON.parse(nextDataMatch[1]);
    } catch {
      this.log(`  ${label}: __NEXT_DATA__ parse failed`);
      return [];
    }

    // Navigate the Next.js data structure to find events
    const rawEvents = this.findEvents(nextData);
    this.log(`  ${label}: found ${rawEvents.length} raw events`);

    // Apply pre-filter and map to RawEvent
    const events: RawEvent[] = [];
    const now = new Date();
    let filtered = 0;

    for (const raw of rawEvents) {
      if (!this.passesPreFilter(raw)) {
        filtered++;
        continue;
      }

      const event = this.mapEvent(raw, now);
      if (event) events.push(event);
    }

    if (filtered > 0) {
      this.log(`  ${label}: filtered out ${filtered} tech/startup events`);
    }

    return events;
  }

  private findEvents(data: any): LumaEventRaw[] {
    // Common paths in Luma's Next.js data
    const possiblePaths = [
      data?.props?.pageProps?.events,
      data?.props?.pageProps?.initialData?.events,
      data?.props?.pageProps?.data?.events,
      data?.props?.pageProps?.calendar?.events,
      data?.props?.pageProps?.entries,
      data?.props?.pageProps?.initialData?.entries,
    ];

    for (const path of possiblePaths) {
      if (Array.isArray(path) && path.length > 0) {
        // Some paths wrap events in { event: {...} } objects
        return path.map((item: any) => item.event || item);
      }
    }

    // Deep search
    return this.findEventsDeep(data);
  }

  private findEventsDeep(obj: any, depth = 0): LumaEventRaw[] {
    if (depth > 5 || !obj || typeof obj !== 'object') return [];

    if (Array.isArray(obj)) {
      if (obj.length > 2 && obj[0] && (obj[0].name || obj[0].title) && (obj[0].start_at || obj[0].startAt)) {
        return obj;
      }
      for (const item of obj.slice(0, 5)) {
        const found = this.findEventsDeep(item, depth + 1);
        if (found.length > 0) return found;
      }
      return [];
    }

    for (const key of Object.keys(obj)) {
      if (/events?|entries|listings?|data|results/i.test(key)) {
        const found = this.findEventsDeep(obj[key], depth + 1);
        if (found.length > 0) return found;
      }
    }

    return [];
  }

  /**
   * Pre-filter BEFORE CurationAgent to save LLM cost.
   * Returns true if the event should be included.
   */
  private passesPreFilter(raw: LumaEventRaw): boolean {
    const title = (raw.name || raw.title || '').trim();
    const desc = (raw.description || raw.summary || '').trim();
    const category = (raw.category || '').trim().toLowerCase();
    const allText = `${title} ${desc}`;

    // Hard-filter IN: always pass cultural events
    if (INCLUDE_PATTERNS.test(allText)) return true;

    // Hard-filter IN: events at known cultural venues
    const address = raw.geo_address_json?.full_address || raw.location?.address || '';
    if (CULTURAL_VENUE_KEYWORDS.test(`${address} ${title}`)) return true;

    // Hard-filter OUT: tech/startup/crypto
    if (EXCLUDE_TITLE_PATTERNS.test(title)) return false;
    if (EXCLUDE_CATEGORIES.has(category)) return false;

    // Check tags
    const tags = raw.tags || [];
    for (const tag of tags) {
      if (EXCLUDE_CATEGORIES.has(tag.toLowerCase())) return false;
    }

    // Default: include (let CurationAgent score it)
    return true;
  }

  private mapEvent(raw: LumaEventRaw, now: Date): RawEvent | null {
    const title = (raw.name || raw.title || '').trim();
    if (!title || title.length < 3) return null;

    // Parse date
    const dateStr = raw.start_at || raw.startAt;
    if (!dateStr) return null;

    const startAt = this.parseISODate(dateStr);
    if (!startAt || new Date(startAt) < now) return null;

    const endAt = raw.end_at || raw.endAt;

    // Parse location
    const geo = raw.geo_address_json;
    const loc = raw.location;
    const address = geo?.full_address || loc?.address;
    const lat = geo?.latitude || raw.geo_latitude || loc?.lat;
    const lng = geo?.longitude || raw.geo_longitude || loc?.lng;
    const cityRaw = geo?.city || loc?.city || '';

    // Determine city
    const city = this.resolveCity(cityRaw, address || '');
    const neighborhood = this.resolveNeighborhood(address || '', title);

    // Parse price
    const priceCents = raw.ticket_cost_cents || (raw.cost ? raw.cost * 100 : 0);
    const priceAmount = Math.round(priceCents / 100);
    const priceLabel = priceAmount === 0 ? 'Free' as const
      : priceAmount <= 25 ? '$' as const
      : priceAmount <= 75 ? '$$' as const
      : '$$$' as const;

    // Categorize
    const desc = raw.description || raw.summary || '';
    const category = this.categorize(title, desc);
    const tags = this.generateTags(title, desc, category);

    // Image
    const image = raw.cover_url || raw.coverUrl;

    // Build URL
    let sourceUrl = raw.event_url || raw.url || '';
    if (raw.slug && !sourceUrl) {
      sourceUrl = `https://lu.ma/${raw.slug}`;
    }
    if (sourceUrl && !sourceUrl.startsWith('http')) {
      sourceUrl = `https://lu.ma${sourceUrl}`;
    }

    return {
      title,
      startAt,
      endAt: endAt ? this.parseISODate(endAt) || undefined : undefined,
      venueName: geo?.description || undefined,
      address,
      neighborhood,
      lat: lat || null,
      lng: lng || null,
      city,
      tags: tags.slice(0, 5),
      category,
      priceLabel,
      priceAmount,
      isOutdoor: this.isOutdoor(title, desc),
      description: desc ? `${desc.slice(0, 300)}` : `${title} — via Luma`,
      sourceUrl: sourceUrl || 'https://lu.ma/miami',
      sourceName: this.name,
      image,
      ticketUrl: sourceUrl || undefined,
    };
  }

  private parseISODate(dateStr: string): string | null {
    if (!dateStr) return null;
    // Handle ISO format: "2026-03-15T21:00:00.000Z" or "2026-03-15T21:00:00"
    if (/^\d{4}-\d{2}-\d{2}T/.test(dateStr)) {
      return dateStr.replace('Z', '').replace(/\.\d+$/, '');
    }
    // Handle date-only: "2026-03-15"
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return `${dateStr}T19:00:00`;
    }
    return null;
  }

  private resolveCity(city: string, address: string): 'Miami' | 'Fort Lauderdale' | 'Palm Beach' {
    const text = `${city} ${address}`.toLowerCase();
    if (/fort lauderdale|hollywood|dania|pompano|davie|plantation|sunrise|weston|pembroke|hallandale|deerfield|wilton manors|oakland park/i.test(text)) {
      return 'Fort Lauderdale';
    }
    if (/palm beach|boca raton|delray|boynton|jupiter|wellington|lake worth/i.test(text)) {
      return 'Palm Beach';
    }
    return 'Miami';
  }

  private resolveNeighborhood(address: string, title: string): string {
    const text = `${address} ${title}`.toLowerCase();
    if (/wynwood/.test(text)) return 'Wynwood';
    if (/brickell/.test(text)) return 'Brickell';
    if (/south beach|ocean dr|collins ave/.test(text)) return 'South Beach';
    if (/design district/.test(text)) return 'Design District';
    if (/little havana|calle ocho/.test(text)) return 'Little Havana';
    if (/coconut grove/.test(text)) return 'Coconut Grove';
    if (/coral gables/.test(text)) return 'Coral Gables';
    if (/downtown|biscayne/.test(text)) return 'Downtown Miami';
    if (/little haiti/.test(text)) return 'Little Haiti';
    if (/edgewater/.test(text)) return 'Edgewater';
    if (/midtown/.test(text)) return 'Midtown';
    if (/overtown/.test(text)) return 'Overtown';
    if (/allapattah/.test(text)) return 'Allapattah';
    if (/fort lauderdale|flagler village/.test(text)) return 'Fort Lauderdale';
    return 'Miami';
  }
}
