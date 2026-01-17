/**
 * Miami Farmers Markets Source
 * Generates recurring farmer market events
 */

import { addDays, addWeeks, format, nextSaturday, nextSunday, nextFriday } from 'date-fns';
import { BaseScraper } from './base.js';
import type { RawEvent } from '../types.js';

interface MarketInfo {
  name: string;
  address: string;
  neighborhood: string;
  lat: number;
  lng: number;
  schedule: 'saturday' | 'sunday' | 'friday' | 'weekend';
  time: string;
  description: string;
}

export class FarmersMarketsScraper extends BaseScraper {
  private markets: MarketInfo[] = [
    {
      name: 'Coconut Grove Farmers Market',
      address: '3300 Grand Ave, Coconut Grove, FL 33133',
      neighborhood: 'Coconut Grove',
      lat: 25.7291,
      lng: -80.2419,
      schedule: 'saturday',
      time: '09:00',
      description: 'Weekly farmers market with fresh produce, artisan goods, live music, and community vibes.',
    },
    {
      name: 'Lincoln Road Farmers Market',
      address: 'Lincoln Rd, Miami Beach, FL 33139',
      neighborhood: 'South Beach',
      lat: 25.7904,
      lng: -80.1399,
      schedule: 'sunday',
      time: '09:00',
      description: 'Sunday farmers market on Lincoln Road featuring local produce, artisan goods, and street vendors.',
    },
    {
      name: 'Smorgasburg Miami',
      address: 'Museum Park, 1075 Biscayne Blvd, Miami, FL 33132',
      neighborhood: 'Downtown Miami',
      lat: 25.7847,
      lng: -80.1867,
      schedule: 'sunday',
      time: '11:00',
      description: 'Weekly open-air food market featuring 40+ local vendors, artisans, and food makers.',
    },
    {
      name: 'Coral Gables Farmers Market',
      address: '405 Biltmore Way, Coral Gables, FL 33134',
      neighborhood: 'Coral Gables',
      lat: 25.7508,
      lng: -80.2592,
      schedule: 'saturday',
      time: '08:00',
      description: 'Saturday morning farmers market featuring fresh produce, artisan goods, and local vendors.',
    },
    {
      name: 'Legion Park Farmers Market',
      address: '6447 NE 7th Ave, Miami, FL 33138',
      neighborhood: 'Little Haiti',
      lat: 25.8245,
      lng: -80.1829,
      schedule: 'saturday',
      time: '09:00',
      description: 'Community farmers market at Legion Park with local produce and artisan vendors.',
    },
    {
      name: 'Surfside Farmers Market',
      address: '9301 Collins Ave, Surfside, FL 33154',
      neighborhood: 'Surfside',
      lat: 25.8768,
      lng: -80.1245,
      schedule: 'weekend',
      time: '09:30',
      description: 'Weekend farmers market in Surfside with fresh produce and beach yoga on Sundays.',
    },
    {
      name: 'Vizcaya Village Farmers Market',
      address: '3251 S Miami Ave, Miami, FL 33129',
      neighborhood: 'Coconut Grove',
      lat: 25.7453,
      lng: -80.2104,
      schedule: 'sunday',
      time: '09:00',
      description: 'Sunday morning farmers market near Vizcaya Museum with fresh local produce and baked goods.',
    },
    {
      name: 'Vizcaya Night Market',
      address: '3251 S Miami Ave, Miami, FL 33129',
      neighborhood: 'Coconut Grove',
      lat: 25.7453,
      lng: -80.2104,
      schedule: 'friday',
      time: '18:00',
      description: 'Evening market at Vizcaya with local vendors, food trucks, live music under the stars.',
    },
    {
      name: 'Pinecrest Gardens Artisan Market',
      address: '11000 Red Rd, Pinecrest, FL 33156',
      neighborhood: 'Pinecrest',
      lat: 25.6664,
      lng: -80.3049,
      schedule: 'sunday',
      time: '10:00',
      description: 'Monthly artisan market featuring local artists, sculptors, and craftspeople.',
    },
  ];

  constructor() {
    super('Farmers Markets', { weight: 1.2, rateLimit: 0 });
  }

  async scrape(): Promise<RawEvent[]> {
    const events: RawEvent[] = [];
    const weeksAhead = 8;

    this.log(`Generating farmers market events for next ${weeksAhead} weeks...`);

    for (const market of this.markets) {
      const marketEvents = this.generateMarketEvents(market, weeksAhead);
      events.push(...marketEvents);
    }

    this.log(`Generated ${events.length} farmers market events`);
    return events;
  }

  private generateMarketEvents(market: MarketInfo, weeksAhead: number): RawEvent[] {
    const events: RawEvent[] = [];
    const today = new Date();

    for (let week = 0; week < weeksAhead; week++) {
      const baseDate = addWeeks(today, week);
      const dates: Date[] = [];

      switch (market.schedule) {
        case 'saturday':
          dates.push(nextSaturday(baseDate));
          break;
        case 'sunday':
          dates.push(nextSunday(baseDate));
          break;
        case 'friday':
          dates.push(nextFriday(baseDate));
          break;
        case 'weekend':
          dates.push(nextSaturday(baseDate));
          dates.push(nextSunday(baseDate));
          break;
      }

      for (const eventDate of dates) {
        // Skip dates in the past
        if (eventDate < today) continue;

        const dateStr = format(eventDate, 'yyyy-MM-dd');
        const startAt = `${dateStr}T${market.time}:00`;

        events.push({
          title: market.name,
          startAt,
          venueName: market.name,
          address: market.address,
          neighborhood: market.neighborhood,
          lat: market.lat,
          lng: market.lng,
          city: 'Miami',
          tags: ['food-market', 'local-favorite', 'free-event'],
          category: 'Food & Drink',
          priceLabel: 'Free',
          priceAmount: 0,
          isOutdoor: true,
          description: market.description,
          sourceName: this.name,
          recurring: true,
          recurrencePattern: 'weekly',
        });
      }
    }

    return events;
  }
}
