/**
 * Enhanced WeekendBroward Puppeteer Scraper
 *
 * weekendbroward.com uses SiteGround CAPTCHA + Cloudflare protection.
 * This scraper attempts to get past the challenge by:
 *
 *  1. Using puppeteer-extra with stealth plugin (hides automation signals)
 *  2. NOT blocking any resources (lets challenge JS run fully)
 *  3. Waiting 15-20 seconds for challenge auto-resolution
 *  4. Reusing one browser session (cookies persist across pages)
 *  5. Trying all 6 WB event pages in sequence
 *  6. Following pagination to capture ALL events
 *
 * The site uses WordPress Events Manager plugin with CSS selectors:
 *   .em-event, .em-event-name a, .em-event-when, .em-event-where
 *
 * This scraper works in CI (GitHub Actions) where Chrome is available.
 * It gracefully returns [] if the challenge cannot be bypassed.
 */

import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import type { Browser, Page } from 'puppeteer';
import { BaseScraper } from './base.js';
import type { RawEvent } from '../types.js';

puppeteer.use(StealthPlugin());

// ── City resolution ──────────────────────────────────────────────────

const BROWARD_CITIES = new Set([
  'fort lauderdale', 'ft. lauderdale', 'ft lauderdale',
  'hollywood', 'pompano beach', 'dania beach', 'dania',
  'miramar', 'coral springs', 'sunrise', 'plantation',
  'davie', 'hallandale beach', 'hallandale', 'weston',
  'cooper city', 'pembroke pines', 'lauderdale-by-the-sea',
  'lauderdale by the sea', 'margate', 'tamarac', 'coconut creek',
  'north lauderdale', 'wilton manors', 'oakland park',
  'lauderhill', 'deerfield beach', 'parkland', 'lighthouse point',
]);

const PALM_BEACH_CITIES = new Set([
  'west palm beach', 'boca raton', 'delray beach', 'boynton beach',
  'lake worth', 'lake worth beach', 'palm beach gardens', 'jupiter',
  'wellington', 'palm beach', 'north palm beach', 'riviera beach',
  'royal palm beach', 'lantana', 'greenacres', 'juno beach',
  'tequesta', 'singer island', 'hobe sound', 'stuart',
]);

function resolveCity(text: string): 'Fort Lauderdale' | 'Palm Beach' | null {
  const lower = text.toLowerCase();
  for (const city of BROWARD_CITIES) {
    if (lower.includes(city)) return 'Fort Lauderdale';
  }
  for (const city of PALM_BEACH_CITIES) {
    if (lower.includes(city)) return 'Palm Beach';
  }
  return null;
}

function resolveNeighborhood(text: string): string {
  const lower = text.toLowerCase();
  if (lower.includes('pompano')) return 'Pompano Beach';
  if (lower.includes('hollywood')) return 'Hollywood';
  if (lower.includes('plantation')) return 'Plantation';
  if (lower.includes('oakland park')) return 'Oakland Park';
  if (lower.includes('dania')) return 'Dania Beach';
  if (lower.includes('wilton manors')) return 'Wilton Manors';
  if (lower.includes('hallandale')) return 'Hallandale Beach';
  if (lower.includes('lauderdale-by-the-sea') || lower.includes('lauderdale by the sea')) return 'Lauderdale-By-The-Sea';
  if (lower.includes('deerfield')) return 'Deerfield Beach';
  if (lower.includes('coral springs')) return 'Coral Springs';
  if (lower.includes('fort lauderdale') || lower.includes('ft. lauderdale') || lower.includes('ft lauderdale')) return 'Downtown FLL';
  if (lower.includes('jupiter') || lower.includes('juno beach')) return 'Jupiter';
  if (lower.includes('boca raton') || lower.includes('boca')) return 'Boca Raton';
  if (lower.includes('delray')) return 'Delray Beach';
  if (lower.includes('boynton')) return 'Boynton Beach';
  if (lower.includes('lake worth')) return 'Lake Worth';
  if (lower.includes('palm beach gardens')) return 'Palm Beach Gardens';
  if (lower.includes('west palm') || lower.includes('wpb')) return 'West Palm Beach';
  if (lower.includes('wellington')) return 'Wellington';
  return 'Fort Lauderdale';
}

// ── Date/time parsing ────────────────────────────────────────────────

