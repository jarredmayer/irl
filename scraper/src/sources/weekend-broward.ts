/**
 * WeekendBroward Events Scraper
 *
 * Sources:
 *  - https://weekendbroward.com/events/   — general Broward events calendar
 *  - https://weekendbroward.com/live-music/ — live music listings
 *
 * Both calendars are powered by the Events Manager WordPress plugin.
 * The general events RSS feed is the most reliable access point:
 *   https://weekendbroward.com/events/feed/
 *
 * RSS item format:
 *   <title>Event Name</title>
 *   <link>https://weekendbroward.com/events/slug/</link>
 *   <pubDate>Fri, 27 Feb 2026 22:00:00 +0000</pubDate>
 *   <description><![CDATA[02/27/2026 - 03/01/2026 - 5:00 pm <br />Venue Name <br />Street Address <br />City]]></description>
 *
 * Filtering: Broward County cities only. Excludes Palm Beach County
 * (Boca Raton, Delray Beach, Wellington, Jupiter, Lake Worth, etc.)
 */

import { BaseScraper } from './base.js';
import { PuppeteerScraper } from './puppeteer-base.js';
import type { RawEvent } from '../types.js';

const FEED_URLS = [
  'https://weekendbroward.com/events/feed/',
  'https://weekendbroward.com/events/feed/?event_category=live-music',
];

// Broward County cities — events outside this set are filtered out
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

// City → neighborhood mapping for FLL service area
function cityToNeighborhood(city: string): string {
  const c = city.toLowerCase().trim();
  if (c.includes('fort lauderdale') || c.includes('ft. lauderdale') || c.includes('ft lauderdale')) return 'Downtown FLL';
  if (c === 'hollywood') return 'Hollywood';
  if (c === 'pompano beach') return 'Pompano Beach';
  if (c === 'dania beach' || c === 'dania') return 'Dania Beach';
  if (c === 'miramar') return 'Miramar';
  if (c === 'davie') return 'Davie';
  if (c === 'hallandale beach' || c === 'hallandale') return 'Hallandale Beach';
  if (c === 'coral springs') return 'Coral Springs';
  if (c === 'sunrise') return 'Sunrise';
  if (c === 'plantation') return 'Plantation';
  if (c === 'weston') return 'Weston';
  if (c === 'cooper city') return 'Cooper City';
  if (c === 'pembroke pines') return 'Pembroke Pines';
  if (c === 'wilton manors') return 'Wilton Manors';
  if (c === 'oakland park') return 'Oakland Park';
  if (c === 'deerfield beach') return 'Deerfield Beach';
  if (c === 'parkland') return 'Parkland';
  if (c === 'lauderdale-by-the-sea' || c === 'lauderdale by the sea') return 'Lauderdale-By-The-Sea';
  return 'Fort Lauderdale';
}

interface ParsedDescription {
  startDate: string | null;    // MM/DD/YYYY
  endDate: string | null;      // MM/DD/YYYY (multi-day events)
  startTime: string | null;    // HH:MM (24h)
  endTime: string | null;      // HH:MM (24h)
  venueName: string | null;
  streetAddress: string | null;
  city: string | null;
}

/**
 * Parse the CDATA description block.
 * Format: `MM/DD/YYYY [- MM/DD/YYYY] - H:MM am/pm [- H:MM am/pm] <br />Venue <br />Address <br />City`
 */
