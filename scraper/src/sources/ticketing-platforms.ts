/**
 * Ticketing Platform Scrapers
 * Shotgun.live - Real API scraper for Miami electronic / nightlife events.
 */

import { addDays, format } from 'date-fns';
import { BaseScraper } from './base.js';
import type { RawEvent } from '../types.js';

/**
 * Shotgun.live - Real API scraper for Miami electronic / nightlife events.
 *
 * API investigation notes:
 *   Base: https://api.shotgun.live/v1
 *   Events endpoint: GET /events?citySlug=miami&page=1&perPage=40&startDate=YYYY-MM-DD
 *   Auth: none required for public event listing
 *   Rate limit: ~1 req/s is safe
 *
 * Response shape (abridged):
 *   { data: [{ id, name, startDate, endDate, coverImage,
 *              organizer: { name },
 *              venue: { name, address, city, latitude, longitude },
 *              tickets: [{ price }],
 *              tags: [{ name }] }],
 *     meta: { currentPage, lastPage, total } }
 */

interface ShotgunVenue {
  name: string;
  address?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
}

interface ShotgunTicket {
  price: number;
}

interface ShotgunEvent {
  id: string;
  name: string;
  startDate: string;   // ISO 8601
  endDate?: string;
  description?: string;
  coverImage?: string;
  organizer?: { name: string };
  venue?: ShotgunVenue;
  tickets?: ShotgunTicket[];
  tags?: { name: string }[];
}

interface ShotgunResponse {
  data: ShotgunEvent[];
  meta: { currentPage: number; lastPage: number; total: number };
}

export class ShotgunScraper extends BaseScraper {
  private readonly baseUrl = 'https://api.shotgun.live/v1';
  private readonly citySlug = 'miami';

  constructor() {
    super('Shotgun', { weight: 1.5, rateLimit: 1200 });
  }

  async scrape(): Promise<RawEvent[]> {
    this.log('Querying Shotgun.live API...');

    const startDate = format(new Date(), 'yyyy-MM-dd');
    const endDate = format(addDays(new Date(), 60), 'yyyy-MM-dd');
    const allEvents: RawEvent[] = [];

    let page = 1;
    let lastPage = 1;

    while (page <= lastPage) {
      const url =
        `${this.baseUrl}/events?citySlug=${this.citySlug}` +
        `&page=${page}&perPage=40&startDate=${startDate}&endDate=${endDate}`;

      let body: ShotgunResponse;
      try {
        const response = await this.fetch(url, {
          headers: {
            Accept: 'application/json',
            'Accept-Language': 'en-US,en;q=0.9',
            Referer: 'https://shotgun.live/cities/miami',
            Origin: 'https://shotgun.live',
          },
        });
        if (!response.ok) {
          this.logError(`Shotgun API HTTP ${response.status}`);
          break;
        }
        body = await response.json() as ShotgunResponse;
      } catch (e) {
        this.logError('Shotgun API request failed', e);
        break;
      }

      if (!Array.isArray(body.data)) break;

      for (const ev of body.data) {
        const parsed = this.parseEvent(ev);
        if (parsed) allEvents.push(parsed);
      }

      lastPage = body.meta?.lastPage ?? 1;
      page++;

      if (page <= lastPage) await this.sleep(1200);
    }

    this.log(`Fetched ${allEvents.length} Shotgun events`);
    return allEvents;
  }

  private parseEvent(ev: ShotgunEvent): RawEvent | null {
    if (!ev.startDate) return null;

    const minPrice = ev.tickets?.length
      ? Math.min(...ev.tickets.map((t) => t.price).filter((p) => p >= 0))
      : 0;

    const tags: string[] = ['dj', 'electronic', 'nightlife'];
    (ev.tags ?? []).forEach((t) => {
      const slug = t.name.toLowerCase().replace(/\s+/g, '-');
      if (!tags.includes(slug)) tags.push(slug);
    });

    const venue = ev.venue;
    const rawCity = (venue?.city ?? '').toLowerCase();
    const city: 'Miami' | 'Fort Lauderdale' | 'Palm Beach' = rawCity.includes('lauderdale') ? 'Fort Lauderdale' : rawCity.includes('palm') || rawCity.includes('boca') || rawCity.includes('delray') || rawCity.includes('jupiter') || rawCity.includes('wellington') || rawCity.includes('boynton') ? 'Palm Beach' : 'Miami';

    return {
      title: ev.name,
      startAt: ev.startDate,
      venueName: venue?.name ?? (ev.organizer?.name ?? 'TBA'),
      address: venue?.address ?? `${city}, FL`,
      neighborhood: '',
      lat: venue?.latitude ?? 25.7617,
      lng: venue?.longitude ?? -80.1918,
      city,
      tags,
      category: 'Nightlife',
      priceLabel: minPrice === 0 ? 'Free' : minPrice < 30 ? '$' : minPrice < 60 ? '$$' : '$$$',
      priceAmount: minPrice,
      isOutdoor: false,
      description: ev.description ?? '',
      image: ev.coverImage,
      sourceUrl: `https://shotgun.live/events/${ev.id}`,
      sourceName: this.name,
    };
  }
}