const MONTH_MAP: Record<string, string> = {
  january: '01', february: '02', march: '03', april: '04',
  may: '05', june: '06', july: '07', august: '08',
  september: '09', october: '10', november: '11', december: '12',
  jan: '01', feb: '02', mar: '03', apr: '04',
  jun: '06', jul: '07', aug: '08', sep: '09',
  oct: '10', nov: '11', dec: '12',
};

function parseWhen(when: string): { startDate: string | null; startTime: string | null } {
  if (!when) return { startDate: null, startTime: null };

  let startDate: string | null = null;

  // Try MM/DD/YYYY
  const mdyMatch = when.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (mdyMatch) {
    startDate = `${mdyMatch[3]}-${mdyMatch[1].padStart(2, '0')}-${mdyMatch[2].padStart(2, '0')}`;
  }

  // Try "Month Day, Year" or "Month Day Year"
  if (!startDate) {
    const namedMatch = when.match(/([a-z]+)\s+(\d{1,2}),?\s+(\d{4})/i);
    if (namedMatch) {
      const m = MONTH_MAP[namedMatch[1].toLowerCase()];
      if (m) startDate = `${namedMatch[3]}-${m}-${namedMatch[2].padStart(2, '0')}`;
    }
  }

  // Try "Day Month Year"
  if (!startDate) {
    const dMonY = when.match(/(\d{1,2})\s+([a-z]{3,9})\s+(\d{4})/i);
    if (dMonY) {
      const m = MONTH_MAP[dMonY[2].toLowerCase()];
      if (m) startDate = `${dMonY[3]}-${m}-${dMonY[1].padStart(2, '0')}`;
    }
  }

  // Extract time
  let startTime: string | null = null;
  const timeMatch = when.match(/(\d{1,2}):(\d{2})\s*(am|pm)/i);
  if (timeMatch) {
    let h = parseInt(timeMatch[1], 10);
    const min = timeMatch[2];
    if (timeMatch[3].toLowerCase() === 'pm' && h < 12) h += 12;
    if (timeMatch[3].toLowerCase() === 'am' && h === 12) h = 0;
    startTime = `${String(h).padStart(2, '0')}:${min}:00`;
  }

  return { startDate, startTime };
}

// ── Category and tag helpers ─────────────────────────────────────────

function categorizeEvent(title: string, venue: string): string {
  const text = `${title} ${venue}`.toLowerCase();
  if (/comedy|improv|open.mic|stand.up/i.test(text)) return 'Comedy';
  if (/karaoke|trivia|bingo/i.test(text)) return 'Nightlife';
  if (/jazz|blues/i.test(text)) return 'Music';
  if (/live music|concert|band|singer|tribute|fest.*music|rock|reggae/i.test(text)) return 'Music';
  if (/beer|wine|food|eat|dine|chef|culinary|market|brunch/i.test(text)) return 'Food & Drink';
  if (/art|gallery|exhibit|museum|film|theater|dance/i.test(text)) return 'Art';
  if (/5k|run|race|yoga|fitness/i.test(text)) return 'Fitness';
  if (/festival|fair|parade|carnival/i.test(text)) return 'Culture';
  return 'Music'; // Default for WB which is mostly music
}

function makeTags(title: string, category: string): string[] {
  const text = title.toLowerCase();
  const tags: string[] = [];
  if (/live music|band|concert|tribute/i.test(text)) tags.push('live-music');
  if (/jazz/i.test(text)) tags.push('jazz');
  if (/comedy|improv/i.test(text)) tags.push('comedy');
  if (/karaoke/i.test(text)) tags.push('dancing');
  if (/trivia|bingo/i.test(text)) tags.push('free-event');
  if (/free/i.test(text)) tags.push('free-event');
  if (/outdoor|park|beach/i.test(text)) tags.push('outdoor');
  if (category === 'Music' && !tags.includes('live-music')) tags.push('live-music');
  return tags.slice(0, 5);
}

// ── WB pages to scrape ──────────────────────────────────────────────

interface WBPage {
  url: string;
  categoryHint?: string;
  label: string;
}

const WB_PAGES: WBPage[] = [
  { url: 'https://weekendbroward.com/events/', label: 'Events' },
  { url: 'https://weekendbroward.com/live-music/', categoryHint: 'Music', label: 'Live Music' },
  { url: 'https://weekendbroward.com/comedy-open-mics/', categoryHint: 'Comedy', label: 'Comedy' },
  { url: 'https://weekendbroward.com/karaoke/', categoryHint: 'Nightlife', label: 'Karaoke/Trivia' },
  { url: 'https://weekendbroward.com/south-florida-jazz/', categoryHint: 'Music', label: 'Jazz' },
  { url: 'https://weekendbroward.com/live-music-boca-delray-palm-beach/', categoryHint: 'Music', label: 'PB Live Music' },
];

