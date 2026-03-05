/**
 * Fever Miami Scraper
 *
 * Fetches real events from Fever (feverup.com) for Miami.
 *
 * Strategy:
 *  1. Fetch city page (feverup.com/en/miami) to get plan IDs from
 *     astro-tools-transfer-state JSON (page-config.cityPlansIds)
 *  2. Fetch individual plan pages (/m/{planId}) to extract:
 *     - Product JSON-LD: title, price, venue geo coordinates, image
 *     - ticket-selector-config transferState: available dates with prices
 *     - OG meta tags: description
 *  3. Create one RawEvent per upcoming date for each plan
 *
 * Fever hosts curated experiences: Candlelight concerts, immersive art,
 * Cirque du Soleil, tastings, and more.
 */

import { BaseScraper } from './base.js';
import * as cheerio from 'cheerio';
import type { RawEvent } from '../types.js';

interface FeverPlanData {
  planId: number;
  title: string;
  description: string;
  price: number;
  priceCurrency: string;
  lat: number | null;
  lng: number | null;
  venueName: string;
  venueCity: string;
  imageUrl: string;
  sourceUrl: string;
  dates: string[]; // ISO date strings like "2026-03-15"
}

export class FeverMiamiScraper extends BaseScraper {
  private cityUrl = 'https://feverup.com/en/miami';
  private maxPlansToFetch = 40; // Limit to avoid rate limits

  constructor() {
    super('Fever Miami', { weight: 1.2, rateLimit: 3000 });
  }

  async scrape(): Promise<RawEvent[]> {
    this.log('Fetching Fever Miami events...');

    try {
      // Step 1: Get plan IDs from city page
      const planIds = await this.getPlanIds();
      if (planIds.length === 0) {
        this.log('No plan IDs found on city page');
        return [];
      }
      this.log(`  Found ${planIds.length} plan IDs, fetching top ${this.maxPlansToFetch}...`);

      // Step 2: Fetch individual plan pages (limited)
      const plans: FeverPlanData[] = [];
      const idsToFetch = planIds.slice(0, this.maxPlansToFetch);

      for (const planId of idsToFetch) {
        try {
          const plan = await this.fetchPlan(planId);
          if (plan && plan.dates.length > 0) {
            plans.push(plan);
          }
        } catch (e) {
          // Skip individual plan failures silently
        }
        await this.sleep(this.config.rateLimit);
      }

      this.log(`  Fetched ${plans.length} plans with upcoming dates`);

      // Step 3: Map to RawEvents (one per upcoming date, max 3 dates per plan)
      const rawEvents: RawEvent[] = [];
      const now = new Date();
      const maxDate = new Date();
      maxDate.setDate(maxDate.getDate() + 60); // Only next 60 days

      for (const plan of plans) {
        const futureDates = plan.dates
          .filter(d => {
            const date = new Date(d);
            return date >= now && date <= maxDate;
          })
          .sort()
          .slice(0, 3); // Max 3 dates per plan

        for (const dateStr of futureDates) {
          const event = this.mapPlanToEvent(plan, dateStr);
          if (event) rawEvents.push(event);
        }
      }

      this.log(`Found ${rawEvents.length} Fever Miami events`);
      return rawEvents;
    } catch (e) {
      this.logError('Fever scrape failed', e);
      return [];
    }
  }

  /**
   * Get plan IDs from the city page's astro-tools-transfer-state.
   */
  private async getPlanIds(): Promise<number[]> {
    const $ = await this.fetchHTMLNativeRetry(this.cityUrl, 2, 15_000);
    const stateScript = $('script#astro-tools-transfer-state').html();
    if (!stateScript) {
      this.log('  No astro-tools-transfer-state found');
      return [];
    }

    try {
      const state = JSON.parse(stateScript);
      const pageConfig = state['page-config'] || {};
      const allIds: number[] = pageConfig.cityPlansIds || [];
      // Deduplicate
      return [...new Set(allIds)];
    } catch {
      this.log('  Failed to parse transfer state');
      return [];
    }
  }

