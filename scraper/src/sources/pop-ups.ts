/**
 * Pop-Ups Scraper
 * Food pop-ups, sample sales, art shows, and temporary events
 */

import { addDays, format, getDay, nextSaturday, nextSunday } from 'date-fns';
import { BaseScraper } from './base.js';
import type { RawEvent } from '../types.js';

interface RecurringPopUp {
  name: string;
  venue: string;
  address: string;
  neighborhood: string;
  lat: number;
  lng: number;
  days: number[]; // 0 = Sunday, 6 = Saturday
  time: string;
  category: string;
  description: string;
  tags: string[];
  price: number;
  sourceUrl: string;
}

interface OneTimePopUp {
  name: string;
  date: string;
  endDate?: string;
  time: string;
  venue: string;
  address: string;
  neighborhood: string;
  lat: number;
  lng: number;
  category: string;
  description: string;
  tags: string[];
  price: number;
  sourceUrl: string;
}

export class PopUpsScraper extends BaseScraper {
  // Recurring pop-ups and markets
  private recurringPopUps: RecurringPopUp[] = [
    // 260 Sample Sale - Weekly designer sales
    {
      name: '260 Sample Sale Weekly Drop',
      venue: '260 Sample Sale',
      address: '2450 NW 2nd Ave, Miami, FL 33127',
      neighborhood: 'Wynwood',
      lat: 25.7986,
      lng: -80.1996,
      days: [2, 3, 4, 5, 6], // Tue-Sat
      time: '11:00',
      category: 'Shopping',
      description: 'Weekly rotating designer sample sales with up to 80% off luxury brands. New drops every week.',
      tags: ['pop-up', 'shopping', 'fashion', 'deals'],
      price: 0,
      sourceUrl: 'https://260samplesale.com/',
    },
    // Wynwood Art Walk (Second Saturday)
    {
      name: 'Wynwood Art Walk',
      venue: 'Wynwood Arts District',
      address: 'NW 2nd Ave, Miami, FL 33127',
      neighborhood: 'Wynwood',
      lat: 25.8010,
      lng: -80.1995,
      days: [6], // Saturday (second Saturday of month)
      time: '18:00',
      category: 'Art',
      description: 'Monthly art walk through Wynwood galleries. Free gallery openings, street art, live music, and food trucks.',
      tags: ['art', 'free', 'outdoor', 'local-favorite'],
      price: 0,
      sourceUrl: 'https://wynwoodmiami.com/',
    },
    // The Salty Donut Pop-Ups
    {
      name: 'The Salty Donut Weekend Specials',
      venue: 'The Salty Donut',
      address: '50 NW 23rd St, Miami, FL 33127',
      neighborhood: 'Wynwood',
      lat: 25.7993,
      lng: -80.1949,
      days: [6, 0], // Sat, Sun
      time: '08:00',
      category: 'Food & Drink',
      description: 'Weekend-only special donut flavors. Limited batch artisan donuts that sell out fast.',
      tags: ['food', 'pop-up', 'local-favorite', 'brunch'],
      price: 0,
      sourceUrl: 'https://saltydonut.com/',
    },
  ];

