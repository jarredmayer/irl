/**
 * Food & Drink Event Sources
 * The Infatuation, Eater Miami, Miami Spice, SOBEWFF
 */

import { addDays, format, getDay } from 'date-fns';
import { BaseScraper } from './base.js';
import type { RawEvent } from '../types.js';

/**
 * Pop-up dinners and food events
 */
export class FoodEventsScraper extends BaseScraper {
  private popUpDinners = [
    {
      name: 'Dinner Lab Miami',
      neighborhood: 'Wynwood',
      lat: 25.8011,
      lng: -80.1996,
      description: 'Underground pop-up dinner featuring emerging chefs. Unique venue, surprise menu.',
      price: 85,
    },
    {
      name: 'Secret Supper Club',
      neighborhood: 'Design District',
      lat: 25.8133,
      lng: -80.1924,
      description: 'Intimate pop-up dining experience in the Design District. Multi-course tasting menu.',
      price: 125,
    },
    {
      name: 'Rooftop Chef\'s Table',
      neighborhood: 'Brickell',
      lat: 25.7617,
      lng: -80.1918,
      description: 'Exclusive rooftop dining with panoramic city views. Guest chef series.',
      price: 150,
    },
  ];

  private happyHours = [
    {
      name: 'Sweet Liberty',
      address: '237 20th St, Miami Beach, FL 33139',
      neighborhood: 'South Beach',
      lat: 25.7956,
      lng: -80.1367,
      description: 'Award-winning cocktail bar with daily happy hour. Classic and creative cocktails.',
    },
    {
      name: 'Broken Shaker',
      address: '2727 Indian Creek Dr, Miami Beach, FL 33140',
      neighborhood: 'Mid-Beach',
      lat: 25.8089,
      lng: -80.1267,
      description: 'Garden bar at Freehand Miami. Craft cocktails in a tropical setting.',
    },
    {
      name: 'Sugar',
      address: '788 Brickell Plaza, Miami, FL 33131',
      neighborhood: 'Brickell',
      lat: 25.7652,
      lng: -80.1900,
      description: 'Rooftop bar at EAST Miami with skyline views. Asian-inspired cocktails and small plates.',
    },
    {
      name: 'Baby Jane',
      address: '500 Brickell Key Dr, Miami, FL 33131',
      neighborhood: 'Brickell Key',
      lat: 25.7678,
      lng: -80.1839,
      description: 'Waterfront bar on Brickell Key with sunset views and craft cocktails.',
    },
  ];

  constructor() {
    super('Food Events', { weight: 1.2, rateLimit: 0 });
  }

  async scrape(): Promise<RawEvent[]> {
    const events: RawEvent[] = [];
    const today = new Date();

    this.log('Generating food & drink events...');

    // Generate pop-up dinners (bi-weekly)
    for (let week = 0; week < 8; week += 2) {
      const popUp = this.popUpDinners[Math.floor(week / 2) % this.popUpDinners.length];

      // Friday or Saturday
      const baseDate = addDays(today, week * 7);
      let daysUntil = 5 - getDay(baseDate); // Friday
      if (daysUntil <= 0) daysUntil += 7;

      const eventDate = addDays(baseDate, daysUntil);
      const dateStr = format(eventDate, 'yyyy-MM-dd');

      events.push({
        title: popUp.name,
        startAt: `${dateStr}T19:30:00`,
        venueName: 'Secret Location',
        address: `${popUp.neighborhood}, Miami, FL`,
        neighborhood: popUp.neighborhood,
        lat: popUp.lat,
        lng: popUp.lng,
        city: 'Miami',
        tags: ['pop-up', 'local-favorite'],
        category: 'Food & Drink',
        priceLabel: '$$$',
        priceAmount: popUp.price,
        isOutdoor: false,
        description: popUp.description,
        sourceName: this.name,
        recurring: false,
      });
    }

    // Generate happy hours (daily, Mon-Fri)
    for (let week = 0; week < 4; week++) {
      for (const targetDay of [1, 2, 3, 4, 5]) { // Mon-Fri
        const baseDate = addDays(today, week * 7);
        let daysUntil = targetDay - getDay(baseDate);
        if (daysUntil <= 0) daysUntil += 7;

        const eventDate = addDays(baseDate, daysUntil);
        const dateStr = format(eventDate, 'yyyy-MM-dd');

        const venue = this.happyHours[(week + targetDay) % this.happyHours.length];

        events.push({
          title: `Happy Hour at ${venue.name}`,
          startAt: `${dateStr}T17:00:00`,
          venueName: venue.name,
          address: venue.address,
          neighborhood: venue.neighborhood,
          lat: venue.lat,
          lng: venue.lng,
          city: 'Miami',
          tags: ['happy-hour', 'cocktails'],
          category: 'Food & Drink',
          priceLabel: '$',
          priceAmount: 12,
          isOutdoor: venue.name === 'Broken Shaker' || venue.name === 'Baby Jane',
          description: venue.description,
          sourceName: this.name,
          recurring: true,
          recurrencePattern: 'weekly',
        });
      }
    }

    this.log(`Generated ${events.length} food & drink events`);
    return events;
  }
}

