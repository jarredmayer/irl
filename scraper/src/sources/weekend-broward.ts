/**
 * WeekendBroward Events Scrapers
 *
 * Sources — Broward County:
 *  - /events/           — general Broward events calendar (RSS)
 *  - /live-music/       — live music listings (Puppeteer)
 *  - /comedy-open-mics/ — comedy & open mic (Puppeteer)
 *  - /karaoke/          — karaoke, trivia, music bingo (Puppeteer)
 *  - /south-florida-jazz/ — jazz calendar (Puppeteer)
 *
 * Sources — Palm Beach County:
 *  - /live-music-boca-delray-palm-beach/ — PB live music (Puppeteer)
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
 */

import { BaseScraper } from './base.js';
import { PuppeteerScraper } from './puppeteer-base.js';
import type { RawEvent } from '../types.js';

// ── RSS feed URLs ────────────────────────────────────────────────────────
const FEED_URLS = [
  'https://weekendbroward.com/events/feed/',
  'https://weekendbroward.com/events/feed/?event_category=live-music',
  'https://weekendbroward.com/events/feed/?event_category=comedy',
  'https://weekendbroward.com/events/feed/?event_category=karaoke',
  'https://weekendbroward.com/events/feed/?event_category=jazz',
];

// ── City sets ────────────────────────────────────────────────────────────

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

// ── Neighborhood mappings ────────────────────────────────────────────────