  // One-time pop-up events
  private oneTimePopUps: OneTimePopUp[] = [
    // PopUp Bagels Opening
    {
      name: 'PopUp Bagels Grand Opening - Aventura',
      date: '2026-02-01',
      time: '08:00',
      venue: 'PopUp Bagels Aventura',
      address: 'Aventura Mall, 19501 Biscayne Blvd, Aventura, FL 33180',
      neighborhood: 'Aventura',
      lat: 25.9564,
      lng: -80.1426,
      category: 'Food & Drink',
      description: 'NYC cult-favorite PopUp Bagels opens in Miami. Hand-rolled bagels and loaded schmears.',
      tags: ['food', 'pop-up', 'new-opening', 'local-favorite'],
      price: 0,
      sourceUrl: 'https://www.popupbagels.com/',
    },
    // Kitchen + Kocktails Opening
    {
      name: 'Kitchen + Kocktails by Kevin Kelley Opening',
      date: '2026-01-17',
      time: '17:00',
      venue: 'Kitchen + Kocktails',
      address: '2620 NW 5th Ave, Miami, FL 33127',
      neighborhood: 'Wynwood',
      lat: 25.8021,
      lng: -80.2007,
      category: 'Food & Drink',
      description: 'Dallas-born modern Southern comfort food comes to Wynwood. Bold cocktails, vibey atmosphere.',
      tags: ['food', 'new-opening', 'cocktails', 'local-favorite'],
      price: 0,
      sourceUrl: 'https://kocktailsmiami.com/',
    },
    // Food Truck Rally
    {
      name: 'Wynwood Food Truck Rally',
      date: '2026-01-31',
      time: '18:00',
      venue: 'Wynwood Marketplace',
      address: '2250 NW 2nd Ave, Miami, FL 33127',
      neighborhood: 'Wynwood',
      lat: 25.7986,
      lng: -80.1994,
      category: 'Food & Drink',
      description: 'Monthly food truck gathering with 15+ trucks, live music, and local vendors.',
      tags: ['food', 'outdoor', 'local-favorite', 'family-friendly'],
      price: 0,
      sourceUrl: 'https://wynwoodmarketplace.com/',
    },
    {
      name: 'Wynwood Food Truck Rally',
      date: '2026-02-28',
      time: '18:00',
      venue: 'Wynwood Marketplace',
      address: '2250 NW 2nd Ave, Miami, FL 33127',
      neighborhood: 'Wynwood',
      lat: 25.7986,
      lng: -80.1994,
      category: 'Food & Drink',
      description: 'Monthly food truck gathering with 15+ trucks, live music, and local vendors.',
      tags: ['food', 'outdoor', 'local-favorite', 'family-friendly'],
      price: 0,
      sourceUrl: 'https://wynwoodmarketplace.com/',
    },
    // Art pop-ups
    {
      name: 'Design District Second Saturday Art Night',
      date: '2026-02-14',
      time: '18:00',
      venue: 'Miami Design District',
      address: '140 NE 39th St, Miami, FL 33137',
      neighborhood: 'Design District',
      lat: 25.8133,
      lng: -80.1924,
      category: 'Art',
      description: 'Monthly art night in the Design District. Gallery openings, pop-up exhibitions, and special events.',
      tags: ['art', 'free', 'local-favorite'],
      price: 0,
      sourceUrl: 'https://www.miamidesigndistrict.net/',
    },
    {
      name: 'Design District Second Saturday Art Night',
      date: '2026-03-14',
      time: '18:00',
      venue: 'Miami Design District',
      address: '140 NE 39th St, Miami, FL 33137',
      neighborhood: 'Design District',
      lat: 25.8133,
      lng: -80.1924,
      category: 'Art',
      description: 'Monthly art night in the Design District. Gallery openings, pop-up exhibitions, and special events.',
      tags: ['art', 'free', 'local-favorite'],
      price: 0,
      sourceUrl: 'https://www.miamidesigndistrict.net/',
    },
    // Vintage/Flea Markets
    {
      name: 'Miami Flea Market',
      date: '2026-01-26',
      time: '10:00',
      venue: 'Hialeah Park Racing & Casino',
      address: '2200 E 4th Ave, Hialeah, FL 33013',
      neighborhood: 'Hialeah',
      lat: 25.8310,
      lng: -80.2767,
      category: 'Shopping',
      description: 'Massive outdoor flea market with vintage finds, antiques, and unique treasures. Over 500 vendors.',
      tags: ['pop-up', 'shopping', 'outdoor', 'vintage'],
      price: 2,
      sourceUrl: 'https://miamiflea.com/',
    },
    {
      name: 'Miami Flea Market',
      date: '2026-02-02',
      time: '10:00',
      venue: 'Hialeah Park Racing & Casino',
      address: '2200 E 4th Ave, Hialeah, FL 33013',
      neighborhood: 'Hialeah',
      lat: 25.8310,
      lng: -80.2767,
      category: 'Shopping',
      description: 'Massive outdoor flea market with vintage finds, antiques, and unique treasures. Over 500 vendors.',
      tags: ['pop-up', 'shopping', 'outdoor', 'vintage'],
      price: 2,
      sourceUrl: 'https://miamiflea.com/',
    },
    {
      name: 'Miami Flea Market',
      date: '2026-02-09',
      time: '10:00',
      venue: 'Hialeah Park Racing & Casino',
      address: '2200 E 4th Ave, Hialeah, FL 33013',
      neighborhood: 'Hialeah',
      lat: 25.8310,
      lng: -80.2767,
      category: 'Shopping',
      description: 'Massive outdoor flea market with vintage finds, antiques, and unique treasures. Over 500 vendors.',
      tags: ['pop-up', 'shopping', 'outdoor', 'vintage'],
      price: 2,
      sourceUrl: 'https://miamiflea.com/',
    },
    // Smorgasburg coming to Miami
    {
      name: 'Smorgasburg Miami',
      date: '2026-02-08',
      time: '11:00',
      venue: 'Wynwood Marketplace',
      address: '2250 NW 2nd Ave, Miami, FL 33127',
      neighborhood: 'Wynwood',
      lat: 25.7986,
      lng: -80.1994,
      category: 'Food & Drink',
      description: 'Brooklyn\'s famous open-air food market comes to Miami. 50+ food vendors, local makers, and live entertainment.',
      tags: ['food', 'pop-up', 'outdoor', 'local-favorite'],
      price: 0,
      sourceUrl: 'https://www.smorgasburg.com/',
    },
    {
      name: 'Smorgasburg Miami',
      date: '2026-02-15',
      time: '11:00',
      venue: 'Wynwood Marketplace',
      address: '2250 NW 2nd Ave, Miami, FL 33127',
      neighborhood: 'Wynwood',
      lat: 25.7986,
      lng: -80.1994,
      category: 'Food & Drink',
      description: 'Brooklyn\'s famous open-air food market comes to Miami. 50+ food vendors, local makers, and live entertainment.',
      tags: ['food', 'pop-up', 'outdoor', 'local-favorite'],
      price: 0,
      sourceUrl: 'https://www.smorgasburg.com/',
    },
    {
      name: 'Smorgasburg Miami',
      date: '2026-02-22',
      time: '11:00',
      venue: 'Wynwood Marketplace',
      address: '2250 NW 2nd Ave, Miami, FL 33127',
      neighborhood: 'Wynwood',
      lat: 25.7986,
      lng: -80.1994,
      category: 'Food & Drink',
      description: 'Brooklyn\'s famous open-air food market comes to Miami. 50+ food vendors, local makers, and live entertainment.',
      tags: ['food', 'pop-up', 'outdoor', 'local-favorite'],
      price: 0,
      sourceUrl: 'https://www.smorgasburg.com/',
    },
    // Brickell Night Market
    {
      name: 'Brickell Night Market',
      date: '2026-02-06',
      time: '18:00',
      venue: 'Brickell City Centre',
      address: '701 S Miami Ave, Miami, FL 33131',
      neighborhood: 'Brickell',
      lat: 25.7650,
      lng: -80.1936,
      category: 'Food & Drink',
      description: 'Monthly night market in Brickell with food vendors, artisan goods, and live music.',
      tags: ['food', 'pop-up', 'nightlife', 'local-favorite'],
      price: 0,
      sourceUrl: 'https://brickellcitycentre.com/',
    },
    {
      name: 'Brickell Night Market',
      date: '2026-03-06',
      time: '18:00',
      venue: 'Brickell City Centre',
      address: '701 S Miami Ave, Miami, FL 33131',
      neighborhood: 'Brickell',
      lat: 25.7650,
      lng: -80.1936,
      category: 'Food & Drink',
      description: 'Monthly night market in Brickell with food vendors, artisan goods, and live music.',
      tags: ['food', 'pop-up', 'nightlife', 'local-favorite'],
      price: 0,
      sourceUrl: 'https://brickellcitycentre.com/',
    },
  ];

