/**
 * Verified Recurring Events
 * ONLY events confirmed from official sources
 */

import { addDays, format, getDay } from 'date-fns';
import { BaseScraper } from './base.js';
import type { RawEvent } from '../types.js';

interface VerifiedRecurring {
  name: string;
  venue: string;
  address: string;
  neighborhood: string;
  lat: number;
  lng: number;
  dayOfMonth: 'second-saturday' | 'first-saturday' | 'third-thursday';
  time: string;
  category: string;
  description: string;
  tags: string[];
  price: number;
  isOutdoor: boolean;
  sourceUrl: string;
}

// Only events verified from official sources
const VERIFIED_EVENTS: VerifiedRecurring[] = [
  // Wynwood Art Walk - verified at wynwoodmiami.com
  {
    name: 'Wynwood Art Walk',
    venue: 'Wynwood Arts District',
    address: '2520 NW 2nd Ave, Miami, FL 33127',
    neighborhood: 'Wynwood',
    lat: 25.8011,
    lng: -80.1994,
    dayOfMonth: 'second-saturday',
    time: '17:00',
    category: 'Art',
    description: 'Free open-air arts experience with galleries, murals, live artists, vendors, food trucks, and music. Presented by Wynwood BID. 5-10pm.',
    tags: ['art-gallery', 'free-event', 'local-favorite', 'outdoor'],
    price: 0,
    isOutdoor: true,
    sourceUrl: 'https://wynwoodmiami.com/experience/art-walk/',
  },
];

export class VerifiedRecurringScraper extends BaseScraper {
  constructor() {
    super('Verified Recurring', { weight: 1.3, rateLimit: 0 });
  }

  async scrape(): Promise<RawEvent[]> {
    this.log('Generating verified recurring events...');
    const events: RawEvent[] = [];
    const weeksAhead = 8;

    for (const event of VERIFIED_EVENTS) {
      const dates = this.getDatesForPattern(event.dayOfMonth, weeksAhead);
      for (const date of dates) {
        events.push({
          title: event.name,
          startAt: `${date}T${event.time}:00`,
          timezone: 'America/New_York',
          venueName: event.venue,
          address: event.address,
          neighborhood: event.neighborhood,
          city: 'Miami',
          lat: event.lat,
          lng: event.lng,
          description: event.description,
          category: event.category,
          tags: event.tags,
          priceMin: event.price,
          isOutdoor: event.isOutdoor,
          sourceName: this.sourceName,
          sourceUrl: event.sourceUrl,
        });
      }
    }

    this.log(`Generated ${events.length} verified recurring events`);
    return events;
  }

  private getDatesForPattern(pattern: string, weeks: number): string[] {
    const dates: string[] = [];
    const today = new Date();

    for (let w = 0; w < weeks; w++) {
      const weekStart = addDays(today, w * 7);

      if (pattern === 'second-saturday') {
        // Find second Saturday of the month
        const month = weekStart.getMonth();
        const year = weekStart.getFullYear();
        let secondSat = new Date(year, month, 1);

        // Find first Saturday
        while (getDay(secondSat) !== 6) {
          secondSat = addDays(secondSat, 1);
        }
        // Add 7 days for second Saturday
        secondSat = addDays(secondSat, 7);

        const dateStr = format(secondSat, 'yyyy-MM-dd');
        if (!dates.includes(dateStr) && secondSat >= today) {
          dates.push(dateStr);
        }
      }
    }

    return dates;
  }
}
