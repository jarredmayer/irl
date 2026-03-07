/**
 * Miami New Times Event Scraper
 * Scrapes events from miaminewtimes.com/eventsearch
 *
 * Optimized: extracts event data directly from the list page HTML
 * instead of fetching each individual event detail page (which caused timeouts).
 * Only fetches detail pages for a few events to get images/descriptions.
 */

import { addDays, format, parse } from 'date-fns';
import * as cheerio from 'cheerio';
import type { Element } from 'domhandler';
import { BaseScraper } from './base.js';
import type { RawEvent } from '../types.js';

export class MiamiNewTimesScraper extends BaseScraper {
  private baseUrl = 'https://www.miaminewtimes.com';
  private calendarUrl = `${this.baseUrl}/eventsearch`;

  constructor() {
    super('Miami New Times', { weight: 1.5, rateLimit: 200 });
  }

  async scrape(): Promise<RawEvent[]> {
    const events: RawEvent[] = [];
    const daysAhead = 7;
    const totalTimeout = 60_000; // 60s total timeout
    const startTime = Date.now();

    this.log(`Scraping events for next ${daysAhead} days...`);

    for (let i = 0; i < daysAhead; i++) {
      // Check total timeout
      if (Date.now() - startTime > totalTimeout) {
        this.log(`Total timeout reached after ${i} days — returning ${events.length} events collected so far`);
        break;
      }

      const targetDate = addDays(new Date(), i);
      const dateStr = format(targetDate, 'yyyy-MM-dd');

      try {
        const dayEvents = await this.scrapeDay(dateStr, startTime, totalTimeout);
        events.push(...dayEvents);
        this.log(`Found ${dayEvents.length} events for ${dateStr}`);
      } catch (error) {
        this.logError(`Failed to scrape ${dateStr}`, error);
      }
    }

    this.log(`Total: ${events.length} events scraped`);
    return events;
  }

  private async scrapeDay(dateStr: string, startTime: number, totalTimeout: number): Promise<RawEvent[]> {
    const url = `${this.calendarUrl}/?narrowByDate=${dateStr}&page=1`;
    const $ = await this.fetchHTML(url);
    const events: RawEvent[] = [];
    let detailFetchCount = 0;
    const maxDetailFetches = 3; // Only fetch detail pages for first 3 events per day

    // Extract event data directly from list page
    $('.events-calendar__list-item').each((_, element) => {
      try {
        const $el = $(element);

        // Get event link and title
        const firstLink = $el.find('a').first();
        let eventUrl = firstLink.attr('href') || '';
        if (eventUrl.startsWith('/')) {
          eventUrl = this.baseUrl + eventUrl;
        }
        if (!eventUrl.includes('/event/')) return;

        const title = this.cleanText(firstLink.text());
        if (!title || title.length < 5) return;

        // Get venue from location link
        const venueLink = $el.find('a[href*="/location/"]');
        const venueName = this.cleanText(venueLink.text()) || undefined;

        // Get image from list item
        const img = $el.find('img').first();
        let image = img.attr('src') || img.attr('data-src');
        if (image?.startsWith('/')) image = this.baseUrl + image;

        // Extract date/time info from the list item text
        const itemText = this.cleanText($el.text());
        let startAt = `${dateStr}T12:00:00`;

        const timeMatch = itemText.match(/(\d{1,2}:\d{2}\s*(a\.?m\.?|p\.?m\.?))/i);
        if (timeMatch) {
          try {
            const timeStr = timeMatch[1].toLowerCase().replace(/[\s.]/g, '');
            const parsed = parse(timeStr, 'h:mma', new Date());
            startAt = `${dateStr}T${format(parsed, 'HH:mm')}:00`;
          } catch { /* use default */ }
        }

        // Neighborhood inference
        let neighborhood: string | undefined;
        if (venueName) {
          neighborhood = this.inferNeighborhoodFromVenue(venueName);
        }
        neighborhood = neighborhood || 'Miami';

        // Determine city
        const isFortLauderdale = /fort lauderdale|hollywood|dania|pompano|davie|plantation|sunrise|weston|pembroke|hallandale|deerfield|broward/i.test(
          `${neighborhood} ${venueName || ''}`
        );
        const city = isFortLauderdale ? 'Fort Lauderdale' : 'Miami';

        const category = this.categorize(title, '', venueName || '');
        const tags = this.generateTags(title, '', category);

        events.push({
          title,
          startAt,
          venueName,
          neighborhood,
          lat: null,
          lng: null,
          city,
          tags,
          category,
          isOutdoor: this.isOutdoor(title, '', venueName || ''),
          description: `${title}${venueName ? ` at ${venueName}` : ''} — via Miami New Times`,
          sourceUrl: eventUrl,
          image,
          sourceName: this.name,
        });
      } catch { /* skip individual item errors */ }
    });

    // Fetch detail pages for first few events to enrich with better descriptions/images
    for (let i = 0; i < Math.min(maxDetailFetches, events.length); i++) {
      if (Date.now() - startTime > totalTimeout) break;

      try {
        const enriched = await this.enrichFromDetailPage(events[i]);
        if (enriched) {
          events[i] = enriched;
        }
        await this.delay(200);
      } catch { /* skip — list page data is sufficient */ }
      detailFetchCount++;
    }

    return events;
  }

