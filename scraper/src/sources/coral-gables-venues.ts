/**
 * Coral Gables & Neighborhood Venues
 * Jazz houses, bookstores, local hangouts
 */

import { addDays, format, getDay } from 'date-fns';
import { BaseScraper } from './base.js';
import type { RawEvent } from '../types.js';

interface VenueEvent {
  name: string;
  venue: string;
  address: string;
  neighborhood: string;
  lat: number;
  lng: number;
  url: string;
  days: number[];
  time: string;
  category: string;
  description: string;
  tags: string[];
  price: number;
  isOutdoor: boolean;
}

export class CoralGablesVenuesScraper extends BaseScraper {
  private events: VenueEvent[] = [
    // Medium Cool - vinyl bar with live jazz
    {
      name: 'Jazz & Vinyl Night at Medium Cool',
      venue: 'Medium Cool',
      address: '7010 Biscayne Blvd, Miami, FL 33138',
      neighborhood: 'Little River',
      lat: 25.8347,
      lng: -80.1867,
      url: 'https://www.mediumcoolmiami.com/',
      days: [4, 5, 6], // Thu-Sat
      time: '20:00',
      category: 'Music',
      description: 'Live jazz and soul on a world-class vinyl sound system. Intimate listening room vibes in a converted auto shop.',
      tags: ['jazz', 'live-music', 'vinyl', 'local-favorite'],
      price: 15,
      isOutdoor: false,
    },
    {
      name: 'Vinyl Happy Hour at Medium Cool',
      venue: 'Medium Cool',
      address: '7010 Biscayne Blvd, Miami, FL 33138',
      neighborhood: 'Little River',
      lat: 25.8347,
      lng: -80.1867,
      url: 'https://www.mediumcoolmiami.com/',
      days: [3, 4, 5], // Wed-Fri
      time: '17:00',
      category: 'Music',
      description: 'Early evening vinyl session with craft cocktails. The perfect way to start your night.',
      tags: ['vinyl', 'happy-hour', 'cocktails'],
      price: 0,
      isOutdoor: false,
    },
    // Armstrong Jazz House - Coral Gables
    {
      name: 'Live Jazz at Armstrong',
      venue: 'Armstrong Jazz House',
      address: '2229 SW 37th Ave, Miami, FL 33145',
      neighborhood: 'Coral Gables',
      lat: 25.7434,
      lng: -80.2589,
      url: 'https://www.armstrongjazzhouse.com/',
      days: [4, 5, 6], // Thu-Sat
      time: '20:30',
      category: 'Music',
      description: 'Authentic jazz club experience in Coral Gables. Rotating roster of local and touring jazz musicians in an intimate setting.',
      tags: ['jazz', 'live-music', 'local-favorite'],
      price: 20,
      isOutdoor: false,
    },
    {
      name: 'Sunday Jazz Brunch at Armstrong',
      venue: 'Armstrong Jazz House',
      address: '2229 SW 37th Ave, Miami, FL 33145',
      neighborhood: 'Coral Gables',
      lat: 25.7434,
      lng: -80.2589,
      url: 'https://www.armstrongjazzhouse.com/',
      days: [0], // Sunday
      time: '12:00',
      category: 'Music',
      description: 'Sunday brunch with live jazz. The perfect way to spend a lazy afternoon.',
      tags: ['jazz', 'live-music', 'brunch'],
      price: 35,
      isOutdoor: false,
    },
    // The Globe - Coral Gables bar
    {
      name: 'Trivia Night at The Globe',
      venue: 'The Globe',
      address: '377 Alhambra Cir, Coral Gables, FL 33134',
      neighborhood: 'Coral Gables',
      lat: 25.7501,
      lng: -80.2578,
      url: 'https://www.theglobecoralgables.com/',
      days: [2], // Tuesday
      time: '19:30',
      category: 'Community',
      description: 'Weekly trivia night at Coral Gables\' neighborhood gastropub. Teams welcome, prizes for winners.',
      tags: ['community', 'local-favorite'],
      price: 0,
      isOutdoor: false,
    },
    {
      name: 'Live Music at The Globe',
      venue: 'The Globe',
      address: '377 Alhambra Cir, Coral Gables, FL 33134',
      neighborhood: 'Coral Gables',
      lat: 25.7501,
      lng: -80.2578,
      url: 'https://www.theglobecoralgables.com/',
      days: [5, 6], // Fri-Sat
      time: '21:00',
      category: 'Music',
      description: 'Live music on the patio at The Globe. Local bands and good vibes.',
      tags: ['live-music', 'local-favorite'],
      price: 0,
      isOutdoor: true,
    },
    // Books & Books - Coral Gables flagship
    {
      name: 'Author Reading at Books & Books',
      venue: 'Books & Books Coral Gables',
      address: '265 Aragon Ave, Coral Gables, FL 33134',
      neighborhood: 'Coral Gables',
      lat: 25.7489,
      lng: -80.2589,
      url: 'https://www.booksandbooks.com/',
      days: [2, 4], // Tue, Thu
      time: '19:00',
      category: 'Culture',
      description: 'Author readings and book signings at Miami\'s beloved independent bookstore. Check their calendar for featured authors.',
      tags: ['workshop', 'community', 'local-favorite'],
      price: 0,
      isOutdoor: false,
    },
    {
      name: 'Open Mic Poetry at Books & Books',
      venue: 'Books & Books Coral Gables',
      address: '265 Aragon Ave, Coral Gables, FL 33134',
      neighborhood: 'Coral Gables',
      lat: 25.7489,
      lng: -80.2589,
      url: 'https://www.booksandbooks.com/',
      days: [3], // Wednesday
      time: '20:00',
      category: 'Culture',
      description: 'Open mic poetry night in the courtyard. All levels welcome.',
      tags: ['workshop', 'community', 'local-favorite'],
      price: 0,
      isOutdoor: true,
    },
    // Tam-Tam - pop-up dinners and events
    {
      name: 'Tam-Tam Supper Club',
      venue: 'Tam-Tam',
      address: '1615 N Miami Ave, Miami, FL 33136',
      neighborhood: 'Wynwood',
      lat: 25.7912,
      lng: -80.1967,
      url: 'https://www.tamtammiami.com/',
      days: [4, 5, 6], // Thu-Sat
      time: '20:00',
      category: 'Food & Drink',
      description: 'Rotating international menu with DJ accompaniment. A culinary adventure with good music.',
      tags: ['pop-up', 'dj', 'local-favorite'],
      price: 45,
      isOutdoor: false,
    },
    // Other neighborhood spots
    {
      name: 'Happy Hour at Bar Nancy',
      venue: 'Bar Nancy',
      address: '2007 SW 8th St, Miami, FL 33135',
      neighborhood: 'Little Havana',
      lat: 25.7653,
      lng: -80.2256,
      url: 'https://www.barnancy.com/',
      days: [1, 2, 3, 4, 5], // Mon-Fri
      time: '16:00',
      category: 'Food & Drink',
      description: 'All-day happy hour at this Little Havana gem. Great cocktails, vintage vibes, live music some nights.',
      tags: ['happy-hour', 'cocktails', 'local-favorite'],
      price: 0,
      isOutdoor: false,
    },
    {
      name: 'Live Music at Bar Nancy',
      venue: 'Bar Nancy',
      address: '2007 SW 8th St, Miami, FL 33135',
      neighborhood: 'Little Havana',
      lat: 25.7653,
      lng: -80.2256,
      url: 'https://www.barnancy.com/',
      days: [5, 6], // Fri-Sat
      time: '21:00',
      category: 'Music',
      description: 'Eclectic live music programming from Latin to indie rock. Little Havana\'s coolest hangout.',
      tags: ['live-music', 'local-favorite', 'latin'],
      price: 10,
      isOutdoor: false,
    },
    // Sweet Liberty - cocktail bar with events
    {
      name: 'Sunday Service at Sweet Liberty',
      venue: 'Sweet Liberty',
      address: '237-B 20th St, Miami Beach, FL 33139',
      neighborhood: 'South Beach',
      lat: 25.7912,
      lng: -80.1345,
      url: 'https://www.mysweetliberty.com/',
      days: [0], // Sunday
      time: '16:00',
      category: 'Food & Drink',
      description: 'Legendary Sunday happy hour at one of Miami\'s best cocktail bars. Industry night vibes.',
      tags: ['happy-hour', 'cocktails', 'local-favorite', 'industry'],
      price: 0,
      isOutdoor: false,
    },
  ];

