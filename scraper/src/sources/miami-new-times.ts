/**
 * Miami New Times Event Scraper
 * Scrapes events from miaminewtimes.com/eventsearch
 * Fetches individual event pages for accurate venue/location data
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
    super('Miami New Times', { weight: 1.5, rateLimit: 1000 });
  }

  async scrape(): Promise<RawEvent[]> {
    const events: RawEvent[] = [];
    const daysAhead = 14;

    this.log(`Scraping events for next ${daysAhead} days...`);

    for (let i = 0; i < daysAhead; i++) {
      const targetDate = addDays(new Date(), i);
      const dateStr = format(targetDate, 'yyyy-MM-dd');

      try {
        const dayEvents = await this.scrapeDay(dateStr);
        events.push(...dayEvents);
        this.log(`Found ${dayEvents.length} events for ${dateStr}`);
      } catch (error) {
        this.logError(`Failed to scrape ${dateStr}`, error);
      }
    }

    this.log(`Total: ${events.length} events scraped`);
    return events;
  }

  private async scrapeDay(dateStr: string): Promise<RawEvent[]> {
    const url = `${this.calendarUrl}/?narrowByDate=${dateStr}&page=1`;
    const $ = await this.fetchHTML(url);
    const eventUrls: { url: string; image?: string; dateStr: string }[] = [];

    // Collect event URLs from list page
    $('.events-calendar__list-item').each((_, element) => {
      const $el = $(element);
      const link = $el.find('a').first();
      let eventUrl = link.attr('href') || '';
      if (eventUrl.startsWith('/')) {
        eventUrl = this.baseUrl + eventUrl;
      }
      if (eventUrl && eventUrl.includes('/event/')) {
        const img = $el.find('img').first();
        let image = img.attr('src') || img.attr('data-src');
        if (image?.startsWith('/')) image = this.baseUrl + image;
        eventUrls.push({ url: eventUrl, image, dateStr });
      }
    });

    // Fetch each event detail page
    const events: RawEvent[] = [];
    for (const { url: eventUrl, image, dateStr: date } of eventUrls) {
      try {
        const event = await this.scrapeEventPage(eventUrl, image, date);
        if (event) events.push(event);
        await this.delay(500); // Rate limit
      } catch (error) {
        this.logError(`Failed to scrape ${eventUrl}`, error);
      }
    }

    return events;
  }

  private async scrapeEventPage(url: string, listImage?: string, dateStr?: string): Promise<RawEvent | null> {
    const $ = await this.fetchHTML(url);

    // Get title from page
    const title = this.cleanText($('h1').first().text());
    if (!title || title.length < 5) return null;

    // Extract venue from "Where:" section
    const whereSection = $('li:contains("Where:")').first();
    const venueLink = whereSection.find('a');
    const venueName = this.cleanText(venueLink.text()) || undefined;

    // Try to get address from venue page link or meta
    let address: string | undefined;
    const venueHref = venueLink.attr('href');

    // Extract address from page content
    const addressMatch = $('body').text().match(/(\d+\s+[A-Za-z0-9\s]+(?:Street|St|Avenue|Ave|Boulevard|Blvd|Road|Rd|Drive|Dr|Way|Circle|Cir|Lane|Ln)[^,]*,\s*[A-Za-z\s]+,\s*FL\s*\d{5})/i);
    if (addressMatch) {
      address = this.cleanText(addressMatch[1]);
    }

    // Get neighborhood from dedicated field or infer from venue/address
    let neighborhood: string | undefined;
    const neighborhoodEl = $('li:contains("Neighborhood:")').first();
    if (neighborhoodEl.length) {
      neighborhood = this.cleanText(neighborhoodEl.text().replace('Neighborhood:', ''));
    }

    // Infer neighborhood from address if not found
    if (!neighborhood && address) {
      neighborhood = this.inferNeighborhoodFromAddress(address);
    }
    if (!neighborhood && venueName) {
      neighborhood = this.inferNeighborhoodFromVenue(venueName);
    }
    neighborhood = neighborhood || 'Miami';

    // Determine city
    const isFortLauderdale = /fort lauderdale|hollywood|dania|pompano|davie|plantation|sunrise|weston|pembroke|hallandale|deerfield|broward/i.test(
      `${neighborhood} ${address || ''} ${venueName || ''}`
    );
    const city = isFortLauderdale ? 'Fort Lauderdale' : 'Miami';

    // Get date/time
    const whenSection = $('li:contains("When:")').first().text();
    let startAt = dateStr ? `${dateStr}T12:00:00` : format(new Date(), "yyyy-MM-dd'T'12:00:00");

    const timeMatch = whenSection.match(/(\d{1,2}:\d{2}\s*(a\.?m\.?|p\.?m\.?))/i);
    if (timeMatch) {
      try {
        const timeStr = timeMatch[1].toLowerCase().replace(/[\s.]/g, '');
        const parsed = parse(timeStr, 'h:mma', new Date());
        startAt = `${dateStr || format(new Date(), 'yyyy-MM-dd')}T${format(parsed, 'HH:mm')}:00`;
      } catch { /* use default */ }
    }

    // Get description
    const descSection = $('.event-detail__description, .event-content, article p').first();
    let description = this.cleanText(descSection.text());
    if (!description || description.length < 20) {
      description = `${title} at ${venueName || neighborhood}`;
    }

    // Get image
    let image = listImage;
    if (!image) {
      const ogImage = $('meta[property="og:image"]').attr('content');
      image = ogImage || undefined;
    }

    // Get price
    const priceSection = $('li:contains("Price:")').first().text();
    const priceInfo = this.parsePrice(priceSection);

    // Categorize
    const category = this.categorize(title, description, venueName || '');
    const tags = this.generateTags(title, description, category);

    return {
      title,
      startAt,
      venueName,
      address,
      neighborhood,
      lat: null,
      lng: null,
      city,
      tags,
      category,
      priceLabel: priceInfo.label,
      priceAmount: priceInfo.amount,
      isOutdoor: this.isOutdoor(title, description, venueName || ''),
      description,
      sourceUrl: url,
      image,
      sourceName: this.name,
    };
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
