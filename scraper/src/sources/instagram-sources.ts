/**
 * Instagram Event Sources
 * Framework for monitoring Instagram accounts for events
 *
 * Note: Direct Instagram scraping requires authentication.
 * This module provides:
 * 1. Known recurring events from monitored accounts
 * 2. Framework for manual event entry from Instagram posts
 * 3. Hooks for future Instagram API/scraping integration
 */

import { addDays, format, getDay, lastDayOfMonth } from 'date-fns';
import { BaseScraper } from './base.js';
import type { RawEvent } from '../types.js';

interface InstagramAccount {
  handle: string;
  name: string;
  city: 'Miami' | 'Fort Lauderdale';
  category: string;
  knownEvents: KnownEvent[];
}

interface KnownEvent {
  name: string;
  venue?: string;
  address: string;
  neighborhood: string;
  lat: number;
  lng: number;
  schedule: 'weekly' | 'monthly' | 'last-friday';
  days?: number[];
  time: string;
  description: string;
  tags: string[];
  price: number;
}

export class InstagramSourcesScraper extends BaseScraper {
  private accounts: InstagramAccount[] = [
    // @fortlauderdaledowntown
    {
      handle: 'fortlauderdaledowntown',
      name: 'Downtown Fort Lauderdale',
      city: 'Fort Lauderdale',
      category: 'Community',
      knownEvents: [
        {
          name: 'First Friday Art Walk',
          venue: 'Downtown Fort Lauderdale',
          address: 'SW 2nd St, Fort Lauderdale, FL 33301',
          neighborhood: 'Downtown FLL',
          lat: 26.1189,
          lng: -80.1456,
          schedule: 'monthly',
          time: '18:00',
          description: 'Monthly art walk in downtown Fort Lauderdale featuring galleries, live music, and food vendors.',
          tags: ['art-gallery', 'free-event', 'local-favorite'],
          price: 0,
        },
        {
          name: 'Downtown FLL Food Truck Rally',
          venue: 'Huizenga Plaza',
          address: '32 E Las Olas Blvd, Fort Lauderdale, FL 33301',
          neighborhood: 'Downtown FLL',
          lat: 26.1189,
          lng: -80.1436,
          schedule: 'weekly',
          days: [5], // Friday
          time: '17:30',
          description: 'Weekly food truck gathering in downtown Fort Lauderdale. Live music and family-friendly.',
          tags: ['food-market', 'free-event', 'family-friendly'],
          price: 0,
        },
        {
          name: 'Sunday Jazz Brunch Downtown',
          venue: 'Riverwalk Fort Lauderdale',
          address: 'Riverwalk, Fort Lauderdale, FL 33301',
          neighborhood: 'Downtown FLL',
          lat: 26.1189,
          lng: -80.1467,
          schedule: 'weekly',
          days: [0], // Sunday
          time: '11:00',
          description: 'Live jazz along the Riverwalk with brunch specials at nearby restaurants.',
          tags: ['jazz', 'brunch', 'waterfront', 'free-event'],
          price: 0,
        },
      ],
    },
    // @wynaborhood
    {
      handle: 'wynaborhood',
      name: 'Wynwood Neighborhood',
      city: 'Miami',
      category: 'Art',
      knownEvents: [
        {
          name: 'Wynwood Second Saturday Art Walk',
          venue: 'Wynwood Arts District',
          address: 'NW 2nd Ave, Miami, FL 33127',
          neighborhood: 'Wynwood',
          lat: 25.8011,
          lng: -80.1996,
          schedule: 'monthly',
          time: '18:00',
          description: 'Monthly art walk through Wynwood galleries. Extended hours, new exhibitions, and street performances.',
          tags: ['art-gallery', 'free-event', 'local-favorite'],
          price: 0,
        },
      ],
    },
    // @baborhood (Brickell)
    {
      handle: 'baborhood',
      name: 'Brickell Neighborhood',
      city: 'Miami',
      category: 'Community',
      knownEvents: [
        {
          name: 'Brickell Night Market',
          venue: 'Brickell City Centre',
          address: '701 S Miami Ave, Miami, FL 33131',
          neighborhood: 'Brickell',
          lat: 25.7672,
          lng: -80.1936,
          schedule: 'monthly',
          time: '18:00',
          description: 'Monthly night market at Brickell City Centre featuring local vendors and artisans.',
          tags: ['food-market', 'free-event'],
          price: 0,
        },
      ],
    },
    // @themiamiflea
    {
      handle: 'themiamiflea',
      name: 'The Miami Flea',
      city: 'Miami',
      category: 'Community',
      knownEvents: [
        {
          name: 'The Miami Flea Market',
          venue: 'Various Miami Locations',
          address: 'Miami, FL',
          neighborhood: 'Miami',
          lat: 25.7617,
          lng: -80.1918,
          schedule: 'monthly',
          time: '11:00',
          description: 'Monthly artisan market featuring local makers, vintage vendors, food trucks, and live music.',
          tags: ['food-market', 'local-favorite', 'free-event'],
          price: 0,
        },
      ],
    },
    // @criticalmassmiami
    {
      handle: 'criticalmassmiami',
      name: 'Critical Mass Miami',
      city: 'Miami',
      category: 'Fitness',
      knownEvents: [
        {
          name: 'Critical Mass Miami',
          venue: 'Government Center',
          address: '111 NW 1st St, Miami, FL 33128',
          neighborhood: 'Downtown Miami',
          lat: 25.7754,
          lng: -80.1938,
          schedule: 'last-friday',
          time: '19:00',
          description: 'Monthly bike ride through Miami streets. Meet at Government Center. All welcome!',
          tags: ['cycling', 'free-event', 'community', 'local-favorite'],
          price: 0,
        },
      ],
    },
    // @mikiaminightlife (nightlife events)
    {
      handle: 'mikiaminightlife',
      name: 'Miami Nightlife',
      city: 'Miami',
      category: 'Nightlife',
      knownEvents: [
        // Events from this account are more ad-hoc
        // Would need Instagram API to track
      ],
    },
  ];

