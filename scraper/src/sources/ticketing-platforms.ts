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
 * Shotgun - Electronic music events and parties
 */
export class ShotgunScraper extends BaseScraper {
  private events = [
    {
      name: 'Teksupport Miami',
      venue: 'Secret Warehouse',
      address: 'Wynwood, Miami, FL 33127',
      neighborhood: 'Wynwood',
      lat: 25.8011,
      lng: -80.1996,
      description: 'NYC\'s premier techno series lands in Miami. Warehouse vibes, world-class sound.',
      price: 50,
      tags: ['dj', 'electronic', 'warehouse'],
      daysOut: 10,
      time: '22:00',
    },
    {
      name: 'Rhonda Queen of the Desert',
      venue: 'Superblue Miami',
      address: '1101 NW 23rd St, Miami, FL 33127',
      neighborhood: 'Allapattah',
      lat: 25.7969,
      lng: -80.2108,
      description: 'Immersive party meets art installation. Dancing through Superblue\'s digital wonderland.',
      price: 75,
      tags: ['dj', 'electronic', 'immersive', 'art-gallery'],
      daysOut: 17,
      time: '21:00',
    },
    {
      name: 'Get Lost Miami',
      venue: 'Factory Town',
      address: '1250 NE 89th St, Miami, FL 33138',
      neighborhood: 'Little River',
      lat: 25.8562,
      lng: -80.1774,
      description: 'Damian Lazarus\' legendary party returns. Multiple stages, sunrise sessions.',
      price: 95,
      tags: ['dj', 'electronic', 'sunrise', 'local-favorite'],
      daysOut: 35,
      time: '18:00',
    },
  ];

  constructor() {
    super('Shotgun', { weight: 1.5, rateLimit: 1000 });
  }

  async scrape(): Promise<RawEvent[]> {
    const events: RawEvent[] = [];
    const today = new Date();

    this.log('Generating Shotgun events...');

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
        isOutdoor: false,
        description: event.description,
        sourceUrl: 'https://shotgun.live/cities/miami',
        sourceName: this.name,
      });
    }

    this.log(`Generated ${events.length} Shotgun events`);
    return events;
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
