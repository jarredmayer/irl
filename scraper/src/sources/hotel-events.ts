/**
 * Hotel Events Scraper
 * Fetches real event listings from Miami hotel websites.
 *
 * Uses HTTP fetch + cheerio (no Puppeteer) — extracts JSON-LD structured data first,
 * then falls back to HTML parsing. Hotels that render events server-side will work
 * immediately; JS-rendered ones will return empty (flagged in logs).
 *
 * Hotels covered:
 *  - The Biltmore Hotel (biltmorehotel.com)
 *  - Faena Hotel Miami Beach (faena.com)
 *  - The Miami Beach EDITION (editionhotels.com)
 *  - Esme Miami Beach (esmehotel.com)
 *  - Broken Shaker / Freehand Miami (freehandhotels.com)
 *  - The Betsy Hotel (thebetsyhotel.com)
 *  - Mr. C Hotel Coconut Grove (mrchotels.com)
 *  - The Standard Spa Miami Beach (standardhotels.com)
 *  - The Colonnade Hotel Coral Gables (colonnadehotel.com)
 *  - The Wilder Miami (thewildermiami.com)
 */

import * as cheerio from 'cheerio';
import { BaseScraper } from './base.js';
import type { RawEvent } from '../types.js';

interface HotelSource {
  name: string;
  eventsUrl: string;
  fallbackUrl: string;
  neighborhood: string;
  address: string;
  lat: number;
  lng: number;
  city: 'Miami' | 'Fort Lauderdale';
}

const HOTEL_SOURCES: HotelSource[] = [
  {
    name: 'The Biltmore Hotel',
    eventsUrl: 'https://www.biltmorehotel.com/events/',
    fallbackUrl: 'https://www.biltmorehotel.com/whats-on/',
    neighborhood: 'Coral Gables',
    address: '1200 Anastasia Ave, Coral Gables, FL 33134',
    lat: 25.7267,
    lng: -80.2767,
    city: 'Miami',
  },
  {
    name: 'Faena Hotel Miami Beach',
    eventsUrl: 'https://faena.com/miami-beach',
    fallbackUrl: 'https://faena.com/miami-beach/whats-on',
    neighborhood: 'Mid-Beach',
    address: '3201 Collins Ave, Miami Beach, FL 33140',
    lat: 25.8112,
    lng: -80.1230,
    city: 'Miami',
  },
  {
    name: 'The Miami Beach EDITION',
    eventsUrl: 'https://www.editionhotels.com/miami-beach/events/',
    fallbackUrl: 'https://www.editionhotels.com/miami-beach/',
    neighborhood: 'Mid-Beach',
    address: '2901 Collins Ave, Miami Beach, FL 33140',
    lat: 25.8121,
    lng: -80.1255,
    city: 'Miami',
  },
  {
    name: 'Esme Miami Beach',
    eventsUrl: 'https://esmehotel.com/experiences/',
    fallbackUrl: 'https://esmehotel.com/',
    neighborhood: 'South Beach',
    address: '1438 Washington Ave, Miami Beach, FL 33139',
    lat: 25.7867,
    lng: -80.1350,
    city: 'Miami',
  },
  {
    name: 'The Wilder Miami',
    eventsUrl: 'https://www.thewildermiami.com/events',
    fallbackUrl: 'https://www.thewildermiami.com/',
    neighborhood: 'Wynwood',
    address: '2119 NW 2nd Ave, Miami, FL 33127',
    lat: 25.7965,
    lng: -80.1996,
    city: 'Miami',
  },
  {
    name: 'Broken Shaker at Freehand Miami',
    eventsUrl: 'https://freehandhotels.com/miami/events/',
    fallbackUrl: 'https://freehandhotels.com/miami/',
    neighborhood: 'Mid-Beach',
    address: '2727 Indian Creek Dr, Miami Beach, FL 33140',
    lat: 25.8089,
    lng: -80.1267,
    city: 'Miami',
  },
  {
    name: 'The Betsy Hotel',
    eventsUrl: 'https://www.thebetsyhotel.com/events/',
    fallbackUrl: 'https://www.thebetsyhotel.com/',
    neighborhood: 'South Beach',
    address: '1440 Ocean Dr, Miami Beach, FL 33139',
    lat: 25.7810,
    lng: -80.1298,
    city: 'Miami',
  },
  {
    name: 'Mr. C Hotel Coconut Grove',
    eventsUrl: 'https://mrchotels.com/coconut-grove/whats-on/',
    fallbackUrl: 'https://mrchotels.com/coconut-grove/',
    neighborhood: 'Coconut Grove',
    address: '2988 McFarlane Rd, Miami, FL 33133',
    lat: 25.7290,
    lng: -80.2385,
    city: 'Miami',
  },
  {
    name: 'The Standard Spa Miami Beach',
    eventsUrl: 'https://www.standardhotels.com/miami-beach/features/',
    fallbackUrl: 'https://www.standardhotels.com/miami-beach/',
    neighborhood: 'Miami Beach',
    address: '40 Island Ave, Miami Beach, FL 33139',
    lat: 25.7912,
    lng: -80.1567,
    city: 'Miami',
  },
  {
    name: 'The Colonnade Hotel Coral Gables',
    eventsUrl: 'https://www.colonnadehotel.com/coral-gables-hotel-events',
    fallbackUrl: 'https://www.colonnadehotel.com/',
    neighborhood: 'Coral Gables',
    address: '180 Aragon Ave, Coral Gables, FL 33134',
    lat: 25.7479,
    lng: -80.2584,
    city: 'Miami',
  },
];

