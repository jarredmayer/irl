/**
 * Brickell Event Sources
 * Rooftops, bars, restaurants, and hotel venues in Brickell
 */

import { addDays, format, getDay } from 'date-fns';
import { BaseScraper } from './base.js';
import type { RawEvent } from '../types.js';

interface BrickellVenue {
  name: string;
  address: string;
  lat: number;
  lng: number;
  url: string;
  events: BrickellEvent[];
}

interface BrickellEvent {
  name: string;
  days: number[];
  time: string;
  category: string;
  description: string;
  tags: string[];
  price: number;
  isOutdoor: boolean;
}

export class BrickellVenuesScraper extends BaseScraper {
  private venues: BrickellVenue[] = [
    // Sugar Rooftop at EAST Miami
    {
      name: 'Sugar',
      address: '788 Brickell Plaza, Miami, FL 33131',
      lat: 25.7652,
      lng: -80.1900,
      url: 'https://www.sugar-miami.com/',
      events: [
        {
          name: 'Sunset Session at Sugar',
          days: [3, 4, 5, 6], // Wed-Sat
          time: '17:30',
          category: 'Food & Drink',
          description: 'Sunset cocktails on Miami\'s best rooftop. 40 floors up with 360° views of Brickell and the bay.',
          tags: ['rooftop', 'sunset', 'cocktails', 'local-favorite'],
          price: 0,
          isOutdoor: true,
        },
        {
          name: 'Weekend Rooftop at Sugar',
          days: [5, 6], // Fri-Sat
          time: '21:00',
          category: 'Nightlife',
          description: 'Late night at Sugar with DJs, craft cocktails, and skyline views. Brickell\'s coolest rooftop.',
          tags: ['rooftop', 'dj', 'cocktails', 'local-favorite'],
          price: 0,
          isOutdoor: true,
        },
      ],
    },
    // Quinto La Huella - removed generic brunch (destination suggestion)
    // Komodo
    {
      name: 'Komodo',
      address: '801 Brickell Ave, Miami, FL 33131',
      lat: 25.7658,
      lng: -80.1921,
      url: 'https://www.komodomiami.com/',
      events: [
        {
          name: 'Saturday Night at Komodo',
          days: [6], // Saturday
          time: '21:00',
          category: 'Nightlife',
          description: 'The see-and-be-seen scene at Komodo. Three-story indoor/outdoor space with DJs and Asian fusion.',
          tags: ['dj', 'dancing', 'nightlife'],
          price: 50,
          isOutdoor: false,
        },
      ],
    },
    // Sexy Fish
    {
      name: 'Sexy Fish',
      address: '1001 S Miami Ave, Miami, FL 33130',
      lat: 25.7623,
      lng: -80.1934,
      url: 'https://sexyfish.com/miami/',
      events: [
        {
          name: 'Late Night at Sexy Fish',
          days: [4, 5, 6], // Thu-Sat
          time: '22:00',
          category: 'Nightlife',
          description: 'The lounge comes alive late night with DJs and the beautiful crowd Brickell is known for.',
          tags: ['dj', 'nightlife', 'cocktails'],
          price: 0,
          isOutdoor: false,
        },
      ],
    },
    // Baby Jane, Novecento, Area 31, Zuma - removed generic brunch/dinner/happy hour events (destination suggestions)
    // Brickell City Centre events
    {
      name: 'Brickell City Centre',
      address: '701 S Miami Ave, Miami, FL 33131',
      lat: 25.7667,
      lng: -80.1923,
      url: 'https://brickellcitycentre.com/',
      events: [
        {
          name: 'Wellness Wednesday at BCC',
          days: [3], // Wednesday
          time: '18:00',
          category: 'Wellness',
          description: 'Free fitness classes on the rooftop of Brickell City Centre. Yoga, HIIT, and more.',
          tags: ['fitness-class', 'yoga', 'free-event', 'rooftop'],
          price: 0,
          isOutdoor: true,
        },
      ],
    },
    // La Mar - removed generic brunch/happy hour (destination suggestions)
  ];

  constructor() {
    super('Brickell Venues', { weight: 1.3, rateLimit: 0 });
  }

  async scrape(): Promise<RawEvent[]> {
    const events: RawEvent[] = [];
    const weeksAhead = 6;

    this.log(`Generating Brickell events for next ${weeksAhead} weeks...`);

    for (const venue of this.venues) {
      for (const eventTemplate of venue.events) {
        const generated = this.generateEvents(venue, eventTemplate, weeksAhead);
        events.push(...generated);
      }
    }

    this.log(`Generated ${events.length} Brickell events`);
    return events;
  }

  private generateEvents(
    venue: BrickellVenue,
    template: BrickellEvent,
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
        events.push({
          title: template.name,
          startAt: `${dateStr}T${template.time}:00`,
          venueName: venue.name,
          address: venue.address,
          neighborhood: 'Brickell',
          lat: venue.lat,
          lng: venue.lng,
          city: 'Miami',
          tags: template.tags,
          category: template.category,
          priceLabel: template.price === 0 ? 'Free' : template.price > 75 ? '$$$' : template.price > 40 ? '$$' : '$',
          priceAmount: template.price,
          isOutdoor: template.isOutdoor,
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
