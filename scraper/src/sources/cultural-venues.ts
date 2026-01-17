/**
 * Cultural Venues Scraper
 * Museums, galleries, and cultural institutions
 */

import { addDays, format, getDay, nextThursday, nextFriday, nextSaturday } from 'date-fns';
import { BaseScraper } from './base.js';
import type { RawEvent } from '../types.js';

interface CulturalVenue {
  name: string;
  address: string;
  neighborhood: string;
  lat: number;
  lng: number;
  url: string;
  regularEvents: RegularEvent[];
}

interface RegularEvent {
  name: string;
  days: number[]; // 0-6
  time: string;
  description: string;
  price: number;
  tags: string[];
}

export class CulturalVenuesScraper extends BaseScraper {
  private venues: CulturalVenue[] = [
    {
      name: 'Pérez Art Museum Miami (PAMM)',
      address: '1103 Biscayne Blvd, Miami, FL 33132',
      neighborhood: 'Downtown Miami',
      lat: 25.7857,
      lng: -80.1863,
      url: 'https://www.pamm.org/',
      regularEvents: [
        {
          name: 'Third Thursday at PAMM',
          days: [4], // Thursday (3rd of month - simplified)
          time: '18:00',
          description: 'Free admission evening with live music, art workshops, and cocktails.',
          price: 0,
          tags: ['museum', 'free-event', 'live-music'],
        },
        {
          name: 'PAMM Exhibition Visit',
          days: [5, 6, 0], // Fri-Sun
          time: '10:00',
          description: 'Visit current exhibitions at PAMM, Miami\'s premier modern art museum.',
          price: 16,
          tags: ['museum', 'art-gallery'],
        },
      ],
    },
    {
      name: 'Institute of Contemporary Art Miami',
      address: '61 NE 41st St, Miami, FL 33137',
      neighborhood: 'Design District',
      lat: 25.8133,
      lng: -80.1924,
      url: 'https://icamiami.org/',
      regularEvents: [
        {
          name: 'ICA Miami Free Visit',
          days: [4, 5, 6, 0], // Thu-Sun
          time: '11:00',
          description: 'Free admission to ICA Miami. Explore cutting-edge contemporary art.',
          price: 0,
          tags: ['museum', 'art-gallery', 'free-event'],
        },
      ],
    },
    {
      name: 'The Bass',
      address: '2100 Collins Ave, Miami Beach, FL 33139',
      neighborhood: 'South Beach',
      lat: 25.7953,
      lng: -80.1319,
      url: 'https://thebass.org/',
      regularEvents: [
        {
          name: 'The Bass Museum Visit',
          days: [3, 4, 5, 6, 0], // Wed-Sun
          time: '10:00',
          description: 'Contemporary art museum in a historic Art Deco building in South Beach.',
          price: 15,
          tags: ['museum', 'art-gallery'],
        },
      ],
    },
    {
      name: 'Wynwood Walls',
      address: '2520 NW 2nd Ave, Miami, FL 33127',
      neighborhood: 'Wynwood',
      lat: 25.8011,
      lng: -80.1996,
      url: 'https://www.wynwoodwalls.com/',
      regularEvents: [
        {
          name: 'Wynwood Art Walk',
          days: [6], // Saturday
          time: '18:00',
          description: 'Self-guided tour through Wynwood\'s world-famous street art. Galleries stay open late.',
          price: 0,
          tags: ['art-gallery', 'free-event', 'local-favorite'],
        },
      ],
    },
    {
      name: 'Fairchild Tropical Botanic Garden',
      address: '10901 Old Cutler Rd, Coral Gables, FL 33156',
      neighborhood: 'Coral Gables',
      lat: 25.6761,
      lng: -80.2748,
      url: 'https://fairchildgarden.org/',
      regularEvents: [
        {
          name: 'Fairchild Garden Visit',
          days: [0, 6], // Weekend
          time: '09:30',
          description: 'Explore 83 acres of rare tropical plants and butterflies at Fairchild.',
          price: 25,
          tags: ['park', 'family-friendly'],
        },
        {
          name: 'The Ramble at Fairchild',
          days: [6], // Monthly Saturday event - simplified
          time: '10:00',
          description: 'Monthly garden festival with live music, food trucks, and family activities.',
          price: 25,
          tags: ['park', 'family-friendly', 'live-music', 'food-market'],
        },
      ],
    },
    {
      name: 'Vizcaya Museum and Gardens',
      address: '3251 S Miami Ave, Miami, FL 33129',
      neighborhood: 'Coconut Grove',
      lat: 25.7445,
      lng: -80.2106,
      url: 'https://vizcaya.org/',
      regularEvents: [
        {
          name: 'Vizcaya Museum Visit',
          days: [3, 4, 5, 6, 0], // Wed-Sun
          time: '09:30',
          description: 'Tour the stunning Italian Renaissance-style villa and formal gardens.',
          price: 25,
          tags: ['museum', 'park', 'waterfront'],
        },
        {
          name: 'Vizcaya Live',
          days: [5], // Friday evenings
          time: '18:00',
          description: 'Live music performances in the gardens of Vizcaya.',
          price: 30,
          tags: ['live-music', 'park', 'sunset'],
        },
      ],
    },
    {
      name: 'HistoryMiami Museum',
      address: '101 W Flagler St, Miami, FL 33130',
      neighborhood: 'Downtown Miami',
      lat: 25.7757,
      lng: -80.1991,
      url: 'https://historymiami.org/',
      regularEvents: [
        {
          name: 'HistoryMiami Visit',
          days: [2, 3, 4, 5, 6], // Tue-Sat
          time: '10:00',
          description: 'Explore Miami\'s history from prehistoric times to the present.',
          price: 12,
          tags: ['museum'],
        },
      ],
    },
    {
      name: 'The Wolfsonian-FIU',
      address: '1001 Washington Ave, Miami Beach, FL 33139',
      neighborhood: 'South Beach',
      lat: 25.7804,
      lng: -80.1355,
      url: 'https://wolfsonian.org/',
      regularEvents: [
        {
          name: 'Wolfsonian Free Friday',
          days: [5], // Friday
          time: '18:00',
          description: 'Free admission on Friday evenings. Design and decorative arts museum.',
          price: 0,
          tags: ['museum', 'free-event'],
        },
      ],
    },
  ];

