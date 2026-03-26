/**
 * Las Olas Boulevard Events Scraper
 * Source: https://www.lasolasboulevard.com/event-list
 *
 * Scrapes real events from the Las Olas Boulevard Wix site by extracting
 * the warmupData JSON embedded in the page source. This contains complete
 * structured event data including titles, descriptions, venues, addresses,
 * GPS coordinates, dates/times, and images — no Puppeteer needed.
 *
 * Wix Events App ID: 140603ad-af8d-84a5-2c80-a0f60cb47351
 */

import { BaseScraper } from './base.js';
import type { RawEvent } from '../types.js';

interface WixEvent {
  id: string;
  title: string;
  description?: string;
  about?: string;
  slug?: string;
  mainImage?: { url?: string };
  location?: {
    name?: string;
    address?: string;
    coordinates?: { lat: number; lng: number };
  };
  scheduling?: {
    config?: {
      startDate?: string;
      endDate?: string;
      timeZoneId?: string;
    };
    formatted?: string;
    startDateFormatted?: string;
    startTimeFormatted?: string;
  };
  registration?: {
    ticketing?: { soldOut?: boolean };
  };
}

export class LasOlasEventsScraper extends BaseScraper {
  private readonly PAGE_URL = 'https://www.lasolasboulevard.com/event-list';
  private readonly SITEMAP_URL = 'https://www.lasolasboulevard.com/event-pages-sitemap.xml';

  constructor() {
    super('Las Olas Boulevard', { weight: 1.4, rateLimit: 1000 });
  }

  async scrape(): Promise<RawEvent[]> {
    this.log('Fetching Las Olas Boulevard events...');

    // Primary: extract events from warmupData JSON on event-list page
    const warmupEvents = await this.scrapeFromWarmupData();
    if (warmupEvents.length > 0) {
      return warmupEvents;
    }

    // Fallback: parse event-pages sitemap
    this.log('warmupData extraction failed, falling back to sitemap...');
    return this.scrapeFromSitemap();
  }

  private async scrapeFromWarmupData(): Promise<RawEvent[]> {
    try {
      const html = await this.fetchHTMLNative(this.PAGE_URL, 20_000);

      // Extract warmupData from Wix's dedicated script tag
      const scriptMatch = html.match(/<script[^>]*id="wix-warmup-data"[^>]*>([\s\S]*?)<\/script>/);
      if (!scriptMatch) {
        // Fallback: try the old inline marker approach
        const marker = '"events":{"events":[';
        const idx = html.indexOf(marker);
        if (idx === -1) {
          this.log('Could not find wix-warmup-data script tag or events marker');
          return [];
        }
        // Use old bracket-matching approach
        const arrStart = idx + marker.length - 1;
        let depth = 0;
        let endIdx = -1;
        for (let i = arrStart; i < html.length && i < arrStart + 2_000_000; i++) {
          if (html[i] === '[') depth++;
          else if (html[i] === ']') {
            depth--;
            if (depth === 0) { endIdx = i; break; }
          }
        }
        if (endIdx === -1) {
          this.log('Could not parse events JSON array');
          return [];
        }
        const wixEvents: WixEvent[] = JSON.parse(html.slice(arrStart, endIdx + 1));
        this.log(`Found ${wixEvents.length} events in warmupData (marker)`);
        const events = this.normalizeWixEvents(wixEvents);
        this.log(`Normalized ${events.length} upcoming Las Olas events`);
        return events;
      }

      let warmup: any;
      try {
        warmup = JSON.parse(scriptMatch[1]);
      } catch {
        this.log('Could not parse wix-warmup-data JSON');
        return [];
      }

      // Log all top-level keys for debugging structure changes
      const topLevelKeys = Object.keys(warmup);
      this.log(`warmupData top-level keys (${topLevelKeys.length}): ${topLevelKeys.join(', ')}`);
      for (const tlk of topLevelKeys) {
        if (warmup[tlk] && typeof warmup[tlk] === 'object' && !Array.isArray(warmup[tlk])) {
          const subKeys = Object.keys(warmup[tlk]);
          this.log(`  warmup["${tlk}"] keys (${subKeys.length}): ${subKeys.join(', ')}`);
        }
      }

      // The Wix Events App ID stays the same: 140603ad-af8d-84a5-2c80-a0f60cb47351
      const APP_ID = '140603ad-af8d-84a5-2c80-a0f60cb47351';

      // Primary path: warmup.appsWarmupData[APP_ID]
      let appData = warmup?.appsWarmupData?.[APP_ID];

      // Log appsWarmupData keys for debugging
      if (warmup?.appsWarmupData) {
        const appIds = Object.keys(warmup.appsWarmupData);
        this.log(`appsWarmupData has ${appIds.length} app IDs: ${appIds.join(', ')}`);
      } else {
        this.log('appsWarmupData is missing or falsy');
      }

      // Fallback path 1: warmup.wixAppData[APP_ID]
      if (!appData) {
        appData = warmup?.wixAppData?.[APP_ID];
        if (appData) this.log('Found app data via fallback: warmup.wixAppData[APP_ID]');
      }

      // Fallback path 2: warmup[APP_ID] directly
      if (!appData) {
        appData = warmup?.[APP_ID];
        if (appData) this.log('Found app data via fallback: warmup[APP_ID]');
      }

      // Fallback path 3: iterate ALL app IDs in appsWarmupData
      if (!appData && warmup?.appsWarmupData) {
        for (const candidateId of Object.keys(warmup.appsWarmupData)) {
          const candidate = warmup.appsWarmupData[candidateId];
          if (candidate && typeof candidate === 'object') {
            for (const wKey of Object.keys(candidate)) {
              const widgetEvents = candidate[wKey]?.events?.events;
              if (Array.isArray(widgetEvents) && widgetEvents.length > 0) {
                this.log(`Found events via alternate app ID "${candidateId}", widget "${wKey}" (${widgetEvents.length} events)`);
                appData = candidate;
                break;
              }
            }
            if (appData) break;
          }
        }
      }

      // Fallback path 4: recursively search for any object with an `events` array
      if (!appData) {
        const found = this.findEventsRecursive(warmup);
        if (found && found.length > 0) {
          this.log(`Found ${found.length} events via recursive search`);
          const events = this.normalizeWixEvents(found);
          this.log(`Normalized ${events.length} upcoming Las Olas events`);
          return events;
        }
      }

      if (!appData) {
        this.log('Could not find Wix Events app data via any path');
        return [];
      }

      // Find the widget with the most events (there may be multiple widgets)
      let wixEvents: WixEvent[] = [];
      for (const widgetKey of Object.keys(appData)) {
        const widgetEvents = appData[widgetKey]?.events?.events;
        if (Array.isArray(widgetEvents) && widgetEvents.length > wixEvents.length) {
          wixEvents = widgetEvents;
        }
      }

      if (wixEvents.length === 0) {
        this.log('No events found in Wix warmup data (checked all widgets)');
        return [];
      }

      this.log(`Found ${wixEvents.length} events in warmupData`);
      const events = this.normalizeWixEvents(wixEvents);
      this.log(`Normalized ${events.length} upcoming Las Olas events`);
      return events;
    } catch (error) {
      this.logError('Failed to extract warmupData events', error);
      return [];
    }
  }

