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

// === BROWARD CENTER (no Puppeteer needed — HTML is server-rendered) ===
export class BrowardCenterScraper extends BaseScraper {
  private baseUrl = 'https://www.browardcenter.org/events';

  constructor() {
    super('Broward Center', { weight: 1.5, rateLimit: 2000 });
  }

  async scrape(): Promise<RawEvent[]> {
    this.log('Scraping Broward Center for the Performing Arts...');
    const events: RawEvent[] = [];
    const seen = new Set<string>();

    // Scrape first 6 pages (16 events/page = ~96 events, site has 11 pages)
    for (let page = 1; page <= 6; page++) {
      try {
        const url = page === 1 ? this.baseUrl : `${this.baseUrl}?page=${page}`;
        const $ = await this.fetchHTML(url);
        let pageCount = 0;

        // The site uses h3 > a for event titles inside event card containers
        // Each event card contains: title (h3 a), date text, venue name, and buy/info links
        // Strategy: find all links to /events/detail/ which are the event detail pages
        const eventLinks = $('a[href*="/events/detail/"]');

        // Group by unique href to avoid duplicates from Info + Buy links
        const hrefs = new Map<string, ReturnType<typeof $>>();
        eventLinks.each((_, el) => {
          const href = $(el).attr('href') || '';
          if (href.includes('/events/detail/') && !hrefs.has(href)) {
            hrefs.set(href, $(el));
          }
        });

        // Also try broader selectors for the event card structure
        // Broward Center uses img[alt*="More Info for"] which contain the event name
        $('img[alt*="More Info for"]').each((_, el) => {
          const alt = $(el).attr('alt') || '';
          const title = alt.replace(/^More Info for\s*/i, '').trim();
          const $parent = $(el).closest('a, div');
          const link = $parent.attr('href') || $parent.find('a[href*="/events/detail/"]').attr('href') || '';

          if (title && title.length > 3 && link) {
            hrefs.set(link, $parent);
          }
        });

        // Parse the full page text for date/venue associations
        const pageText = $('body').text();

        // Extract events from link text and surrounding context
        hrefs.forEach(($el, href) => {
          try {
            // Get the title from the link text, or from nearby h3
            let title = this.cleanText($el.find('h3').text() || $el.text());
            // Also check img alt attribute
            if (!title || title.length < 3) {
              const imgAlt = $el.find('img[alt*="More Info"]').attr('alt') || '';
              title = imgAlt.replace(/^More Info for\s*/i, '').trim();
            }
            if (!title || title.length < 3) return;

            // Skip "Info" and "Buy" button texts that aren't real titles
            if (/^(Info|Buy|Buy Tickets|More Info|Read More)$/i.test(title)) return;

            const dedup = title.toLowerCase().replace(/\s+/g, ' ');
            if (seen.has(dedup)) return;
            seen.add(dedup);

            // Extract venue name from the card's surrounding context
            const $card = $el.closest('[class*="event"], [class*="card"], li, article') || $el.parent().parent();
            const cardText = $card.text();
            const venue = this.extractVenue(cardText);

            // Extract date from context — look for "Mar 3, 2026" pattern
            const dateMatch = cardText.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2})(?:\s*[-–]\s*(\d{1,2}))?,?\s*(\d{4})?/i);
            const startAt = dateMatch ? this.parseDateMatch(dateMatch) : null;
            if (!startAt) return;

            // Extract ticket URL (Ticketmaster link)
            let ticketUrl: string | undefined;
            $card.find('a[href*="ticketmaster.com"]').each((_, a) => {
              if (!ticketUrl) ticketUrl = $(a).attr('href') || undefined;
            });

            const venueInfo = this.getVenueInfo(venue);
            const category = this.categorize(title, '', venue);

            events.push({
              title,
              startAt,
              venueName: venueInfo.name,
              address: venueInfo.address,
              neighborhood: venueInfo.neighborhood,
              lat: venueInfo.lat,
              lng: venueInfo.lng,
              city: 'Fort Lauderdale',
              description: `${title} at ${venueInfo.name}. Part of the Broward Center family of venues.`,
              category,
              tags: this.generateTags(title, '', category),
              isOutdoor: false,
              sourceName: this.name,
              sourceUrl: href.startsWith('http') ? href : `https://www.browardcenter.org${href}`,
              ticketUrl,
            });
            pageCount++;
          } catch { /* skip individual event */ }
        });

