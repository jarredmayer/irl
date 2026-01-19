/**
 * Miami Music Venues Scraper
 * Quality venues with differentiated programming
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
}

export class MusicVenuesScraper extends BaseScraper {
  // Specific programming, not generic "Live at X"
  private events: VenueEvent[] = [
    // Lagniappe - actual jazz programming
    {
      name: 'Live Jazz at Lagniappe',
      venue: 'Lagniappe House',
      address: '3425 NE 2nd Ave, Miami, FL 33137',
      neighborhood: 'Midtown',
      lat: 25.8076,
      lng: -80.193,
      url: 'http://www.lagniappehouse.com/',
      days: [2, 3, 4, 5, 6, 0], // Tue-Sun
      time: '20:00',
      category: 'Music',
      description: 'Nightly live jazz in a magical outdoor wine garden. Rotating musicians, intimate setting, great wine selection.',
      tags: ['live-music', 'jazz', 'wine-bar', 'local-favorite'],
      price: 0,
    },
    // Dante's Hifi - specific vinyl night
    {
      name: 'Vinyl Sessions at Dante\'s HiFi',
      venue: "Dante's HiFi",
      address: '1519 NW 2nd Ave, Miami, FL 33136',
      neighborhood: 'Wynwood',
      lat: 25.7889,
      lng: -80.1995,
      url: 'https://danteshifi.com/',
      days: [5, 6], // Fri-Sat
      time: '21:00',
      category: 'Nightlife',
      description: 'All-vinyl DJ sets on a world-class sound system. Deep house, disco, rare grooves. Intimate speakeasy vibes.',
      tags: ['dj', 'electronic', 'vinyl', 'local-favorite'],
      price: 10,
    },
    // Ball & Chain - live salsa
    {
      name: 'Live Salsa at Ball & Chain',
      venue: 'Ball & Chain',
      address: '1513 SW 8th St, Miami, FL 33135',
      neighborhood: 'Little Havana',
      lat: 25.7653,
      lng: -80.2156,
      url: 'https://ballandchainmiami.com/',
      days: [4, 5, 6, 0], // Thu-Sun
      time: '20:00',
      category: 'Music',
      description: 'Live Cuban bands, salsa dancing, and mojitos in this historic Little Havana venue. The real Miami experience.',
      tags: ['live-music', 'latin', 'dancing', 'local-favorite'],
      price: 0,
    },
    // Gramps - specific programming
    {
      name: 'Comedy Night at Gramps',
      venue: 'Gramps',
      address: '176 NW 24th St, Miami, FL 33127',
      neighborhood: 'Wynwood',
      lat: 25.8002,
      lng: -80.2009,
      url: 'https://gramps.com/',
      days: [2], // Tuesday
      time: '20:00',
      category: 'Comedy',
      description: 'Weekly stand-up comedy showcase featuring local and touring comedians. Free entry, cheap drinks.',
      tags: ['comedy', 'free-event', 'local-favorite'],
      price: 0,
    },
    {
      name: 'DJ Night at Gramps',
      venue: 'Gramps',
      address: '176 NW 24th St, Miami, FL 33127',
      neighborhood: 'Wynwood',
      lat: 25.8002,
      lng: -80.2009,
      url: 'https://gramps.com/',
      days: [5, 6], // Fri-Sat
      time: '22:00',
      category: 'Nightlife',
      description: 'Curated DJ sets in Wynwood\'s favorite dive bar. Eclectic programming from house to hip-hop.',
      tags: ['dj', 'local-favorite'],
      price: 0,
    },
    // Miami Beach Bandshell - free concerts
    {
      name: 'Free Concert at Miami Beach Bandshell',
      venue: 'Miami Beach Bandshell',
      address: '7275 Collins Ave, Miami Beach, FL 33141',
      neighborhood: 'North Beach',
      lat: 25.8648,
      lng: -80.1216,
      url: 'https://www.miamibeachbandshell.com/',
      days: [6], // Saturday
      time: '19:00',
      category: 'Music',
      description: 'Free outdoor concerts at the historic beachfront bandshell. Bring a blanket, enjoy the ocean breeze.',
      tags: ['live-music', 'beach', 'free-event', 'family-friendly'],
      price: 0,
    },
    // Zey Zey - specific programming nights
    {
      name: 'Thursday Jazz at Zey Zey',
      venue: 'Zey Zey',
      address: '233 NE 2nd St, Miami, FL 33132',
      neighborhood: 'Downtown Miami',
      lat: 25.7751,
      lng: -80.1897,
      url: 'https://www.zeyzey.com/',
      days: [4], // Thursday
      time: '21:00',
      category: 'Music',
      description: 'Weekly jazz night featuring local and touring musicians. Intimate rooftop setting with craft cocktails. Check their socials for the lineup.',
      tags: ['live-music', 'jazz', 'rooftop', 'local-favorite'],
      price: 15,
    },
    {
      name: 'Weekend Sounds at Zey Zey',
      venue: 'Zey Zey',
      address: '233 NE 2nd St, Miami, FL 33132',
      neighborhood: 'Downtown Miami',
      lat: 25.7751,
      lng: -80.1897,
      url: 'https://www.zeyzey.com/',
      days: [5, 6], // Fri-Sat
      time: '21:00',
      category: 'Music',
      description: 'Eclectic weekend programming from indie rock to electronic to soul. One of downtown\'s best intimate venues. Check @zeyzey for artist lineup.',
      tags: ['live-music', 'indie', 'rooftop', 'local-favorite'],
      price: 20,
    },
  ];

  constructor() {
    super('Music Venues', { weight: 1.3, rateLimit: 0 });
  }

  async scrape(): Promise<RawEvent[]> {
    const events: RawEvent[] = [];
    const weeksAhead = 4;

    this.log(`Generating music venue events for next ${weeksAhead} weeks...`);

    for (const event of this.events) {
      const generated = this.generateEvents(event, weeksAhead);
      events.push(...generated);
    }

    this.log(`Generated ${events.length} music venue events`);
    return events;
  }

  private generateEvents(event: VenueEvent, weeksAhead: number): RawEvent[] {
    const results: RawEvent[] = [];
    const today = new Date();

    for (let week = 0; week < weeksAhead; week++) {
      for (const targetDay of event.days) {
        const baseDate = addDays(today, week * 7);
        let daysUntil = targetDay - getDay(baseDate);
        if (daysUntil < 0) daysUntil += 7;
        const eventDate = addDays(baseDate, daysUntil);

        if (eventDate >= today) {
          const dateStr = format(eventDate, 'yyyy-MM-dd');
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
            priceLabel: event.price === 0 ? 'Free' : '$',
            priceAmount: event.price,
            isOutdoor: event.tags.includes('beach'),
            description: event.description,
            sourceUrl: event.url,
            sourceName: this.name,
            recurring: true,
            recurrencePattern: 'weekly',
          });
        }
      }
    }

    return results;
  }
}