/**
 * Miami Spice - Restaurant week (seasonal)
 */
export class MiamiSpiceScraper extends BaseScraper {
  private restaurants = [
    { name: 'Juvia', neighborhood: 'South Beach', lat: 25.7904, lng: -80.1399 },
    { name: 'Komodo', neighborhood: 'Brickell', lat: 25.7658, lng: -80.1921 },
    { name: 'Zuma', neighborhood: 'Downtown Miami', lat: 25.7692, lng: -80.1879 },
    { name: 'Cecconi\'s', neighborhood: 'South Beach', lat: 25.7867, lng: -80.1301 },
    { name: 'KYU', neighborhood: 'Wynwood', lat: 25.8011, lng: -80.1996 },
    { name: 'Mandolin', neighborhood: 'Design District', lat: 25.8133, lng: -80.1924 },
  ];

  constructor() {
    super('Miami Spice', { weight: 1.5, rateLimit: 0 });
  }

  async scrape(): Promise<RawEvent[]> {
    const events: RawEvent[] = [];
    const today = new Date();
    const currentMonth = today.getMonth();

    this.log('Checking Miami Spice season...');

    // Miami Spice runs August 1 - September 30
    if (currentMonth >= 7 && currentMonth <= 8) {
      this.log('Miami Spice is in season!');

      for (const restaurant of this.restaurants) {
        // Generate daily events during the season
        for (let day = 0; day < 30; day++) {
          const eventDate = addDays(today, day);
          const dateStr = format(eventDate, 'yyyy-MM-dd');

          events.push({
            title: `Miami Spice at ${restaurant.name}`,
            startAt: `${dateStr}T19:00:00`,
            venueName: restaurant.name,
            address: `${restaurant.neighborhood}, Miami, FL`,
            neighborhood: restaurant.neighborhood,
            lat: restaurant.lat,
            lng: restaurant.lng,
            city: 'Miami',
            tags: ['local-favorite'],
            category: 'Food & Drink',
            priceLabel: '$$',
            priceAmount: 60,
            isOutdoor: false,
            description: `Miami Spice dinner at ${restaurant.name}. $60 three-course prix-fixe menu celebrating Miami\'s culinary scene.`,
            sourceUrl: 'https://www.miamiandbeaches.com/miami-spice',
            sourceName: this.name,
            recurring: false,
          });
        }
      }
    } else {
      this.log('Miami Spice is not in season (Aug-Sep only)');
    }

    this.log(`Generated ${events.length} Miami Spice events`);
    return events;
  }
}

/**
 * South Beach Wine & Food Festival (seasonal)
 */
export class SOBEWFFScraper extends BaseScraper {
  constructor() {
    super('SOBEWFF', { weight: 1.5, rateLimit: 0 });
  }

