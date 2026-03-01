/**
 * Candlelight Concerts — Real Scraper
 * Source: https://feverup.com/en/miami/candlelight
 *
 * Scrapes actual scheduled Candlelight concerts from the dedicated Fever
 * Candlelight page (not the generic Fever Miami feed). These are legitimate
 * ticketed classical music events held at iconic Miami venues.
 *
 * Replaces the synthetic CandlelightConcertsScraper in nightlife-clubs.ts
 * which generated fake dates/programs without real schedule data.
 *
 * ⚠️  CURATOR REVIEW RECOMMENDED
 * Verify the venue exists and show is still on sale before each publish run.
 */

import { PuppeteerScraper } from './puppeteer-base.js';
import type { RawEvent } from '../types.js';

export class CandlelightRealScraper extends PuppeteerScraper {
  private readonly URL = 'https://feverup.com/en/miami/candlelight';

  constructor() {
    super('Candlelight Concerts (Fever)', { weight: 1.5, rateLimit: 3000 });
  }

  protected async scrapeWithBrowser(): Promise<RawEvent[]> {
    this.log('Scraping Fever Candlelight Miami page...');

    await this.navigateTo(this.URL);
    await this.sleep(4000); // Fever is a heavy SPA

    await this.scrollPage(5);
    await this.sleep(2000);

    // Try JSON-LD structured data first
    const jsonLdEvents = await this.extractJsonLdEvents();
    if (jsonLdEvents.length > 0) {
      this.log(`Found ${jsonLdEvents.length} Candlelight shows via JSON-LD`);
      return jsonLdEvents;
    }

    // Fallback: parse DOM event cards
    const domEvents = await this.extractDomEvents();
    this.log(`Found ${domEvents.length} Candlelight shows via DOM`);
    return domEvents;
  }

  private async extractJsonLdEvents(): Promise<RawEvent[]> {
    const events: RawEvent[] = [];
    try {
      const scripts = await this.extractData(() => {
        return Array.from(document.querySelectorAll('script[type="application/ld+json"]')).map(
          (s) => s.textContent || ''
        );
      });

      for (const raw of scripts) {
        try {
          const parsed = JSON.parse(raw);
          const items = Array.isArray(parsed) ? parsed : [parsed];
          for (const item of items) {
            if (item['@type'] !== 'Event') continue;
            if (!item.name || !item.startDate) continue;
            // Only keep actual Candlelight entries
            if (!/candlelight/i.test(item.name)) continue;

            const startAt = this.toIsoDateTime(item.startDate);
            if (!startAt) continue;
            if (new Date(startAt) < new Date()) continue;

            const venueName = item.location?.name || 'TBA';
            const address = item.location?.address
              ? typeof item.location.address === 'string'
                ? item.location.address
                : [
                    item.location.address.streetAddress,
                    item.location.address.addressLocality,
                    item.location.address.addressRegion,
                  ]
                    .filter(Boolean)
                    .join(', ')
              : '';

            events.push(
              this.buildEvent({
                title: item.name,
                startAt,
                venueName,
                address,
                description: item.description || '',
                url: item.url || item['@id'] || this.URL,
                image: item.image?.url || item.image || '',
                priceText: String(item.offers?.price ?? ''),
              })
            );
          }
        } catch {
          // skip malformed blocks
        }
      }
    } catch {
      // extraction failed; caller will try DOM fallback
    }
    return events;
  }

