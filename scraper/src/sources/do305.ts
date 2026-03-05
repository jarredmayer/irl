/**
 * Do305 Scraper
 *
 * Fetches real events from Do305 (do305.com), a Miami-specific events platform.
 *
 * Do305 aggregates local Miami events — concerts, nightlife, food, art, and more.
 * The site may use structured data (JSON-LD), an API, or server-rendered HTML.
 *
 * Multiple strategies attempted with DNS fallback:
 *  1. Try fetching the main page or API endpoint with DNS fallback
 *  2. Parse JSON-LD structured data for events
 *  3. Parse HTML for event listings
 *
 * Returns [] gracefully if the domain is unreachable.
 */

import { BaseScraper } from './base.js';
import * as cheerio from 'cheerio';
import type { RawEvent } from '../types.js';

export class Do305Scraper extends BaseScraper {
  private readonly baseUrl = 'https://do305.com';

  constructor() {
    super('Do305', { weight: 1.3, rateLimit: 2000 });
  }

  async scrape(): Promise<RawEvent[]> {
    this.log('Fetching Do305 events...');

    // Strategy 1: Try the events page
    try {
      const events = await this.scrapeEventsPage();
      if (events.length > 0) {
        this.log(`Found ${events.length} Do305 events from events page`);
        return events;
      }
    } catch (e) {
      this.log(`  Events page failed: ${e instanceof Error ? e.message : String(e)}`);
    }

    // Strategy 2: Try the main page
    try {
      const events = await this.scrapeMainPage();
      if (events.length > 0) {
        this.log(`Found ${events.length} Do305 events from main page`);
        return events;
      }
    } catch (e) {
      this.log(`  Main page failed: ${e instanceof Error ? e.message : String(e)}`);
    }

    // Strategy 3: Try API endpoints
    try {
      const events = await this.tryApiEndpoints();
      if (events.length > 0) {
        this.log(`Found ${events.length} Do305 events from API`);
        return events;
      }
    } catch (e) {
      this.log(`  API endpoints failed: ${e instanceof Error ? e.message : String(e)}`);
    }

    this.log('All Do305 strategies failed (likely DNS/network issue)');
    return [];
  }

  /**
   * Scrape the events listing page.
   */
  private async scrapeEventsPage(): Promise<RawEvent[]> {
    const urls = [
      `${this.baseUrl}/events`,
      `${this.baseUrl}/events/`,
      `${this.baseUrl}/calendar`,
    ];

    for (const url of urls) {
      try {
        const $ = await this.fetchHTMLNativeRetry(url, 2, 15_000);
        const events = this.parseEvents($, url);
        if (events.length > 0) return events;
      } catch {
        continue;
      }
    }
    return [];
  }

  /**
   * Scrape the main page for featured events.
   */
  private async scrapeMainPage(): Promise<RawEvent[]> {
    const $ = await this.fetchHTMLNativeRetry(this.baseUrl, 2, 15_000);
    return this.parseEvents($, this.baseUrl);
  }

  /**
   * Try API endpoints that Do305 might expose.
   */
  private async tryApiEndpoints(): Promise<RawEvent[]> {
    const apiUrls = [
      `${this.baseUrl}/api/events`,
      `${this.baseUrl}/api/v1/events`,
      `${this.baseUrl}/wp-json/tribe/events/v1/events?per_page=50`,
      `${this.baseUrl}/wp-json/wp/v2/events?per_page=50`,
    ];

    for (const url of apiUrls) {
      try {
        const data = await this.fetchJSONNativeGet<any>(url, 10_000);

        // WordPress Tribe Events API
        if (data?.events && Array.isArray(data.events)) {
          return this.mapTribeEvents(data.events);
        }

        // Generic event array
        if (Array.isArray(data)) {
          return this.mapGenericEvents(data);
        }

        // Nested data
        if (data?.data && Array.isArray(data.data)) {
          return this.mapGenericEvents(data.data);
        }
      } catch {
        continue;
      }
    }
    return [];
  }

