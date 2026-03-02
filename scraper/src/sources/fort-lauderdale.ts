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
  days: number[] | 'monthly' | 'first-saturday' | 'first-friday' | 'first-weekend-jan' | 'last-weekend-feb' | 'specific-dates';
  specificDates?: string[]; // 'YYYY-MM-DD' for annual festival days
  time: string;
  category: string;
  description: string;
  tags: string[];
  price: number;
}

export class FortLauderdaleScraper extends BaseScraper {
  private venues: FLLVenue[] = [
    // ── VERIFIED RECURRING EVENTS (confirmed from official sources) ────

    // Esplanade Park — home of the Fort Lauderdale Green Market
    {
      name: 'Esplanade Park',
      address: '400 SW 2nd St, Fort Lauderdale, FL 33312',
      neighborhood: 'Riverwalk',
      lat: 26.1165,
      lng: -80.1495,
      url: 'https://fortlauderdalegreenmarket.com/',
      events: [
        {
          name: 'Fort Lauderdale Green Market',
          days: [6], // Saturday
          time: '08:00',
          category: 'Food & Drink',
          description: 'Open-air farmers market along the New River with local produce, artisan food, plants, and handmade goods. A beloved Saturday morning tradition.',
          tags: ['farmers-market', 'free-event', 'outdoor', 'local-favorite', 'food'],
          price: 0,
        },
      ],
    },
    // FAT Village Arts District
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
      ],
    },
    // Las Olas Art Fair (bi-annual: first weekend Jan + last weekend Feb)
    {
      name: 'Las Olas Art Fair',
      address: 'E Las Olas Blvd (SE 6th–11th Ave), Fort Lauderdale, FL 33301',
      neighborhood: 'Las Olas',
      lat: 26.1196,
      lng: -80.1295,
      url: 'https://www.artfestival.com/festivals/las-olas-art-fair-fort-lauderdale-florida',
      events: [
        {
          name: 'Las Olas Art Fair – Part I (January)',
          days: 'first-weekend-jan',
          time: '10:00',
          category: 'Art',
          description: 'One of the nation\'s top 100 outdoor art festivals. 200+ juried artists line a mile of Las Olas Blvd with paintings, sculpture, jewelry, and more. Free admission.',
          tags: ['art-gallery', 'free-event', 'outdoor', 'local-favorite', 'festival'],
          price: 0,
        },
        {
          name: 'Las Olas Art Fair – Part II (February)',
          days: 'last-weekend-feb',
          time: '10:00',
          category: 'Art',
          description: 'One of the nation\'s top 100 outdoor art festivals. 200+ juried artists line a mile of Las Olas Blvd with paintings, sculpture, jewelry, and more. Free admission.',
          tags: ['art-gallery', 'free-event', 'outdoor', 'local-favorite', 'festival'],
          price: 0,
        },
      ],
    },
    // Pride Fort Lauderdale — annually mid-February on the beach
    {
      name: 'Pride Fort Lauderdale',
      address: 'A1A (Fort Lauderdale Beach Blvd), Fort Lauderdale, FL 33304',
      neighborhood: 'Fort Lauderdale Beach',
      lat: 26.1240,
      lng: -80.1030,
      url: 'https://www.pridefortlauderdale.org/',
      events: [
        {
          name: 'Pride Fort Lauderdale: Beach Festival',
          days: 'specific-dates',
          specificDates: ['2026-02-14', '2026-02-15', '2027-02-13', '2027-02-14'],
          time: '12:00',
          category: 'Community',
          description: 'Florida\'s oldest Pride celebration. Two-day beach festival on A1A with 3 stages, 150+ vendors, headlining performers, DJs, and the GAY1A parade. 120,000+ attendees. Free.',
          tags: ['free-event', 'outdoor', 'beach', 'community', 'festival', 'lgbtq', 'live-music'],
          price: 0,
        },
      ],
    },
    // Tortuga Music Festival — annual April, Fort Lauderdale Beach
    {
      name: 'Tortuga Music Festival',
      address: 'Fort Lauderdale Beach Park, Fort Lauderdale, FL 33304',
      neighborhood: 'Fort Lauderdale Beach',
      lat: 26.1224,
      lng: -80.1028,
      url: 'https://www.tortugamusicfestival.com/',
      events: [
        {
          name: 'Tortuga Music Festival',
          days: 'specific-dates',
          specificDates: ['2026-04-10', '2026-04-11', '2026-04-12'],
          time: '12:00',
          category: 'Music',
          description: 'Three-day country and rock festival on Fort Lauderdale Beach benefiting ocean conservation. Major headliners, food, and beachside stages.',
          tags: ['live-music', 'outdoor', 'beach', 'festival', 'local-favorite'],
          price: 150,
        },
      ],
    },
    // Fort Lauderdale International Boat Show — annual late October
    {
      name: 'Fort Lauderdale International Boat Show',
      address: 'Bahia Mar Yachting Center, 801 Seabreeze Blvd, Fort Lauderdale, FL 33316',
      neighborhood: 'Fort Lauderdale Beach',
      lat: 26.1162,
      lng: -80.1054,
      url: 'https://www.flibs.com/',
      events: [
        {
          name: 'Fort Lauderdale International Boat Show (FLIBS)',
          days: 'specific-dates',
          specificDates: ['2026-10-28', '2026-10-29', '2026-10-30', '2026-10-31', '2026-11-01'],
          time: '10:00',
          category: 'Culture',
          description: 'The world\'s largest in-water boat show. 90 acres, 3M+ sq ft of exhibit space, 100,000+ visitors. Superyachts, luxury boats, and marine technology across 7 waterfront locations.',
          tags: ['outdoor', 'waterfront', 'festival', 'local-favorite'],
          price: 40,
        },
      ],
    },
    // Winterfest Boat Parade — annual December
    {
      name: 'Winterfest Boat Parade',
      address: 'Fort Lauderdale Intracoastal Waterway, Fort Lauderdale, FL 33301',
      neighborhood: 'Fort Lauderdale Beach',
      lat: 26.1230,
      lng: -80.1050,
      url: 'https://www.winterfestparade.com/',
      events: [
        {
          name: 'Seminole Hard Rock Winterfest Boat Parade',
          days: 'specific-dates',
          specificDates: ['2025-12-13', '2026-12-12'],
          time: '18:00',
          category: 'Community',
          description: '"The Best Show on H2O." Holiday-lit boats parade 12 miles through Fort Lauderdale\'s waterways. Mega-yachts, sailboats, and holiday spectacle. Free to watch from the banks.',
          tags: ['waterfront', 'outdoor', 'free-event', 'festival', 'local-favorite', 'family-friendly'],
          price: 0,
        },
      ],
    },
    // St. Patrick's Day Parade — annual mid-March
    {
      name: 'Fort Lauderdale St. Patrick\'s Day Parade',
      address: 'Las Olas Blvd, Fort Lauderdale, FL 33301',
      neighborhood: 'Las Olas',
      lat: 26.1195,
      lng: -80.1365,
      url: 'https://www.visitlauderdale.com/events/annual-events-festivals/',
      events: [
        {
          name: 'Fort Lauderdale St. Patrick\'s Day Parade & Festival',
          days: 'specific-dates',
          specificDates: ['2026-03-14', '2027-03-13'],
          time: '11:00',
          category: 'Community',
          description: 'Annual St. Patrick\'s Day parade and street festival through downtown Fort Lauderdale. Marching bands, floats, Irish food and drinks, live music.',
          tags: ['free-event', 'outdoor', 'community', 'festival', 'local-favorite'],
          price: 0,
        },
      ],
    },
    // Brazilian Festival FLL — annual October
    {
      name: 'Brazilian Festival Fort Lauderdale',
      address: 'Esplanade Park, 400 SW 2nd St, Fort Lauderdale, FL 33312',
      neighborhood: 'Riverwalk',
      lat: 26.1165,
      lng: -80.1495,
      url: 'https://www.visitlauderdale.com/events/annual-events-festivals/',
      events: [
        {
          name: 'Brazilian Festival Fort Lauderdale',
          days: 'specific-dates',
          specificDates: ['2026-10-03', '2026-10-04'],
          time: '12:00',
          category: 'Culture',
          description: 'Annual Brazilian cultural festival in downtown Fort Lauderdale. Live samba, forró, food, art, and community celebrating South Florida\'s vibrant Brazilian community.',
          tags: ['free-event', 'outdoor', 'live-music', 'community', 'festival', 'local-favorite'],
          price: 0,
        },
      ],
    },
    // NOTE: WeekendBroward-sourced events moved to weekend-broward-verified.ts
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

    if (template.days === 'specific-dates' && template.specificDates) {
      const windowEnd = addDays(today, weeksAhead * 7);
      for (const dateStr of template.specificDates) {
        const d = new Date(`${dateStr}T${template.time}:00`);
        if (d >= today && d <= windowEnd) {
          events.push(this.createEvent(venue, template, d));
        }
      }
    } else if (template.days === 'first-weekend-jan' || template.days === 'last-weekend-feb') {
      // Bi-annual festival events: generate Sat+Sun for the target weekend in the window
      for (let i = 0; i < daysToCheck; i++) {
        const checkDate = addDays(today, i);
        const month = checkDate.getMonth(); // 0=Jan, 1=Feb
        const day = checkDate.getDate();
        const dow = getDay(checkDate);
        if (template.days === 'first-weekend-jan' && month === 0 && day <= 7 && (dow === 6 || dow === 0)) {
          events.push(this.createEvent(venue, template, checkDate));
        }
        if (template.days === 'last-weekend-feb') {
          // Last Saturday of Feb (day >= 22) and the Sunday that follows (may be March 1/2)
          const isFebLastSat = month === 1 && dow === 6 && day >= 22;
          const isSundayAfterFebLastSat = dow === 0 && (
            (month === 1 && day >= 23) ||
            (month === 2 && day <= 2)
          );
          if (isFebLastSat || isSundayAfterFebLastSat) {
            events.push(this.createEvent(venue, template, checkDate));
          }
        }
      }
    } else if (template.days === 'monthly' || template.days === 'first-saturday' || template.days === 'first-friday') {
      // Generate monthly events
      for (let i = 0; i < daysToCheck; i++) {
        const checkDate = addDays(today, i);
        const dayOfMonth = checkDate.getDate();
        const dayOfWeek = getDay(checkDate);

        // First Saturday of month
        if (template.days === 'first-saturday' && dayOfWeek === 6 && dayOfMonth <= 7) {
          events.push(this.createEvent(venue, template, checkDate));
        }
        // First Friday of month
        if (template.days === 'first-friday' && dayOfWeek === 5 && dayOfMonth <= 7) {
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

        if ((template.days as number[]).includes(dayOfWeek)) {
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
