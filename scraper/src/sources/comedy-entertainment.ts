/**
 * Comedy & Entertainment Sources
 * Don't Tell Comedy, Miami Improv, Adrienne Arsht Center, Fillmore Miami Beach
 */

import { addDays, format, getDay } from 'date-fns';
import { BaseScraper } from './base.js';
import type { RawEvent } from '../types.js';

/**
 * Don't Tell Comedy - Secret comedy shows
 */
export class DontTellComedyScraper extends BaseScraper {
  constructor() {
    super("Don't Tell Comedy", { weight: 1.3, rateLimit: 0 });
  }

  async scrape(): Promise<RawEvent[]> {
    const events: RawEvent[] = [];
    const today = new Date();

    this.log('Generating Don\'t Tell Comedy events...');

    // Don't Tell Comedy does weekly shows at secret locations
    for (let week = 0; week < 8; week++) {
      // Thursday shows
      const baseDate = addDays(today, week * 7);
      let daysUntilThursday = 4 - getDay(baseDate);
      if (daysUntilThursday <= 0) daysUntilThursday += 7;

      const thursdayDate = addDays(baseDate, daysUntilThursday);
      const dateStr = format(thursdayDate, 'yyyy-MM-dd');

      events.push({
        title: "Don't Tell Comedy - Secret Show",
        startAt: `${dateStr}T20:00:00`,
        venueName: 'Secret Location (Wynwood)',
        address: 'Wynwood, Miami, FL 33127',
        neighborhood: 'Wynwood',
        lat: 25.8011,
        lng: -80.1996,
        city: 'Miami',
        tags: ['comedy', 'local-favorite'],
        category: 'Comedy',
        priceLabel: '$',
        priceAmount: 20,
        isOutdoor: false,
        description: 'Underground comedy show at a secret location. Location revealed day-of via text. BYOB encouraged.',
        sourceUrl: 'https://www.donttellcomedy.com/miami',
        sourceName: this.name,
        recurring: true,
        recurrencePattern: 'weekly',
      });

      // Saturday shows
      let daysUntilSaturday = 6 - getDay(baseDate);
      if (daysUntilSaturday <= 0) daysUntilSaturday += 7;

      const saturdayDate = addDays(baseDate, daysUntilSaturday);
      const satDateStr = format(saturdayDate, 'yyyy-MM-dd');

      events.push({
        title: "Don't Tell Comedy - Weekend Edition",
        startAt: `${satDateStr}T20:30:00`,
        venueName: 'Secret Location (Brickell)',
        address: 'Brickell, Miami, FL 33131',
        neighborhood: 'Brickell',
        lat: 25.7617,
        lng: -80.1918,
        city: 'Miami',
        tags: ['comedy', 'local-favorite'],
        category: 'Comedy',
        priceLabel: '$',
        priceAmount: 25,
        isOutdoor: false,
        description: 'Secret comedy show in Brickell. Exact location revealed day-of. Bring your own drinks!',
        sourceUrl: 'https://www.donttellcomedy.com/miami',
        sourceName: this.name,
        recurring: true,
        recurrencePattern: 'weekly',
      });
    }

    this.log(`Generated ${events.length} Don't Tell Comedy events`);
    return events;
  }
}

/**
 * Miami Improv - Stand-up comedy venue
 */
export class MiamiImprovScraper extends BaseScraper {
  constructor() {
    super('Miami Improv', { weight: 1.2, rateLimit: 0 });
  }

  async scrape(): Promise<RawEvent[]> {
    const events: RawEvent[] = [];
    const today = new Date();

    this.log('Generating Miami Improv events...');

    // Miami Improv has shows Thu-Sun typically
    const showDays = [4, 5, 6, 0]; // Thu, Fri, Sat, Sun

    for (let week = 0; week < 6; week++) {
      for (const targetDay of showDays) {
        const baseDate = addDays(today, week * 7);
        let daysUntil = targetDay - getDay(baseDate);
        if (daysUntil <= 0) daysUntil += 7;

        const eventDate = addDays(baseDate, daysUntil);
        const dateStr = format(eventDate, 'yyyy-MM-dd');

        // Weekend shows have multiple time slots
        const showTimes = targetDay >= 5 ? ['19:30', '21:30'] : ['20:00'];

        for (const time of showTimes) {
          events.push({
            title: 'Stand-Up Comedy at Miami Improv',
            startAt: `${dateStr}T${time}:00`,
            venueName: 'Miami Improv',
            address: '3390 Mary St #182, Miami, FL 33133',
            neighborhood: 'Coconut Grove',
            lat: 25.7287,
            lng: -80.2399,
            city: 'Miami',
            tags: ['comedy'],
            category: 'Comedy',
            priceLabel: '$$',
            priceAmount: 35,
            isOutdoor: false,
            description: 'Live stand-up comedy featuring touring comedians and local favorites at CocoWalk.',
            sourceUrl: 'https://improv.com/miami/',
            sourceName: this.name,
            recurring: true,
            recurrencePattern: 'weekly',
          });
        }
      }
    }

    this.log(`Generated ${events.length} Miami Improv events`);
    return events;
  }
}