  constructor() {
    super('Coral Gables & Neighborhood Venues', { weight: 1.3, rateLimit: 0 });
  }

  async scrape(): Promise<RawEvent[]> {
    const events: RawEvent[] = [];
    const weeksAhead = 6;

    this.log(`Generating Coral Gables & neighborhood events for next ${weeksAhead} weeks...`);

    for (const eventTemplate of this.events) {
      const generated = this.generateEvents(eventTemplate, weeksAhead);
      events.push(...generated);
    }

    this.log(`Generated ${events.length} events`);
    return events;
  }

  private generateEvents(event: VenueEvent, weeksAhead: number): RawEvent[] {
    const results: RawEvent[] = [];
    const today = new Date();
    const daysToCheck = weeksAhead * 7;

    for (let i = 0; i < daysToCheck; i++) {
      const checkDate = addDays(today, i);
      const dayOfWeek = getDay(checkDate);

      if (event.days.includes(dayOfWeek)) {
        const dateStr = format(checkDate, 'yyyy-MM-dd');
        results.push({
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
          priceLabel: event.price === 0 ? 'Free' : event.price > 30 ? '$$' : '$',
          priceAmount: event.price,
          isOutdoor: event.isOutdoor,
          description: event.description,
          sourceUrl: event.url,
          sourceName: this.name,
          recurring: true,
          recurrencePattern: 'weekly',
        });
      }
    }

    return results;
  }
}