  private normalizeWixEvents(wixEvents: WixEvent[]): RawEvent[] {
    const events: RawEvent[] = [];
    const now = new Date();

    for (const wix of wixEvents) {
      if (!wix.title || !wix.scheduling?.config?.startDate) continue;

      // Parse UTC start date and convert to local
      const startUtc = new Date(wix.scheduling.config.startDate);
      if (isNaN(startUtc.getTime())) continue;

      // Skip past events
      if (startUtc < now) continue;

      // Skip sold out events
      if (wix.registration?.ticketing?.soldOut) continue;

      // Convert UTC to ET (offset -5 or -4 for EDT)
      const etOffset = this.getETOffset(startUtc);
      const startLocal = new Date(startUtc.getTime() + etOffset * 60 * 60 * 1000);
      const startAt = startLocal.toISOString().replace('Z', '').slice(0, 19);

      let endAt: string | undefined;
      if (wix.scheduling.config.endDate) {
        const endUtc = new Date(wix.scheduling.config.endDate);
        if (!isNaN(endUtc.getTime())) {
          const endLocal = new Date(endUtc.getTime() + etOffset * 60 * 60 * 1000);
          endAt = endLocal.toISOString().replace('Z', '').slice(0, 19);
        }
      }

      const description = wix.description || wix.about || wix.title;
      const venueName = wix.location?.name || 'Las Olas Boulevard';
      const category = this.categorize(wix.title, description, venueName);
      const tags = this.generateTags(wix.title, description, category);

      const sourceUrl = wix.slug
        ? `https://www.lasolasboulevard.com/event-details/${wix.slug}`
        : this.PAGE_URL;

      events.push({
        title: wix.title,
        startAt,
        endAt,
        venueName,
        address: wix.location?.address || 'Las Olas Blvd, Fort Lauderdale, FL 33301',
        neighborhood: this.inferNeighborhood(wix.location?.address || '', venueName),
        lat: wix.location?.coordinates?.lat || null,
        lng: wix.location?.coordinates?.lng || null,
        city: 'Fort Lauderdale',
        tags,
        category,
        priceLabel: this.inferPrice(wix.title, description),
        isOutdoor: this.isOutdoor(wix.title, description, venueName),
        description,
        sourceUrl,
        sourceName: this.name,
        image: wix.mainImage?.url || undefined,
      });
    }

    return events;
  }

