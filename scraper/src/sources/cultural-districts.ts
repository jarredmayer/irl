/**
 * Cultural Districts & Estates
 * Miami Design District, Deering Estate, festivals
 */

import { addDays, format, getDay } from 'date-fns';
import { BaseScraper } from './base.js';
import type { RawEvent } from '../types.js';

/**
 * Miami Design District Events
 */
export class DesignDistrictScraper extends BaseScraper {
  private events = [
    {
      name: 'Design District Art Walk',
      time: '18:00',
      day: 6, // Saturday
      description: 'Explore world-class galleries, public art installations, and luxury boutiques. Galleries open late with special exhibitions.',
      tags: ['art-gallery', 'free-event', 'local-favorite'],
      price: 0,
    },
    {
      name: 'Design District Live Music Series',
      time: '19:00',
      day: 5, // Friday
      description: 'Live music performances in the Palm Court. Local and touring artists in an open-air setting.',
      tags: ['live-music', 'free-event'],
      price: 0,
    },
    {
      name: 'Design District Wellness Morning',
      time: '09:00',
      day: 6, // Saturday
      description: 'Free outdoor yoga and wellness classes in the Design District. All levels welcome.',
      tags: ['yoga', 'free-event', 'community'],
      price: 0,
    },
  ];

  constructor() {
    super('Design District', { weight: 1.3, rateLimit: 0 });
  }

  async scrape(): Promise<RawEvent[]> {
    const events: RawEvent[] = [];
    const today = new Date();

    this.log('Generating Design District events...');

    for (const event of this.events) {
      for (let week = 0; week < 6; week++) {
        const baseDate = addDays(today, week * 7);
        let daysUntil = event.day - getDay(baseDate);
        if (daysUntil < 0) daysUntil += 7;
        const eventDate = addDays(baseDate, daysUntil);

        if (eventDate >= today) {
          const dateStr = format(eventDate, 'yyyy-MM-dd');
          events.push({
            title: event.name,
            startAt: `${dateStr}T${event.time}:00`,
            venueName: 'Miami Design District',
            address: '140 NE 39th St, Miami, FL 33137',
            neighborhood: 'Design District',
            lat: 25.8133,
            lng: -80.1924,
            city: 'Miami',
            tags: event.tags,
            category: event.tags.includes('yoga') ? 'Wellness' : 'Art',
            priceLabel: 'Free',
            priceAmount: event.price,
            isOutdoor: true,
            description: event.description,
            sourceUrl: 'https://www.miamidesigndistrict.net/calendar/',
            sourceName: this.name,
            recurring: true,
            recurrencePattern: 'weekly',
          });
        }
      }
    }

    this.log(`Generated ${events.length} Design District events`);
    return events;
  }
}

/**
 * Deering Estate Events
 */
export class DeeringEstateScraper extends BaseScraper {
  private events = [
    {
      name: 'Deering Estate Sunset Concert',
      time: '18:00',
      day: 5, // Friday (monthly)
      schedule: 'monthly',
      description: 'Live music on the waterfront lawn at sunset. Bring blankets and picnics. Wine and beer available.',
      tags: ['live-music', 'sunset', 'waterfront', 'local-favorite'],
      price: 25,
    },
    {
      name: 'Deering Estate Full Moon Tour',
      time: '19:00',
      day: 6, // Saturday (monthly around full moon)
      schedule: 'monthly',
      description: 'Guided moonlit tour of the historic estate and natural areas. Explore the grounds under the full moon.',
      tags: ['park', 'local-favorite'],
      price: 30,
    },
    {
      name: 'Deering Estate Nature Walk',
      time: '10:00',
      day: 6, // Saturday
      schedule: 'weekly',
      description: 'Guided nature walk through the estate\'s hardwood hammock and mangrove forests. Learn about native wildlife.',
      tags: ['park', 'family-friendly'],
      price: 15,
    },
  ];

  constructor() {
    super('Deering Estate', { weight: 1.3, rateLimit: 0 });
  }

