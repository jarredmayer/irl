/**
 * Club Space Miami Scraper
 *
 * Fetches real events from Club Space (clubspace.com) via the Dice.fm
 * partners widget API.
 *
 * Club Space embeds a Dice event list widget on their /events page with:
 *   - API Key: extracted from the widget init on clubspace.com/events
 *   - Promoter: "Space Invaders LLC dba Club Space, Floyd, The Ground"
 *   - Endpoint: https://partners-endpoint.dice.fm/api/v2/events
 *
 * The API returns real upcoming events with full details:
 * artists, venue, ticket prices, images, dates, and descriptions.
 *
 * Covers three venues under the Club Space umbrella:
 *   - Club Space (terrace) — 34 NE 11th St, Miami
 *   - The Ground Miami — same complex
 *   - Floyd Miami — same complex
 */

import * as https from 'https';
import { BaseScraper } from './base.js';
import type { RawEvent } from '../types.js';

interface DiceTicketType {
  id: number;
  name: string;
  price: {
    total: number;
    fees: number;
    face_value: number;
  };
  sold_out: boolean;
}

interface DiceArtist {
  headliner: boolean;
  id: number;
  name: string;
  url?: string;
}

interface DiceEvent {
  id: string;
  perm_name?: string;
  name?: string;
  venue: string;
  date: string;
  date_end?: string;
  timezone?: string;
  description?: string;
  url: string;
  external_url?: string;
  status?: string;
  sold_out: boolean;
  price?: number | null;
  currency?: string;
  ticket_types?: DiceTicketType[];
  artists?: string[];
  detailed_artists?: DiceArtist[];
  event_images?: {
    square?: string;
    landscape?: string;
    portrait?: string;
  };
  tags?: string[];
  genre_tags?: string[];
  type_tags?: string[];
  age_limit?: string;
  cities?: Array<{ name: string; code: string }>;
  presented_by?: string;
  promoters?: Array<{ id: number; name: string }>;
  flags?: string[];
}

export class ClubSpaceScraper extends BaseScraper {
  private readonly apiUrl = 'https://partners-endpoint.dice.fm/api/v2/events';
  private readonly promoterFilter = 'Space Invaders LLC dba Club Space, Floyd, The Ground';

  // Club Space complex coordinates
  private readonly venueCoords = {
    lat: 25.7851,
    lng: -80.1917,
    address: '34 NE 11th St, Miami, FL 33132',
    neighborhood: 'Downtown Miami',
  };

  constructor() {
    super('Club Space', { weight: 1.5, rateLimit: 2000 });
  }

  async scrape(): Promise<RawEvent[]> {
    this.log('Fetching Club Space events via Dice.fm partners API...');

    try {
      // Step 1: Get the API key from Club Space's events page
      const apiKey = await this.getApiKey();
      if (!apiKey) {
        this.log('Failed to extract Dice API key from Club Space');
        return [];
      }
      this.log(`  Got API key: ${apiKey.slice(0, 8)}...`);

      // Step 2: Fetch events from Dice partners API
      const diceEvents = await this.fetchDiceEvents(apiKey);
      this.log(`  Got ${diceEvents.length} events from Dice API`);

      if (diceEvents.length === 0) return [];

      // Step 3: Map to RawEvent
      const rawEvents: RawEvent[] = [];
      const now = new Date();

      for (const event of diceEvents) {
        const mapped = this.mapEvent(event, now);
        if (mapped) rawEvents.push(mapped);
      }

      this.log(`Found ${rawEvents.length} Club Space events`);
      return rawEvents;
    } catch (e) {
      this.logError('Club Space scrape failed', e);
      return [];
    }
  }

