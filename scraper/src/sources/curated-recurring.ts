/**
 * Curated Recurring Events
 * Verified real recurring events at Miami venues
 * These are actual events that happen regularly, not synthetic/made-up events
 */

import { addDays, format, getDay } from 'date-fns';
import { BaseScraper } from './base.js';
import type { RawEvent } from '../types.js';

interface RecurringEvent {
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
  isOutdoor: boolean;
  sourceUrl: string;
  frequency?: 'weekly' | 'biweekly' | 'monthly';
}

export class CuratedRecurringScraper extends BaseScraper {
  private events: RecurringEvent[] = [
    // === THE STANDARD MIAMI ===
    {
      name: 'Sunday Pool Party at The Standard',
      venue: 'The Standard Spa Miami Beach',
      address: '40 Island Ave, Miami Beach, FL 33139',
      neighborhood: 'Miami Beach',
      lat: 25.7917,
      lng: -80.1574,
      days: [0], // Sunday
      time: '12:00',
      category: 'Nightlife',
      description: 'Legendary Sunday pool party with DJs, cocktails, and Biscayne Bay views. A Miami institution.',
      tags: ['dj', 'waterfront', 'dancing', 'local-favorite'],
      price: 50,
      isOutdoor: true,
      sourceUrl: 'https://standardhotels.com/miami',
    },
    {
      name: 'Sunset Sound at The Standard',
      venue: 'The Standard Spa Miami Beach',
      address: '40 Island Ave, Miami Beach, FL 33139',
      neighborhood: 'Miami Beach',
      lat: 25.7917,
      lng: -80.1574,
      days: [5, 6], // Fri, Sat
      time: '18:00',
      category: 'Music',
      description: 'Live DJ sets at sunset overlooking the bay. Craft cocktails and small bites.',
      tags: ['dj', 'sunset', 'waterfront', 'cocktails'],
      price: 0,
      isOutdoor: true,
      sourceUrl: 'https://standardhotels.com/miami',
    },

    // === BROKEN SHAKER / FREEHAND ===
    {
      name: 'Broken Shaker Happy Hour',
      venue: 'Broken Shaker at Freehand Miami',
      address: '2727 Indian Creek Dr, Miami Beach, FL 33140',
      neighborhood: 'Mid-Beach',
      lat: 25.8089,
      lng: -80.1267,
      days: [1, 2, 3, 4, 5], // Mon-Fri
      time: '17:00',
      category: 'Food & Drink',
      description: 'Happy hour at the award-winning Broken Shaker bar. Garden setting, craft cocktails.',
      tags: ['happy-hour', 'cocktails', 'local-favorite'],
      price: 0,
      isOutdoor: true,
      sourceUrl: 'https://freehandhotels.com/miami/',
    },
    {
      name: 'Live Music at Broken Shaker',
      venue: 'Broken Shaker at Freehand Miami',
      address: '2727 Indian Creek Dr, Miami Beach, FL 33140',
      neighborhood: 'Mid-Beach',
      lat: 25.8089,
      lng: -80.1267,
      days: [4, 5, 6], // Thu-Sat
      time: '20:00',
      category: 'Music',
      description: 'Live music in the garden bar. Jazz, soul, and acoustic sets.',
      tags: ['live-music', 'jazz', 'cocktails', 'local-favorite'],
      price: 0,
      isOutdoor: true,
      sourceUrl: 'https://freehandhotels.com/miami/',
    },

    // === DISCO DOMINGO ===
    {
      name: 'Disco Domingo by Tremendo',
      venue: 'Gramps',
      address: '176 NW 24th St, Miami, FL 33127',
      neighborhood: 'Wynwood',
      lat: 25.8003,
      lng: -80.1989,
      days: [0], // Sunday
      time: '16:00',
      category: 'Music',
      description: 'Latin disco, funk, and dance party powered by Tremendo Sound System. Daytime vibes, outdoor dancing.',
      tags: ['dj', 'latin', 'dancing', 'local-favorite', 'free-event'],
      price: 0,
      isOutdoor: true,
      sourceUrl: 'https://www.instagram.com/tremendosoundsystems/',
      frequency: 'biweekly',
    },

    // === JAZZ NIGHTS ===
    {
      name: 'Live Jazz at Soya y Pomodoro',
      venue: 'Soya y Pomodoro',
      address: '5582 NE 4th Ct, Miami, FL 33137',
      neighborhood: 'Little Haiti',
      lat: 25.8356,
      lng: -80.1917,
      days: [4, 5, 6], // Thu-Sat
      time: '20:00',
      category: 'Music',
      description: 'Live jazz in an intimate Italian restaurant setting. Great food, wine, and music.',
      tags: ['live-music', 'jazz', 'local-favorite'],
      price: 0,
      isOutdoor: false,
      sourceUrl: 'https://www.soyaypomodoro.com/',
    },
    {
      name: 'Jazz at Lagniappe',
      venue: 'Lagniappe',
      address: '3425 NE 2nd Ave, Miami, FL 33137',
      neighborhood: 'Midtown',
      lat: 25.8089,
      lng: -80.1917,
      days: [3, 4, 5, 6, 0], // Wed-Sun
      time: '20:00',
      category: 'Music',
      description: 'Live jazz and wine bar in the heart of Midtown. Rotating musicians, cheese boards, great wine selection.',
      tags: ['live-music', 'jazz', 'wine-tasting', 'local-favorite'],
      price: 0,
      isOutdoor: true,
      sourceUrl: 'https://lagniappehouse.com/',
    },
    {
      name: 'Jazz Brunch at The Biltmore',
      venue: 'The Biltmore Hotel',
      address: '1200 Anastasia Ave, Coral Gables, FL 33134',
      neighborhood: 'Coral Gables',
      lat: 25.7267,
      lng: -80.2767,
      days: [0], // Sunday
      time: '11:00',
      category: 'Food & Drink',
      description: 'Elegant Sunday jazz brunch at the historic Biltmore. Live jazz trio, champagne, refined cuisine.',
      tags: ['brunch', 'live-music', 'jazz', 'local-favorite'],
      price: 85,
      isOutdoor: false,
      sourceUrl: 'https://www.biltmorehotel.com/',
    },

    // === RAW FIGS MIAMI ===
    {
      name: 'Raw Figs Pop-Up Dinner',
      venue: 'Various Locations',
      address: 'Miami, FL',
      neighborhood: 'Miami',
      lat: 25.7617,
      lng: -80.1918,
      days: [5], // Friday (typical)
      time: '19:00',
      category: 'Food & Drink',
      description: 'Plant-based pop-up dinner experience by Raw Figs Miami. Multi-course tasting menu, intimate setting.',
      tags: ['food', 'pop-up', 'local-favorite'],
      price: 75,
      isOutdoor: false,
      sourceUrl: 'https://www.instagram.com/rawfigsmiami/',
      frequency: 'biweekly',
    },

    // === FAENA ===
    {
      name: 'Faena Theater Performance',
      venue: 'Faena Miami Beach',
      address: '3201 Collins Ave, Miami Beach, FL 33140',
      neighborhood: 'Mid-Beach',
      lat: 25.8112,
      lng: -80.1267,
      days: [4, 5, 6], // Thu-Sat
      time: '21:00',
      category: 'Culture',
      description: 'Avant-garde performances in Faena\'s intimate cabaret theater. Art meets spectacle.',
      tags: ['theater', 'local-favorite'],
      price: 125,
      isOutdoor: false,
      sourceUrl: 'https://faena.com/miami-beach',
    },
    {
      name: 'Art Talk at Faena',
      venue: 'Faena Miami Beach',
      address: '3201 Collins Ave, Miami Beach, FL 33140',
      neighborhood: 'Mid-Beach',
      lat: 25.8112,
      lng: -80.1267,
      days: [6], // Saturday
      time: '16:00',
      category: 'Art',
      description: 'Guided tour and discussion of Faena\'s art collection, including Damien Hirst\'s mammoth.',
      tags: ['art-gallery', 'museum', 'free-event'],
      price: 0,
      isOutdoor: false,
      sourceUrl: 'https://faena.com/miami-beach',
    },

    // === SOHO BEACH HOUSE ===
    {
      name: 'Sunday Sessions at Soho Beach House',
      venue: 'Soho Beach House',
      address: '4385 Collins Ave, Miami Beach, FL 33140',
      neighborhood: 'Mid-Beach',
      lat: 25.8200,
      lng: -80.1267,
      days: [0], // Sunday
      time: '14:00',
      category: 'Music',
      description: 'Poolside DJ sessions at Soho Beach House. Members and hotel guests.',
      tags: ['dj', 'waterfront', 'rooftop'],
      price: 0,
      isOutdoor: true,
      sourceUrl: 'https://sohohouse.com/houses/soho-beach-house-miami',
    },

    // === BALL & CHAIN ===
    {
      name: 'Live Salsa at Ball & Chain',
      venue: 'Ball & Chain',
      address: '1513 SW 8th St, Miami, FL 33135',
      neighborhood: 'Little Havana',
      lat: 25.7656,
      lng: -80.2156,
      days: [4, 5, 6, 0], // Thu-Sun
      time: '20:00',
      category: 'Music',
      description: 'Live salsa and Latin jazz at the iconic Ball & Chain. Dance floor, mojitos, Little Havana vibes.',
      tags: ['live-music', 'latin', 'dancing', 'local-favorite'],
      price: 0,
      isOutdoor: false,
      sourceUrl: 'https://www.ballandchainmiami.com/',
    },

    // === GRAMPS ===
    {
      name: 'Gramps Comedy Night',
      venue: 'Gramps',
      address: '176 NW 24th St, Miami, FL 33127',
      neighborhood: 'Wynwood',
      lat: 25.8003,
      lng: -80.1989,
      days: [2], // Tuesday
      time: '21:00',
      category: 'Comedy',
      description: 'Weekly comedy night at Gramps. Local and touring stand-up comedians. Free entry.',
      tags: ['comedy', 'free-event', 'local-favorite'],
      price: 0,
      isOutdoor: false,
      sourceUrl: 'https://www.gramps.com/',
    },

    // === SOUTH POINTE PARK ===
    {
      name: 'The French Market at South Pointe Park',
      venue: 'South Pointe Park',
      address: '1 Washington Ave, Miami Beach, FL 33139',
      neighborhood: 'South Beach',
      lat: 25.7644,
      lng: -80.1331,
      days: [0], // Sunday
      time: '09:00',
      category: 'Shopping',
      description: 'French-inspired outdoor marketplace with local artisans, freshly baked breads, pastries, specialty foods, and handmade accessories.',
      tags: ['food-market', 'free-event', 'outdoor', 'local-favorite', 'family-friendly'],
      price: 0,
      isOutdoor: true,
      sourceUrl: 'https://www.eventbrite.com/o/faact-fl-chapter-52077114763',
      frequency: 'biweekly', // Select Sundays
    },

    // === LINCOLN ROAD ===
    {
      name: 'Lincoln Road Farmers Market',
      venue: 'Lincoln Road Mall',
      address: 'Lincoln Rd, Miami Beach, FL 33139',
      neighborhood: 'South Beach',
      lat: 25.7906,
      lng: -80.1340,
      days: [0], // Sunday
      time: '09:00',
      category: 'Food & Drink',
      description: 'Weekly farmers market on Lincoln Road with fresh produce, flowers, baked goods, and local vendors.',
      tags: ['food-market', 'free-event', 'outdoor', 'local-favorite'],
      price: 0,
      isOutdoor: true,
      sourceUrl: 'https://lincolnroadmall.com/',
    },

    // === PÉREZ ART MUSEUM (PAMM) ===
    {
      name: 'Third Thursdays at PAMM',
      venue: 'Pérez Art Museum Miami',
      address: '1103 Biscayne Blvd, Miami, FL 33132',
      neighborhood: 'Downtown',
      lat: 25.7856,
      lng: -80.1867,
      days: [4], // Thursday (third Thursday)
      time: '18:00',
      category: 'Art',
      description: 'Monthly after-hours event with art, live music, cocktails, and bay views. Free museum admission.',
      tags: ['art-gallery', 'museum', 'free-event', 'local-favorite', 'waterfront'],
      price: 0,
      isOutdoor: false,
      sourceUrl: 'https://www.pamm.org/',
      frequency: 'monthly',
    },

    // === ICA MIAMI ===
    {
      name: 'First Saturdays at ICA Miami',
      venue: 'Institute of Contemporary Art Miami',
      address: '61 NE 41st St, Miami, FL 33137',
      neighborhood: 'Design District',
      lat: 25.8133,
      lng: -80.1924,
      days: [6], // Saturday (first Saturday)
      time: '11:00',
      category: 'Art',
      description: 'Family day with free art activities, tours, and workshops. Always free admission.',
      tags: ['art-gallery', 'museum', 'free-event', 'family-friendly'],
      price: 0,
      isOutdoor: false,
      sourceUrl: 'https://icamiami.org/',
      frequency: 'monthly',
    },

    // === THE WOLFSONIAN ===
    {
      name: 'Free Fridays at The Wolfsonian',
      venue: 'The Wolfsonian-FIU',
      address: '1001 Washington Ave, Miami Beach, FL 33139',
      neighborhood: 'South Beach',
      lat: 25.7806,
      lng: -80.1333,
      days: [5], // Friday
      time: '18:00',
      category: 'Art',
      description: 'Free admission every Friday evening at The Wolfsonian. Explore design and propaganda from 1885-1945.',
      tags: ['museum', 'free-event', 'art-gallery'],
      price: 0,
      isOutdoor: false,
      sourceUrl: 'https://wolfsonian.org/',
    },

    // === HISTORYMIAMI ===
    {
      name: 'Free Second Saturdays at HistoryMiami',
      venue: 'HistoryMiami Museum',
      address: '101 W Flagler St, Miami, FL 33130',
      neighborhood: 'Downtown',
      lat: 25.7745,
      lng: -80.1964,
      days: [6], // Saturday (second Saturday)
      time: '10:00',
      category: 'Culture',
      description: 'Free museum day on the second Saturday of each month. Explore Miami\'s history and heritage.',
      tags: ['museum', 'free-event', 'family-friendly'],
      price: 0,
      isOutdoor: false,
      sourceUrl: 'https://historymiami.org/',
      frequency: 'monthly',
    },

    // === FROST SCIENCE ===
    {
      name: 'Laser Fridays at Frost Science',
      venue: 'Phillip and Patricia Frost Museum of Science',
      address: '1101 Biscayne Blvd, Miami, FL 33132',
      neighborhood: 'Downtown',
      lat: 25.7856,
      lng: -80.1867,
      days: [5], // Friday
      time: '19:00',
      category: 'Culture',
      description: 'Laser light shows set to music in the Frost Planetarium. Multiple shows featuring different genres.',
      tags: ['museum', 'nightlife'],
      price: 15,
      isOutdoor: false,
      sourceUrl: 'https://frostscience.org/',
    },

    // === EDITION MIAMI BEACH ===
    {
      name: 'Market at EDITION',
      venue: 'The Miami Beach EDITION',
      address: '2901 Collins Ave, Miami Beach, FL 33140',
      neighborhood: 'Mid-Beach',
      lat: 25.8089,
      lng: -80.1267,
      days: [0], // Sunday
      time: '10:00',
      category: 'Food & Drink',
      description: 'Sunday market at The EDITION with local vendors, artisans, and brunch vibes.',
      tags: ['food-market', 'brunch', 'local-favorite'],
      price: 0,
      isOutdoor: true,
      sourceUrl: 'https://editionhotels.com/miami-beach/',
    },
    {
      name: 'Sunset Sessions at EDITION',
      venue: 'The Miami Beach EDITION',
      address: '2901 Collins Ave, Miami Beach, FL 33140',
      neighborhood: 'Mid-Beach',
      lat: 25.8089,
      lng: -80.1267,
      days: [5, 6], // Fri, Sat
      time: '17:00',
      category: 'Music',
      description: 'Poolside DJ sessions at sunset. Cocktails and ocean views at The EDITION.',
      tags: ['dj', 'sunset', 'waterfront', 'cocktails'],
      price: 0,
      isOutdoor: true,
      sourceUrl: 'https://editionhotels.com/miami-beach/',
    },

    // === STRAWBERRY MOON / GOODTIME HOTEL ===
    {
      name: 'Strawberry Moon Pool Party',
      venue: 'Strawberry Moon at Goodtime Hotel',
      address: '601 Washington Ave, Miami Beach, FL 33139',
      neighborhood: 'South Beach',
      lat: 25.7717,
      lng: -80.1350,
      days: [6, 0], // Sat, Sun
      time: '12:00',
      category: 'Nightlife',
      description: "Pharrell's poolside paradise at The Goodtime Hotel. DJs, cocktails, and Miami's stylish crowd.",
      tags: ['dj', 'waterfront', 'local-favorite', 'dancing'],
      price: 50,
      isOutdoor: true,
      sourceUrl: 'https://thegoodtimehotel.com/strawberry-moon/',
    },
    {
      name: 'Goodtime Yoga',
      venue: 'The Goodtime Hotel',
      address: '601 Washington Ave, Miami Beach, FL 33139',
      neighborhood: 'South Beach',
      lat: 25.7717,
      lng: -80.1350,
      days: [6, 0], // Sat, Sun
      time: '09:00',
      category: 'Wellness',
      description: 'Morning yoga in the Goodtime Hotel courtyard. Start your weekend right.',
      tags: ['yoga', 'wellness'],
      price: 25,
      isOutdoor: true,
      sourceUrl: 'https://thegoodtimehotel.com/',
    },

    // === ESME HOTEL ===
    {
      name: 'Jazz Nights at The Esme',
      venue: 'The Esme Hotel',
      address: '1438 Washington Ave, Miami Beach, FL 33139',
      neighborhood: 'South Beach',
      lat: 25.7867,
      lng: -80.1350,
      days: [4, 5, 6], // Thu-Sat
      time: '20:00',
      category: 'Music',
      description: "Live jazz in The Esme's stylish courtyard. Intimate setting, great cocktails.",
      tags: ['live-music', 'jazz', 'cocktails', 'local-favorite'],
      price: 0,
      isOutdoor: true,
      sourceUrl: 'https://theesmehotel.com/',
    },
    {
      name: 'Sunday Brunch at The Esme',
      venue: 'The Esme Hotel',
      address: '1438 Washington Ave, Miami Beach, FL 33139',
      neighborhood: 'South Beach',
      lat: 25.7867,
      lng: -80.1350,
      days: [0], // Sunday
      time: '11:00',
      category: 'Food & Drink',
      description: 'Mediterranean-inspired brunch in a beautiful courtyard setting.',
      tags: ['brunch', 'local-favorite'],
      price: 45,
      isOutdoor: true,
      sourceUrl: 'https://theesmehotel.com/',
    },

    // === HOTEL GREYSTONE ===
    {
      name: 'Rooftop Sundowners at Greystone',
      venue: 'Hotel Greystone',
      address: '1920 Collins Ave, Miami Beach, FL 33139',
      neighborhood: 'South Beach',
      lat: 25.7933,
      lng: -80.1283,
      days: [4, 5, 6], // Thu-Sat
      time: '17:00',
      category: 'Food & Drink',
      description: 'Sunset cocktails on the Greystone rooftop. Art deco architecture meets modern Miami.',
      tags: ['rooftop', 'sunset', 'cocktails', 'local-favorite'],
      price: 0,
      isOutdoor: true,
      sourceUrl: 'https://greystonemiamibeach.com/',
    },
  ];