  /**
   * Fetch a single plan page and extract event data.
   */
  private async fetchPlan(planId: number): Promise<FeverPlanData | null> {
    const url = `https://feverup.com/m/${planId}`;
    const $ = await this.fetchHTMLNativeRetry(url, 2, 10_000);

    // Extract Product JSON-LD
    let title = '';
    let price = 0;
    let priceCurrency = 'USD';
    let lat: number | null = null;
    let lng: number | null = null;
    let venueName = '';
    let venueCity = '';
    let imageUrl = '';

    $('script[type="application/ld+json"]').each((_i, el) => {
      try {
        const data = JSON.parse($(el).html() || '');
        if (data['@type'] === 'Product') {
          title = data.name || '';

          // Get offers for price and venue
          const offers = Array.isArray(data.offers) ? data.offers : [data.offers];
          for (const offer of offers) {
            if (!offer) continue;
            if (offer.price && !price) {
              price = parseFloat(offer.price) || 0;
              priceCurrency = offer.priceCurrency || 'USD';
            }
            // Venue from areaServed
            const area = offer.areaServed;
            if (area) {
              venueName = area.name || '';
              venueCity = area.address?.addressLocality || '';
              if (area.geo) {
                lat = area.geo.latitude || null;
                lng = area.geo.longitude || null;
              }
            }
          }

          // Image with geo
          const img = data.image;
          if (img && typeof img === 'object') {
            imageUrl = img.contentUrl || '';
            if (!lat && img.contentLocation?.geo) {
              lat = img.contentLocation.geo.latitude || null;
              lng = img.contentLocation.geo.longitude || null;
            }
          }
        }
      } catch {
        // Ignore parse errors
      }
    });

    if (!title) {
      // Fallback: get title from og:title
      title = $('meta[property="og:title"]').attr('content') || '';
      title = title.replace(/\s*[|\-]\s*(?:Tickets?\s*)?[|\-]?\s*Fever\s*$/i, '').trim();
    }

    if (!title) return null;

    // Get description from og:description
    const description = $('meta[property="og:description"]').attr('content') || '';

    // Extract available dates from ticket-selector-config
    const dates: string[] = [];
    const transferStateScript = $('script#astro-tools-transfer-state').html();
    if (transferStateScript) {
      try {
        const state = JSON.parse(transferStateScript);
        const ticketConfig = state['ticket-selector-config'] || {};
        const transferState = ticketConfig.transferState || {};

        // Keys look like "PlanCalendarSelectorService.getCalendarAvailability:268290:..."
        for (const [key, value] of Object.entries(transferState)) {
          if (key.includes('CalendarAvailability') && typeof value === 'object' && value !== null) {
            const datesObj = (value as any).dates || {};
            for (const dateStr of Object.keys(datesObj)) {
              if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
                dates.push(dateStr);
              }
            }
          }
        }
      } catch {
        // Ignore
      }
    }

    return {
      planId,
      title,
      description: this.cleanText(description).slice(0, 300),
      price,
      priceCurrency,
      lat,
      lng,
      venueName,
      venueCity,
      imageUrl,
      sourceUrl: url,
      dates,
    };
  }

  private mapPlanToEvent(plan: FeverPlanData, dateStr: string): RawEvent | null {
    const startAt = `${dateStr}T19:00:00`; // Default to 7 PM

    const city = this.resolveCity(plan.venueCity, plan.venueName);
    const neighborhood = this.resolveNeighborhood(plan.venueName, plan.title);
    const category = this.categorize(plan.title, plan.description, plan.venueName);
    const tags = this.generateTags(plan.title, plan.description, category);

    // Price label
    let priceLabel: 'Free' | '$' | '$$' | '$$$' = '$';
    if (plan.price === 0) priceLabel = 'Free';
    else if (plan.price <= 25) priceLabel = '$';
    else if (plan.price <= 75) priceLabel = '$$';
    else priceLabel = '$$$';

    return {
      title: plan.title,
      startAt,
      venueName: plan.venueName || undefined,
      neighborhood,
      lat: plan.lat,
      lng: plan.lng,
      city,
      tags: tags.slice(0, 5),
      category,
      priceLabel,
      priceAmount: Math.round(plan.price),
      isOutdoor: this.isOutdoor(plan.title, plan.description, plan.venueName),
      description: plan.description || `${plan.title} — via Fever`,
      sourceUrl: plan.sourceUrl,
      sourceName: this.name,
      ticketUrl: plan.sourceUrl,
      image: plan.imageUrl || undefined,
    };
  }

  private resolveCity(venueCity: string, venueName: string): 'Miami' | 'Fort Lauderdale' | 'Palm Beach' {
    const text = `${venueCity} ${venueName}`.toLowerCase();
    if (/fort lauderdale|hollywood|dania|pompano|davie|plantation|pembroke|hallandale|wilton manors/.test(text)) {
      return 'Fort Lauderdale';
    }
    if (/palm beach|boca raton|delray|boynton|jupiter|lake worth/.test(text)) {
      return 'Palm Beach';
    }
    return 'Miami';
  }

  private resolveNeighborhood(venueName: string, title: string): string {
    const text = `${venueName} ${title}`.toLowerCase();
    if (/wynwood/.test(text)) return 'Wynwood';
    if (/brickell/.test(text)) return 'Brickell';
    if (/south beach|ocean dr|collins/.test(text)) return 'South Beach';
    if (/design district/.test(text)) return 'Design District';
    if (/little havana|calle ocho/.test(text)) return 'Little Havana';
    if (/coconut grove/.test(text)) return 'Coconut Grove';
    if (/coral gables/.test(text)) return 'Coral Gables';
    if (/downtown/.test(text)) return 'Downtown Miami';
    if (/miami beach/.test(text)) return 'Miami Beach';
    if (/edgewater/.test(text)) return 'Edgewater';
    if (/midtown/.test(text)) return 'Midtown';
    return 'Miami';
  }
}
