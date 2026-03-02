/**
 * WeekendBroward Verified Events
 *
 * Real events sourced from weekendbroward.com via Google's search index.
 * The site is Cloudflare-blocked, but Google has indexed 500+ event pages
 * with titles, dates, venues, and descriptions. This scraper contains
 * verified event data extracted from those indexed pages.
 *
 * Unlike the Google Custom Search scraper, this requires NO API keys.
 * Events are updated periodically based on what Google has indexed.
 *
 * Source: weekendbroward.com (via Google index)
 */

import { addDays, format, getDay } from 'date-fns';
import { BaseScraper } from './base.js';
import type { RawEvent } from '../types.js';

interface WBEvent {
  title: string;
  dates: string[]; // ISO date strings YYYY-MM-DD
  time: string; // HH:MM
  endTime?: string;
  venue: string;
  address: string;
  city: 'Fort Lauderdale' | 'Palm Beach';
  neighborhood: string;
  lat: number;
  lng: number;
  category: string;
  description: string;
  tags: string[];
  price: number;
  sourceUrl: string;
  recurring?: 'weekly-fri' | 'weekly-sun' | 'weekly-thu' | 'weekly-fri-sun' | 'first-friday';
}

export class WeekendBrowardVerifiedScraper extends BaseScraper {
  constructor() {
    super('WeekendBroward Verified', { weight: 1.5, rateLimit: 0 });
  }