  constructor() {
    super('Cultural Venues', { weight: 1.4, rateLimit: 0 });
  }

  async scrape(): Promise<RawEvent[]> {
    const events: RawEvent[] = [];
    const weeksAhead = 4;

    this.log(`Generating cultural venue events for next ${weeksAhead} weeks...`);

    for (const venue of this.venues) {
      for (const eventTemplate of venue.regularEvents) {
        const generated = this.generateVenueEvents(venue, eventTemplate, weeksAhead);
        events.push(...generated);
      }
    }

    this.log(`Generated ${events.length} cultural venue events`);
    return events;
  }

  private generateVenueEvents(
    venue: CulturalVenue,
    template: RegularEvent,
    weeksAhead: number
  ): RawEvent[] {
    const events: RawEvent[] = [];
    const today = new Date();
    const daysToCheck = weeksAhead * 7;

    for (let i = 0; i < daysToCheck; i++) {
      const checkDate = addDays(today, i);
      const dayOfWeek = getDay(checkDate);

      if (template.days.includes(dayOfWeek)) {
        const dateStr = format(checkDate, 'yyyy-MM-dd');
        const startAt = `${dateStr}T${template.time}:00`;

        events.push({
          title: template.name,
          startAt,
          venueName: venue.name,
          address: venue.address,
          neighborhood: venue.neighborhood,
          lat: venue.lat,
          lng: venue.lng,
          city: 'Miami',
          tags: template.tags,
          category: template.tags.includes('museum') ? 'Culture' : 'Art',
          priceLabel: template.price === 0 ? 'Free' : template.price < 20 ? '$' : '$$',
          priceAmount: template.price,
          isOutdoor: template.tags.includes('park') || template.tags.includes('waterfront'),
          description: template.description,
          sourceUrl: venue.url,
          sourceName: this.name,
          recurring: true,
          recurrencePattern: 'weekly',
        });
      }
    }

    return events;
  }
}
