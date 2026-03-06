/**
 * Miami Museum Scrapers
 *
 * Scrapers for major Miami cultural institutions:
 * - PAMM (Pérez Art Museum Miami)
 * - ICA Miami (Institute of Contemporary Art)
 * - The Wolfsonian-FIU
 * - Little Haiti Cultural Complex
 * - Wynwood BID Events
 */

import { BaseScraper } from './base.js';
import type { RawEvent } from '../types.js';
import * as cheerio from 'cheerio';

/**
 * PAMM (Pérez Art Museum Miami) Scraper
 *
 * PAMM uses a Drupal-based site with events listed on /programs-and-events.
 * Events are in JSON-LD structured data or can be scraped from HTML.
 */
export class PAMMScraper extends BaseScraper {
  private readonly baseUrl = 'https://www.pamm.org';

  constructor() {
    super('PAMM', { weight: 1.5, rateLimit: 2000 });
  }

  async scrape(): Promise<RawEvent[]> {
    this.log('Fetching PAMM events...');
    const events: RawEvent[] = [];

    try {
      // Try programs and events page
      const programEvents = await this.scrapeEventsPage();
      events.push(...programEvents);

      // Try exhibitions page for exhibition-related events
      const exhibitionEvents = await this.scrapeExhibitionsPage();
      events.push(...exhibitionEvents);

      this.log(`Found ${events.length} PAMM events`);
      return this.dedupeEvents(events);
    } catch (e) {
      this.logError('PAMM scrape failed', e);
      return [];
    }
  }

  private async scrapeEventsPage(): Promise<RawEvent[]> {
    const events: RawEvent[] = [];
    const now = new Date();

    try {
      const $ = await this.fetchHTMLNativeRetry(`${this.baseUrl}/programs-and-events`, 2, 15_000);

      // Try JSON-LD first
      const jsonLdEvents = this.parseJsonLd($, now);
      if (jsonLdEvents.length > 0) {
        return jsonLdEvents;
      }

      // Fallback: parse HTML event listings
      $('.event-item, .program-item, .views-row').each((_i, el) => {
        const $el = $(el);
        const title = this.cleanText($el.find('h2, h3, .title, .event-title').first().text());
        if (!title || title.length < 3) return;

        const dateText = this.cleanText($el.find('.date, .event-date, time').first().text());
        const startAt = this.parseDate(dateText);
        if (!startAt || new Date(startAt) < now) return;

        const description = this.cleanText($el.find('.description, .summary, p').first().text());
        const link = $el.find('a').first().attr('href') || '';
        const sourceUrl = link.startsWith('http') ? link : `${this.baseUrl}${link}`;

        const image = $el.find('img').first().attr('src') || undefined;

        events.push({
          title,
          startAt,
          venueName: 'Pérez Art Museum Miami',
          address: '1103 Biscayne Blvd, Miami, FL 33132',
          neighborhood: 'Downtown Miami',
          lat: 25.7856,
          lng: -80.1866,
          city: 'Miami',
          tags: ['museum', 'art-gallery'],
          category: 'Art',
          isOutdoor: false,
          description: description || `${title} at PAMM`,
          sourceUrl,
          sourceName: this.name,
          image: image?.startsWith('http') ? image : image ? `${this.baseUrl}${image}` : undefined,
        });
      });
    } catch (e) {
      this.log(`  Events page failed: ${e instanceof Error ? e.message : String(e)}`);
    }

    return events;
  }

