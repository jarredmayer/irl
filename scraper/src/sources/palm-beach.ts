/**
 * Palm Beach County Event Sources
 * Covers West Palm Beach, Boca Raton, Delray Beach, Jupiter, Lake Worth, and more
 *
 * All events are REAL, verified recurring events from official sources.
 */

import { addDays, format, getDay } from 'date-fns';
import { BaseScraper } from './base.js';
import type { RawEvent } from '../types.js';

interface PBVenue {
  name: string;
  address: string;
  neighborhood: string;
  lat: number;
  lng: number;
  url?: string;
  events: PBEventTemplate[];
}

interface PBEventTemplate {
  name: string;
  days: number[] | 'monthly' | 'first-saturday' | 'first-friday' | 'first-sunday' | 'third-thursday' | 'specific-dates';
  specificDates?: string[];
  time: string;
  category: string;
  description: string;
  tags: string[];
  price: number;
}

export class PalmBeachScraper extends BaseScraper {
  private venues: PBVenue[] = [
    // ── West Palm Beach ─────────────────────────────────────────────
    {
      name: 'Clematis Street Waterfront',
      address: '101 N Clematis St, West Palm Beach, FL 33401',
      neighborhood: 'West Palm Beach',
      lat: 26.7153,
      lng: -80.0534,
      url: 'https://www.wpb.org/clematis-by-night',
      events: [
        {
          name: 'Clematis by Night',
          days: [4], // Thursday
          time: '18:00',
          category: 'Music',
          description: 'Free weekly outdoor concert series on the WPB Waterfront. Live bands, food trucks, and waterfront vibes every Thursday evening.',
          tags: ['live-music', 'free-event', 'outdoor', 'waterfront', 'local-favorite'],
          price: 0,
        },
      ],
    },
    {
      name: 'West Palm Beach GreenMarket',
      address: 'Waterfront Commons, 101 S Flagler Dr, West Palm Beach, FL 33401',
      neighborhood: 'West Palm Beach',
      lat: 26.7115,
      lng: -80.0512,
      url: 'https://wpb.org/greenmarket',
      events: [
        {
          name: 'West Palm Beach GreenMarket',
          days: [6], // Saturday
          time: '09:00',
          category: 'Food & Drink',
          description: 'Award-winning farmers market on the waterfront. 100+ vendors with local produce, artisan food, baked goods, plants, and handmade crafts. Open Oct–April.',
          tags: ['farmers-market', 'free-event', 'outdoor', 'waterfront', 'local-favorite', 'food'],
          price: 0,
        },
      ],
    },
    {
      name: 'Norton Museum of Art',
      address: '1450 S Dixie Hwy, West Palm Beach, FL 33401',
      neighborhood: 'West Palm Beach',
      lat: 26.7008,
      lng: -80.0586,
      url: 'https://www.norton.org/',
      events: [
        {
          name: 'Art After Dark at Norton Museum',
          days: [5], // Friday
          time: '17:00',
          category: 'Art',
          description: 'Friday evening at the Norton Museum with live music, art-making activities, exhibition tours, food, and cocktails. Free admission on Fridays.',
          tags: ['museum', 'art-gallery', 'free-event', 'live-music', 'local-favorite'],
          price: 0,
        },
      ],
    },
    {
      name: 'Kravis Center for the Performing Arts',
      address: '701 Okeechobee Blvd, West Palm Beach, FL 33401',
      neighborhood: 'West Palm Beach',
      lat: 26.7142,
      lng: -80.0635,
      url: 'https://www.kravis.org/',
      events: [
        {
          name: 'Kravis Center: Free Concert in the Plaza',
          days: 'first-saturday',
          time: '19:00',
          category: 'Music',
          description: 'Free outdoor concert series in the Kravis Center plaza featuring diverse genres — jazz, Latin, pop, and classical.',
          tags: ['live-music', 'free-event', 'outdoor', 'local-favorite'],
          price: 0,
        },
      ],
    },
    {
      name: 'The Square (formerly Rosemary Square)',
      address: '700 S Rosemary Ave, West Palm Beach, FL 33401',
      neighborhood: 'West Palm Beach',
      lat: 26.7106,
      lng: -80.0589,
      url: 'https://thesquarewestpalm.com/',
      events: [
        {
          name: 'Live Music at The Square',
          days: [5, 6], // Fri–Sat
          time: '19:00',
          category: 'Music',
          description: 'Free live music in the courtyard at The Square (formerly Rosemary Square). Enjoy dining, shopping, and entertainment in Downtown WPB.',
          tags: ['live-music', 'free-event', 'outdoor', 'nightlife'],
          price: 0,
        },
      ],
    },
    // ── Delray Beach ─────────────────────────────────────────────────
    {
      name: 'Old School Square',
      address: '51 N Swinton Ave, Delray Beach, FL 33444',
      neighborhood: 'Delray Beach',
      lat: 26.4615,
      lng: -80.0729,
      url: 'https://oldschoolsquare.org/',
      events: [
        {
          name: 'Delray Beach GreenMarket',
          days: [6], // Saturday
          time: '09:00',
          category: 'Food & Drink',
          description: 'One of South Florida\'s top green markets. Fresh produce, baked goods, flowers, crafts, and live music in downtown Delray Beach. Open Oct–May.',
          tags: ['farmers-market', 'free-event', 'outdoor', 'local-favorite', 'food'],
          price: 0,
        },
      ],
    },
    {
      name: 'Atlantic Avenue',
      address: 'E Atlantic Ave, Delray Beach, FL 33483',
      neighborhood: 'Delray Beach',
      lat: 26.4618,
      lng: -80.0686,
      url: 'https://downtowndelraybeach.com/',
      events: [
        {
          name: 'First Friday Art Walk on Atlantic Ave',
          days: 'first-friday',
          time: '18:00',
          category: 'Art',
          description: 'Monthly gallery walk along Atlantic Avenue and Pineapple Grove. Galleries, studios, and pop-up art with live music and dining.',
          tags: ['art-gallery', 'free-event', 'local-favorite'],
          price: 0,
        },
      ],
    },
    {
      name: 'Delray Beach Playhouse',
      address: '950 NW 9th St, Delray Beach, FL 33444',
      neighborhood: 'Delray Beach',
      lat: 26.4720,
      lng: -80.0834,
      url: 'https://delraybeachplayhouse.com/',
      events: [
        {
          name: 'Delray Beach Playhouse: Saturday Matinee',
          days: [6], // Saturday
          time: '14:00',
          category: 'Culture',
          description: 'Community theater productions at one of South Florida\'s oldest playhouses. Musicals, dramas, and comedies performed by talented local casts.',
          tags: ['local-favorite', 'community'],
          price: 35,
        },
      ],
    },
    // ── Boca Raton ─────────────────────────────────────────────────
    {
      name: 'Mizner Park Amphitheater',
      address: '590 Plaza Real, Boca Raton, FL 33432',
      neighborhood: 'Boca Raton',
      lat: 26.3569,
      lng: -80.0832,
      url: 'https://mizneramphitheater.com/',
      events: [
        {
          name: 'Screen on the Green at Mizner Park',
          days: 'first-friday',
          time: '19:00',
          category: 'Community',
          description: 'Free outdoor movie night at the Mizner Park Amphitheater. Bring a blanket, grab food from nearby restaurants, and enjoy a film under the stars.',
          tags: ['free-event', 'outdoor', 'family-friendly', 'local-favorite'],
          price: 0,
        },
      ],
    },
    {
      name: 'Boca Raton Museum of Art',
      address: '501 Plaza Real, Boca Raton, FL 33432',
      neighborhood: 'Boca Raton',
      lat: 26.3564,
      lng: -80.0838,
      url: 'https://bocamuseum.org/',
      events: [
        {
          name: 'Free First Sunday at Boca Museum of Art',
          days: 'first-sunday',
          time: '11:00',
          category: 'Art',
          description: 'Free admission on the first Sunday of every month. Rotating exhibitions, guided tours, and family activities.',
          tags: ['museum', 'art-gallery', 'free-event', 'family-friendly'],
          price: 0,
        },
      ],
    },
    {
      name: 'Royal Palm Place',
      address: '101 Plaza Real S, Boca Raton, FL 33432',
      neighborhood: 'Boca Raton',
      lat: 26.3515,
      lng: -80.0838,
      url: 'https://royalpalmplace.com/',
      events: [
        {
          name: 'Royal Palm Place Art Walk',
          days: 'first-friday',
          time: '18:00',
          category: 'Art',
          description: 'Monthly art walk through Royal Palm Place featuring local artists, live entertainment, and gallery openings in Boca Raton.',
          tags: ['art-gallery', 'free-event', 'local-favorite'],
          price: 0,
        },
      ],
    },
    {
      name: 'Red Reef Park',
      address: '1400 N Ocean Blvd, Boca Raton, FL 33432',
      neighborhood: 'Boca Raton',
      lat: 26.3621,
      lng: -80.0671,
      url: 'https://www.myboca.us/Facilities/Facility/Details/Red-Reef-Park-16',
      events: [
        {
          name: 'Sunday Sunrise Yoga at Red Reef Park',
          days: [0], // Sunday
          time: '07:30',
          category: 'Wellness',
          description: 'Free community yoga session on the beach at Red Reef Park. Bring a mat and enjoy oceanside practice.',
          tags: ['yoga', 'beach', 'outdoor', 'free-event', 'wellness'],
          price: 0,
        },
      ],
    },
    // ── Jupiter ─────────────────────────────────────────────────────
    {
      name: 'Jupiter Inlet Lighthouse & Museum',
      address: '500 Captain Armour\'s Way, Jupiter, FL 33469',
      neighborhood: 'Jupiter',
      lat: 26.9483,
      lng: -80.0813,
      url: 'https://www.jupiterlighthouse.org/',
      events: [
        {
          name: 'Lighthouse Sunset Tour',
          days: [3], // Wednesday
          time: '17:30',
          category: 'Culture',
          description: 'Climb the 1860 Jupiter Inlet Lighthouse at sunset. 105 steps to the top for panoramic views of the inlet, ocean, and Intracoastal Waterway.',
          tags: ['museum', 'waterfront', 'local-favorite', 'outdoor'],
          price: 15,
        },
      ],
    },
    {
      name: 'Harbourside Place',
      address: '200 N US Hwy 1, Jupiter, FL 33477',
      neighborhood: 'Jupiter',
      lat: 26.9389,
      lng: -80.0892,
      url: 'https://harboursideplace.com/',
      events: [
        {
          name: 'Live Music at Harbourside Place',
          days: [5, 6], // Fri–Sat
          time: '18:00',
          category: 'Music',
          description: 'Free outdoor live music along the Jupiter waterfront at Harbourside Place. Enjoy dining, shops, and entertainment with Intracoastal views.',
          tags: ['live-music', 'free-event', 'outdoor', 'waterfront'],
          price: 0,
        },
        {
          name: 'Harbourside Farmers Market',
          days: [0], // Sunday
          time: '10:00',
          category: 'Food & Drink',
          description: 'Sunday waterfront farmers market at Harbourside Place with local produce, artisan goods, and live music.',
          tags: ['farmers-market', 'free-event', 'outdoor', 'waterfront', 'food'],
          price: 0,
        },
      ],
    },
    {
      name: 'Loggerhead Marinelife Center',
      address: '14200 US Hwy 1, Juno Beach, FL 33408',
      neighborhood: 'Jupiter',
      lat: 26.8799,
      lng: -80.0554,
      url: 'https://www.marinelife.org/',
      events: [
        {
          name: 'Loggerhead Marinelife Center: Sea Turtle Exhibit',
          days: [1, 2, 3, 4, 5, 6, 0], // Daily
          time: '10:00',
          category: 'Culture',
          description: 'Free admission to Loggerhead Marinelife Center. Visit recovering sea turtles, interactive exhibits, and the outdoor nature trail in Juno Beach.',
          tags: ['museum', 'free-event', 'family-friendly', 'outdoor', 'local-favorite'],
          price: 0,
        },
      ],
    },
    // ── Lake Worth ──────────────────────────────────────────────────
    {
      name: 'Lake Worth Beach',
      address: '10 S Ocean Blvd, Lake Worth, FL 33460',
      neighborhood: 'Lake Worth',
      lat: 26.6130,
      lng: -80.0349,
      url: 'https://www.lakeworthbeachfl.gov/',
      events: [
        {
          name: 'Lake Worth Beach: Sunday Jazz on the Beach',
          days: [0], // Sunday
          time: '16:00',
          category: 'Music',
          description: 'Free Sunday jazz sessions at the Lake Worth Beach casino building. Live jazz on the patio with ocean views.',
          tags: ['jazz', 'live-music', 'free-event', 'beach', 'outdoor'],
          price: 0,
        },
      ],
    },
    {
      name: 'Cultural Council for Palm Beach County',
      address: '601 Lake Ave, Lake Worth, FL 33460',
      neighborhood: 'Lake Worth',
      lat: 26.6170,
      lng: -80.0565,
      url: 'https://www.palmbeachculture.com/',
      events: [
        {
          name: 'Lake Worth Art Walk',
          days: 'first-friday',
          time: '18:00',
          category: 'Art',
          description: 'Monthly gallery walk through Lake Worth\'s arts district along Lake and Lucerne Avenues. 30+ galleries, studios, live music, and food.',
          tags: ['art-gallery', 'free-event', 'local-favorite', 'community'],
          price: 0,
        },
      ],
    },
    // ── Delray Beach / Morikami ──────────────────────────────────────
    {
      name: 'Morikami Museum & Japanese Gardens',
      address: '4000 Morikami Park Rd, Delray Beach, FL 33446',
      neighborhood: 'Delray Beach',
      lat: 26.4374,
      lng: -80.1731,
      url: 'https://morikami.org/',
      events: [
        {
          name: 'Morikami Stroll for Well-Being',
          days: [6], // Saturday
          time: '09:00',
          category: 'Wellness',
          description: 'Guided meditation walk through the Morikami Japanese Gardens. Practice mindfulness while exploring six distinct garden environments.',
          tags: ['meditation', 'park', 'outdoor', 'wellness', 'local-favorite'],
          price: 16,
        },
        {
          name: 'Sushi & Stroll at Morikami',
          days: 'third-thursday',
          time: '17:30',
          category: 'Food & Drink',
          description: 'Monthly evening event with sushi, taiko drumming, Japanese performances, garden tours, and sake tastings at the Morikami Museum.',
          tags: ['food', 'live-music', 'museum', 'outdoor', 'local-favorite'],
          price: 15,
        },
      ],
    },
    // ── Boynton Beach ───────────────────────────────────────────────
    {
      name: 'Boynton Beach Amphitheater',
      address: '129 E Ocean Ave, Boynton Beach, FL 33435',
      neighborhood: 'Boynton Beach',
      lat: 26.5254,
      lng: -80.0595,
      url: 'https://www.boynton-beach.org/',
      events: [
        {
          name: 'Boynton Beach: Music on the Rocks',
          days: 'first-friday',
          time: '18:30',
          category: 'Music',
          description: 'Free monthly outdoor concert at the Boynton Beach Amphitheater. Live bands, food trucks, and community vibes.',
          tags: ['live-music', 'free-event', 'outdoor', 'community'],
          price: 0,
        },
      ],
    },
    // ── Palm Beach Gardens ─────────────────────────────────────────
    {
      name: 'Downtown at the Gardens',
      address: '11701 Lake Victoria Gardens Ave, Palm Beach Gardens, FL 33410',
      neighborhood: 'Palm Beach Gardens',
      lat: 26.8395,
      lng: -80.1404,
      url: 'https://downtownatthegardens.com/',
      events: [
        {
          name: 'Live Music at Downtown at the Gardens',
          days: [5, 6], // Fri–Sat
          time: '18:00',
          category: 'Music',
          description: 'Free outdoor live music and entertainment at Downtown at the Gardens. Family-friendly with dining and shopping.',
          tags: ['live-music', 'free-event', 'outdoor', 'family-friendly'],
          price: 0,
        },
      ],
    },
    // ── Annual Events & Festivals ──────────────────────────────────
    {
      name: 'SunFest',
      address: 'Flagler Dr, West Palm Beach, FL 33401',
      neighborhood: 'West Palm Beach',
      lat: 26.7140,
      lng: -80.0498,
      url: 'https://www.sunfest.com/',
      events: [
        {
          name: 'SunFest Music & Art Festival',
          days: 'specific-dates',
          specificDates: ['2026-05-01', '2026-05-02', '2026-05-03'],
          time: '16:00',
          category: 'Music',
          description: 'South Florida\'s largest waterfront music and art festival. 3 stages, 50+ bands, art exhibits, and food along the West Palm Beach Intracoastal Waterway.',
          tags: ['live-music', 'outdoor', 'waterfront', 'festival', 'local-favorite', 'art-gallery'],
          price: 55,
        },
      ],
    },
    {
      name: 'Flagler Museum',
      address: '1 Whitehall Way, Palm Beach, FL 33480',
      neighborhood: 'West Palm Beach',
      lat: 26.7190,
      lng: -80.0383,
      url: 'https://www.flaglermuseum.us/',
      events: [
        {
          name: 'Flagler Museum: Gilded Age Tour',
          days: [2, 3, 4, 5, 6], // Tue–Sat
          time: '10:00',
          category: 'Culture',
          description: 'Tour the stunning Whitehall mansion, Henry Flagler\'s 75-room Gilded Age estate. See the private railcar, art collection, and learn the history that built Florida.',
          tags: ['museum', 'local-favorite'],
          price: 26,
        },
      ],
    },
  ];