  async scrape(): Promise<RawEvent[]> {
    const events: RawEvent[] = [];
    const today = new Date();

    this.log('Generating Deering Estate events...');

    for (const event of this.events) {
      const iterations = event.schedule === 'monthly' ? 3 : 6;
      const interval = event.schedule === 'monthly' ? 30 : 7;

      for (let i = 0; i < iterations; i++) {
        const baseDate = addDays(today, i * interval);
        let daysUntil = event.day - getDay(baseDate);
        if (daysUntil < 0) daysUntil += 7;
        const eventDate = addDays(baseDate, daysUntil);

        if (eventDate >= today) {
          const dateStr = format(eventDate, 'yyyy-MM-dd');
          events.push({
            title: event.name,
            startAt: `${dateStr}T${event.time}:00`,
            venueName: 'Deering Estate',
            address: '16701 SW 72nd Ave, Miami, FL 33157',
            neighborhood: 'Palmetto Bay',
            lat: 25.6147,
            lng: -80.3089,
            city: 'Miami',
            tags: event.tags,
            category: 'Culture',
            priceLabel: event.price > 20 ? '$$' : '$',
            priceAmount: event.price,
            isOutdoor: true,
            description: event.description,
            sourceUrl: 'https://deeringestate.org/deering-events/',
            sourceName: this.name,
            recurring: true,
            recurrencePattern: event.schedule,
          });
        }
      }
    }

    this.log(`Generated ${events.length} Deering Estate events`);
    return events;
  }
}

/**
 * Annual Festivals - Beaux Arts, Orchid Festival, etc.
 */
export class MiamiFestivalsScraper extends BaseScraper {
  private festivals = [
    {
      name: 'Beaux Arts Festival of Art',
      venue: 'University of Miami',
      address: '1320 S Dixie Hwy, Coral Gables, FL 33146',
      neighborhood: 'Coral Gables',
      lat: 25.7215,
      lng: -80.2768,
      month: 0, // January
      dayOfMonth: 11, // Second weekend
      duration: 2,
      description: 'Annual outdoor fine arts festival featuring 200+ artists. Paintings, sculpture, jewelry, photography, and more.',
      tags: ['art-gallery', 'local-favorite', 'family-friendly'],
      price: 0,
    },
    {
      name: 'Tamiami International Orchid Festival',
      venue: 'Tamiami Park',
      address: '11201 SW 24th St, Miami, FL 33165',
      neighborhood: 'Tamiami',
      lat: 25.7549,
      lng: -80.3637,
      month: 0, // January
      dayOfMonth: 18, // Third weekend
      duration: 2,
      description: 'One of the largest orchid festivals in the world. Thousands of orchids for sale, expert talks, and displays.',
      tags: ['park', 'family-friendly', 'local-favorite'],
      price: 15,
    },
    {
      name: 'Coconut Grove Arts Festival',
      venue: 'Coconut Grove',
      address: 'McFarlane Road, Coconut Grove, FL 33133',
      neighborhood: 'Coconut Grove',
      lat: 25.7271,
      lng: -80.2415,
      month: 1, // February
      dayOfMonth: 15, // Presidents Day weekend
      duration: 3,
      description: 'One of America\'s top-ranked arts festivals. 300+ artists, live music, food vendors along the bayfront.',
      tags: ['art-gallery', 'live-music', 'local-favorite', 'food-market'],
      price: 0,
    },
    {
      name: 'Carnaval Miami / Calle Ocho',
      venue: 'Calle Ocho',
      address: 'SW 8th St, Miami, FL 33135',
      neighborhood: 'Little Havana',
      lat: 25.7653,
      lng: -80.2156,
      month: 2, // March
      dayOfMonth: 8, // Second Sunday
      duration: 1,
      description: 'The largest Hispanic festival in the country. 23 blocks of live music, food, dancing, and Latin culture.',
      tags: ['live-music', 'latin', 'dancing', 'free-event', 'local-favorite'],
      price: 0,
    },
  ];

  constructor() {
    super('Miami Festivals', { weight: 1.5, rateLimit: 0 });
  }

  async scrape(): Promise<RawEvent[]> {
    const events: RawEvent[] = [];
    const today = new Date();
    const currentYear = today.getFullYear();

    this.log('Generating Miami festival events...');

    for (const festival of this.festivals) {
      // Check this year and next year
      for (const year of [currentYear, currentYear + 1]) {
        const festivalDate = new Date(year, festival.month, festival.dayOfMonth);

        // Only include if festival is in the future and within 6 months
        const sixMonthsOut = addDays(today, 180);
        if (festivalDate >= today && festivalDate <= sixMonthsOut) {
          for (let day = 0; day < festival.duration; day++) {
            const eventDate = addDays(festivalDate, day);
            const dateStr = format(eventDate, 'yyyy-MM-dd');

            events.push({
              title: festival.name,
              startAt: `${dateStr}T10:00:00`,
              venueName: festival.venue,
              address: festival.address,
              neighborhood: festival.neighborhood,
              lat: festival.lat,
              lng: festival.lng,
              city: 'Miami',
              tags: festival.tags,
              category: 'Culture',
              priceLabel: festival.price === 0 ? 'Free' : '$',
              priceAmount: festival.price,
              isOutdoor: true,
              description: festival.description,
              sourceUrl: 'https://www.miamiandbeaches.com/events',
              sourceName: this.name,
              recurring: false,
            });
          }
        }
      }
    }

    this.log(`Generated ${events.length} festival events`);
    return events;
  }
}

