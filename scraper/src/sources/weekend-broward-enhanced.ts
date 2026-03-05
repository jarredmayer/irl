/**
 * Enhanced WeekendBroward Scraper (HTTP-only, no Puppeteer)
 *
 * weekendbroward.com uses SiteGround CAPTCHA + Cloudflare protection.
 * This scraper bypasses it using the SiteGround proof-of-work challenge:
 *
 *  1. Request target page → get 202 + meta-refresh to /.well-known/sgcaptcha/
 *  2. Fetch challenge page → extract sgchallenge + sgsubmit_url
 *  3. Solve proof-of-work in Node.js (~1-2 seconds for complexity 20)
 *  4. Submit solution → get _I_ cookie
 *  5. Re-request pages with cookie → real HTML content
 *  6. Parse Events Manager HTML with cheerio
 *
 * The site uses WordPress Events Manager plugin with CSS selectors:
 *   .em-event, .em-event-name a, .em-event-when, .em-event-where
 *
 * Covers 6 WB event pages:
 *   - /events/             — general events
 *   - /live-music/         — live music
 *   - /comedy-open-mics/   — comedy & open mic
 *   - /karaoke/            — karaoke, trivia, bingo
 *   - /south-florida-jazz/ — jazz calendar
 *   - /live-music-boca-delray-palm-beach/ — PB live music
 */

import { createHash } from 'crypto';
import * as cheerio from 'cheerio';
import { BaseScraper } from './base.js';
import type { RawEvent } from '../types.js';

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

// ── PoW solver ────────────────────────────────────────────────────────

function encodeCounter(n: number): Buffer {
  if (n === 0) return Buffer.from([0]);
  let size = 1;
  if (n > 16_777_215) size = 4;
  else if (n > 65_535) size = 3;
  else if (n > 255) size = 2;
  const buf = Buffer.alloc(size);
  let val = n;
  for (let i = size - 1; i >= 0; i--) {
    buf[i] = val & 0xff;
    val >>>= 8;
  }
  return buf;
}