// ── Main scraper ────────────────────────────────────────────────────

export class WeekendBrowardEnhancedScraper extends BaseScraper {
  private browser: Browser | null = null;
  private page: Page | null = null;

  constructor() {
    super('WeekendBroward Enhanced', { weight: 1.5, rateLimit: 2000 });
  }

  async scrape(): Promise<RawEvent[]> {
    try {
      await this.initBrowser();

      // Warm up: visit homepage to establish session and pass challenge
      const challengePassed = await this.warmUp();
      if (!challengePassed) {
        this.log('Could not get past SiteGround challenge — returning empty');
        return [];
      }

      const allEvents: RawEvent[] = [];
      const seen = new Set<string>();

      for (const page of WB_PAGES) {
        try {
          const events = await this.scrapePage(page);
          for (const e of events) {
            const key = `${e.title}|${e.startAt}`;
            if (!seen.has(key)) {
              seen.add(key);
              allEvents.push(e);
            }
          }
        } catch (err) {
          this.logError(`Failed to scrape ${page.label}`, err);
        }
        await this.sleep(2000);
      }

      this.log(`Total: ${allEvents.length} events from WeekendBroward (${WB_PAGES.length} pages)`);
      return allEvents;
    } finally {
      await this.closeBrowser();
    }
  }

