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

  // One-time and monthly pop-up events — updated March 2026
  // Note: recurring monthly events generate dates for the next 4 months
  private oneTimePopUps: OneTimePopUp[] = [
    // Wynwood Food Truck Rally — last Friday of the month
    ...(['2026-03-27', '2026-04-24', '2026-05-29', '2026-06-26'] as const).map(date => ({
      name: 'Wynwood Food Truck Rally',
      date,
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
    })),
    // Design District Second Saturday Art Night
    ...(['2026-03-14', '2026-04-11', '2026-05-09', '2026-06-13'] as const).map(date => ({
      name: 'Design District Second Saturday Art Night',
      date,
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
    })),
    // Miami Flea Market — every Sunday at Hialeah Park
    ...(['2026-03-01', '2026-03-08', '2026-03-15', '2026-03-22', '2026-03-29',
         '2026-04-05', '2026-04-12', '2026-04-19', '2026-04-26',
         '2026-05-03', '2026-05-10', '2026-05-17', '2026-05-24', '2026-05-31',
         '2026-06-07', '2026-06-14'] as const).map(date => ({
      name: 'Miami Flea Market',
      date,
      time: '10:00',
      venue: 'Hialeah Park Racing & Casino',
      address: '2200 E 4th Ave, Hialeah, FL 33013',
      neighborhood: 'Hialeah',
      lat: 25.8310,
      lng: -80.2767,
      category: 'Shopping',
      description: 'Outdoor flea market with vintage finds, antiques, and unique treasures. Over 500 vendors.',
      tags: ['pop-up', 'shopping', 'outdoor', 'vintage'],
      price: 2,
      sourceUrl: 'https://miamiflea.com/',
    })),
    // Smorgasburg Miami — weekly Sundays
    ...(['2026-03-08', '2026-03-15', '2026-03-22', '2026-03-29',
         '2026-04-05', '2026-04-12', '2026-04-19', '2026-04-26',
         '2026-05-03', '2026-05-10'] as const).map(date => ({
      name: 'Smorgasburg Miami',
      date,
      time: '11:00',
      venue: 'Wynwood Marketplace',
      address: '2250 NW 2nd Ave, Miami, FL 33127',
      neighborhood: 'Wynwood',
      lat: 25.7986,
      lng: -80.1994,
      category: 'Food & Drink',
      description: 'Brooklyn\'s famous open-air food market. 50+ food vendors, local makers, and live entertainment.',
      tags: ['food', 'pop-up', 'outdoor', 'local-favorite'],
      price: 0,
      sourceUrl: 'https://www.smorgasburg.com/',
    })),
    // Brickell Night Market — first Friday of the month
    ...(['2026-03-06', '2026-04-03', '2026-05-01', '2026-06-05'] as const).map(date => ({
      name: 'Brickell Night Market',
      date,
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
    })),
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
