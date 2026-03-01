/**
 * Greater Miami & The Beaches Official Events
 * Source: https://www.miamiandbeaches.com/events
 *
 * The Greater Miami Convention & Visitors Bureau official events calendar.
 * This source covers major festivals, cultural events, sporting events, and
 * performing arts across Miami-Dade County.
 *
 * ⚠️  CURATOR REVIEW REQUIRED
 * Events from this source should be reviewed before publishing — the CVB
 * lists some generic "ongoing" attractions alongside real ticketed events.
 * Filter for: specific dated events with real tickets / venues.
 * Exclude: generic "things to do" listings without specific dates.
 */

import { PuppeteerScraper } from './puppeteer-base.js';
import type { RawEvent } from '../types.js';

interface MBEvent {
  title: string;
  date: string;
  endDate?: string;
  venue?: string;
  description?: string;
  url?: string;
  image?: string;
  category?: string;
}

export class MiamiBeachesEventsScraper extends PuppeteerScraper {
  private readonly BASE_URL = 'https://www.miamiandbeaches.com/events';

  constructor() {
    super('Greater Miami & The Beaches', { weight: 1.5, rateLimit: 2000 });
  }

  protected async scrapeWithBrowser(): Promise<RawEvent[]> {
    this.log('Scraping miamiandbeaches.com/events...');

    await this.navigateTo(this.BASE_URL);
    await this.sleep(3000); // let JS carousels render

    // Scroll to trigger lazy loading
    await this.scrollPage(4);
    await this.sleep(2000);

    const html = await this.getPageContent();

    // Try to extract JSON-LD structured data first (most reliable)
    const jsonLdEvents = await this.extractJsonLd();
    if (jsonLdEvents.length > 0) {
      this.log(`Found ${jsonLdEvents.length} events via JSON-LD`);
      return this.normalizeEvents(jsonLdEvents);
    }

    // Fallback: parse HTML event cards
    const htmlEvents = await this.extractFromHtml();
    this.log(`Found ${htmlEvents.length} events via HTML parsing`);
    return this.normalizeEvents(htmlEvents);
  }

  private async extractJsonLd(): Promise<MBEvent[]> {
    const events: MBEvent[] = [];
    try {
      const data = await this.extractData(() => {
        const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
        return scripts.map((s) => s.textContent || '');
      });

      for (const raw of data) {
        try {
          const parsed = JSON.parse(raw);
          const items = Array.isArray(parsed) ? parsed : [parsed];
          for (const item of items) {
            if (item['@type'] === 'Event' && item.name && item.startDate) {
              events.push({
                title: item.name,
                date: item.startDate,
                endDate: item.endDate,
                venue: item.location?.name || item.location?.address?.addressLocality,
                description: item.description,
                url: item.url || item['@id'],
                image: item.image?.url || item.image,
                category: item.eventAttendanceMode ? 'Event' : undefined,
              });
            }
          }
        } catch {
          // skip malformed JSON
        }
      }
    } catch {
      // JSON-LD extraction failed; fall back to HTML
    }
    return events;
  }

  private async extractFromHtml(): Promise<MBEvent[]> {
    const events: MBEvent[] = [];
    try {
      const data = await this.extractData(() => {
        const cards: Array<{
          title: string;
          date: string;
          venue: string;
          description: string;
          url: string;
          image: string;
        }> = [];

        // Common CVB site selectors
        const selectors = [
          '[class*="event-card"]',
          '[class*="EventCard"]',
          '[class*="event-item"]',
          '[class*="listing-item"]',
          'article[class*="event"]',
        ];

        let elements: NodeListOf<Element> | null = null;
        for (const sel of selectors) {
          const found = document.querySelectorAll(sel);
          if (found.length > 0) {
            elements = found;
            break;
          }
        }

        if (!elements) return cards;

        elements.forEach((el) => {
          const title =
            el.querySelector('h2, h3, h4, [class*="title"], [class*="name"]')?.textContent?.trim() || '';
          const dateText =
            el.querySelector('time, [class*="date"], [class*="when"]')?.textContent?.trim() || '';
          const venue =
            el.querySelector('[class*="venue"], [class*="location"], [class*="where"]')?.textContent?.trim() || '';
          const description =
            el.querySelector('p, [class*="desc"], [class*="summary"]')?.textContent?.trim() || '';
          const link = (el.querySelector('a') as HTMLAnchorElement)?.href || '';
          const img = (el.querySelector('img') as HTMLImageElement)?.src || '';

          if (title && title.length > 3 && dateText) {
            cards.push({ title, date: dateText, venue, description, url: link, image: img });
          }
        });

        return cards;
      });

      for (const item of data) {
        events.push({
          title: item.title,
          date: item.date,
          venue: item.venue,
          description: item.description,
          url: item.url,
          image: item.image,
        });
      }
    } catch {
      // HTML extraction failed
    }
    return events;
  }

