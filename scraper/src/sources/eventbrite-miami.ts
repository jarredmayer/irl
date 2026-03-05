/**
 * Eventbrite Miami Scraper
 *
 * Fetches real events from Eventbrite's destination search API.
 * Uses CSRF token flow: GET page for csrftoken cookie, then POST search API.
 *
 * Place IDs (Who's On First):
 *   85933669 = Miami
 *   85933671 = Miami Beach
 *   102085771 = Miami-Dade county
 *
 * Two-step approach:
 *  1. Search API returns event list with basic info
 *  2. Events API returns expanded details (venue, image, price)
 */

import * as https from 'https';
import { BaseScraper } from './base.js';
import type { RawEvent } from '../types.js';

// Eventbrite place IDs for South Florida
const MIAMI_PLACE_IDS = ['85933669', '85933671']; // Miami + Miami Beach

interface EBSearchEvent {
  id: string;
  name: string;
  url: string;
  summary?: string;
  start_date: string;
  start_time: string;
  end_date?: string;
  end_time?: string;
  timezone?: string;
  is_online_event?: boolean;
  is_cancelled?: boolean;
  image_id?: string;
  primary_venue_id?: string;
  tags?: Array<{
    prefix: string;
    tag: string;
    display_name: string;
  }>;
  locations?: Array<{
    type: string;
    id: string;
    name: string;
  }>;
}

interface EBDetailEvent extends EBSearchEvent {
  primary_venue?: {
    name: string;
    address: {
      city?: string;
      region?: string;
      address_1?: string;
      address_2?: string;
      latitude?: string;
      longitude?: string;
      localized_address_display?: string;
      localized_area_display?: string;
    };
  };
  image?: {
    url: string;
    image_sizes?: {
      medium?: string;
      large?: string;
    };
  };
  ticket_availability?: {
    minimum_ticket_price?: {
      major_value: string;
      value: number;
    };
    maximum_ticket_price?: {
      major_value: string;
      value: number;
    };
    is_free?: boolean;
    is_sold_out?: boolean;
  };
}

export class EventbriteMiamiScraper extends BaseScraper {
  constructor() {
    super('Eventbrite Miami', { weight: 1.3, rateLimit: 2000 });
  }

  async scrape(): Promise<RawEvent[]> {
    this.log('Fetching Eventbrite Miami events...');

    try {
      // Step 1: Get CSRF token
      const csrfToken = await this.getCsrfToken();
      if (!csrfToken) {
        this.log('Failed to get CSRF token');
        return [];
      }
      this.log(`  Got CSRF token: ${csrfToken.slice(0, 8)}...`);

      // Step 2: Search for events in Miami + Miami Beach
      const searchResults: EBSearchEvent[] = [];
      for (const placeId of MIAMI_PLACE_IDS) {
        try {
          const events = await this.searchEvents(csrfToken, placeId);
          searchResults.push(...events);
          this.log(`  Place ${placeId}: ${events.length} events`);
        } catch (e) {
          this.log(`  Place ${placeId} failed: ${e instanceof Error ? e.message : String(e)}`);
        }
        await this.sleep(1000);
      }

      if (searchResults.length === 0) {
        this.log('No events found from search API');
        return [];
      }

      // Deduplicate by event ID
      const uniqueEvents = new Map<string, EBSearchEvent>();
      for (const event of searchResults) {
        if (!uniqueEvents.has(event.id)) {
          uniqueEvents.set(event.id, event);
        }
      }
      this.log(`  ${uniqueEvents.size} unique events after dedup`);

      // Step 3: Get venue/price details for events (batch by 50)
      const eventIds = Array.from(uniqueEvents.keys());
      const detailedEvents: EBDetailEvent[] = [];

      for (let i = 0; i < eventIds.length; i += 50) {
        const batch = eventIds.slice(i, i + 50);
        try {
          const details = await this.getEventDetails(csrfToken, batch);
          detailedEvents.push(...details);
        } catch (e) {
          this.log(`  Detail batch failed: ${e instanceof Error ? e.message : String(e)}`);
          // Fall back to basic search data for this batch
          for (const id of batch) {
            const basic = uniqueEvents.get(id);
            if (basic) detailedEvents.push(basic as EBDetailEvent);
          }
        }
        await this.sleep(1000);
      }

      // Step 4: Map to RawEvent
      const rawEvents: RawEvent[] = [];
      const now = new Date();

      for (const event of detailedEvents) {
        const mapped = this.mapEvent(event, now);
        if (mapped) rawEvents.push(mapped);
      }

      this.log(`Found ${rawEvents.length} Eventbrite Miami events`);
      return rawEvents;
    } catch (e) {
      this.logError('Eventbrite scrape failed', e);
      return [];
    }
  }

