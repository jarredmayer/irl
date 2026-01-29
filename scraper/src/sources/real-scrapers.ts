/**
 * Real Event Scrapers
 * Verified sources with actual calendar data
 */

import * as cheerio from 'cheerio';
import { addDays, format, parse } from 'date-fns';
import { BaseScraper } from './base.js';
import type { RawEvent } from '../types.js';

// === DICE.FM MIAMI ===
export class DiceMiamiScraper extends BaseScraper {
  private url = 'https://dice.fm/bundles/coming-up-in-miami-an6x';

  constructor() {
    super('Dice.fm', { weight: 1.4, rateLimit: 2000 });
  }

  async scrape(): Promise<RawEvent[]> {
    this.log('Scraping Dice.fm Miami...');
    const $ = await this.fetchHTML(this.url);
    const events: RawEvent[] = [];

    // Parse event cards
    $('[data-testid="event-card"], .EventCard, a[href*="/event/"]').each((_, el) => {
      try {
        const $el = $(el);
        const title = this.cleanText($el.find('[class*="title"], h3, h4').first().text());
        const venue = this.cleanText($el.find('[class*="venue"], [class*="location"]').first().text());
        const dateText = this.cleanText($el.find('[class*="date"], time').first().text());
        const priceText = $el.find('[class*="price"]').first().text();
        const link = $el.attr('href') || $el.find('a').attr('href');

        if (!title || title.length < 3) return;

        const startAt = this.parseFlexibleDate(dateText);
        if (!startAt) return;

        events.push({
          title,
          startAt,
          timezone: 'America/New_York',
          venueName: venue || 'TBA',
          neighborhood: this.inferNeighborhood(venue),
          city: 'Miami',
          description: `${title} at ${venue}. Tickets on Dice.fm.`,
          category: this.categorize(title, ''),
          tags: ['live-music', 'nightlife'],
          priceMin: this.parsePrice(priceText),
          isOutdoor: false,
          sourceName: this.sourceName,
          sourceUrl: link ? `https://dice.fm${link}` : this.url,
        });
      } catch (e) { /* skip */ }
    });

    this.log(`Found ${events.length} Dice.fm events`);
    return events;
  }

  private parseFlexibleDate(text: string): string | null {
    if (!text) return null;
    const match = text.match(/(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i);
    if (match) {
      const day = match[1].padStart(2, '0');
      const monthMap: Record<string, string> = {
        jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
        jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
      };
      const month = monthMap[match[2].toLowerCase()];
      const year = new Date().getFullYear();
      return `${year}-${month}-${day}T21:00:00`;
    }
    return null;
  }

  private inferNeighborhood(venue: string): string {
    const v = venue.toLowerCase();
    if (v.includes('wynwood') || v.includes('do not sit')) return 'Wynwood';
    if (v.includes('space') || v.includes('ground')) return 'Downtown';
    if (v.includes('floyd') || v.includes('jolene')) return 'Wynwood';
    if (v.includes('beach')) return 'Miami Beach';
    return 'Miami';
  }

  private parsePrice(text: string): number {
    const match = text.match(/\$?([\d.]+)/);
    return match ? parseFloat(match[1]) : 0;
  }
}

// === MIAMI IMPROV ===
export class MiamiImprovRealScraper extends BaseScraper {
  private url = 'https://www.miamiimprov.com/events';

  constructor() {
    super('Miami Improv', { weight: 1.3, rateLimit: 2000 });
  }