function browardNeighborhood(city: string): string {
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

function palmBeachNeighborhood(city: string): string {
  const c = city.toLowerCase().trim();
  if (c === 'boca raton') return 'Boca Raton';
  if (c === 'delray beach') return 'Delray Beach';
  if (c === 'boynton beach') return 'Boynton Beach';
  if (c === 'lake worth' || c === 'lake worth beach') return 'Lake Worth';
  if (c === 'palm beach gardens') return 'Palm Beach Gardens';
  if (c === 'jupiter' || c === 'juno beach' || c === 'tequesta') return 'Jupiter';
  if (c === 'wellington') return 'Wellington';
  if (c === 'north palm beach' || c === 'palm beach shores' || c === 'singer island') return 'North Palm Beach';
  if (c === 'riviera beach') return 'Riviera Beach';
  if (c === 'royal palm beach') return 'Royal Palm Beach';
  if (c === 'lantana') return 'Lantana';
  if (c === 'greenacres' || c === 'palm springs') return 'Greenacres';
  return 'West Palm Beach';
}

/** Resolve city + neighborhood from a raw city string */
function resolveLocation(rawCity: string): { city: 'Fort Lauderdale' | 'Palm Beach'; neighborhood: string } | null {
  const c = rawCity.toLowerCase().trim();
  if (BROWARD_CITIES.has(c)) return { city: 'Fort Lauderdale', neighborhood: browardNeighborhood(rawCity) };
  if (PALM_BEACH_CITIES.has(c)) return { city: 'Palm Beach', neighborhood: palmBeachNeighborhood(rawCity) };
  return null; // Unknown city — skip
}

// ── Shared parsing helpers ───────────────────────────────────────────────

interface ParsedDescription {
  startDate: string | null;
  endDate: string | null;
  startTime: string | null;
  endTime: string | null;
  venueName: string | null;
  streetAddress: string | null;
  city: string | null;
}

function parseDescription(raw: string): ParsedDescription {
  const result: ParsedDescription = {
    startDate: null, endDate: null,
    startTime: null, endTime: null,
    venueName: null, streetAddress: null, city: null,
  };
  const parts = raw.split(/<br\s*\/?>/i).map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) return result;

  const datePart = parts[0];
  const dateMatches = [...datePart.matchAll(/(\d{1,2}\/\d{1,2}\/\d{4})/g)];
  if (dateMatches.length >= 1) result.startDate = dateMatches[0][1];
  if (dateMatches.length >= 2) result.endDate = dateMatches[1][1];

  const timeStr = datePart.replace(/\d{2}\/\d{2}\/\d{4}/g, '').trim().replace(/^[-\s]+/, '');
  const timeMatch = timeStr.match(/(\d{1,2}:\d{2})\s*(?:-\s*(\d{1,2}:\d{2}))?\s*(am|pm)/i);
  if (timeMatch) {
    result.startTime = normalizeTime(timeMatch[1], timeMatch[3]);
    if (timeMatch[2]) result.endTime = normalizeTime(timeMatch[2], timeMatch[3]);
  } else {
    const compactMatch = timeStr.match(/(\d{1,2}:\d{2})-(\d{1,2}:\d{2})\s*(am|pm)/i);
    if (compactMatch) {
      result.startTime = normalizeTime(compactMatch[1], compactMatch[3]);
      result.endTime = normalizeTime(compactMatch[2], compactMatch[3]);
    }
  }

  if (parts.length >= 2) result.venueName = parts[1];
  if (parts.length >= 3) result.streetAddress = parts[2];
  if (parts.length >= 4) result.city = parts[3];
  else if (parts.length === 3) {
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

function toIso(date: string, time: string | null): string | null {
  const [m, d, y] = date.split('/');
  if (!m || !d || !y) return null;
  const t = time ?? '00:00:00';
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}T${t}`;
}

function categorizeEvent(title: string, desc: string): string {
  const text = `${title} ${desc}`.toLowerCase();
  if (/comedy|improv|open.mic|stand.up|comedian/i.test(text)) return 'Comedy';
  if (/karaoke|trivia|bingo/i.test(text)) return 'Nightlife';
  if (/jazz|blues|soul/i.test(text)) return 'Music';
  if (/folk|indie|rock|punk|metal|hip.hop|rap|reggae|country|orchestra|symphony|concert|live music|band|musician|singer|performer|tribute|fest.*music|music.*fest/i.test(text)) return 'Music';
  if (/beer|wine|spirits|cocktail|brew|distill|cider|sip|taste|food.*fest|fest.*food|market|eat|dine|chef|culinary|gourmet|bbq|barbecue|taco|burger|pizza|garlic/i.test(text)) return 'Food & Drink';
  if (/art|gallery|exhibit|sculpture|paint|mural|museum|photo|film|cinema|theater|theatre|dance|ballet|opera/i.test(text)) return 'Art';
  if (/5k|run|race|marathon|walk|cycle|fitness|yoga|wellness|sport|game|tournament/i.test(text)) return 'Fitness';
  if (/parade|festival|fair|carnival|block party|block.party|celebration|heritage|cultural|multicultural|fiesta/i.test(text)) return 'Culture';
  return 'Culture';
}

function parseLiveMusicWhen(when: string): { startDate: string | null; startTime: string | null } {
  if (!when) return { startDate: null, startTime: null };

  const mdyMatch = when.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (mdyMatch) {
    const startDate = `${mdyMatch[1].padStart(2, '0')}/${mdyMatch[2].padStart(2, '0')}/${mdyMatch[3]}`;
    return { startDate, startTime: extractTimeFromWhen(when) };
  }

  const MONTH_MAP: Record<string, string> = {
    january: '01', february: '02', march: '03', april: '04', may: '05', june: '06',
    july: '07', august: '08', september: '09', october: '10', november: '11', december: '12',
    jan: '01', feb: '02', mar: '03', apr: '04', jun: '06', jul: '07',
    aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
  };
  const namedMatch = when.match(/([a-z]+)\s+(\d{1,2}),?\s+(\d{4})/i);
  if (namedMatch) {
    const m = MONTH_MAP[namedMatch[1].toLowerCase()];
    if (m) return { startDate: `${m}/${namedMatch[2].padStart(2, '0')}/${namedMatch[3]}`, startTime: extractTimeFromWhen(when) };
  }

  const dMonYMatch = when.match(/(\d{1,2})\s+([a-z]{3,9})\s+(\d{4})/i);
  if (dMonYMatch) {
    const MONTH_MAP2: Record<string, string> = {
      jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
      jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
      january: '01', february: '02', march: '03', april: '04', june: '06',
      july: '07', august: '08', september: '09', october: '10', november: '11', december: '12',
    };
    const m = MONTH_MAP2[dMonYMatch[2].toLowerCase()];
    if (m) return { startDate: `${m}/${dMonYMatch[1].padStart(2, '0')}/${dMonYMatch[3]}`, startTime: extractTimeFromWhen(when) };
  }

  return { startDate: null, startTime: null };
}

function extractTimeFromWhen(when: string): string | null {
  const timeMatch = when.match(/(\d{1,2}:\d{2})\s*(am|pm)/i);
  if (!timeMatch) return null;
  return normalizeTime(timeMatch[1], timeMatch[2]);
}

// ── Tag generation (standalone, mirrors BaseScraper.generateTags) ─────────

const TAG_PATTERNS: [RegExp, string][] = [
  [/rooftop/i, 'rooftop'], [/waterfront|marina|bay|harbor/i, 'waterfront'],
  [/beach/i, 'beach'], [/sunset/i, 'sunset'], [/sunrise/i, 'sunrise'],
  [/latin|salsa|bachata|merengue|reggaeton/i, 'latin'],
  [/jazz/i, 'jazz'], [/dj\b/i, 'dj'], [/electronic|edm|techno|house music/i, 'electronic'],
  [/live music|live band|concert/i, 'live-music'], [/hip.hop|rap\b/i, 'hip-hop'],
  [/danc/i, 'dancing'], [/art.*gallery|gallery/i, 'art-gallery'], [/museum/i, 'museum'],
  [/brunch/i, 'brunch'], [/happy.hour/i, 'happy-hour'], [/cocktail/i, 'cocktails'],
  [/wine/i, 'wine-tasting'], [/craft.beer|brewery/i, 'craft-beer'],
  [/outdoor.din/i, 'outdoor-dining'], [/food.market|farmers.market/i, 'food-market'],
  [/yoga/i, 'yoga'], [/meditat/i, 'meditation'], [/run\b|running|5k/i, 'running'],
  [/cycl|bike|bicycl/i, 'cycling'], [/fitness/i, 'fitness-class'],
  [/comedy|improv|stand.up/i, 'comedy'], [/pop.up/i, 'pop-up'],
  [/network/i, 'networking'], [/workshop/i, 'workshop'],
  [/famil|kid/i, 'family-friendly'], [/dog/i, 'dog-friendly'],
  [/free\b/i, 'free-event'], [/karaoke/i, 'dancing'], [/trivia/i, 'free-event'],
  [/bingo/i, 'free-event'], [/open.mic/i, 'live-music'],
];

function makeTags(title: string, desc: string, category: string): string[] {
  const text = `${title} ${desc}`.toLowerCase();
  const tags: string[] = [];
  for (const [pat, tag] of TAG_PATTERNS) {
    if (pat.test(text) && !tags.includes(tag)) tags.push(tag);
  }
  return tags;
}

function checkOutdoor(title: string, desc: string, venue: string): boolean {
  const text = `${title} ${desc} ${venue}`.toLowerCase();
  return /outdoor|rooftop|patio|garden|park|beach|poolside|terrace|courtyard|lawn|amphitheater|open.air/i.test(text);
}

// ── Helper to build RawEvent from parsed data ────────────────────────────

function buildEvent(
  title: string,
  startAt: string,
  endAt: string | undefined,
  venueName: string | undefined,
  streetAddress: string | undefined,
  rawCity: string,
  sourceUrl: string,
  sourceName: string,
  categoryHint?: string,
): RawEvent | null {
  const loc = resolveLocation(rawCity);
  if (!loc) return null;

  const descText = [venueName, streetAddress, rawCity].filter(Boolean).join(', ');
  const fullDesc = `${title}. ${descText}`.replace(/^\.?\s*/, '');
  const category = categoryHint || categorizeEvent(title, fullDesc);
  const tags = makeTags(title, fullDesc, category);
  const isOutdoor = checkOutdoor(title, fullDesc, venueName ?? '');
  const address = [streetAddress, rawCity, 'FL'].filter(Boolean).join(', ');

  return {
    title,
    startAt,
    ...(endAt ? { endAt } : {}),
    venueName,
    address: address || undefined,
    neighborhood: loc.neighborhood,
    lat: null,
    lng: null,
    city: loc.city,
    tags,
    category,
    isOutdoor,
    description: fullDesc,
    sourceUrl,
    sourceName,
    ticketUrl: sourceUrl || undefined,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
//  RSS Scraper — fetches all category feeds
// ═══════════════════════════════════════════════════════════════════════════

export class WeekendBrowardScraper extends BaseScraper {
  constructor() {
    super('WeekendBroward', { weight: 1.3, rateLimit: 1500 });
  }

  async scrape(): Promise<RawEvent[]> {
    this.log('Fetching WeekendBroward events RSS feeds...');

    const events: RawEvent[] = [];
    const seen = new Set<string>();

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

    this.log(`Found ${events.length} Broward/Palm Beach events from RSS`);
    return events;
  }

  private async scrapeFeed(url: string): Promise<RawEvent[]> {
    const response = await this.fetch(url, {
      headers: { Accept: 'application/rss+xml, application/xml, text/xml, */*' },
    });
    const xml = await response.text();

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

      if (!parsed.startDate) continue;
      const startAt = toIso(parsed.startDate, parsed.startTime);
      if (!startAt || new Date(startAt) < now) continue;

      const endAt = parsed.endDate ? toIso(parsed.endDate, parsed.endTime ?? parsed.startTime) : undefined;
      const rawCity = parsed.city ?? '';

      const event = buildEvent(
        title, startAt, endAt || undefined,
        parsed.venueName ?? undefined,
        parsed.streetAddress ?? undefined,
        rawCity, sourceUrl || url, this.name,
      );
      if (event) events.push(event);
    }

    return events;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//  Base Puppeteer class for WeekendBroward Events Manager pages
// ═══════════════════════════════════════════════════════════════════════════

abstract class WeekendBrowardPageScraper extends PuppeteerScraper {
  protected readonly pageUrl: string;
  protected readonly categoryHint?: string;

  constructor(name: string, pageUrl: string, categoryHint?: string) {
    super(name, { weight: 1.3, rateLimit: 2000 });
    this.pageUrl = pageUrl;
    this.categoryHint = categoryHint;
  }

  protected async scrapeWithBrowser(): Promise<RawEvent[]> {
    this.log(`Fetching ${this.pageUrl}...`);

    try {
      await this.navigateTo(this.pageUrl);
    } catch {
      this.logError('Navigation failed', new Error('Page load timeout'));
      return [];
    }

    await this.sleep(3000);
    await this.scrollPage(5);

    const rawItems = await this.extractData(() => {
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

    const events: RawEvent[] = [];
    const now = new Date();

    for (const { title, link, when, where } of rawItems) {
      if (!title || title.length < 3) continue;

      const { startDate, startTime } = parseLiveMusicWhen(when);
      if (!startDate) continue;

      const startAt = toIso(startDate, startTime);
      if (!startAt || new Date(startAt) < now) continue;

      const whereParts = where.split(',').map((p) => p.trim()).filter(Boolean);
      const venueName = whereParts[0];
      const rawCity = whereParts.length >= 2 ? whereParts[whereParts.length - 1] : '';
      const streetAddress = whereParts.length >= 3 ? whereParts.slice(1, -1).join(', ') : undefined;

      const event = buildEvent(
        title, startAt, undefined,
        venueName, streetAddress, rawCity,
        link || this.pageUrl, this.name,
        this.categoryHint,
      );
      if (event) events.push(event);
    }

    this.log(`Found ${events.length} events from ${this.pageUrl}`);
    return events;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//  Concrete Puppeteer scrapers for each page
// ═══════════════════════════════════════════════════════════════════════════

/** Broward Live Music Calendar */
export class WeekendBrowardLiveMusicScraper extends WeekendBrowardPageScraper {
  constructor() {
    super('WeekendBrowardLiveMusic', 'https://weekendbroward.com/live-music/', 'Music');
  }
}

/** Comedy & Open Mics (covers both Broward and Palm Beach) */
export class WeekendBrowardComedyScraper extends WeekendBrowardPageScraper {
  constructor() {
    super('WeekendBrowardComedy', 'https://weekendbroward.com/comedy-open-mics/', 'Comedy');
  }
}

/** Karaoke, Trivia and Music Bingo (Broward + Palm Beach) */
export class WeekendBrowardKaraokeScraper extends WeekendBrowardPageScraper {
  constructor() {
    super('WeekendBrowardKaraoke', 'https://weekendbroward.com/karaoke/', 'Nightlife');
  }
}

/** South Florida Jazz Calendar */
export class WeekendBrowardJazzScraper extends WeekendBrowardPageScraper {
  constructor() {
    super('WeekendBrowardJazz', 'https://weekendbroward.com/south-florida-jazz/', 'Music');
  }
}

/** Palm Beach Live Music Calendar */
export class WeekendBrowardPBLiveMusicScraper extends WeekendBrowardPageScraper {
  constructor() {
    super('WeekendBrowardPBLiveMusic', 'https://weekendbroward.com/live-music-boca-delray-palm-beach/', 'Music');
  }
}

/** Local Events — Broward & Palm Beach */
export class WeekendBrowardLocalEventsScraper extends WeekendBrowardPageScraper {
  constructor() {
    super('WeekendBrowardLocalEvents', 'https://weekendbroward.com/events/');
  }
}
