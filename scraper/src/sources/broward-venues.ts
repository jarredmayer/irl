/**
 * Broward County Venue Scrapers
 *
 * Real event data from specific FLL-area venues:
 *   - Culture Room (cultureroom.net)        — live music / concerts
 *   - Bonnet House (bonnethouse.org)         — museum, garden events, workshops
 *   - Funky Buddha Brewery (funkybuddha.com) — tap room events, run club, specials
 *   - Savor Cinema / FLIFF (fliff.com)       — independent film screenings
 */

import { BaseScraper } from './base.js';
import type { RawEvent } from '../types.js';

// ── Shared helpers ──────────────────────────────────────────────────────────

const CURRENT_YEAR = new Date().getFullYear();

const MONTH_MAP: Record<string, string> = {
  january: '01', february: '02', march: '03', april: '04',
  may: '05', june: '06', july: '07', august: '08',
  september: '09', october: '10', november: '11', december: '12',
  jan: '01', feb: '02', mar: '03', apr: '04',
  jun: '06', jul: '07', aug: '08', sep: '09',
  oct: '10', nov: '11', dec: '12',
};

function monthNameToNum(name: string): string | undefined {
  return MONTH_MAP[name.toLowerCase()];
}

// ═══════════════════════════════════════════════════════════════════════════
//  Culture Room — Fort Lauderdale's Premier Live Music Venue
//  Source: https://cultureroom.net/
//  Structure: Bandsintown-style — h2.preview-title (date) + h3.preview-subtitle (artist)
//             + Ticketmaster links per event
// ═══════════════════════════════════════════════════════════════════════════

export class CultureRoomScraper extends BaseScraper {
  constructor() {
    super('CultureRoom', { weight: 1.2, rateLimit: 2000 });
  }

  async scrape(): Promise<RawEvent[]> {
    this.log('Fetching Culture Room events...');

    const $ = await this.fetchHTMLNativeRetry('https://cultureroom.net/');
    const events: RawEvent[] = [];
    const now = new Date();

    // Collect dates (h2) and artists (h3) as parallel arrays
    const h2Texts: string[] = [];
    const h2Ids: string[] = [];
    $('h2.preview-element').each((_, el) => {
      h2Texts.push($(el).text().replace(/<br>/g, '').trim());
      h2Ids.push($(el).attr('id')?.replace(/-.*/, '') || '');
    });
    const h3Texts: string[] = [];
    $('h3.preview-element').each((_, el) => {
      h3Texts.push($(el).text().replace(/<br>/g, '').trim());
    });

    // Collect all Ticketmaster event links in order
    const tmLinks: string[] = [];
    $('a[href*="ticketmaster.com/event/"]').each((_, el) => {
      const href = $(el).attr('href');
      if (href && !tmLinks.includes(href)) tmLinks.push(href);
    });

    // Skip the first pair (venue title + address)
    for (let i = 1; i < h2Texts.length && i < h3Texts.length; i++) {
      const dateText = h2Texts[i];
      const artist = h3Texts[i];

      if (!dateText || !artist) continue;

      // Parse date like "Saturday, March 7" or "Sunday, April 26"
      const dateMatch = dateText.match(/(\w+),?\s+(\w+)\s+(\d{1,2})/);
      if (!dateMatch) continue;

      const monthNum = monthNameToNum(dateMatch[2]);
      if (!monthNum) continue;

      const day = dateMatch[3].padStart(2, '0');
      // Determine year — if the month is before current month, it's next year
      const monthInt = parseInt(monthNum, 10);
      const currentMonth = now.getMonth() + 1;
      const year = monthInt < currentMonth ? CURRENT_YEAR + 1 : CURRENT_YEAR;
      const startAt = `${year}-${monthNum}-${day}T20:00:00`;

      if (new Date(startAt) < now) continue;

      // Find Ticketmaster link near this event
      let ticketUrl: string | undefined;
      const parentId = h2Ids[i];
      if (parentId) {
        const section = $(`[id^="${parentId}"]`).closest('div');
        const tmLink = section.find('a[href*="ticketmaster.com/event/"]').first();
        if (tmLink.length) {
          ticketUrl = tmLink.attr('href') || undefined;
        }
      }

      // Fallback: assign TM links by index
      if (!ticketUrl && i - 1 < tmLinks.length) {
        ticketUrl = tmLinks[i - 1];
      }

      const title = this.titleCase(artist);
      const category = 'Music';
      const tags = this.generateTags(title, '', category);
      if (!tags.includes('live-music')) tags.unshift('live-music');

      events.push({
        title,
        startAt,
        venueName: 'Culture Room',
        address: '3045 N Federal Hwy, Fort Lauderdale, FL 33306',
        neighborhood: 'Fort Lauderdale Beach',
        lat: 26.1466,
        lng: -80.1193,
        city: 'Fort Lauderdale',
        tags: tags.slice(0, 5),
        category,
        isOutdoor: false,
        description: `${title} live at Culture Room, Fort Lauderdale's premier live music venue.`,
        sourceUrl: 'https://cultureroom.net/',
        sourceName: this.name,
        ticketUrl,
      });
    }

    this.log(`Found ${events.length} Culture Room events`);
    return events;
  }