  private async scrapeExhibitionsPage(): Promise<RawEvent[]> {
    const events: RawEvent[] = [];
    const now = new Date();

    try {
      const $ = await this.fetchHTMLNativeRetry(`${this.baseUrl}/exhibitions`, 2, 15_000);

      $('.exhibition-item, .views-row').each((_i, el) => {
        const $el = $(el);
        const title = this.cleanText($el.find('h2, h3, .title').first().text());
        if (!title || title.length < 3) return;

        // Try to get exhibition dates
        const dateText = this.cleanText($el.find('.date, .exhibition-dates').first().text());
        const dates = this.parseExhibitionDates(dateText);
        if (!dates || new Date(dates.end) < now) return;

        const description = this.cleanText($el.find('.description, p').first().text());
        const link = $el.find('a').first().attr('href') || '';
        const sourceUrl = link.startsWith('http') ? link : `${this.baseUrl}${link}`;
        const image = $el.find('img').first().attr('src') || undefined;

        events.push({
          title: `Exhibition: ${title}`,
          startAt: dates.start,
          endAt: dates.end,
          venueName: 'Pérez Art Museum Miami',
          address: '1103 Biscayne Blvd, Miami, FL 33132',
          neighborhood: 'Downtown Miami',
          lat: 25.7856,
          lng: -80.1866,
          city: 'Miami',
          tags: ['museum', 'art-gallery', 'exhibition'],
          category: 'Art',
          isOutdoor: false,
          description: description || `${title} exhibition at PAMM`,
          sourceUrl,
          sourceName: this.name,
          image: image?.startsWith('http') ? image : image ? `${this.baseUrl}${image}` : undefined,
        });
      });
    } catch (e) {
      this.log(`  Exhibitions page failed: ${e instanceof Error ? e.message : String(e)}`);
    }

    return events;
  }

  private parseJsonLd($: cheerio.CheerioAPI, now: Date): RawEvent[] {
    const events: RawEvent[] = [];

    $('script[type="application/ld+json"]').each((_i, el) => {
      try {
        const data = JSON.parse($(el).html() || '');
        const items = Array.isArray(data) ? data : [data];

        for (const item of items) {
          if (item['@type'] !== 'Event') continue;

          const startDate = item.startDate || '';
          if (!startDate || new Date(startDate) < now) continue;

          events.push({
            title: item.name || '',
            startAt: startDate.replace('Z', '').replace(/\.\d+$/, ''),
            endAt: item.endDate?.replace('Z', '').replace(/\.\d+$/, ''),
            venueName: 'Pérez Art Museum Miami',
            address: '1103 Biscayne Blvd, Miami, FL 33132',
            neighborhood: 'Downtown Miami',
            lat: 25.7856,
            lng: -80.1866,
            city: 'Miami',
            tags: ['museum', 'art-gallery'],
            category: 'Art',
            isOutdoor: false,
            description: item.description || `${item.name} at PAMM`,
            sourceUrl: item.url || this.baseUrl,
            sourceName: this.name,
            image: item.image?.url || item.image || undefined,
            priceLabel: item.offers?.price === 0 || item.isAccessibleForFree ? 'Free' : '$',
          });
        }
      } catch { /* skip invalid JSON-LD */ }
    });

    return events;
  }