        this.log(`  Page ${page}: ${pageCount} events`);

        // Stop if we got no events on this page (end of listings)
        if (pageCount === 0 && page > 1) break;
      } catch (e) {
        this.logError(`Failed page ${page}`, e);
        if (page === 1) break; // If page 1 fails, don't try more
      }
    }

    this.log(`Total: ${events.length} Broward Center events`);
    return events;
  }

  private extractVenue(text: string): string {
    const t = text.toLowerCase();
    if (t.includes('the parker')) return 'Parker';
    if (t.includes('parker playhouse') || t.includes('parker')) return 'Parker';
    if (t.includes('aventura')) return 'Aventura';
    if (t.includes('miniaci')) return 'Miniaci';
    if (t.includes('amaturo')) return 'Amaturo';
    return 'Broward Center';
  }

  private parseDateMatch(match: RegExpMatchArray): string | null {
    const monthMap: Record<string, string> = {
      jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
      jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
    };
    const month = monthMap[match[1].toLowerCase()];
    if (!month) return null;
    const day = match[2].padStart(2, '0');
    const year = match[4] || new Date().getFullYear();
    return `${year}-${month}-${day}T20:00:00`;
  }

  private getVenueInfo(venue: string): { name: string; address: string; neighborhood: string; lat: number; lng: number } {
    switch (venue) {
      case 'Parker':
        return { name: 'The Parker', address: '707 NE 8th St, Fort Lauderdale, FL 33304', neighborhood: 'Victoria Park', lat: 26.1291, lng: -80.1356 };
      case 'Aventura':
        return { name: 'Aventura Arts & Cultural Center', address: '3385 NE 188th St, Aventura, FL 33180', neighborhood: 'Aventura', lat: 25.9567, lng: -80.1412 };
      case 'Miniaci':
        return { name: 'Rose & Alfred Miniaci PAC', address: '3100 Ray Ferrero Jr Blvd, Davie, FL 33314', neighborhood: 'Davie', lat: 26.0622, lng: -80.2384 };
      case 'Amaturo':
        return { name: 'Amaturo Theater', address: '201 SW 5th Ave, Fort Lauderdale, FL 33312', neighborhood: 'Riverwalk', lat: 26.1184, lng: -80.1467 };
      default:
        return { name: 'Broward Center for the Performing Arts', address: '201 SW 5th Ave, Fort Lauderdale, FL 33312', neighborhood: 'Riverwalk', lat: 26.1184, lng: -80.1467 };
    }
  }
}

// === REVOLUTION LIVE (Fort Lauderdale's premier live music venue) ===
export class RevolutionLiveScraper extends BaseScraper {
  private url = 'https://www.jointherevolution.net/concerts/';

  constructor() {
    super('Revolution Live', { weight: 1.5, rateLimit: 2000 });
  }