function parseDescription(raw: string): ParsedDescription {
  const result: ParsedDescription = {
    startDate: null, endDate: null,
    startTime: null, endTime: null,
    venueName: null, streetAddress: null, city: null,
  };

  // Split on <br /> variants
  const parts = raw.split(/<br\s*\/?>/i).map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) return result;

  // First part contains dates and times
  const datePart = parts[0];

  // Extract all MM/DD/YYYY dates
  const dateMatches = [...datePart.matchAll(/(\d{2}\/\d{2}\/\d{4})/g)];
  if (dateMatches.length >= 1) result.startDate = dateMatches[0][1];
  if (dateMatches.length >= 2) result.endDate = dateMatches[1][1];

  // Extract times — matches patterns like "5:00 pm", "6:00-10:00 pm", "6:00 pm - 9:00 pm"
  // Normalize to 24h
  const timeStr = datePart.replace(/\d{2}\/\d{2}\/\d{4}/g, '').trim().replace(/^[-\s]+/, '');
  const timeMatch = timeStr.match(/(\d{1,2}:\d{2})\s*(?:-\s*(\d{1,2}:\d{2}))?\s*(am|pm)/i);
  if (timeMatch) {
    result.startTime = normalizeTime(timeMatch[1], timeMatch[3]);
    if (timeMatch[2]) {
      result.endTime = normalizeTime(timeMatch[2], timeMatch[3]);
    }
  } else {
    // Try "6:00-10:00 pm" compressed format
    const compactMatch = timeStr.match(/(\d{1,2}:\d{2})-(\d{1,2}:\d{2})\s*(am|pm)/i);
    if (compactMatch) {
      result.startTime = normalizeTime(compactMatch[1], compactMatch[3]);
      result.endTime = normalizeTime(compactMatch[2], compactMatch[3]);
    }
  }

  // Remaining parts: venue, address, city
  if (parts.length >= 2) result.venueName = parts[1];
  if (parts.length >= 3) result.streetAddress = parts[2];
  if (parts.length >= 4) result.city = parts[3];
  // If only 3 parts (no separate street), last part may be city
  else if (parts.length === 3) {
    // Heuristic: if part[2] looks like a city name (no numbers), treat as city
    if (!/\d/.test(parts[2])) {
      result.city = parts[2];
      result.streetAddress = null;
    } else {
      result.streetAddress = parts[2];
    }
  }

  return result;
}

function normalizeTime(hhmm: string, ampm: string): string {
  const [hStr, mStr] = hhmm.split(':');
  let h = parseInt(hStr, 10);
  const m = mStr ?? '00';
  const isPm = /pm/i.test(ampm);
  if (isPm && h < 12) h += 12;
  if (!isPm && h === 12) h = 0;
  return `${String(h).padStart(2, '0')}:${m.padStart(2, '0')}:00`;
}

