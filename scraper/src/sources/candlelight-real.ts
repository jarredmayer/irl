/**
 * Candlelight Concerts -- Real Scraper
 * Source: https://feverup.com/en/miami/candlelight
 *
 * Scrapes actual scheduled Candlelight concerts by:
 *  1. Fetching the listing page to get event URLs from JSON-LD ItemList
 *  2. Fetching each event page to extract Event JSON-LD with dates/venues/prices
 *
 * No Puppeteer/Chrome required -- uses plain HTTP requests with cheerio.
 *
 * CURATOR REVIEW RECOMMENDED
 * Verify the venue exists and show is still on sale before each publish run.
 */

import { BaseScraper } from './base.js';
import type { RawEvent } from '../types.js';

interface FeverEventData {
  name: string;
  startDate: string;
  endDate?: string;
  url: string;
  description?: string;
  image?: string;
  location?: {
    name?: string;
    address?: {
      addressLocality?: string;
      streetAddress?: string;
      addressRegion?: string;
    };
    geo?: {
      latitude?: number;
      longitude?: number;
    };
  };
  offers?: Array<{
    price?: number;
    priceCurrency?: string;
    name?: string;
  }>;
}

export class CandlelightRealScraper extends BaseScraper {
  private readonly LISTING_URL = 'https://feverup.com/en/miami/candlelight';

  constructor() {
    super('Candlelight Concerts (Fever)', { weight: 1.5, rateLimit: 3000 });
  }

  async scrape(): Promise<RawEvent[]> {
    this.log('Fetching Candlelight listing page...');

    // Step 1: Get the list of event URLs from the listing page
    const eventUrls = await this.fetchEventUrls();
    if (eventUrls.length === 0) {
      this.log('No event URLs found on listing page');
      return [];
    }
    this.log(`Found ${eventUrls.length} Candlelight event URLs`);

    // Step 2: Fetch each event page and extract JSON-LD
    const events: RawEvent[] = [];
    const now = new Date();

    for (const url of eventUrls) {
      try {
        const eventData = await this.fetchEventData(url);
        if (!eventData) continue;

        const event = this.buildEvent(eventData, now);
        if (event) events.push(event);
      } catch (err) {
        this.logError(`Failed to fetch event: ${url}`, err);
      }
    }

    this.log(`Extracted ${events.length} future Candlelight events from ${eventUrls.length} pages`);
    return events;
  }

  /**
   * Fetch the listing page and extract event URLs from the ItemList JSON-LD,
   * with fallback strategies if JSON-LD is missing.
   */
  private async fetchEventUrls(): Promise<string[]> {
    try {
      const $ = await this.fetchHTMLNativeRetry(this.LISTING_URL, 2, 15_000);

      // Log page size so we know it loaded
      const htmlLength = $.html().length;
      this.log(`Listing page HTML length: ${htmlLength}`);

      const urls: string[] = [];

      // Log all JSON-LD script types for debugging
      const jsonLdScripts = $('script[type="application/ld+json"]');
      this.log(`Found ${jsonLdScripts.length} JSON-LD script(s)`);

      jsonLdScripts.each((_, el) => {
        try {
          const data = JSON.parse($(el).text());
          const atType = data['@type'] || data.type || 'unknown';
          this.log(`  JSON-LD @type: ${atType}`);
          if (data['@type'] === 'ItemList' && Array.isArray(data.itemListElement)) {
            for (const item of data.itemListElement) {
              if (item.url) {
                urls.push(item.url);
              }
            }
          }
        } catch {
          // skip malformed JSON-LD
        }
      });

      if (urls.length > 0) {
        this.log(`Found ${urls.length} URLs from JSON-LD ItemList`);
        return urls;
      }

      this.log('JSON-LD ItemList returned 0 URLs, trying HTML fallback strategies...');

      // Fallback 1: extract <a href> links to Fever event/candlelight pages
      const seen = new Set<string>();

      $('a[href]').each((_, el) => {
        const href = $(el).attr('href');
        if (!href) return;
        // Match candlelight event pages or /plan/ pages
        if (/\/en\/miami\/candlelight\//.test(href) || /\/plan\//.test(href)) {
          const fullUrl = href.startsWith('http') ? href : `https://feverup.com${href}`;
          // Avoid duplicates and the listing page itself
          if (!seen.has(fullUrl) && fullUrl !== this.LISTING_URL && fullUrl !== this.LISTING_URL + '/') {
            seen.add(fullUrl);
            urls.push(fullUrl);
          }
        }
      });

      if (urls.length > 0) {
        this.log(`Found ${urls.length} URLs from <a href> links`);
        return urls;
      }

      // Fallback 2: extract data-plan-id attributes and construct URLs
      const planIds: string[] = [];
      $('[data-plan-id]').each((_, el) => {
        const planId = $(el).attr('data-plan-id');
        if (planId && !planIds.includes(planId)) {
          planIds.push(planId);
        }
      });

      if (planIds.length > 0) {
        this.log(`Found ${planIds.length} data-plan-id attributes, constructing URLs`);
        for (const planId of planIds) {
          urls.push(`https://feverup.com/en/miami/plan/${planId}`);
        }
        return urls;
      }

      this.log('All fallback strategies returned 0 URLs');
      return [];
    } catch (err) {
      this.logError('Failed to fetch listing page', err);
      return [];
    }
  }