  private normalizeEvents(raw: MBEvent[]): RawEvent[] {
    const events: RawEvent[] = [];
    const now = new Date();

    for (const item of raw) {
      // Parse date — ISO format preferred, then flexible
      const startAt = this.parseDateString(item.date);
      if (!startAt) continue;

      // Skip past events
      if (new Date(startAt) < now) continue;

      // Skip obvious non-event entries (no specific date)
      if (item.title.length < 4) continue;

      const category = this.categorize(item.title, item.description || '');
      const tags = this.generateTags(item.title, item.description || '', category);

      events.push({
        title: item.title,
        startAt,
        endAt: item.endDate ? this.parseDateString(item.endDate) || undefined : undefined,
        venueName: item.venue || undefined,
        neighborhood: this.inferNeighborhoodFromVenue(item.venue || ''),
        lat: null,
        lng: null,
        city: 'Miami',
        tags,
        category,
        isOutdoor: /beach|park|outdoor|garden/i.test(item.title + ' ' + item.description),
        description: item.description || item.title,
        sourceUrl: item.url || this.BASE_URL,
        sourceName: this.name,
        image: item.image || undefined,
        ticketUrl: item.url || undefined,
      });
    }

    this.log(`Normalized ${events.length} future events from ${raw.length} raw`);
    return events;
  }

  private parseDateString(text: string): string | null {
    if (!text) return null;

    // Already ISO
    if (/^\d{4}-\d{2}-\d{2}/.test(text)) {
      const d = new Date(text);
      return isNaN(d.getTime()) ? null : text.includes('T') ? text : `${text}T00:00:00`;
    }

    // Try native parse
    const d = new Date(text);
    if (!isNaN(d.getTime())) {
      const iso = d.toISOString().split('T')[0];
      const time = text.match(/\d{1,2}:\d{2}\s*(am|pm)?/i);
      if (time) return `${iso}T${this.normalizeTime(time[0])}`;
      return `${iso}T00:00:00`;
    }

    return null;
  }

  private normalizeTime(t: string): string {
    const [h, rest] = t.split(':');
    const m = rest?.replace(/[^0-9]/g, '') || '00';
    const ispm = /pm/i.test(rest || '');
    let hour = parseInt(h, 10);
    if (ispm && hour < 12) hour += 12;
    if (!ispm && hour === 12) hour = 0;
    return `${String(hour).padStart(2, '0')}:${m.slice(0, 2)}:00`;
  }

  private inferNeighborhoodFromVenue(venue: string): string {
    const v = venue.toLowerCase();
    if (v.includes('south beach') || v.includes('lincoln road') || v.includes('ocean drive')) return 'South Beach';
    if (v.includes('wynwood')) return 'Wynwood';
    if (v.includes('brickell')) return 'Brickell';
    if (v.includes('coconut grove') || v.includes('grove')) return 'Coconut Grove';
    if (v.includes('coral gables')) return 'Coral Gables';
    if (v.includes('design district')) return 'Design District';
    if (v.includes('midtown')) return 'Midtown';
    if (v.includes('little havana')) return 'Little Havana';
    if (v.includes('miami beach') || v.includes('fillmore') || v.includes('new world')) return 'Miami Beach';
    if (v.includes('biscayne') || v.includes('perez') || v.includes('arsht') || v.includes('kaseya')) return 'Downtown Miami';
    if (v.includes('hard rock') || v.includes('loandepot')) return 'Miami Gardens';
    if (v.includes('fort lauderdale') || v.includes('broward')) return 'Downtown FLL';
    return 'Miami';
  }
}