  async scrape(): Promise<RawEvent[]> {
    const events: RawEvent[] = [];
    const today = new Date();
    const currentMonth = today.getMonth();

    this.log('Checking SOBEWFF season...');

    // SOBEWFF typically happens in February
    if (currentMonth === 1 || currentMonth === 0) {
      this.log('SOBEWFF season approaching!');

      const festivalStart = new Date(today.getFullYear(), 1, 20); // Feb 20

      if (festivalStart > today) {
        const festivalEvents = [
          {
            name: 'Burger Bash',
            description: 'Celebrity chefs compete for the best burger. Unlimited tastings and drinks.',
            price: 300,
            time: '20:00',
            dayOffset: 0,
          },
          {
            name: 'Best of the Best',
            description: 'Grand finale featuring Miami\'s top restaurants and chefs.',
            price: 350,
            time: '19:00',
            dayOffset: 1,
          },
          {
            name: 'Tacos After Dark',
            description: 'Late-night taco party with top chefs. Unlimited tacos and margaritas.',
            price: 275,
            time: '22:00',
            dayOffset: 2,
          },
          {
            name: 'Goya Foods Grand Tasting Village',
            description: 'Two-day outdoor food and wine festival on the beach.',
            price: 200,
            time: '12:00',
            dayOffset: 3,
          },
        ];

        for (const event of festivalEvents) {
          const eventDate = addDays(festivalStart, event.dayOffset);
          const dateStr = format(eventDate, 'yyyy-MM-dd');

          events.push({
            title: `SOBEWFF: ${event.name}`,
            startAt: `${dateStr}T${event.time}:00`,
            venueName: 'South Beach',
            address: 'Miami Beach, FL 33139',
            neighborhood: 'South Beach',
            lat: 25.7796,
            lng: -80.1303,
            city: 'Miami',
            tags: ['local-favorite', 'food-market'],
            category: 'Food & Drink',
            priceLabel: '$$$',
            priceAmount: event.price,
            isOutdoor: event.name.includes('Village'),
            description: event.description,
            sourceUrl: 'https://sobewff.org/',
            sourceName: this.name,
            recurring: false,
          });
        }
      }
    } else {
      this.log('SOBEWFF is not in season (February only)');
    }

    this.log(`Generated ${events.length} SOBEWFF events`);
    return events;
  }
}

/**
 * Wine tastings and culinary experiences
 */
export class WineTastingsScraper extends BaseScraper {
  private venues = [
    {
      name: 'The Wine Room of Brickell',
      address: '1438 S Miami Ave, Miami, FL 33130',
      neighborhood: 'Brickell',
      lat: 25.7589,
      lng: -80.1956,
      description: 'Self-pour wine bar with over 150 wines. Charcuterie and light bites.',
      days: [3, 4, 5, 6], // Wed-Sat
      time: '18:00',
      price: 35,
    },
    {
      name: 'Luca Osteria',
      address: '116 Giralda Ave, Coral Gables, FL 33134',
      neighborhood: 'Coral Gables',
      lat: 25.7508,
      lng: -80.2592,
      description: 'Italian wine bar and restaurant. Weekly wine flights and tastings.',
      days: [4, 5], // Thu, Fri
      time: '17:30',
      price: 45,
    },
    {
      name: 'Cork & Bottle',
      address: '1655 Michigan Ave, Miami Beach, FL 33139',
      neighborhood: 'South Beach',
      lat: 25.7899,
      lng: -80.1399,
      description: 'Neighborhood wine shop with weekly tastings and pairing events.',
      days: [5], // Friday
      time: '18:00',
      price: 25,
    },
  ];

  constructor() {
    super('Wine Tastings', { weight: 1.1, rateLimit: 0 });
  }

  async scrape(): Promise<RawEvent[]> {
    const events: RawEvent[] = [];
    const today = new Date();

    this.log('Generating wine tasting events...');

    for (const venue of this.venues) {
      for (let week = 0; week < 6; week++) {
        for (const targetDay of venue.days) {
          const baseDate = addDays(today, week * 7);
          let daysUntil = targetDay - getDay(baseDate);
          if (daysUntil <= 0) daysUntil += 7;

          const eventDate = addDays(baseDate, daysUntil);
          const dateStr = format(eventDate, 'yyyy-MM-dd');

          events.push({
            title: `Wine Tasting at ${venue.name}`,
            startAt: `${dateStr}T${venue.time}:00`,
            venueName: venue.name,
            address: venue.address,
            neighborhood: venue.neighborhood,
            lat: venue.lat,
            lng: venue.lng,
            city: 'Miami',
            tags: ['wine-tasting', 'happy-hour'],
            category: 'Food & Drink',
            priceLabel: venue.price > 35 ? '$$' : '$',
            priceAmount: venue.price,
            isOutdoor: false,
            description: venue.description,
            sourceName: this.name,
            recurring: true,
            recurrencePattern: 'weekly',
          });
        }
      }
    }

    this.log(`Generated ${events.length} wine tasting events`);
    return events;
  }
}