  /**
   * Parse events from HTML page (JSON-LD, structured data, or DOM).
   */
  private parseEvents($: cheerio.CheerioAPI, pageUrl: string): RawEvent[] {
    const events: RawEvent[] = [];
    const now = new Date();

    // Strategy A: JSON-LD structured data
    $('script[type="application/ld+json"]').each((_i, el) => {
      try {
        const data = JSON.parse($(el).html() || '');

        // Single event
        if (data['@type'] === 'Event' || data['@type'] === 'MusicEvent') {
          const event = this.mapJsonLdEvent(data, now);
          if (event) events.push(event);
        }

        // Event list
        if (data['@type'] === 'ItemList' && data.itemListElement) {
          for (const item of data.itemListElement) {
            const eventData = item.item || item;
            if (eventData['@type'] === 'Event' || eventData['@type'] === 'MusicEvent') {
              const event = this.mapJsonLdEvent(eventData, now);
              if (event) events.push(event);
            }
          }
        }

        // Array of events
        if (Array.isArray(data)) {
          for (const item of data) {
            if (item['@type'] === 'Event' || item['@type'] === 'MusicEvent') {
              const event = this.mapJsonLdEvent(item, now);
              if (event) events.push(event);
            }
          }
        }
      } catch {
        // Ignore parse errors
      }
    });

    if (events.length > 0) return events;

    // Strategy B: Parse event cards from HTML
    // Common patterns for event listing pages
    const selectors = [
      '.event-card', '.event-item', '.event-listing',
      '[data-event-id]', '[data-event]',
      'article.event', '.event',
      '.listing-item', '.card',
    ];

    for (const selector of selectors) {
      const elements = $(selector);
      if (elements.length < 2) continue; // Need at least 2 to confirm it's events

      elements.each((_i, el) => {
        const $el = $(el);
        const title = this.cleanText(
          $el.find('h2, h3, h4, .event-title, .title, .event-name').first().text()
        );
        if (!title || title.length < 3) return;

        // Try to find date
        const dateText = this.cleanText(
          $el.find('.date, .event-date, time, [datetime]').first().text()
          || $el.find('time').attr('datetime')
          || ''
        );

        // Try to find venue
        const venue = this.cleanText(
          $el.find('.venue, .event-venue, .location').first().text()
        );

        // Try to find link
        const link = $el.find('a').first().attr('href') || '';
        const sourceUrl = link.startsWith('http') ? link
          : link.startsWith('/') ? `${this.baseUrl}${link}`
          : pageUrl;

        // Parse date
        const startAt = this.parseDateText(dateText);
        if (!startAt) return;
        if (new Date(startAt) < now) return;

        const category = this.categorize(title, '', venue);
        const tags = this.generateTags(title, '', category);

        events.push({
          title,
          startAt,
          venueName: venue || undefined,
          neighborhood: this.resolveNeighborhood(venue, title),
          lat: null,
          lng: null,
          city: 'Miami',
          tags: tags.slice(0, 5),
          category,
          isOutdoor: this.isOutdoor(title, '', venue),
          description: `${title} — via Do305`,
          sourceUrl,
          sourceName: this.name,
        });
      });

      if (events.length > 0) break;
    }

    return events;
  }

  private mapJsonLdEvent(data: any, now: Date): RawEvent | null {
    const title = data.name || '';
    if (!title || title.length < 3) return null;

    const startDate = data.startDate || '';
    if (!startDate) return null;

    const startAt = startDate.includes('T')
      ? startDate.replace('Z', '').replace(/\.\d+$/, '')
      : `${startDate}T19:00:00`;
    if (new Date(startAt) < now) return null;

    const endAt = data.endDate
      ? data.endDate.replace('Z', '').replace(/\.\d+$/, '')
      : undefined;

    // Location
    const location = data.location || {};
    const venueName = location.name || '';
    const address = location.address?.streetAddress
      || (typeof location.address === 'string' ? location.address : '');
    const lat = location.geo?.latitude || null;
    const lng = location.geo?.longitude || null;

    // Price
    const offers = data.offers;
    let priceAmount = 0;
    if (offers) {
      const offerArr = Array.isArray(offers) ? offers : [offers];
      for (const offer of offerArr) {
        if (offer.price) {
          priceAmount = parseFloat(offer.price) || 0;
          break;
        }
        if (offer.lowPrice) {
          priceAmount = parseFloat(offer.lowPrice) || 0;
          break;
        }
      }
    }

    const priceLabel = priceAmount === 0 ? 'Free' as const
      : priceAmount <= 25 ? '$' as const
      : priceAmount <= 75 ? '$$' as const
      : '$$$' as const;

    const description = typeof data.description === 'string' ? data.description.slice(0, 300) : '';
    const category = this.categorize(title, description, venueName);
    const tags = this.generateTags(title, description, category);

    return {
      title,
      startAt,
      endAt,
      venueName: venueName || undefined,
      address: address || undefined,
      neighborhood: this.resolveNeighborhood(venueName, title),
      lat,
      lng,
      city: 'Miami',
      tags: tags.slice(0, 5),
      category,
      priceLabel,
      priceAmount: Math.round(priceAmount),
      isOutdoor: this.isOutdoor(title, description, venueName),
      description: description || `${title} — via Do305`,
      sourceUrl: data.url || this.baseUrl,
      sourceName: this.name,
      ticketUrl: data.url || undefined,
      image: data.image || undefined,
    };
  }

