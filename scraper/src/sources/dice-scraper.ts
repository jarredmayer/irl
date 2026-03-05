/**
 * Dice.fm Scraper via Apify
 *
 * Uses the Apify actor "lexis-solutions/dice-fm" to scrape Dice.fm Miami events.
 * The direct Dice.fm site is a React SPA with no server-side data, so we use
 * Apify's pre-built actor to handle the browser rendering.
 *
 * Requires APIFY_TOKEN environment variable.
 */

import { BaseScraper } from './base.js';
import type { RawEvent } from '../types.js';
import { findVenue } from '../venues.js';

interface ApifyDiceEvent {
  name?: string;
  title?: string;
  date?: string;
  startDate?: string;
  start_date?: string;
  endDate?: string;
  end_date?: string;
  venue?: string;
  venueName?: string;
  venue_name?: string;
  location?: string | { name?: string; address?: string; city?: string };
  address?: string;
  url?: string;
  link?: string;
  image?: string;
  imageUrl?: string;
  image_url?: string;
  price?: string | number;
  lineup?: string[];
  artists?: string[] | Array<{ name?: string }>;
  genre?: string;
  genres?: string[];
  description?: string;
}

export class DiceRealScraper extends BaseScraper {
  private actorId = 'lexis-solutions~dice-fm';
  private browseUrl = 'https://dice.fm/browse/miami-5e3bf1b0fe75488ec46cdf9f';

  constructor() {
    super('Dice.fm Real', { weight: 1.5, rateLimit: 2000 });
  }

  async scrape(): Promise<RawEvent[]> {
    const token = process.env.APIFY_TOKEN;
    if (!token) {
      this.log('APIFY_TOKEN not set — skipping Dice.fm scraper');
      return [];
    }

    this.log('Starting Apify Dice.fm actor run...');

    try {
      // 1. Start the actor run
      const runId = await this.startActorRun(token);
      if (!runId) {
        this.log('Failed to start Apify actor run');
        return [];
      }
      this.log(`  Actor run started: ${runId}`);

      // 2. Poll until complete (max ~3 minutes)
      const datasetId = await this.waitForCompletion(token, runId);
      if (!datasetId) {
        this.log('Actor run did not complete successfully');
        return [];
      }

      // 3. Fetch results from dataset
      const items = await this.fetchDataset(token, datasetId);
      this.log(`  Fetched ${items.length} items from dataset`);

      // 4. Map to RawEvent
      const now = new Date();
      const events: RawEvent[] = [];
      let skipped = 0;
      let failed = 0;

      for (const item of items) {
        try {
          const event = this.mapApifyEvent(item, now);
          if (event) {
            events.push(event);
          } else {
            skipped++;
          }
        } catch {
          failed++;
        }
      }

      this.log(`Found ${events.length} events (${skipped} skipped, ${failed} failed to parse)`);
      return events;
    } catch (error) {
      this.logError('Apify Dice.fm scraper failed', error);
      return [];
    }
  }

  private async startActorRun(token: string): Promise<string | null> {
    const now = new Date();
    const dateFrom = now.toISOString().slice(0, 10);
    const dateTo = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const input = {
      startUrls: [{ url: this.browseUrl }],
      maxItems: 100,
      dateFrom,
      dateUntil: dateTo,
    };

    const url = `https://api.apify.com/v2/acts/${this.actorId}/runs?token=${token}`;
    const body = JSON.stringify(input);

    const data = await this.fetchJSONNative<{ data?: { id?: string } }>(
      url,
      body,
      {
        'Content-Type': 'application/json',
      },
      30_000,
    );

    return data?.data?.id || null;
  }

  private async waitForCompletion(token: string, runId: string): Promise<string | null> {
    const maxAttempts = 36; // 36 * 5s = 3 minutes
    const pollInterval = 5_000;

    for (let i = 0; i < maxAttempts; i++) {
      await this.sleep(pollInterval);

      const url = `https://api.apify.com/v2/actor-runs/${runId}?token=${token}`;
      const data = await this.fetchJSONNativeGet<{
        data?: { status?: string; defaultDatasetId?: string };
      }>(url, 10_000);

      const status = data?.data?.status;
      if (status === 'SUCCEEDED') {
        return data?.data?.defaultDatasetId || null;
      }
      if (status === 'FAILED' || status === 'ABORTED' || status === 'TIMED-OUT') {
        this.log(`  Actor run ${status}`);
        return null;
      }

      // Still RUNNING or READY — continue polling
      if (i % 6 === 0) {
        this.log(`  Still waiting for actor run (status: ${status})...`);
      }
    }

    this.log('  Actor run timed out after 3 minutes');
    return null;
  }

  private async fetchDataset(token: string, datasetId: string): Promise<ApifyDiceEvent[]> {
    const url = `https://api.apify.com/v2/datasets/${datasetId}/items?token=${token}&format=json&limit=100`;
    return this.fetchJSONNativeGet<ApifyDiceEvent[]>(url, 15_000);
  }

