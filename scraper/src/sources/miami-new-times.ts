/**
 * Miami New Times Event Scraper
 *
 * Strategy (updated 2026-03-05):
 *   1. Try WordPress REST API (The Events Calendar plugin):
 *      https://www.miaminewtimes.com/wp-json/tribe/events/v1/events
 *   2. Fall back to HTML scraping of the events search page with updated selectors
 *
 * The site has redesigned its events section multiple times — the WordPress
 * API is more stable than CSS selectors.
 */

import { addDays, format, parse } from 'date-fns';
import * as cheerio from 'cheerio';
import type { Element } from 'domhandler';
import { BaseScraper } from './base.js';
import type { RawEvent } from '../types.js';

interface TribeEvent {
  id: number;
  title: string;
  description: string;
  url: string;
  start_date: string;
  end_date: string;
  all_day: boolean;
  categories?: Array<{ name: string; slug: string }>;
  tags?: Array<{ name: string; slug: string }>;
  venue?: {
    venue: string;
    address: string;
    city: string;
    state: string;
    zip: string;
  };
  cost?: string;
  cost_details?: { values: string[] };
  image?: { url: string };
}

interface TribeResponse {
  events: TribeEvent[];
  total: number;
  total_pages: number;
}

export class MiamiNewTimesScraper extends BaseScraper {
  private baseUrl = 'https://www.miaminewtimes.com';

  constructor() {
    super('Miami New Times', { weight: 1.5, rateLimit: 1500 });
  }

  async scrape(): Promise<RawEvent[]> {
    // Strategy 1: WordPress / Tribe Events REST API
    const apiEvents = await this.tryTribeApi();
    if (apiEvents.length > 0) {
      this.log(`Total: ${apiEvents.length} events from Tribe API`);
      return apiEvents;
    }

    // Strategy 2: HTML scraping with updated selectors
    this.log('Tribe API unavailable, falling back to HTML scraping...');
    const htmlEvents = await this.scrapeHtml();
    this.log(`Total: ${htmlEvents.length} events from HTML scraping`);
    return htmlEvents;
  }