  /**
   * Recursively search an object tree for an `events` key containing an array value.
   * Returns the first array found, or null.
   */
  private findEventsRecursive(obj: unknown, depth = 0): WixEvent[] | null {
    if (depth > 10 || !obj || typeof obj !== 'object') return null;
    const record = obj as Record<string, unknown>;
    // Check if this object has an `events` key with an array value
    if (Array.isArray(record.events) && record.events.length > 0) {
      // Verify it looks like event data (has title or name)
      const first = record.events[0];
      if (first && typeof first === 'object' && ('title' in first || 'name' in first)) {
        return record.events as WixEvent[];
      }
    }
    // Recurse into children
    for (const key of Object.keys(record)) {
      const val = record[key];
      if (val && typeof val === 'object') {
        const result = this.findEventsRecursive(val, depth + 1);
        if (result) return result;
      }
    }
    return null;
  }

  private getETOffset(date: Date): number {
    // US Eastern Time: EDT (Mar 2nd Sun → Nov 1st Sun) = -4, EST = -5
    const month = date.getUTCMonth(); // 0-indexed
    if (month > 2 && month < 10) return -4; // Apr–Oct → EDT
    if (month < 2 || month > 10) return -5; // Jan–Feb, Dec → EST
    // March or November — approximate
    if (month === 2) {
      // Second Sunday of March
      const day = date.getUTCDate();
      return day >= 14 ? -4 : -5;
    }
    // November first Sunday
    return date.getUTCDate() <= 7 ? -4 : -5;
  }

  private inferNeighborhood(address: string, venue: string): string {
    const text = `${address} ${venue}`.toLowerCase();
    if (text.includes('las olas')) return 'Las Olas';
    if (text.includes('sunrise blvd') || text.includes('sunrise boulevard')) return 'Flagler Village';
    if (text.includes('riverwalk') || text.includes('esplanade')) return 'Riverwalk';
    if (text.includes('a1a') || text.includes('seabreeze') || text.includes('marina village')) return 'Fort Lauderdale Beach';
    if (text.includes('revolution live') || text.includes('sw 3rd ave')) return 'Downtown FLL';
    if (text.includes('federal hwy') || text.includes('federal highway')) return 'Fort Lauderdale Beach';
    if (text.includes('convention center') || text.includes('eisenhower')) return 'Fort Lauderdale Beach';
    return 'Las Olas';
  }

  private inferPrice(title: string, description: string): 'Free' | '$' | '$$' | '$$$' {
    const text = `${title} ${description}`.toLowerCase();
    if (text.includes('free') || text.includes('no charge') || text.includes('complimentary')) return 'Free';
    if (text.includes('all you can eat') || text.includes('wine & food') || text.includes('wine festival')) return '$$$';
    if (text.includes('fundraiser') || text.includes('gala') || text.includes('benefit')) return '$$$';
    if (text.includes('concert') || text.includes('live music') || text.includes('flea')) return 'Free';
    return '$';
  }

  // Fallback: parse event URLs from sitemap
  private async scrapeFromSitemap(): Promise<RawEvent[]> {
    try {
      let xml: string;
      try {
        xml = await this.fetchHTMLNative(this.SITEMAP_URL, 15_000);
      } catch {
        const response = await this.fetch(this.SITEMAP_URL);
        xml = await response.text();
      }

      const urlMatches = xml.match(/<loc>([^<]+)<\/loc>/g);
      if (!urlMatches) return [];

      const urls = urlMatches.map(m => m.replace(/<\/?loc>/g, ''));
      const events: RawEvent[] = [];
      const now = new Date();
      const maxDate = new Date();
      maxDate.setDate(maxDate.getDate() + 60);

      for (const url of urls) {
        const event = this.parseEventFromUrl(url, now, maxDate);
        if (event) events.push(event);
      }

      this.log(`Parsed ${events.length} events from sitemap (fallback)`);
      return events;
    } catch (error) {
      this.logError('Sitemap fallback failed', error);
      return [];
    }
  }

  private parseEventFromUrl(url: string, now: Date, maxDate: Date): RawEvent | null {
    const cleanUrl = url.replace(/\/form$/, '');
    const match = cleanUrl.match(/\/event-details\/(.+)$/);
    if (!match) return null;

    const fullSlug = match[1];
    const dateMatch = fullSlug.match(/^(.+)-(\d{4})-(\d{2})-(\d{2})-(\d{2})-(\d{2})$/);
    if (!dateMatch) return null;

    const [, slugPart, year, month, day, hour, minute] = dateMatch;
    const eventDate = new Date(`${year}-${month}-${day}T${hour}:${minute}:00`);
    if (isNaN(eventDate.getTime()) || eventDate < now || eventDate > maxDate) return null;

    const title = slugPart
      .split('-')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');

    const category = this.categorize(title, '', 'Las Olas Boulevard');
    const tags = this.generateTags(title, '', category);
    const startAt = `${year}-${month}-${day}T${hour}:${minute}:00`;

    return {
      title,
      startAt,
      venueName: 'Las Olas Boulevard',
      address: 'Las Olas Blvd, Fort Lauderdale, FL 33301',
      neighborhood: 'Las Olas',
      lat: 26.1195,
      lng: -80.1365,
      city: 'Fort Lauderdale',
      tags,
      category,
      isOutdoor: this.isOutdoor(title),
      description: `${title} on Las Olas Boulevard.`,
      sourceUrl: url,
      sourceName: this.name,
    };
  }
}
