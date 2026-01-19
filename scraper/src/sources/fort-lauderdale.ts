/**
 * Fort Lauderdale Event Sources
 * Covers Las Olas, Flagler Village, Downtown FLL, beaches, and cultural venues
 */

import { addDays, format, getDay, nextFriday, nextSaturday } from 'date-fns';
import { BaseScraper } from './base.js';
import type { RawEvent } from '../types.js';

interface FLLVenue {
  name: string;
  address: string;
  neighborhood: string;
  lat: number;
  lng: number;
  url?: string;
  events: FLLEventTemplate[];
}

interface FLLEventTemplate {
  name: string;
  days: number[] | 'monthly' | 'first-saturday';
  time: string;
  category: string;
  description: string;
  tags: string[];
  price: number;
}

export class FortLauderdaleScraper extends BaseScraper {
  private venues: FLLVenue[] = [
    // Las Olas Association
    {
      name: 'Las Olas Boulevard',
      address: 'Las Olas Blvd, Fort Lauderdale, FL 33301',
      neighborhood: 'Las Olas',
      lat: 26.1195,
      lng: -80.1365,
      url: 'https://lasolasboulevard.com/',
      events: [
        {
          name: 'Las Olas Art Walk',
          days: 'first-saturday',
          time: '19:00',
          category: 'Art',
          description: 'Monthly art walk along Las Olas Boulevard featuring galleries, artists, and live entertainment.',
          tags: ['art-gallery', 'free-event', 'local-favorite'],
          price: 0,
        },
        {
          name: 'Sunday Jazz Brunch on Las Olas',
          days: [0], // Sunday
          time: '11:00',
          category: 'Music',
          description: 'Live jazz performances along Las Olas Boulevard. Multiple restaurants offer brunch specials.',
          tags: ['jazz', 'brunch', 'live-music'],
          price: 0,
        },
      ],
    },
    // Flagler Village
    {
      name: 'FAT Village Arts District',
      address: 'NW 1st Ave, Fort Lauderdale, FL 33311',
      neighborhood: 'Flagler Village',
      lat: 26.1289,
      lng: -80.1456,
      url: 'https://fatvillage.com/',
      events: [
        {
          name: 'FAT Village Art Walk',
          days: 'monthly', // Last Saturday
          time: '18:00',
          category: 'Art',
          description: 'Monthly art walk in Flagler Village featuring galleries, studios, food trucks, and live music.',
          tags: ['art-gallery', 'free-event', 'local-favorite', 'food-market'],
          price: 0,
        },
        // Flagler Village First Friday - removed (was generating every Friday incorrectly)
      ],
    },
    // NSU Art Museum
    {
      name: 'NSU Art Museum Fort Lauderdale',
      address: '1 E Las Olas Blvd, Fort Lauderdale, FL 33301',
      neighborhood: 'Downtown FLL',
      lat: 26.1189,
      lng: -80.1436,
      url: 'https://nsuartmuseum.org/',
      events: [
        {
          name: 'Free First Thursday at NSU Art Museum',
          days: [4], // Thursday (first of month - simplified)
          time: '16:00',
          category: 'Art',
          description: 'Free admission on first Thursdays with extended hours, curator talks, and special programming.',
          tags: ['museum', 'art-gallery', 'free-event'],
          price: 0,
        },
        {
          name: 'Art After Dark at NSU',
          days: [5], // Friday
          time: '18:00',
          category: 'Art',
          description: 'Evening museum hours with DJ sets, cocktails, and gallery tours. Experience contemporary art after hours.',
          tags: ['museum', 'art-gallery', 'dj', 'cocktails'],
          price: 15,
        },
      ],
    },
    // Broward Center
    {
      name: 'Broward Center for the Performing Arts',
      address: '201 SW 5th Ave, Fort Lauderdale, FL 33312',
      neighborhood: 'Downtown FLL',
      lat: 26.1172,
      lng: -80.1489,
      url: 'https://browardcenter.org/',
      events: [
        {
          name: 'Live at the Broward Center',
          days: [4, 5, 6], // Thu-Sat
          time: '19:30',
          category: 'Culture',
          description: 'World-class performances including Broadway shows, concerts, and dance at South Florida\'s premier performing arts venue.',
          tags: ['theater', 'live-music'],
          price: 45,
        },
      ],
    },
    // Riverwalk Fort Lauderdale
    {
      name: 'Riverwalk Fort Lauderdale',
      address: 'Riverwalk, Fort Lauderdale, FL 33301',
      neighborhood: 'Downtown FLL',
      lat: 26.1189,
      lng: -80.1467,
      url: 'https://goriverwalk.com/',
      events: [
        {
          name: 'Riverwalk Friday Night',
          days: [5], // Friday
          time: '18:00',
          category: 'Community',
          description: 'Friday evening along the Riverwalk with food vendors, live music, and waterfront views.',
          tags: ['waterfront', 'live-music', 'free-event'],
          price: 0,
        },
        {
          name: 'Sunday on the Riverwalk',
          days: [0], // Sunday
          time: '10:00',
          category: 'Community',
          description: 'Sunday morning activities along the Riverwalk including yoga, markets, and family activities.',
          tags: ['waterfront', 'family-friendly', 'free-event'],
          price: 0,
        },
      ],
    },
    // Fort Lauderdale Beach
    {
      name: 'Fort Lauderdale Beach Park',
      address: 'A1A, Fort Lauderdale Beach, FL 33304',
      neighborhood: 'Fort Lauderdale Beach',
      lat: 26.1224,
      lng: -80.1028,
      url: 'https://www.fortlauderdale.gov/departments/parks-recreation/beach',
      events: [
        {
          name: 'Beach Bootcamp with FLL Fit Club',
          days: [6], // Saturday
          time: '08:00',
          category: 'Fitness',
          description: 'High-energy beach workout led by certified trainers. HIIT, strength, and cardio on the sand. All fitness levels.',
          tags: ['beach', 'fitness-class', 'free-event', 'community'],
          price: 0,
        },
        {
          name: 'Sunrise Flow Yoga',
          days: [0], // Sunday
          time: '07:00',
          category: 'Wellness',
          description: 'Guided sunrise yoga session on Fort Lauderdale Beach led by local instructors. Bring your own mat or rent one.',
          tags: ['yoga', 'beach', 'sunrise', 'wellness'],
          price: 10,
        },
      ],
    },
    // Historic Stranahan House
    {
      name: 'Stranahan House Museum',
      address: '335 SE 6th Ave, Fort Lauderdale, FL 33301',
      neighborhood: 'Downtown FLL',
      lat: 26.1178,
      lng: -80.1389,
      url: 'https://stranahanhouse.org/',
      events: [
        {
          name: 'Ghost Tour at Stranahan House',
          days: [5, 6], // Fri-Sat
          time: '19:30',
          category: 'Culture',
          description: 'Candlelit ghost tour of Fort Lauderdale\'s most haunted house. Hear true tales of the Stranahan family and reported paranormal activity.',
          tags: ['museum', 'waterfront', 'local-favorite'],
          price: 30,
        },
        {
          name: 'River History Cruise & House Tour',
          days: [6], // Saturday
          time: '14:00',
          category: 'Culture',
          description: 'Boat cruise down the New River followed by a guided tour of the historic Stranahan House. Learn the pioneer history of Fort Lauderdale.',
          tags: ['museum', 'waterfront'],
          price: 40,
        },
      ],
    },
    // Bonnet House
    {
      name: 'Bonnet House Museum & Gardens',
      address: '900 N Birch Rd, Fort Lauderdale, FL 33304',
      neighborhood: 'Fort Lauderdale Beach',
      lat: 26.1367,
      lng: -80.1067,
      url: 'https://bonnethouse.org/',
      events: [
        {
          name: 'Full Moon Tour at Bonnet House',
          days: 'monthly',
          time: '19:00',
          category: 'Culture',
          description: 'Monthly full moon tours of the Bonnet House gardens with wine and light refreshments. Experience the estate under the moonlight.',
          tags: ['museum', 'park', 'waterfront', 'local-favorite'],
          price: 35,
        },
        {
          name: 'Birding Walk at Bonnet House',
          days: [6], // Saturday
          time: '08:30',
          category: 'Outdoors',
          description: 'Guided birding walk through 35 acres of tropical habitat. Spot monkeys, swans, and dozens of bird species with expert naturalists.',
          tags: ['park', 'outdoor', 'local-favorite'],
          price: 20,
        },
      ],
    },
  ];

