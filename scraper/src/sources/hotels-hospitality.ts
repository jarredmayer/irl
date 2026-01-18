/**
 * Hotels & Hospitality Event Sources
 * The Standard, Faena, Freehand, Soho House
 */

import { addDays, format, getDay } from 'date-fns';
import { BaseScraper } from './base.js';
import type { RawEvent } from '../types.js';

interface HotelEvent {
  name: string;
  days: number[];
  time: string;
  category: string;
  description: string;
  tags: string[];
  price: number;
  isOutdoor: boolean;
}

interface HotelVenue {
  name: string;
  address: string;
  neighborhood: string;
  lat: number;
  lng: number;
  url: string;
  events: HotelEvent[];
}

export class HotelsHospitalityScraper extends BaseScraper {
  private hotels: HotelVenue[] = [
    // The Standard Miami
    {
      name: 'The Standard Spa Miami Beach',
      address: '40 Island Ave, Miami Beach, FL 33139',
      neighborhood: 'Miami Beach',
      lat: 25.7917,
      lng: -80.1574,
      url: 'https://standardhotels.com/miami',
      events: [
        {
          name: 'Sunday Pool Party at The Standard',
          days: [0], // Sunday
          time: '12:00',
          category: 'Nightlife',
          description: 'Legendary Sunday pool party with DJs, cocktails, and Biscayne Bay views.',
          tags: ['dj', 'waterfront', 'dancing'],
          price: 50,
          isOutdoor: true,
        },
        {
          name: 'Sunset Sound at The Standard',
          days: [5, 6], // Fri, Sat
          time: '18:00',
          category: 'Music',
          description: 'Live DJ sets at sunset overlooking the bay. Craft cocktails and small bites.',
          tags: ['dj', 'sunset', 'waterfront', 'cocktails'],
          price: 0,
          isOutdoor: true,
        },
        {
          name: 'Morning Yoga at The Standard',
          days: [6, 0], // Weekend
          time: '09:00',
          category: 'Wellness',
          description: 'Start your day with yoga overlooking Biscayne Bay. Open to non-guests.',
          tags: ['yoga', 'waterfront'],
          price: 25,
          isOutdoor: true,
        },
        {
          name: 'Sound Bath Meditation',
          days: [3], // Wednesday
          time: '19:00',
          category: 'Wellness',
          description: 'Healing sound bath meditation session in the spa. Deep relaxation experience.',
          tags: ['meditation', 'wellness'],
          price: 45,
          isOutdoor: false,
        },
      ],
    },
    // Faena Miami Beach
    {
      name: 'Faena Miami Beach',
      address: '3201 Collins Ave, Miami Beach, FL 33140',
      neighborhood: 'Mid-Beach',
      lat: 25.8112,
      lng: -80.1267,
      url: 'https://faena.com/miami-beach',
      events: [
        {
          name: 'Faena Theater Performance',
          days: [4, 5, 6], // Thu-Sat
          time: '21:00',
          category: 'Culture',
          description: 'Avant-garde performances in Faena\'s intimate cabaret theater. Art meets spectacle.',
          tags: ['theater', 'local-favorite'],
          price: 125,
          isOutdoor: false,
        },
        {
          name: 'Faena Bazaar Sunday Brunch',
          days: [0], // Sunday
          time: '11:00',
          category: 'Food & Drink',
          description: 'Lavish Sunday brunch at Faena Bazaar with live entertainment.',
          tags: ['brunch', 'live-music'],
          price: 85,
          isOutdoor: false,
        },
        {
          name: 'Art Talk at Faena',
          days: [6], // Saturday
          time: '16:00',
          category: 'Art',
          description: 'Guided tour and discussion of Faena\'s art collection, including Damien Hirst\'s mammoth.',
          tags: ['art-gallery', 'museum'],
          price: 0,
          isOutdoor: false,
        },
      ],
    },
    // Freehand Miami
    {
      name: 'Freehand Miami',
      address: '2727 Indian Creek Dr, Miami Beach, FL 33140',
      neighborhood: 'Mid-Beach',
      lat: 25.8089,
      lng: -80.1267,
      url: 'https://freehandhotels.com/miami/',
      events: [
        {
          name: 'Broken Shaker Happy Hour',
          days: [1, 2, 3, 4, 5], // Mon-Fri
          time: '17:00',
          category: 'Food & Drink',
          description: 'Happy hour at the award-winning Broken Shaker bar. Garden setting, craft cocktails.',
          tags: ['happy-hour', 'cocktails', 'local-favorite'],
          price: 0,
          isOutdoor: true,
        },
        {
          name: 'Live Music at Broken Shaker',
          days: [4, 5, 6], // Thu-Sat
          time: '20:00',
          category: 'Music',
          description: 'Live music in the garden bar. Jazz, soul, and acoustic sets.',
          tags: ['live-music', 'jazz', 'cocktails'],
          price: 0,
          isOutdoor: true,
        },
        {
          name: 'Sunday Funday at Freehand',
          days: [0], // Sunday
          time: '14:00',
          category: 'Community',
          description: 'Sunday afternoon hangout with games, DJs, and tropical drinks.',
          tags: ['dj', 'community', 'local-favorite'],
          price: 0,
          isOutdoor: true,
        },
      ],
    },
    // Soho Beach House
    {
      name: 'Soho Beach House',
      address: '4385 Collins Ave, Miami Beach, FL 33140',
      neighborhood: 'Mid-Beach',
      lat: 25.8189,
      lng: -80.1223,
      url: 'https://sohohouse.com/houses/soho-beach-house',
      events: [
        {
          name: 'Soho House Film Screening',
          days: [3], // Wednesday
          time: '20:00',
          category: 'Culture',
          description: 'Exclusive film screening at Soho Beach House. Members and guests.',
          tags: ['theater'],
          price: 0,
          isOutdoor: false,
        },
        {
          name: 'Rooftop DJ at Soho House',
          days: [5, 6], // Fri, Sat
          time: '21:00',
          category: 'Nightlife',
          description: 'Rooftop DJ sessions with ocean views. Members and guests.',
          tags: ['dj', 'rooftop', 'waterfront'],
          price: 0,
          isOutdoor: true,
        },
        {
          name: 'Wellness Wednesday at Soho House',
          days: [3], // Wednesday
          time: '08:00',
          category: 'Wellness',
          description: 'Morning wellness programming including yoga, meditation, and fitness.',
          tags: ['yoga', 'meditation', 'fitness-class'],
          price: 0,
          isOutdoor: true,
        },
      ],
    },
    // Edition Miami Beach
    {
      name: 'The Miami Beach EDITION',
      address: '2901 Collins Ave, Miami Beach, FL 33140',
      neighborhood: 'Mid-Beach',
      lat: 25.8089,
      lng: -80.1267,
      url: 'https://editionhotels.com/miami-beach/',
      events: [
        {
          name: 'Market at EDITION',
          days: [0], // Sunday
          time: '10:00',
          category: 'Food & Drink',
          description: 'Sunday morning market featuring local artisans, food vendors, and live music.',
          tags: ['food-market', 'local-favorite'],
          price: 0,
          isOutdoor: true,
        },
        {
          name: 'Sunset Sessions at EDITION',
          days: [5, 6], // Fri, Sat
          time: '17:00',
          category: 'Music',
          description: 'DJ sets at sunset by the pool. Cocktails and ocean breeze.',
          tags: ['dj', 'sunset', 'waterfront'],
          price: 0,
          isOutdoor: true,
        },
      ],
    },
    // 1 Hotel South Beach
    {
      name: '1 Hotel South Beach',
      address: '2341 Collins Ave, Miami Beach, FL 33139',
      neighborhood: 'South Beach',
      lat: 25.7989,
      lng: -80.1289,
      url: 'https://1hotels.com/south-beach',
      events: [
        {
          name: 'Rooftop Yoga at 1 Hotel',
          days: [6, 0], // Weekend
          time: '08:00',
          category: 'Wellness',
          description: 'Morning yoga on the rooftop with ocean views. Complimentary for guests.',
          tags: ['yoga', 'rooftop', 'sunrise'],
          price: 30,
          isOutdoor: true,
        },
        {
          name: 'Sunset Meditation at 1 Hotel',
          days: [0], // Sunday
          time: '18:00',
          category: 'Wellness',
          description: 'Guided meditation session at sunset. Find your calm with ocean sounds.',
          tags: ['meditation', 'sunset', 'waterfront'],
          price: 25,
          isOutdoor: true,
        },
      ],
    },
  ];