  private titleCase(str: string): string {
    // Convert "GARY NUMAN" → "Gary Numan", but keep short words lowercase
    const lower = ['x', 'vs', 'and', 'the', 'of', 'at', 'in', 'a'];
    return str
      .split(/\s+/)
      .map((word, i) => {
        const w = word.toLowerCase();
        if (i > 0 && lower.includes(w)) return w;
        return w.charAt(0).toUpperCase() + w.slice(1);
      })
      .join(' ');
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//  Bonnet House Museum & Gardens — Fort Lauderdale
//  Source: https://www.bonnethouse.org/wp-json/tribe/events/v1/events
//  Uses The Events Calendar REST API (Tribe Events)
// ═══════════════════════════════════════════════════════════════════════════

interface TribeEvent {
  id: number;
  title: string;
  description: string;
  url: string;
  start_date: string;
  end_date: string;
  all_day: boolean;
  categories: Array<{ name: string; slug: string }>;
  tags: Array<{ name: string; slug: string }>;
  venue?: {
    venue: string;
    address: string;
    city: string;
    state: string;
    zip: string;
  };
  cost?: string;
  cost_details?: { values: string[] };
  image?: { url: string };
}

interface TribeResponse {
  events: TribeEvent[];
  total: number;
  total_pages: number;
}

export class BonnetHouseScraper extends BaseScraper {
  constructor() {
    super('BonnetHouse', { weight: 1.0, rateLimit: 2000 });
  }

  async scrape(): Promise<RawEvent[]> {
    this.log('Fetching Bonnet House events via Tribe API...');

    const today = new Date().toISOString().split('T')[0];
    const url = `https://www.bonnethouse.org/wp-json/tribe/events/v1/events?per_page=50&start_date=${today}`;

    const data = await this.fetchJSONNativeGet<TribeResponse>(url);
    const events: RawEvent[] = [];
    const now = new Date();

    for (const item of data.events || []) {
      const startAt = item.start_date.replace(' ', 'T');
      if (new Date(startAt) < now) continue;

      const title = this.cleanText(item.title);
      if (!title) continue;

      const endAt = item.end_date ? item.end_date.replace(' ', 'T') : undefined;
      const description = this.cleanText(
        item.description.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')
      );

      // Parse cost
      const costStr = item.cost || '';
      const priceInfo = this.parsePrice(costStr || 'Free');

      // Determine outdoor based on tags/title
      const allText = `${title} ${description}`.toLowerCase();
      const isOutdoor = /garden|outdoor|veranda|lawn|nature|orchid|stroll/.test(allText);

      // Categorize
      const category = this.categorizeBonnetHouse(title, description);
      const tags = this.generateTags(title, description, category);

      events.push({
        title,
        startAt,
        endAt,
        venueName: 'Bonnet House Museum & Gardens',
        address: '900 N Birch Rd, Fort Lauderdale, FL 33304',
        neighborhood: 'Fort Lauderdale Beach',
        lat: 26.1279,
        lng: -80.1049,
        city: 'Fort Lauderdale',
        tags: tags.slice(0, 5),
        category,
        priceLabel: priceInfo.label,
        priceAmount: priceInfo.amount,
        isOutdoor,
        description: description || `${title} at Bonnet House Museum & Gardens.`,
        sourceUrl: item.url,
        sourceName: this.name,
        ticketUrl: item.url,
      });
    }

    this.log(`Found ${events.length} Bonnet House events`);
    return events;
  }

  private categorizeBonnetHouse(title: string, desc: string): string {
    const text = `${title} ${desc}`.toLowerCase();
    if (/yoga|meditation|zen|cacao|sound bath|breathwork/.test(text)) return 'Wellness';
    if (/speaker|lecture|talk/.test(text)) return 'Culture';
    if (/workshop|class|paint|watercolor|art.*class/.test(text)) return 'Art';
    if (/family|kid|children/.test(text)) return 'Family';
    if (/orchid|garden|bloom|plant/.test(text)) return 'Outdoors';
    if (/moonlight|stroll|evening/.test(text)) return 'Culture';
    if (/music|concert|jazz/.test(text)) return 'Music';
    if (/festival|fair/.test(text)) return 'Culture';
    return 'Culture';
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//  Funky Buddha Brewery — Oakland Park, FL
//  Source: https://funkybuddha.com/events/
//  WordPress + FacetWP. HTML parsing of event cards.
// ═══════════════════════════════════════════════════════════════════════════

export class FunkyBuddhaScraper extends BaseScraper {
  constructor() {
    super('FunkyBuddha', { weight: 1.0, rateLimit: 2000 });
  }

  async scrape(): Promise<RawEvent[]> {
    this.log('Fetching Funky Buddha Brewery events...');

    const $ = await this.fetchHTMLNativeRetry('https://funkybuddha.com/events/');
    const events: RawEvent[] = [];
    const now = new Date();

    // Extract text content — events appear as:
    //   [Event Type] → [Date @ Location] → [Title] → "More"
    const bodyText = $('body').text();
    const lines = bodyText.split('\n').map((l: string) => l.trim()).filter((l: string) => l.length > 0);

    // Find date lines matching "Mar 3 @" or "Mar 7 - Mar 8 @"
    const datePattern = /^(\w{3})\s+(\d{1,2})(?:\s*-\s*\w{3}\s+\d{1,2})?\s*@$/;
    const seen = new Set<string>();

    for (let i = 0; i < lines.length; i++) {
      const dateMatch = lines[i].match(datePattern);
      if (!dateMatch) continue;

      // Next line should be location (Tap Room / Seltzer Garden)
      const location = lines[i + 1] || '';
      if (!location) continue;

      // Line after that should be the title
      const title = lines[i + 2] || '';
      if (!title || title === 'More' || title.length < 3) continue;

      // Parse the date
      const monthNum = monthNameToNum(dateMatch[1]);
      if (!monthNum) continue;

      const day = dateMatch[2].padStart(2, '0');
      const monthInt = parseInt(monthNum, 10);
      const currentMonth = now.getMonth() + 1;
      const year = monthInt < currentMonth ? CURRENT_YEAR + 1 : CURRENT_YEAR;

      // Default time based on event type
      const time = this.guessTime(title);
      const startAt = `${year}-${monthNum}-${day}T${time}`;
      if (new Date(startAt) < now) continue;

      const key = `${title}|${startAt}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const cleanTitle = this.cleanText(title);
      const category = this.categorizeFB(cleanTitle);
      const tags = this.generateTags(cleanTitle, '', category);
      const isOutdoor = /outdoor|garden|patio|pool/.test(`${cleanTitle} ${location}`.toLowerCase());

      events.push({
        title: cleanTitle,
        startAt,
        venueName: `Funky Buddha Brewery${location !== 'Tap Room' ? ` — ${location}` : ''}`,
        address: '1201 NE 38th St, Oakland Park, FL 33334',
        neighborhood: 'Oakland Park',
        lat: 26.1703,
        lng: -80.1265,
        city: 'Fort Lauderdale',
        tags: tags.slice(0, 5),
        category,
        priceLabel: 'Free',
        isOutdoor,
        description: `${cleanTitle} at Funky Buddha Brewery, Oakland Park.`,
        sourceUrl: 'https://funkybuddha.com/events/',
        sourceName: this.name,
      });
    }

    this.log(`Found ${events.length} Funky Buddha events`);
    return events;
  }

  private guessTime(title: string): string {
    const lower = title.toLowerCase();
    if (/run club|yoga|zen|morning|sunrise/.test(lower)) return '06:30:00';
    if (/brunch|morning/.test(lower)) return '10:00:00';
    if (/happy hour|afternoon/.test(lower)) return '16:00:00';
    if (/bonsai|magic|mtg|mana|gaming/.test(lower)) return '18:00:00';
    if (/watch party|f1/.test(lower)) return '19:00:00';
    return '18:00:00'; // Default evening
  }

  private categorizeFB(title: string): string {
    const lower = title.toLowerCase();
    if (/run club|yoga|fitness|workout/.test(lower)) return 'Fitness';
    if (/watch party|f1|game|sport/.test(lower)) return 'Sports';
    if (/music|live|band|dj|concert/.test(lower)) return 'Music';
    if (/bonsai|art|craft|workshop/.test(lower)) return 'Art';
    if (/magic|gathering|mtg|mana|gaming|board game/.test(lower)) return 'Community';
    if (/beer|brew|tasting|sip|special/.test(lower)) return 'Food & Drink';
    return 'Community';
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//  Savor Cinema — Fort Lauderdale International Film Festival
//  Source: https://fliff.com/event-grid-all/?_venues=savor-cinema-fort-lauderdale
//  WordPress + FacetWP grid with Elevent ticketing
// ═══════════════════════════════════════════════════════════════════════════

export class SavorCinemaScraper extends BaseScraper {
  constructor() {
    super('SavorCinema', { weight: 1.0, rateLimit: 2000 });
  }

  async scrape(): Promise<RawEvent[]> {
    this.log('Fetching Savor Cinema / FLIFF events...');

    const url = 'https://fliff.com/event-grid-all/?_filter_sort=title&_venues=savor-cinema-fort-lauderdale';
    const $ = await this.fetchHTMLNativeRetry(url);
    const events: RawEvent[] = [];
    const now = new Date();

    // Find event links: <a href="https://fliff.com/events/slug/">Title</a>
    const eventLinks: Array<{ title: string; url: string }> = [];
    const seen = new Set<string>();

    $('a[href*="/events/"]').each((_idx, el) => {
      const href = $(el).attr('href') || '';
      const text = $(el).text().trim();
      if (
        href.includes('fliff.com/events/') &&
        text.length > 3 &&
        !text.includes('Buy') &&
        !seen.has(href)
      ) {
        seen.add(href);
        eventLinks.push({ title: text, url: href });
      }
    });

    this.log(`Found ${eventLinks.length} film listings`);

    // For each event, fetch the individual page to get date info
    for (const link of eventLinks.slice(0, 20)) {
      try {
        const eventPage = await this.fetchHTMLNativeRetry(link.url);
        const pageText = eventPage('body').text();

        // Look for date patterns in the page
        const dateMatch = pageText.match(
          /(\w+)\s+(\d{1,2}),?\s+(\d{4})/
        );

        let startAt: string;
        if (dateMatch) {
          const monthNum = monthNameToNum(dateMatch[1]);
          if (!monthNum) continue;
          const day = dateMatch[2].padStart(2, '0');
          startAt = `${dateMatch[3]}-${monthNum}-${day}T19:00:00`;
        } else {
          // Default to upcoming date if no date found on page
          continue;
        }

        if (new Date(startAt) < now) continue;

        const title = this.cleanText(link.title);
        const tags = ['theater'];

        // Check for Elevent ticket link
        let ticketUrl: string | undefined = link.url;
        const eleventLink = eventPage('a[href*="goelevent.com"], a[href*="elevent"]').first();
        if (eleventLink.length) {
          ticketUrl = eleventLink.attr('href') || link.url;
        }

        events.push({
          title,
          startAt,
          venueName: 'Savor Cinema',
          address: '503 SE 6th St, Fort Lauderdale, FL 33301',
          neighborhood: 'Downtown FLL',
          lat: 26.1012,
          lng: -80.1369,
          city: 'Fort Lauderdale',
          tags,
          category: 'Culture',
          isOutdoor: false,
          description: `${title} — screening at Savor Cinema, home of the Fort Lauderdale International Film Festival.`,
          sourceUrl: link.url,
          sourceName: this.name,
          ticketUrl,
        });
      } catch {
        // Skip events we can't fetch
      }
    }

    this.log(`Found ${events.length} Savor Cinema events`);
    return events;
  }
}