  constructor() {
    super('Pop-Ups', { weight: 1.3, rateLimit: 0 });
  }

  async scrape(): Promise<RawEvent[]> {
    const events: RawEvent[] = [];
    const today = new Date();

    this.log('Generating pop-up events...');

    // Generate recurring pop-up events
    for (const popup of this.recurringPopUps) {
      // Generate 4 weeks of recurring events
      for (let week = 0; week < 4; week++) {
        for (const day of popup.days) {
          const baseDate = addDays(today, week * 7);
          let daysUntil = day - getDay(baseDate);
          if (daysUntil < 0) daysUntil += 7;
          if (daysUntil === 0 && week === 0) continue; // Skip today

          const eventDate = addDays(baseDate, daysUntil);

          // For monthly events (Art Walk), only generate on second Saturday
          if (popup.name.includes('Art Walk')) {
            const dayOfMonth = eventDate.getDate();
            if (dayOfMonth < 8 || dayOfMonth > 14) continue; // Second Saturday is between 8-14
          }

          if (eventDate > today) {
            const dateStr = format(eventDate, 'yyyy-MM-dd');
            events.push({
              title: popup.name,
              startAt: `${dateStr}T${popup.time}:00`,
              venueName: popup.venue,
              address: popup.address,
              neighborhood: popup.neighborhood,
              lat: popup.lat,
              lng: popup.lng,
              city: 'Miami',
              tags: popup.tags,
              category: popup.category,
              priceLabel: popup.price === 0 ? 'Free' : '$',
              priceAmount: popup.price,
              isOutdoor: popup.tags.includes('outdoor'),
              description: popup.description,
              sourceUrl: popup.sourceUrl,
              sourceName: this.name,
              recurring: true,
              recurrencePattern: 'weekly',
            });
          }
        }
      }
    }

    // Add one-time pop-up events
    for (const popup of this.oneTimePopUps) {
      const eventDate = new Date(popup.date);
      if (eventDate >= today) {
        events.push({
          title: popup.name,
          startAt: `${popup.date}T${popup.time}:00`,
          venueName: popup.venue,
          address: popup.address,
          neighborhood: popup.neighborhood,
          lat: popup.lat,
          lng: popup.lng,
          city: 'Miami',
          tags: popup.tags,
          category: popup.category,
          priceLabel: popup.price === 0 ? 'Free' : '$',
          priceAmount: popup.price,
          isOutdoor: popup.tags.includes('outdoor'),
          description: popup.description,
          sourceUrl: popup.sourceUrl,
          sourceName: this.name,
          recurring: false,
        });
      }
    }

    this.log(`Generated ${events.length} pop-up events`);
    return events;
  }
}
