/**
 * Real Event Scrapers
 * Verified sources with actual calendar data
 */

import * as cheerio from 'cheerio';
import * as https from 'https';
import { addDays, format, parse } from 'date-fns';
import { BaseScraper } from './base.js';
import type { RawEvent } from '../types.js';

/**
 * Fetch HTML using Node.js built-in https module instead of undici-based fetch.
 * SeatEngine sites (miamiimprov.com, improvftl.com) reject connections from
 * Node.js native fetch (undici) due to TLS/SSL incompatibilities or IP-based
 * blocking heuristics. The built-in https module uses OpenSSL and behaves more
 * like a traditional browser HTTP stack.
 */
function httpsGet(url: string, timeoutMs = 15_000): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = https.get(
      url,
      {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'identity',
        },
        // Use a more permissive TLS configuration
        rejectUnauthorized: true,
        minVersion: 'TLSv1.2' as any,
      },
      (res) => {
        // Follow redirects (up to 3)
        if (
          res.statusCode &&
          res.statusCode >= 300 &&
          res.statusCode < 400 &&
          res.headers.location
        ) {
          req.destroy();
          httpsGet(res.headers.location, timeoutMs).then(resolve, reject);
          return;
        }

        if (res.statusCode && res.statusCode >= 400) {
          req.destroy();
          reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
          return;
        }

        const chunks: Buffer[] = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
        res.on('error', reject);
      },
    );

    req.setTimeout(timeoutMs, () => {
      req.destroy();
      reject(new Error('Request timed out'));
    });
    req.on('error', reject);
  });
}

/**
 * Fetch HTML via https module with retry logic for SeatEngine-based sites.
 */
async function fetchHTMLWithRetry(
  url: string,
  maxRetries = 3,
  log?: (msg: string) => void,
): Promise<cheerio.CheerioAPI> {
  let lastError: Error | undefined;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const html = await httpsGet(url);
      return cheerio.load(html);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000;
        log?.(`  Attempt ${attempt} failed (${lastError.message}), retrying in ${delay / 1000}s...`);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }
  throw lastError || new Error(`Failed to fetch ${url} after ${maxRetries} attempts`);
}

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
  // Primary domain first, then SeatEngine mirror as fallback (different IP/TLS config,
  // avoids GitHub Actions IP-blocking and undici TLS incompatibilities)
  private urls = [
    'https://www.miamiimprov.com/events',
    'https://www-miamiimprov-com.seatengine.com/events',
    'https://www.miamiimprov.com/calendar',
  ];

  constructor() {
    super('Miami Improv', { weight: 1.3, rateLimit: 2000 });
  }

  async scrape(): Promise<RawEvent[]> {
    this.log('Scraping Miami Improv...');
    const events: RawEvent[] = [];

    for (const url of this.urls) {
      try {
        // Use BaseScraper's native fetch with DNS fallback
        const $ = await this.fetchHTMLNativeRetry(url, 3, 15_000);

        // JSON-LD has Place with Events array
        $('script[type="application/ld+json"]').each((_, el) => {
          try {
            const data = JSON.parse($(el).html() || '');
            // Handle Place with Events array (SeatEngine uses capital "Events")
            if (data.Events && Array.isArray(data.Events)) {
              for (const evt of data.Events) {
                if (evt.name && evt.startDate && !evt.name.toLowerCase().includes('closed')) {
                  events.push(this.parseJsonLd(evt));
                }
              }
            }
            // Handle standard JSON-LD Event
            if (data['@type'] === 'Event' && data.name) {
              events.push(this.parseJsonLd(data));
            }
            // Handle lowercase "events" array (newer SeatEngine)
            if (data.events && Array.isArray(data.events)) {
              for (const evt of data.events) {
                if (evt.name && evt.startDate && !evt.name.toLowerCase().includes('closed')) {
                  events.push(this.parseJsonLd(evt));
                }
              }
            }
          } catch { /* skip */ }
        });

        if (events.length > 0) break; // Got events, stop trying URLs
      } catch (e) {
        this.log(`  URL ${url} failed, trying next...`);
      }
    }

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
      sourceUrl: data.url
        ? data.url.replace('seatengine.com', 'miamiimprov.com').replace('www-miamiimprov-com.', 'www.')
        : 'https://www.miamiimprov.com/events',
    };
  }
}

// === FORT LAUDERDALE IMPROV ===
export class FortLauderdaleImprovScraper extends BaseScraper {
  // Primary domain first, then SeatEngine mirror as fallback (different IP/TLS config,
  // avoids GitHub Actions IP-blocking and undici TLS incompatibilities)
  private urls = [
    'https://www.improvftl.com/events',
    'https://www-improvftl-com.seatengine.com/events',
    'https://www.improvftl.com/calendar',
  ];

