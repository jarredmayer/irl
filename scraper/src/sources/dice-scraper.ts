/**
 * Dice.fm Scraper via __NEXT_DATA__
 *
 * Dice.fm is a Next.js app that embeds event data in a <script id="__NEXT_DATA__">
 * tag on the Miami browse page. No Apify or Puppeteer needed — just fetch the HTML
 * and parse the embedded JSON.
 *
 * Browse URL: https://dice.fm/browse/miami-5e3bf1b0fe75488ec46cdf9f
 * Returns ~30 upcoming events with full venue, price, and image data.
 */

import { BaseScraper } from './base.js';
import type { RawEvent } from '../types.js';
import { findVenue } from '../venues.js';

interface DiceVenue {
  id: string;
  name: string;
  address: string;
  location?: { lat: number; lng: number };
}

interface DiceNextDataEvent {
  id: string;
  name: string;
  date_unix: number;
  perm_name?: string;
  status?: string;
  venues?: DiceVenue[];
  images?: {
    square?: string;
    landscape?: string;
    portrait?: string;
  };
  about?: {
    description?: string;
    highlights?: Array<{ type: string; title: string }>;
  };
  price?: {
    currency?: string;
    amount?: number | null;
    amount_from?: number | null;
  };
  summary_lineup?: Array<{ name?: string }>;
  tags_types?: string[];
}

export class DiceRealScraper extends BaseScraper {
  private browseUrl = 'https://dice.fm/browse/miami-5e3bf1b0fe75488ec46cdf9f';

  constructor() {
    super('Dice.fm Real', { weight: 1.5, rateLimit: 2000 });
  }

  async scrape(): Promise<RawEvent[]> {
    this.log('Fetching Dice.fm Miami via __NEXT_DATA__...');

    try {
      // Fetch the browse page HTML
      const html = await this.fetchHTMLNative(this.browseUrl, 20_000);

      // Extract __NEXT_DATA__ JSON
      const nextDataMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>(.*?)<\/script>/s);
      if (!nextDataMatch) {
        this.log('No __NEXT_DATA__ found on Dice.fm browse page');
        return [];
      }

      let nextData: any;
      try {
        nextData = JSON.parse(nextDataMatch[1]);
      } catch {
        this.log('Failed to parse __NEXT_DATA__ JSON');
        return [];
      }

      const diceEvents: DiceNextDataEvent[] = nextData?.props?.pageProps?.events || [];
      this.log(`Found ${diceEvents.length} events in __NEXT_DATA__`);

      if (diceEvents.length === 0) return [];

      const now = new Date();
      const events: RawEvent[] = [];
      let skipped = 0;

      for (const item of diceEvents) {
        try {
          const event = this.mapDiceEvent(item, now);
          if (event) {
            events.push(event);
          } else {
            skipped++;
          }
        } catch {
          skipped++;
        }
      }

      this.log(`Returning ${events.length} Dice.fm events (${skipped} skipped)`);
      return events;
    } catch (error) {
      this.logError('Dice.fm scraper failed', error);
      return [];
    }
  }

  private mapDiceEvent(item: DiceNextDataEvent, now: Date): RawEvent | null {
    const title = item.name;
    if (!title || title.length < 3) return null;

    // Parse date from unix timestamp (seconds)
    if (!item.date_unix) return null;
    const eventDate = new Date(item.date_unix * 1000);
    if (eventDate < now) return null;

    const startAt = eventDate.toISOString().replace('Z', '').replace(/\.\d+$/, '');

    // Parse venue from venues array
    const venue = item.venues?.[0];
    let venueName = venue?.name || 'Miami Venue';
    let address = venue?.address;
    let lat = venue?.location?.lat;
    let lng = venue?.location?.lng;

    // Check known venue database
    const knownVenue = findVenue(venueName);
    if (knownVenue) {
      venueName = knownVenue.name;
      address = knownVenue.address || address;
      lat = knownVenue.lat ?? lat;
      lng = knownVenue.lng ?? lng;
    }

    // Parse price (amount_from is in cents)
    const priceFromCents = item.price?.amount_from;
    const priceAmount = priceFromCents ? Math.round(priceFromCents / 100) : 0;
    const priceLabel = priceAmount === 0 ? 'Free' as const
      : priceAmount <= 25 ? '$' as const
      : priceAmount <= 75 ? '$$' as const
      : '$$$' as const;

    // Build event URL from perm_name
    const sourceUrl = item.perm_name
      ? `https://dice.fm/event/${item.perm_name}`
      : this.browseUrl;

    // Image (prefer landscape, fallback to square)
    const image = item.images?.landscape || item.images?.square;

    // Description from about
    const description = item.about?.description?.slice(0, 400) || '';

    // Lineup
    const lineup = item.summary_lineup
      ?.map(a => a.name)
      .filter(Boolean)
      .join(', ') || '';

    // Check age restriction
    const is21Plus = item.about?.highlights?.some(h => h.title?.includes('21+'));

    // Categorize
    const category = this.categorize(title, description, venueName);
    const tags = this.generateTags(title, description, category);
    if (!tags.includes('live-music') && !tags.includes('dj')) {
      tags.unshift('live-music');
      if (tags.length > 5) tags.pop();
    }

    const neighborhood = knownVenue?.neighborhood || this.inferNeighborhood(venueName, address || '');

    return {
      title,
      startAt,
      venueName,
      address,
      neighborhood,
      lat: lat ?? null,
      lng: lng ?? null,
      city: 'Miami',
      tags: tags.slice(0, 5),
      category,
      priceLabel,
      priceAmount,
      isOutdoor: this.isOutdoor(title, description, venueName),
      description: lineup
        ? `${title} ft. ${lineup} at ${venueName}.${is21Plus ? ' 21+.' : ''} Get tickets on Dice.fm.`
        : `${title} at ${venueName}.${is21Plus ? ' 21+.' : ''} ${description ? description.slice(0, 200) : 'Get tickets on Dice.fm.'}`,
      sourceUrl,
      sourceName: this.name,
      image,
      ticketUrl: sourceUrl !== this.browseUrl ? sourceUrl : undefined,
      recurring: false,
    };
  }

  private inferNeighborhood(venue: string, address: string): string {
    const v = `${venue} ${address}`.toLowerCase();
    if (v.includes('wynwood') || v.includes('do not sit') || v.includes('bardot') || v.includes('nw 2')) return 'Wynwood';
    if (v.includes('club space') || v.includes('ground') || v.includes('ne 11th')) return 'Downtown Miami';
    if (v.includes('floyd') || v.includes('jolene')) return 'Edgewater';
    if (v.includes('beach') || v.includes('faena') || v.includes('edition') || v.includes('collins')) return 'South Beach';
    if (v.includes('brickell')) return 'Brickell';
    if (v.includes('little havana') || v.includes('ball & chain') || v.includes('sw 8th')) return 'Little Havana';
    if (v.includes('factory town') || v.includes('nw 37th')) return 'Allapattah';
    if (v.includes('coconut grove')) return 'Coconut Grove';
    if (v.includes('design district')) return 'Design District';
    return 'Miami';
  }
}
