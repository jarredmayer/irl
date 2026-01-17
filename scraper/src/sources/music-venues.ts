/**
 * Miami Music Venues Scraper
 * Generates events from boutique music venues
 */

import { addDays, format, getDay } from 'date-fns';
import { BaseScraper } from './base.js';
import type { RawEvent } from '../types.js';

interface VenueInfo {
  name: string;
  address: string;
  neighborhood: string;
  lat: number;
  lng: number;
  url: string;
  eventPattern: 'nightly' | 'weekend' | 'weekly';
  closedDays?: number[]; // 0 = Sunday, 1 = Monday, etc.
  startTime: string;
  category: string;
  description: string;
  tags: string[];
}

export class MusicVenuesScraper extends BaseScraper {
  private venues: VenueInfo[] = [
    {
      name: 'Lagniappe House',
      address: '3425 NE 2nd Ave, Miami, FL 33137',
      neighborhood: 'Midtown',
      lat: 25.8076,
      lng: -80.193,
      url: 'http://www.lagniappehouse.com/',
      eventPattern: 'nightly',
      closedDays: [1], // Closed Mondays
      startTime: '20:00',
      category: 'Music',
      description: 'Intimate live jazz and world music in a magical outdoor garden setting.',
      tags: ['live-music', 'jazz', 'outdoor-dining', 'local-favorite'],
    },
    {
      name: "Dante's Hifi",
      address: '1519 NW 2nd Ave, Miami, FL 33136',
      neighborhood: 'Wynwood',
      lat: 25.7889,
      lng: -80.1995,
      url: 'https://danteshifi.com/',
      eventPattern: 'weekend',
      startTime: '21:00',
      category: 'Music',
      description: 'All-vinyl DJ sets in an intimate speakeasy setting. Deep cuts and rare grooves.',
      tags: ['dj', 'electronic', 'cocktails', 'local-favorite'],
    },
    {
      name: 'Ball & Chain',
      address: '1513 SW 8th St, Miami, FL 33135',
      neighborhood: 'Little Havana',
      lat: 25.7653,
      lng: -80.2156,
      url: 'https://ballandchainmiami.com/',
      eventPattern: 'nightly',
      startTime: '19:00',
      category: 'Music',
      description: 'Historic Little Havana venue with live Latin music, salsa dancing, and Cuban cocktails.',
      tags: ['live-music', 'latin', 'dancing', 'cocktails', 'local-favorite'],
    },
    {
      name: 'The Anderson',
      address: '709 NE 79th St, Miami, FL 33138',
      neighborhood: 'Little River',
      lat: 25.8487,
      lng: -80.1831,
      url: 'https://theandersonmiami.com/',
      eventPattern: 'nightly',
      startTime: '20:00',
      category: 'Music',
      description: 'Neighborhood bar with rotating DJs, craft cocktails, and a tropical backyard.',
      tags: ['dj', 'cocktails', 'local-favorite'],
    },
    {
      name: 'Gramps',
      address: '176 NW 24th St, Miami, FL 33127',
      neighborhood: 'Wynwood',
      lat: 25.8002,
      lng: -80.2009,
      url: 'https://gramps.com/',
      eventPattern: 'nightly',
      startTime: '19:00',
      category: 'Music',
      description: 'Wynwood dive bar with eclectic programming, comedy shows, and DJ nights.',
      tags: ['dj', 'comedy', 'local-favorite'],
    },
    {
      name: 'Miami Beach Bandshell',
      address: '7275 Collins Ave, Miami Beach, FL 33141',
      neighborhood: 'North Miami Beach',
      lat: 25.8648,
      lng: -80.1216,
      url: 'https://www.miamibeachbandshell.com/',
      eventPattern: 'weekend',
      startTime: '19:00',
      category: 'Music',
      description: 'Historic beachfront amphitheater hosting free concerts and cultural events.',
      tags: ['live-music', 'beach', 'free-event', 'outdoor-dining'],
    },
    {
      name: 'Do Not Sit On The Furniture',
      address: '423 16th St, Miami Beach, FL 33139',
      neighborhood: 'South Beach',
      lat: 25.7867,
      lng: -80.1368,
      url: 'https://donotsitonfurniture.com/',
      eventPattern: 'weekend',
      startTime: '23:00',
      category: 'Nightlife',
      description: 'Underground house music club known for quality sound and intimate atmosphere.',
      tags: ['dj', 'electronic', 'dancing'],
    },
  ];

  constructor() {
    super('Music Venues', { weight: 1.3, rateLimit: 0 });
  }

  async scrape(): Promise<RawEvent[]> {
    const events: RawEvent[] = [];
    const daysAhead = 14;

    this.log(`Generating music venue events for next ${daysAhead} days...`);

    for (const venue of this.venues) {
      const venueEvents = this.generateVenueEvents(venue, daysAhead);
      events.push(...venueEvents);
    }

    this.log(`Generated ${events.length} music venue events`);
    return events;
  }

  private generateVenueEvents(venue: VenueInfo, daysAhead: number): RawEvent[] {
    const events: RawEvent[] = [];
    const today = new Date();

    for (let i = 0; i < daysAhead; i++) {
      const eventDate = addDays(today, i);
      const dayOfWeek = getDay(eventDate);

      // Check if venue is closed this day
      if (venue.closedDays?.includes(dayOfWeek)) {
        continue;
      }

      // Check event pattern
      if (venue.eventPattern === 'weekend' && dayOfWeek !== 5 && dayOfWeek !== 6) {
        continue; // Only Friday and Saturday
      }

      const dateStr = format(eventDate, 'yyyy-MM-dd');
      const startAt = `${dateStr}T${venue.startTime}:00`;

      // Generate event title based on day
      let title = `Live at ${venue.name}`;
      if (venue.name === 'Lagniappe House') {
        title = dayOfWeek >= 5 ? 'Live Jazz at Lagniappe' : 'Lagniappe Live Music';
      } else if (venue.name === "Dante's Hifi") {
        title = 'Vinyl Night at Dante\'s Hifi';
      } else if (venue.name === 'Ball & Chain') {
        title = 'Live Salsa at Ball & Chain';
      }

      events.push({
        title,
        startAt,
        venueName: venue.name,
        address: venue.address,
        neighborhood: venue.neighborhood,
        lat: venue.lat,
        lng: venue.lng,
        city: 'Miami',
        tags: venue.tags,
        category: venue.category,
        priceLabel: 'Free',
        priceAmount: 0,
        isOutdoor: venue.tags.includes('outdoor-dining') || venue.tags.includes('beach'),
        description: venue.description,
        sourceUrl: venue.url,
        sourceName: this.name,
        recurring: true,
        recurrencePattern: venue.eventPattern,
      });
    }

    return events;
  }
}