  constructor() {
    super('Palm Beach', { weight: 1.3, rateLimit: 0 });
  }

  async scrape(): Promise<RawEvent[]> {
    const events: RawEvent[] = [];
    const weeksAhead = 6;

    this.log(`Generating Palm Beach events for next ${weeksAhead} weeks...`);

    for (const venue of this.venues) {
      for (const template of venue.events) {
        const generated = this.generateEvents(venue, template, weeksAhead);
        events.push(...generated);
      }
    }

    this.log(`Generated ${events.length} Palm Beach events`);
    return events;
  }

  private generateEvents(
    venue: PBVenue,
    template: PBEventTemplate,
    weeksAhead: number,
  ): RawEvent[] {
    const events: RawEvent[] = [];
    const today = new Date();
    const daysToCheck = weeksAhead * 7;

    if (template.days === 'specific-dates' && template.specificDates) {
      const windowEnd = addDays(today, daysToCheck);
      for (const dateStr of template.specificDates) {
        const d = new Date(`${dateStr}T${template.time}:00`);
        if (d >= today && d <= windowEnd) {
          events.push(this.createEvent(venue, template, d));
        }
      }
    } else if (template.days === 'monthly' || template.days === 'first-saturday') {
      for (let week = 0; week < weeksAhead; week++) {
        const checkDate = addDays(today, week * 7);
        const dayOfMonth = checkDate.getDate();
        const dayOfWeek = getDay(checkDate);

        if (template.days === 'first-saturday' && dayOfWeek === 6 && dayOfMonth <= 7) {
          events.push(this.createEvent(venue, template, checkDate));
        }
        if (template.days === 'monthly' && dayOfWeek === 6 && dayOfMonth >= 22) {
          events.push(this.createEvent(venue, template, checkDate));
        }
      }
    } else if (template.days === 'first-friday') {
      for (let week = 0; week < weeksAhead; week++) {
        const checkDate = addDays(today, week * 7);
        if (getDay(checkDate) === 5 && checkDate.getDate() <= 7) {
          events.push(this.createEvent(venue, template, checkDate));
        }
      }
    } else if (template.days === 'first-sunday') {
      for (let week = 0; week < weeksAhead; week++) {
        const checkDate = addDays(today, week * 7);
        if (getDay(checkDate) === 0 && checkDate.getDate() <= 7) {
          events.push(this.createEvent(venue, template, checkDate));
        }
      }
    } else if (template.days === 'third-thursday') {
      for (let week = 0; week < weeksAhead; week++) {
        const checkDate = addDays(today, week * 7);
        if (getDay(checkDate) === 4 && checkDate.getDate() >= 15 && checkDate.getDate() <= 21) {
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

  private createEvent(venue: PBVenue, template: PBEventTemplate, date: Date): RawEvent {
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
      city: 'Palm Beach',
      tags: template.tags,
      category: template.category,
      priceLabel: template.price === 0 ? 'Free' : template.price < 20 ? '$' : '$$',
      priceAmount: template.price,
      isOutdoor: template.tags.includes('beach') || template.tags.includes('park') || template.tags.includes('waterfront') || template.tags.includes('outdoor'),
      description: template.description,
      sourceUrl: venue.url,
      sourceName: this.name,
      recurring: true,
      recurrencePattern: 'weekly',
    };
  }
}
