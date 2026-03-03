/**
 * WeekendBroward PoW Scraper
 *
 * Bypasses SiteGround's proof-of-work challenge to access weekendbroward.com
 * event data. SiteGround uses a SHA1-based hashcash puzzle: find a counter
 * where SHA1(challenge_bytes || counter_bytes) has N leading zero bits.
 *
 * Flow:
 *   1. Request target page → get 202 + meta-refresh to /.well-known/sgcaptcha/
 *   2. Fetch challenge page → extract sgchallenge + sgsubmit_url
 *   3. Solve proof-of-work in Node.js (~1-2 seconds for complexity 20)
 *   4. Submit solution → get _I_ cookie
 *   5. Re-request target page with cookie → real content
 *
 * Note: Some hosting IPs may still get 403 from the origin server even after
 * solving the PoW. The scraper handles this gracefully and logs the issue.
 */

import { createHash } from 'crypto';
import { BaseScraper } from './base.js';
import type { RawEvent } from '../types.js';

// ── City/neighborhood helpers (shared with weekend-broward.ts) ──────────

const BROWARD_CITIES = new Set([
  'fort lauderdale', 'ft. lauderdale', 'ft lauderdale',
  'hollywood', 'pompano beach', 'dania beach', 'dania',
  'miramar', 'coral springs', 'sunrise', 'plantation',
  'davie', 'hallandale beach', 'hallandale', 'weston',
  'cooper city', 'pembroke pines', 'lauderdale-by-the-sea',
  'lauderdale by the sea', 'margate', 'tamarac', 'coconut creek',
  'north lauderdale', 'wilton manors', 'oakland park',
  'lauderhill', 'southwest ranches', 'lighthouse point',
  'deerfield beach', 'parkland', 'sea ranch lakes',
]);

const PALM_BEACH_CITIES = new Set([
  'west palm beach', 'boca raton', 'delray beach', 'boynton beach',
  'lake worth', 'lake worth beach', 'palm beach gardens', 'jupiter',
  'wellington', 'palm beach', 'north palm beach', 'riviera beach',
  'royal palm beach', 'lantana', 'greenacres', 'palm springs',
  'lake park', 'tequesta', 'juno beach', 'singer island',
  'palm beach shores', 'stuart', 'hobe sound',
]);

function resolveCity(rawCity: string): 'Fort Lauderdale' | 'Palm Beach' | null {
  const c = rawCity.toLowerCase().trim();
  if (BROWARD_CITIES.has(c)) return 'Fort Lauderdale';
  if (PALM_BEACH_CITIES.has(c)) return 'Palm Beach';
  return null;
}

function resolveNeighborhood(rawCity: string): string {
  const c = rawCity.toLowerCase().trim();
  if (c.includes('fort lauderdale') || c.includes('ft')) return 'Downtown FLL';
  if (c === 'hollywood') return 'Hollywood';
  if (c === 'pompano beach') return 'Pompano Beach';
  if (c === 'dania beach' || c === 'dania') return 'Dania Beach';
  if (c === 'wilton manors') return 'Wilton Manors';
  if (c === 'oakland park') return 'Oakland Park';
  if (c === 'deerfield beach') return 'Deerfield Beach';
  if (c === 'boca raton') return 'Boca Raton';
  if (c === 'delray beach') return 'Delray Beach';
  if (c === 'west palm beach') return 'West Palm Beach';
  if (c === 'jupiter' || c === 'tequesta') return 'Jupiter';
  if (c === 'lake worth' || c === 'lake worth beach') return 'Lake Worth';
  return rawCity || 'Fort Lauderdale';
}

// ── PoW solver ──────────────────────────────────────────────────────────

/**
 * Encode a counter as big-endian bytes with minimal length.
 * Mirrors the SiteGround worker's encoding.
 */
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

/**
 * Solve SiteGround's proof-of-work challenge.
 *
 * @param challengeStr  The sgchallenge value, e.g. "20:1772573126:nonce:hash:"
 * @returns Base64-encoded solution (challenge_bytes + counter_bytes)
 */
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