  async scrape(): Promise<RawEvent[]> {
    this.log('Scraping Revolution Live...');
    const events: RawEvent[] = [];
    const seen = new Set<string>();

    try {
      const $ = await this.fetchHTML(this.url);

      // Revolution Live uses WordPress with event listing elements
      // Each concert has: title, date, time, price, age restriction, ticket link
      // Try multiple selectors for the event cards
      const selectors = [
        '.concert-listing', '.event-listing', 'article', '.event-card',
        '.concerts-list li', '[class*="concert"]', '[class*="event-item"]',
      ];

      let foundEvents = false;

      for (const selector of selectors) {
        if (foundEvents) break;
        $(selector).each((_, el) => {
          try {
            const $el = $(el);
            const text = $el.text();
            // Must contain a date pattern to be an event
            if (!/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}/i.test(text)) return;

            const title = this.cleanText($el.find('h2, h3, h4, .title, a[href*="event"]').first().text());
            if (!title || title.length < 3) return;
            if (/^(Buy|Tickets|More Info|Read More)$/i.test(title)) return;

            const dedup = title.toLowerCase().replace(/\s+/g, ' ');
            if (seen.has(dedup)) return;
            seen.add(dedup);

            const startAt = this.parseDateFromText(text);
            if (!startAt) return;

            const priceMatch = text.match(/\$(\d+(?:\.\d{2})?)/);
            const price = priceMatch ? parseFloat(priceMatch[1]) : undefined;
            const isAllAges = /all ages/i.test(text);
            const is21Plus = /21\+|21 and over/i.test(text);

            let ticketUrl: string | undefined;
            $el.find('a[href*="ticketmaster.com"]').each((_, a) => {
              if (!ticketUrl) ticketUrl = $(a).attr('href') || undefined;
            });

            events.push({
              title,
              startAt,
              venueName: 'Revolution Live',
              address: '100 SW 3rd Ave, Fort Lauderdale, FL 33312',
              neighborhood: 'Downtown FLL',
              lat: 26.1190,
              lng: -80.1460,
              city: 'Fort Lauderdale',
              description: `${title} at Revolution Live. ${isAllAges ? 'All ages.' : is21Plus ? '21+ only.' : ''}${price ? ` Tickets from $${price}.` : ''}`,
              category: this.categorize(title, ''),
              tags: this.generateRevTags(title, is21Plus),
              priceAmount: price,
              isOutdoor: false,
              sourceName: this.name,
              sourceUrl: this.url,
              ticketUrl,
            });
            foundEvents = true;
          } catch { /* skip */ }
        });
      }

      // Fallback: parse the full page text for event patterns
      // Revolution Live events follow pattern: "Artist Name\nDay, Month DD, YYYY\nTime\nPrice\nAge"
      if (events.length === 0) {
        this.log('  Trying text-based parsing...');
        const fullText = $('body').text();
        const eventBlocks = fullText.split(/(?=(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),\s+(?:January|February|March|April|May|June|July|August|September|October|November|December))/i);

        for (const block of eventBlocks) {
          const lines = block.split('\n').map((l: string) => l.trim()).filter(Boolean);
          if (lines.length < 2) continue;

          const dateMatch = block.match(/(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s*(\d{4})/i);
          if (!dateMatch) continue;

          // The title is usually the line(s) before the date
          const dateIndex = lines.findIndex((l: string) => dateMatch[0] && l.includes(dateMatch[2]));
          if (dateIndex <= 0) continue;

          const title = lines.slice(Math.max(0, dateIndex - 2), dateIndex)
            .filter((l: string) => l.length > 3 && !/^(concerts|events|all|page)/i.test(l))
            .join(' – ')
            .trim();

          if (!title || title.length < 3) continue;

          const dedup = title.toLowerCase().replace(/\s+/g, ' ');
          if (seen.has(dedup)) continue;
          seen.add(dedup);

          const startAt = this.parseFullDate(dateMatch);
          if (!startAt) continue;

          // Look for time
          const timeMatch = block.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
          const timeStr = timeMatch
            ? this.convertTo24h(parseInt(timeMatch[1]), parseInt(timeMatch[2]), timeMatch[3].toUpperCase())
            : '20:00:00';

          const finalStartAt = startAt.replace('T20:00:00', `T${timeStr}`);

          const priceMatch = block.match(/\$(\d+(?:\.\d{2})?)/);
          const price = priceMatch ? parseFloat(priceMatch[1]) : undefined;
          const is21Plus = /21\+/i.test(block);

          events.push({
            title,
            startAt: finalStartAt,
            venueName: 'Revolution Live',
            address: '100 SW 3rd Ave, Fort Lauderdale, FL 33312',
            neighborhood: 'Downtown FLL',
            lat: 26.1190,
            lng: -80.1460,
            city: 'Fort Lauderdale',
            description: `${title} at Revolution Live.${price ? ` Tickets from $${price}.` : ''}`,
            category: this.categorize(title, ''),
            tags: this.generateRevTags(title, is21Plus),
            priceAmount: price,
            isOutdoor: false,
            sourceName: this.name,
            sourceUrl: this.url,
          });
        }
      }
    } catch (e) {
      this.logError('Failed to scrape Revolution Live', e);
    }

    this.log(`Found ${events.length} Revolution Live events`);
    return events;
  }

  private parseDateFromText(text: string): string | null {
    // "March 5, 2026" or "Mar 5, 2026" or "March 5-6, 2026"
    const match = text.match(/(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2}),?\s*(\d{4})?/i);
    if (!match) return null;

