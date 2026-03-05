/**
 * Venue Watchlist Scraper
 *
 * Checks a curated list of venues for events using available APIs:
 *   - WordPress Tribe Events REST API (if wp_domain is set)
 *   - Future: Tock, Resy slug lookups
 *
 * The watchlist is maintained in ../data/venue-watchlist.json.
 * Jarred can add venues with their API slugs/domains as they're discovered.
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { BaseScraper } from './base.js';
import type { RawEvent } from '../types.js';

interface WatchlistVenue {
  name: string;
  address: string;
  lat: number;
  lng: number;
  city: string;
  neighborhood: string;
  category: string;
  tock_slug?: string;
  ig_handle?: string;
  wp_domain?: string;
  resy_slug?: string;
}

export class VenueWatchlistScraper extends BaseScraper {
  private venues: WatchlistVenue[] = [];

  constructor() {
    super('Venue Watchlist', { weight: 1.5, rateLimit: 2000 });
    try {
      const __dirname = path.dirname(fileURLToPath(import.meta.url));
      const p = path.join(__dirname, '../data/venue-watchlist.json');
      this.venues = JSON.parse(fs.readFileSync(p, 'utf-8'));
    } catch {
      // Watchlist file not found — will return 0 events
    }
  }

  async scrape(): Promise<RawEvent[]> {
    const wpVenues = this.venues.filter(v => v.wp_domain);
    if (wpVenues.length === 0) {
      this.log('No watchlist venues with wp_domain configured');
      return [];
    }

    this.log(`Checking ${wpVenues.length} watchlist venues for events...`);
    const events: RawEvent[] = [];

    for (const venue of wpVenues) {
      const venueEvents = await this.checkWordPressTribe(venue);
      events.push(...venueEvents);
    }

    this.log(`Found ${events.length} events across watchlist venues`);
    return events;
  }

  private async checkWordPressTribe(venue: WatchlistVenue): Promise<RawEvent[]> {
    const today = new Date().toISOString().split('T')[0];
    const urls = [
      `https://www.${venue.wp_domain}/wp-json/tribe/events/v1/events?per_page=20&status=publish&start_date=${today}`,
      `https://${venue.wp_domain}/wp-json/tribe/events/v1/events?per_page=20&status=publish&start_date=${today}`,
    ];

    for (const url of urls) {
      try {
        const data = await this.fetchJSONNativeGet<any>(url, 8_000);
        const items = data?.events ?? [];
        const now = new Date();

        const events: RawEvent[] = [];
        for (const ev of items) {
          const startAt = ev.start_date?.replace(' ', 'T');
          if (!startAt || new Date(startAt) < now) continue;

          const title = this.cleanText(ev.title?.replace(/<[^>]+>/g, ''));
          if (!title) continue;

          const description = ev.description
            ? this.cleanText(ev.description.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')).slice(0, 400)
            : `Event at ${venue.name}.`;

          const category = this.categorize(title, description, venue.name);
          const tags = this.generateTags(title, description, category);

          events.push({
            title,
            startAt,
            endAt: ev.end_date?.replace(' ', 'T') || undefined,
            venueName: venue.name,
            address: venue.address,
            neighborhood: venue.neighborhood,
            lat: venue.lat,
            lng: venue.lng,
            city: venue.city as 'Miami' | 'Fort Lauderdale' | 'Palm Beach',
            tags: tags.slice(0, 5),
            category,
            isOutdoor: false,
            description,
            sourceUrl: ev.url || `https://${venue.wp_domain}`,
            sourceName: this.name,
            image: ev.image?.url,
          });
        }

        if (events.length > 0) {
          this.log(`  ${venue.name}: ${events.length} events`);
          return events;
        }
      } catch {
        // This URL variant didn't work, try next
      }
    }

    return [];
  }
}
