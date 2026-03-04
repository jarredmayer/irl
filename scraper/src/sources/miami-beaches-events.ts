/**
 * Greater Miami & The Beaches Official Events
 * Source: https://www.miamiandbeaches.com/events
 *
 * The Greater Miami Convention & Visitors Bureau official events calendar.
 * This source covers major festivals, cultural events, sporting events, and
 * performing arts across Miami-Dade County.
 *
 * Uses the site's public Algolia search API to fetch events directly,
 * eliminating the need for Puppeteer/Chrome.
 *
 * CURATOR REVIEW REQUIRED
 * Events from this source should be reviewed before publishing -- the CVB
 * lists some generic "ongoing" attractions alongside real ticketed events.
 * Filter for: specific dated events with real tickets / venues.
 * Exclude: generic "things to do" listings without specific dates.
 */

import { BaseScraper } from './base.js';
import type { RawEvent } from '../types.js';

// Algolia credentials (public, embedded in the miamiandbeaches.com frontend)
const ALGOLIA_APP_ID = 'Y72ZZU5PH1';
const ALGOLIA_API_KEY = '9202ce3334a71865cdd5e6c352118144';
const ALGOLIA_INDEX = 'prd-item';
const ALGOLIA_URL = `https://${ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/${ALGOLIA_INDEX}/query`;

interface AlgoliaHit {
  name: string;
  dates: string;
  venue?: string;
  description?: string;
  pageUrl?: string;
  image?: string;
  categories?: string[];
  subcategories?: string[];
  regions?: string[];
  _geoloc?: Array<{ lat: number; lng: number }>;
  _datesFilter?: number[]; // unix timestamps
  isExpired?: boolean;
  host?: string;
  eventTypes?: string[];
  objectID: string;
}

interface AlgoliaResponse {
  hits: AlgoliaHit[];
  nbHits: number;
  page: number;
  nbPages: number;
  hitsPerPage: number;
}

export class MiamiBeachesEventsScraper extends BaseScraper {
  private readonly BASE_URL = 'https://www.miamiandbeaches.com/events';

  constructor() {
    super('Greater Miami & The Beaches', { weight: 1.5, rateLimit: 2000 });
  }

  async scrape(): Promise<RawEvent[]> {
    this.log('Fetching events from Algolia API...');

    const allHits: AlgoliaHit[] = [];
    const hitsPerPage = 100;
    let page = 0;
    let totalPages = 1;

    // Paginate through all results
    while (page < totalPages && page < 10) {
      const body = JSON.stringify({
        query: '',
        filters: '(type:event) AND NOT isExpired:true',
        hitsPerPage,
        page,
        attributesToRetrieve: [
          'name', 'dates', 'venue', 'description', 'pageUrl', 'image',
          'categories', 'subcategories', 'regions', '_geoloc',
          '_datesFilter', 'isExpired', 'host', 'eventTypes',
        ],
      });

      const response = await this.fetch(ALGOLIA_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Algolia-Application-Id': ALGOLIA_APP_ID,
          'X-Algolia-API-Key': ALGOLIA_API_KEY,
        },
        body,
      });

      const data: AlgoliaResponse = await response.json();
      allHits.push(...data.hits);

      totalPages = data.nbPages;
      page++;