  /**
   * Extract the Dice widget API key from Club Space's events page.
   */
  private async getApiKey(): Promise<string | null> {
    try {
      const html = await this.fetchHTMLNative('https://www.clubspace.com/events', 15_000);
      // Look for DiceEventListWidget.create({...apiKey:"..."...})
      const match = html.match(/apiKey[\\"]?\s*:\s*[\\"]([A-Za-z0-9]+)[\\"]/) ||
                    html.match(/apiKey&quot;:&quot;([A-Za-z0-9]+)&quot;/);
      if (match) return match[1];

      // Fallback: known API key (may change if widget is reconfigured)
      this.log('  Using fallback API key');
      return 'HO06hnvmTb3SvghxH9be27G7mOayD413XOijiis5';
    } catch (e) {
      this.log(`  Failed to fetch Club Space page: ${e instanceof Error ? e.message : String(e)}`);
      // Use fallback key
      return 'HO06hnvmTb3SvghxH9be27G7mOayD413XOijiis5';
    }
  }

  /**
   * Fetch events from Dice.fm partners API.
   */
  private fetchDiceEvents(apiKey: string): Promise<DiceEvent[]> {
    const params = new URLSearchParams({
      'page[size]': '40',
      'types': 'linkout,event',
      'filter[promoter_name]': this.promoterFilter,
    });
    const url = `${this.apiUrl}?${params.toString()}`;

    return new Promise((resolve, reject) => {
      const parsed = new URL(url);
      const options: https.RequestOptions = {
        hostname: parsed.hostname,
        path: parsed.pathname + parsed.search,
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': this.userAgent,
          'x-api-key': apiKey,
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
            resolve(data?.data || []);
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

  private mapEvent(event: DiceEvent, now: Date): RawEvent | null {
    // Skip cancelled/sold out
    if (event.status === 'cancelled' || event.flags?.includes('cancelled')) return null;

    // Parse date
    const dateStr = event.date;
    if (!dateStr) return null;
    const startDate = new Date(dateStr);
    if (startDate < now) return null;

    const startAt = dateStr.replace('Z', '').replace(/\.\d+$/, '');
    const endAt = event.date_end
      ? event.date_end.replace('Z', '').replace(/\.\d+$/, '')
      : undefined;

    // Build title from artists
    const artists = event.detailed_artists || [];
    const headliners = artists.filter(a => a.headliner).map(a => a.name);
    const support = artists.filter(a => !a.headliner).map(a => a.name);
    const artistNames = event.artists || [];

    let title = '';
    if (headliners.length > 0) {
      title = headliners.join(', ');
      if (support.length > 0 && support.length <= 2) {
        title += ` w/ ${support.join(', ')}`;
      }
    } else if (artistNames.length > 0) {
      title = artistNames.slice(0, 3).join(', ');
      if (artistNames.length > 3) title += ` + ${artistNames.length - 3} more`;
    }

    // If event has a specific name (from perm_name), use that
    if (event.perm_name && !title) {
      title = event.perm_name
        .replace(/-\d+.*$/, '') // Remove date suffix
        .replace(/-/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase());
    }

    if (!title || title.length < 2) return null;

    // Determine venue name
    const venue = event.venue || 'Club Space';
    const presentedBy = event.presented_by || '';

    // Price
    let priceAmount = 0;
    if (event.ticket_types && event.ticket_types.length > 0) {
      const prices = event.ticket_types
        .filter(t => !t.sold_out)
        .map(t => Math.round(t.price.total / 100));
      if (prices.length > 0) {
        priceAmount = Math.min(...prices);
      }
    }
    const priceLabel = priceAmount === 0 ? 'Free' as const
      : priceAmount <= 25 ? '$' as const
      : priceAmount <= 75 ? '$$' as const
      : '$$$' as const;

    // Image
    const image = event.event_images?.landscape
      || event.event_images?.square
      || undefined;

    // Description
    const descParts: string[] = [];
    if (presentedBy) descParts.push(presentedBy);
    if (event.description) {
      const cleanDesc = event.description
        .replace(/\n+/g, ' ')
        .replace(/#\w+/g, '')
        .trim()
        .slice(0, 200);
      if (cleanDesc) descParts.push(cleanDesc);
    }
    if (event.age_limit) descParts.push(event.age_limit);
    const description = descParts.join(' | ') || `${title} at ${venue}`;

    // Tags
    const genreTags = (event.genre_tags || []).map(t =>
      t.replace('genre:', '').toLowerCase().replace(/\s+/g, '-')
    );
    const category = this.categorize(title, description, venue);
    const baseTags = this.generateTags(title, description, category);
    const tags = [...new Set([...baseTags, ...genreTags])].slice(0, 5);

    // Source URL
    const sourceUrl = event.url || `https://dice.fm/event/${event.perm_name || event.id}`;

    return {
      title,
      startAt,
      endAt,
      venueName: venue,
      address: this.venueCoords.address,
      neighborhood: this.venueCoords.neighborhood,
      lat: this.venueCoords.lat,
      lng: this.venueCoords.lng,
      city: 'Miami',
      tags,
      category: category === 'Community' ? 'Nightlife' : category, // Default to Nightlife for club events
      priceLabel,
      priceAmount,
      isOutdoor: venue.toLowerCase().includes('terrace'),
      description,
      sourceUrl,
      sourceName: this.name,
      ticketUrl: sourceUrl,
      image,
    };
  }
}
