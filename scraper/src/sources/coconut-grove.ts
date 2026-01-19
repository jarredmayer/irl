/**
 * Coconut Grove Event Sources
 * The Grove's local bars, restaurants, parks, and community spots
 */

import { addDays, format, getDay } from 'date-fns';
import { BaseScraper } from './base.js';
import type { RawEvent } from '../types.js';

interface GroveVenue {
  name: string;
  address: string;
  lat: number;
  lng: number;
  url: string;
  events: GroveEvent[];
}

interface GroveEvent {
  name: string;
  days: number[];
  time: string;
  category: string;
  description: string;
  tags: string[];
  price: number;
  isOutdoor: boolean;
}

export class CoconutGroveScraper extends BaseScraper {
  private venues: GroveVenue[] = [
    // Monty's Raw Bar - waterfront institution
    {
      name: "Monty's Raw Bar",
      address: '2550 S Bayshore Dr, Miami, FL 33133',
      lat: 25.7289,
      lng: -80.2378,
      url: 'https://www.montysrawbar.com/',
      events: [
        {
          name: 'Live Music at Monty\'s',
          days: [4, 5, 6, 0], // Thu-Sun
          time: '18:00',
          category: 'Music',
          description: 'Live bands on the water at Monty\'s. Tropical drinks, fresh seafood, and sunset views over the marina.',
          tags: ['live-music', 'waterfront', 'local-favorite'],
          price: 0,
          isOutdoor: true,
        },
        {
          name: 'Sunday Funday at Monty\'s',
          days: [0], // Sunday
          time: '14:00',
          category: 'Community',
          description: 'The Grove\'s legendary Sunday hangout. Live music, drink specials, and the best marina views in Miami.',
          tags: ['live-music', 'waterfront', 'local-favorite', 'dancing'],
          price: 0,
          isOutdoor: true,
        },
      ],
    },
    // Spillover - neighborhood bar
    {
      name: 'Spillover',
      address: '2911 Grand Ave, Miami, FL 33133',
      lat: 25.7278,
      lng: -80.2401,
      url: 'https://spillovermiami.com/',
      events: [
        {
          name: 'Happy Hour at Spillover',
          days: [1, 2, 3, 4, 5], // Mon-Fri
          time: '16:00',
          category: 'Food & Drink',
          description: 'The Grove\'s favorite neighborhood bar. Great beer selection, friendly crowd, dog-friendly patio.',
          tags: ['happy-hour', 'craft-beer', 'dog-friendly', 'local-favorite'],
          price: 0,
          isOutdoor: true,
        },
        {
          name: 'Trivia Night at Spillover',
          days: [3], // Wednesday
          time: '20:00',
          category: 'Community',
          description: 'Weekly trivia at Spillover. Teams welcome, prizes for winners.',
          tags: ['community', 'local-favorite'],
          price: 0,
          isOutdoor: false,
        },
        {
          name: 'Live Music at Spillover',
          days: [5, 6], // Fri-Sat
          time: '21:00',
          category: 'Music',
          description: 'Local bands on the patio. The real Coconut Grove experience.',
          tags: ['live-music', 'local-favorite'],
          price: 0,
          isOutdoor: true,
        },
      ],
    },
    // Glass & Vine at Peacock Park
    {
      name: 'Glass & Vine',
      address: '2820 McFarlane Rd, Miami, FL 33133',
      lat: 25.7267,
      lng: -80.2389,
      url: 'https://www.glassandvine.com/',
      events: [
        {
          name: 'Brunch at Glass & Vine',
          days: [6, 0], // Sat-Sun
          time: '11:00',
          category: 'Food & Drink',
          description: 'Farm-to-table brunch in Peacock Park. Beautiful outdoor setting with views of the bay.',
          tags: ['brunch', 'outdoor-dining', 'local-favorite'],
          price: 45,
          isOutdoor: true,
        },
        {
          name: 'Sunset Dinner at Glass & Vine',
          days: [4, 5, 6], // Thu-Sat
          time: '18:00',
          category: 'Food & Drink',
          description: 'Seasonal dinner menu with sunset views over Peacock Park. One of the Grove\'s best date spots.',
          tags: ['outdoor-dining', 'sunset', 'local-favorite'],
          price: 65,
          isOutdoor: true,
        },
      ],
    },
    // The Barnacle Historic State Park
    {
      name: 'The Barnacle Historic State Park',
      address: '3485 Main Hwy, Miami, FL 33133',
      lat: 25.7256,
      lng: -80.2434,
      url: 'https://www.floridastateparks.org/parks-and-trails/barnacle-historic-state-park',
      events: [
        {
          name: 'Moonlight Concert at The Barnacle',
          days: [6], // Saturday (monthly)
          time: '18:00',
          category: 'Music',
          description: 'Monthly concert series under the stars at historic Barnacle State Park. Folk, jazz, and acoustic sets.',
          tags: ['live-music', 'park', 'local-favorite', 'family-friendly'],
          price: 10,
          isOutdoor: true,
        },
        {
          name: 'Yoga in the Park at Barnacle',
          days: [6], // Saturday
          time: '09:00',
          category: 'Wellness',
          description: 'Morning yoga on the grounds of historic Barnacle State Park. Bring your own mat.',
          tags: ['yoga', 'park', 'free-event'],
          price: 0,
          isOutdoor: true,
        },
      ],
    },
    // Peacock Park
    {
      name: 'Peacock Park',
      address: '2820 McFarlane Rd, Miami, FL 33133',
      lat: 25.7267,
      lng: -80.2378,
      url: 'https://www.miamigov.com/Parks-Recreation',
      events: [
        {
          name: 'Morning Run Club at Peacock Park',
          days: [6], // Saturday
          time: '07:30',
          category: 'Fitness',
          description: 'Free community run starting from Peacock Park. All paces welcome, 3-5 mile routes along the bay.',
          tags: ['running', 'free-event', 'community'],
          price: 0,
          isOutdoor: true,
        },
        {
          name: 'Sunset Yoga at Peacock Park',
          days: [0], // Sunday
          time: '17:30',
          category: 'Wellness',
          description: 'Free sunset yoga session overlooking the bay. Bring your own mat.',
          tags: ['yoga', 'sunset', 'free-event', 'waterfront'],
          price: 0,
          isOutdoor: true,
        },
      ],
    },
    // Greenstreet Cafe
    {
      name: 'GreenStreet Cafe',
      address: '3468 Main Hwy, Miami, FL 33133',
      lat: 25.7256,
      lng: -80.2423,
      url: 'https://greenstreetcafe.net/',
      events: [
        {
          name: 'Weekend Brunch at GreenStreet',
          days: [6, 0], // Sat-Sun
          time: '10:00',
          category: 'Food & Drink',
          description: 'The Grove\'s classic brunch spot. Sidewalk seating, people watching, and the famous French toast.',
          tags: ['brunch', 'outdoor-dining', 'local-favorite'],
          price: 30,
          isOutdoor: true,
        },
      ],
    },
    // Taurus Beer & Whiskey House
    {
      name: 'Taurus Beer & Whiskey House',
      address: '3540 Main Hwy, Miami, FL 33133',
      lat: 25.7245,
      lng: -80.2434,
      url: 'https://www.taurusbeerandwhiskey.com/',
      events: [
        {
          name: 'Whiskey Wednesday at Taurus',
          days: [3], // Wednesday
          time: '18:00',
          category: 'Food & Drink',
          description: 'Whiskey specials and tastings at the Grove\'s best craft bar. Great burger too.',
          tags: ['craft-beer', 'happy-hour', 'local-favorite'],
          price: 0,
          isOutdoor: false,
        },
        {
          name: 'Live Acoustic at Taurus',
          days: [4], // Thursday
          time: '20:00',
          category: 'Music',
          description: 'Acoustic sets at Taurus. Local singer-songwriters in an intimate setting.',
          tags: ['live-music', 'local-favorite'],
          price: 0,
          isOutdoor: false,
        },
      ],
    },
    // Lokal
    {
      name: 'Lokal',
      address: '3190 Commodore Plaza, Miami, FL 33133',
      lat: 25.7278,
      lng: -80.2412,
      url: 'https://www.lokalmiami.com/',
      events: [
        {
          name: 'Craft Beer Happy Hour at Lokal',
          days: [1, 2, 3, 4, 5], // Mon-Fri
          time: '16:00',
          category: 'Food & Drink',
          description: 'Extensive craft beer selection in a chill neighborhood spot. Great burgers.',
          tags: ['craft-beer', 'happy-hour', 'local-favorite'],
          price: 0,
          isOutdoor: true,
        },
      ],
    },
    // Bookstore in the Grove
    {
      name: 'Books & Books Coconut Grove',
      address: '3399 Virginia St, Miami, FL 33133',
      lat: 25.7289,
      lng: -80.2412,
      url: 'https://www.booksandbooks.com/',
      events: [
        {
          name: 'Author Event at Books & Books Grove',
          days: [4, 6], // Thu, Sat
          time: '19:00',
          category: 'Culture',
          description: 'Author readings and book signings at the Grove location. Check their calendar for featured authors.',
          tags: ['workshop', 'community', 'local-favorite'],
          price: 0,
          isOutdoor: false,
        },
        {
          name: 'Story Time at Books & Books',
          days: [6], // Saturday
          time: '11:00',
          category: 'Family',
          description: 'Free children\'s story time at Books & Books. Perfect for little ones.',
          tags: ['family-friendly', 'free-event', 'community'],
          price: 0,
          isOutdoor: false,
        },
      ],
    },
    // Lulu in the Grove
    {
      name: 'Lulu in the Grove',
      address: '3105 Commodore Plaza, Miami, FL 33133',
      lat: 25.7278,
      lng: -80.2401,
      url: 'https://www.luluinthegrove.com/',
      events: [
        {
          name: 'Bottomless Brunch at Lulu',
          days: [6, 0], // Sat-Sun
          time: '11:00',
          category: 'Food & Drink',
          description: 'Lively brunch scene with bottomless mimosas. Great people watching on the Grove\'s main drag.',
          tags: ['brunch', 'local-favorite'],
          price: 45,
          isOutdoor: true,
        },
        {
          name: 'Happy Hour at Lulu',
          days: [1, 2, 3, 4, 5], // Mon-Fri
          time: '16:00',
          category: 'Food & Drink',
          description: 'Happy hour specials in the heart of the Grove. Indoor/outdoor seating.',
          tags: ['happy-hour', 'cocktails'],
          price: 0,
          isOutdoor: true,
        },
      ],
    },
    // CocoWalk area
    {
      name: 'CocoWalk',
      address: '3015 Grand Ave, Miami, FL 33133',
      lat: 25.7289,
      lng: -80.2401,
      url: 'https://www.cocowalk.com/',
      events: [
        {
          name: 'First Friday at CocoWalk',
          days: [5], // Friday (first of month, simplified to every)
          time: '18:00',
          category: 'Community',
          description: 'Monthly First Friday celebration at CocoWalk with live music, pop-ups, and extended shopping hours.',
          tags: ['community', 'live-music', 'free-event'],
          price: 0,
          isOutdoor: true,
        },
      ],
    },
  ];

  constructor() {
    super('Coconut Grove', { weight: 1.3, rateLimit: 0 });
  }

  async scrape(): Promise<RawEvent[]> {
    const events: RawEvent[] = [];
    const weeksAhead = 6;

    this.log(`Generating Coconut Grove events for next ${weeksAhead} weeks...`);

    for (const venue of this.venues) {
      for (const eventTemplate of venue.events) {
        const generated = this.generateEvents(venue, eventTemplate, weeksAhead);
        events.push(...generated);
      }
    }

    this.log(`Generated ${events.length} Coconut Grove events`);
    return events;
  }

  private generateEvents(
    venue: GroveVenue,
    template: GroveEvent,
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
          neighborhood: 'Coconut Grove',
          lat: venue.lat,
          lng: venue.lng,
          city: 'Miami',
          tags: template.tags,
          category: template.category,
          priceLabel: template.price === 0 ? 'Free' : template.price > 50 ? '$$' : '$',
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
