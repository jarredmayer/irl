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
    // @gramps_miami - Wynwood bar / music venue
    {
      handle: 'gramps_miami',
      name: 'Gramps Miami',
      city: 'Miami',
      category: 'Music',
      knownEvents: [
        {
          name: 'Gramps: Reggae Wednesday',
          venue: 'Gramps',
          address: '176 NW 24th St, Miami, FL 33127',
          neighborhood: 'Wynwood',
          lat: 25.8010,
          lng: -80.1979,
          schedule: 'weekly',
          days: [3], // Wednesday
          time: '22:00',
          description: 'Weekly reggae night at Gramps. Live DJs, drink specials, and the best outdoor patio in Wynwood.',
          tags: ['dj', 'nightlife', 'local-favorite', 'dancing'],
          price: 0,
        },
        {
          name: 'Gramps: Live Music Friday',
          venue: 'Gramps',
          address: '176 NW 24th St, Miami, FL 33127',
          neighborhood: 'Wynwood',
          lat: 25.8010,
          lng: -80.1979,
          schedule: 'weekly',
          days: [5], // Friday
          time: '22:00',
          description: 'Live bands and DJs on the Gramps stage. Local and touring acts in Wynwood\'s most eclectic music venue.',
          tags: ['live-music', 'nightlife', 'local-favorite'],
          price: 10,
        },
        {
          name: 'Gramps: Trivia Tuesday',
          venue: 'Gramps',
          address: '176 NW 24th St, Miami, FL 33127',
          neighborhood: 'Wynwood',
          lat: 25.8010,
          lng: -80.1979,
          schedule: 'weekly',
          days: [2], // Tuesday
          time: '20:00',
          description: 'Weekly bar trivia at Gramps. Teams of up to 6 compete for bar tabs. Miami\'s most fun Tuesday night.',
          tags: ['bar', 'community', 'local-favorite'],
          price: 0,
        },
      ],
    },
    // @lasrosasmiami - Allapattah bar
    {
      handle: 'lasrosasmiami',
      name: 'Las Rosas Miami',
      city: 'Miami',
      category: 'Nightlife',
      knownEvents: [
        {
          name: 'Las Rosas: DJ Night',
          venue: 'Las Rosas',
          address: '2898 NW 7th Ave, Miami, FL 33127',
          neighborhood: 'Allapattah',
          lat: 25.7972,
          lng: -80.2050,
          schedule: 'weekly',
          days: [5, 6], // Fri-Sat
          time: '22:00',
          description: 'Rotating DJs spinning everything from cumbia to techno. One of Miami\'s coolest neighborhood bars in Allapattah.',
          tags: ['dj', 'nightlife', 'local-favorite', 'dancing', 'underground'],
          price: 0,
        },
      ],
    },
    // @churchillspub_miami - Little Haiti
    {
      handle: 'churchillspub',
      name: "Churchill's Pub",
      city: 'Miami',
      category: 'Music',
      knownEvents: [
        {
          name: "Churchill's: Live Music Weekend",
          venue: "Churchill's Pub",
          address: '5501 NE 2nd Ave, Miami, FL 33137',
          neighborhood: 'Little Haiti',
          lat: 25.8255,
          lng: -80.1859,
          schedule: 'weekly',
          days: [5, 6], // Fri-Sat
          time: '21:00',
          description: "Live bands at Miami's legendary dive bar. Rock, punk, indie, and everything in between since 1979.",
          tags: ['live-music', 'nightlife', 'local-favorite'],
          price: 10,
        },
        {
          name: "Churchill's: Open Mic Wednesday",
          venue: "Churchill's Pub",
          address: '5501 NE 2nd Ave, Miami, FL 33137',
          neighborhood: 'Little Haiti',
          lat: 25.8255,
          lng: -80.1859,
          schedule: 'weekly',
          days: [3], // Wednesday
          time: '20:00',
          description: "Wednesday open mic at Churchill's. Sign up to perform or enjoy Miami's underground music scene.",
          tags: ['live-music', 'community', 'local-favorite'],
          price: 0,
        },
      ],
    },
    // @lagniappe_miami - Wine & jazz bar
    {
      handle: 'lagniappe_miami',
      name: 'Lagniappe House',
      city: 'Miami',
      category: 'Music',
      knownEvents: [
        {
          name: 'Lagniappe: Jazz & Wine',
          venue: 'Lagniappe House',
          address: '3425 NE 2nd Ave, Miami, FL 33137',
          neighborhood: 'Design District',
          lat: 25.8145,
          lng: -80.1919,
          schedule: 'weekly',
          days: [4, 5, 6, 0], // Thu-Sun
          time: '20:00',
          description: 'Live jazz in an intimate wine-bar setting. Rotating wine list, cheese boards, and nightly jazz acts in this beloved Miami institution.',
          tags: ['jazz', 'live-music', 'wine-tasting', 'local-favorite', 'intimate'],
          price: 0,
        },
      ],
    },
    // @thewharfmiami - Brickell waterfront
    {
      handle: 'thewharfmiami',
      name: 'The Wharf Miami',
      city: 'Miami',
      category: 'Nightlife',
      knownEvents: [
        {
          name: 'The Wharf Miami: Weekend DJ Party',
          venue: 'The Wharf Miami',
          address: '114 SW North River Dr, Miami, FL 33130',
          neighborhood: 'Brickell',
          lat: 25.7692,
          lng: -80.1994,
          schedule: 'weekly',
          days: [5, 6], // Fri-Sat
          time: '18:00',
          description: 'Outdoor waterfront party at The Wharf. DJs, shipping container bars, food trucks, and Miami River views.',
          tags: ['dj', 'nightlife', 'waterfront', 'outdoor', 'local-favorite'],
          price: 0,
        },
      ],
    },
    // @pamm_museum - Pérez Art Museum Miami
    {
      handle: 'pamm_museum',
      name: 'Pérez Art Museum Miami',
      city: 'Miami',
      category: 'Art',
      knownEvents: [
        {
          name: 'PAMM: Free First Thursday',
          venue: 'Pérez Art Museum Miami',
          address: '1103 Biscayne Blvd, Miami, FL 33132',
          neighborhood: 'Downtown Miami',
          lat: 25.7748,
          lng: -80.1856,
          schedule: 'monthly',
          time: '12:00',
          description: "Free admission every first Thursday 12-9pm. Extended programming, docent-led tours, and community events on Museum Park's waterfront campus.",
          tags: ['museum', 'art-gallery', 'free-event', 'waterfront', 'local-favorite'],
          price: 0,
        },
      ],
    },
    // @northbeachbandshell - North Beach outdoor venue
    {
      handle: 'northbeachbandshell',
      name: 'North Beach Bandshell',
      city: 'Miami',
      category: 'Music',
      knownEvents: [
        {
          name: 'Live at the Bandshell: Weekend Concert',
          venue: 'North Beach Bandshell',
          address: '7275 Collins Ave, Miami Beach, FL 33141',
          neighborhood: 'North Beach',
          lat: 25.8490,
          lng: -80.1220,
          schedule: 'weekly',
          days: [5, 6], // Fri-Sat
          time: '19:00',
          description: 'Outdoor concerts at the beloved North Beach Bandshell amphitheater. Local and international artists under the stars on Miami Beach.',
          tags: ['live-music', 'outdoor', 'local-favorite', 'beach', 'free-event'],
          price: 0,
        },
      ],
    },
    // @wynwoodwalls - Street art museum
    {
      handle: 'wynwoodwalls',
      name: 'Wynwood Walls',
      city: 'Miami',
      category: 'Art',
      knownEvents: [
        {
          name: 'Wynwood Walls: Second Saturday Art Walk',
          venue: 'Wynwood Walls',
          address: '2520 NW 2nd Ave, Miami, FL 33127',
          neighborhood: 'Wynwood',
          lat: 25.8016,
          lng: -80.1992,
          schedule: 'monthly',
          time: '18:00',
          description: 'Monthly art walk through Wynwood with extended hours at the Walls. New murals, artist talks, and live music in the garden.',
          tags: ['art-gallery', 'outdoor', 'local-favorite', 'live-music', 'free-event'],
          price: 0,
        },
      ],
    },
    // @wiltonmanorsfl - Wilton Manors FLL
    {
      handle: 'wiltonmanorsfl',
      name: 'Wilton Manors',
      city: 'Fort Lauderdale',
      category: 'Community',
      knownEvents: [
        {
          name: 'Wilton Drive: Sunday Stroll',
          venue: 'Wilton Drive',
          address: 'Wilton Dr, Wilton Manors, FL 33305',
          neighborhood: 'Wilton Manors',
          lat: 26.1563,
          lng: -80.1379,
          schedule: 'weekly',
          days: [0], // Sunday
          time: '11:00',
          description: "Sunday stroll down Wilton Drive with brunch spots, pop-up vendors, and Wilton Manors' welcoming community atmosphere.",
          tags: ['outdoor', 'community', 'local-favorite', 'brunch'],
          price: 0,
        },
      ],
    },
    // @thefernbarftl - Fort Lauderdale cocktail bar
    {
      handle: 'thefernbarftl',
      name: 'The Fern Bar FTL',
      city: 'Fort Lauderdale',
      category: 'Nightlife',
      knownEvents: [
        {
          name: 'The Fern Bar: Weekend DJ',
          venue: 'The Fern Bar',
          address: '700 N Andrews Ave, Fort Lauderdale, FL 33311',
          neighborhood: 'Flagler Village',
          lat: 26.1289,
          lng: -80.1456,
          schedule: 'weekly',
          days: [5, 6], // Fri-Sat
          time: '21:00',
          description: "Weekend DJ nights at The Fern Bar in Flagler Village. Craft cocktails, eclectic music, and Fort Lauderdale's coolest crowd.",
          tags: ['dj', 'nightlife', 'cocktails', 'local-favorite'],
          price: 0,
        },
      ],
    },
    // @miamirunclub - Community fitness
    {
      handle: 'miamirunclub',
      name: 'Miami Run Club',
      city: 'Miami',
      category: 'Fitness',
      knownEvents: [
        {
          name: 'Miami Run Club: Saturday Morning Run',
          venue: 'Bayfront Park',
          address: '301 Biscayne Blvd, Miami, FL 33132',
          neighborhood: 'Downtown Miami',
          lat: 25.7733,
          lng: -80.1867,
          schedule: 'weekly',
          days: [6], // Saturday
          time: '07:00',
          description: 'Free weekly group run starting at Bayfront Park. All paces welcome. Routes along Brickell, Edgewater, and the bay.',
          tags: ['running', 'free-event', 'community', 'outdoor', 'fitness-class'],
          price: 0,
        },
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