// ── RSS parser ──────────────────────────────────────────────────────────

interface ParsedRssItem {
  title: string;
  link: string;
  startDate: string | null;
  startTime: string | null;
  venueName: string | null;
  city: string | null;
}

function parseRssItems(xml: string): ParsedRssItem[] {
  const items: ParsedRssItem[] = [];
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
    const link = (linkMatch?.[1] ?? '').trim();

    const descMatch = descPattern.exec(block);
    const descRaw = (descMatch?.[1] ?? descMatch?.[2] ?? '').trim();

    // Parse description: "MM/DD/YYYY - MM/DD/YYYY - HH:MM pm <br />Venue <br />Address <br />City"
    const parts = descRaw.split(/<br\s*\/?>/i).map((p: string) => p.trim()).filter(Boolean);

    let startDate: string | null = null;
    let startTime: string | null = null;

    if (parts[0]) {
      const dateMatches = [...parts[0].matchAll(/(\d{1,2}\/\d{1,2}\/\d{4})/g)];
      if (dateMatches.length >= 1) startDate = dateMatches[0][1];

      const timeMatch = parts[0].match(/(\d{1,2}:\d{2})\s*(am|pm)/i);
      if (timeMatch) {
        let h = parseInt(timeMatch[1].split(':')[0], 10);
        const m = timeMatch[1].split(':')[1];
        if (/pm/i.test(timeMatch[2]) && h < 12) h += 12;
        if (/am/i.test(timeMatch[2]) && h === 12) h = 0;
        startTime = `${String(h).padStart(2, '0')}:${m}:00`;
      }
    }

    const venueName = parts[1] || null;
    const city = parts.length >= 4 ? parts[3] : parts.length === 3 && !/\d/.test(parts[2]) ? parts[2] : null;

    items.push({ title, link, startDate, startTime, venueName, city });
  }

  return items;
}

// ── Main scraper ────────────────────────────────────────────────────────

const FEED_URLS = [
  'https://weekendbroward.com/events/feed/',
  'https://weekendbroward.com/events/feed/?event_category=live-music',
  'https://weekendbroward.com/events/feed/?event_category=comedy',
  'https://weekendbroward.com/events/feed/?event_category=karaoke',
  'https://weekendbroward.com/events/feed/?event_category=jazz',
];

const PAGE_URLS = [
  'https://weekendbroward.com/events/',
  'https://weekendbroward.com/live-music/',
  'https://weekendbroward.com/comedy-open-mics/',
  'https://weekendbroward.com/south-florida-jazz/',
];

export class WeekendBrowardPowScraper extends BaseScraper {
  private cookie: string | null = null;

  constructor() {
    super('WeekendBroward PoW', { weight: 1.3, rateLimit: 1500 });
  }

  async scrape(): Promise<RawEvent[]> {
    this.log('Attempting SiteGround PoW bypass...');

    // Step 1: Solve PoW and get cookie
    try {
      await this.solveSiteGroundChallenge(FEED_URLS[0]);
    } catch (err) {
      this.logError('PoW challenge failed', err);
      // Try HTML pages instead
      try {
        await this.solveSiteGroundChallenge(PAGE_URLS[0]);
      } catch (err2) {
        this.logError('PoW challenge failed for HTML page too', err2);
        return [];
      }
    }

    if (!this.cookie) {
      this.log('No cookie obtained — cannot access site');
      return [];
    }

    // Step 2: Try RSS feeds first (most data)
    const rssEvents = await this.tryRssFeeds();
    if (rssEvents.length > 0) {
      return rssEvents;
    }

    // Step 3: Fall back to HTML page scraping
    this.log('RSS feeds blocked, trying HTML pages...');
    return this.tryHtmlPages();
  }