  constructor() {
    super('Fort Lauderdale', { weight: 1.3, rateLimit: 0 });
  }

  async scrape(): Promise<RawEvent[]> {
    const events: RawEvent[] = [];
    const weeksAhead = 6;

    this.log(`Generating Fort Lauderdale events for next ${weeksAhead} weeks...`);

    for (const venue of this.venues) {
      for (const template of venue.events) {
        const generated = this.generateEvents(venue, template, weeksAhead);
        events.push(...generated);
      }
    }

    this.log(`Generated ${events.length} Fort Lauderdale events`);
    return events;
  }

  private generateEvents(
    venue: FLLVenue,
    template: FLLEventTemplate,
    weeksAhead: number
  ): RawEvent[] {
    const events: RawEvent[] = [];
    const today = new Date();
    const daysToCheck = weeksAhead * 7;

    if (template.days === 'monthly' || template.days === 'first-saturday') {
      // Generate monthly events (last Saturday or first Saturday)
      for (let week = 0; week < weeksAhead; week++) {
        const checkDate = addDays(today, week * 7);
        const dayOfMonth = checkDate.getDate();
        const dayOfWeek = getDay(checkDate);

        // First Saturday of month
        if (template.days === 'first-saturday' && dayOfWeek === 6 && dayOfMonth <= 7) {
          events.push(this.createEvent(venue, template, checkDate));
        }
        // Last Saturday of month (simplified: 4th Saturday)
        if (template.days === 'monthly' && dayOfWeek === 6 && dayOfMonth >= 22) {
          events.push(this.createEvent(venue, template, checkDate));
        }
      }
    } else {
      // Regular weekly events
      for (let i = 0; i < daysToCheck; i++) {
        const checkDate = addDays(today, i);
        const dayOfWeek = getDay(checkDate);

        if (template.days.includes(dayOfWeek)) {
          events.push(this.createEvent(venue, template, checkDate));
        }
      }
    }

    return events;
  }

  private createEvent(venue: FLLVenue, template: FLLEventTemplate, date: Date): RawEvent {
    const dateStr = format(date, 'yyyy-MM-dd');
    const startAt = `${dateStr}T${template.time}:00`;

    return {
      title: template.name,
      startAt,
      venueName: venue.name,
      address: venue.address,
      neighborhood: venue.neighborhood,
      lat: venue.lat,
      lng: venue.lng,
      city: 'Fort Lauderdale',
      tags: template.tags,
      category: template.category,
      priceLabel: template.price === 0 ? 'Free' : template.price < 20 ? '$' : '$$',
      priceAmount: template.price,
      isOutdoor: template.tags.includes('beach') || template.tags.includes('park') || template.tags.includes('waterfront'),
      description: template.description,
      sourceUrl: venue.url,
      sourceName: this.name,
      recurring: true,
      recurrencePattern: 'weekly',
    };
  }
}