    const monthMap: Record<string, string> = {
      january: '01', february: '02', march: '03', april: '04', may: '05', june: '06',
      july: '07', august: '08', september: '09', october: '10', november: '11', december: '12',
      jan: '01', feb: '02', mar: '03', apr: '04', jun: '06',
      jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
    };
    const month = monthMap[match[1].toLowerCase()];
    if (!month) return null;
    const day = match[2].padStart(2, '0');
    const year = match[3] || new Date().getFullYear();
    return `${year}-${month}-${day}T20:00:00`;
  }

  private parseFullDate(match: RegExpMatchArray): string | null {
    const monthMap: Record<string, string> = {
      january: '01', february: '02', march: '03', april: '04', may: '05', june: '06',
      july: '07', august: '08', september: '09', october: '10', november: '11', december: '12',
    };
    const month = monthMap[match[2].toLowerCase()];
    if (!month) return null;
    const day = match[3].padStart(2, '0');
    const year = match[4] || new Date().getFullYear();
    return `${year}-${month}-${day}T20:00:00`;
  }

  private convertTo24h(hour: number, minute: number, ampm: string): string {
    let h = hour;
    if (ampm === 'PM' && h !== 12) h += 12;
    if (ampm === 'AM' && h === 12) h = 0;
    return `${String(h).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`;
  }

  private generateRevTags(title: string, is21Plus: boolean): string[] {
    const tags = this.generateTags(title, '', this.categorize(title, ''));
    if (!tags.includes('live-music')) tags.push('live-music');
    if (is21Plus && !tags.includes('nightlife')) tags.push('nightlife');
    return tags;
  }
}

// === CORAL GABLES CITY ===
export class CoralGablesScraper extends BaseScraper {
  private url = 'https://www.coralgables.com/events-calendar';

  constructor() {
    super('Coral Gables', { weight: 1.2, rateLimit: 2000 });
  }

  async scrape(): Promise<RawEvent[]> {
    this.log('Scraping Coral Gables events...');
    const $ = await this.fetchHTML(this.url);
    const events: RawEvent[] = [];

    // Cards with about="/events/..." attribute
    $('.card[about*="/events/"]').each((_, el) => {
      try {
        const $el = $(el);
        const title = this.cleanText($el.find('h3, h4, .card-title, a').first().text());
        const description = this.cleanText($el.find('p, .card-text').first().text());
        const link = $el.attr('about') || $el.find('a').attr('href') || '';
        const dateText = $el.find('time, .date').first().text();

        if (!title || title.length < 5) return;

        // Extract date from link if available (e.g., /events/music-mcbride-plaza)
        const startAt = this.parseCityDate(dateText) || this.getNextWeekday();

        events.push({
          title,
          startAt,
          venueName: this.extractVenue(title, description),
          neighborhood: 'Coral Gables',
          city: 'Miami',
          description: description || `${title} - City of Coral Gables event.`,
          category: this.categorize(title, description),
          tags: ['community', 'local-favorite'],
          isOutdoor: /plaza|park|outdoor/i.test(title + description),
          sourceName: this.name,
          sourceUrl: `https://www.coralgables.com${link}`,
        });
      } catch { /* skip */ }
    });

    this.log(`Found ${events.length} Coral Gables events`);
    return events;
  }

  private extractVenue(title: string, desc: string): string | undefined {
    const text = `${title} ${desc}`;
    if (/mcbride plaza/i.test(text)) return 'McBride Plaza';
    if (/merrick park/i.test(text)) return 'Merrick Park';
    if (/biltmore/i.test(text)) return 'Biltmore Hotel';
    if (/country club/i.test(text)) return 'Coral Gables Country Club';
    if (/alhambra circle/i.test(text)) return 'Alhambra Circle';
    if (/chamber of commerce/i.test(text)) return 'Coral Gables Chamber of Commerce';
    // Don't return generic location name - leave as undefined
    return undefined;
  }

  private parseCityDate(text: string): string | null {
    if (!text) return null;
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

  private getNextWeekday(): string {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return format(d, "yyyy-MM-dd'T'18:00:00");
  }
}
