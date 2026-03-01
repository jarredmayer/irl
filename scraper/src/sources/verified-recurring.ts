/**
 * Verified Recurring Events
 * ONLY events confirmed from official venue/organizer sources.
 * Must meet ALL criteria:
 *  1. Sourced from official website (not assumed)
 *  2. The event FORMAT itself is the consistent product (like a farmers market)
 *     - "Burlesque Brunch at The Wilder" ✓ (the show IS the attraction)
 *     - "Cinema Thursday" ✗ (what film? need real calendar)
 *     - "Jazz Nights at X" ✗ (who's playing? need real calendar)
 *  3. Has been running consistently for a meaningful period
 */

import { addDays, format, getDay } from 'date-fns';
import { BaseScraper } from './base.js';
import type { RawEvent } from '../types.js';

interface MonthlyEvent {
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

interface WeeklyEvent {
  name: string;
  venue: string;
  address: string;
  neighborhood: string;
  lat: number;
  lng: number;
  days: number[]; // 0=Sun, 1=Mon, ..., 6=Sat
  time: string;
  category: string;
  description: string;
  tags: string[];
  price: number;
  isOutdoor: boolean;
  sourceUrl: string;
}

// Monthly recurring events verified from official sources
const MONTHLY_EVENTS: MonthlyEvent[] = [
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

// Weekly recurring events — the event FORMAT is the product (confirmed from official sources)
const WEEKLY_EVENTS: WeeklyEvent[] = [
  // The Wilder Miami: Burlesque Brunch
  // Source: thewildermiami.com — confirmed weekly Sunday brunch with live burlesque show
  // This is a branded experience (the show IS the consistent product), not a generic "brunch"
  {
    name: 'Burlesque Brunch at The Wilder',
    venue: 'The Wilder Miami',
    address: '2119 NW 2nd Ave, Miami, FL 33127',
    neighborhood: 'Wynwood',
    lat: 25.7965,
    lng: -80.1996,
    days: [0], // Sunday
    time: '11:30',
    category: 'Entertainment',
    description: 'Live burlesque performances during Sunday brunch at The Wilder. Bottomless cocktails, brunch bites, and a show that blends cabaret energy with Miami flair.',
    tags: ['brunch', 'entertainment', 'local-favorite'],
    price: 65,
    isOutdoor: false,
    sourceUrl: 'https://www.thewildermiami.com/',
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
    const today = new Date();

    // Monthly events
    for (const event of MONTHLY_EVENTS) {
      const dates = this.getMonthlyDates(event.dayOfMonth, weeksAhead);
      for (const date of dates) {
        events.push({
          title: event.name,
          startAt: `${date}T${event.time}:00`,
          venueName: event.venue,
          address: event.address,
          neighborhood: event.neighborhood,
          city: 'Miami',
          lat: event.lat,
          lng: event.lng,
          description: event.description,
          category: event.category,
          tags: event.tags,
          priceAmount: event.price,
          priceLabel: event.price === 0 ? 'Free' : event.price <= 25 ? '$' : event.price <= 75 ? '$$' : '$$$',
          isOutdoor: event.isOutdoor,
          sourceName: this.name,
          sourceUrl: event.sourceUrl,
          recurring: true,
          recurrencePattern: 'monthly',
        });
      }
    }

    // Weekly events
    for (const event of WEEKLY_EVENTS) {
      for (let week = 0; week < weeksAhead; week++) {
        const baseDate = addDays(today, week * 7);
        for (const day of event.days) {
          let daysUntil = day - getDay(baseDate);
          if (daysUntil < 0) daysUntil += 7;
          if (daysUntil === 0 && week === 0) continue; // Skip today

          const eventDate = addDays(baseDate, daysUntil);
          if (eventDate <= today) continue;

          const dateStr = format(eventDate, 'yyyy-MM-dd');
          events.push({
            title: event.name,
            startAt: `${dateStr}T${event.time}:00`,
            venueName: event.venue,
            address: event.address,
            neighborhood: event.neighborhood,
            city: 'Miami',
            lat: event.lat,
            lng: event.lng,
            description: event.description,
            category: event.category,
            tags: event.tags,
            priceAmount: event.price,
            priceLabel: event.price === 0 ? 'Free' : event.price <= 25 ? '$' : event.price <= 75 ? '$$' : '$$$',
            isOutdoor: event.isOutdoor,
            sourceName: this.name,
            sourceUrl: event.sourceUrl,
            recurring: true,
            recurrencePattern: 'weekly',
          });
        }
      }
    }

    this.log(`Generated ${events.length} verified recurring events`);
    return events;
  }

  private getMonthlyDates(pattern: string, weeks: number): string[] {
    const dates: string[] = [];
    const today = new Date();

    for (let w = 0; w < weeks; w++) {
      const weekStart = addDays(today, w * 7);

      if (pattern === 'second-saturday') {
        const month = weekStart.getMonth();
        const year = weekStart.getFullYear();
        let secondSat = new Date(year, month, 1);
        while (getDay(secondSat) !== 6) secondSat = addDays(secondSat, 1);
        secondSat = addDays(secondSat, 7);
        const dateStr = format(secondSat, 'yyyy-MM-dd');
        if (!dates.includes(dateStr) && secondSat >= today) dates.push(dateStr);
      }

      if (pattern === 'first-saturday') {
        const month = weekStart.getMonth();
        const year = weekStart.getFullYear();
        let firstSat = new Date(year, month, 1);
        while (getDay(firstSat) !== 6) firstSat = addDays(firstSat, 1);
        const dateStr = format(firstSat, 'yyyy-MM-dd');
        if (!dates.includes(dateStr) && firstSat >= today) dates.push(dateStr);
      }

      if (pattern === 'third-thursday') {
        const month = weekStart.getMonth();
        const year = weekStart.getFullYear();
        let thirdThu = new Date(year, month, 1);
        while (getDay(thirdThu) !== 4) thirdThu = addDays(thirdThu, 1);
        thirdThu = addDays(thirdThu, 14);
        const dateStr = format(thirdThu, 'yyyy-MM-dd');
        if (!dates.includes(dateStr) && thirdThu >= today) dates.push(dateStr);
      }
    }

    return dates;
  }
}