  private async tryTribeApi(): Promise<RawEvent[]> {
    const today = format(new Date(), 'yyyy-MM-dd');
    const apiUrls = [
      `${this.baseUrl}/wp-json/tribe/events/v1/events?per_page=50&start_date=${today}`,
      `${this.baseUrl}/wp-json/tribe/events/v1/events?per_page=50`,
    ];

    for (const apiUrl of apiUrls) {
      try {
        this.log(`Trying Tribe Events API: ${apiUrl}`);
        const data = await this.fetchJSONNativeGet<TribeResponse>(apiUrl, 15_000);

        if (!data?.events?.length) continue;

        const events: RawEvent[] = [];
        const now = new Date();

        for (const item of data.events) {
          const startAt = item.start_date?.replace(' ', 'T');
          if (!startAt || new Date(startAt) < now) continue;

          const title = this.cleanText(item.title);
          if (!title || title.length < 5) continue;

          const description = this.cleanText(
            item.description?.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')
          );

          const venueName = item.venue?.venue;
          const address = item.venue
            ? `${item.venue.address || ''}, ${item.venue.city || 'Miami'}, ${item.venue.state || 'FL'} ${item.venue.zip || ''}`.trim()
            : undefined;

          const neighborhood = this.inferNeighborhood(venueName || '', address || '');
          const city = this.inferCity(neighborhood, address || '');
          const priceInfo = this.parsePrice(item.cost || 'Free');
          const category = this.categorize(title, description, venueName || '');
          const tags = this.generateTags(title, description, category);
          const image = item.image?.url;

          events.push({
            title,
            startAt,
            endAt: item.end_date?.replace(' ', 'T'),
            venueName,
            address,
            neighborhood,
            lat: null,
            lng: null,
            city,
            tags,
            category,
            priceLabel: priceInfo.label,
            priceAmount: priceInfo.amount,
            isOutdoor: this.isOutdoor(title, description, venueName || ''),
            description: description || `${title} at ${venueName || neighborhood}`,
            sourceUrl: item.url || `${this.baseUrl}/events`,
            image,
            sourceName: this.name,
          });
        }

        return events;
      } catch (e) {
        this.log(`  API attempt failed: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    return [];
  }

  private async scrapeHtml(): Promise<RawEvent[]> {
    const events: RawEvent[] = [];
    const daysAhead = 14;

    this.log(`Scraping HTML events for next ${daysAhead} days...`);

    for (let i = 0; i < daysAhead; i++) {
      const targetDate = addDays(new Date(), i);
      const dateStr = format(targetDate, 'yyyy-MM-dd');

      try {
        const dayEvents = await this.scrapeDay(dateStr);
        events.push(...dayEvents);
        if (dayEvents.length > 0) {
          this.log(`  Found ${dayEvents.length} events for ${dateStr}`);
        }
      } catch (error) {
        this.logError(`Failed to scrape ${dateStr}`, error);
      }
    }

    return events;
  }

  private async scrapeDay(dateStr: string): Promise<RawEvent[]> {
    const url = `${this.baseUrl}/eventsearch/?narrowByDate=${dateStr}&page=1`;
    let $: cheerio.CheerioAPI;
    try {
      $ = await this.fetchHTMLNativeRetry(url, 2, 15_000);
    } catch {
      // Fall back to undici fetch
      $ = await this.fetchHTML(url);
    }
    const events: RawEvent[] = [];

    // Try multiple selector strategies
    const selectors = [
      '.events-calendar__list-item',           // Original
      '.event-card', '.eventCard',             // Common redesign patterns
      '[class*="event-listing"]',              // Wildcard
      'article[class*="event"]',               // Article-based
      '.searchResult', '.search-result',       // Search results page
      '.contentBody a[href*="/events/"]',      // Link-based fallback
    ];

    for (const selector of selectors) {
      const listings = $(selector);
      if (listings.length === 0) continue;

      listings.each((_, element) => {
        try {
          const event = this.parseEventListing($, $(element), dateStr);
          if (event) events.push(event);
        } catch { /* skip */ }
      });

      if (events.length > 0) break;
    }

    return events;
  }

  private parseEventListing(
    $: cheerio.CheerioAPI,
    item: cheerio.Cheerio<Element>,
    dateStr: string
  ): RawEvent | null {
    // Extract event name from link
    const eventLink = item.find('a').first();
    let title = this.cleanText(eventLink.text());

    // If no text, try image alt
    if (!title || title.length < 5) {
      const img = eventLink.find('img');
      title = this.cleanText(img.attr('alt'));
    }

    // Also try heading tags
    if (!title || title.length < 5) {
      title = this.cleanText(item.find('h2, h3, h4').first().text());
    }

    if (!title || title.length < 5) return null;

    // Get event URL
    let sourceUrl = eventLink.attr('href') || '';
    if (sourceUrl.startsWith('/')) {
      sourceUrl = this.baseUrl + sourceUrl;
    }

    // Parse full text for venue, time, neighborhood
    const fullText = item.text();

    // Parse time
    const timeMatch = fullText.match(/(\d{1,2}:\d{2}\s*(am|pm|AM|PM))/);
    let startAt = `${dateStr}T12:00:00`;
    if (timeMatch) {
      try {
        const timeStr = timeMatch[1].toLowerCase().replace(/\s/g, '');
        const parsed = parse(timeStr, 'h:mma', new Date());
        const hours = format(parsed, 'HH');
        const minutes = format(parsed, 'mm');
        startAt = `${dateStr}T${hours}:${minutes}:00`;
      } catch { /* use default */ }
    }

    // Parse venue and address
    const venueMatch = fullText.match(/\d{1,2}:\d{2}\s*(am|pm|AM|PM)([^N]+)Neighborhood:/i);
    let venueName: string | undefined;
    let address: string | undefined;

    if (venueMatch) {
      const venueSection = venueMatch[2].trim();
      if (venueSection.includes(',')) {
        const parts = venueSection.split(',');
        venueName = this.cleanText(parts[0]);
        address = this.cleanText(parts.slice(1).join(','));
      } else {
        venueName = this.cleanText(venueSection);
      }
    }

    // Parse neighborhood
    const neighborhoodMatch = fullText.match(/Neighborhood:\s*([A-Za-z\s/]+?)(?:\s*(?:Price|Category|TBA|Venue|When|Where|$|\n|[0-9]))/i);
    const neighborhood = neighborhoodMatch
      ? this.cleanText(neighborhoodMatch[1])
      : 'Miami';

    const city = this.inferCity(neighborhood, '');

    // Extract image
    const img = item.find('img').first();
    let image = img.attr('src') || img.attr('data-src') || undefined;
    if (image && image.startsWith('/')) {
      image = this.baseUrl + image;
    }

    const priceInfo = this.parsePrice(fullText);
    const category = this.categorize(title, '', venueName || '');
    const tags = this.generateTags(title, '', category);

    return {
      title,
      startAt,
      venueName,
      address,
      neighborhood,
      lat: null,
      lng: null,
      city,
      tags,
      category,
      priceLabel: priceInfo.label,
      priceAmount: priceInfo.amount,
      isOutdoor: this.isOutdoor(title, '', venueName || ''),
      description: `${title} at ${venueName || neighborhood}`,
      sourceUrl,
      image,
      sourceName: this.name,
    };
  }

  private inferNeighborhood(venue: string, address: string): string {
    const text = `${venue} ${address}`.toLowerCase();
    if (/wynwood/.test(text)) return 'Wynwood';
    if (/brickell/.test(text)) return 'Brickell';
    if (/south beach|ocean dr|collins ave|miami beach/.test(text)) return 'South Beach';
    if (/design district/.test(text)) return 'Design District';
    if (/little havana|calle ocho/.test(text)) return 'Little Havana';
    if (/coconut grove/.test(text)) return 'Coconut Grove';
    if (/coral gables/.test(text)) return 'Coral Gables';
    if (/downtown|biscayne/.test(text)) return 'Downtown Miami';
    if (/little haiti/.test(text)) return 'Little Haiti';
    if (/overtown/.test(text)) return 'Overtown';
    return 'Miami';
  }

  private inferCity(neighborhood: string, address: string): 'Miami' | 'Fort Lauderdale' | 'Palm Beach' {
    const text = `${neighborhood} ${address}`.toLowerCase();
    if (/fort lauderdale|hollywood|dania|pompano|davie|plantation|sunrise|weston|pembroke|hallandale|deerfield/i.test(text)) {
      return 'Fort Lauderdale';
    }
    if (/palm beach|boca raton|delray|boynton|jupiter|wellington/i.test(text)) {
      return 'Palm Beach';
    }
    return 'Miami';
  }
}