  /**
   * Fetch an individual event page and extract the Event JSON-LD.
   */
  private async fetchEventData(url: string): Promise<FeverEventData | null> {
    const $ = await this.fetchHTMLNativeRetry(url, 2, 12_000);

    let eventData: FeverEventData | null = null;

    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const data = JSON.parse($(el).text());
        if (data['@type'] === 'Event' && data.name && data.startDate) {
          // Only keep Candlelight entries
          if (!/candlelight/i.test(data.name)) return;

          const location = data.location || {};
          const address = typeof location.address === 'string'
            ? { addressLocality: location.address }
            : location.address || {};

          eventData = {
            name: data.name,
            startDate: data.startDate,
            endDate: data.endDate,
            url: data.url || url,
            description: data.description,
            image: typeof data.image === 'string' ? data.image : data.image?.contentUrl || data.image?.url,
            location: {
              name: location.name,
              address: {
                addressLocality: address.addressLocality,
                streetAddress: address.streetAddress,
                addressRegion: address.addressRegion,
              },
              geo: location.geo
                ? {
                    latitude: location.geo.latitude,
                    longitude: location.geo.longitude,
                  }
                : undefined,
            },
            offers: Array.isArray(data.offers)
              ? data.offers.map((o: Record<string, unknown>) => ({
                  price: typeof o.price === 'number' ? o.price : parseFloat(String(o.price || '0')),
                  priceCurrency: String(o.priceCurrency || 'USD'),
                  name: String(o.name || ''),
                }))
              : data.offers
                ? [{
                    price: typeof data.offers.price === 'number' ? data.offers.price : parseFloat(String(data.offers.price || '0')),
                    priceCurrency: String(data.offers.priceCurrency || 'USD'),
                    name: String(data.offers.name || ''),
                  }]
                : [],
          };
        }
      } catch {
        // skip malformed JSON-LD
      }
    });

    return eventData;
  }

  /**
   * Convert extracted event data into a RawEvent.
   */
  private buildEvent(data: FeverEventData, now: Date): RawEvent | null {
    const startAt = this.toIsoDateTime(data.startDate);
    if (!startAt) return null;
    if (new Date(startAt) < now) return null;

    const venueName = data.location?.name || 'TBA';
    const neighborhood = this.inferNeighborhoodFromVenue(venueName);

    const addressParts = [
      data.location?.address?.streetAddress,
      data.location?.address?.addressLocality,
      data.location?.address?.addressRegion,
    ].filter(Boolean);
    const address = addressParts.join(', ') || undefined;

    // Extract lowest price from offers
    const prices = (data.offers || [])
      .map((o) => o.price)
      .filter((p): p is number => typeof p === 'number' && p > 0);
    const lowestPrice = prices.length > 0 ? Math.min(...prices) : 45;

    const { label: priceLabel, amount: priceAmount } = this.parsePrice(`$${Math.round(lowestPrice)}`);

    // Clean description: strip emojis and excessive whitespace
    const description = this.cleanDescription(data.description || data.name);

    return {
      title: data.name,
      startAt,
      venueName: venueName || undefined,
      address,
      neighborhood,
      lat: data.location?.geo?.latitude ?? null,
      lng: data.location?.geo?.longitude ?? null,
      city: 'Miami',
      tags: ['live-music', 'local-favorite'],
      category: 'Music',
      priceLabel,
      priceAmount,
      isOutdoor: false,
      description,
      sourceUrl: data.url,
      sourceName: this.name,
      ticketUrl: data.url || undefined,
      image: data.image || undefined,
    };
  }

  private toIsoDateTime(s: string): string | null {
    if (!s) return null;
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d.toISOString().replace('Z', '').split('.')[0];
  }

  private cleanDescription(text: string): string {
    return text
      .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 500);
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
    if (v.includes('scottish rite') || v.includes('scottish')) return 'Miami';
    return 'Miami';
  }
}