  constructor() {
    super('Hotels & Hospitality', { weight: 1.3, rateLimit: 0 });
  }

  async scrape(): Promise<RawEvent[]> {
    const events: RawEvent[] = [];
    const weeksAhead = 6;

    this.log(`Generating hotel events for next ${weeksAhead} weeks...`);

    for (const hotel of this.hotels) {
      for (const eventTemplate of hotel.events) {
        const generated = this.generateHotelEvents(hotel, eventTemplate, weeksAhead);
        events.push(...generated);
      }
    }

    this.log(`Generated ${events.length} hotel events`);
    return events;
  }

  private generateHotelEvents(
    hotel: HotelVenue,
    template: HotelEvent,
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
          venueName: hotel.name,
          address: hotel.address,
          neighborhood: hotel.neighborhood,
          lat: hotel.lat,
          lng: hotel.lng,
          city: 'Miami',
          tags: template.tags,
          category: template.category,
          priceLabel: template.price === 0 ? 'Free' : template.price > 50 ? '$$$' : template.price > 25 ? '$$' : '$',
          priceAmount: template.price,
          isOutdoor: template.isOutdoor,
          description: template.description,
          sourceUrl: hotel.url,
          sourceName: this.name,
          recurring: true,
          recurrencePattern: 'weekly',
        });
      }
    }

    return events;
  }
}