  async scrape(): Promise<RawEvent[]> {
    this.log('Scraping Miami Improv...');
    const $ = await this.fetchHTML(this.url);
    const events: RawEvent[] = [];

    // JSON-LD has Place with Events array
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const data = JSON.parse($(el).html() || '');
        // Handle Place with Events array
        if (data.Events && Array.isArray(data.Events)) {
          for (const evt of data.Events) {
            if (evt.name && evt.startDate && !evt.name.toLowerCase().includes('closed')) {
              events.push(this.parseJsonLd(evt));
            }
          }
        }
        // Handle direct Event
        if (data['@type'] === 'Event' && data.name) {
          events.push(this.parseJsonLd(data));
        }
      } catch { /* skip */ }
    });

    this.log(`Found ${events.length} Miami Improv events`);
    return events;
  }

  private parseJsonLd(data: any): RawEvent {
    return {
      title: this.cleanText(data.name),
      startAt: data.startDate?.replace('Z', ''),
      timezone: 'America/New_York',
      venueName: 'Miami Improv',
      address: '3450 NW 83rd Ave #224, Doral, FL 33166',
      neighborhood: 'Doral',
      city: 'Miami',
      description: `${data.name} at Miami Improv. 21+ with two-drink minimum.`,
      category: 'Comedy',
      tags: ['comedy', 'live-entertainment'],
      priceMin: data.offers?.price,
      isOutdoor: false,
      sourceName: this.sourceName,
      sourceUrl: data.url || this.url,
    };
  }
}

// === FORT LAUDERDALE IMPROV ===
export class FortLauderdaleImprovScraper extends BaseScraper {
  private url = 'https://www.improvftl.com/events';

  constructor() {
    super('Fort Lauderdale Improv', { weight: 1.3, rateLimit: 2000 });
  }

  async scrape(): Promise<RawEvent[]> {
    this.log('Scraping Fort Lauderdale Improv...');
    const $ = await this.fetchHTML(this.url);
    const events: RawEvent[] = [];

    // JSON-LD has Place with Events array
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const data = JSON.parse($(el).html() || '');
        if (data.Events && Array.isArray(data.Events)) {
          for (const evt of data.Events) {
            if (evt.name && evt.startDate && !evt.name.toLowerCase().includes('closed')) {
              events.push({
                title: this.cleanText(evt.name),
                startAt: evt.startDate?.replace('Z', ''),
                timezone: 'America/New_York',
                venueName: 'Fort Lauderdale Improv',
                address: '5700 Seminole Way, Hollywood, FL 33314',
                neighborhood: 'Hollywood',
                city: 'Fort Lauderdale',
                description: `${evt.name} at Fort Lauderdale Improv. 21+ with two-drink minimum.`,
                category: 'Comedy',
                tags: ['comedy', 'live-entertainment'],
                priceMin: evt.offers?.price,
                isOutdoor: false,
                sourceName: this.sourceName,
                sourceUrl: evt.url || this.url,
              });
            }
          }
        }
      } catch { /* skip */ }
    });

    this.log(`Found ${events.length} FTL Improv events`);
    return events;
  }
}

// === BROWARD CENTER ===
export class BrowardCenterScraper extends BaseScraper {
  private baseUrl = 'https://www.browardcenter.org/events';

  constructor() {
    super('Broward Center', { weight: 1.4, rateLimit: 2000 });
  }

  async scrape(): Promise<RawEvent[]> {
    this.log('Scraping Broward Center...');
    const events: RawEvent[] = [];

    // Scrape first 3 pages
    for (let page = 1; page <= 3; page++) {
      try {
        const url = page === 1 ? this.baseUrl : `${this.baseUrl}?page=${page}`;
        const $ = await this.fetchHTML(url);

        $('.event-card, .event-listing, [class*="event-item"]').each((_, el) => {
          try {
            const $el = $(el);
            const title = this.cleanText($el.find('h2, h3, .title').first().text());
            const venue = this.cleanText($el.find('.venue, .location').first().text()) || 'Broward Center';
            const dateText = $el.find('.date, time, .event-date').first().text();
            const link = $el.find('a').attr('href');

            if (!title || title.length < 3) return;

            const startAt = this.parseEventDate(dateText);

            events.push({
              title,
              startAt,
              timezone: 'America/New_York',
              venueName: this.normalizeVenue(venue),
              address: this.getVenueAddress(venue),
              neighborhood: 'Fort Lauderdale',
              city: 'Fort Lauderdale',
              description: `${title} at ${venue}.`,
              category: this.categorize(title, ''),
              tags: ['live-entertainment', 'performing-arts'],
              isOutdoor: false,
              sourceName: this.sourceName,
              sourceUrl: link ? `https://www.browardcenter.org${link}` : this.baseUrl,
            });
          } catch { /* skip */ }
        });

        this.log(`Page ${page}: found events`);
      } catch (e) {
        this.logError(`Failed page ${page}`, e);
      }
    }

    this.log(`Total ${events.length} Broward Center events`);
    return events;
  }

