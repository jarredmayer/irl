/**
 * Resy Events Scraper — Miami
 *
 * Scrapes special dining events (chef collabs, pop-ups, tasting menus)
 * from Resy's Miami events page.
 *
 * Resy is a React SPA so the HTML page may return limited data via
 * server-side rendering. Falls back to JSON-LD if available.
 *
 * NOTE: The Resy public API key is embedded in their website JS and
 * is required for all API calls. This is not a secret — it's shipped
 * to every browser that visits resy.com.
 */

import { BaseScraper } from './base.js';
import type { RawEvent } from '../types.js';

export class ResyEventsScraper extends BaseScraper {
  private readonly EVENTS_URL = 'https://resy.com/cities/mia/events';

  constructor() {
    super('Resy Miami Events', { weight: 1.5, rateLimit: 3000 });
  }

  async scrape(): Promise<RawEvent[]> {
    this.log('Fetching Resy Miami events...');

    try {
      const $ = await this.fetchHTMLNativeRetry(this.EVENTS_URL, 2, 15_000);
      const events: RawEvent[] = [];
      const now = new Date();

      // Strategy 1: JSON-LD structured data
      $('script[type="application/ld+json"]').each((_, el) => {
        try {
          const data = JSON.parse($(el).text());
          const items = Array.isArray(data) ? data : [data];
          for (const item of items) {
            if (item['@type'] === 'Event' && item.name && item.startDate) {
              const startAt = new Date(item.startDate);
              if (isNaN(startAt.getTime()) || startAt < now) continue;

              const location = item.location || {};
              const venueName = typeof location === 'string' ? location : location.name || 'Miami Restaurant';
              const address = typeof location.address === 'object'
                ? [location.address.streetAddress, location.address.addressLocality].filter(Boolean).join(', ')
                : location.address || 'Miami, FL';

              events.push({
                title: item.name,
                startAt: startAt.toISOString().split('.')[0],
                venueName,
                address,
                neighborhood: this.inferNeighborhood(venueName, address),
                lat: null,
                lng: null,
                city: 'Miami',
                tags: ['dining', 'restaurant', 'special-event'],
                category: 'Food & Drink',
                isOutdoor: false,
                description: item.description?.slice(0, 400) || `Special dining event: ${item.name}.`,
                sourceUrl: item.url || this.EVENTS_URL,
                sourceName: this.name,
                ticketUrl: item.url || undefined,
                image: typeof item.image === 'string' ? item.image : item.image?.url,
              });
            }
          }
        } catch { /* skip malformed JSON-LD */ }
      });

      if (events.length > 0) {
        this.log(`Found ${events.length} Resy events (JSON-LD)`);
        return events;
      }

      // Strategy 2: HTML card parsing
      const cardSelectors = [
        '[data-test-id="event-card"]', '.event-card', '[class*="EventCard"]',
        '[class*="event-item"]', 'a[href*="/events/"]',
      ];

      for (const sel of cardSelectors) {
        $(sel).each((_, el) => {
          const $el = $(el);
          const title = this.cleanText($el.find('h2, h3, [class*="title"]').first().text());
          const venue = this.cleanText($el.find('[class*="venue"], [class*="restaurant"]').first().text());
          const dateText = this.cleanText($el.find('[class*="date"], time').first().text());
          const link = $el.attr('href') || $el.find('a').first().attr('href');

          if (!title || title.length < 5) return;

          let startAt: string | undefined;
          if (dateText) {
            const d = new Date(dateText);
            if (!isNaN(d.getTime()) && d > now) {
              startAt = d.toISOString().split('.')[0];
            }
          }
          if (!startAt) return;

          events.push({
            title,
            startAt,
            venueName: venue || 'Miami Restaurant',
            address: 'Miami, FL',
            neighborhood: venue ? this.inferNeighborhood(venue, '') : 'Miami',
            lat: null,
            lng: null,
            city: 'Miami',
            tags: ['dining', 'restaurant', 'special-event'],
            category: 'Food & Drink',
            isOutdoor: false,
            description: `Special dining event: ${title}${venue ? ` at ${venue}` : ''}.`,
            sourceUrl: link ? (link.startsWith('http') ? link : `https://resy.com${link}`) : this.EVENTS_URL,
            sourceName: this.name,
          });
        });

        if (events.length > 0) break;
      }

      this.log(`Found ${events.length} Resy events`);
      return events;
    } catch (e) {
      this.logError('Resy scrape failed', e);
      return [];
    }
  }

  private inferNeighborhood(venue: string, address: string): string {
    const text = `${venue} ${address}`.toLowerCase();
    if (/wynwood/.test(text)) return 'Wynwood';
    if (/brickell/.test(text)) return 'Brickell';
    if (/south beach|ocean dr|collins/.test(text)) return 'South Beach';
    if (/design district/.test(text)) return 'Design District';
    if (/coconut grove/.test(text)) return 'Coconut Grove';
    if (/coral gables/.test(text)) return 'Coral Gables';
    if (/downtown|biscayne/.test(text)) return 'Downtown Miami';
    if (/mid-?beach|faena/.test(text)) return 'Mid-Beach';
    return 'Miami';
  }
}