  private async initBrowser(): Promise<void> {
    this.log('Launching headless browser with stealth...');
    this.browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--window-size=1920,1080',
      ],
    });

    this.page = await this.browser.newPage();

    // Set realistic viewport and user agent
    if (typeof this.page.setViewport === 'function') {
      await this.page.setViewport({ width: 1920, height: 1080 });
    }
    if (typeof this.page.setUserAgent === 'function') {
      await this.page.setUserAgent(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      );
    }

    // DO NOT block resources — SiteGround challenge needs JS, CSS, and images to resolve
  }

  private async closeBrowser(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
    }
  }

  /**
   * Visit homepage first to establish a session and get past the SiteGround challenge.
   * Returns true if we got past the challenge, false otherwise.
   */
  private async warmUp(): Promise<boolean> {
    if (!this.page) return false;

    try {
      this.log('Warming up: visiting homepage...');
      await this.page.goto('https://weekendbroward.com/', {
        waitUntil: 'networkidle2',
        timeout: 45000,
      });

      // Wait for SiteGround challenge to auto-resolve (15s initial wait)
      this.log('Waiting 15s for challenge resolution...');
      await this.sleep(15000);

      // Check if we're past the challenge
      const content = typeof this.page.content === 'function'
        ? await this.page.content()
        : await this.page.evaluate(() => document.documentElement.outerHTML);
      const title = await this.page.evaluate(() => document.title);

      if (content.includes('sg-captcha') || content.includes('challenge-platform') ||
          content.includes('Checking your browser')) {
        this.log('Challenge still active, waiting another 15s...');
        await this.sleep(15000);

        // Check again
        const content2 = typeof this.page.content === 'function'
          ? await this.page.content()
          : await this.page.evaluate(() => document.documentElement.outerHTML);
        if (content2.includes('sg-captcha') || content2.includes('challenge-platform')) {
          this.log('Challenge persists after 30s — SiteGround CAPTCHA likely requires manual solving');
          return false;
        }
      }

      // Verify we have real content (WordPress Events Manager or WB content)
      const hasRealContent = content.includes('weekendbroward') ||
                              content.includes('WeekendBroward') ||
                              content.includes('em-event') ||
                              title.toLowerCase().includes('weekend');

      this.log(`Homepage loaded: "${title}" (real content: ${hasRealContent})`);
      return hasRealContent;
    } catch (err) {
      this.logError('Homepage warmup failed', err);
      return false;
    }
  }

  /**
   * Scrape a single WB events page.
   * Extracts events from the Events Manager plugin's DOM structure.
   */
  private async scrapePage(pageInfo: WBPage): Promise<RawEvent[]> {
    if (!this.page) return [];

    this.log(`Scraping: ${pageInfo.label} (${pageInfo.url})`);

    await this.page.goto(pageInfo.url, {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });

    // Wait for events to load
    await this.sleep(5000);

    // Scroll to trigger lazy loading
    for (let i = 0; i < 5; i++) {
      await this.page.evaluate(() => window.scrollBy(0, window.innerHeight));
      await this.sleep(500);
    }
    await this.page.evaluate(() => window.scrollTo(0, 0));

    // Check for Events Manager elements
    const eventCount = await this.page.evaluate(() =>
      document.querySelectorAll('.em-event, article.type-event, .em-item').length
    );

    if (eventCount === 0) {
      this.log(`  No event elements found on ${pageInfo.label}, trying to wait longer...`);
      await this.sleep(10000);
    }

    // Extract all events from the page (handles multiple pages of pagination)
    const allItems = await this.extractAllEvents(pageInfo);

    // Parse into RawEvents
    const events: RawEvent[] = [];
    const now = new Date();

    for (const item of allItems) {
      const event = this.parseEventItem(item, pageInfo.categoryHint, now, pageInfo.url);
      if (event) events.push(event);
    }

    this.log(`  ${pageInfo.label}: ${events.length} events`);
    return events;
  }

  /**
   * Extract events from the current page and follow pagination links.
   */
  private async extractAllEvents(
    pageInfo: WBPage,
    maxPages = 5,
  ): Promise<Array<{ title: string; link: string; when: string; where: string }>> {
    if (!this.page) return [];

    let allItems: Array<{ title: string; link: string; when: string; where: string }> = [];

    for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
      // Extract events from current page view
      const items = await this.page.evaluate(() => {
        const results: Array<{ title: string; link: string; when: string; where: string }> = [];
        const els = document.querySelectorAll('.em-event, article.type-event, .em-item');
        for (const el of Array.from(els)) {
          const titleEl = el.querySelector('.em-event-name a, .entry-title a, h3 a, h2 a');
          if (!titleEl || !titleEl.textContent?.trim()) continue;
          results.push({
            title: titleEl.textContent.trim(),
            link: titleEl.getAttribute('href') ?? '',
            when: el.querySelector('.em-event-when, .event-when, time')?.textContent?.trim() ?? '',
            where: el.querySelector('.em-event-where, .event-where')?.textContent?.trim() ?? '',
          });
        }
        return results;
      });

      allItems = allItems.concat(items);

      if (items.length === 0) break;

      // Try to find and click "next page" link
      const hasNextPage = await this.page.evaluate(() => {
        const nextLink = document.querySelector('.em-pagination .next a, .pagination .next a, a.next');
        if (nextLink) {
          (nextLink as HTMLAnchorElement).click();
          return true;
        }
        return false;
      });

      if (!hasNextPage) break;

      // Wait for page transition
      await this.sleep(3000);
    }

    return allItems;
  }

  /**
   * Parse a single extracted event item into a RawEvent.
   */
  private parseEventItem(
    item: { title: string; link: string; when: string; where: string },
    categoryHint: string | undefined,
    now: Date,
    pageUrl?: string,
  ): RawEvent | null {
    const { title, link, when, where } = item;
    if (!title || title.length < 3) return null;

    // Parse date/time
    const { startDate, startTime } = parseWhen(when);
    if (!startDate) return null;

    const time = startTime || '19:00:00';
    const startAt = `${startDate}T${time}`;
    if (new Date(startAt) < now) return null;

    // Parse venue and city from "where" field
    // Typical format: "Venue Name, Street Address, City" or "Venue Name, City"
    const whereParts = where.split(',').map(p => p.trim()).filter(Boolean);
    const venueName = whereParts[0] || undefined;
    const rawCity = whereParts.length >= 2 ? whereParts[whereParts.length - 1] : '';
    const streetAddress = whereParts.length >= 3 ? whereParts.slice(1, -1).join(', ') : undefined;

    // Resolve city (Broward vs Palm Beach)
    const fullText = `${where} ${title}`;
    const city = resolveCity(fullText);
    if (!city) return null; // Skip events in unknown cities

    const neighborhood = resolveNeighborhood(fullText);
    const category = categoryHint || categorizeEvent(title, venueName || '');
    const tags = makeTags(title, category);
    const address = [streetAddress, rawCity, 'FL'].filter(Boolean).join(', ') || undefined;

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
      isOutdoor: /outdoor|park|beach|patio|garden/i.test(fullText),
      description: `${title}${venueName ? ` at ${venueName}` : ''}${rawCity ? `, ${rawCity}` : ''}`,
      sourceUrl: link || pageUrl || 'https://weekendbroward.com/events/',
      sourceName: this.name,
      ticketUrl: link || undefined,
    };
  }
}