  constructor() {
    super('Instagram Sources', { weight: 1.4, rateLimit: 0 });
  }

  async scrape(): Promise<RawEvent[]> {
    const events: RawEvent[] = [];
    const weeksAhead = 8;

    this.log(`Generating events from ${this.accounts.length} Instagram accounts...`);

    for (const account of this.accounts) {
      for (const event of account.knownEvents) {
        const generated = this.generateEventsFromTemplate(account, event, weeksAhead);
        events.push(...generated);
      }
    }

    this.log(`Generated ${events.length} events from Instagram sources`);
    return events;
  }

  private generateEventsFromTemplate(
    account: InstagramAccount,
    event: KnownEvent,
    weeksAhead: number
  ): RawEvent[] {
    const events: RawEvent[] = [];
    const today = new Date();

    switch (event.schedule) {
      case 'weekly':
        events.push(...this.generateWeeklyEvents(account, event, weeksAhead));
        break;
      case 'monthly':
        events.push(...this.generateMonthlyEvents(account, event, weeksAhead));
        break;
      case 'last-friday':
        events.push(...this.generateLastFridayEvents(account, event, weeksAhead));
        break;
    }

    return events;
  }

  private generateWeeklyEvents(
    account: InstagramAccount,
    event: KnownEvent,
    weeksAhead: number
  ): RawEvent[] {
    const events: RawEvent[] = [];
    const today = new Date();
    const daysToCheck = weeksAhead * 7;

    for (let i = 0; i < daysToCheck; i++) {
      const checkDate = addDays(today, i);
      const dayOfWeek = getDay(checkDate);

      if (event.days?.includes(dayOfWeek)) {
        events.push(this.createEvent(account, event, checkDate));
      }
    }

    return events;
  }

  private generateMonthlyEvents(
    account: InstagramAccount,
    event: KnownEvent,
    weeksAhead: number
  ): RawEvent[] {
    const events: RawEvent[] = [];
    const today = new Date();

    // Generate for next 3 months
    for (let month = 0; month < 3; month++) {
      const targetDate = addDays(today, month * 30);

      // First Friday/Saturday of the month
      const firstOfMonth = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
      let eventDate = firstOfMonth;

      // Find first Friday (5) or Saturday (6) depending on event
      const targetDay = event.name.toLowerCase().includes('friday') ? 5 : 6;
      while (getDay(eventDate) !== targetDay) {
        eventDate = addDays(eventDate, 1);
      }

      if (eventDate >= today) {
        events.push(this.createEvent(account, event, eventDate));
      }
    }

    return events;
  }

  private generateLastFridayEvents(
    account: InstagramAccount,
    event: KnownEvent,
    weeksAhead: number
  ): RawEvent[] {
    const events: RawEvent[] = [];
    const today = new Date();

    // Generate for next 3 months
    for (let month = 0; month < 3; month++) {
      const targetMonth = new Date(today.getFullYear(), today.getMonth() + month, 1);
      const lastDay = lastDayOfMonth(targetMonth);

      // Find last Friday of the month
      let eventDate = lastDay;
      while (getDay(eventDate) !== 5) {
        eventDate = addDays(eventDate, -1);
      }

      if (eventDate >= today) {
        events.push(this.createEvent(account, event, eventDate));
      }
    }

    return events;
  }

  private createEvent(account: InstagramAccount, event: KnownEvent, date: Date): RawEvent {
    const dateStr = format(date, 'yyyy-MM-dd');
    const startAt = `${dateStr}T${event.time}:00`;

    return {
      title: event.name,
      startAt,
      venueName: event.venue,
      address: event.address,
      neighborhood: event.neighborhood,
      lat: event.lat,
      lng: event.lng,
      city: account.city,
      tags: event.tags,
      category: account.category,
      priceLabel: event.price === 0 ? 'Free' : '$',
      priceAmount: event.price,
      isOutdoor: event.tags.includes('waterfront') || event.tags.includes('park') || event.tags.includes('cycling'),
      description: event.description,
      sourceUrl: `https://instagram.com/${account.handle}`,
      sourceName: `@${account.handle}`,
      recurring: true,
      recurrencePattern: event.schedule,
    };
  }

  /**
   * Get list of monitored Instagram accounts
   * Useful for manual event entry workflow
   */
  getMonitoredAccounts(): string[] {
    return this.accounts.map((a) => `@${a.handle}`);
  }
}
