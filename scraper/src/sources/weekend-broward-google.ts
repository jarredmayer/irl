/**
 * WeekendBroward Google Scraper
 *
 * weekendbroward.com is behind Cloudflare and blocks all automated access
 * (RSS, REST API, Puppeteer). This scraper uses Google Custom Search API
 * to discover events from their indexed pages.
 *
 * Requires env vars:
 *   GOOGLE_API_KEY    — Google API key with Custom Search enabled
 *   GOOGLE_CSE_ID     — Custom Search Engine ID (configured for site:weekendbroward.com)
 *
 * Setup:
 *   1. Create a Custom Search Engine at https://programmablesearchengine.google.com
 *   2. Set "Sites to search" to weekendbroward.com
 *   3. Get the Search Engine ID (cx parameter)
 *   4. Enable Custom Search API in Google Cloud Console
 *   5. Create an API key
 *
 * Free tier: 100 queries/day (we use ~5 per scrape run)
 */

import { BaseScraper } from './base.js';
import type { RawEvent } from '../types.js';

// ── City resolution (shared with weekend-broward.ts) ─────────────────

const BROWARD_CITIES = new Set([
  'fort lauderdale', 'ft. lauderdale', 'ft lauderdale',
  'hollywood', 'pompano beach', 'dania beach', 'dania',
  'miramar', 'coral springs', 'sunrise', 'plantation',
  'davie', 'hallandale beach', 'hallandale', 'weston',
  'cooper city', 'pembroke pines', 'lauderdale-by-the-sea',
  'lauderdale by the sea', 'margate', 'tamarac', 'coconut creek',
  'north lauderdale', 'wilton manors', 'oakland park',
  'lauderhill', 'lighthouse point', 'deerfield beach', 'parkland',
]);