  private async solveSiteGroundChallenge(targetUrl: string): Promise<void> {
    // Request the target page to get the challenge redirect
    const r1 = await this.fetchRaw(targetUrl);
    const body1 = await r1.text();

    // Check if we got the content directly (no challenge)
    if (body1.includes('<rss') || body1.includes('<item>') || body1.includes('em-event')) {
      this.log('No SiteGround challenge — direct access!');
      return;
    }

    // Extract meta-refresh redirect to captcha page
    const metaMatch = body1.match(/content="0;([^"]+)"/);
    if (!metaMatch) {
      // Check if there's a challenge inline
      const inlineChallenge = body1.match(/sgchallenge="([^"]+)"/);
      if (inlineChallenge) {
        await this.solveAndSubmit(inlineChallenge[1], body1, targetUrl);
        return;
      }
      throw new Error('No SiteGround challenge redirect found');
    }

    const challengeUrl = new URL(metaMatch[1], targetUrl).toString();
    this.log(`Challenge URL: ${challengeUrl}`);

    // Fetch the challenge page
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

    // Submit solution
    const baseUrl = new URL(targetUrl).origin;
    const sep = submitPath.includes('?') ? '&' : '?';
    const solUrl = `${baseUrl}${submitPath}${sep}sol=${encodeURIComponent(solution)}&s=${elapsed}:${hashes}`;

    const r3 = await this.fetchRaw(solUrl);
    const body3 = await r3.text();

    // Extract _I_ cookie from the response body (set via JavaScript)
    const cookieMatch = body3.match(/_I_=([^;]+)/);
    if (cookieMatch) {
      this.cookie = `_I_=${cookieMatch[1]}`;
      this.log(`Got _I_ cookie: ${this.cookie.substring(0, 30)}...`);
    } else {
      this.log('Warning: No _I_ cookie found in solution response');
    }
  }

  private async tryRssFeeds(): Promise<RawEvent[]> {
    const events: RawEvent[] = [];
    const seen = new Set<string>();

    for (const url of FEED_URLS) {
      try {
        const response = await this.fetchWithCookie(url);
        const xml = await response.text();

        if (!xml.includes('<rss') && !xml.includes('<item>') && !xml.includes('<?xml')) {
          const status = response.status;
          this.log(`RSS feed ${url} returned non-XML (status ${status}, ${xml.length} chars)`);
          if (xml.includes('403') || xml.includes('Forbidden')) {
            this.log('Origin server blocked request (403) — IP may be blocked');
          }
          continue;
        }

        const items = parseRssItems(xml);
        const now = new Date();

        for (const item of items) {
          if (!item.startDate) continue;

          const [m, d, y] = item.startDate.split('/');
          if (!m || !d || !y) continue;

          const t = item.startTime ?? '00:00:00';
          const startAt = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}T${t}`;
          if (new Date(startAt) < now) continue;

          const key = `${item.title}|${startAt}`;
          if (seen.has(key)) continue;
          seen.add(key);

          const rawCity = item.city ?? '';
          const city = resolveCity(rawCity);
          if (!city) continue;

          const category = this.categorizeEvent(item.title, '');
          const tags = this.generateTags(item.title, '', category);
          const isOutdoor = this.isOutdoor(item.title, '', item.venueName ?? '');

          events.push({
            title: item.title,
            startAt,
            venueName: item.venueName ?? undefined,
            neighborhood: resolveNeighborhood(rawCity),
            lat: null,
            lng: null,
            city,
            tags: tags.slice(0, 5),
            category,
            isOutdoor,
            description: `${item.title}${item.venueName ? ` at ${item.venueName}` : ''}`,
            sourceUrl: item.link || url,
            sourceName: this.name,
            ticketUrl: item.link || undefined,
          });
        }
      } catch (err) {
        this.logError(`Failed to fetch RSS ${url}`, err);
      }
    }

    this.log(`Found ${events.length} events from RSS feeds`);
    return events;
  }

  private async tryHtmlPages(): Promise<RawEvent[]> {
    const events: RawEvent[] = [];
    const seen = new Set<string>();

    for (const url of PAGE_URLS) {
      try {
        const response = await this.fetchWithCookie(url);
        const html = await response.text();

        if (html.includes('403') && html.length < 100) {
          this.log(`HTML page ${url} returned 403`);
          continue;
        }

        // Parse Events Manager HTML
        const pageEvents = this.parseEventsManagerHtml(html, url);
        for (const event of pageEvents) {
          const key = `${event.title}|${event.startAt}`;
          if (!seen.has(key)) {
            seen.add(key);
            events.push(event);
          }
        }
      } catch (err) {
        this.logError(`Failed to fetch HTML ${url}`, err);
      }
    }

    this.log(`Found ${events.length} events from HTML pages`);
    return events;
  }

  private parseEventsManagerHtml(html: string, sourceUrl: string): RawEvent[] {
    const events: RawEvent[] = [];
    const now = new Date();

    // Events Manager uses .em-event elements
    const eventPattern = /class="em-event[^"]*"[^>]*>([\s\S]*?)(?=class="em-event|$)/g;
    const titlePattern = /class="em-event-name[^"]*"[^>]*><a[^>]*>([^<]+)/;
    const whenPattern = /class="em-event-when[^"]*"[^>]*>([^<]+)/;
    const wherePattern = /class="em-event-where[^"]*"[^>]*>([^<]+)/;
    const linkPattern = /href="(https?:\/\/weekendbroward\.com\/events\/[^"]+)"/;

    let match;
    while ((match = eventPattern.exec(html)) !== null) {
      const block = match[1];

      const titleMatch = titlePattern.exec(block);
      const title = titleMatch?.[1]?.trim();
      if (!title) continue;

      const whenMatch = whenPattern.exec(block);
      const when = whenMatch?.[1]?.trim() ?? '';

      const whereMatch = wherePattern.exec(block);
      const where = whereMatch?.[1]?.trim() ?? '';

      const linkMatch = linkPattern.exec(block);
      const link = linkMatch?.[1] ?? sourceUrl;

      // Parse date from "when" text
      const dateMatch = when.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
      if (!dateMatch) continue;

      const startAt = `${dateMatch[3]}-${dateMatch[1].padStart(2, '0')}-${dateMatch[2].padStart(2, '0')}T00:00:00`;
      if (new Date(startAt) < now) continue;

      const whereParts = where.split(',').map((p: string) => p.trim());
      const venueName = whereParts[0] || undefined;
      const rawCity = whereParts[whereParts.length - 1] || '';
      const city = resolveCity(rawCity);
      if (!city) continue;

      const category = this.categorizeEvent(title, '');
      const tags = this.generateTags(title, '', category);

      events.push({
        title,
        startAt,
        venueName,
        neighborhood: resolveNeighborhood(rawCity),
        lat: null,
        lng: null,
        city,
        tags: tags.slice(0, 5),
        category,
        isOutdoor: this.isOutdoor(title, '', venueName ?? ''),
        description: `${title}${venueName ? ` at ${venueName}` : ''}`,
        sourceUrl: link,
        sourceName: this.name,
        ticketUrl: link,
      });
    }

    return events;
  }

  private categorizeEvent(title: string, desc: string): string {
    const text = `${title} ${desc}`.toLowerCase();
    if (/comedy|improv|open.mic|stand.up/.test(text)) return 'Comedy';
    if (/karaoke|trivia|bingo/.test(text)) return 'Nightlife';
    if (/jazz|blues|soul/.test(text)) return 'Music';
    if (/rock|punk|metal|hip.hop|rap|reggae|concert|live music|band|tribute|fest.*music/.test(text)) return 'Music';
    if (/beer|wine|spirits|cocktail|food.*fest|market|chef|culinary/.test(text)) return 'Food & Drink';
    if (/art|gallery|exhibit|museum|film|theater/.test(text)) return 'Art';
    if (/5k|run|marathon|fitness|yoga/.test(text)) return 'Fitness';
    if (/festival|fair|carnival|parade|heritage/.test(text)) return 'Culture';
    return 'Culture';
  }

  /**
   * Raw fetch without BaseScraper's error handling (we need to handle
   * non-200 responses ourselves for the challenge flow).
   */
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

  /**
   * Fetch with the _I_ cookie attached.
   */
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