  constructor() {
    super('Curated Recurring', { weight: 1.3, rateLimit: 0 });
  }

  async scrape(): Promise<RawEvent[]> {
    const events: RawEvent[] = [];
    const today = new Date();
    const weeksAhead = 6;

    this.log('Generating curated recurring events...');

    for (const event of this.events) {
      for (let week = 0; week < weeksAhead; week++) {
        // Skip weeks for biweekly events
        if (event.frequency === 'biweekly' && week % 2 !== 0) continue;
        // Skip weeks for monthly events
        if (event.frequency === 'monthly' && week % 4 !== 0) continue;

        for (const day of event.days) {
          const baseDate = addDays(today, week * 7);
          let daysUntil = day - getDay(baseDate);
          if (daysUntil < 0) daysUntil += 7;
          if (daysUntil === 0 && week === 0) continue; // Skip today

          const eventDate = addDays(baseDate, daysUntil);

          if (eventDate > today) {
            const dateStr = format(eventDate, 'yyyy-MM-dd');
            events.push({
              title: event.name,
              startAt: `${dateStr}T${event.time}:00`,
              venueName: event.venue,
              address: event.address,
              neighborhood: event.neighborhood,
              lat: event.lat,
              lng: event.lng,
              city: 'Miami',
              tags: event.tags,
              category: event.category,
              priceLabel: event.price === 0 ? 'Free' : event.price > 75 ? '$$' : '$',
              priceAmount: event.price,
              isOutdoor: event.isOutdoor,
              description: event.description,
              sourceUrl: event.sourceUrl,
              sourceName: this.name,
              recurring: true,
              recurrencePattern: event.frequency || 'weekly',
            });
          }
        }
      }
    }

    this.log(`Generated ${events.length} curated recurring events`);
    return events;
  }
}