export class HotelEventsScraper extends BaseScraper {
  constructor() {
    super('Hotel Events', { weight: 1.5, rateLimit: 1500 });
  }

  async scrape(): Promise<RawEvent[]> {
    const events: RawEvent[] = [];
    const now = new Date();

    for (const hotel of HOTEL_SOURCES) {
      try {
        this.log(`Fetching ${hotel.name} events...`);
        const hotelEvents = await this.fetchHotelEvents(hotel, now);
        this.log(`  → ${hotelEvents.length} events from ${hotel.name}`);
        events.push(...hotelEvents);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        this.log(`  ⚠ ${hotel.name}: ${msg}`);
      }
    }

    this.log(`Total hotel events: ${events.length}`);
    return events;
  }

  private async fetchHotelEvents(hotel: HotelSource, now: Date): Promise<RawEvent[]> {
    // Try primary events URL first, then fallback
    let $: cheerio.CheerioAPI | null = null;
    let usedUrl = hotel.eventsUrl;

    try {
      $ = await this.fetchHTML(hotel.eventsUrl);
    } catch {
      try {
        $ = await this.fetchHTML(hotel.fallbackUrl);
        usedUrl = hotel.fallbackUrl;
      } catch {
        return [];
      }
    }

    const events: RawEvent[] = [];

    // ── 1. JSON-LD structured data (most reliable, zero-cost parsing) ────────
    $('script[type="application/ld+json"]').each((_, el) => {
      const text = $(el).text();
      try {
        const parsed = JSON.parse(text);
        const items = Array.isArray(parsed) ? parsed : [parsed];
        for (const item of items) {
          if (item['@type'] !== 'Event') continue;
          if (!item.name || !item.startDate) continue;

          const startAt = this.toIso(item.startDate);
          if (!startAt || new Date(startAt) < now) continue;

          const url =
            item.url ||
            item['@id'] ||
            (item.offers?.url) ||
            usedUrl;

          events.push({
            title: this.cleanText(item.name),
            startAt,
            endAt: item.endDate ? this.toIso(item.endDate) || undefined : undefined,
            venueName: item.location?.name || hotel.name,
            address: this.extractAddress(item.location) || hotel.address,
            neighborhood: hotel.neighborhood,
            lat: hotel.lat,
            lng: hotel.lng,
            city: hotel.city,
            tags: this.generateTags(item.name, item.description ?? '', this.categorize(item.name, item.description ?? '')),
            category: this.categorize(item.name, item.description ?? ''),
            priceLabel: this.parsePriceFromOffers(item.offers),
            priceAmount: this.parsePriceAmountFromOffers(item.offers),
            isOutdoor: /outdoor|pool|garden|terrace|rooftop|beach/i.test(item.name + ' ' + (item.description ?? '')),
            description: this.cleanText(item.description ?? item.name),
            sourceUrl: url,
            sourceName: this.name,
            ticketUrl: item.offers?.url || url,
            image: item.image?.url || item.image || undefined,
          });
        }
      } catch {
        // malformed JSON — skip
      }
    });

    if (events.length > 0) return events;

    // ── 2. HTML card parsing (fallback for non-structured pages) ────────────
    const cardSelectors = [
      '[class*="event-card"]', '[class*="EventCard"]',
      '[class*="event-item"]', '[class*="EventItem"]',
      '[class*="event-listing"]', 'article[class*="event"]',
      '.events-list li', '[data-event]',
    ];

    for (const sel of cardSelectors) {
      const cards = $(sel);
      if (cards.length === 0) continue;

      cards.each((_, el) => {
        const $el = $(el);
        const title = this.cleanText(
          $el.find('[class*="title"], [class*="name"], h2, h3, h4').first().text()
        );
        if (!title || title.length < 4) return;

        const dateText = this.cleanText(
          $el.find('time, [class*="date"], [class*="when"], [datetime]').first().text() ||
          $el.find('time').attr('datetime') || ''
        );
        const startAt = this.parseFlexDate(dateText);
        if (!startAt || new Date(startAt) < now) return;

        const description = this.cleanText(
          $el.find('p, [class*="desc"], [class*="summary"], [class*="excerpt"]').first().text()
        );
        const link = $el.find('a').first().attr('href');
        const fullLink = link
          ? link.startsWith('http') ? link : new URL(link, hotel.eventsUrl).href
          : usedUrl;

        const category = this.categorize(title, description);

        events.push({
          title,
          startAt,
          venueName: hotel.name,
          address: hotel.address,
          neighborhood: hotel.neighborhood,
          lat: hotel.lat,
          lng: hotel.lng,
          city: hotel.city,
          tags: this.generateTags(title, description, category),
          category,
          isOutdoor: /outdoor|pool|garden|terrace|rooftop|beach/i.test(title + ' ' + description),
          description: description || title,
          sourceUrl: fullLink,
          sourceName: this.name,
          ticketUrl: fullLink,
        });
      });

      if (events.length > 0) break; // found events with this selector
    }

    return events;
  }