  /**
   * Get CSRF token from Eventbrite homepage.
   * The token is returned as a cookie and also in a meta tag.
   */
  private async getCsrfToken(): Promise<string | null> {
    try {
      const html = await this.fetchHTMLNative('https://www.eventbrite.com', 10_000);
      // Extract CSRF token from meta tag
      const match = html.match(/name="csrf_token"\s+content="([^"]+)"/);
      if (match) return match[1];

      // Fallback: look for csrftoken in any form
      const match2 = html.match(/csrftoken['"]\s*(?:value|content)=\s*['"]([\w]+)['"]/);
      if (match2) return match2[1];

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Search Eventbrite destination API for events in a given place.
   */
  private searchEvents(csrfToken: string, placeId: string): Promise<EBSearchEvent[]> {
    const body = JSON.stringify({
      event_search: {
        dates: 'current_future',
        dedup: true,
        places: [placeId],
        page_size: 50,
        page: 1,
        online_events_only: false,
      },
      browse_surface: 'search',
    });

    return new Promise((resolve, reject) => {
      const options: https.RequestOptions = {
        hostname: 'www.eventbrite.com',
        path: '/api/v3/destination/search/',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': this.userAgent,
          'X-CSRFToken': csrfToken,
          'Cookie': `csrftoken=${csrfToken}`,
          'Referer': 'https://www.eventbrite.com/d/fl--miami/events/',
          'Content-Length': Buffer.byteLength(body),
        },
        rejectUnauthorized: true,
        minVersion: 'TLSv1.2' as any,
      };

      const req = https.request(options, (res) => {
        if (res.statusCode && res.statusCode >= 400) {
          req.destroy();
          reject(new Error(`HTTP ${res.statusCode}`));
          return;
        }
        const chunks: Buffer[] = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
          try {
            const data = JSON.parse(Buffer.concat(chunks).toString('utf-8'));
            const results = data?.events?.results || [];
            resolve(results);
          } catch {
            reject(new Error('Invalid JSON'));
          }
        });
        res.on('error', reject);
      });

      req.setTimeout(15_000, () => {
        req.destroy();
        reject(new Error('Request timed out'));
      });
      req.on('error', reject);
      req.write(body);
      req.end();
    });
  }

  /**
   * Get expanded event details (venue, image, price) from Eventbrite.
   */
  private getEventDetails(csrfToken: string, eventIds: string[]): Promise<EBDetailEvent[]> {
    const idsParam = eventIds.join(',');
    const path = `/api/v3/destination/events/?event_ids=${idsParam}&expand=primary_venue,image,ticket_availability`;

    return new Promise((resolve, reject) => {
      const options: https.RequestOptions = {
        hostname: 'www.eventbrite.com',
        path,
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': this.userAgent,
          'X-CSRFToken': csrfToken,
          'Cookie': `csrftoken=${csrfToken}`,
          'Referer': 'https://www.eventbrite.com/d/fl--miami/events/',
        },
        rejectUnauthorized: true,
        minVersion: 'TLSv1.2' as any,
      };

      const req = https.request(options, (res) => {
        if (res.statusCode && res.statusCode >= 400) {
          req.destroy();
          reject(new Error(`HTTP ${res.statusCode}`));
          return;
        }
        const chunks: Buffer[] = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
          try {
            const data = JSON.parse(Buffer.concat(chunks).toString('utf-8'));
            resolve(data?.events || []);
          } catch {
            reject(new Error('Invalid JSON'));
          }
        });
        res.on('error', reject);
      });

      req.setTimeout(15_000, () => {
        req.destroy();
        reject(new Error('Request timed out'));
      });
      req.on('error', reject);
      req.end();
    });
  }

  private mapEvent(event: EBDetailEvent, now: Date): RawEvent | null {
    // Skip online-only and cancelled events
    if (event.is_online_event || event.is_cancelled) return null;

    const title = (event.name || '').trim();
    if (!title || title.length < 3) return null;

    // Parse date/time
    const startAt = `${event.start_date}T${event.start_time || '19:00'}:00`;
    if (new Date(startAt) < now) return null;

    const endAt = event.end_date && event.end_time
      ? `${event.end_date}T${event.end_time}:00`
      : undefined;

    // Venue info
    const venue = event.primary_venue;
    const venueName = venue?.name || undefined;
    const address = venue?.address?.localized_address_display || undefined;
    const lat = venue?.address?.latitude ? parseFloat(venue.address.latitude) : null;
    const lng = venue?.address?.longitude ? parseFloat(venue.address.longitude) : null;

    // City and neighborhood
    const city = this.resolveCity(event);
    const neighborhood = this.resolveNeighborhood(event);

    // Price
    const ticketInfo = event.ticket_availability;
    let priceLabel: 'Free' | '$' | '$$' | '$$$' = '$';
    let priceAmount = 0;
    if (ticketInfo?.is_free) {
      priceLabel = 'Free';
      priceAmount = 0;
    } else if (ticketInfo?.minimum_ticket_price) {
      priceAmount = Math.round(ticketInfo.minimum_ticket_price.value / 100);
      if (priceAmount === 0) priceLabel = 'Free';
      else if (priceAmount <= 25) priceLabel = '$';
      else if (priceAmount <= 75) priceLabel = '$$';
      else priceLabel = '$$$';
    }

    // Image
    const image = event.image?.image_sizes?.medium || event.image?.url || undefined;

    // Category and tags
    const description = event.summary || '';
    const ebCategory = this.getEventbriteCategory(event);
    const category = this.categorize(title, description, venueName || '');
    const tags = this.generateTags(title, description, category);

    // Add Eventbrite category tags
    if (ebCategory && !tags.includes(ebCategory.toLowerCase())) {
      tags.push(ebCategory.toLowerCase().replace(/\s+/g, '-'));
    }

    return {
      title,
      startAt,
      endAt,
      venueName,
      address,
      neighborhood,
      lat,
      lng,
      city,
      tags: tags.slice(0, 5),
      category,
      priceLabel,
      priceAmount,
      isOutdoor: this.isOutdoor(title, description, venueName || ''),
      description: description || `${title} — via Eventbrite`,
      sourceUrl: event.url || `https://www.eventbrite.com/e/${event.id}`,
      sourceName: this.name,
      ticketUrl: event.url || undefined,
      image,
    };
  }

  private resolveCity(event: EBDetailEvent): 'Miami' | 'Fort Lauderdale' | 'Palm Beach' {
    const locations = event.locations || [];
    const venueCity = event.primary_venue?.address?.city || '';
    const text = `${venueCity} ${locations.map(l => l.name).join(' ')}`.toLowerCase();

    if (/fort lauderdale|hollywood|dania|pompano|davie|plantation|sunrise|pembroke|hallandale|wilton manors/.test(text)) {
      return 'Fort Lauderdale';
    }
    if (/palm beach|boca raton|delray|boynton|jupiter|lake worth/.test(text)) {
      return 'Palm Beach';
    }
    return 'Miami';
  }

  private resolveNeighborhood(event: EBDetailEvent): string {
    // Check Eventbrite's location data for neighborhood
    const locations = event.locations || [];
    for (const loc of locations) {
      if (loc.type === 'neighbourhood') {
        return loc.name;
      }
    }

    // Infer from venue address
    const address = event.primary_venue?.address?.localized_address_display || '';
    const text = address.toLowerCase();
    if (/wynwood/.test(text)) return 'Wynwood';
    if (/brickell/.test(text)) return 'Brickell';
    if (/south beach|ocean dr|collins ave/.test(text)) return 'South Beach';
    if (/design district/.test(text)) return 'Design District';
    if (/little havana|calle ocho/.test(text)) return 'Little Havana';
    if (/coconut grove/.test(text)) return 'Coconut Grove';
    if (/coral gables/.test(text)) return 'Coral Gables';
    if (/downtown/.test(text)) return 'Downtown Miami';
    if (/miami beach/.test(text)) return 'Miami Beach';
    if (/edgewater/.test(text)) return 'Edgewater';
    if (/midtown/.test(text)) return 'Midtown';

    return 'Miami';
  }

  private getEventbriteCategory(event: EBDetailEvent): string | null {
    const tags = event.tags || [];
    for (const tag of tags) {
      if (tag.prefix === 'EventbriteCategory') {
        return tag.display_name;
      }
    }
    return null;
  }
}