      this.log(`  Page ${page}/${totalPages}: ${data.hits.length} hits (total so far: ${allHits.length})`);
    }

    this.log(`Fetched ${allHits.length} total hits from Algolia`);
    return this.normalizeHits(allHits);
  }

  private normalizeHits(hits: AlgoliaHit[]): RawEvent[] {
    const events: RawEvent[] = [];
    const now = new Date();

    for (const hit of hits) {
      if (!hit.name || hit.name.length < 4) continue;
      if (hit.isExpired) continue;

      // Parse date from _datesFilter (unix timestamps) or dates string
      const startAt = this.resolveStartDate(hit, now);
      if (!startAt) continue;

      // Skip past events
      if (new Date(startAt) < now) continue;

      // Strip HTML from description
      const description = this.stripHtml(hit.description || hit.name);

      const category = this.categorize(hit.name, description, hit.venue);
      const tags = this.generateTags(hit.name, description, category);

      const region = hit.regions?.[0] || '';
      const neighborhood = this.inferNeighborhoodFromRegion(region, hit.venue || '');

      const geo = hit._geoloc?.[0];

      events.push({
        title: hit.name,
        startAt,
        venueName: hit.venue || undefined,
        neighborhood,
        lat: geo?.lat ?? null,
        lng: geo?.lng ?? null,
        city: 'Miami',
        tags,
        category,
        isOutdoor: this.isOutdoor(hit.name, description, hit.venue),
        description,
        sourceUrl: hit.pageUrl
          ? `https://www.miamiandbeaches.com${hit.pageUrl}`
          : this.BASE_URL,
        sourceName: this.name,
        image: hit.image
          ? hit.image.startsWith('http')
            ? hit.image
            : `https://www.miamiandbeaches.com${hit.image}`
          : undefined,
        ticketUrl: hit.pageUrl
          ? `https://www.miamiandbeaches.com${hit.pageUrl}`
          : undefined,
      });
    }

    this.log(`Normalized ${events.length} future events from ${hits.length} hits`);
    return events;
  }

  private resolveStartDate(hit: AlgoliaHit, now: Date): string | null {
    // Prefer _datesFilter timestamps — pick the earliest future one
    if (hit._datesFilter && hit._datesFilter.length > 0) {
      const nowTs = Math.floor(now.getTime() / 1000);
      // Timestamps are in seconds; find earliest future date
      const futureDates = hit._datesFilter
        .filter((ts) => ts >= nowTs - 86400) // include today
        .sort((a, b) => a - b);

      if (futureDates.length > 0) {
        const d = new Date(futureDates[0] * 1000);
        return d.toISOString().split('.')[0];
      }
    }

    // Fallback: parse the dates string (e.g. "Mar 04, 2026")
    return this.parseDateString(hit.dates);
  }

  private parseDateString(text: string): string | null {
    if (!text) return null;

    // Already ISO
    if (/^\d{4}-\d{2}-\d{2}/.test(text)) {
      const d = new Date(text);
      return isNaN(d.getTime()) ? null : text.includes('T') ? text : `${text}T00:00:00`;
    }

    // Handle range: "Mar 04, 2026 - Mar 06, 2026" — take first date
    const parts = text.split(/\s*[-–]\s*/);
    const datePart = parts[0].trim();

    const d = new Date(datePart);
    if (!isNaN(d.getTime())) {
      return d.toISOString().split('.')[0];
    }

    return null;
  }

  private stripHtml(html: string): string {
    return html
      .replace(/<[^>]*>/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ')
      .replace(/\r\n/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private inferNeighborhoodFromRegion(region: string, venue: string): string {
    const text = `${region} ${venue}`.toLowerCase();
    if (text.includes('south beach') || text.includes('lincoln road') || text.includes('ocean drive')) return 'South Beach';
    if (text.includes('wynwood')) return 'Wynwood';
    if (text.includes('brickell')) return 'Brickell';
    if (text.includes('coconut grove') || text.includes('grove')) return 'Coconut Grove';
    if (text.includes('coral gables')) return 'Coral Gables';
    if (text.includes('design district')) return 'Design District';
    if (text.includes('midtown')) return 'Midtown';
    if (text.includes('little havana')) return 'Little Havana';
    if (text.includes('miami beach')) return 'Miami Beach';
    if (text.includes('miami gardens')) return 'Miami Gardens';
    if (text.includes('key biscayne')) return 'Key Biscayne';
    if (text.includes('downtown')) return 'Downtown Miami';
    if (text.includes('edgewater')) return 'Edgewater';
    if (text.includes('little haiti')) return 'Little Haiti';
    if (text.includes('north miami')) return 'North Miami';
    if (text.includes('surfside')) return 'Surfside';
    if (text.includes('pinecrest')) return 'Pinecrest';
    // Broader region matches
    if (region.toLowerCase().includes('miami beach')) return 'Miami Beach';
    if (region.toLowerCase().includes('miami')) return 'Miami';
    return 'Miami';
  }
}
