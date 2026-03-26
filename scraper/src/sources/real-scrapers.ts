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
          venueName: venue || 'TBA',
          neighborhood: this.inferNeighborhood(venue),
          city: 'Miami',
          description: `${title} at ${venue}. Tickets on Dice.fm.`,
          category: this.categorize(title, ''),
          tags: ['live-music', 'nightlife'],
          priceAmount: this.parsePriceAmount(priceText),
          isOutdoor: false,
          sourceName: this.name,
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

  private parsePriceAmount(text: string): number {
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

    // Strategy 1: JSON-LD with Place.Events array
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
        // Handle @graph array (common in newer schemas)
        if (data['@graph'] && Array.isArray(data['@graph'])) {
          for (const item of data['@graph']) {
            if (item['@type'] === 'Event' && item.name && item.startDate) {
              events.push(this.parseJsonLd(item));
            }
          }
        }
        // Handle array of events at top level
        if (Array.isArray(data)) {
          for (const item of data) {
            if (item['@type'] === 'Event' && item.name && item.startDate) {
              events.push(this.parseJsonLd(item));
            }
          }
        }
      } catch { /* skip */ }
    });

    if (events.length > 0) {
      this.log(`Found ${events.length} Miami Improv events via JSON-LD`);
      return events;
    }

    // Strategy 2: HTML parsing with CSS selectors for improv.com patterns
    this.log('  JSON-LD returned 0 events, trying HTML selectors...');
    $(`.event-list .event-item, .show-listing, [data-event-id], .event-card, .show-card`).each((_, el) => {
      try {
        const $el = $(el);
        const title = this.cleanText($el.find('h2, h3, h4, .event-title, .show-title, .title').first().text());
        const dateText = this.cleanText($el.find('.date, time, .event-date, .show-date').first().text());
        const link = $el.find('a').attr('href') || $el.closest('a').attr('href') || '';

        if (!title || title.length < 3) return;

        const startAt = this.parseImprovDate(dateText);
        events.push(this.buildImprovEvent(title, startAt, link));
      } catch { /* skip */ }
    });

    if (events.length > 0) {
      this.log(`Found ${events.length} Miami Improv events via HTML selectors`);
      return events;
    }

    // Strategy 3: Find links containing "/event/" or "/show/"
    this.log('  HTML selectors returned 0 events, trying link-based parsing...');
    const seen = new Set<string>();
    $('a[href*="/event/"], a[href*="/show/"]').each((_, el) => {
      try {
        const $el = $(el);
        const title = this.cleanText($el.text());
        const link = $el.attr('href') || '';

        if (!title || title.length < 3 || seen.has(title.toLowerCase())) return;
        seen.add(title.toLowerCase());

        const $parent = $el.closest('div, li, article, section');
        const dateText = this.cleanText($parent.find('.date, time, [class*="date"]').first().text());
        const startAt = this.parseImprovDate(dateText);
        events.push(this.buildImprovEvent(title, startAt, link));
      } catch { /* skip */ }
    });

    this.log(`Found ${events.length} Miami Improv events`);
    return events;
  }

  private parseImprovDate(text: string): string {
    if (!text) return this.defaultImprovDate();
    const match = text.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+(\d{1,2})/i);
    if (match) {
      const monthMap: Record<string, string> = {
        jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
        jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
      };
      const month = monthMap[match[1].toLowerCase().slice(0, 3)];
      const day = match[2].padStart(2, '0');
      const year = new Date().getFullYear();
      return `${year}-${month}-${day}T20:00:00`;
    }
    return this.defaultImprovDate();
  }

  private defaultImprovDate(): string {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T20:00:00`;
  }

  private buildImprovEvent(title: string, startAt: string, link: string): RawEvent {
    const url = link.startsWith('http') ? link : link ? `https://www.miamiimprov.com${link}` : this.url;
    return {
      title,
      startAt,
      venueName: 'Miami Improv',
      address: '3450 NW 83rd Ave #224, Doral, FL 33166',
      neighborhood: 'Doral',
      city: 'Miami',
      description: `${title} at Miami Improv. 21+ with two-drink minimum.`,
      category: 'Comedy',
      tags: ['comedy', 'live-entertainment'],
      isOutdoor: false,
      sourceName: this.name,
      sourceUrl: url,
    };
  }

  private parseJsonLd(data: any): RawEvent {
    return {
      title: this.cleanText(data.name),
      startAt: data.startDate?.replace('Z', ''),
      venueName: 'Miami Improv',
      address: '3450 NW 83rd Ave #224, Doral, FL 33166',
      neighborhood: 'Doral',
      city: 'Miami',
      description: `${data.name} at Miami Improv. 21+ with two-drink minimum.`,
      category: 'Comedy',
      tags: ['comedy', 'live-entertainment'],
      priceAmount: data.offers?.price,
      isOutdoor: false,
      sourceName: this.name,
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

    // Strategy 1: JSON-LD parsing with multiple structure support
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const data = JSON.parse($(el).html() || '');
        // Handle Place with Events array
        if (data.Events && Array.isArray(data.Events)) {
          for (const evt of data.Events) {
            if (evt.name && evt.startDate && !evt.name.toLowerCase().includes('closed')) {
              events.push(this.buildFtlEvent(evt));
            }
          }
        }
        // Handle direct Event
        if (data['@type'] === 'Event' && data.name && data.startDate) {
          events.push(this.buildFtlEvent(data));
        }
        // Handle @graph array (common in newer schemas)
        if (data['@graph'] && Array.isArray(data['@graph'])) {
          for (const item of data['@graph']) {
            if (item['@type'] === 'Event' && item.name && item.startDate) {
              events.push(this.buildFtlEvent(item));
            }
          }
        }
        // Handle top-level array of events
        if (Array.isArray(data)) {
          for (const item of data) {
            if (item['@type'] === 'Event' && item.name && item.startDate) {
              events.push(this.buildFtlEvent(item));
            }
          }
        }
      } catch { /* skip */ }
    });

    if (events.length > 0) {
      this.log(`Found ${events.length} FTL Improv events via JSON-LD`);
      return events;
    }

    // Strategy 2: HTML parsing with CSS selectors for improv.com patterns
    this.log('  JSON-LD returned 0 events, trying HTML selectors...');
    $(`.event-list .event-item, .show-listing, [data-event-id], .event-card, .show-card`).each((_, el) => {
      try {
        const $el = $(el);
        const title = this.cleanText($el.find('h2, h3, h4, .event-title, .show-title, .title').first().text());
        const dateText = this.cleanText($el.find('.date, time, .event-date, .show-date').first().text());
        const link = $el.find('a').attr('href') || $el.closest('a').attr('href') || '';

        if (!title || title.length < 3) return;

        const startAt = this.parseFtlDate(dateText);
        events.push(this.buildFtlEvent({ name: title, startDate: startAt, url: link.startsWith('http') ? link : link ? `https://www.improvftl.com${link}` : undefined }));
      } catch { /* skip */ }
    });

    if (events.length > 0) {
      this.log(`Found ${events.length} FTL Improv events via HTML selectors`);
      return events;
    }

    // Strategy 3: Find links containing "/event/" or "/show/"
    this.log('  HTML selectors returned 0 events, trying link-based parsing...');
    const seen = new Set<string>();
    $('a[href*="/event/"], a[href*="/show/"]').each((_, el) => {
      try {
        const $el = $(el);
        const title = this.cleanText($el.text());
        const link = $el.attr('href') || '';

        if (!title || title.length < 3 || seen.has(title.toLowerCase())) return;
        seen.add(title.toLowerCase());

        const $parent = $el.closest('div, li, article, section');
        const dateText = this.cleanText($parent.find('.date, time, [class*="date"]').first().text());
        const startAt = this.parseFtlDate(dateText);
        events.push(this.buildFtlEvent({ name: title, startDate: startAt, url: link.startsWith('http') ? link : `https://www.improvftl.com${link}` }));
      } catch { /* skip */ }
    });

    this.log(`Found ${events.length} FTL Improv events`);
    return events;
  }

  private parseFtlDate(text: string): string {
    if (!text) return this.defaultFtlDate();
    const match = text.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+(\d{1,2})/i);
    if (match) {
      const monthMap: Record<string, string> = {
        jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
        jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
      };
      const month = monthMap[match[1].toLowerCase().slice(0, 3)];
      const day = match[2].padStart(2, '0');
      const year = new Date().getFullYear();
      return `${year}-${month}-${day}T20:00:00`;
    }
    return this.defaultFtlDate();
  }

  private defaultFtlDate(): string {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T20:00:00`;
  }

  private buildFtlEvent(evt: any): RawEvent {
    return {
      title: this.cleanText(evt.name),
      startAt: evt.startDate?.replace('Z', ''),
      venueName: 'Fort Lauderdale Improv',
      address: '5700 Seminole Way, Hollywood, FL 33314',
      neighborhood: 'Hollywood',
      city: 'Fort Lauderdale',
      description: `${evt.name} at Fort Lauderdale Improv. 21+ with two-drink minimum.`,
      category: 'Comedy',
      tags: ['comedy', 'live-entertainment'],
      priceAmount: evt.offers?.price,
      isOutdoor: false,
      sourceName: this.name,
      sourceUrl: evt.url || this.url,
    };
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
    const seen = new Set<string>();

    try {
      const $ = await this.fetchHTML(this.baseUrl);
      const html = $.html();
      this.log(`  HTML length: ${html.length} chars`);
      this.log(`  First 500 chars: ${html.slice(0, 500).replace(/\n/g, ' ')}`);

      // Strategy 1: Parse m-event-* class pattern elements
      $('[class*="m-event"]').each((_, el) => {
        try {
          const $el = $(el);
          // Find parent container or sibling elements for full event data
          const $container = $el.closest('[class*="event"]') || $el.parent();

          const dateText = this.cleanText($container.find('[class*="m-event-date"], .m-event-date').first().text() || $el.text());
          const venue = this.cleanText($container.find('[class*="m-event-venue"], .m-event-venue').first().text());
          const link = $container.find('[class*="m-event-mobile-link"] a, a[href*="/show/"]').first().attr('href')
            || $container.find('a').first().attr('href');
          const title = this.cleanText(
            $container.find('[class*="m-event-mobile-link"] a, a[href*="/show/"]').first().text()
            || $container.find('h2, h3, h4, .title').first().text()
          );

          if (!title || title.length < 3 || seen.has(title.toLowerCase())) return;
          seen.add(title.toLowerCase());

          const startAt = this.parseEventDate(dateText);

          events.push({
            title,
            startAt,
            venueName: this.normalizeVenue(venue || 'Broward Center'),
            address: this.getVenueAddress(venue || ''),
            neighborhood: 'Downtown FLL',
            lat: 26.1185,
            lng: -80.1439,
            city: 'Fort Lauderdale',
            description: `${title} at ${venue || 'Broward Center'}.`,
            category: this.categorize(title, ''),
            tags: ['live-entertainment', 'performing-arts'],
            isOutdoor: false,
            sourceName: this.name,
            sourceUrl: link ? (link.startsWith('http') ? link : `https://www.browardcenter.org${link}`) : this.baseUrl,
          });
        } catch { /* skip */ }
      });

      // Strategy 2: Parse show links if Strategy 1 found nothing
      if (events.length === 0) {
        $('a[href*="/show/"]').each((_, el) => {
          try {
            const $el = $(el);
            const title = this.cleanText($el.text());
            const link = $el.attr('href') || '';

            if (!title || title.length < 3 || seen.has(title.toLowerCase())) return;
            seen.add(title.toLowerCase());

            // Look for nearby date text
            const $parent = $el.closest('div, li, article, tr');
            const dateText = this.cleanText($parent.find('[class*="date"], time').first().text() || '');
            const venue = this.cleanText($parent.find('[class*="venue"]').first().text());
            const startAt = this.parseEventDate(dateText);

            events.push({
              title,
              startAt,
              venueName: this.normalizeVenue(venue || 'Broward Center'),
              address: this.getVenueAddress(venue || ''),
              neighborhood: 'Downtown FLL',
              lat: 26.1185,
              lng: -80.1439,
              city: 'Fort Lauderdale',
              description: `${title} at Broward Center.`,
              category: this.categorize(title, ''),
              tags: ['live-entertainment', 'performing-arts'],
              isOutdoor: false,
              sourceName: this.name,
              sourceUrl: link.startsWith('http') ? link : `https://www.browardcenter.org${link}`,
            });
          } catch { /* skip */ }
        });
      }

      // Strategy 3: Generic fallback with original selectors
      if (events.length === 0) {
        $('.event-card, .event-listing, [class*="event-item"]').each((_, el) => {
          try {
            const $el = $(el);
            const title = this.cleanText($el.find('h2, h3, .title').first().text());
            const venue = this.cleanText($el.find('.venue, .location').first().text()) || 'Broward Center';
            const dateText = $el.find('.date, time, .event-date').first().text();
            const link = $el.find('a').attr('href');

            if (!title || title.length < 3 || seen.has(title.toLowerCase())) return;
            seen.add(title.toLowerCase());

            const startAt = this.parseEventDate(dateText);

            events.push({
              title,
              startAt,
              venueName: this.normalizeVenue(venue),
              address: this.getVenueAddress(venue),
              neighborhood: 'Downtown FLL',
              lat: 26.1185,
              lng: -80.1439,
              city: 'Fort Lauderdale',
              description: `${title} at ${venue}.`,
              category: this.categorize(title, ''),
              tags: ['live-entertainment', 'performing-arts'],
              isOutdoor: false,
              sourceName: this.name,
              sourceUrl: link ? `https://www.browardcenter.org${link}` : this.baseUrl,
            });
          } catch { /* skip */ }
        });
      }

      // Strategy 4: JSON-LD structured data (server-rendered pages may include it)
      if (events.length === 0) {
        this.log('  Trying JSON-LD structured data...');
        $('script[type="application/ld+json"]').each((_, el) => {
          try {
            const data = JSON.parse($(el).html() || '');
            const items: any[] = [];

            // Direct Event
            if (data['@type'] === 'Event') items.push(data);
            // ItemList
            if (data['@type'] === 'ItemList' && data.itemListElement) {
              for (const li of data.itemListElement) {
                const item = li.item || li;
                if (item['@type'] === 'Event') items.push(item);
              }
            }
            // @graph array
            if (data['@graph'] && Array.isArray(data['@graph'])) {
              for (const item of data['@graph']) {
                if (item['@type'] === 'Event') items.push(item);
              }
            }
            // Top-level array
            if (Array.isArray(data)) {
              for (const item of data) {
                if (item['@type'] === 'Event') items.push(item);
              }
            }

            for (const item of items) {
              if (!item.name || seen.has(item.name.toLowerCase())) continue;
              seen.add(item.name.toLowerCase());

              const venue = item.location?.name || 'Broward Center';
              const startAt = item.startDate
                ? item.startDate.replace('Z', '').replace(/\.\d+$/, '')
                : this.parseEventDate('');

              events.push({
                title: this.cleanText(item.name),
                startAt,
                venueName: this.normalizeVenue(venue),
                address: item.location?.address?.streetAddress || this.getVenueAddress(venue),
                neighborhood: 'Downtown FLL',
                lat: 26.1185,
                lng: -80.1439,
                city: 'Fort Lauderdale',
                description: item.description || `${item.name} at ${venue}.`,
                category: this.categorize(item.name, item.description || ''),
                tags: ['live-entertainment', 'performing-arts'],
                isOutdoor: false,
                sourceName: this.name,
                sourceUrl: item.url || this.baseUrl,
                image: typeof item.image === 'string' ? item.image : item.image?.url,
              });
            }
          } catch { /* skip */ }
        });
        if (events.length > 0) {
          this.log(`  Found ${events.length} events via JSON-LD`);
        }
      }
    } catch (e) {
      this.logError('Failed to scrape Broward Center', e);
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
  private baseUrl = 'https://www.coralgables.com';
  private calendarUrl = `${this.baseUrl}/events-calendar`;

  constructor() {
    super('Coral Gables', { weight: 1.2, rateLimit: 1000 });
  }

  async scrape(): Promise<RawEvent[]> {
    this.log('Scraping Coral Gables events...');
    const $ = await this.fetchHTML(this.calendarUrl);
    const eventLinks: string[] = [];

    // Collect event URLs from cards
    $('.card[about*="/events/"]').each((_, el) => {
      const link = $(el).attr('about') || $(el).find('a').attr('href');
      if (link && link.startsWith('/events/')) {
        eventLinks.push(link);
      }
    });

    this.log(`Found ${eventLinks.length} event links, fetching details...`);

    // Fetch each event detail page
    const events: RawEvent[] = [];
    for (const link of eventLinks) {
      try {
        const event = await this.scrapeEventPage(link);
        if (event) events.push(event);
        await this.delay(500);
      } catch (error) {
        this.logError(`Failed to scrape ${link}`, error);
      }
    }

    this.log(`Scraped ${events.length} events with full details`);
    return events;
  }

  private async scrapeEventPage(link: string): Promise<RawEvent | null> {
    const url = `${this.baseUrl}${link}`;
    const $ = await this.fetchHTML(url);

    // Get title - skip "Search" headers, get the actual event title
    let title = '';
    $('h1.heading--title').each((_, el) => {
      const text = this.cleanText($(el).text());
      if (text && text.toLowerCase() !== 'search' && text.length > 3) {
        title = text;
      }
    });
    if (!title || title.length < 5) return null;

    // Get location from the page - look for address pattern
    const pageText = $('body').text();

    // Extract from Google Calendar link which has structured data
    const calLink = $('a[href*="calendar.google.com"]').attr('href') || '';
    const locationMatch = calLink.match(/location=([^&]+)/);
    let venueName: string | undefined;
    let address: string | undefined;

    if (locationMatch) {
      const locationStr = decodeURIComponent(locationMatch[1]);
      // Format: "Venue Name Address, City, State ZIP"
      const parts = locationStr.split(/\s+(?=\d)/);
      if (parts.length >= 1) {
        venueName = this.cleanText(parts[0]);
        address = this.cleanText(parts.slice(0).join(' '));
      }
    }

    // Also try to find venue/address from page content
    if (!venueName) {
      const locationEl = $('.p-street-address, [class*="location"]').first();
      const locationText = this.cleanText(locationEl.text());
      if (locationText) {
        address = locationText;
        // Try to extract venue name from address
        const venueMatch = locationText.match(/^([^,]+)/);
        if (venueMatch && !/^\d/.test(venueMatch[1])) {
          venueName = venueMatch[1];
        }
      }
    }

    // Get date/time from calendar link
    let startAt = this.getNextWeekday();
    const datesMatch = calLink.match(/dates=(\d{8})t(\d{6})/i);
    if (datesMatch) {
      const dateStr = datesMatch[1];
      const timeStr = datesMatch[2];
      const year = dateStr.slice(0, 4);
      const month = dateStr.slice(4, 6);
      const day = dateStr.slice(6, 8);
      const hour = timeStr.slice(0, 2);
      const min = timeStr.slice(2, 4);
      startAt = `${year}-${month}-${day}T${hour}:${min}:00`;
    }

    // Get description from details section or calendar link
    let description: string | undefined;
    const detailsMatch = calLink.match(/details=([^&]+)/);
    if (detailsMatch) {
      description = decodeURIComponent(detailsMatch[1]).replace(/\+/g, ' ');
    }
    if (!description || description.length < 20) {
      description = this.cleanText($('.event-description, .field--body, article p').first().text());
    }
    if (!description) {
      description = `${title} in Coral Gables`;
    }

    const category = this.categorize(title, description);
    const tags = this.generateTags(title, description, category);

    return {
      title,
      startAt,
      venueName,
      address,
      neighborhood: 'Coral Gables',
      city: 'Miami',
      description,
      category,
      tags: [...tags, 'community'],
      isOutdoor: /plaza|park|outdoor|circle/i.test(`${title} ${description} ${venueName || ''}`),
      sourceName: this.name,
      sourceUrl: url,
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private getNextWeekday(): string {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return format(d, "yyyy-MM-dd'T'18:00:00");
  }
}
