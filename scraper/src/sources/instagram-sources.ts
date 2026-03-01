/**
 * Instagram Event Sources
 * Framework for monitoring Instagram accounts for events
 *
 * Note: Direct Instagram scraping requires authentication.
 * This module provides:
 * 1. Known recurring events from monitored accounts (confirmed schedules only)
 * 2. Framework for manual event entry from Instagram posts
 * 3. Hooks for future Instagram API/scraping integration
 *
 * POLICY: knownEvents must have a confirmed recurring schedule from an official source.
 * Fabricated or assumed events must NEVER be added. Use knownEvents: [] for accounts
 * that are good sources but don't have a confirmed fixed recurring schedule yet.
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
  category?: string; // Overrides account-level category for this event
}

export class InstagramSourcesScraper extends BaseScraper {
  // All entries are monitored Instagram sources.
  // knownEvents: [] = real source, no confirmed fixed recurring schedule yet
  // knownEvents: [...] = confirmed recurring schedule with source evidence
  private accounts: InstagramAccount[] = [

    // ── CONFIRMED RECURRING EVENTS ────────────────────────────────────────────

    // @criticalmassmiami — last Friday monthly bike ride from Government Center
    // Source: criticalmassmiami.com — 30+ year global tradition, Miami chapter confirmed
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

    // @pamm_museum — Pérez Art Museum Miami: Free First Thursday
    // Source: pamm.org — confirmed monthly, 12–9pm free admission
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
          description: 'Free admission every first Thursday 12–9pm. Extended programming, docent-led tours, and community events on Museum Park\'s waterfront campus.',
          tags: ['museum', 'art-gallery', 'free-event', 'waterfront', 'local-favorite'],
          price: 0,
        },
      ],
    },

    // @wynwoodwalls — Second Saturday Art Walk
    // Source: wynwoodwalls.com — confirmed monthly, galleries open late
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

    // @wynwood_marketplace — Open-air weekend market at fixed address
    // Source: wynwoodmarketplace.com — Fri–Sun at 2250 NW 2nd Ave confirmed
    {
      handle: 'wynwood_marketplace',
      name: 'Wynwood Marketplace',
      city: 'Miami',
      category: 'Community',
      knownEvents: [
        {
          name: 'Wynwood Marketplace: Weekend Market',
          venue: 'Wynwood Marketplace',
          address: '2250 NW 2nd Ave, Miami, FL 33127',
          neighborhood: 'Wynwood',
          lat: 25.7980,
          lng: -80.1992,
          schedule: 'weekly',
          days: [5, 6, 0], // Fri–Sun
          time: '17:00',
          description: 'Open-air marketplace in the heart of Wynwood. Local artisans, street food, live music, and the best of Miami\'s creative scene.',
          tags: ['market', 'outdoor', 'local-favorite', 'live-music', 'food-market'],
          price: 0,
        },
      ],
    },

    // @miamirunclub — Saturday morning group run from Bayfront Park
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

    // @sunnysideupmarket — Sunday market at Esplanade Park, Fort Lauderdale
    {
      handle: 'sunnysideupmarket',
      name: 'Sunny Side Up Market',
      city: 'Fort Lauderdale',
      category: 'Community',
      knownEvents: [
        {
          name: 'Sunny Side Up Market',
          venue: 'Esplanade Park',
          address: '400 SW 2nd St, Fort Lauderdale, FL 33312',
          neighborhood: 'Riverwalk',
          lat: 26.1192,
          lng: -80.1478,
          schedule: 'weekly',
          days: [0], // Sunday
          time: '09:00',
          description: 'Weekly Sunday pop-up market in Fort Lauderdale with local vendors, artisan food, fresh produce, and handmade goods.',
          tags: ['market', 'outdoor', 'local-favorite', 'free-event', 'food'],
          price: 0,
        },
      ],
    },

    // @lauderdalerunclub — Lauderdale Run Club (confirmed recurring at fixed FLL locations)
    {
      handle: 'lauderdalerunclub',
      name: 'Lauderdale Run Club',
      city: 'Fort Lauderdale',
      category: 'Fitness',
      knownEvents: [
        {
          name: 'Lauderdale Run Club: Morning Run',
          venue: 'Las Olas Riverfront',
          address: '300 SW 1st Ave, Fort Lauderdale, FL 33301',
          neighborhood: 'Las Olas',
          lat: 26.1189,
          lng: -80.1456,
          schedule: 'weekly',
          days: [6], // Saturday
          time: '07:00',
          description: 'Free weekly group run through Fort Lauderdale. All paces welcome — from joggers to speedsters. Meet at Las Olas Riverfront.',
          tags: ['running', 'free-event', 'community', 'outdoor', 'fitness-class'],
          price: 0,
        },
        {
          name: 'Lauderdale Run Club: Weekday Run',
          venue: 'Holiday Park',
          address: '1601 NE 6th Ave, Fort Lauderdale, FL 33304',
          neighborhood: 'Victoria Park',
          lat: 26.1418,
          lng: -80.1248,
          schedule: 'weekly',
          days: [3], // Wednesday
          time: '06:30',
          description: 'Midweek morning group run through Fort Lauderdale neighborhoods. All levels welcome.',
          tags: ['running', 'free-event', 'community', 'outdoor'],
          price: 0,
        },
      ],
    },

    // @discodomingomiami — Disco Domingo at Do Not Sit On The Furniture, every Sunday
    // Source: donotsit.com — documented weekly Sunday disco night
    {
      handle: 'discodomingomiami',
      name: 'Disco Domingo Miami',
      city: 'Miami',
      category: 'Nightlife',
      knownEvents: [
        {
          name: 'Disco Domingo',
          venue: 'Do Not Sit On The Furniture',
          address: '423 16th St, Miami Beach, FL 33139',
          neighborhood: 'South Beach',
          lat: 25.7893,
          lng: -80.1323,
          schedule: 'weekly',
          days: [0], // Sunday
          time: '22:00',
          description: 'The legendary Sunday disco night in Miami. Non-stop dance floor energy with classic disco, funk, and soul spinning until late.',
          tags: ['dj', 'nightlife', 'dancing', 'local-favorite'],
          price: 20,
        },
      ],
    },

    // @lagniappe_miami — Lagniappe House: live jazz Thu–Sun
    // Source: lagniappehouse.com — documented nightly jazz Thu–Sun
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
          neighborhood: 'Midtown',
          lat: 25.8089,
          lng: -80.1917,
          schedule: 'weekly',
          days: [4, 5, 6, 0], // Thu–Sun
          time: '20:00',
          description: 'Live jazz in an intimate wine-bar setting. Rotating wine list, cheese boards, and nightly jazz acts in this beloved Miami institution.',
          tags: ['jazz', 'live-music', 'wine-tasting', 'local-favorite', 'intimate'],
          price: 0,
        },
      ],
    },

    // @miamibloco — Afro-Brazilian drum & dance collective, Sunday at Lummus Park
    {
      handle: 'miamibloco',
      name: 'Miami Bloco',
      city: 'Miami',
      category: 'Music',
      knownEvents: [
        {
          name: 'Miami Bloco: Drum & Dance Practice',
          venue: 'Lummus Park',
          address: '1130 Ocean Dr, Miami Beach, FL 33139',
          neighborhood: 'South Beach',
          lat: 25.7826,
          lng: -80.1304,
          schedule: 'weekly',
          days: [0], // Sunday
          time: '15:00',
          description: 'Miami Bloco Afro-Brazilian drum and dance collective. Open rehearsal and street performance. All are welcome to watch or join.',
          tags: ['live-music', 'free-event', 'outdoor', 'community', 'local-favorite', 'beach'],
          price: 0,
        },
      ],
    },

    // @thestandardmiami — The Standard Spa Miami Beach: Sunday scene on Belle Isle
    // 40 Island Ave — has Sundays with rotating DJs/programming; needs real scrape from standardhotels.com
    {
      handle: 'thestandardmiami',
      name: 'The Standard Spa Miami Beach',
      city: 'Miami',
      category: 'Nightlife',
      knownEvents: [],
    },

    // @gramps_miami — Gramps Wynwood: Reggae Wednesday + Trivia Tuesday (confirmed on gramps.com)
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
          name: 'Gramps: Trivia Tuesday',
          venue: 'Gramps',
          address: '176 NW 24th St, Miami, FL 33127',
          neighborhood: 'Wynwood',
          lat: 25.8010,
          lng: -80.1979,
          schedule: 'weekly',
          days: [2], // Tuesday
          time: '20:00',
          description: 'Weekly bar trivia at Gramps. Teams of up to 6 compete for bar tabs.',
          tags: ['bar', 'community', 'local-favorite'],
          price: 0,
        },
      ],
    },

    // @churchillspub — Churchill's Pub: live music Fri–Sat since 1979 (confirmed)
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
          days: [5, 6], // Fri–Sat
          time: '21:00',
          description: "Live bands at Miami's legendary dive bar. Rock, punk, indie, and everything in between since 1979.",
          tags: ['live-music', 'nightlife', 'local-favorite'],
          price: 10,
        },
      ],
    },

    // @lasrosasmiami — Las Rosas Allapattah (real venue, Fri–Sat DJ programming documented)
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
          days: [5, 6], // Fri–Sat
          time: '22:00',
          description: 'Rotating DJs spinning cumbia to techno at one of Miami\'s coolest neighborhood bars in Allapattah.',
          tags: ['dj', 'nightlife', 'local-favorite', 'dancing', 'underground'],
          price: 0,
        },
      ],
    },

    // @thewharfmiami — The Wharf Miami outdoor waterfront bar (confirmed Fri–Sun, wharfmiami.com)
    {
      handle: 'thewharfmiami',
      name: 'The Wharf Miami',
      city: 'Miami',
      category: 'Nightlife',
      knownEvents: [
        {
          name: 'The Wharf Miami: Weekend',
          venue: 'The Wharf Miami',
          address: '114 SW North River Dr, Miami, FL 33130',
          neighborhood: 'Brickell',
          lat: 25.7692,
          lng: -80.1994,
          schedule: 'weekly',
          days: [5, 6, 0], // Fri–Sun
          time: '17:00',
          description: 'Outdoor waterfront venue with DJs, shipping container bars, food trucks, and Miami River views. Check wharfmiami.com for programming.',
          tags: ['dj', 'nightlife', 'waterfront', 'outdoor', 'local-favorite'],
          price: 0,
        },
      ],
    },

    // @thefernbarftl — The Fern Bar Flagler Village FLL (real bar, weekend DJ programming)
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
          days: [5, 6], // Fri–Sat
          time: '21:00',
          description: 'Weekend DJ nights at The Fern Bar in Flagler Village. Craft cocktails and eclectic music in FTL\'s arts district.',
          tags: ['dj', 'nightlife', 'cocktails', 'local-favorite'],
          price: 0,
        },
      ],
    },

    // @fortlauderdaledowntown — Downtown FTL BID: First Friday Art Walk (confirmed monthly)
    {
      handle: 'fortlauderdaledowntown',
      name: 'Downtown Fort Lauderdale',
      city: 'Fort Lauderdale',
      category: 'Community',
      knownEvents: [
        {
          name: 'First Friday Art Walk',
          venue: 'Downtown Fort Lauderdale',
          address: 'SW 2nd St & Andrews Ave, Fort Lauderdale, FL 33301',
          neighborhood: 'Downtown FLL',
          lat: 26.1189,
          lng: -80.1456,
          schedule: 'monthly',
          time: '18:00',
          description: 'Monthly First Friday art walk in downtown Fort Lauderdale featuring galleries, live music, and food vendors.',
          tags: ['art-gallery', 'free-event', 'local-favorite'],
          price: 0,
        },
      ],
    },

    // ── HOTEL & VENUE PROGRAMMING ─────────────────────────────────────────────
    // POLICY: Only named recurring shows with confirmed ticketing or decades-old tradition.
    // Generic "pool parties", "rooftop DJ" etc. come from HotelEventsScraper (real website data).

    // @miamiedition — BASEMENT at The Miami Beach EDITION (ticketed Fri–Sat, editionhotels.com)
    {
      handle: 'miamiedition',
      name: 'The Miami Beach EDITION',
      city: 'Miami',
      category: 'Nightlife',
      knownEvents: [
        {
          name: 'BASEMENT at The Miami Beach EDITION',
          venue: 'BASEMENT at The Miami Beach EDITION',
          address: '2901 Collins Ave, Miami Beach, FL 33140',
          neighborhood: 'Mid-Beach',
          lat: 25.8121,
          lng: -80.1255,
          schedule: 'weekly',
          days: [5, 6], // Fri–Sat
          time: '23:00',
          description: 'BASEMENT is The Miami Beach EDITION\'s subterranean nightclub and bowling alley. Top-tier DJs, impeccable sound, and an intimate crowd beneath one of Miami Beach\'s most iconic hotels.',
          tags: ['dj', 'nightlife', 'electronic', 'local-favorite', 'dancing'],
          price: 30,
          category: 'Nightlife',
        },
      ],
    },

    // @faenami — Faena Theater: Noche Faena (ticketed Thu–Sat, confirmed on faena.com, $125+)
    {
      handle: 'faenami',
      name: 'Faena Hotel Miami Beach',
      city: 'Miami',
      category: 'Culture',
      knownEvents: [
        {
          name: 'Faena Theater: Noche Faena',
          venue: 'Faena Theater',
          address: '3201 Collins Ave, Miami Beach, FL 33140',
          neighborhood: 'Mid-Beach',
          lat: 25.8112,
          lng: -80.1230,
          schedule: 'weekly',
          days: [4, 5, 6], // Thu–Sat
          time: '21:00',
          description: 'Nightly cabaret and spectacle at Faena Theater — Miami Beach\'s most theatrical venue. Acrobatics, live music, and costume drama inside the Faena Hotel.',
          tags: ['theater', 'live-music', 'local-favorite', 'dancing'],
          price: 125,
          category: 'Culture',
        },
      ],
    },

    // @biltmorehotel — Sunday Jazz Brunch (decades-old tradition, confirmed on biltmorehotel.com)
    {
      handle: 'biltmorehotel',
      name: 'The Biltmore Hotel',
      city: 'Miami',
      category: 'Food & Drink',
      knownEvents: [
        {
          name: 'Sunday Jazz Brunch at The Biltmore',
          venue: 'The Biltmore Hotel',
          address: '1200 Anastasia Ave, Coral Gables, FL 33134',
          neighborhood: 'Coral Gables',
          lat: 25.7267,
          lng: -80.2767,
          schedule: 'weekly',
          days: [0], // Sunday
          time: '11:00',
          description: 'One of Miami\'s most enduring Sunday traditions: live jazz trio, flowing champagne, and an elaborate brunch spread inside the grand Biltmore ballroom.',
          tags: ['brunch', 'live-music', 'jazz', 'local-favorite'],
          price: 85,
          category: 'Food & Drink',
        },
      ],
    },

    // ── MONITORED SOURCES (no confirmed fixed recurring schedule yet) ──────────
    // These are good Instagram sources that post real events. knownEvents: [] because
    // their schedules vary by instance or are duplicated elsewhere.

    // @rawfigspopup — Raw Figs plant-based pop-up dinner (rotating venues — curator must pull from posts)
    // { handle: 'rawfigspopup', name: 'Raw Figs', city: 'Miami', category: 'Food & Drink', knownEvents: [] },

    { handle: 'wynaborhood', name: 'Wynwood Neighborhood', city: 'Miami', category: 'Art', knownEvents: [] },
    { handle: 'baborhood', name: 'Brickell Neighborhood', city: 'Miami', category: 'Community', knownEvents: [] },
    { handle: 'themiamiflea', name: 'The Miami Flea', city: 'Miami', category: 'Community', knownEvents: [] },
    { handle: 'mikiaminightlife', name: 'Miami Nightlife', city: 'Miami', category: 'Nightlife', knownEvents: [] },
    { handle: 'northbeachbandshell', name: 'North Beach Bandshell', city: 'Miami', category: 'Music', knownEvents: [] },
    { handle: 'wiltonmanorsfl', name: 'Wilton Manors', city: 'Fort Lauderdale', category: 'Community', knownEvents: [] },
    { handle: 'lauderale', name: 'Lauder Ale FTL', city: 'Fort Lauderdale', category: 'Community', knownEvents: [] },
    { handle: 'thirdspacesmiami', name: 'Third Spaces Miami', city: 'Miami', category: 'Community', knownEvents: [] },
    { handle: 'miamiconcours', name: 'Miami Concours', city: 'Miami', category: 'Culture', knownEvents: [] },
    { handle: 'miamijazzbooking', name: 'Miami Jazz Booking', city: 'Miami', category: 'Music', knownEvents: [] },
    { handle: 'coffeeandchillmiami', name: 'Coffee and Chill Miami', city: 'Miami', category: 'Community', knownEvents: [] },
    { handle: 'wynwood_yoga', name: 'Wynwood Yoga', city: 'Miami', category: 'Wellness', knownEvents: [] },
    { handle: 'wynwoodmiami', name: 'Wynwood Miami', city: 'Miami', category: 'Art', knownEvents: [] },
    { handle: 'coffeeandbeatsofficial', name: 'Coffee and Beats', city: 'Miami', category: 'Community', knownEvents: [] },
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
      category: event.category ?? account.category,
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