  private toIso(s: string): string | null {
    if (!s) return null;
    // Already ISO
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
      return s.includes('T') ? s.split('.')[0] : `${s}T00:00:00`;
    }
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d.toISOString().split('.')[0];
  }

  private parseFlexDate(text: string): string | null {
    if (!text) return null;
    const d = new Date(text);
    if (!isNaN(d.getTime())) {
      return d.toISOString().split('.')[0];
    }
    return null;
  }

  private extractAddress(location: Record<string, unknown> | undefined): string | null {
    if (!location) return null;
    if (typeof location.address === 'string') return location.address;
    const a = location.address as Record<string, string> | undefined;
    if (a) {
      return [a.streetAddress, a.addressLocality, a.addressRegion].filter(Boolean).join(', ');
    }
    return null;
  }

  private parsePriceFromOffers(offers: Record<string, unknown> | undefined): 'Free' | '$' | '$$' | '$$$' | undefined {
    if (!offers) return undefined;
    const price = Number(offers.price ?? offers.lowPrice ?? 0);
    if (price === 0) return 'Free';
    if (price <= 25) return '$';
    if (price <= 75) return '$$';
    return '$$$';
  }

  private parsePriceAmountFromOffers(offers: Record<string, unknown> | undefined): number | undefined {
    if (!offers) return undefined;
    const price = Number(offers.price ?? offers.lowPrice);
    return isNaN(price) ? undefined : price;
  }

  private parsePriceAmount(text: string): number | undefined {
    const match = text.match(/\$(\d+)/);
    return match ? parseInt(match[1], 10) : undefined;
  }
}
