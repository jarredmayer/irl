/**
 * WordPress Tribe Events API Scrapers
 *
 * Reusable pattern for venues that use The Events Calendar WordPress plugin.
 * Each venue exposes: GET {domain}/wp-json/tribe/events/v1/events?per_page=50&status=publish
 *
 * Currently confirmed working:
 *   - HistoryMiami (historymiami.org) — 13+ events
 *   - Bonnet House (bonnethouse.org) — handled in broward-venues.ts
 */

import { BaseScraper } from './base.js';
import type { RawEvent } from '../types.js';

interface TribeEventItem {
  id: number;
  title: string;
  description: string;
  url: string;
  start_date: string;
  end_date: string;
  all_day: boolean;
  categories?: Array<{ name: string; slug: string }>;
  tags?: Array<{ name: string; slug: string }>;
  venue?: {
    venue: string;
    address: string;
    city: string;
    state: string;
    zip: string;
  };
  cost?: string;
  image?: { url: string };
}

interface TribeApiResponse {
  events: TribeEventItem[];
  total: number;
  total_pages: number;
}

// ═══════════════════════════════════════════════════════════════════════════
//  HistoryMiami Museum — Downtown Miami
//  Source: https://historymiami.org/wp-json/tribe/events/v1/events
//  Confirmed working 2026-03-05
// ═══════════════════════════════════════════════════════════════════════════

export class HistoryMiamiScraper extends BaseScraper {
  constructor() {
    super('HistoryMiami', { weight: 1.3, rateLimit: 2000 });
  }

  async scrape(): Promise<RawEvent[]> {
    this.log('Fetching HistoryMiami events via WordPress REST API...');

    const today = new Date().toISOString().split('T')[0];
    const urls = [
      `https://www.historymiami.org/wp-json/tribe/events/v1/events?per_page=50&status=publish&start_date=${today}`,
      `https://historymiami.org/wp-json/tribe/events/v1/events?per_page=50&status=publish&start_date=${today}`,
    ];

    let data: TribeApiResponse | undefined;
    for (const url of urls) {
      try {
        data = await this.fetchJSONNativeGet<TribeApiResponse>(url, 15_000);
        break;
      } catch (e) {
        this.log(`  ${url} failed: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    if (!data) {
      this.log('All HistoryMiami URLs failed — returning empty');
      return [];
    }

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

      const costStr = item.cost || '';
      const priceInfo = this.parsePrice(costStr || 'Free');

      const allText = `${title} ${description}`.toLowerCase();
      const isOutdoor = /outdoor|park|cruise|river|garden|walk|stroll/.test(allText);

      const category = this.categorizeEvent(title, description);
      const tags = this.generateTags(title, description, category);
      if (!tags.includes('museum')) tags.push('museum');
      if (!tags.includes('cultural')) tags.push('cultural');

      events.push({
        title,
        startAt,
        endAt,
        venueName: 'HistoryMiami Museum',
        address: '101 W Flagler St, Miami, FL 33130',
        neighborhood: 'Downtown Miami',
        lat: 25.7743,
        lng: -80.1963,
        city: 'Miami',
        tags: tags.slice(0, 5),
        category,
        priceLabel: priceInfo.label,
        priceAmount: priceInfo.amount,
        isOutdoor,
        description: description || `${title} at HistoryMiami Museum.`,
        sourceUrl: item.url,
        sourceName: this.name,
        ticketUrl: item.url,
        image: item.image?.url,
      });
    }

    this.log(`Found ${events.length} HistoryMiami events`);
    return events;
  }

  private categorizeEvent(title: string, desc: string): string {
    const text = `${title} ${desc}`.toLowerCase();
    if (/walk|tour|stroll|cruise/.test(text)) return 'Culture';
    if (/family|kid|children|fun day/.test(text)) return 'Family';
    if (/panel|discussion|lecture|talk/.test(text)) return 'Culture';
    if (/garden|park|outdoor|nature/.test(text)) return 'Outdoors';
    if (/art|exhibit|gallery/.test(text)) return 'Art';
    if (/music|concert|jazz/.test(text)) return 'Music';
    return 'Culture';
  }
}