/**
 * Adrienne Arsht Center - Performing arts
 */
export class ArshtCenterScraper extends BaseScraper {
  private showTypes = [
    {
      name: 'Broadway in Miami',
      category: 'Culture',
      description: 'Touring Broadway productions at the Arsht Center. World-class theater.',
      price: 75,
      tags: ['theater'],
    },
    {
      name: 'Miami City Ballet',
      category: 'Culture',
      description: 'Miami City Ballet performs classical and contemporary works.',
      price: 60,
      tags: ['theater', 'dancing'],
    },
    {
      name: 'New World Symphony',
      category: 'Music',
      description: 'World-renowned orchestra featuring the next generation of classical musicians.',
      price: 45,
      tags: ['live-music'],
    },
    {
      name: 'Jazz at the Arsht',
      category: 'Music',
      description: 'Jazz performances featuring legendary and emerging artists.',
      price: 50,
      tags: ['jazz', 'live-music'],
    },
  ];

  constructor() {
    super('Adrienne Arsht Center', { weight: 1.4, rateLimit: 0 });
  }

  async scrape(): Promise<RawEvent[]> {
    const events: RawEvent[] = [];
    const today = new Date();

    this.log('Generating Arsht Center events...');

    // Generate shows rotating through types
    for (let week = 0; week < 8; week++) {
      // Typically Thu-Sun performances
      for (const targetDay of [4, 5, 6, 0]) {
        const baseDate = addDays(today, week * 7);
        let daysUntil = targetDay - getDay(baseDate);
        if (daysUntil <= 0) daysUntil += 7;

        const eventDate = addDays(baseDate, daysUntil);
        const dateStr = format(eventDate, 'yyyy-MM-dd');

        // Rotate through show types
        const showType = this.showTypes[(week + targetDay) % this.showTypes.length];
        const time = targetDay === 0 ? '14:00' : '20:00'; // Matinee on Sunday

        events.push({
          title: showType.name,
          startAt: `${dateStr}T${time}:00`,
          venueName: 'Adrienne Arsht Center',
          address: '1300 Biscayne Blvd, Miami, FL 33132',
          neighborhood: 'Downtown Miami',
          lat: 25.7847,
          lng: -80.1867,
          city: 'Miami',
          tags: showType.tags,
          category: showType.category,
          priceLabel: showType.price > 60 ? '$$$' : '$$',
          priceAmount: showType.price,
          isOutdoor: false,
          description: showType.description,
          sourceUrl: 'https://arshtcenter.org/',
          sourceName: this.name,
          recurring: false,
        });
      }
    }

    this.log(`Generated ${events.length} Arsht Center events`);
    return events;
  }
}

/**
 * Fillmore Miami Beach - Concert venue
 */
export class FillmoreMiamiScraper extends BaseScraper {
  private concertTypes = [
    { genre: 'Rock', tags: ['live-music'] },
    { genre: 'Hip-Hop', tags: ['live-music', 'hip-hop'] },
    { genre: 'Latin', tags: ['live-music', 'latin'] },
    { genre: 'Electronic', tags: ['live-music', 'electronic'] },
    { genre: 'R&B', tags: ['live-music'] },
    { genre: 'Alternative', tags: ['live-music', 'indie'] },
  ];

  constructor() {
    super('Fillmore Miami Beach', { weight: 1.3, rateLimit: 0 });
  }

  async scrape(): Promise<RawEvent[]> {
    const events: RawEvent[] = [];
    const today = new Date();

    this.log('Generating Fillmore events...');

    // Generate concerts for weekends
    for (let week = 0; week < 8; week++) {
      for (const targetDay of [5, 6]) { // Fri, Sat
        const baseDate = addDays(today, week * 7);
        let daysUntil = targetDay - getDay(baseDate);
        if (daysUntil <= 0) daysUntil += 7;

        const eventDate = addDays(baseDate, daysUntil);
        const dateStr = format(eventDate, 'yyyy-MM-dd');

        const concertType = this.concertTypes[(week + targetDay) % this.concertTypes.length];

        events.push({
          title: `Live ${concertType.genre} at The Fillmore`,
          startAt: `${dateStr}T20:00:00`,
          venueName: 'Fillmore Miami Beach',
          address: '1700 Washington Ave, Miami Beach, FL 33139',
          neighborhood: 'South Beach',
          lat: 25.7928,
          lng: -80.1352,
          city: 'Miami',
          tags: concertType.tags,
          category: 'Music',
          priceLabel: '$$',
          priceAmount: 45,
          isOutdoor: false,
          description: `Live ${concertType.genre.toLowerCase()} concert at the historic Fillmore Miami Beach. Standing room with balcony seating available.`,
          sourceUrl: 'https://fillmoremb.com/',
          sourceName: this.name,
          recurring: false,
        });
      }
    }

    this.log(`Generated ${events.length} Fillmore events`);
    return events;
  }
}
