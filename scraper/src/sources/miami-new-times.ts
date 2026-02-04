/**
 * Miami New Times Event Scraper
 * Scrapes events from miaminewtimes.com/eventsearch
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
    super('Miami New Times', { weight: 1.5, rateLimit: 1500 });
  }

  async scrape(): Promise<RawEvent[]> {
    const events: RawEvent[] = [];
    const daysAhead = 14; // Scrape next 2 weeks

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
    const events: RawEvent[] = [];

    // Target event list items
    const listings = $('.events-calendar__list-item');

    listings.each((_, element) => {
      try {
        const event = this.parseEventListing($, $(element), dateStr);
        if (event) {
          events.push(event);
        }
      } catch (error) {
        this.logError('Failed to parse event listing', error);
      }
    });

    return events;
  }

  private parseEventListing(
    $: cheerio.CheerioAPI,
    item: cheerio.Cheerio<Element>,
    dateStr: string
  ): RawEvent | null {
    // Extract event name from link
    const eventLink = item.find('a').first();
    let title = this.cleanText(eventLink.text());

    // If no text, try image alt
    if (!title || title.length < 5) {
      const img = eventLink.find('img');
      title = this.cleanText(img.attr('alt'));
    }

    if (!title || title.length < 5) {
      return null;
    }

    // Get event URL
    let sourceUrl = eventLink.attr('href') || '';
    if (sourceUrl.startsWith('/')) {
      sourceUrl = this.baseUrl + sourceUrl;
    }

    // Parse full text for venue, time, neighborhood
    const fullText = item.text();

    // Parse time - look for patterns like "Thu., Oct 23, 7:00 am"
    const timeMatch = fullText.match(/(\d{1,2}:\d{2}\s*(am|pm|AM|PM))/);
    let startAt = `${dateStr}T12:00:00`;
    if (timeMatch) {
      try {
        const timeStr = timeMatch[1].toLowerCase().replace(/\s/g, '');
        const parsed = parse(timeStr, 'h:mma', new Date());
        const hours = format(parsed, 'HH');
        const minutes = format(parsed, 'mm');
        startAt = `${dateStr}T${hours}:${minutes}:00`;
      } catch {
        // Use default noon time
      }
    }

    // Parse venue and address
    const venueMatch = fullText.match(/\d{1,2}:\d{2}\s*(am|pm|AM|PM)([^N]+)Neighborhood:/i);
    let venueName: string | undefined;
    let address: string | undefined;

    if (venueMatch) {
      const venueSection = venueMatch[2].trim();
      if (venueSection.includes(',')) {
        const parts = venueSection.split(',');
        venueName = this.cleanText(parts[0]);
        address = this.cleanText(parts.slice(1).join(','));
      } else {
        venueName = this.cleanText(venueSection);
      }
    }

    // Parse neighborhood - stop at common delimiters like Price, Category, TBA, or other labels
    const neighborhoodMatch = fullText.match(/Neighborhood:\s*([A-Za-z\s/]+?)(?:\s*(?:Price|Category|TBA|Venue|When|Where|$|\n|[0-9]))/i);
    let neighborhood = neighborhoodMatch
      ? this.cleanText(neighborhoodMatch[1])
      : 'Miami';

    // Determine city from neighborhood
    const isFortLauderdale = /fort lauderdale|hollywood|dania|pompano|davie|plantation|sunrise|weston|pembroke|hallandale|deerfield/i.test(neighborhood);
    const city = isFortLauderdale ? 'Fort Lauderdale' : 'Miami';

    // Extract image URL
    const img = item.find('img').first();
    let image = img.attr('src') || img.attr('data-src') || undefined;
    // Make sure image URL is absolute
    if (image && image.startsWith('/')) {
      image = this.baseUrl + image;
    }

    // Parse price from listing text (look for $XX patterns or "Free")
    const priceInfo = this.parsePrice(fullText);

    // Categorize and generate tags
    const category = this.categorize(title, '', venueName || '');
    const tags = this.generateTags(title, '', category);
    const isOutdoor = this.isOutdoor(title, '', venueName || '');

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
      isOutdoor,
      description: `${title} at ${venueName || neighborhood}`,
      sourceUrl,
      image,
      sourceName: this.name,
    };
  }
}