/** Convert MM/DD/YYYY + HH:MM:SS to ISO datetime */
function toIso(date: string, time: string | null): string | null {
  const [m, d, y] = date.split('/');
  if (!m || !d || !y) return null;
  const t = time ?? '00:00:00';
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}T${t}`;
}

function categorizeEvent(title: string, desc: string): string {
  const text = `${title} ${desc}`.toLowerCase();
  if (/jazz|blues|soul|folk|indie|rock|punk|metal|hip.hop|rap|reggae|country|orchestra|symphony|concert|live music|band|musician|singer|performer|tribute|fest.*music|music.*fest/i.test(text)) return 'Music';
  if (/beer|wine|spirits|cocktail|brew|distill|cider|sip|taste|food.*fest|fest.*food|market|eat|dine|chef|culinary|gourmet|bbq|barbecue|taco|burger|pizza|garlic/i.test(text)) return 'Food & Drink';
  if (/art|gallery|exhibit|sculpture|paint|mural|museum|photo|film|cinema|theater|theatre|dance|ballet|opera|comedy|improv/i.test(text)) return 'Art';
  if (/5k|run|race|marathon|walk|cycle|fitness|yoga|wellness|sport|game|tournament/i.test(text)) return 'Fitness';
  if (/parade|festival|fair|carnival|block party|block.party|celebration|heritage|cultural|multicultural|fiesta|fourth of july|independence/i.test(text)) return 'Culture';
  return 'Culture';
}

// --- Live Music page helpers (Puppeteer path) ---

/**
 * Parse the "em-event-when" text rendered by Events Manager.
 * Handles: "March 1, 2026 @ 8:00pm", "03/01/2026 @ 8:00pm", "Fri, 01 Mar 2026 @ 8:00pm"
 */
function parseLiveMusicWhen(when: string): { startDate: string | null; startTime: string | null } {
  if (!when) return { startDate: null, startTime: null };

  // Format 1: MM/DD/YYYY (same as RSS description)
  const mdyMatch = when.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (mdyMatch) {
    const startDate = `${mdyMatch[1].padStart(2, '0')}/${mdyMatch[2].padStart(2, '0')}/${mdyMatch[3]}`;
    return { startDate, startTime: extractTimeFromWhen(when) };
  }

  // Format 2: "March 1, 2026" or "Mar 1, 2026"
  const MONTH_MAP: Record<string, string> = {
    january: '01', february: '02', march: '03', april: '04', may: '05', june: '06',
    july: '07', august: '08', september: '09', october: '10', november: '11', december: '12',
    jan: '01', feb: '02', mar: '03', apr: '04', jun: '06', jul: '07',
    aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
  };
  const namedMatch = when.match(/([a-z]+)\s+(\d{1,2}),?\s+(\d{4})/i);
  if (namedMatch) {
    const m = MONTH_MAP[namedMatch[1].toLowerCase()];
    if (m) {
      const startDate = `${m}/${namedMatch[2].padStart(2, '0')}/${namedMatch[3]}`;
      return { startDate, startTime: extractTimeFromWhen(when) };
    }
  }

  // Format 3: "01 Mar 2026" (D Mon YYYY)
  const dMonYMatch = when.match(/(\d{1,2})\s+([a-z]{3,9})\s+(\d{4})/i);
  if (dMonYMatch) {
    const MONTH_MAP2: Record<string, string> = {
      jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
      jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
      january: '01', february: '02', march: '03', april: '04', june: '06',
      july: '07', august: '08', september: '09', october: '10', november: '11', december: '12',
    };
    const m = MONTH_MAP2[dMonYMatch[2].toLowerCase()];
    if (m) {
      const startDate = `${m}/${dMonYMatch[1].padStart(2, '0')}/${dMonYMatch[3]}`;
      return { startDate, startTime: extractTimeFromWhen(when) };
    }
  }

  return { startDate: null, startTime: null };
}

function extractTimeFromWhen(when: string): string | null {
  const timeMatch = when.match(/(\d{1,2}:\d{2})\s*(am|pm)/i);
  if (!timeMatch) return null;
  return normalizeTime(timeMatch[1], timeMatch[2]);
}

// --- RSS scraper ---

export class WeekendBrowardScraper extends BaseScraper {
  private readonly FEED_URL = FEED_URLS[0];

  constructor() {
    super('WeekendBroward', { weight: 1.3, rateLimit: 1500 });
  }

  async scrape(): Promise<RawEvent[]> {
    this.log('Fetching WeekendBroward events RSS feed...');

    const events: RawEvent[] = [];
    const seen = new Set<string>(); // dedup by title+date

    for (const url of FEED_URLS) {
      try {
        const feedEvents = await this.scrapeFeed(url);
        for (const e of feedEvents) {
          const key = `${e.title}|${e.startAt}`;
          if (!seen.has(key)) {
            seen.add(key);
            events.push(e);
          }
        }
      } catch (err) {
        this.logError(`Failed to fetch ${url}`, err);
      }
    }

    this.log(`Found ${events.length} Broward County events`);
    return events;
  }

  private async scrapeFeed(url: string): Promise<RawEvent[]> {
    const response = await this.fetch(url, {
      headers: { Accept: 'application/rss+xml, application/xml, text/xml, */*' },
    });
    const xml = await response.text();

    // Parse RSS items using regex on predictable structure
    const itemPattern = /<item>([\s\S]*?)<\/item>/gi;
    const titlePattern = /<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>|<title>([\s\S]*?)<\/title>/i;
    const linkPattern = /<link>([\s\S]*?)<\/link>/i;
    const descPattern = /<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>|<description>([\s\S]*?)<\/description>/i;

    const events: RawEvent[] = [];
    const now = new Date();
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

      const parsed = parseDescription(descRaw);

      // City filter: Broward County only
      const cityNorm = (parsed.city ?? '').toLowerCase().trim();
      if (parsed.city && !BROWARD_CITIES.has(cityNorm)) {
        continue; // Skip Palm Beach County and other non-Broward events
      }

      if (!parsed.startDate) continue;

      const startAt = toIso(parsed.startDate, parsed.startTime);
      if (!startAt) continue;

      // Skip past events
      if (new Date(startAt) < now) continue;

      const endAt = parsed.endDate ? toIso(parsed.endDate, parsed.endTime ?? parsed.startTime) : undefined;

      const city = parsed.city ?? '';
      const neighborhood = cityToNeighborhood(city);

      const descriptionText = [parsed.venueName, parsed.streetAddress, city]
        .filter(Boolean).join(', ');
      const fullDesc = `${title}. ${descriptionText}`.replace(/^\.?\s*/, '');

      const category = categorizeEvent(title, fullDesc);
      const tags = this.generateTags(title, fullDesc, category);
      const isOutdoor = this.isOutdoor(title, fullDesc, parsed.venueName ?? '');

      const address = [parsed.streetAddress, city, 'FL'].filter(Boolean).join(', ');

      events.push({
        title,
        startAt,
        ...(endAt ? { endAt } : {}),
        venueName: parsed.venueName ?? undefined,
        address: address || undefined,
        neighborhood,
        lat: null,
        lng: null,
        city: 'Fort Lauderdale',
        tags,
        category,
        isOutdoor,
        description: fullDesc,
        sourceUrl: sourceUrl || this.FEED_URL,
        sourceName: this.name,
        ticketUrl: sourceUrl || undefined,
      });
    }

    return events;
  }
}

// --- Puppeteer scraper for /live-music/ (JS-rendered Events Manager page) ---

/**
 * Scrapes the dynamically-loaded live music calendar at weekendbroward.com/live-music/.
 * The page is rendered by the Events Manager WordPress plugin via AJAX,
 * so we use Puppeteer to wait for the DOM to settle before extracting events.
 */
export class WeekendBrowardLiveMusicScraper extends PuppeteerScraper {
  constructor() {
    super('WeekendBrowardLiveMusic', { weight: 1.3, rateLimit: 2000 });
  }

  protected async scrapeWithBrowser(): Promise<RawEvent[]> {
    this.log('Fetching WeekendBroward live music page...');

    try {
      await this.navigateTo('https://weekendbroward.com/live-music/');
    } catch {
      this.logError('Navigation failed', new Error('Page load timeout'));
      return [];
    }

    // Give AJAX time to populate the events list
    await this.sleep(3000);
    await this.scrollPage(5);

    const rawItems = await this.extractData(() => {
      const results: Array<{ title: string; link: string; when: string; where: string }> = [];
      const els = document.querySelectorAll('.em-event, article.type-event');
      for (const el of Array.from(els)) {
        const titleEl = el.querySelector('.em-event-name a, .entry-title a');
        if (!titleEl || !titleEl.textContent?.trim()) continue;
        results.push({
          title: titleEl.textContent.trim(),
          link: titleEl.getAttribute('href') ?? '',
          when: el.querySelector('.em-event-when')?.textContent?.trim() ?? '',
          where: el.querySelector('.em-event-where')?.textContent?.trim() ?? '',
        });
      }
      return results;
    });

    const events: RawEvent[] = [];
    const now = new Date();

    for (const { title, link, when, where } of rawItems) {
      if (!title || title.length < 3) continue;

      const { startDate, startTime } = parseLiveMusicWhen(when);
      if (!startDate) continue;

      const startAt = toIso(startDate, startTime);
      if (!startAt || new Date(startAt) < now) continue;

      // Parse venue/address/city from the "where" text: "Venue Name, Street, City"
      const whereParts = where.split(',').map((p) => p.trim()).filter(Boolean);
      const venueName = whereParts[0];
      const city = whereParts.length >= 2 ? whereParts[whereParts.length - 1] : '';
      const streetAddress = whereParts.length >= 3 ? whereParts.slice(1, -1).join(', ') : undefined;

      // Broward County filter
      const cityNorm = city.toLowerCase().trim();
      if (city && !BROWARD_CITIES.has(cityNorm)) continue;

      const neighborhood = cityToNeighborhood(city);
      const descText = `${title}. ${[venueName, streetAddress, city].filter(Boolean).join(', ')}`;
      const category = categorizeEvent(title, `${descText} live music`);
      const tags = this.generateTags(title, `${descText} live music`, category);
      const isOutdoor = this.isOutdoor(title, descText, venueName ?? '');
      const address = [streetAddress, city, 'FL'].filter(Boolean).join(', ');

      events.push({
        title,
        startAt,
        venueName,
        address: address || undefined,
        neighborhood,
        lat: null,
        lng: null,
        city: 'Fort Lauderdale',
        tags,
        category,
        isOutdoor,
        description: descText,
        sourceUrl: link || 'https://weekendbroward.com/live-music/',
        sourceName: this.name,
        ticketUrl: link || undefined,
      });
    }

    this.log(`Found ${events.length} live music events`);
    return events;
  }
}
