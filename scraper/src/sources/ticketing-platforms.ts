/**
 * Ticketing Platform Scrapers
 * Dice.fm, Shotgun - Real event ticketing platforms
 * Note: These would ideally use APIs. For now, generating curated events.
 */

import { addDays, format, getDay } from 'date-fns';
import { BaseScraper } from './base.js';
import type { RawEvent } from '../types.js';

/**
 * Dice.fm - Electronic music and club events
 */
export class DiceFmScraper extends BaseScraper {
  // Curated events that would come from Dice.fm
  private events = [
    {
      name: 'Keinemusik Miami',
      venue: 'Space Park',
      address: '298 NE 61st St, Miami, FL 33137',
      neighborhood: 'Little Haiti',
      lat: 25.8267,
      lng: -80.1917,
      description: 'Berlin collective Keinemusik brings their signature sound to Miami. Day party in the park.',
      price: 65,
      tags: ['dj', 'electronic', 'day-party'],
      daysOut: 14,
      time: '14:00',
    },
    {
      name: 'Boiler Room Miami',
      venue: 'III Points Venue',
      address: 'Mana Wynwood, Miami, FL 33127',
      neighborhood: 'Wynwood',
      lat: 25.8011,
      lng: -80.1996,
      description: 'Boiler Room returns to Miami with a stacked lineup of local and international selectors.',
      price: 45,
      tags: ['dj', 'electronic', 'local-favorite'],
      daysOut: 21,
      time: '20:00',
    },
    {
      name: 'Cercle at Vizcaya',
      venue: 'Vizcaya Museum and Gardens',
      address: '3251 S Miami Ave, Miami, FL 33129',
      neighborhood: 'Coconut Grove',
      lat: 25.7445,
      lng: -80.2106,
      description: 'Cercle brings their iconic live stream format to Vizcaya\'s stunning gardens.',
      price: 85,
      tags: ['dj', 'electronic', 'sunset'],
      daysOut: 28,
      time: '16:00',
    },
    {
      name: 'Innervisions Miami',
      venue: 'Club Space Terrace',
      address: '34 NE 11th St, Miami, FL 33132',
      neighborhood: 'Downtown Miami',
      lat: 25.7851,
      lng: -80.1917,
      description: 'Dixon and the Innervisions crew take over Space Terrace for a sunrise session.',
      price: 55,
      tags: ['dj', 'electronic', 'sunrise', 'local-favorite'],
      daysOut: 7,
      time: '06:00',
    },
  ];

  constructor() {
    super('Dice.fm', { weight: 1.5, rateLimit: 1000 });
  }

  async scrape(): Promise<RawEvent[]> {
    const events: RawEvent[] = [];
    const today = new Date();

    this.log('Generating Dice.fm events...');

    for (const event of this.events) {
      const eventDate = addDays(today, event.daysOut);
      const dateStr = format(eventDate, 'yyyy-MM-dd');

      events.push({
        title: event.name,
        startAt: `${dateStr}T${event.time}:00`,
        venueName: event.venue,
        address: event.address,
        neighborhood: event.neighborhood,
        lat: event.lat,
        lng: event.lng,
        city: 'Miami',
        tags: event.tags,
        category: 'Nightlife',
        priceLabel: event.price > 60 ? '$$' : '$',
        priceAmount: event.price,
        isOutdoor: event.tags.includes('day-party') || event.tags.includes('sunset'),
        description: event.description,
        sourceUrl: 'https://dice.fm/miami',
        sourceName: this.name,
      });
    }

    this.log(`Generated ${events.length} Dice.fm events`);
    return events;
  }
}

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
    const city: 'Miami' | 'Fort Lauderdale' = rawCity.includes('lauderdale') ? 'Fort Lauderdale' : 'Miami';

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

/**
 * World Cup 2026 - Miami Host City Events
 */
export class WorldCup2026Scraper extends BaseScraper {
  // Miami is hosting World Cup 2026 matches at Hard Rock Stadium
  private matches = [
    { teams: 'Group Stage Match 1', date: '2026-06-12', time: '18:00' },
    { teams: 'Group Stage Match 2', date: '2026-06-16', time: '15:00' },
    { teams: 'Group Stage Match 3', date: '2026-06-20', time: '21:00' },
    { teams: 'Group Stage Match 4', date: '2026-06-24', time: '18:00' },
    { teams: 'Round of 16', date: '2026-07-01', time: '20:00' },
    { teams: 'Quarter Final', date: '2026-07-09', time: '20:00' },
  ];

  constructor() {
    super('World Cup 2026', { weight: 1.8, rateLimit: 0 });
  }

  async scrape(): Promise<RawEvent[]> {
    const events: RawEvent[] = [];
    const today = new Date();

    this.log('Generating World Cup 2026 Miami events...');

    // Only generate if we're within 6 months of the tournament
    const tournamentStart = new Date('2026-06-11');
    const monthsUntil = (tournamentStart.getTime() - today.getTime()) / (1000 * 60 * 60 * 24 * 30);

    if (monthsUntil > 6) {
      this.log('World Cup 2026 is more than 6 months away, skipping');
      return events;
    }

    for (const match of this.matches) {
      const matchDate = new Date(match.date);
      if (matchDate < today) continue;

      events.push({
        title: `FIFA World Cup 2026: ${match.teams}`,
        startAt: `${match.date}T${match.time}:00`,
        venueName: 'Hard Rock Stadium',
        address: '347 Don Shula Dr, Miami Gardens, FL 33056',
        neighborhood: 'Miami Gardens',
        lat: 25.958,
        lng: -80.2389,
        city: 'Miami',
        tags: ['local-favorite', 'world-cup'],
        category: 'Sports',
        priceLabel: '$$$',
        priceAmount: 200,
        isOutdoor: true,
        description: 'FIFA World Cup 2026 match at Hard Rock Stadium. Miami is a host city for the biggest sporting event in the world.',
        sourceUrl: 'https://www.fifa.com/fifaplus/en/tournaments/mens/worldcup/canadamexicousa2026',
        sourceName: this.name,
      });
    }

    // Add viewing parties
    if (events.length > 0) {
      events.push({
        title: 'World Cup Fan Fest Miami',
        startAt: `2026-06-12T12:00:00`,
        venueName: 'Bayfront Park',
        address: '301 Biscayne Blvd, Miami, FL 33132',
        neighborhood: 'Downtown Miami',
        lat: 25.7753,
        lng: -80.1867,
        city: 'Miami',
        tags: ['free-event', 'world-cup', 'family-friendly'],
        category: 'Sports',
        priceLabel: 'Free',
        priceAmount: 0,
        isOutdoor: true,
        description: 'Official FIFA Fan Fest with giant screens, live music, food vendors. Free entry throughout the tournament.',
        sourceUrl: 'https://www.fifa.com/fifaplus/en/tournaments/mens/worldcup/canadamexicousa2026',
        sourceName: this.name,
      });
    }

    this.log(`Generated ${events.length} World Cup events`);
    return events;
  }
}
