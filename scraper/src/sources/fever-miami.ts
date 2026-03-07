/**
 * Fever Miami Scraper
 *
 * Fetches real events from Fever (feverup.com) for Miami.
 *
 * Strategy (optimized to avoid timeouts):
 *  1. Fetch city page (feverup.com/en/miami) ONCE
 *  2. Extract plan links and titles from the HTML (<a href="/m/{planId}">)
 *  3. Extract JSON-LD Event/Product data from the city page
 *  4. Extract plan IDs from astro-tools-transfer-state
 *  5. Only fetch detail pages for top 10 plans (with 1s rate limiting)
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

  constructor() {
    super('Fever Miami', { weight: 1.2, rateLimit: 1000 });
  }

  async scrape(): Promise<RawEvent[]> {
    this.log('Fetching Fever Miami events...');

    try {
      // Step 1: Fetch the city page ONCE
      const $ = await this.fetchHTMLNativeRetry(this.cityUrl, 2, 15_000);
      const html = $.html() || '';
      const rawEvents: RawEvent[] = [];

      // Step 2: Extract events from JSON-LD on the city page
      const jsonLdEvents = this.extractJsonLdEvents($);
      rawEvents.push(...jsonLdEvents);
      this.log(`  JSON-LD: ${jsonLdEvents.length} events`);

      // Step 3: Extract plan links from HTML
      const planLinks = this.extractPlanLinks($);
      this.log(`  Plan links found: ${planLinks.length}`);

      // Step 4: Get plan IDs from astro-tools-transfer-state
      const planIds = this.extractPlanIds($, html);
      this.log(`  Plan IDs from transfer state: ${planIds.length}`);

      // Step 5: Create events from plan links that aren't already in JSON-LD
      const existingTitles = new Set(rawEvents.map(e => e.title.toLowerCase()));
      for (const plan of planLinks) {
        if (existingTitles.has(plan.title.toLowerCase())) continue;
        existingTitles.add(plan.title.toLowerCase());

        const category = this.categorize(plan.title, '', '');
        const tags = this.generateTags(plan.title, '', category);

        rawEvents.push({
          title: plan.title,
          startAt: `${new Date().toISOString().split('T')[0]}T19:00:00`,
          city: 'Miami',
          tags: tags.slice(0, 5),
          category,
          isOutdoor: false,
          description: `${plan.title} — via Fever`,
          sourceUrl: plan.url,
          sourceName: this.name,
          ticketUrl: plan.url,
          image: plan.image || undefined,
        });
      }

      // Step 6: Fetch detail pages for top 10 plans to get dates/venues/prices
      const plansToFetch = planIds
        .filter(id => !jsonLdEvents.some(e => e.sourceUrl?.includes(`/m/${id}`)))
        .slice(0, 10);

      this.log(`  Fetching ${plansToFetch.length} plan detail pages...`);
      for (const planId of plansToFetch) {
        try {
          const plan = await this.fetchPlan(planId);
          if (plan && plan.dates.length > 0) {
            const now = new Date();
            const maxDate = new Date();
            maxDate.setDate(maxDate.getDate() + 60);

            const futureDates = plan.dates
              .filter(d => {
                const date = new Date(d);
                return date >= now && date <= maxDate;
              })
              .sort()
              .slice(0, 3);

            for (const dateStr of futureDates) {
              const event = this.mapPlanToEvent(plan, dateStr);
              if (event && !existingTitles.has(event.title.toLowerCase())) {
                rawEvents.push(event);
                existingTitles.add(event.title.toLowerCase());
              }
            }
          }
        } catch {
          // Skip individual plan failures silently
        }
        await this.sleep(this.config.rateLimit);
      }

      this.log(`Found ${rawEvents.length} Fever Miami events`);
      return rawEvents;
    } catch (e) {
      this.logError('Fever scrape failed', e);
      return [];
    }
  }

  /**
   * Extract Event/Product structured data from JSON-LD on the city page.
   */
  private extractJsonLdEvents($: cheerio.CheerioAPI): RawEvent[] {
    const events: RawEvent[] = [];
    const now = new Date();
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 60);

    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const data = JSON.parse($(el).html() || '');
        const items = Array.isArray(data)
          ? data
          : data['@type'] === 'ItemList'
            ? (data.itemListElement || []).map((li: any) => li.item || li)
            : [data];

        for (const item of items) {
          if ((item['@type'] === 'Event' || item['@type'] === 'Product') && item.name) {
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
              startAt: dateStr
                ? dateStr.replace('Z', '').replace(/\.\d+$/, '')
                : `${now.toISOString().split('T')[0]}T19:00:00`,
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
              image: typeof item.image === 'string' ? item.image : item.image?.url || item.image?.contentUrl || undefined,
            });
          }
        }
      } catch { /* skip */ }
    });

    return events;
  }

  /**
   * Extract plan links and titles from <a href="/m/{planId}"> elements.
   */
  private extractPlanLinks($: cheerio.CheerioAPI): Array<{ title: string; url: string; planId: number; image?: string }> {
    const plans: Array<{ title: string; url: string; planId: number; image?: string }> = [];
    const seenIds = new Set<number>();

    $('a[href*="/m/"]').each((_, el) => {
      const $el = $(el);
      const href = $el.attr('href') || '';
      const planIdMatch = href.match(/\/m\/(\d+)/);
      if (!planIdMatch) return;

      const planId = parseInt(planIdMatch[1]);
      if (seenIds.has(planId)) return;
      seenIds.add(planId);

      // Get title from the link text, aria-label, or title attribute
      let title = $el.attr('title') || $el.attr('aria-label') || '';
      if (!title) {
        // Try text content, but skip if it's too long (likely a container)
        const text = $el.text().trim();
        if (text.length > 5 && text.length < 200) {
          title = text;
        }
      }
      if (!title || title.length < 5) return;

      // Clean title
      title = this.cleanText(title).replace(/\s*[|\-]\s*(?:Tickets?\s*)?[|\-]?\s*Fever\s*$/i, '').trim();

      // Try to get image from within the link
      const img = $el.find('img').first();
      const image = img.attr('src') || img.attr('data-src') || undefined;

      const url = href.startsWith('http') ? href : `https://feverup.com${href}`;
      plans.push({ title, url, planId, image });
    });

    return plans;
  }

  /**
   * Extract plan IDs from astro-tools-transfer-state or inline JSON.
   */
  private extractPlanIds($: cheerio.CheerioAPI, html: string): number[] {
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
        // Try other keys
        for (const [key, value] of Object.entries(state)) {
          if (typeof value === 'object' && value !== null) {
            const planIds = (value as any).cityPlansIds || (value as any).planIds || (value as any).plans;
            if (Array.isArray(planIds) && planIds.length > 0) {
              return [...new Set(planIds.map((id: any) => typeof id === 'object' ? id.id || id.planId : id).filter(Number))];
            }
          }
        }
      } catch { /* ignore parse errors */ }
    }

    // Try __NEXT_DATA__
    const nextDataScript = $('script#__NEXT_DATA__').html();
    if (nextDataScript) {
      try {
        const nextData = JSON.parse(nextDataScript);
        const plans = nextData?.props?.pageProps?.plans || nextData?.props?.pageProps?.cityPlans || [];
        if (Array.isArray(plans) && plans.length > 0) {
          return plans.map((p: any) => p.id || p.planId || p).filter(Number);
        }
      } catch { /* ignore */ }
    }

    // Try regex fallback
    const planIdsMatch = html.match(/"cityPlansIds"\s*:\s*\[([0-9,\s]+)\]/);
    if (planIdsMatch) {
      const ids = planIdsMatch[1].split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n));
      if (ids.length > 0) {
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
          const offers = Array.isArray(data.offers) ? data.offers : [data.offers];
          for (const offer of offers) {
            if (!offer) continue;
            if (offer.price && !price) {
              price = parseFloat(offer.price) || 0;
              priceCurrency = offer.priceCurrency || 'USD';
            }
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
          const img = data.image;
          if (img && typeof img === 'object') {
            imageUrl = img.contentUrl || '';
            if (!lat && img.contentLocation?.geo) {
              lat = img.contentLocation.geo.latitude || null;
              lng = img.contentLocation.geo.longitude || null;
            }
          }
        }
      } catch { /* ignore */ }
    });

    if (!title) {
      title = $('meta[property="og:title"]').attr('content') || '';
      title = title.replace(/\s*[|\-]\s*(?:Tickets?\s*)?[|\-]?\s*Fever\s*$/i, '').trim();
    }
    if (!title) return null;

    const description = $('meta[property="og:description"]').attr('content') || '';

    // Extract available dates
    const dates: string[] = [];
    const transferStateScript = $('script#astro-tools-transfer-state').html();
    if (transferStateScript) {
      try {
        const state = JSON.parse(transferStateScript);
        const ticketConfig = state['ticket-selector-config'] || {};
        const transferState = ticketConfig.transferState || {};

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
      } catch { /* ignore */ }
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
    const startAt = `${dateStr}T19:00:00`;
    const city = this.resolveCity(plan.venueCity, plan.venueName);
    const neighborhood = this.resolveNeighborhood(plan.venueName, plan.title);
    const category = this.categorize(plan.title, plan.description, plan.venueName);
    const tags = this.generateTags(plan.title, plan.description, category);

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
