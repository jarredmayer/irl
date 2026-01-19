/**
 * Community & Lifestyle Sources
 * Coffee & Chill, Diplo Run Club, @soflo.popups, local wellness
 */

import { addDays, format, getDay } from 'date-fns';
import { BaseScraper } from './base.js';
import type { RawEvent } from '../types.js';

/**
 * Coffee & Chill - Coffee meetups and community events
 */
export class CoffeeAndChillScraper extends BaseScraper {
  private events = [
    {
      name: 'Coffee & Chill Wynwood',
      venue: 'Panther Coffee',
      address: '2390 NW 2nd Ave, Miami, FL 33127',
      neighborhood: 'Wynwood',
      lat: 25.7978,
      lng: -80.1994,
      day: 6, // Saturday
      time: '09:00',
      description: 'Weekly coffee meetup for creatives, freelancers, and anyone who wants to connect over great coffee.',
    },
    {
      name: 'Coffee & Chill Brickell',
      venue: 'All Day',
      address: '1035 S Miami Ave, Miami, FL 33130',
      neighborhood: 'Brickell',
      lat: 25.7617,
      lng: -80.1918,
      day: 0, // Sunday
      time: '10:00',
      description: 'Sunday morning coffee hangout in Brickell. Meet locals, make friends, caffeinate.',
    },
  ];

  constructor() {
    super('Coffee & Chill', { weight: 1.2, rateLimit: 0 });
  }

  async scrape(): Promise<RawEvent[]> {
    const events: RawEvent[] = [];
    const today = new Date();

    this.log('Generating Coffee & Chill events...');

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
            venueName: event.venue,
            address: event.address,
            neighborhood: event.neighborhood,
            lat: event.lat,
            lng: event.lng,
            city: 'Miami',
            tags: ['community', 'free-event', 'local-favorite'],
            category: 'Community',
            priceLabel: 'Free',
            priceAmount: 0,
            isOutdoor: false,
            description: event.description,
            sourceUrl: 'https://www.instagram.com/coffeeandchill.miami/',
            sourceName: this.name,
            recurring: true,
            recurrencePattern: 'weekly',
          });
        }
      }
    }

    this.log(`Generated ${events.length} Coffee & Chill events`);
    return events;
  }
}

/**
 * Diplo's Run Club - Weekly run club
 */
export class DiploRunClubScraper extends BaseScraper {
  constructor() {
    super('Diplo Run Club', { weight: 1.3, rateLimit: 0 });
  }

  async scrape(): Promise<RawEvent[]> {
    const events: RawEvent[] = [];
    const today = new Date();

    this.log('Generating Diplo Run Club events...');

    // Diplo's Run Club meets on Tuesdays
    for (let week = 0; week < 8; week++) {
      const baseDate = addDays(today, week * 7);
      let daysUntil = 2 - getDay(baseDate); // Tuesday
      if (daysUntil < 0) daysUntil += 7;
      const eventDate = addDays(baseDate, daysUntil);

      if (eventDate >= today) {
        const dateStr = format(eventDate, 'yyyy-MM-dd');
        events.push({
          title: "Diplo's Run Club",
          startAt: `${dateStr}T18:30:00`,
          venueName: 'South Pointe Park',
          address: '1 Washington Ave, Miami Beach, FL 33139',
          neighborhood: 'South Beach',
          lat: 25.7646,
          lng: -80.1341,
          city: 'Miami',
          tags: ['running', 'free-event', 'local-favorite', 'community'],
          category: 'Fitness',
          priceLabel: 'Free',
          priceAmount: 0,
          isOutdoor: true,
          description: 'Weekly run club founded by Diplo. 5K route along the beach, all levels welcome. Stay for stretches and socializing after.',
          sourceUrl: 'https://www.instagram.com/diplosrunclub/',
          sourceName: this.name,
          recurring: true,
          recurrencePattern: 'weekly',
        });
      }
    }

    this.log(`Generated ${events.length} Diplo Run Club events`);
    return events;
  }
}

/**
 * SoFlo Popups - Pop-up markets and events
 */
export class SoFloPopupsScraper extends BaseScraper {
  private popups = [
    {
      name: 'SoFlo Flea Market',
      venue: 'Various Locations',
      neighborhood: 'Miami',
      description: 'Curated flea market featuring local vintage vendors, artisans, and food trucks.',
      price: 0,
      tags: ['food-market', 'local-favorite', 'free-event'],
    },
    {
      name: 'SoFlo Night Market',
      venue: 'Various Locations',
      neighborhood: 'Miami',
      description: 'Evening market with local makers, street food, live music, and drinks.',
      price: 0,
      tags: ['food-market', 'live-music', 'free-event'],
    },
  ];

  constructor() {
    super('SoFlo Popups', { weight: 1.3, rateLimit: 0 });
  }

  async scrape(): Promise<RawEvent[]> {
    const events: RawEvent[] = [];
    const today = new Date();

    this.log('Generating SoFlo Popups events...');

    // Monthly events
    for (let month = 0; month < 3; month++) {
      for (const popup of this.popups) {
        // Find a weekend day
        const baseDate = addDays(today, month * 30);
        let daysUntil = 6 - getDay(baseDate); // Saturday
        if (daysUntil <= 0) daysUntil += 7;
        const eventDate = addDays(baseDate, daysUntil + (month * 7) % 14);

        if (eventDate >= today) {
          const dateStr = format(eventDate, 'yyyy-MM-dd');
          const time = popup.name.includes('Night') ? '17:00' : '10:00';

          events.push({
            title: popup.name,
            startAt: `${dateStr}T${time}:00`,
            venueName: popup.venue,
            address: 'Miami, FL',
            neighborhood: popup.neighborhood,
            lat: 25.7617,
            lng: -80.1918,
            city: 'Miami',
            tags: popup.tags,
            category: 'Community',
            priceLabel: 'Free',
            priceAmount: popup.price,
            isOutdoor: true,
            description: popup.description,
            sourceUrl: 'https://www.instagram.com/soflo.popups/',
            sourceName: this.name,
            recurring: true,
            recurrencePattern: 'monthly',
          });
        }
      }
    }

    this.log(`Generated ${events.length} SoFlo Popups events`);
    return events;
  }
}
