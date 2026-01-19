/**
 * Beach Cleanups Scraper
 * Environmental volunteer events from Clean Miami Beach, Heal the Planet, etc.
 */

import { BaseScraper } from './base.js';
import type { RawEvent } from '../types.js';

interface CleanupEvent {
  title: string;
  date: string;
  time: string;
  venue: string;
  address: string;
  neighborhood: string;
  city: 'Miami' | 'Fort Lauderdale';
  lat: number;
  lng: number;
  description: string;
  tags: string[];
  sourceUrl: string;
}

export class BeachCleanupsScraper extends BaseScraper {
  private events: CleanupEvent[] = [
    // Clean Miami Beach events
    {
      title: 'Miami Marathon Beach Cleanup',
      date: '2026-01-24',
      time: '08:00',
      venue: 'South Beach',
      address: 'Lummus Park Beach, Miami Beach, FL 33139',
      neighborhood: 'South Beach',
      city: 'Miami',
      lat: 25.7825,
      lng: -80.1300,
      description: 'Beach cleanup in partnership with the Miami Marathon. Help keep our beaches clean before the big race weekend.',
      tags: ['beach', 'outdoor', 'free-event', 'community'],
      sourceUrl: 'https://cleanmiamibeach.org/pages/cleanups',
    },
    {
      title: 'Miami Marathon Beach Cleanup',
      date: '2026-01-25',
      time: '08:00',
      venue: 'South Beach',
      address: 'Lummus Park Beach, Miami Beach, FL 33139',
      neighborhood: 'South Beach',
      city: 'Miami',
      lat: 25.7825,
      lng: -80.1300,
      description: 'Beach cleanup during Miami Marathon weekend. All supplies provided.',
      tags: ['beach', 'outdoor', 'free-event', 'community'],
      sourceUrl: 'https://cleanmiamibeach.org/pages/cleanups',
    },
    {
      title: 'Miami Marathon Beach Cleanup',
      date: '2026-01-26',
      time: '08:00',
      venue: 'South Beach',
      address: 'Lummus Park Beach, Miami Beach, FL 33139',
      neighborhood: 'South Beach',
      city: 'Miami',
      lat: 25.7825,
      lng: -80.1300,
      description: 'Final day of marathon weekend beach cleanup. Join volunteers to restore the beach.',
      tags: ['beach', 'outdoor', 'free-event', 'community'],
      sourceUrl: 'https://cleanmiamibeach.org/pages/cleanups',
    },
    {
      title: 'Cupid Splash Cleanup',
      date: '2026-02-15',
      time: '09:00',
      venue: 'South Beach',
      address: 'Lummus Park Beach, Miami Beach, FL 33139',
      neighborhood: 'South Beach',
      city: 'Miami',
      lat: 25.7825,
      lng: -80.1300,
      description: 'Valentine\'s weekend beach cleanup with Clean Miami Beach. Bring a date or make new friends while helping the environment.',
      tags: ['beach', 'outdoor', 'free-event', 'community'],
      sourceUrl: 'https://cleanmiamibeach.org/pages/cleanups',
    },
    {
      title: 'Turtle Tuesday Beach Cleanup',
      date: '2026-02-18',
      time: '08:00',
      venue: 'South Beach',
      address: 'Lummus Park Beach, Miami Beach, FL 33139',
      neighborhood: 'South Beach',
      city: 'Miami',
      lat: 25.7825,
      lng: -80.1300,
      description: 'Monthly Turtle Tuesday cleanup to protect sea turtle nesting habitats. Learn about marine conservation while volunteering.',
      tags: ['beach', 'outdoor', 'free-event', 'community', 'family-friendly'],
      sourceUrl: 'https://cleanmiamibeach.org/pages/cleanups',
    },
    {
      title: 'Ultra Cleanup',
      date: '2026-03-07',
      time: '08:00',
      venue: 'Virginia Key Beach',
      address: 'Virginia Key Beach Park, Miami, FL 33149',
      neighborhood: 'Virginia Key',
      city: 'Miami',
      lat: 25.7456,
      lng: -80.1556,
      description: 'Pre-Ultra Music Festival beach cleanup. Help prepare Virginia Key before the festival arrives.',
      tags: ['beach', 'outdoor', 'free-event', 'community'],
      sourceUrl: 'https://cleanmiamibeach.org/pages/cleanups',
    },
    // Heal the Planet - Fort Lauderdale Beach Sweep (2nd Saturday of month)
    {
      title: 'Fort Lauderdale Beach Sweep',
      date: '2026-02-14',
      time: '08:00',
      venue: 'Fort Lauderdale Beach',
      address: '300 S. Lauderdale Beach Blvd, Fort Lauderdale, FL 33316',
      neighborhood: 'Fort Lauderdale Beach',
      city: 'Fort Lauderdale',
      lat: 26.1067,
      lng: -80.1028,
      description: 'Monthly beach cleanup with Heal the Planet and City of Fort Lauderdale. No registration required. All supplies provided.',
      tags: ['beach', 'outdoor', 'free-event', 'community'],
      sourceUrl: 'https://healtheplanet.com/activities',
    },
    {
      title: 'Fort Lauderdale Beach Sweep',
      date: '2026-03-14',
      time: '08:00',
      venue: 'Fort Lauderdale Beach',
      address: '300 S. Lauderdale Beach Blvd, Fort Lauderdale, FL 33316',
      neighborhood: 'Fort Lauderdale Beach',
      city: 'Fort Lauderdale',
      lat: 26.1067,
      lng: -80.1028,
      description: 'Monthly beach cleanup with Heal the Planet and City of Fort Lauderdale. No registration required. All supplies provided.',
      tags: ['beach', 'outdoor', 'free-event', 'community'],
      sourceUrl: 'https://healtheplanet.com/activities',
    },
    {
      title: 'Fort Lauderdale Beach Sweep',
      date: '2026-04-11',
      time: '08:00',
      venue: 'Fort Lauderdale Beach',
      address: '300 S. Lauderdale Beach Blvd, Fort Lauderdale, FL 33316',
      neighborhood: 'Fort Lauderdale Beach',
      city: 'Fort Lauderdale',
      lat: 26.1067,
      lng: -80.1028,
      description: 'Monthly beach cleanup with Heal the Planet and City of Fort Lauderdale. No registration required. All supplies provided.',
      tags: ['beach', 'outdoor', 'free-event', 'community'],
      sourceUrl: 'https://healtheplanet.com/activities',
    },
    // Heal the Planet - Guided Nature Tours at Snyder Park
    {
      title: 'Guided Nature Tour at Snyder Park',
      date: '2026-02-07',
      time: '10:00',
      venue: 'Snyder Park',
      address: '3299 SW 4th Ave, Fort Lauderdale, FL 33315',
      neighborhood: 'Fort Lauderdale',
      city: 'Fort Lauderdale',
      lat: 26.0956,
      lng: -80.1567,
      description: 'Guided nature tour exploring the ecosystems of Snyder Park. Learn about native plants and wildlife.',
      tags: ['outdoor', 'park', 'free-event', 'family-friendly'],
      sourceUrl: 'https://healtheplanet.com/activities',
    },
    {
      title: 'Guided Nature Tour at Snyder Park',
      date: '2026-03-07',
      time: '10:00',
      venue: 'Snyder Park',
      address: '3299 SW 4th Ave, Fort Lauderdale, FL 33315',
      neighborhood: 'Fort Lauderdale',
      city: 'Fort Lauderdale',
      lat: 26.0956,
      lng: -80.1567,
      description: 'Guided nature tour exploring the ecosystems of Snyder Park. Learn about native plants and wildlife.',
      tags: ['outdoor', 'park', 'free-event', 'family-friendly'],
      sourceUrl: 'https://healtheplanet.com/activities',
    },
    {
      title: 'Guided Nature Tour at Snyder Park',
      date: '2026-04-04',
      time: '10:00',
      venue: 'Snyder Park',
      address: '3299 SW 4th Ave, Fort Lauderdale, FL 33315',
      neighborhood: 'Fort Lauderdale',
      city: 'Fort Lauderdale',
      lat: 26.0956,
      lng: -80.1567,
      description: 'Guided nature tour exploring the ecosystems of Snyder Park. Learn about native plants and wildlife.',
      tags: ['outdoor', 'park', 'free-event', 'family-friendly'],
      sourceUrl: 'https://healtheplanet.com/activities',
    },
    // Young SEEDs in the Park - Environmental education
    {
      title: 'Young SEEDs in the Park',
      date: '2026-01-24',
      time: '10:00',
      venue: 'Snyder Park',
      address: '3299 SW 4th Ave, Fort Lauderdale, FL 33315',
      neighborhood: 'Fort Lauderdale',
      city: 'Fort Lauderdale',
      lat: 26.0956,
      lng: -80.1567,
      description: 'Sustainable Energy Education for kids. Hands-on environmental learning activities in the park.',
      tags: ['outdoor', 'park', 'free-event', 'family-friendly', 'workshop'],
      sourceUrl: 'https://healtheplanet.com/activities',
    },
    {
      title: 'Young SEEDs in the Park',
      date: '2026-02-11',
      time: '10:00',
      venue: 'Snyder Park',
      address: '3299 SW 4th Ave, Fort Lauderdale, FL 33315',
      neighborhood: 'Fort Lauderdale',
      city: 'Fort Lauderdale',
      lat: 26.0956,
      lng: -80.1567,
      description: 'Sustainable Energy Education for kids. Hands-on environmental learning activities in the park.',
      tags: ['outdoor', 'park', 'free-event', 'family-friendly', 'workshop'],
      sourceUrl: 'https://healtheplanet.com/activities',
    },
    {
      title: 'Young SEEDs in the Park',
      date: '2026-02-28',
      time: '10:00',
      venue: 'Snyder Park',
      address: '3299 SW 4th Ave, Fort Lauderdale, FL 33315',
      neighborhood: 'Fort Lauderdale',
      city: 'Fort Lauderdale',
      lat: 26.0956,
      lng: -80.1567,
      description: 'Sustainable Energy Education for kids. Hands-on environmental learning activities in the park.',
      tags: ['outdoor', 'park', 'free-event', 'family-friendly', 'workshop'],
      sourceUrl: 'https://healtheplanet.com/activities',
    },
    {
      title: 'Young SEEDs in the Park',
      date: '2026-03-11',
      time: '10:00',
      venue: 'Snyder Park',
      address: '3299 SW 4th Ave, Fort Lauderdale, FL 33315',
      neighborhood: 'Fort Lauderdale',
      city: 'Fort Lauderdale',
      lat: 26.0956,
      lng: -80.1567,
      description: 'Sustainable Energy Education for kids. Hands-on environmental learning activities in the park.',
      tags: ['outdoor', 'park', 'free-event', 'family-friendly', 'workshop'],
      sourceUrl: 'https://healtheplanet.com/activities',
    },
  ];

  constructor() {
    super('Beach Cleanups', { weight: 1.2, rateLimit: 0 });
  }

  async scrape(): Promise<RawEvent[]> {
    this.log(`Processing ${this.events.length} beach cleanup and environmental events...`);

    return this.events.map((event) => ({
      title: event.title,
      startAt: `${event.date}T${event.time}:00`,
      venueName: event.venue,
      address: event.address,
      neighborhood: event.neighborhood,
      lat: event.lat,
      lng: event.lng,
      city: event.city,
      tags: event.tags,
      category: 'Outdoors',
      priceLabel: 'Free' as const,
      priceAmount: 0,
      isOutdoor: true,
      description: event.description,
      sourceUrl: event.sourceUrl,
      sourceName: this.name,
      recurring: false,
    }));
  }
}
