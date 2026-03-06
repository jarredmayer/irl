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
        this.log('No plan IDs found on city page — trying JSON-LD fallback');
        return this.scrapeCityPageJsonLd();
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
    const $ = await this.fetchHTMLNativeRetry(this.cityUrl, 2, 12_000);

    // Try astro-tools-transfer-state first
    const stateScript = $('script#astro-tools-transfer-state').html();
    if (stateScript) {
      try {
        const state = JSON.parse(stateScript);
        const pageConfig = state['page-config'] || {};
        const allIds: number[] = pageConfig.cityPlansIds || [];
        if (allIds.length > 0) {
          return [...new Set(allIds)];
        }
        this.log('  astro-tools-transfer-state found but cityPlansIds is empty');
        // Try other keys in the state
        for (const [key, value] of Object.entries(state)) {
          if (typeof value === 'object' && value !== null) {
            const planIds = (value as any).cityPlansIds || (value as any).planIds || (value as any).plans;
            if (Array.isArray(planIds) && planIds.length > 0) {
              this.log(`  Found plan IDs under key: ${key} (${planIds.length} plans)`);
              return [...new Set(planIds.map((id: any) => typeof id === 'object' ? id.id || id.planId : id).filter(Number))];
            }
          }
        }
      } catch {
        this.log('  Failed to parse transfer state JSON');
      }
    } else {
      this.log('  No astro-tools-transfer-state found');
    }

    // Try __NEXT_DATA__ (Fever may have migrated to Next.js)
    const nextDataScript = $('script#__NEXT_DATA__').html();
    if (nextDataScript) {
      try {
        const nextData = JSON.parse(nextDataScript);
        const plans = nextData?.props?.pageProps?.plans || nextData?.props?.pageProps?.cityPlans || [];
        if (Array.isArray(plans) && plans.length > 0) {
          this.log(`  Found ${plans.length} plans in __NEXT_DATA__`);
          return plans.map((p: any) => p.id || p.planId || p).filter(Number);
        }
      } catch {
        this.log('  __NEXT_DATA__ parse failed');
      }
    }

    // Try any inline JSON with plan data
    const htmlStr = $.html() || '';
    const planIdsMatch = htmlStr.match(/"cityPlansIds"\s*:\s*\[([0-9,\s]+)\]/);
    if (planIdsMatch) {
      const ids = planIdsMatch[1].split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n));
      if (ids.length > 0) {
        this.log(`  Found ${ids.length} plan IDs via regex`);
        return [...new Set(ids)];
      }
    }

    return [];
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

  /**
   * Fallback: scrape the Fever city page for JSON-LD Event data
   * when the astro-tools-transfer-state approach fails.
   */
  private async scrapeCityPageJsonLd(): Promise<RawEvent[]> {
    const events: RawEvent[] = [];
    const now = new Date();
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 60);

    try {
      const $ = await this.fetchHTMLNativeRetry(this.cityUrl, 2, 12_000);

      // Try JSON-LD
      $('script[type="application/ld+json"]').each((_, el) => {
        try {
          const data = JSON.parse($(el).html() || '');
          const items = Array.isArray(data) ? data : data['@type'] === 'ItemList' ? (data.itemListElement || []).map((li: any) => li.item || li) : [data];
          for (const item of items) {
            if ((item['@type'] === 'Event' || item['@type'] === 'Product') && item.name && (item.startDate || item.offers)) {
              const dateStr = item.startDate || '';
              if (dateStr) {
                const date = new Date(dateStr);
                if (date < now || date > maxDate) continue;
              }
              const venue = item.location || {};
              const category = this.categorize(item.name, item.description || '', venue.name || '');
              const tags = this.generateTags(item.name, item.description || '', category);
              events.push({
                title: item.name,
                startAt: dateStr ? dateStr.replace('Z', '').replace(/\.\d+$/, '') : `${now.toISOString().split('T')[0]}T19:00:00`,
                venueName: venue.name || undefined,
                lat: venue.geo?.latitude || null,
                lng: venue.geo?.longitude || null,
                city: 'Miami',
                tags: tags.slice(0, 5),
                category,
                isOutdoor: this.isOutdoor(item.name, item.description || ''),
                description: item.description || `${item.name} — via Fever`,
                sourceUrl: item.url || this.cityUrl,
                sourceName: this.name,
                ticketUrl: item.url || undefined,
                image: typeof item.image === 'string' ? item.image : item.image?.url || undefined,
              });
            }
          }
        } catch { /* skip */ }
      });

      // Try extracting from any embedded event cards via og:image and meta tags
      if (events.length === 0) {
        // Parse event cards from the page
        $('a[href*="/m/"]').each((_, el) => {
          const $el = $(el);
          const href = $el.attr('href') || '';
          const title = $el.attr('title') || $el.text().trim();
          if (title.length > 5 && href.includes('/m/')) {
            const planIdMatch = href.match(/\/m\/(\d+)/);
            if (planIdMatch) {
              events.push({
                title,
                startAt: `${now.toISOString().split('T')[0]}T19:00:00`,
                city: 'Miami',
                tags: ['experience'],
                category: this.categorize(title, ''),
                isOutdoor: false,
                description: `${title} — via Fever`,
                sourceUrl: href.startsWith('http') ? href : `https://feverup.com${href}`,
                sourceName: this.name,
              });
            }
          }
        });
      }

      this.log(`  JSON-LD fallback: ${events.length} events`);
      return events;
    } catch (e) {
      this.logError('City page JSON-LD fallback failed', e);
      return [];
    }
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