  private parseEventDate(text: string): string {
    const match = text.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2})/i);
    if (match) {
      const monthMap: Record<string, string> = {
        jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
        jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
      };
      const month = monthMap[match[1].toLowerCase()];
      const day = match[2].padStart(2, '0');
      const year = new Date().getFullYear();
      return `${year}-${month}-${day}T20:00:00`;
    }
    return format(new Date(), "yyyy-MM-dd'T'20:00:00");
  }

  private normalizeVenue(venue: string): string {
    if (venue.toLowerCase().includes('parker')) return 'The Parker';
    if (venue.toLowerCase().includes('aventura')) return 'Aventura Arts & Cultural Center';
    if (venue.toLowerCase().includes('miniaci')) return 'Rose & Alfred Miniaci PAC';
    return 'Broward Center for the Performing Arts';
  }

  private getVenueAddress(venue: string): string {
    if (venue.toLowerCase().includes('parker')) return '707 NE 8th St, Fort Lauderdale, FL 33304';
    if (venue.toLowerCase().includes('aventura')) return '3385 NE 188th St, Aventura, FL 33180';
    return '201 SW 5th Ave, Fort Lauderdale, FL 33312';
  }
}

// === CORAL GABLES CITY ===
export class CoralGablesScraper extends BaseScraper {
  private url = 'https://www.coralgables.com/events';

  constructor() {
    super('Coral Gables', { weight: 1.2, rateLimit: 2000 });
  }

  async scrape(): Promise<RawEvent[]> {
    this.log('Scraping Coral Gables events...');
    const $ = await this.fetchHTML(this.url);
    const events: RawEvent[] = [];

    $('.event-item, .calendar-event, tr, [class*="event"]').each((_, el) => {
      try {
        const $el = $(el);
        const title = this.cleanText($el.find('a, .title, h3').first().text());
        const dateText = $el.find('.date, time, td').first().text();
        const venue = $el.find('.venue, .location').first().text() || '';

        if (!title || title.length < 5) return;
        if (title.toLowerCase().includes('advisory') || title.toLowerCase().includes('committee')) return;

        const startAt = this.parseCityDate(dateText);
        if (!startAt) return;

        events.push({
          title,
          startAt,
          timezone: 'America/New_York',
          venueName: venue || 'Coral Gables',
          neighborhood: 'Coral Gables',
          city: 'Miami',
          description: `${title} - City of Coral Gables event.`,
          category: this.categorize(title, ''),
          tags: ['community', 'local-favorite'],
          isOutdoor: title.toLowerCase().includes('park') || title.toLowerCase().includes('market'),
          sourceName: this.sourceName,
          sourceUrl: this.url,
        });
      } catch { /* skip */ }
    });

    this.log(`Found ${events.length} Coral Gables events`);
    return events;
  }

  private parseCityDate(text: string): string | null {
    const match = text.match(/(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s*(\d{4})?/i);
    if (match) {
      const monthMap: Record<string, string> = {
        january: '01', february: '02', march: '03', april: '04', may: '05', june: '06',
        july: '07', august: '08', september: '09', october: '10', november: '11', december: '12'
      };
      const month = monthMap[match[1].toLowerCase()];
      const day = match[2].padStart(2, '0');
      const year = match[3] || new Date().getFullYear();
      return `${year}-${month}-${day}T18:00:00`;
    }
    return null;
  }
}