  constructor() {
    super('Fort Lauderdale Improv', { weight: 1.3, rateLimit: 2000 });
  }

  async scrape(): Promise<RawEvent[]> {
    this.log('Scraping Fort Lauderdale Improv...');
    const events: RawEvent[] = [];

    for (const url of this.urls) {
      try {
        // Use BaseScraper's native fetch with DNS fallback
        const $ = await this.fetchHTMLNativeRetry(url, 3, 15_000);

        // JSON-LD has Place with Events array
        $('script[type="application/ld+json"]').each((_, el) => {
          try {
            const data = JSON.parse($(el).html() || '');
            // Handle both capital and lowercase "Events"/"events"
            const evtArray = data.Events || data.events;
            if (Array.isArray(evtArray)) {
              for (const evt of evtArray) {
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
                    sourceUrl: evt.url
                      ? evt.url.replace('seatengine.com', 'improvftl.com').replace('www-improvftl-com.', 'www.')
                      : 'https://www.improvftl.com/events',
                  });
                }
              }
            }
          } catch { /* skip */ }
        });

        if (events.length > 0) break;
      } catch (e) {
        this.log(`  URL ${url} failed, trying next...`);
      }
    }

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

    // Broward Center uses pagination via /events/index/N (16 events per page, 11 pages total)
    // Page 1: /events, Page 2: /events/index/16, Page 3: /events/index/32, etc.
    const pageOffsets = [0, 16, 32, 48, 64, 80]; // 6 pages

    for (let i = 0; i < pageOffsets.length; i++) {
      try {
        const url = pageOffsets[i] === 0 ? this.baseUrl : `${this.baseUrl}/index/${pageOffsets[i]}`;
        const $ = await this.fetchHTMLNativeRetry(url, 2, 12_000);
        let pageCount = 0;

        // Each event is a .entry div inside #list container with structure:
        //   .thumb > .m-buttons-grid > a[href*="/events/detail/"] (Info + Buy links)
        //   .thumb > a > img[alt="More Info for TITLE"]
        //   .info > .m-event-date (date text like "Mar 5, 2026")
        //   .info > .m-event-venue (venue name like "The Parker")
        //   .info > h3 > a (title text + link)
        //   .info > a.tickets[href*="ticketmaster"] (buy link)
        $('.entry').each((_, el) => {
          try {
            const $el = $(el);

            // Extract title from h3 > a
            let title = this.cleanText($el.find('.info h3 a').text());

            // Fallback: extract from img alt
            if (!title || title.length < 3) {
              const imgAlt = $el.find('img[alt*="More Info for"]').attr('alt') || '';
              title = imgAlt.replace(/^More Info for\s*/i, '').trim();
            }
            if (!title || title.length < 3) return;

            const dedup = title.toLowerCase().replace(/\s+/g, ' ');
            if (seen.has(dedup)) return;
            seen.add(dedup);

            // Extract date from .m-event-date
            const dateText = this.cleanText($el.find('.m-event-date').text());
            const dateMatch = dateText.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2})(?:\s*[-–]\s*(\d{1,2}))?,?\s*(\d{4})?/i);
            const startAt = dateMatch ? this.parseDateMatch(dateMatch) : null;
            if (!startAt) return;

            // Extract venue from .m-event-venue
            const venueText = this.cleanText($el.find('.m-event-venue').text());
            const venue = this.extractVenue(venueText || $el.text());

            // Extract event detail URL
            const detailLink = $el.find('a[href*="/events/detail/"]').first().attr('href') || '';

            // Extract Ticketmaster buy link
            let ticketUrl: string | undefined;
            $el.find('a[href*="ticketmaster.com"]').each((_, a) => {
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
              sourceUrl: detailLink.startsWith('http') ? detailLink : `https://www.browardcenter.org${detailLink}`,
              ticketUrl,
            });
            pageCount++;
          } catch { /* skip individual event */ }
        });

        this.log(`  Page ${i + 1}: ${pageCount} events`);

        // Stop if we got no events on this page (end of listings)
        if (pageCount === 0 && i > 0) break;
      } catch (e) {
        this.logError(`Failed page ${i + 1}`, e);
        if (i === 0) break; // If page 1 fails, don't try more
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
      const $ = await this.fetchHTMLNativeRetry(this.url, 2, 15_000);

      // Revolution Live uses WordPress Events Manager plugin.
      // Each event is a .em-item.em-event div with:
      //   .em-item-image img (poster image)
      //   .em-item-name a (title + link to event detail page)
      //   .em-event-date span (date like "Mar 5, 2026")
      //   .em-event-time (time like "6:00pm to 11:00pm")
      //   .em-event-location span (location text)
      //   Google Calendar link with event details (title, dates, description)
      //   Ticketmaster links for purchasing

      $('.em-item.em-event, .em-item').each((_, el) => {
        try {
          const $el = $(el);

          // Extract title from .em-item-name a
          const $nameLink = $el.find('.em-item-name a').first();
          let title = this.cleanText($nameLink.text());
          if (!title || title.length < 3) return;

          // Skip non-event items
          if (/^(Buy|Tickets|More Info|Read More|Private Events)$/i.test(title)) return;

          const dedup = title.toLowerCase().replace(/\s+/g, ' ');
          if (seen.has(dedup)) return;
          seen.add(dedup);

          // Get event detail URL
          const detailUrl = $nameLink.attr('href') || '';

          // Extract date from .em-event-date
          const dateText = this.cleanText($el.find('.em-event-date').text() || $el.find('.em-item-meta-line.em-event-date').text());
          const startAt = this.parseDateFromText(dateText || $el.text());
          if (!startAt) return;

          // Extract time from .em-event-time
          const timeText = this.cleanText($el.find('.em-event-time, .em-item-meta-line.em-event-time').text());
          const timeMatch = timeText.match(/(\d{1,2}):(\d{2})\s*(am|pm)/i);
          let finalStartAt = startAt;
          if (timeMatch) {
            const timeStr = this.convertTo24h(
              parseInt(timeMatch[1]),
              parseInt(timeMatch[2]),
              timeMatch[3].toUpperCase()
            );
            finalStartAt = startAt.replace(/T\d{2}:\d{2}:\d{2}/, `T${timeStr}`);
          }

          // Extract image
          const image = $el.find('.em-item-image img').attr('src') || undefined;

          // Extract price from Google Calendar link or text
          const fullText = $el.text();
          const priceMatch = fullText.match(/\$(\d+(?:\.\d{2})?)/);
          const price = priceMatch ? parseFloat(priceMatch[1]) : undefined;

          // Check age restriction
          const isAllAges = /all ages/i.test(fullText);
          const is21Plus = /21\+|21 and over/i.test(fullText);

          // Extract Ticketmaster link
          let ticketUrl: string | undefined;
          $el.find('a[href*="ticketmaster.com"]').each((_, a) => {
            if (!ticketUrl) ticketUrl = $(a).attr('href') || undefined;
          });

          // Also check for Ticketmaster link in nearby Google Calendar data
          if (!ticketUrl) {
            const gcalLink = $el.find('a[href*="google.com/calendar"]').attr('href') || '';
            const tmMatch = gcalLink.match(/(https?:\/\/www\.ticketmaster\.com\/event\/[A-Z0-9]+)/);
            if (tmMatch) ticketUrl = tmMatch[1];
          }

          events.push({
            title,
            startAt: finalStartAt,
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
            sourceUrl: detailUrl || this.url,
            ticketUrl,
            image,
          });
        } catch { /* skip */ }
      });
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
// Uses httpsGet (Node.js built-in https module) instead of undici-based fetch
// because coralgables.com blocks server-side fetches from GitHub Actions.
export class CoralGablesScraper extends BaseScraper {
  private baseUrl = 'https://www.coralgables.com/events-calendar';
  private maxPages = 4;

  // City meeting types to skip (board meetings, commission hearings, etc.)
  private readonly meetingKeywords = [
    'advisory board', 'advisory panel', 'city commission', 'board of architects',
    'code enforcement', 'ticket hearing', 'planning and zoning',
    'historic preservation', 'budget advisory', 'finance committee',
  ];

  constructor() {
    super('Coral Gables', { weight: 1.2, rateLimit: 2000 });
  }

  async scrape(): Promise<RawEvent[]> {
    this.log('Scraping Coral Gables events...');
    const events: RawEvent[] = [];
    const seenTitles = new Set<string>();

    for (let page = 0; page < this.maxPages; page++) {
      const url = page === 0 ? this.baseUrl : `${this.baseUrl}?page=${page}`;
      try {
        const $ = await this.fetchHTMLNativeRetry(url, 3, 15_000);
        const pageEvents = this.parseEventsFromPage($, seenTitles);
        events.push(...pageEvents);
        this.log(`  Page ${page}: found ${pageEvents.length} events`);

        // Stop paginating if we got no events from this page
        if (pageEvents.length === 0) break;

        // Rate-limit between pages
        if (page < this.maxPages - 1) {
          await this.sleep(this.config.rateLimit);
        }
      } catch (e) {
        this.log(`  Page ${page} failed: ${e instanceof Error ? e.message : String(e)}`);
        // If the first page fails, try to fall back to alternate URLs
        if (page === 0) {
          const fallbackUrls = [
            'https://www.coralgables.com/events',
            'https://www.coralgables.com/calendar',
          ];
          for (const fallbackUrl of fallbackUrls) {
            try {
              const $ = await this.fetchHTMLNativeRetry(fallbackUrl, 2, 15_000);
              const pageEvents = this.parseEventsFromPage($, seenTitles);
              events.push(...pageEvents);
              this.log(`  Fallback ${fallbackUrl}: found ${pageEvents.length} events`);
              break;
            } catch {
              this.log(`  Fallback ${fallbackUrl} also failed`);
            }
          }
        }
        break;
      }
    }

    this.log(`Found ${events.length} Coral Gables events`);
    return events;
  }

  private parseEventsFromPage($: cheerio.CheerioAPI, seenTitles: Set<string>): RawEvent[] {
    const events: RawEvent[] = [];

    // Strategy 1: Cards with about="/events/..." attribute (original Drupal structure)
    $('[about*="/events/"]').each((_, el) => {
      try {
        const event = this.parseCardElement($, el);
        if (event && !seenTitles.has(event.title)) {
          seenTitles.add(event.title);
          events.push(event);
        }
      } catch { /* skip */ }
    });

    // Strategy 2: Links pointing to /events/* within listing containers
    if (events.length === 0) {
      $('a[href*="/events/"]').each((_, el) => {
        try {
          const event = this.parseLinkElement($, el);
          if (event && !seenTitles.has(event.title)) {
            seenTitles.add(event.title);
            events.push(event);
          }
        } catch { /* skip */ }
      });
    }

    // Strategy 3: Text-based fallback — scan the full HTML for event patterns
    if (events.length === 0) {
      const html = $.html();
      const textEvents = this.parseEventsFromText(html);
      for (const event of textEvents) {
        if (!seenTitles.has(event.title)) {
          seenTitles.add(event.title);
          events.push(event);
        }
      }
    }

    return events;
  }

  private parseCardElement($: cheerio.CheerioAPI, el: any): RawEvent | null {
    const $el = $(el);
    const title = this.cleanText($el.find('h3, h4, h2, .card-title').first().text())
      || this.cleanText($el.find('a').first().text());
    const description = this.cleanText($el.find('p, .card-text, .field--name-body').first().text());
    const link = $el.attr('about') || $el.find('a[href*="/events/"]').attr('href') || '';
    const dateText = this.cleanText(
      $el.find('time, .date, .datetime, .field--name-field-date').first().text()
      || $el.closest('.views-row, .listing').find('time, .date').first().text()
    );

    // Get category text from taxonomy labels
    const categoryText = this.cleanText(
      $el.find('.field--name-field-event-type, .taxonomy-term, .badge, .label').text()
    );

    if (!title || title.length < 5) return null;
    if (this.isMeetingEvent(title, categoryText)) return null;

    const startAt = this.parseCityDate(dateText) || this.getNextWeekday();

    return {
      title,
      startAt,
      venueName: this.extractVenue(title, description),
      neighborhood: 'Coral Gables',
      city: 'Miami',
      description: description || `${title} - City of Coral Gables event.`,
      category: this.categorizeWithType(title, description, categoryText),
      tags: this.generateCityTags(title, description, categoryText),
      isOutdoor: /plaza|park|outdoor|moonlight/i.test(title + description),
      sourceName: this.name,
      sourceUrl: link.startsWith('http') ? link : `https://www.coralgables.com${link}`,
    };
  }

  private parseLinkElement($: cheerio.CheerioAPI, el: any): RawEvent | null {
    const $el = $(el);
    const href = $el.attr('href') || '';
    if (!href.includes('/events/') || href === '/events/' || href === '/events') return null;

    const title = this.cleanText($el.text());
    if (!title || title.length < 5) return null;

    // Walk up to find the parent container with date info
    const $parent = $el.closest('.views-row, .listing, .card, article, li, div');
    const dateText = this.cleanText(
      $parent.find('time, .date, .datetime').first().text()
    );
    const description = this.cleanText($parent.find('p').first().text());
    const categoryText = this.cleanText(
      $parent.find('.field--name-field-event-type, .taxonomy-term, .badge, .label').text()
    );

    if (this.isMeetingEvent(title, categoryText)) return null;

    const startAt = this.parseCityDate(dateText) || this.getNextWeekday();

    return {
      title,
      startAt,
      venueName: this.extractVenue(title, description),
      neighborhood: 'Coral Gables',
      city: 'Miami',
      description: description || `${title} - City of Coral Gables event.`,
      category: this.categorizeWithType(title, description, categoryText),
      tags: this.generateCityTags(title, description, categoryText),
      isOutdoor: /plaza|park|outdoor|moonlight/i.test(title + description),
      sourceName: this.name,
      sourceUrl: `https://www.coralgables.com${href}`,
    };
  }

  /**
   * Fallback: extract events from raw HTML text when selectors fail.
   * Looks for date headings followed by event titles and /events/ links.
   */
  private parseEventsFromText(html: string): RawEvent[] {
    const events: RawEvent[] = [];
    // Match patterns like: "March 5, 2026" ... "/events/some-slug" ... "Event Title"
    const eventPattern = /href="(\/events\/[^"]+)"[^>]*>([^<]+)</gi;
    let match: RegExpExecArray | null;

    // First find all dates in the document
    const datePattern = /(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s*(\d{4})?/gi;
    const dates: { date: string; index: number }[] = [];
    let dateMatch: RegExpExecArray | null;
    while ((dateMatch = datePattern.exec(html)) !== null) {
      const parsed = this.parseCityDate(dateMatch[0]);
      if (parsed) dates.push({ date: parsed, index: dateMatch.index });
    }

    while ((match = eventPattern.exec(html)) !== null) {
      const link = match[1];
      const title = this.cleanText(match[2]);

      if (!title || title.length < 5) continue;
      if (this.isMeetingEvent(title, '')) continue;

      // Find the closest preceding date
      let startAt = this.getNextWeekday();
      for (let i = dates.length - 1; i >= 0; i--) {
        if (dates[i].index < match.index) {
          startAt = dates[i].date;
          break;
        }
      }

      events.push({
        title,
        startAt,
        venueName: this.extractVenue(title, ''),
        neighborhood: 'Coral Gables',
        city: 'Miami',
        description: `${title} - City of Coral Gables event.`,
        category: this.categorize(title, ''),
        tags: this.generateCityTags(title, '', ''),
        isOutdoor: /plaza|park|outdoor|moonlight/i.test(title),
        sourceName: this.name,
        sourceUrl: `https://www.coralgables.com${link}`,
      });
    }

    return events;
  }

  private isMeetingEvent(title: string, categoryText: string): boolean {
    const text = `${title} ${categoryText}`.toLowerCase();
    // Skip if explicitly tagged as "City Meetings" category
    if (/city\s*meetings?/i.test(categoryText)) return true;
    return this.meetingKeywords.some((kw) => text.includes(kw));
  }

  private extractVenue(title: string, desc: string): string | undefined {
    const text = `${title} ${desc}`;
    if (/mcbride plaza/i.test(text)) return 'McBride Plaza';
    if (/merrick (park|house)/i.test(text)) return 'Merrick Park';
    if (/biltmore/i.test(text)) return 'Biltmore Hotel';
    if (/country club/i.test(text)) return 'Coral Gables Country Club';
    if (/alhambra circle/i.test(text)) return 'Alhambra Circle';
    if (/chamber of commerce/i.test(text)) return 'Coral Gables Chamber of Commerce';
    if (/giralda/i.test(text)) return 'Giralda Avenue';
    if (/pinewood/i.test(text)) return 'Pinewood Cemetery';
    return undefined;
  }

  private categorizeWithType(title: string, description: string, categoryText: string): string {
    const allText = `${title} ${description} ${categoryText}`;
    // Use the city's own category tags when available
    if (/arts?\/?culture/i.test(categoryText)) return 'Art';
    if (/festival/i.test(categoryText)) return 'Community';
    if (/recreation/i.test(categoryText)) return 'Wellness';
    if (/green\s*initiative/i.test(categoryText)) return 'Outdoors';
    if (/shopping|dining/i.test(categoryText)) return 'Food & Drink';
    if (/community\s*relations/i.test(categoryText)) return 'Community';
    if (/holiday/i.test(categoryText)) return 'Family';
    // Fall back to keyword-based categorization
    return this.categorize(title, allText);
  }

  private generateCityTags(title: string, description: string, categoryText: string): string[] {
    const category = this.categorizeWithType(title, description, categoryText);
    const tags = this.generateTags(title, description, category);
    if (!tags.includes('community')) tags.push('community');
    if (!tags.includes('local-favorite')) tags.push('local-favorite');
    return tags.slice(0, 5);
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