  private mapTribeEvents(events: any[]): RawEvent[] {
    const rawEvents: RawEvent[] = [];
    const now = new Date();

    for (const ev of events) {
      const title = ev.title || '';
      if (!title || title.length < 3) continue;

      const startAt = ev.start_date || ev.utc_start_date || '';
      if (!startAt || new Date(startAt) < now) continue;

      const venue = ev.venue || {};
      const category = this.categorize(title, ev.description || '', venue.venue || '');
      const tags = this.generateTags(title, ev.description || '', category);

      rawEvents.push({
        title,
        startAt: startAt.replace(' ', 'T'),
        endAt: ev.end_date?.replace(' ', 'T'),
        venueName: venue.venue || undefined,
        address: venue.address || undefined,
        neighborhood: this.resolveNeighborhood(venue.venue || '', title),
        lat: venue.lat ? parseFloat(venue.lat) : null,
        lng: venue.lng ? parseFloat(venue.lng) : null,
        city: 'Miami',
        tags: tags.slice(0, 5),
        category,
        priceLabel: ev.cost ? this.parsePrice(ev.cost).label : undefined,
        priceAmount: ev.cost ? this.parsePrice(ev.cost).amount : undefined,
        isOutdoor: this.isOutdoor(title, ev.description || '', venue.venue || ''),
        description: (ev.description || '').replace(/<[^>]+>/g, '').slice(0, 300) || `${title} — via Do305`,
        sourceUrl: ev.url || this.baseUrl,
        sourceName: this.name,
        ticketUrl: ev.url || undefined,
        image: ev.image?.url || undefined,
      });
    }

    return rawEvents;
  }

  private mapGenericEvents(events: any[]): RawEvent[] {
    const rawEvents: RawEvent[] = [];
    const now = new Date();

    for (const ev of events) {
      const title = ev.title || ev.name || '';
      if (!title || title.length < 3) continue;

      const dateStr = ev.start_date || ev.startDate || ev.date || '';
      if (!dateStr) continue;

      const startAt = dateStr.includes('T')
        ? dateStr.replace('Z', '').replace(/\.\d+$/, '')
        : `${dateStr}T19:00:00`;
      if (new Date(startAt) < now) continue;

      const venueName = ev.venue?.name || ev.venue || '';
      const category = this.categorize(title, ev.description || '', venueName);
      const tags = this.generateTags(title, ev.description || '', category);

      rawEvents.push({
        title,
        startAt,
        venueName: venueName || undefined,
        neighborhood: this.resolveNeighborhood(venueName, title),
        lat: ev.venue?.lat || ev.lat || null,
        lng: ev.venue?.lng || ev.lng || null,
        city: 'Miami',
        tags: tags.slice(0, 5),
        category,
        isOutdoor: this.isOutdoor(title, ev.description || '', venueName),
        description: (ev.description || '').slice(0, 300) || `${title} — via Do305`,
        sourceUrl: ev.url || this.baseUrl,
        sourceName: this.name,
        ticketUrl: ev.url || undefined,
        image: ev.image || undefined,
      });
    }

    return rawEvents;
  }

  private parseDateText(text: string): string | null {
    if (!text) return null;

    // ISO format
    if (/^\d{4}-\d{2}-\d{2}/.test(text)) {
      return text.includes('T') ? text : `${text}T19:00:00`;
    }

    // Try to parse natural language dates
    const months: Record<string, string> = {
      jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
      jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
    };
    const match = text.match(/(\w{3,})\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})?/i);
    if (match) {
      const month = months[match[1].toLowerCase().slice(0, 3)];
      if (month) {
        const day = match[2].padStart(2, '0');
        const year = match[3] || new Date().getFullYear().toString();
        return `${year}-${month}-${day}T19:00:00`;
      }
    }

    return null;
  }

  private resolveNeighborhood(venue: string, title: string): string {
    const text = `${venue} ${title}`.toLowerCase();
    if (/wynwood/.test(text)) return 'Wynwood';
    if (/brickell/.test(text)) return 'Brickell';
    if (/south beach|ocean dr|collins/.test(text)) return 'South Beach';
    if (/design district/.test(text)) return 'Design District';
    if (/little havana|calle ocho/.test(text)) return 'Little Havana';
    if (/coconut grove/.test(text)) return 'Coconut Grove';
    if (/coral gables/.test(text)) return 'Coral Gables';
    if (/downtown/.test(text)) return 'Downtown Miami';
    if (/miami beach/.test(text)) return 'Miami Beach';
    if (/edgewater/.test(text)) return 'Edgewater';
    if (/midtown/.test(text)) return 'Midtown';
    return 'Miami';
  }
}