  private parseDate(text: string): string | null {
    if (!text) return null;

    // ISO format
    if (/^\d{4}-\d{2}-\d{2}/.test(text)) {
      return text.includes('T') ? text : `${text}T19:00:00`;
    }

    // Natural language: "March 15, 2026" or "Mar 15"
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

  private parseExhibitionDates(text: string): { start: string; end: string } | null {
    if (!text) return null;

    // Pattern: "March 1 – June 30, 2026" or "Mar 1 - Jun 30"
    const match = text.match(/(\w{3,}\s+\d{1,2})[,\s]*(?:\d{4})?\s*[-–—]\s*(\w{3,}\s+\d{1,2})[,\s]*(\d{4})?/i);
    if (match) {
      const startStr = `${match[1]}, ${match[3] || new Date().getFullYear()}`;
      const endStr = `${match[2]}, ${match[3] || new Date().getFullYear()}`;
      const start = this.parseDate(startStr);
      const end = this.parseDate(endStr);
      if (start && end) return { start, end };
    }

    return null;
  }

  private dedupeEvents(events: RawEvent[]): RawEvent[] {
    const seen = new Set<string>();
    return events.filter(e => {
      const key = `${e.title}|${e.startAt?.slice(0, 10)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
}

/**
 * ICA Miami (Institute of Contemporary Art) Scraper
 *
 * ICA Miami is in the Design District and often has free admission.
 * Uses similar patterns to PAMM for scraping.
 */
export class ICAMiamiScraper extends BaseScraper {
  private readonly baseUrl = 'https://icamiami.org';

  constructor() {
    super('ICA Miami', { weight: 1.5, rateLimit: 2000 });
  }

  async scrape(): Promise<RawEvent[]> {
    this.log('Fetching ICA Miami events...');
    const events: RawEvent[] = [];
    const now = new Date();

    try {
      // Try calendar/events page
      const urls = [
        `${this.baseUrl}/calendar`,
        `${this.baseUrl}/events`,
        `${this.baseUrl}/programs`,
      ];

      for (const url of urls) {
        try {
          const $ = await this.fetchHTMLNativeRetry(url, 2, 15_000);

          // Parse JSON-LD
          $('script[type="application/ld+json"]').each((_i, el) => {
            try {
              const data = JSON.parse($(el).html() || '');
              const items = Array.isArray(data) ? data : [data];

              for (const item of items) {
                if (item['@type'] !== 'Event') continue;
                if (!item.startDate || new Date(item.startDate) < now) continue;

                events.push(this.createEvent(item.name, item.startDate, {
                  endAt: item.endDate,
                  description: item.description,
                  sourceUrl: item.url || url,
                  image: item.image?.url || item.image,
                  priceLabel: item.isAccessibleForFree ? 'Free' : undefined,
                }));
              }
            } catch { /* skip */ }
          });

          // Parse HTML listings
          $('.event-card, .event-item, .program-item, .calendar-item').each((_i, el) => {
            const $el = $(el);
            const title = this.cleanText($el.find('h2, h3, .title').first().text());
            if (!title) return;

            const dateText = this.cleanText($el.find('.date, time').first().text());
            const startAt = this.parseDate(dateText);
            if (!startAt || new Date(startAt) < now) return;

            const link = $el.find('a').first().attr('href') || '';
            const sourceUrl = link.startsWith('http') ? link : `${this.baseUrl}${link}`;
            const image = $el.find('img').first().attr('src') || undefined;
            const description = this.cleanText($el.find('.description, p').first().text());

            events.push(this.createEvent(title, startAt, {
              description,
              sourceUrl,
              image: image?.startsWith('http') ? image : image ? `${this.baseUrl}${image}` : undefined,
            }));
          });

          if (events.length > 0) break;
        } catch { continue; }
      }

      this.log(`Found ${events.length} ICA Miami events`);
      return this.dedupeEvents(events);
    } catch (e) {
      this.logError('ICA Miami scrape failed', e);
      return [];
    }
  }

  private createEvent(title: string, startAt: string, opts: {
    endAt?: string;
    description?: string;
    sourceUrl?: string;
    image?: string;
    priceLabel?: 'Free' | '$' | '$$' | '$$$';
  }): RawEvent {
    return {
      title,
      startAt: startAt.replace('Z', '').replace(/\.\d+$/, ''),
      endAt: opts.endAt?.replace('Z', '').replace(/\.\d+$/, ''),
      venueName: 'Institute of Contemporary Art, Miami',
      address: '61 NE 41st St, Miami, FL 33137',
      neighborhood: 'Design District',
      lat: 25.8118,
      lng: -80.1932,
      city: 'Miami',
      tags: ['museum', 'art-gallery', 'free-event'],
      category: 'Art',
      priceLabel: opts.priceLabel || 'Free', // ICA has free general admission
      isOutdoor: false,
      description: opts.description || `${title} at ICA Miami`,
      sourceUrl: opts.sourceUrl || this.baseUrl,
      sourceName: this.name,
      image: opts.image,
    };
  }

  private parseDate(text: string): string | null {
    if (!text) return null;
    if (/^\d{4}-\d{2}-\d{2}/.test(text)) {
      return text.includes('T') ? text : `${text}T19:00:00`;
    }
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

  private dedupeEvents(events: RawEvent[]): RawEvent[] {
    const seen = new Set<string>();
    return events.filter(e => {
      const key = `${e.title}|${e.startAt?.slice(0, 10)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
}

/**
 * The Wolfsonian-FIU Scraper
 *
 * The Wolfsonian is on Miami Beach and focuses on design and propaganda.
 */
export class WolfsonianScraper extends BaseScraper {
  private readonly baseUrl = 'https://wolfsonian.org';

  constructor() {
    super('Wolfsonian', { weight: 1.4, rateLimit: 2000 });
  }

  async scrape(): Promise<RawEvent[]> {
    this.log('Fetching Wolfsonian events...');
    const events: RawEvent[] = [];
    const now = new Date();

    try {
      const urls = [
        `${this.baseUrl}/events`,
        `${this.baseUrl}/calendar`,
        `${this.baseUrl}/programs`,
      ];

      for (const url of urls) {
        try {
          const $ = await this.fetchHTMLNativeRetry(url, 2, 15_000);

          // Parse JSON-LD
          $('script[type="application/ld+json"]').each((_i, el) => {
            try {
              const data = JSON.parse($(el).html() || '');
              const items = Array.isArray(data) ? data : [data];

              for (const item of items) {
                if (item['@type'] !== 'Event') continue;
                if (!item.startDate || new Date(item.startDate) < now) continue;

                events.push({
                  title: item.name || '',
                  startAt: item.startDate.replace('Z', '').replace(/\.\d+$/, ''),
                  endAt: item.endDate?.replace('Z', '').replace(/\.\d+$/, ''),
                  venueName: 'The Wolfsonian-FIU',
                  address: '1001 Washington Ave, Miami Beach, FL 33139',
                  neighborhood: 'South Beach',
                  lat: 25.7808,
                  lng: -80.1340,
                  city: 'Miami',
                  tags: ['museum', 'art-gallery'],
                  category: 'Art',
                  isOutdoor: false,
                  description: item.description || `${item.name} at The Wolfsonian`,
                  sourceUrl: item.url || url,
                  sourceName: this.name,
                  image: item.image?.url || item.image || undefined,
                });
              }
            } catch { /* skip */ }
          });

          // Parse HTML
          $('.event-item, .program-item, .views-row').each((_i, el) => {
            const $el = $(el);
            const title = this.cleanText($el.find('h2, h3, .title').first().text());
            if (!title) return;

            const dateText = this.cleanText($el.find('.date, time').first().text());
            const startAt = this.parseDate(dateText);
            if (!startAt || new Date(startAt) < now) return;

            const link = $el.find('a').first().attr('href') || '';
            const sourceUrl = link.startsWith('http') ? link : `${this.baseUrl}${link}`;
            const image = $el.find('img').first().attr('src') || undefined;

            events.push({
              title,
              startAt,
              venueName: 'The Wolfsonian-FIU',
              address: '1001 Washington Ave, Miami Beach, FL 33139',
              neighborhood: 'South Beach',
              lat: 25.7808,
              lng: -80.1340,
              city: 'Miami',
              tags: ['museum', 'art-gallery'],
              category: 'Art',
              isOutdoor: false,
              description: `${title} at The Wolfsonian`,
              sourceUrl,
              sourceName: this.name,
              image: image?.startsWith('http') ? image : undefined,
            });
          });

          if (events.length > 0) break;
        } catch { continue; }
      }

      this.log(`Found ${events.length} Wolfsonian events`);
      return events;
    } catch (e) {
      this.logError('Wolfsonian scrape failed', e);
      return [];
    }
  }

  private parseDate(text: string): string | null {
    if (!text) return null;
    if (/^\d{4}-\d{2}-\d{2}/.test(text)) {
      return text.includes('T') ? text : `${text}T19:00:00`;
    }
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
}

/**
 * Little Haiti Cultural Complex Scraper
 *
 * Community cultural center with Caribbean art, music, and events.
 */
export class LittleHaitiCulturalScraper extends BaseScraper {
  private readonly baseUrl = 'https://www.littlehaiticulturalcenter.com';

  constructor() {
    super('Little Haiti Cultural', { weight: 1.3, rateLimit: 2000 });
  }

  async scrape(): Promise<RawEvent[]> {
    this.log('Fetching Little Haiti Cultural events...');
    const events: RawEvent[] = [];
    const now = new Date();

    try {
      const urls = [
        `${this.baseUrl}/events`,
        `${this.baseUrl}/calendar`,
        this.baseUrl,
      ];

      for (const url of urls) {
        try {
          const $ = await this.fetchHTMLNativeRetry(url, 2, 15_000);

          // Parse JSON-LD
          $('script[type="application/ld+json"]').each((_i, el) => {
            try {
              const data = JSON.parse($(el).html() || '');
              const items = Array.isArray(data) ? data : [data];

              for (const item of items) {
                if (item['@type'] !== 'Event') continue;
                if (!item.startDate || new Date(item.startDate) < now) continue;

                events.push({
                  title: item.name || '',
                  startAt: item.startDate.replace('Z', '').replace(/\.\d+$/, ''),
                  endAt: item.endDate?.replace('Z', '').replace(/\.\d+$/, ''),
                  venueName: 'Little Haiti Cultural Complex',
                  address: '212-260 NE 59th Terrace, Miami, FL 33137',
                  neighborhood: 'Little Haiti',
                  lat: 25.8301,
                  lng: -80.1936,
                  city: 'Miami',
                  tags: ['community', 'latin', 'local-favorite'],
                  category: 'Culture',
                  isOutdoor: false,
                  description: item.description || `${item.name} at Little Haiti Cultural Complex`,
                  sourceUrl: item.url || url,
                  sourceName: this.name,
                  image: item.image?.url || item.image || undefined,
                  priceLabel: item.isAccessibleForFree ? 'Free' : '$',
                });
              }
            } catch { /* skip */ }
          });

          // Parse HTML
          $('.event-item, .event-card, article.event').each((_i, el) => {
            const $el = $(el);
            const title = this.cleanText($el.find('h2, h3, .title').first().text());
            if (!title) return;

            const dateText = this.cleanText($el.find('.date, time').first().text());
            const startAt = this.parseDate(dateText);
            if (!startAt || new Date(startAt) < now) return;

            const link = $el.find('a').first().attr('href') || '';
            const sourceUrl = link.startsWith('http') ? link : `${this.baseUrl}${link}`;
            const image = $el.find('img').first().attr('src') || undefined;
            const description = this.cleanText($el.find('.description, p').first().text());

            events.push({
              title,
              startAt,
              venueName: 'Little Haiti Cultural Complex',
              address: '212-260 NE 59th Terrace, Miami, FL 33137',
              neighborhood: 'Little Haiti',
              lat: 25.8301,
              lng: -80.1936,
              city: 'Miami',
              tags: ['community', 'latin', 'local-favorite'],
              category: 'Culture',
              isOutdoor: false,
              description: description || `${title} at Little Haiti Cultural Complex`,
              sourceUrl,
              sourceName: this.name,
              image: image?.startsWith('http') ? image : undefined,
            });
          });

          if (events.length > 0) break;
        } catch { continue; }
      }

      this.log(`Found ${events.length} Little Haiti Cultural events`);
      return events;
    } catch (e) {
      this.logError('Little Haiti Cultural scrape failed', e);
      return [];
    }
  }

  private parseDate(text: string): string | null {
    if (!text) return null;
    if (/^\d{4}-\d{2}-\d{2}/.test(text)) {
      return text.includes('T') ? text : `${text}T19:00:00`;
    }
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
}

/**
 * Wynwood BID (Business Improvement District) Events Scraper
 *
 * Wynwood BID organizes community events, art walks, and activations.
 */
export class WynwoodBIDScraper extends BaseScraper {
  private readonly baseUrl = 'https://wynwoodmiami.com';

  constructor() {
    super('Wynwood BID', { weight: 1.3, rateLimit: 2000 });
  }

  async scrape(): Promise<RawEvent[]> {
    this.log('Fetching Wynwood BID events...');
    const events: RawEvent[] = [];
    const now = new Date();

    try {
      const urls = [
        `${this.baseUrl}/events`,
        `${this.baseUrl}/happenings`,
        `${this.baseUrl}/whats-happening`,
      ];

      for (const url of urls) {
        try {
          const $ = await this.fetchHTMLNativeRetry(url, 2, 15_000);

          // Parse JSON-LD
          $('script[type="application/ld+json"]').each((_i, el) => {
            try {
              const data = JSON.parse($(el).html() || '');
              const items = Array.isArray(data) ? data : [data];

              for (const item of items) {
                if (item['@type'] !== 'Event') continue;
                if (!item.startDate || new Date(item.startDate) < now) continue;

                const venueName = item.location?.name || 'Wynwood';
                const address = item.location?.address?.streetAddress || 'Wynwood, Miami, FL';

                events.push({
                  title: item.name || '',
                  startAt: item.startDate.replace('Z', '').replace(/\.\d+$/, ''),
                  endAt: item.endDate?.replace('Z', '').replace(/\.\d+$/, ''),
                  venueName,
                  address,
                  neighborhood: 'Wynwood',
                  lat: item.location?.geo?.latitude || 25.8005,
                  lng: item.location?.geo?.longitude || -80.1992,
                  city: 'Miami',
                  tags: ['art-gallery', 'community', 'local-favorite'],
                  category: 'Art',
                  isOutdoor: this.isOutdoor(item.name || '', item.description || '', venueName),
                  description: item.description || `${item.name} in Wynwood`,
                  sourceUrl: item.url || url,
                  sourceName: this.name,
                  image: item.image?.url || item.image || undefined,
                  priceLabel: item.isAccessibleForFree ? 'Free' : '$',
                });
              }
            } catch { /* skip */ }
          });

          // Parse HTML
          $('.event-item, .event-card, .happenings-item').each((_i, el) => {
            const $el = $(el);
            const title = this.cleanText($el.find('h2, h3, .title').first().text());
            if (!title) return;

            const dateText = this.cleanText($el.find('.date, time').first().text());
            const startAt = this.parseDate(dateText);
            if (!startAt || new Date(startAt) < now) return;

            const link = $el.find('a').first().attr('href') || '';
            const sourceUrl = link.startsWith('http') ? link : `${this.baseUrl}${link}`;
            const image = $el.find('img').first().attr('src') || undefined;
            const description = this.cleanText($el.find('.description, p').first().text());
            const venue = this.cleanText($el.find('.venue, .location').first().text()) || 'Wynwood';

            events.push({
              title,
              startAt,
              venueName: venue,
              neighborhood: 'Wynwood',
              lat: 25.8005,
              lng: -80.1992,
              city: 'Miami',
              tags: ['art-gallery', 'community', 'local-favorite'],
              category: 'Art',
              isOutdoor: this.isOutdoor(title, description, venue),
              description: description || `${title} in Wynwood`,
              sourceUrl,
              sourceName: this.name,
              image: image?.startsWith('http') ? image : undefined,
            });
          });

          if (events.length > 0) break;
        } catch { continue; }
      }

      this.log(`Found ${events.length} Wynwood BID events`);
      return events;
    } catch (e) {
      this.logError('Wynwood BID scrape failed', e);
      return [];
    }
  }

  private parseDate(text: string): string | null {
    if (!text) return null;
    if (/^\d{4}-\d{2}-\d{2}/.test(text)) {
      return text.includes('T') ? text : `${text}T19:00:00`;
    }
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
}