  private async extractDomEvents(): Promise<RawEvent[]> {
    const events: RawEvent[] = [];
    try {
      const cards = await this.extractData(() => {
        const results: Array<{
          title: string;
          dateText: string;
          venue: string;
          price: string;
          url: string;
          image: string;
        }> = [];

        // Fever uses a variety of CSS class patterns
        const selectors = [
          '[data-testid="experience-card"]',
          '[class*="ExperienceCard"]',
          '[class*="experience-card"]',
          '[class*="EventCard"]',
          'a[href*="/experience/"]',
        ];

        let els: NodeListOf<Element> | null = null;
        for (const sel of selectors) {
          const found = document.querySelectorAll(sel);
          if (found.length > 0) {
            els = found;
            break;
          }
        }
        if (!els) return results;

        els.forEach((el) => {
          const title =
            el.querySelector('[class*="title"], [class*="name"], h2, h3')?.textContent?.trim() || '';
          // Only include Candlelight events
          if (!title.toLowerCase().includes('candlelight')) return;

          const dateText =
            el.querySelector('[class*="date"], time, [class*="when"]')?.textContent?.trim() || '';
          const venue =
            el.querySelector('[class*="venue"], [class*="location"]')?.textContent?.trim() || '';
          const price =
            el.querySelector('[class*="price"], [class*="cost"]')?.textContent?.trim() || '';
          const link = (el.closest('a') as HTMLAnchorElement)?.href || (el.querySelector('a') as HTMLAnchorElement)?.href || '';
          const img = (el.querySelector('img') as HTMLImageElement)?.src || '';

          if (title && dateText) {
            results.push({ title, dateText, venue, price, url: link, image: img });
          }
        });

        return results;
      });

      for (const card of cards) {
        const startAt = this.parseFeverDate(card.dateText);
        if (!startAt) continue;
        if (new Date(startAt) < new Date()) continue;

        events.push(
          this.buildEvent({
            title: card.title,
            startAt,
            venueName: card.venue || 'TBA',
            address: '',
            description: `${card.title} — a live candlelit concert experience in Miami.`,
            url: card.url || this.URL,
            image: card.image,
            priceText: card.price,
          })
        );
      }
    } catch {
      // DOM extraction failed
    }
    return events;
  }

  private buildEvent(opts: {
    title: string;
    startAt: string;
    venueName: string;
    address: string;
    description: string;
    url: string;
    image: string;
    priceText: string;
  }): RawEvent {
    const { label: priceLabel, amount: priceAmount } = opts.priceText
      ? this.parsePrice(opts.priceText)
      : { label: '$$' as const, amount: 45 };

    const neighborhood = this.inferNeighborhoodFromVenue(opts.venueName);

    return {
      title: opts.title,
      startAt: opts.startAt,
      venueName: opts.venueName || undefined,
      address: opts.address || undefined,
      neighborhood,
      lat: null,
      lng: null,
      city: 'Miami',
      tags: ['live-music', 'local-favorite'],
      category: 'Music',
      priceLabel,
      priceAmount,
      isOutdoor: false,
      description: opts.description,
      sourceUrl: opts.url,
      sourceName: this.name,
      ticketUrl: opts.url || undefined,
      image: opts.image || undefined,
    };
  }

  private toIsoDateTime(s: string): string | null {
    if (!s) return null;
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d.toISOString().replace('Z', '');
  }

  private parseFeverDate(text: string): string | null {
    if (!text) return null;
    // Fever formats: "Sat, Mar 15 · 8:00 PM", "March 15, 2026 8:00 PM"
    const d = new Date(text.replace(/·/g, '').trim());
    if (!isNaN(d.getTime())) {
      return d.toISOString().replace('Z', '').split('.')[0];
    }
    return null;
  }

  private inferNeighborhoodFromVenue(venue: string): string {
    const v = venue.toLowerCase();
    if (v.includes('perez') || v.includes('pamm') || v.includes('biscayne')) return 'Downtown Miami';
    if (v.includes('vizcaya')) return 'Coconut Grove';
    if (v.includes('bath club') || v.includes('collins')) return 'Mid-Beach';
    if (v.includes('faena')) return 'Mid-Beach';
    if (v.includes('wynwood')) return 'Wynwood';
    if (v.includes('arsht')) return 'Downtown Miami';
    if (v.includes('fillmore') || v.includes('miami beach')) return 'Miami Beach';
    return 'Miami';
  }
}
