/**
 * Dice.fm Real Scraper
 * Scrapes actual events from Dice.fm Miami using Puppeteer
 */

import { PuppeteerScraper } from './puppeteer-base.js';
import type { RawEvent } from '../types.js';
import { findVenue } from '../venues.js';

interface DiceEvent {
  title: string;
  date: string;
  time: string;
  venue: string;
  price: string;
  url: string;
  image?: string;
}

export class DiceRealScraper extends PuppeteerScraper {
  private baseUrl = 'https://dice.fm/browse/miami';

  constructor() {
    super('Dice.fm Real', { weight: 1.5, rateLimit: 2000 });
  }

  protected async scrapeWithBrowser(): Promise<RawEvent[]> {
    const events: RawEvent[] = [];

    try {
      await this.navigateTo(this.baseUrl);

      // Wait for events to load
      await this.sleep(3000);

      // Scroll to load more events
      await this.scrollPage(5);
      await this.sleep(2000);

      // Extract event data from the page
      const diceEvents = await this.extractData(() => {
        const eventElements = document.querySelectorAll('[data-testid="event-card"], .EventCard, a[href*="/event/"]');
        const extracted: DiceEvent[] = [];

        eventElements.forEach((el) => {
          try {
            // Try different selectors for title
            const titleEl =
              el.querySelector('[data-testid="event-title"]') ||
              el.querySelector('.EventCard__Title') ||
              el.querySelector('h3') ||
              el.querySelector('h2');

            // Try different selectors for date
            const dateEl =
              el.querySelector('[data-testid="event-date"]') ||
              el.querySelector('.EventCard__Date') ||
              el.querySelector('time');

            // Try different selectors for venue
            const venueEl =
              el.querySelector('[data-testid="event-venue"]') ||
              el.querySelector('.EventCard__Venue') ||
              el.querySelector('[class*="venue"]');

            // Try different selectors for price
            const priceEl =
              el.querySelector('[data-testid="event-price"]') ||
              el.querySelector('.EventCard__Price') ||
              el.querySelector('[class*="price"]');

            // Get image
            const imgEl = el.querySelector('img');

            // Get link
            const linkEl = el.tagName === 'A' ? el : el.querySelector('a');
            const href = linkEl?.getAttribute('href') || '';

            if (titleEl?.textContent) {
              extracted.push({
                title: titleEl.textContent.trim(),
                date: dateEl?.textContent?.trim() || '',
                time: '',
                venue: venueEl?.textContent?.trim() || '',
                price: priceEl?.textContent?.trim() || '',
                url: href.startsWith('http') ? href : `https://dice.fm${href}`,
                image: imgEl?.getAttribute('src') || undefined,
              });
            }
          } catch (e) {
            // Skip problematic elements
          }
        });

        return extracted;
      });

      this.log(`Found ${diceEvents.length} events on Dice.fm`);

      // Process each event
      for (const diceEvent of diceEvents) {
        const event = this.parseEvent(diceEvent);
        if (event) {
          events.push(event);
        }
      }
    } catch (error) {
      this.log(`Error scraping Dice.fm: ${error}`);
    }

    return events;
  }

  private parseEvent(diceEvent: DiceEvent): RawEvent | null {
    if (!diceEvent.title || !diceEvent.date) return null;

    // Parse date
    const parsedDate = this.parseDate(diceEvent.date);
    if (!parsedDate) return null;

    // Parse price
    const price = this.parsePriceAmount(diceEvent.price);

    // Find venue in database
    const venue = findVenue(diceEvent.venue);

    return {
      title: diceEvent.title,
      startAt: parsedDate,
      venueName: venue?.name || diceEvent.venue || 'Miami Venue',
      address: venue?.address,
      neighborhood: venue?.neighborhood || 'Miami',
      lat: venue?.lat,
      lng: venue?.lng,
      city: 'Miami',
      tags: ['live-music', 'nightlife', ...(venue?.vibeTags?.slice(0, 2) || [])],
      category: 'Music',
      priceLabel: price === 0 ? 'Free' : price > 50 ? '$$' : '$',
      priceAmount: price,
      isOutdoor: false,
      description: `${diceEvent.title} at ${diceEvent.venue || 'Miami'}. Get tickets on Dice.fm.`,
      sourceUrl: diceEvent.url,
      sourceName: this.name,
      image: diceEvent.image,
      ticketUrl: diceEvent.url,
      recurring: false,
    };
  }

  private parseDate(dateStr: string): string | null {
    // Dice uses formats like "Sat 25 Jan", "Tonight", "Tomorrow"
    const now = new Date();
    const currentYear = now.getFullYear();

    const lower = dateStr.toLowerCase();

    if (lower.includes('tonight') || lower.includes('today')) {
      const date = now.toISOString().slice(0, 10);
      return `${date}T21:00:00`;
    }

    if (lower.includes('tomorrow')) {
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const date = tomorrow.toISOString().slice(0, 10);
      return `${date}T21:00:00`;
    }

    // Try to parse "Day DD Mon" format (e.g., "Sat 25 Jan")
    const dayMonthMatch = dateStr.match(/(\d{1,2})\s*(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i);
    if (dayMonthMatch) {
      const day = parseInt(dayMonthMatch[1], 10);
      const monthStr = dayMonthMatch[2].toLowerCase();
      const months: Record<string, number> = {
        jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
        jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
      };
      const month = months[monthStr];

      if (month !== undefined) {
        let year = currentYear;
        // If the month is before the current month, it's next year
        if (month < now.getMonth()) {
          year = currentYear + 1;
        }

        const date = new Date(year, month, day);
        const dateStr = date.toISOString().slice(0, 10);
        return `${dateStr}T21:00:00`;
      }
    }

    // Try ISO format
    const isoMatch = dateStr.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
      return `${isoMatch[0]}T21:00:00`;
    }

    return null;
  }

  private parsePriceAmount(priceStr: string): number {
    if (!priceStr) return 0;

    const lower = priceStr.toLowerCase();
    if (lower.includes('free') || lower.includes('rsvp')) return 0;

    // Extract number from price string
    const match = priceStr.match(/\$?\s*(\d+(?:\.\d{2})?)/);
    if (match) {
      return parseFloat(match[1]);
    }

    return 20; // Default estimate
  }
}