  private mapApifyEvent(item: ApifyDiceEvent, now: Date): RawEvent | null {
    const title = item.name || item.title;
    if (!title || title.length < 3) return null;

    // Parse date
    const dateStr = item.date || item.startDate || item.start_date;
    const startAt = dateStr ? this.parseDate(dateStr) : null;
    if (!startAt) return null;
    if (new Date(startAt) < now) return null;

    // Parse venue
    let venueName = 'Miami Venue';
    let address: string | undefined;

    if (item.venueName || item.venue_name || (typeof item.venue === 'string' && item.venue)) {
      venueName = (item.venueName || item.venue_name || item.venue) as string;
    } else if (typeof item.location === 'object' && item.location) {
      venueName = item.location.name || venueName;
      address = item.location.address;
    } else if (typeof item.location === 'string') {
      venueName = item.location;
    }

    if (!address && item.address) {
      address = item.address;
    }

    const knownVenue = findVenue(venueName);

    // Parse price
    const price = this.parsePriceAmount(item.price);

    // Build URL
    const sourceUrl = item.url || item.link || this.browseUrl;

    // Parse image
    const image = item.image || item.imageUrl || item.image_url;

    // Lineup
    const artists = item.lineup || item.artists || [];
    const lineup = artists
      .map((a: string | { name?: string }) => (typeof a === 'string' ? a : a.name))
      .filter(Boolean)
      .join(', ');

    const endAt = item.endDate || item.end_date;

    const category = this.categorize(title, item.description || '', venueName);
    const tags = this.generateTags(title, item.description || '', category);
    if (!tags.includes('live-music') && !tags.includes('dj')) {
      tags.unshift('live-music');
      if (tags.length > 5) tags.pop();
    }

    return {
      title,
      startAt,
      endAt: endAt ? this.parseDate(endAt) || undefined : undefined,
      venueName: knownVenue?.name || venueName,
      address: knownVenue?.address || address,
      neighborhood: knownVenue?.neighborhood || this.inferNeighborhood(venueName),
      lat: knownVenue?.lat,
      lng: knownVenue?.lng,
      city: 'Miami',
      tags: tags.slice(0, 5),
      category,
      priceLabel: price === 0 ? 'Free' : price > 50 ? '$$' : '$',
      priceAmount: price,
      isOutdoor: this.isOutdoor(title, item.description || '', venueName),
      description: lineup
        ? `${title} ft. ${lineup} at ${venueName}. Get tickets on Dice.fm.`
        : `${title} at ${venueName}. Get tickets on Dice.fm.`,
      sourceUrl,
      sourceName: this.name,
      image,
      ticketUrl: sourceUrl !== this.browseUrl ? sourceUrl : undefined,
      recurring: false,
    };
  }

  private parseDate(dateStr: string): string | null {
    if (!dateStr) return null;
    const currentYear = new Date().getFullYear();

    // ISO format: "2026-03-15T21:00:00" or "2026-03-15T21:00:00Z"
    if (/^\d{4}-\d{2}-\d{2}T/.test(dateStr)) {
      return dateStr.replace('Z', '').replace(/\.\d+$/, '');
    }

    // ISO date only: "2026-03-15"
    const isoMatch = dateStr.match(/^(\d{4}-\d{2}-\d{2})$/);
    if (isoMatch) {
      return `${isoMatch[1]}T21:00:00`;
    }

    // "Sat 25 Jan" or "25 Jan" format
    const dayMonthMatch = dateStr.match(/(\d{1,2})\s*(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i);
    if (dayMonthMatch) {
      const day = parseInt(dayMonthMatch[1], 10);
      const monthStr = dayMonthMatch[2].toLowerCase();
      const months: Record<string, number> = {
        jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
        jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
      };
      const month = months[monthStr];
      if (month !== undefined) {
        const now = new Date();
        let year = currentYear;
        if (month < now.getMonth()) year = currentYear + 1;
        const date = new Date(year, month, day);
        return `${date.toISOString().slice(0, 10)}T21:00:00`;
      }
    }

    // "March 15, 2026" format
    const fullDateMatch = dateStr.match(/(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2}),?\s*(\d{4})?/i);
    if (fullDateMatch) {
      const monthMap: Record<string, string> = {
        january: '01', february: '02', march: '03', april: '04', may: '05', june: '06',
        july: '07', august: '08', september: '09', october: '10', november: '11', december: '12',
      };
      const month = monthMap[fullDateMatch[1].toLowerCase()];
      if (month) {
        const day = fullDateMatch[2].padStart(2, '0');
        const year = fullDateMatch[3] || currentYear;
        return `${year}-${month}-${day}T21:00:00`;
      }
    }

    return null;
  }

  private parsePriceAmount(price: string | number | undefined): number {
    if (price === undefined || price === null) return 0;
    if (typeof price === 'number') return price;

    const lower = price.toLowerCase();
    if (lower.includes('free') || lower.includes('rsvp')) return 0;

    const match = price.match(/\$?\s*(\d+(?:\.\d{2})?)/);
    if (match) return parseFloat(match[1]);

    return 20; // Default estimate for Dice events
  }

  private inferNeighborhood(venue: string): string {
    const v = venue.toLowerCase();
    if (v.includes('wynwood') || v.includes('do not sit') || v.includes('bardot')) return 'Wynwood';
    if (v.includes('space') || v.includes('ground') || v.includes('club space')) return 'Downtown Miami';
    if (v.includes('floyd') || v.includes('jolene')) return 'Edgewater';
    if (v.includes('beach') || v.includes('faena') || v.includes('edition')) return 'South Beach';
    if (v.includes('brickell')) return 'Brickell';
    if (v.includes('little havana') || v.includes('ball & chain')) return 'Little Havana';
    return 'Miami';
  }
}
