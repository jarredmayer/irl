/**
 * Cultural Venues Scraper
 * Only actual events - no generic "visit" listings
 */

import { addDays, format, getDay } from 'date-fns';
import { BaseScraper } from './base.js';
import type { RawEvent } from '../types.js';

interface CulturalEvent {
  name: string;
  venue: string;
  address: string;
  neighborhood: string;
  lat: number;
  lng: number;
  url: string;
  schedule: 'weekly' | 'monthly' | 'first-friday' | 'third-thursday';
  days?: number[];
  time: string;
  description: string;
  price: number;
  tags: string[];
}

export class CulturalVenuesScraper extends BaseScraper {
  // Only actual events, not generic visits
  private events: CulturalEvent[] = [
    // PAMM - Third Thursday
    {
      name: 'Third Thursday at PAMM',
      venue: 'Pérez Art Museum Miami (PAMM)',
      address: '1103 Biscayne Blvd, Miami, FL 33132',
      neighborhood: 'Downtown Miami',
      lat: 25.7857,
      lng: -80.1863,
      url: 'https://www.pamm.org/',
      schedule: 'third-thursday',
      time: '18:00',
      description: 'Free admission evening with live music, art workshops, and cocktails overlooking Biscayne Bay.',
      price: 0,
      tags: ['museum', 'free-event', 'live-music', 'local-favorite'],
    },
    // ICA Miami - always free
    {
      name: 'ICA Miami Free Admission',
      venue: 'Institute of Contemporary Art Miami',
      address: '61 NE 41st St, Miami, FL 33137',
      neighborhood: 'Design District',
      lat: 25.8133,
      lng: -80.1924,
      url: 'https://icamiami.org/',
      schedule: 'weekly',
      days: [4, 5, 6, 0], // Thu-Sun
      time: '12:00',
      description: 'Always-free contemporary art museum in the Design District. New exhibitions rotate regularly.',
      price: 0,
      tags: ['museum', 'art-gallery', 'free-event'],
    },
    // Wynwood Art Walk
    {
      name: 'Wynwood Art Walk',
      venue: 'Wynwood Walls',
      address: '2520 NW 2nd Ave, Miami, FL 33127',
      neighborhood: 'Wynwood',
      lat: 25.8011,
      lng: -80.1996,
      url: 'https://www.wynwoodwalls.com/',
      schedule: 'weekly',
      days: [6], // Saturday
      time: '18:00',
      description: 'Galleries stay open late, street performers, and new murals to discover. The original Miami art walk.',
      price: 0,
      tags: ['art-gallery', 'free-event', 'local-favorite'],
    },
    // Fairchild - The Ramble (monthly)
    {
      name: 'The Ramble at Fairchild',
      venue: 'Fairchild Tropical Botanic Garden',
      address: '10901 Old Cutler Rd, Coral Gables, FL 33156',
      neighborhood: 'Coral Gables',
      lat: 25.6761,
      lng: -80.2748,
      url: 'https://fairchildgarden.org/',
      schedule: 'monthly',
      days: [6], // First Saturday
      time: '10:00',
      description: 'Monthly garden festival with live music, craft vendors, food trucks, and kids activities among rare tropical plants.',
      price: 25,
      tags: ['park', 'family-friendly', 'live-music', 'food-market', 'local-favorite'],
    },
    // Vizcaya Live
    {
      name: 'Vizcaya Live',
      venue: 'Vizcaya Museum and Gardens',
      address: '3251 S Miami Ave, Miami, FL 33129',
      neighborhood: 'Coconut Grove',
      lat: 25.7445,
      lng: -80.2106,
      url: 'https://vizcaya.org/',
      schedule: 'weekly',
      days: [5], // Friday
      time: '18:00',
      description: 'Live music in the gardens of the historic Vizcaya estate. Wine, cocktails, and sunset views.',
      price: 30,
      tags: ['live-music', 'park', 'sunset', 'local-favorite'],
    },
    // Wolfsonian Free Friday
    {
      name: 'Wolfsonian Free Friday',
      venue: 'The Wolfsonian-FIU',
      address: '1001 Washington Ave, Miami Beach, FL 33139',
      neighborhood: 'South Beach',
      lat: 25.7804,
      lng: -80.1355,
      url: 'https://wolfsonian.org/',
      schedule: 'weekly',
      days: [5], // Friday
      time: '18:00',
      description: 'Free admission Friday evenings at this unique design and propaganda art museum.',
      price: 0,
      tags: ['museum', 'free-event'],
    },
    // Bass Museum First Saturday
    {
      name: 'First Saturday at The Bass',
      venue: 'The Bass',
      address: '2100 Collins Ave, Miami Beach, FL 33139',
      neighborhood: 'South Beach',
      lat: 25.7953,
      lng: -80.1319,
      url: 'https://thebass.org/',
      schedule: 'first-friday',
      time: '18:00',
      description: 'Extended hours and special programming at South Beach\'s contemporary art museum.',
      price: 0,
      tags: ['museum', 'art-gallery', 'free-event'],
    },
  ];