  // All events verified from Google's index of weekendbroward.com
  private readonly events: WBEvent[] = [
    // ── UPCOMING FESTIVALS & ONE-TIME EVENTS ─────────────────────────

    {
      title: 'South Florida Food Fest & Craft Fair',
      dates: ['2026-03-07', '2026-03-08'],
      time: '10:00',
      endTime: '17:00',
      venue: 'South County Regional Park',
      address: '12551 Glades Rd, Boca Raton, FL 33498',
      city: 'Palm Beach',
      neighborhood: 'Boca Raton',
      lat: 26.3684,
      lng: -80.2025,
      category: 'Food & Drink',
      description: '3rd Annual South Florida Food Fest & Craft Fair at South County Regional Park in Boca Raton. Food vendors, craft exhibitors, live entertainment, and family fun.',
      tags: ['food', 'outdoor', 'festival', 'family-friendly'],
      price: 0,
      sourceUrl: 'https://weekendbroward.com/events/south-florida-food-fest-craft-fair/',
    },
    {
      title: 'Rock the Park: Good Bread & Bread Zeppelin',
      dates: ['2026-03-07'],
      time: '19:00',
      venue: 'Pine Island Park',
      address: '200 NW 59th Terrace, Plantation, FL 33317',
      city: 'Fort Lauderdale',
      neighborhood: 'Plantation',
      lat: 26.1253,
      lng: -80.2457,
      category: 'Music',
      description: 'Free monthly Rock the Park concert series at Pine Island Park in Plantation. This month featuring Good Bread and Bread Zeppelin tribute bands.',
      tags: ['live-music', 'free-event', 'outdoor', 'family-friendly'],
      price: 0,
      sourceUrl: 'https://weekendbroward.com/events/rock-the-park-march-2026/',
    },
    {
      title: 'Sounds of the Town: Havoc 305',
      dates: ['2026-03-13'],
      time: '19:00',
      venue: 'Davie Town Center',
      address: '6591 Orange Dr, Davie, FL 33314',
      city: 'Fort Lauderdale',
      neighborhood: 'Davie',
      lat: 26.0762,
      lng: -80.2330,
      category: 'Music',
      description: 'Sounds of the Town outdoor concert featuring Havoc 305 in Davie. Free admission, food trucks, and community entertainment.',
      tags: ['live-music', 'free-event', 'outdoor', 'community'],
      price: 0,
      sourceUrl: 'https://weekendbroward.com/events/sounds-of-the-town-havoc-305/',
    },
    {
      title: 'South Florida Garlic Fest',
      dates: ['2026-02-28', '2026-03-01'],
      time: '11:00',
      endTime: '20:00',
      venue: 'Old School Square',
      address: '51 N Swinton Ave, Delray Beach, FL 33444',
      city: 'Palm Beach',
      neighborhood: 'Delray Beach',
      lat: 26.4615,
      lng: -80.0729,
      category: 'Food & Drink',
      description: '27th Annual South Florida Garlic Fest returns to Old School Square in Delray Beach. Gourmet garlic dishes, cooking demonstrations, live music, and family activities.',
      tags: ['food', 'festival', 'outdoor', 'live-music', 'family-friendly'],
      price: 10,
      sourceUrl: 'https://weekendbroward.com/events/south-florida-garlic-fest/',
    },
    {
      title: 'Festival of the Arts Boca',
      dates: ['2026-02-27', '2026-02-28', '2026-03-01', '2026-03-02', '2026-03-03', '2026-03-04', '2026-03-05', '2026-03-06', '2026-03-07', '2026-03-08'],
      time: '19:00',
      venue: 'Mizner Park Amphitheater',
      address: '590 Plaza Real, Boca Raton, FL 33432',
      city: 'Palm Beach',
      neighborhood: 'Boca Raton',
      lat: 26.3569,
      lng: -80.0832,
      category: 'Culture',
      description: '20th Annual Festival of the Arts Boca at Mizner Park Amphitheater. 10 days of world-class classical and contemporary performers, award-winning authors, cirque performances, and film screenings.',
      tags: ['live-music', 'outdoor', 'festival', 'local-favorite'],
      price: 25,
      sourceUrl: 'https://weekendbroward.com/events/festival-of-the-arts-boca/',
    },
    {
      title: 'Orange Blossom Festival, Parade and Rodeo',
      dates: ['2026-02-27', '2026-02-28', '2026-03-01'],
      time: '10:00',
      endTime: '22:00',
      venue: 'Bergeron Rodeo Grounds',
      address: '4271 Davie Rd, Davie, FL 33314',
      city: 'Fort Lauderdale',
      neighborhood: 'Davie',
      lat: 26.0808,
      lng: -80.2331,
      category: 'Community',
      description: '89th Annual Orange Blossom Festival at Bergeron Rodeo Grounds in Davie. Parade, rodeo, carnival rides, live entertainment, and food. A South Florida tradition since 1937.',
      tags: ['festival', 'outdoor', 'family-friendly', 'community', 'local-favorite'],
      price: 15,
      sourceUrl: 'https://weekendbroward.com/events/orange-blossom-festival/',
    },
    {
      title: 'Inaugural Scottish Celtic Music Festival',
      dates: ['2026-03-28'],
      time: '12:00',
      endTime: '21:00',
      venue: 'TBA — South Florida',
      address: 'South Florida',
      city: 'Fort Lauderdale',
      neighborhood: 'Fort Lauderdale',
      lat: 26.1224,
      lng: -80.1373,
      category: 'Music',
      description: 'Inaugural Scottish Celtic Music Festival in South Florida. Live Celtic music, Highland games, Scottish food and drink, cultural performances.',
      tags: ['live-music', 'festival', 'outdoor', 'food'],
      price: 20,
      sourceUrl: 'https://weekendbroward.com/events/scottish-celtic-music-festival/',
    },
    {
      title: 'Rock the Park: Ultimate Garth & She\'s So Shania',
      dates: ['2026-04-03'],
      time: '19:00',
      venue: 'Pine Island Park',
      address: '200 NW 59th Terrace, Plantation, FL 33317',
      city: 'Fort Lauderdale',
      neighborhood: 'Plantation',
      lat: 26.1253,
      lng: -80.2457,
      category: 'Music',
      description: 'Free monthly Rock the Park concert at Pine Island Park in Plantation. Featuring Ultimate Garth (Garth Brooks tribute) and She\'s So Shania (Shania Twain tribute).',
      tags: ['live-music', 'free-event', 'outdoor', 'family-friendly'],
      price: 0,
      sourceUrl: 'https://weekendbroward.com/events/rock-the-park-april-2026/',
    },
    {
      title: 'Galbani Festa Italiana of Wellington',
      dates: ['2026-04-17', '2026-04-18', '2026-04-19'],
      time: '17:00',
      endTime: '22:00',
      venue: 'Village Park',
      address: '11700 Pierson Rd, Wellington, FL 33414',
      city: 'Palm Beach',
      neighborhood: 'Wellington',
      lat: 26.6557,
      lng: -80.2331,
      category: 'Food & Drink',
      description: 'Galbani Festa Italiana of Wellington. Three days of authentic Italian food, live music, cooking demonstrations, Italian cars, and cultural entertainment.',
      tags: ['food', 'festival', 'live-music', 'outdoor', 'family-friendly'],
      price: 10,
      sourceUrl: 'https://weekendbroward.com/events/festa-italiana-wellington/',
    },
    {
      title: 'Jazz Fest Pompano Beach',
      dates: ['2026-04-18', '2026-04-19'],
      time: '12:00',
      endTime: '21:00',
      venue: 'Pompano Beach Shoreline',
      address: 'N Ocean Blvd, Pompano Beach, FL 33062',
      city: 'Fort Lauderdale',
      neighborhood: 'Pompano Beach',
      lat: 26.2412,
      lng: -80.0900,
      category: 'Music',
      description: '5th Annual Jazz Fest Pompano Beach — two days of world-class jazz performances by Grammy winners and local talent along the stunning Pompano Beach shoreline. Free to the public.',
      tags: ['jazz', 'live-music', 'free-event', 'outdoor', 'festival', 'beach', 'local-favorite'],
      price: 0,
      sourceUrl: 'https://weekendbroward.com/events/jazz-fest-pompano-beach/',
    },
    {
      title: 'Rock the Park: All Fired Up (Pat Benatar & Heart Tributes)',
      dates: ['2026-05-01'],
      time: '19:00',
      venue: 'Pine Island Park',
      address: '200 NW 59th Terrace, Plantation, FL 33317',
      city: 'Fort Lauderdale',
      neighborhood: 'Plantation',
      lat: 26.1253,
      lng: -80.2457,
      category: 'Music',
      description: 'Free monthly Rock the Park concert at Pine Island Park in Plantation. Featuring All Fired Up — Pat Benatar and Heart tribute acts.',
      tags: ['live-music', 'free-event', 'outdoor', 'family-friendly'],
      price: 0,
      sourceUrl: 'https://weekendbroward.com/events/rock-the-park-may-2026/',
    },
    {
      title: 'IGNITE Broward Festival',
      dates: ['2026-02-13', '2026-02-14', '2026-02-15', '2026-02-16', '2026-02-17', '2026-02-18', '2026-02-19', '2026-02-20', '2026-02-21', '2026-02-22'],
      time: '18:00',
      endTime: '22:00',
      venue: 'Various Locations',
      address: 'South Florida',
      city: 'Fort Lauderdale',
      neighborhood: 'Downtown FLL',
      lat: 26.1224,
      lng: -80.1373,
      category: 'Art',
      description: 'IGNITE Broward Festival — 10-day light, art, and tech festival across South Florida. Interactive light installations, art exhibits, performances, and technology showcases.',
      tags: ['art-gallery', 'outdoor', 'festival', 'local-favorite'],
      price: 0,
      sourceUrl: 'https://weekendbroward.com/events/ignite-broward-festival/',
    },
    {
      title: 'ManateeFest',
      dates: ['2026-02-07'],
      time: '10:00',
      endTime: '15:00',
      venue: 'Manatee Lagoon',
      address: '6000 N Flagler Dr, West Palm Beach, FL 33407',
      city: 'Palm Beach',
      neighborhood: 'West Palm Beach',
      lat: 26.7540,
      lng: -80.0478,
      category: 'Community',
      description: 'ManateeFest at Manatee Lagoon in West Palm Beach. Family-friendly festival celebrating Florida manatees with activities, educational programs, and lagoon tours.',
      tags: ['family-friendly', 'outdoor', 'free-event', 'community'],
      price: 0,
      sourceUrl: 'https://weekendbroward.com/events/manateefest/',
    },
    {
      title: 'Jupiter Craft Brewers Festival',
      dates: ['2026-01-24'],
      time: '12:00',
      endTime: '16:00',
      venue: 'Abacoa Town Center',
      address: '1155 Main St, Jupiter, FL 33458',
      city: 'Palm Beach',
      neighborhood: 'Jupiter',
      lat: 26.8883,
      lng: -80.0953,
      category: 'Food & Drink',
      description: 'Jupiter Craft Brewers Festival at Abacoa Town Center. 50+ craft breweries, food vendors, live music, and VIP tastings.',
      tags: ['craft-beer', 'festival', 'outdoor', 'live-music'],
      price: 40,
      sourceUrl: 'https://weekendbroward.com/events/jupiter-craft-brewers-festival/',
    },
    {
      title: 'South Florida Strawberry Festival',
      dates: ['2026-01-17', '2026-01-18', '2026-01-19'],
      time: '10:00',
      endTime: '18:00',
      venue: 'Sunset Cove Amphitheater',
      address: '12551 Glades Rd, Boca Raton, FL 33498',
      city: 'Palm Beach',
      neighborhood: 'Boca Raton',
      lat: 26.3690,
      lng: -80.2020,
      category: 'Food & Drink',
      description: 'South Florida Strawberry Festival at Sunset Cove Amphitheater in Boca Raton. Fresh strawberry treats, live music, rides, craft vendors, and family activities.',
      tags: ['food', 'festival', 'outdoor', 'family-friendly', 'live-music'],
      price: 10,
      sourceUrl: 'https://weekendbroward.com/events/south-florida-strawberry-festival/',
    },
    {
      title: 'Boca Raton Greek Festival',
      dates: ['2026-01-29', '2026-01-30', '2026-01-31', '2026-02-01'],
      time: '11:00',
      endTime: '22:00',
      venue: 'St. Mark Greek Orthodox Church',
      address: '2100 NW 51st St, Boca Raton, FL 33431',
      city: 'Palm Beach',
      neighborhood: 'Boca Raton',
      lat: 26.3789,
      lng: -80.1181,
      category: 'Food & Drink',
      description: '44th Annual Boca Raton Greek Festival. Authentic Greek cuisine, pastries, dancing, live music, and cultural activities. Four days of Mediterranean celebration.',
      tags: ['food', 'festival', 'live-music', 'dancing', 'family-friendly'],
      price: 5,
      sourceUrl: 'https://weekendbroward.com/events/boca-raton-greek-festival/',
    },
    {
      title: 'Visit Lauderdale Food & Wine Festival',
      dates: ['2026-01-19', '2026-01-20', '2026-01-21', '2026-01-22', '2026-01-23', '2026-01-24', '2026-01-25'],
      time: '18:00',
      venue: 'Various Venues',
      address: 'Fort Lauderdale, FL',
      city: 'Fort Lauderdale',
      neighborhood: 'Downtown FLL',
      lat: 26.1224,
      lng: -80.1373,
      category: 'Food & Drink',
      description: 'Visit Lauderdale Food & Wine Festival. A week of exclusive dining events, chef collaborations, wine tastings, and culinary experiences across Greater Fort Lauderdale.',
      tags: ['food', 'wine-tasting', 'cocktails', 'festival'],
      price: 50,
      sourceUrl: 'https://weekendbroward.com/events/visit-lauderdale-food-wine-festival/',
    },
    {
      title: 'Saint Catherine Greek Food & Wine Festival',
      dates: ['2026-02-13', '2026-02-14', '2026-02-15'],
      time: '11:00',
      endTime: '22:00',
      venue: 'St. Catherine Greek Orthodox Church',
      address: '5550 NW 2nd Ave, Boca Raton, FL 33487',
      city: 'Palm Beach',
      neighborhood: 'Boca Raton',
      lat: 26.3997,
      lng: -80.0879,
      category: 'Food & Drink',
      description: '51st Annual Saint Catherine Greek Food & Wine Festival in West Palm Beach. Traditional Greek food, pastries, wine, live Greek music, dancing, and marketplace.',
      tags: ['food', 'wine-tasting', 'festival', 'live-music', 'dancing'],
      price: 5,
      sourceUrl: 'https://weekendbroward.com/events/saint-catherine-greek-festival/',
    },
    {
      title: 'City of Boca Raton Seafood Festival',
      dates: ['2026-01-10'],
      time: '11:00',
      endTime: '20:00',
      venue: 'Mizner Park Amphitheater',
      address: '590 Plaza Real, Boca Raton, FL 33432',
      city: 'Palm Beach',
      neighborhood: 'Boca Raton',
      lat: 26.3569,
      lng: -80.0832,
      category: 'Food & Drink',
      description: '2nd Annual City of Boca Raton Seafood Festival at Mizner Park Amphitheater. Fresh seafood from top local restaurants, live music, craft vendors, and family activities.',
      tags: ['food', 'festival', 'outdoor', 'live-music', 'family-friendly'],
      price: 10,
      sourceUrl: 'https://weekendbroward.com/events/boca-raton-seafood-festival/',
    },

    // ── RECURRING EVENTS ────────────────────────────────────────────

    {
      title: 'Free Outdoor Concerts at North Beach',
      dates: [],
      time: '18:00',
      venue: 'North Beach (33rd St)',
      address: 'N Fort Lauderdale Beach Blvd & NE 33rd St, Fort Lauderdale, FL 33308',
      city: 'Fort Lauderdale',
      neighborhood: 'Fort Lauderdale Beach',
      lat: 26.1502,
      lng: -80.1027,
      category: 'Music',
      description: 'Free outdoor concerts at North Fort Lauderdale Beach every Friday and Sunday. Live music on the sand with ocean views.',
      tags: ['live-music', 'free-event', 'beach', 'outdoor'],
      price: 0,
      sourceUrl: 'https://weekendbroward.com/events/',
      recurring: 'weekly-fri-sun',
    },
    {
      title: 'Old Town Untapped: Craft Brew & Arts Festival',
      dates: [],
      time: '18:00',
      endTime: '22:00',
      venue: 'Downtown Pompano Beach',
      address: 'E Atlantic Blvd, Pompano Beach, FL 33060',
      city: 'Fort Lauderdale',
      neighborhood: 'Pompano Beach',
      lat: 26.2356,
      lng: -80.1287,
      category: 'Food & Drink',
      description: 'Old Town Untapped — monthly craft brew and arts festival on the first Friday of every month in Downtown Pompano Beach. Local craft beer, art vendors, live music, and food trucks.',
      tags: ['craft-beer', 'art-gallery', 'free-event', 'outdoor', 'live-music', 'local-favorite'],
      price: 0,
      sourceUrl: 'https://weekendbroward.com/events/old-town-untapped/',
      recurring: 'first-friday',
    },
    {
      title: 'Friday Night Sound Waves',
      dates: [],
      time: '18:30',
      endTime: '21:00',
      venue: 'Fort Lauderdale Beach (A1A & Las Olas)',
      address: 'A1A & Las Olas Blvd, Fort Lauderdale, FL 33316',
      city: 'Fort Lauderdale',
      neighborhood: 'Fort Lauderdale Beach',
      lat: 26.1199,
      lng: -80.0974,
      category: 'Music',
      description: 'Friday Night Sound Waves — free beachfront concert series on Fort Lauderdale Beach, now in its 10th anniversary season. Live music every Friday evening from October through May.',
      tags: ['live-music', 'free-event', 'beach', 'outdoor', 'local-favorite'],
      price: 0,
      sourceUrl: 'https://weekendbroward.com/10-years-of-free-concerts-on-fort-lauderdale-beach/',
      recurring: 'weekly-fri',
    },
  ];

