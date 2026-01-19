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
    // Strawberry Moon at Goodtime Hotel
    {
      name: 'Strawberry Moon',
      address: '601 Washington Ave, Miami Beach, FL 33139',
      neighborhood: 'South Beach',
      lat: 25.7729,
      lng: -80.1347,
      url: 'https://thegoodtimehotel.com/strawberry-moon/',
      events: [
        {
          name: 'Strawberry Moon Pool Party',
          days: [6, 0], // Sat, Sun
          time: '12:00',
          category: 'Nightlife',
          description: 'Pharrell\'s poolside paradise at The Goodtime Hotel. DJs, cocktails, and Miami\'s stylish crowd.',
          tags: ['dj', 'pool', 'local-favorite', 'dancing'],
          price: 50,
          isOutdoor: true,
        },
        {
          name: 'Strawberry Moon Sunset Session',
          days: [5, 6], // Fri, Sat
          time: '17:00',
          category: 'Nightlife',
          description: 'Golden hour vibes at Strawberry Moon. Tropical cocktails and chill DJ sets as the sun goes down.',
          tags: ['dj', 'sunset', 'pool', 'cocktails'],
          price: 0,
          isOutdoor: true,
        },
      ],
    },
    // The Goodtime Hotel
    {
      name: 'The Goodtime Hotel',
      address: '601 Washington Ave, Miami Beach, FL 33139',
      neighborhood: 'South Beach',
      lat: 25.7729,
      lng: -80.1347,
      url: 'https://thegoodtimehotel.com/',
      events: [
        {
          name: 'Goodtime Yoga',
          days: [6, 0], // Weekend
          time: '09:00',
          category: 'Wellness',
          description: 'Morning yoga in the Goodtime Hotel courtyard. Start your weekend right.',
          tags: ['yoga', 'free-event'],
          price: 0,
          isOutdoor: true,
        },
      ],
    },
    // The Esme Hotel
    {
      name: 'The Esme Hotel',
      address: '1438 Washington Ave, Miami Beach, FL 33139',
      neighborhood: 'South Beach',
      lat: 25.7892,
      lng: -80.1347,
      url: 'https://theesmehotel.com/',
      events: [
        {
          name: 'Jazz Nights at The Esme',
          days: [4, 5, 6], // Thu-Sat
          time: '20:00',
          category: 'Music',
          description: 'Live jazz in The Esme\'s stylish courtyard. Intimate setting, great cocktails.',
          tags: ['jazz', 'live-music', 'cocktails', 'local-favorite'],
          price: 0,
          isOutdoor: true,
        },
        {
          name: 'Sunday Brunch at The Esme',
          days: [0], // Sunday
          time: '11:00',
          category: 'Food & Drink',
          description: 'Elegant Sunday brunch with Mediterranean flavors in a beautiful courtyard setting.',
          tags: ['brunch', 'local-favorite'],
          price: 65,
          isOutdoor: true,
        },
      ],
    },
    // Shelborne South Beach
    {
      name: 'Shelborne South Beach',
      address: '1801 Collins Ave, Miami Beach, FL 33139',
      neighborhood: 'South Beach',
      lat: 25.7928,
      lng: -80.1289,
      url: 'https://shelbornesouthbeach.com/',
      events: [
        {
          name: 'Pool Sessions at Shelborne',
          days: [5, 6, 0], // Fri-Sun
          time: '13:00',
          category: 'Nightlife',
          description: 'Poolside DJ sets at Shelborne\'s iconic art deco pool. Open to public.',
          tags: ['dj', 'pool', 'waterfront'],
          price: 35,
          isOutdoor: true,
        },
      ],
    },
    // Delano South Beach
    {
      name: 'Delano South Beach',
      address: '1685 Collins Ave, Miami Beach, FL 33139',
      neighborhood: 'South Beach',
      lat: 25.7912,
      lng: -80.1289,
      url: 'https://delanosouthbeach.com/',
      events: [
        {
          name: 'FDR Lounge Night',
          days: [4, 5, 6], // Thu-Sat
          time: '22:00',
          category: 'Nightlife',
          description: 'Late-night in the legendary FDR underground lounge at Delano. Intimate and exclusive.',
          tags: ['dj', 'nightlife', 'dancing'],
          price: 30,
          isOutdoor: false,
        },
        {
          name: 'Rose Bar Happy Hour',
          days: [1, 2, 3, 4, 5], // Mon-Fri
          time: '17:00',
          category: 'Food & Drink',
          description: 'Happy hour at Delano\'s iconic Rose Bar. Classic cocktails in Philippe Starck\'s legendary design.',
          tags: ['happy-hour', 'cocktails', 'local-favorite'],
          price: 0,
          isOutdoor: false,
        },
      ],
    },
    // The Betsy Hotel
    {
      name: 'The Betsy Hotel',
      address: '1440 Ocean Dr, Miami Beach, FL 33139',
      neighborhood: 'South Beach',
      lat: 25.7867,
      lng: -80.1289,
      url: 'https://thebetsyhotel.com/',
      events: [
        {
          name: 'Jazz at The Betsy',
          days: [3, 4, 5, 6], // Wed-Sat
          time: '20:00',
          category: 'Music',
          description: 'Nightly jazz performances at The Betsy\'s rooftop. Ocean views and sophisticated vibes.',
          tags: ['jazz', 'live-music', 'rooftop', 'local-favorite'],
          price: 0,
          isOutdoor: true,
        },
        {
          name: 'Betsy Poetry Salon',
          days: [2], // Tuesday
          time: '19:00',
          category: 'Culture',
          description: 'Monthly poetry readings and literary events at The Betsy, a hotel known for arts programming.',
          tags: ['workshop', 'community', 'local-favorite'],
          price: 0,
          isOutdoor: false,
        },
        {
          name: 'Sunday Sounds at The Betsy',
          days: [0], // Sunday
          time: '16:00',
          category: 'Music',
          description: 'Sunday afternoon jazz session on The Betsy\'s rooftop with ocean views and tropical cocktails.',
          tags: ['jazz', 'live-music', 'rooftop', 'sunset'],
          price: 0,
          isOutdoor: true,
        },
      ],
    },
    // Hotel Greystone
    {
      name: 'Hotel Greystone',
      address: '1920 Collins Ave, Miami Beach, FL 33139',
      neighborhood: 'South Beach',
      lat: 25.7945,
      lng: -80.1289,
      url: 'https://greystonemiamibeach.com/',
      events: [
        {
          name: 'Rooftop Sundowners at Greystone',
          days: [4, 5, 6], // Thu-Sat
          time: '18:00',
          category: 'Food & Drink',
          description: 'Sunset cocktails on the Greystone rooftop. Art deco architecture meets modern Miami.',
          tags: ['rooftop', 'cocktails', 'sunset'],
          price: 0,
          isOutdoor: true,
        },
      ],
    },
    // The Moore Hotel (Design District)
    {
      name: 'The Moore Hotel',
      address: '4040 NE 2nd Ave, Miami, FL 33137',
      neighborhood: 'Design District',
      lat: 25.8134,
      lng: -80.1936,
      url: 'https://themooremiami.com/',
      events: [
        {
          name: 'Pool Sessions at The Moore',
          days: [6, 0], // Sat, Sun
          time: '13:00',
          category: 'Nightlife',
          description: 'Weekend pool party at The Moore in the Design District. DJs, cocktails, and a stylish crowd.',
          tags: ['dj', 'pool', 'local-favorite'],
          price: 40,
          isOutdoor: true,
        },
        {
          name: 'Art After Dark at The Moore',
          days: [5], // Friday
          time: '19:00',
          category: 'Art',
          description: 'Evening art exhibition and cocktails at The Moore. Featuring local and emerging artists.',
          tags: ['art-gallery', 'cocktails', 'networking'],
          price: 0,
          isOutdoor: false,
        },
      ],
    },
    // Mr. C Hotel Coconut Grove
    {
      name: 'Mr. C Coconut Grove',
      address: '2988 McFarlane Rd, Miami, FL 33133',
      neighborhood: 'Coconut Grove',
      lat: 25.7267,
      lng: -80.2412,
      url: 'https://mrchotels.com/coconut-grove/',
      events: [
        {
          name: 'Bellini Brunch at Mr. C',
          days: [0], // Sunday
          time: '11:00',
          category: 'Food & Drink',
          description: 'Italian Sunday brunch at Bellini restaurant with bay views. Live music and bottomless bellinis.',
          tags: ['brunch', 'live-music', 'waterfront', 'local-favorite'],
          price: 75,
          isOutdoor: true,
        },
        {
          name: 'Jazz Night at Bellini',
          days: [5], // Friday
          time: '20:00',
          category: 'Music',
          description: 'Live jazz at Bellini restaurant. Sophisticated evening with Italian cuisine and bay views.',
          tags: ['jazz', 'live-music', 'waterfront'],
          price: 0,
          isOutdoor: false,
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