const PALM_BEACH_CITIES = new Set([
  'west palm beach', 'boca raton', 'delray beach', 'boynton beach',
  'lake worth', 'lake worth beach', 'palm beach gardens', 'jupiter',
  'wellington', 'palm beach', 'north palm beach', 'riviera beach',
  'royal palm beach', 'lantana', 'greenacres', 'juno beach',
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
  // Broward
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
  // Palm Beach
  if (lower.includes('jupiter') || lower.includes('juno beach')) return 'Jupiter';
  if (lower.includes('boca raton') || lower.includes('boca')) return 'Boca Raton';
  if (lower.includes('delray')) return 'Delray Beach';
  if (lower.includes('boynton')) return 'Boynton Beach';
  if (lower.includes('lake worth')) return 'Lake Worth';
  if (lower.includes('palm beach gardens')) return 'Palm Beach Gardens';
  if (lower.includes('west palm') || lower.includes('wpb')) return 'West Palm Beach';
  return 'Fort Lauderdale';
}

// ── Google CSE response types ────────────────────────────────────────

interface GoogleSearchResult {
  items?: Array<{
    title: string;
    link: string;
    snippet: string;
    pagemap?: {
      metatags?: Array<Record<string, string>>;
    };
  }>;
}

// ── Date extraction ──────────────────────────────────────────────────

/** Try to extract a date from text like "February 21, 2026" or "April 18-19, 2026" */
function extractDates(text: string): string[] {
  const dates: string[] = [];

  // Pattern: "Month Day, Year" or "Month Day-Day, Year"
  const monthNames: Record<string, string> = {
    january: '01', february: '02', march: '03', april: '04',
    may: '05', june: '06', july: '07', august: '08',
    september: '09', october: '10', november: '11', december: '12',
  };

  // Match: February 21, 2026 or February 21-22, 2026 or February 21 and 22, 2026
  const rangePattern = /(\w+)\s+(\d{1,2})(?:\s*[-–&and,]+\s*(\d{1,2}))?,?\s*(\d{4})/gi;
  let match: RegExpExecArray | null;

  while ((match = rangePattern.exec(text)) !== null) {
    const monthName = match[1].toLowerCase();
    const month = monthNames[monthName];
    if (!month) continue;

    const year = match[4];
    const startDay = match[2].padStart(2, '0');
    dates.push(`${year}-${month}-${startDay}`);

    if (match[3]) {
      const endDay = match[3].padStart(2, '0');
      dates.push(`${year}-${month}-${endDay}`);
    }
  }

  // Pattern: MM/DD/YYYY
  const slashPattern = /(\d{1,2})\/(\d{1,2})\/(\d{4})/g;
  while ((match = slashPattern.exec(text)) !== null) {
    const month = match[1].padStart(2, '0');
    const day = match[2].padStart(2, '0');
    dates.push(`${match[3]}-${month}-${day}`);
  }

  return [...new Set(dates)];
}

// ── Scraper ──────────────────────────────────────────────────────────

export class WeekendBrowardGoogleScraper extends BaseScraper {
  private apiKey: string;
  private cseId: string;

  constructor() {
    super('WeekendBroward Google', { weight: 1.4, rateLimit: 500 });
    this.apiKey = process.env.GOOGLE_API_KEY || '';
    this.cseId = process.env.GOOGLE_CSE_ID || '';
  }

  async scrape(): Promise<RawEvent[]> {
    if (!this.apiKey || !this.cseId) {
      this.log('⚠ GOOGLE_API_KEY or GOOGLE_CSE_ID not set — skipping');
      return [];
    }

    const events: RawEvent[] = [];
    const now = new Date();
    const currentYear = now.getFullYear();

    // Search queries targeting different event categories
    const queries = [
      `site:weekendbroward.com events ${currentYear}`,
      `site:weekendbroward.com live music ${currentYear}`,
      `site:weekendbroward.com festival ${currentYear}`,
      `site:weekendbroward.com comedy jazz ${currentYear}`,
      `site:weekendbroward.com palm beach events ${currentYear}`,
    ];

    const seenUrls = new Set<string>();

    for (const query of queries) {
      try {
        const results = await this.searchGoogle(query);
        if (!results.items) continue;

        for (const item of results.items) {
          // Skip non-event pages
          if (seenUrls.has(item.link)) continue;
          seenUrls.add(item.link);

          if (!item.link.includes('/events/') && !item.link.includes('festival') && !item.link.includes('music')) {
            continue;
          }
          // Skip category/listing pages
          if (item.link === 'https://weekendbroward.com/events/' ||
              item.link === 'https://weekendbroward.com/live-music/') {
            continue;
          }

          const event = this.parseSearchResult(item, currentYear);
          if (event) {
            events.push(event);
          }
        }
      } catch (error) {
        this.log(`  ⚠ Search failed for "${query}": ${error instanceof Error ? error.message : error}`);
      }

      // Rate limit between queries
      await this.sleep(300);
    }

    // Filter out past events
    const upcoming = events.filter(e => new Date(e.startAt) >= now);

    this.log(`Found ${upcoming.length} upcoming events from Google (${seenUrls.size} URLs checked)`);
    return upcoming;
  }

  private async searchGoogle(query: string): Promise<GoogleSearchResult> {
    const url = `https://www.googleapis.com/customsearch/v1?key=${this.apiKey}&cx=${this.cseId}&q=${encodeURIComponent(query)}&num=10`;
    const response = await this.fetch(url, {
      headers: { Accept: 'application/json' },
    });
    return response.json() as Promise<GoogleSearchResult>;
  }

  private parseSearchResult(
    item: NonNullable<GoogleSearchResult['items']>[number],
    currentYear: number,
  ): RawEvent | null {
    const { title, snippet, link } = item;

    // Clean title (remove " - WeekendBroward-PalmBeach" suffix)
    const cleanTitle = title
      .replace(/\s*[-–|]\s*WeekendBroward.*$/i, '')
      .replace(/\s*[-–|]\s*Weekend Broward.*$/i, '')
      .trim();

    if (!cleanTitle || cleanTitle.length < 5) return null;

    // Extract dates from snippet
    const combinedText = `${title} ${snippet}`;
    const dates = extractDates(combinedText);

    if (dates.length === 0) {
      // No dates found — skip (we can't create an event without a date)
      return null;
    }

    // Use the first future date
    const now = new Date();
    const futureDate = dates.find(d => new Date(d) >= now) || dates[0];

    // Resolve city and neighborhood from title + snippet
    const city = resolveCity(combinedText) || 'Fort Lauderdale';
    const neighborhood = resolveNeighborhood(combinedText);

    // Categorize
    const category = this.categorize(cleanTitle, snippet);
    const tags = this.generateTags(cleanTitle, snippet, category);
    const outdoor = this.isOutdoor(cleanTitle, snippet);

    // Parse price from snippet
    const price = this.parsePrice(snippet);

    // Extract time (default to evening if not found)
    const timeMatch = snippet.match(/(\d{1,2}):(\d{2})\s*(am|pm)/i);
    let time = '19:00'; // default
    if (timeMatch) {
      let hours = parseInt(timeMatch[1], 10);
      const minutes = timeMatch[2];
      if (timeMatch[3].toLowerCase() === 'pm' && hours < 12) hours += 12;
      if (timeMatch[3].toLowerCase() === 'am' && hours === 12) hours = 0;
      time = `${hours.toString().padStart(2, '0')}:${minutes}`;
    }

    // Description — clean up snippet
    const description = snippet
      .replace(/\.\.\./g, '.')
      .replace(/\s+/g, ' ')
      .trim();

    return {
      title: cleanTitle,
      startAt: `${futureDate}T${time}:00`,
      venueName: undefined,
      address: undefined,
      neighborhood,
      lat: undefined as unknown as number,
      lng: undefined as unknown as number,
      city,
      tags,
      category,
      priceLabel: price.label,
      priceAmount: price.amount,
      isOutdoor: outdoor,
      description: description || `${cleanTitle} — event details at weekendbroward.com`,
      sourceUrl: link,
      sourceName: this.name,
    };
  }
}