/**
 * Regatta Grove / Regatta Park Events
 */
export class RegattaGroveScraper extends BaseScraper {
  private events = [
    {
      name: 'Regatta Grove Market',
      time: '10:00',
      day: 0, // Sunday
      description: 'Waterfront market in Coconut Grove with local vendors, food trucks, and live music.',
      tags: ['food-market', 'live-music', 'waterfront', 'free-event'],
      price: 0,
    },
    {
      name: 'Sunset Yoga at Regatta Park',
      time: '18:00',
      day: 6, // Saturday
      description: 'Free sunset yoga on the waterfront lawn. All levels welcome. Bring your own mat.',
      tags: ['yoga', 'sunset', 'waterfront', 'free-event'],
      price: 0,
    },
  ];

  constructor() {
    super('Regatta Grove', { weight: 1.2, rateLimit: 0 });
  }

  async scrape(): Promise<RawEvent[]> {
    const events: RawEvent[] = [];
    const today = new Date();

    this.log('Generating Regatta Grove events...');

    for (const event of this.events) {
      for (let week = 0; week < 6; week++) {
        const baseDate = addDays(today, week * 7);
        let daysUntil = event.day - getDay(baseDate);
        if (daysUntil < 0) daysUntil += 7;
        const eventDate = addDays(baseDate, daysUntil);

        if (eventDate >= today) {
          const dateStr = format(eventDate, 'yyyy-MM-dd');
          events.push({
            title: event.name,
            startAt: `${dateStr}T${event.time}:00`,
            venueName: 'Regatta Park',
            address: '3500 Pan American Dr, Miami, FL 33133',
            neighborhood: 'Coconut Grove',
            lat: 25.7271,
            lng: -80.2358,
            city: 'Miami',
            tags: event.tags,
            category: event.tags.includes('yoga') ? 'Wellness' : 'Community',
            priceLabel: 'Free',
            priceAmount: event.price,
            isOutdoor: true,
            description: event.description,
            sourceUrl: 'https://www.coconutgrove.com/regatta-park',
            sourceName: this.name,
            recurring: true,
            recurrencePattern: 'weekly',
          });
        }
      }
    }

    this.log(`Generated ${events.length} Regatta Grove events`);
    return events;
  }
}

/**
 * South Pointe Park Events
 */
export class SouthPointeParkScraper extends BaseScraper {
  private events = [
    {
      name: 'Sunrise Yoga at South Pointe',
      time: '07:00',
      day: 6, // Saturday
      description: 'Free sunrise yoga with ocean views at the tip of South Beach. Watch cruise ships pass as you practice.',
      tags: ['yoga', 'sunrise', 'beach', 'free-event'],
      price: 0,
    },
    {
      name: 'South Pointe Sunset Meditation',
      time: '18:00',
      day: 0, // Sunday
      description: 'Guided meditation session at sunset. Find peace watching the sun set over the Port of Miami.',
      tags: ['meditation', 'sunset', 'beach', 'free-event'],
      price: 0,
    },
  ];

  constructor() {
    super('South Pointe Park', { weight: 1.2, rateLimit: 0 });
  }

  async scrape(): Promise<RawEvent[]> {
    const events: RawEvent[] = [];
    const today = new Date();

    this.log('Generating South Pointe Park events...');

    for (const event of this.events) {
      for (let week = 0; week < 6; week++) {
        const baseDate = addDays(today, week * 7);
        let daysUntil = event.day - getDay(baseDate);
        if (daysUntil < 0) daysUntil += 7;
        const eventDate = addDays(baseDate, daysUntil);

        if (eventDate >= today) {
          const dateStr = format(eventDate, 'yyyy-MM-dd');
          events.push({
            title: event.name,
            startAt: `${dateStr}T${event.time}:00`,
            venueName: 'South Pointe Park',
            address: '1 Washington Ave, Miami Beach, FL 33139',
            neighborhood: 'South Beach',
            lat: 25.7646,
            lng: -80.1341,
            city: 'Miami',
            tags: event.tags,
            category: 'Wellness',
            priceLabel: 'Free',
            priceAmount: event.price,
            isOutdoor: true,
            description: event.description,
            sourceName: this.name,
            recurring: true,
            recurrencePattern: 'weekly',
          });
        }
      }
    }

    this.log(`Generated ${events.length} South Pointe Park events`);
    return events;
  }
}
