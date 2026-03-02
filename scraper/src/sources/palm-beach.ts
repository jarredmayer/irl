/**
 * Palm Beach County Event Sources
 * Covers West Palm Beach, Boca Raton, Delray Beach, Jupiter, Lake Worth, and more
 *
 * All events are REAL, verified recurring events from official sources.
 */

import { addDays, format, getDay } from 'date-fns';
import { BaseScraper } from './base.js';
import type { RawEvent } from '../types.js';

interface PBVenue {
  name: string;
  address: string;
  neighborhood: string;
  lat: number;
  lng: number;
  url?: string;
  events: PBEventTemplate[];
}

interface PBEventTemplate {
  name: string;
  days: number[] | 'monthly' | 'first-saturday' | 'first-friday' | 'first-sunday' | 'third-thursday' | 'specific-dates';
  specificDates?: string[];
  time: string;
  category: string;
  description: string;
  tags: string[];
  price: number;
}

export class PalmBeachScraper extends BaseScraper {
  private venues: PBVenue[] = [
    // ── VERIFIED RECURRING EVENTS (confirmed from official sources) ────

    // West Palm Beach — Clematis by Night (verified: wpb.org)
    {
      name: 'Clematis Street Waterfront',
      address: '101 N Clematis St, West Palm Beach, FL 33401',
      neighborhood: 'West Palm Beach',
      lat: 26.7153,
      lng: -80.0534,
      url: 'https://www.wpb.org/clematis-by-night',
      events: [
        {
          name: 'Clematis by Night',
          days: [4], // Thursday
          time: '18:00',
          category: 'Music',
          description: 'Free weekly outdoor concert series on the WPB Waterfront. Live bands, food trucks, and waterfront vibes every Thursday evening.',
          tags: ['live-music', 'free-event', 'outdoor', 'waterfront', 'local-favorite'],
          price: 0,
        },
      ],
    },
    // West Palm Beach GreenMarket (verified: wpb.org/greenmarket)
    {
      name: 'West Palm Beach GreenMarket',
      address: 'Waterfront Commons, 101 S Flagler Dr, West Palm Beach, FL 33401',
      neighborhood: 'West Palm Beach',
      lat: 26.7115,
      lng: -80.0512,
      url: 'https://wpb.org/greenmarket',
      events: [
        {
          name: 'West Palm Beach GreenMarket',
          days: [6], // Saturday
          time: '09:00',
          category: 'Food & Drink',
          description: 'Award-winning farmers market on the waterfront. 100+ vendors with local produce, artisan food, baked goods, plants, and handmade crafts. Open Oct–April.',
          tags: ['farmers-market', 'free-event', 'outdoor', 'waterfront', 'local-favorite', 'food'],
          price: 0,
        },
      ],
    },
    // Art After Dark at Norton Museum (verified: norton.org)
    {
      name: 'Norton Museum of Art',
      address: '1450 S Dixie Hwy, West Palm Beach, FL 33401',
      neighborhood: 'West Palm Beach',
      lat: 26.7008,
      lng: -80.0586,
      url: 'https://www.norton.org/',
      events: [
        {
          name: 'Art After Dark at Norton Museum',
          days: [5], // Friday
          time: '17:00',
          category: 'Art',
          description: 'Friday evening at the Norton Museum with live music, art-making activities, exhibition tours, food, and cocktails. Free admission on Fridays.',
          tags: ['museum', 'art-gallery', 'free-event', 'live-music', 'local-favorite'],
          price: 0,
        },
      ],
    },
    // Delray Beach GreenMarket (verified: oldschoolsquare.org)
    {
      name: 'Old School Square',
      address: '51 N Swinton Ave, Delray Beach, FL 33444',
      neighborhood: 'Delray Beach',
      lat: 26.4615,
      lng: -80.0729,
      url: 'https://oldschoolsquare.org/',
      events: [
        {
          name: 'Delray Beach GreenMarket',
          days: [6], // Saturday
          time: '09:00',
          category: 'Food & Drink',
          description: 'One of South Florida\'s top green markets. Fresh produce, baked goods, flowers, crafts, and live music in downtown Delray Beach. Open Oct–May.',
          tags: ['farmers-market', 'free-event', 'outdoor', 'local-favorite', 'food'],
          price: 0,
        },
      ],
    },
    // Sushi & Stroll at Morikami (verified: morikami.org)
    {
      name: 'Morikami Museum & Japanese Gardens',
      address: '4000 Morikami Park Rd, Delray Beach, FL 33446',
      neighborhood: 'Delray Beach',
      lat: 26.4374,
      lng: -80.1731,
      url: 'https://morikami.org/',
      events: [
        {
          name: 'Sushi & Stroll at Morikami',
          days: 'third-thursday',
          time: '17:30',
          category: 'Food & Drink',
          description: 'Monthly evening event with sushi, taiko drumming, Japanese performances, garden tours, and sake tastings at the Morikami Museum.',
          tags: ['food', 'live-music', 'museum', 'outdoor', 'local-favorite'],
          price: 15,
        },
      ],
    },
    // ── Annual Events & Festivals ──────────────────────────────────
    {
      name: 'SunFest',
      address: 'Flagler Dr, West Palm Beach, FL 33401',
      neighborhood: 'West Palm Beach',
      lat: 26.7140,
      lng: -80.0498,
      url: 'https://www.sunfest.com/',
      events: [
        {
          name: 'SunFest Music & Art Festival',
          days: 'specific-dates',
          specificDates: ['2026-05-01', '2026-05-02', '2026-05-03'],
          time: '16:00',
          category: 'Music',
          description: 'South Florida\'s largest waterfront music and art festival. 3 stages, 50+ bands, art exhibits, and food along the West Palm Beach Intracoastal Waterway.',
          tags: ['live-music', 'outdoor', 'waterfront', 'festival', 'local-favorite', 'art-gallery'],
          price: 55,
        },
      ],
    },
    {
      name: 'Flagler Museum',
      address: '1 Whitehall Way, Palm Beach, FL 33480',
      neighborhood: 'West Palm Beach',
      lat: 26.7190,
      lng: -80.0383,
      url: 'https://www.flaglermuseum.us/',
      events: [
        {
          name: 'Flagler Museum: Gilded Age Tour',
          days: [2, 3, 4, 5, 6], // Tue–Sat
          time: '10:00',
          category: 'Culture',
          description: 'Tour the stunning Whitehall mansion, Henry Flagler\'s 75-room Gilded Age estate. See the private railcar, art collection, and learn the history that built Florida.',
          tags: ['museum', 'local-favorite'],
          price: 26,
        },
      ],
    },
    // NOTE: WeekendBroward-sourced events moved to weekend-broward-verified.ts
  ];