  /**
   * Fetch a single event detail page to enrich an event with better data.
   * Returns the enriched event or null if the fetch failed.
   */
  private async enrichFromDetailPage(event: RawEvent): Promise<RawEvent | null> {
    if (!event.sourceUrl) return null;

    const $ = await this.fetchHTML(event.sourceUrl);

    // Get better description
    const descSection = $('.event-detail__description, .event-content, article p').first();
    const description = this.cleanText(descSection.text());
    if (description && description.length > 20) {
      event.description = description;
    }

    // Get image if we don't have one
    if (!event.image) {
      const ogImage = $('meta[property="og:image"]').attr('content');
      if (ogImage) event.image = ogImage;
    }

    // Get address
    const addressMatch = $('body').text().match(/(\d+\s+[A-Za-z0-9\s]+(?:Street|St|Avenue|Ave|Boulevard|Blvd|Road|Rd|Drive|Dr|Way|Circle|Cir|Lane|Ln)[^,]*,\s*[A-Za-z\s]+,\s*FL\s*\d{5})/i);
    if (addressMatch) {
      event.address = this.cleanText(addressMatch[1]);
      if (!event.neighborhood || event.neighborhood === 'Miami') {
        event.neighborhood = this.inferNeighborhoodFromAddress(event.address) || event.neighborhood;
      }
    }

    // Get price
    const priceSection = $('li:contains("Price:")').first().text();
    if (priceSection) {
      const priceInfo = this.parsePrice(priceSection);
      event.priceLabel = priceInfo.label;
      event.priceAmount = priceInfo.amount;
    }

    return event;
  }

  private inferNeighborhoodFromAddress(address: string): string | undefined {
    const lower = address.toLowerCase();
    if (lower.includes('miami beach') || lower.includes('collins ave')) return 'Miami Beach';
    if (lower.includes('brickell')) return 'Brickell';
    if (lower.includes('wynwood')) return 'Wynwood';
    if (lower.includes('coconut grove')) return 'Coconut Grove';
    if (lower.includes('coral gables')) return 'Coral Gables';
    if (lower.includes('little havana') || lower.includes('calle ocho')) return 'Little Havana';
    if (lower.includes('fort lauderdale')) return 'Fort Lauderdale';
    if (lower.includes('hollywood, fl')) return 'Hollywood';
    return undefined;
  }

  private inferNeighborhoodFromVenue(venue: string): string | undefined {
    const lower = venue.toLowerCase();
    if (lower.includes('broward center')) return 'Fort Lauderdale';
    if (lower.includes('fillmore')) return 'Miami Beach';
    if (lower.includes('arsht') || lower.includes('adrienne')) return 'Downtown';
    if (lower.includes('pérez') || lower.includes('pamm')) return 'Downtown';
    return undefined;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