  constructor() {
    super('Cultural Venues', { weight: 1.4, rateLimit: 0 });
  }

  async scrape(): Promise<RawEvent[]> {
    const events: RawEvent[] = [];
    const weeksAhead = 6;

    this.log(`Generating cultural events for next ${weeksAhead} weeks...`);

    for (const event of this.events) {
      const generated = this.generateEvents(event, weeksAhead);
      events.push(...generated);
    }

    this.log(`Generated ${events.length} cultural events`);
    return events;
  }

  private generateEvents(event: CulturalEvent, weeksAhead: number): RawEvent[] {
    const results: RawEvent[] = [];
    const today = new Date();

    switch (event.schedule) {
      case 'weekly':
        for (let week = 0; week < weeksAhead; week++) {
          for (const targetDay of event.days || []) {
            const baseDate = addDays(today, week * 7);
            let daysUntil = targetDay - getDay(baseDate);
            if (daysUntil < 0) daysUntil += 7;
            const eventDate = addDays(baseDate, daysUntil);
            if (eventDate >= today) {
              results.push(this.createEvent(event, eventDate));
            }
          }
        }
        break;

      case 'monthly':
      case 'first-friday':
        // First Saturday/Friday of each month
        for (let month = 0; month < 3; month++) {
          const firstOfMonth = new Date(today.getFullYear(), today.getMonth() + month, 1);
          const targetDay = event.schedule === 'first-friday' ? 5 : 6;
          let eventDate = firstOfMonth;
          while (getDay(eventDate) !== targetDay) {
            eventDate = addDays(eventDate, 1);
          }
          if (eventDate >= today) {
            results.push(this.createEvent(event, eventDate));
          }
        }
        break;

      case 'third-thursday':
        // Third Thursday of each month
        for (let month = 0; month < 3; month++) {
          const firstOfMonth = new Date(today.getFullYear(), today.getMonth() + month, 1);
          let thursdayCount = 0;
          let eventDate = firstOfMonth;
          while (thursdayCount < 3) {
            if (getDay(eventDate) === 4) thursdayCount++;
            if (thursdayCount < 3) eventDate = addDays(eventDate, 1);
          }
          if (eventDate >= today) {
            results.push(this.createEvent(event, eventDate));
          }
        }
        break;
    }

    return results;
  }

  private createEvent(event: CulturalEvent, date: Date): RawEvent {
    const dateStr = format(date, 'yyyy-MM-dd');
    return {
      title: event.name,
      startAt: `${dateStr}T${event.time}:00`,
      venueName: event.venue,
      address: event.address,
      neighborhood: event.neighborhood,
      lat: event.lat,
      lng: event.lng,
      city: 'Miami',
      tags: event.tags,
      category: 'Culture',
      priceLabel: event.price === 0 ? 'Free' : event.price < 20 ? '$' : '$$',
      priceAmount: event.price,
      isOutdoor: event.tags.includes('park'),
      description: event.description,
      sourceUrl: event.url,
      sourceName: this.name,
      recurring: true,
      recurrencePattern: event.schedule,
    };
  }
}