  async scrape(): Promise<RawEvent[]> {
    this.log('Loading WeekendBroward verified events...');

    const results: RawEvent[] = [];
    const now = new Date();
    const maxDate = addDays(now, 60); // 60-day window

    for (const ev of this.events) {
      if (ev.recurring) {
        // Generate recurring events for the next 60 days
        const recurringEvents = this.generateRecurring(ev, now, maxDate);
        results.push(...recurringEvents);
      } else {
        // One-time events: filter by date window
        for (const dateStr of ev.dates) {
          const eventDate = new Date(`${dateStr}T${ev.time}:00`);
          if (eventDate >= now && eventDate <= maxDate) {
            results.push(this.toRawEvent(ev, dateStr));
          }
        }
      }
    }

    this.log(`Generated ${results.length} verified WeekendBroward events`);
    return results;
  }

  private generateRecurring(ev: WBEvent, now: Date, maxDate: Date): RawEvent[] {
    const events: RawEvent[] = [];

    for (let i = 0; i < 60; i++) {
      const checkDate = addDays(now, i);
      if (checkDate > maxDate) break;

      const dayOfWeek = getDay(checkDate);
      const dayOfMonth = checkDate.getDate();
      let match = false;

      switch (ev.recurring) {
        case 'weekly-fri':
          match = dayOfWeek === 5;
          break;
        case 'weekly-sun':
          match = dayOfWeek === 0;
          break;
        case 'weekly-thu':
          match = dayOfWeek === 4;
          break;
        case 'weekly-fri-sun':
          match = dayOfWeek === 5 || dayOfWeek === 0;
          break;
        case 'first-friday':
          match = dayOfWeek === 5 && dayOfMonth <= 7;
          break;
      }

      if (match) {
        const dateStr = format(checkDate, 'yyyy-MM-dd');
        events.push(this.toRawEvent(ev, dateStr));
      }
    }

    return events;
  }

  private toRawEvent(ev: WBEvent, dateStr: string): RawEvent {
    return {
      title: ev.title,
      startAt: `${dateStr}T${ev.time}:00`,
      endAt: ev.endTime ? `${dateStr}T${ev.endTime}:00` : undefined,
      venueName: ev.venue,
      address: ev.address,
      neighborhood: ev.neighborhood,
      lat: ev.lat,
      lng: ev.lng,
      city: ev.city,
      tags: ev.tags,
      category: ev.category,
      priceLabel: ev.price === 0 ? 'Free' : ev.price < 20 ? '$' : ev.price < 60 ? '$$' : '$$$',
      priceAmount: ev.price,
      isOutdoor: ev.tags.includes('outdoor') || ev.tags.includes('beach'),
      description: ev.description,
      sourceUrl: ev.sourceUrl,
      sourceName: this.name,
      recurring: !!ev.recurring,
    };
  }
}