  constructor() {
    super('Palm Beach', { weight: 1.3, rateLimit: 0 });
  }

  async scrape(): Promise<RawEvent[]> {
    const events: RawEvent[] = [];
    const weeksAhead = 6;

    this.log(`Generating Palm Beach events for next ${weeksAhead} weeks...`);

    for (const venue of this.venues) {
      for (const template of venue.events) {
        const generated = this.generateEvents(venue, template, weeksAhead);
        events.push(...generated);
      }
    }

    this.log(`Generated ${events.length} Palm Beach events`);
    return events;
  }

  private generateEvents(
    venue: PBVenue,
    template: PBEventTemplate,
    weeksAhead: number,
  ): RawEvent[] {
    const events: RawEvent[] = [];
    const today = new Date();
    const daysToCheck = weeksAhead * 7;

    if (template.days === 'specific-dates' && template.specificDates) {
      const windowEnd = addDays(today, daysToCheck);
      for (const dateStr of template.specificDates) {
        const d = new Date(`${dateStr}T${template.time}:00`);
        if (d >= today && d <= windowEnd) {
          events.push(this.createEvent(venue, template, d));
        }
      }
    } else if (template.days === 'monthly' || template.days === 'first-saturday' || template.days === 'first-friday' || template.days === 'first-sunday' || template.days === 'third-thursday') {
      // Iterate over ALL days to find matching monthly patterns
      for (let i = 0; i < daysToCheck; i++) {
        const checkDate = addDays(today, i);
        const dayOfMonth = checkDate.getDate();
        const dayOfWeek = getDay(checkDate);

        if (template.days === 'first-saturday' && dayOfWeek === 6 && dayOfMonth <= 7) {
          events.push(this.createEvent(venue, template, checkDate));
        } else if (template.days === 'first-friday' && dayOfWeek === 5 && dayOfMonth <= 7) {
          events.push(this.createEvent(venue, template, checkDate));
        } else if (template.days === 'first-sunday' && dayOfWeek === 0 && dayOfMonth <= 7) {
          events.push(this.createEvent(venue, template, checkDate));
        } else if (template.days === 'third-thursday' && dayOfWeek === 4 && dayOfMonth >= 15 && dayOfMonth <= 21) {
          events.push(this.createEvent(venue, template, checkDate));
        } else if (template.days === 'monthly' && dayOfWeek === 6 && dayOfMonth >= 22) {
          events.push(this.createEvent(venue, template, checkDate));
        }
      }
    } else {
      // Regular weekly events
      for (let i = 0; i < daysToCheck; i++) {
        const checkDate = addDays(today, i);
        const dayOfWeek = getDay(checkDate);
        if ((template.days as number[]).includes(dayOfWeek)) {
          events.push(this.createEvent(venue, template, checkDate));
        }
      }
    }

    return events;
  }

  private createEvent(venue: PBVenue, template: PBEventTemplate, date: Date): RawEvent {
    const dateStr = format(date, 'yyyy-MM-dd');
    const startAt = `${dateStr}T${template.time}:00`;

    return {
      title: template.name,
      startAt,
      venueName: venue.name,
      address: venue.address,
      neighborhood: venue.neighborhood,
      lat: venue.lat,
      lng: venue.lng,
      city: 'Palm Beach',
      tags: template.tags,
      category: template.category,
      priceLabel: template.price === 0 ? 'Free' : template.price < 20 ? '$' : '$$',
      priceAmount: template.price,
      isOutdoor: template.tags.includes('beach') || template.tags.includes('park') || template.tags.includes('waterfront') || template.tags.includes('outdoor'),
      description: template.description,
      sourceUrl: venue.url,
      sourceName: this.name,
      recurring: true,
      recurrencePattern: 'weekly',
    };
  }
}
