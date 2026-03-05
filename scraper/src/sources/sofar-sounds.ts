/**
 * Sofar Sounds Scraper
 *
 * Fetches upcoming Sofar Sounds events in Miami via their public GraphQL API.
 * Sofar keeps exact venues secret until close to the event, so we use the
 * neighborhood as the location and link to the event page for tickets.
 *
 * API: POST https://www.sofarsounds.com/api/v2/graphql
 */

import { BaseScraper } from './base.js';
import type { RawEvent } from '../types.js';

interface SofarEvent {
  id: number;
  cachedSlug: string | null;
  headline: string | null;
  localStartsAt: string;
  endsAt: string | null;
  status: string;
  ticketPrice: number; // cents
  city: { title: string; cachedSlug: string };
  venue: { venueName: string | null; address: string | null; latitude: number | null; longitude: number | null };
  neighborhood: { title: string } | null;
  confirmedArtists: Array<{ title: string }> | null;
  imageUrl: string | null;
}

// Neighborhood center coordinates for Miami areas (used when venue is hidden)
const NEIGHBORHOOD_COORDS: Record<string, { lat: number; lng: number; address: string }> = {
  'wynwood': { lat: 25.8016, lng: -80.1992, address: 'Wynwood, Miami, FL' },
  'design district': { lat: 25.8128, lng: -80.1925, address: 'Design District, Miami, FL' },
  'little river': { lat: 25.8350, lng: -80.1870, address: 'Little River, Miami, FL' },
  'miami beach': { lat: 25.7907, lng: -80.1300, address: 'Miami Beach, FL' },
  'south beach': { lat: 25.7826, lng: -80.1304, address: 'South Beach, Miami Beach, FL' },
  'brickell': { lat: 25.7617, lng: -80.1918, address: 'Brickell, Miami, FL' },
  'downtown': { lat: 25.7751, lng: -80.1947, address: 'Downtown Miami, FL' },
  'coconut grove': { lat: 25.7270, lng: -80.2409, address: 'Coconut Grove, Miami, FL' },
  'coral gables': { lat: 25.7497, lng: -80.2625, address: 'Coral Gables, FL' },
  'little havana': { lat: 25.7655, lng: -80.2198, address: 'Little Havana, Miami, FL' },
  'midtown': { lat: 25.8075, lng: -80.1918, address: 'Midtown Miami, FL' },
  'edgewater': { lat: 25.8100, lng: -80.1867, address: 'Edgewater, Miami, FL' },
  'overtown': { lat: 25.7867, lng: -80.2028, address: 'Overtown, Miami, FL' },
  'mid-beach': { lat: 25.8121, lng: -80.1255, address: 'Mid-Beach, Miami Beach, FL' },
  'north beach': { lat: 25.8300, lng: -80.1230, address: 'North Beach, Miami Beach, FL' },
};

// Default Miami center
const MIAMI_DEFAULT = { lat: 25.7617, lng: -80.1918, address: 'Miami, FL' };

const GRAPHQL_QUERY = `{
  events(city: "miami", upcoming: true, perPage: 30, excludeCancelled: true) {
    events {
      id
      cachedSlug
      headline
      localStartsAt
      endsAt
      status
      ticketPrice
      city { title cachedSlug }
      venue { venueName address latitude longitude }
      neighborhood { title }
      confirmedArtists { title }
      imageUrl
    }
  }
}`;

export class SofarSoundsScraper extends BaseScraper {
  constructor() {
    super('SofarSounds', { weight: 1.3, rateLimit: 2000 });
  }

  async scrape(): Promise<RawEvent[]> {
    this.log('Fetching Sofar Sounds Miami events via GraphQL...');

    const data = await this.fetchJSONNative<{
      data?: { events?: { events?: SofarEvent[] } };
      errors?: unknown[];
    }>(
      'https://www.sofarsounds.com/api/v2/graphql',
      JSON.stringify({ query: GRAPHQL_QUERY }),
      {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Referer: 'https://www.sofarsounds.com/miami',
        Origin: 'https://www.sofarsounds.com',
        Accept: 'application/json',
      }
    );

    if (data.errors) {
      this.log(`GraphQL errors: ${JSON.stringify(data.errors).slice(0, 200)}`);
      return [];
    }

    const sofarEvents = data.data?.events?.events ?? [];
    this.log(`Found ${sofarEvents.length} upcoming Sofar events`);

    const events: RawEvent[] = [];

    for (const ev of sofarEvents) {
      if (ev.status === 'cancelled') continue;

      const neighborhood = ev.neighborhood?.title?.trim() || 'Miami';
      const nbKey = neighborhood.toLowerCase();
      const coords = NEIGHBORHOOD_COORDS[nbKey] || MIAMI_DEFAULT;

      // Use real venue if available, otherwise use neighborhood
      const hasVenue = ev.venue?.venueName && ev.venue?.address;
      const venueName = hasVenue ? ev.venue.venueName! : `Sofar Sounds ${neighborhood}`;
      const address = hasVenue ? ev.venue.address! : coords.address;
      const lat = (hasVenue && ev.venue.latitude) ? ev.venue.latitude : coords.lat;
      const lng = (hasVenue && ev.venue.longitude) ? ev.venue.longitude : coords.lng;

      // Build title from artists or headline
      const artists = ev.confirmedArtists?.map(a => a.title).filter(Boolean) ?? [];
      let title = 'Sofar Sounds Miami';
      if (artists.length > 0) {
        title = `Sofar Sounds: ${artists.join(', ')}`;
      } else if (ev.headline) {
        title = `Sofar Sounds: ${ev.headline.trim()}`;
      }

      const priceAmount = Math.round(ev.ticketPrice / 100);
      const eventUrl = ev.cachedSlug
        ? `https://www.sofarsounds.com/events/${ev.cachedSlug}`
        : `https://www.sofarsounds.com/cities/miami`;

      const description = [
        'Sofar Sounds transforms everyday spaces into intimate concert venues.',
        `Live music in ${neighborhood}, Miami.`,
        hasVenue ? '' : 'Exact venue revealed 24-48 hours before the show.',
        artists.length > 0 ? `Featuring: ${artists.join(', ')}.` : '',
      ].filter(Boolean).join(' ');

      events.push({
        title,
        startAt: ev.localStartsAt,
        venueName,
        address,
        neighborhood,
        lat,
        lng,
        city: 'Miami',
        tags: ['live-music', 'intimate', 'local-favorite', 'indoor'],
        category: 'Music',
        priceLabel: '$',
        priceAmount,
        isOutdoor: false,
        description,
        sourceUrl: eventUrl,
        sourceName: 'Sofar Sounds',
        image: ev.imageUrl || undefined,
      });
    }

    this.log(`Returning ${events.length} Sofar Sounds events`);
    return events;
  }
}