function solvePow(challengeStr: string): { solution: string; elapsed: number; hashes: number } {
  const complexity = parseInt(challengeStr.split(':')[0], 10);
  const challengeBytes = Buffer.from(challengeStr, 'utf-8');
  const shift = 32 - complexity;
  const maxAttempts = 10_000_000;

  const start = Date.now();

  for (let counter = 0; counter < maxAttempts; counter++) {
    const counterBytes = encodeCounter(counter);
    const data = Buffer.concat([challengeBytes, counterBytes]);
    const hash = createHash('sha1').update(data).digest();
    const firstWord = hash.readUInt32BE(0);

    if ((firstWord >>> shift) === 0) {
      return {
        solution: data.toString('base64'),
        elapsed: Date.now() - start,
        hashes: counter + 1,
      };
    }
  }

  throw new Error(`PoW not solved after ${maxAttempts} attempts (complexity ${complexity})`);
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

// ── RSS feed URLs ────────────────────────────────────────────────────

const FEED_URLS = [
  'https://weekendbroward.com/events/feed/',
  'https://weekendbroward.com/events/feed/?event_category=live-music',
  'https://weekendbroward.com/events/feed/?event_category=comedy',
  'https://weekendbroward.com/events/feed/?event_category=karaoke',
  'https://weekendbroward.com/events/feed/?event_category=jazz',
];

// ── Main scraper ────────────────────────────────────────────────────

export class WeekendBrowardEnhancedScraper extends BaseScraper {
  private cookie: string | null = null;

  constructor() {
    super('WeekendBroward Enhanced', { weight: 1.5, rateLimit: 2000 });
  }

  async scrape(): Promise<RawEvent[]> {
    this.log('Attempting SiteGround PoW bypass (HTTP-only, no Puppeteer)...');

    // Step 1: Solve PoW and get cookie
    try {
      await this.solveSiteGroundChallenge(WB_PAGES[0].url);
    } catch (err) {
      this.logError('PoW challenge failed', err);
      return [];
    }

    if (!this.cookie) {
      this.log('No cookie obtained — cannot access site');
      return [];
    }

    // Step 2: Try RSS feeds first (most data, easiest to parse)
    const rssEvents = await this.tryRssFeeds();
    if (rssEvents.length > 0) {
      this.log(`Total: ${rssEvents.length} events from WeekendBroward RSS feeds`);
      return rssEvents;
    }

    // Step 3: Fall back to HTML page scraping with cheerio
    this.log('RSS feeds blocked, trying HTML pages...');
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
  }

  // ── PoW challenge flow ──────────────────────────────────────────────

  private async solveSiteGroundChallenge(targetUrl: string): Promise<void> {
    const r1 = await this.fetchRaw(targetUrl);
    const body1 = await r1.text();

    // Check if we got content directly (no challenge)
    if (body1.includes('<rss') || body1.includes('<item>') || body1.includes('em-event')) {
      this.log('No SiteGround challenge — direct access!');
      return;
    }

    // Extract meta-refresh redirect to captcha page
    const metaMatch = body1.match(/content="0;([^"]+)"/);
    if (!metaMatch) {
      const inlineChallenge = body1.match(/sgchallenge="([^"]+)"/);
      if (inlineChallenge) {
        await this.solveAndSubmit(inlineChallenge[1], body1, targetUrl);
        return;
      }
      throw new Error('No SiteGround challenge redirect found');
    }

    const challengeUrl = new URL(metaMatch[1], targetUrl).toString();
    this.log(`Challenge URL: ${challengeUrl}`);

    const r2 = await this.fetchRaw(challengeUrl);
    const body2 = await r2.text();

    const challengeMatch = body2.match(/sgchallenge="([^"]+)"/);
    if (!challengeMatch) {
      throw new Error('No sgchallenge found in challenge page');
    }

    await this.solveAndSubmit(challengeMatch[1], body2, targetUrl);
  }

  private async solveAndSubmit(challenge: string, pageBody: string, targetUrl: string): Promise<void> {
    const submitMatch = pageBody.match(/sgsubmit_url="([^"]+)"/);
    const submitPath = submitMatch?.[1] || '/.well-known/sgcaptcha/';

    this.log(`Solving PoW (complexity ${challenge.split(':')[0]})...`);
    const { solution, elapsed, hashes } = solvePow(challenge);
    this.log(`PoW solved in ${elapsed}ms (${hashes} hashes)`);

    const baseUrl = new URL(targetUrl).origin;
    const sep = submitPath.includes('?') ? '&' : '?';
    const solUrl = `${baseUrl}${submitPath}${sep}sol=${encodeURIComponent(solution)}&s=${elapsed}:${hashes}`;

    const r3 = await this.fetchRaw(solUrl);
    const body3 = await r3.text();

    const cookieMatch = body3.match(/_I_=([^;]+)/);
    if (cookieMatch) {
      this.cookie = `_I_=${cookieMatch[1]}`;
      this.log(`Got _I_ cookie: ${this.cookie.substring(0, 30)}...`);
    } else {
      this.log('Warning: No _I_ cookie found in solution response');
    }
  }

  // ── RSS feed parsing ────────────────────────────────────────────────

  private async tryRssFeeds(): Promise<RawEvent[]> {
    const events: RawEvent[] = [];
    const seen = new Set<string>();

    for (const url of FEED_URLS) {
      try {
        const response = await this.fetchWithCookie(url);
        const xml = await response.text();

        if (!xml.includes('<rss') && !xml.includes('<item>') && !xml.includes('<?xml')) {
          this.log(`RSS feed ${url} returned non-XML (${xml.length} chars)`);
          continue;
        }

        const feedEvents = this.parseRssXml(xml, url);
        for (const e of feedEvents) {
          const key = `${e.title}|${e.startAt}`;
          if (!seen.has(key)) {
            seen.add(key);
            events.push(e);
          }
        }
      } catch (err) {
        this.logError(`Failed to fetch RSS ${url}`, err);
      }
    }

    this.log(`Found ${events.length} events from RSS feeds`);
    return events;
  }

  private parseRssXml(xml: string, feedUrl: string): RawEvent[] {
    const events: RawEvent[] = [];
    const now = new Date();

    const itemPattern = /<item>([\s\S]*?)<\/item>/gi;
    const titlePattern = /<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>|<title>([\s\S]*?)<\/title>/i;
    const linkPattern = /<link>([\s\S]*?)<\/link>/i;
    const descPattern = /<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>|<description>([\s\S]*?)<\/description>/i;

    let match;
    while ((match = itemPattern.exec(xml)) !== null) {
      const block = match[1];

      const titleMatch = titlePattern.exec(block);
      const title = (titleMatch?.[1] ?? titleMatch?.[2] ?? '').trim();
      if (!title || title.length < 3) continue;

      const linkMatch = linkPattern.exec(block);
      const sourceUrl = (linkMatch?.[1] ?? '').trim();

      const descMatch = descPattern.exec(block);
      const descRaw = (descMatch?.[1] ?? descMatch?.[2] ?? '').trim();

      // Parse description: "MM/DD/YYYY - MM/DD/YYYY - HH:MM pm <br />Venue <br />Address <br />City"
      const parts = descRaw.split(/<br\s*\/?>/i).map((p: string) => p.trim()).filter(Boolean);

      let startDate: string | null = null;
      let startTime: string | null = null;

      if (parts[0]) {
        const dateMatches = [...parts[0].matchAll(/(\d{1,2}\/\d{1,2}\/\d{4})/g)];
        if (dateMatches.length >= 1) {
          const [m, d, y] = dateMatches[0][1].split('/');
          startDate = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
        }

        const timeMatch = parts[0].match(/(\d{1,2}):(\d{2})\s*(am|pm)/i);
        if (timeMatch) {
          let h = parseInt(timeMatch[1], 10);
          const min = timeMatch[2];
          if (/pm/i.test(timeMatch[3]) && h < 12) h += 12;
          if (/am/i.test(timeMatch[3]) && h === 12) h = 0;
          startTime = `${String(h).padStart(2, '0')}:${min}:00`;
        }
      }

      if (!startDate) continue;

      const time = startTime || '19:00:00';
      const startAt = `${startDate}T${time}`;
      if (new Date(startAt) < now) continue;

      const venueName = parts[1] || undefined;
      const rawCity = parts.length >= 4 ? parts[3] : parts.length === 3 && !/\d/.test(parts[2]) ? parts[2] : '';
      const city = resolveCity(`${rawCity} ${title}`);
      if (!city) continue;

      const category = categorizeEvent(title, venueName || '');
      const tags = makeTags(title, category);

      events.push({
        title,
        startAt,
        venueName,
        neighborhood: resolveNeighborhood(`${rawCity} ${title}`),
        lat: null,
        lng: null,
        city,
        tags,
        category,
        isOutdoor: /outdoor|park|beach|patio|garden/i.test(`${title} ${venueName || ''}`),
        description: `${title}${venueName ? ` at ${venueName}` : ''}${rawCity ? `, ${rawCity}` : ''}`,
        sourceUrl: sourceUrl || feedUrl,
        sourceName: this.name,
        ticketUrl: sourceUrl || undefined,
      });
    }

    return events;
  }

  // ── HTML page scraping (fallback) ───────────────────────────────────

  private async scrapePage(pageInfo: WBPage): Promise<RawEvent[]> {
    this.log(`Scraping: ${pageInfo.label} (${pageInfo.url})`);

    const response = await this.fetchWithCookie(pageInfo.url);
    const html = await response.text();

    // Verify we got real content (not a challenge page or 403)
    if (html.includes('sg-captcha') || html.includes('challenge-platform') ||
        html.includes('Checking your browser')) {
      this.log(`  Challenge still active for ${pageInfo.label} — skipping`);
      return [];
    }

    if (html.length < 500 && (html.includes('403') || html.includes('Forbidden'))) {
      this.log(`  403 Forbidden for ${pageInfo.label} — skipping`);
      return [];
    }

    const $ = cheerio.load(html);
    return this.parseEventsManagerHtml($, pageInfo, pageInfo.url);
  }

  private parseEventsManagerHtml(
    $: cheerio.CheerioAPI,
    pageInfo: WBPage,
    pageUrl: string,
  ): RawEvent[] {
    const events: RawEvent[] = [];
    const now = new Date();

    // Events Manager uses .em-event or article.type-event elements
    const eventEls = $('.em-event, article.type-event, .em-item');

    if (eventEls.length === 0) {
      this.log(`  No event elements found on ${pageInfo.label}`);
      return [];
    }

    eventEls.each((_, el) => {
      const $el = $(el);
      const titleEl = $el.find('.em-event-name a, .entry-title a, h3 a, h2 a').first();
      const title = titleEl.text().trim();
      if (!title || title.length < 3) return;

      const link = titleEl.attr('href') ?? '';
      const when = $el.find('.em-event-when, .event-when, time').first().text().trim();
      const where = $el.find('.em-event-where, .event-where').first().text().trim();

      // Parse date/time
      const { startDate, startTime } = parseWhen(when);
      if (!startDate) return;

      const time = startTime || '19:00:00';
      const startAt = `${startDate}T${time}`;
      if (new Date(startAt) < now) return;

      // Parse venue and city from "where" field
      const whereParts = where.split(',').map(p => p.trim()).filter(Boolean);
      const venueName = whereParts[0] || undefined;
      const rawCity = whereParts.length >= 2 ? whereParts[whereParts.length - 1] : '';
      const streetAddress = whereParts.length >= 3 ? whereParts.slice(1, -1).join(', ') : undefined;

      const fullText = `${where} ${title}`;
      const city = resolveCity(fullText);
      if (!city) return;

      const neighborhood = resolveNeighborhood(fullText);
      const category = pageInfo.categoryHint || categorizeEvent(title, venueName || '');
      const tags = makeTags(title, category);
      const address = [streetAddress, rawCity, 'FL'].filter(Boolean).join(', ') || undefined;

      events.push({
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
        sourceUrl: link || pageUrl,
        sourceName: this.name,
        ticketUrl: link || undefined,
      });
    });

    this.log(`  ${pageInfo.label}: ${events.length} events`);
    return events;
  }

  // ── HTTP helpers ────────────────────────────────────────────────────

  private async fetchRaw(url: string): Promise<Response> {
    await this.sleep(this.config.rateLimit);
    return fetch(url, {
      headers: {
        'User-Agent': this.userAgent,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      redirect: 'follow',
    });
  }

  private async fetchWithCookie(url: string): Promise<Response> {
    await this.sleep(this.config.rateLimit);
    return fetch(url, {
      headers: {
        'User-Agent': this.userAgent,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        ...(this.cookie ? { Cookie: this.cookie } : {}),
      },
      redirect: 'follow',
    });
  }
}
