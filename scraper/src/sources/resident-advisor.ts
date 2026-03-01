/**
 * Resident Advisor Scraper
 * Queries RA's GraphQL API for Miami-area events.
 * Area ID 38 = Miami (covers South Florida / FLL).
 */

import { BaseScraper } from './base.js';
import type { RawEvent } from '../types.js';
import { addDays, format } from 'date-fns';

const RA_GRAPHQL = 'https://ra.co/graphql';
const MIAMI_AREA_ID = 38;

// Electronic/club genres that RA primarily covers → Nightlife category
const NIGHTLIFE_GENRES = new Set([
  'techno', 'house', 'club', 'electronic', 'electro', 'drum & bass',
  'dnb', 'jungle', 'trance', 'bass', 'ambient', 'experimental',
  'industrial', 'noise', 'hardcore', 'breakbeat', 'garage',
  'dubstep', 'uk bass', 'afrobeats', 'reggaeton', 'dancehall',
]);

const QUERY = `
  query GetMiamiEvents($filters: FilterInputDtoInput, $pageSize: Int, $page: Int) {
    eventListings(filters: $filters, pageSize: $pageSize, page: $page) {
      totalResults
      data {
        listingDate
        event {
          id
          title
          date
          startTime
          endTime
          contentUrl
          cost
          isTicketed
          venue {
            id
            name
            address
            area {
              id
              name
            }
          }
          pick {
            blurb
          }
          artists {
            name
          }
          genres {
            name
          }
          images {
            filename
            type
          }
        }
      }
    }
  }
`;

interface RAEvent {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string | null;
  contentUrl: string;
  cost: string;
  isTicketed: boolean;
  venue: {
    id: string;
    name: string;
    address: string;
    area: { id: string; name: string } | null;
  } | null;
  pick: { blurb: string } | null;
  artists: { name: string }[];
  genres: { name: string }[];
  images: { filename: string; type: string }[];
}

export class ResidentAdvisorScraper extends BaseScraper {
  constructor() {
    super('Resident Advisor', { weight: 1.5, rateLimit: 1500 });
  }

  async scrape(): Promise<RawEvent[]> {
    this.log('Querying Resident Advisor GraphQL API...');

    const today = new Date();
    const dateFrom = format(today, 'yyyy-MM-dd');
    const dateTo = format(addDays(today, 30), 'yyyy-MM-dd');

    const allEvents: RawEvent[] = [];
    const pageSize = 100;
    let page = 1;
    let totalResults = Infinity;

    while (allEvents.length < totalResults) {
      const body = JSON.stringify({
        query: QUERY,
        variables: {
          filters: {
            areas: { eq: MIAMI_AREA_ID },
            listingDate: { gte: dateFrom, lte: dateTo },
          },
          pageSize,
          page,
        },
      });

      let data: {
        data?: {
          eventListings?: {
            totalResults: number;
            data: { listingDate: string; event: RAEvent }[];
          };
        };
        errors?: { message: string }[];
      };

      try {
        const response = await this.fetch(RA_GRAPHQL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            Accept: 'application/json',
            Referer: 'https://ra.co/events/us/miami',
            Origin: 'https://ra.co',
          },
          body,
        });
        data = await response.json() as typeof data;
      } catch (e) {
        this.logError('GraphQL request failed', e);
        break;
      }

      if (data.errors?.length) {
        this.logError('GraphQL errors', data.errors.map((e) => e.message).join(', '));
        break;
      }

      const listing = data.data?.eventListings;
      if (!listing) break;

      totalResults = listing.totalResults;

      for (const { event } of listing.data) {
        const mapped = this.mapEvent(event);
        if (mapped) allEvents.push(mapped);
      }

      if (listing.data.length < pageSize) break;
      page++;
    }

    this.log(`Found ${allEvents.length} events`);
    return allEvents;
  }

  private mapEvent(event: RAEvent): RawEvent | null {
    if (!event.venue) return null;

    // Need at least a real lineup or RA editorial pick to include
    const hasLineup = event.artists.length > 0;
    const hasPick = !!event.pick?.blurb;
    if (!hasLineup && !hasPick) return null;

    const venue = event.venue;
    const address = venue.address || '';
    const neighborhood = this.neighborhoodFromAddress(address, venue.name);
    const city = this.cityFromAddress(address);

    // Build lineup string
    const lineup = event.artists.map((a) => a.name).join(', ');

    // Category: Nightlife for DJ/electronic genres, Music for live acts
    const genreNames = event.genres.map((g) => g.name.toLowerCase());
    const isNightlife = genreNames.some((g) => NIGHTLIFE_GENRES.has(g));
    const category = isNightlife ? 'Nightlife' : 'Music';

    // Tags
    const tags: string[] = ['live-music'];
    if (isNightlife) tags.push('dj');
    if (genreNames.some((g) => g.includes('electronic') || g.includes('techno') || g.includes('house'))) {
      tags.push('electronic');
    }
    if (genreNames.some((g) => g.includes('latin') || g.includes('afro') || g.includes('reggaeton'))) {
      tags.push('latin');
    }
    if (genreNames.some((g) => g.includes('jazz'))) tags.push('jazz');
    if (genreNames.some((g) => g.includes('hip-hop') || g.includes('hip hop') || g.includes('rap'))) {
      tags.push('hip-hop');
    }

    // Description
    const pickBlurb = event.pick?.blurb || '';
    const description = [
      pickBlurb,
      lineup ? `Featuring: ${lineup}.` : '',
      `Tickets: https://ra.co${event.contentUrl}`,
    ]
      .filter(Boolean)
      .join(' ');

    // Price
    const priceAmount = parseFloat(event.cost || '0') || 0;
    const priceLabel = priceAmount === 0
      ? ('Free' as const)
      : priceAmount <= 25
        ? ('$' as const)
        : priceAmount <= 75
          ? ('$$' as const)
          : ('$$$' as const);

    // Flyer image
    const flyer = event.images.find((i) => i.type === 'FLYERFRONT');

    return {
      title: event.title,
      startAt: event.startTime || event.date,
      endAt: event.endTime || undefined,
      venueName: venue.name,
      address,
      neighborhood,
      lat: null,
      lng: null,
      city,
      tags: [...new Set(tags)],
      category,
      priceLabel: event.isTicketed && priceAmount === 0 ? '$' : priceLabel,
      priceAmount,
      isOutdoor: false,
      description,
      sourceUrl: `https://ra.co${event.contentUrl}`,
      ticketUrl: event.isTicketed ? `https://ra.co${event.contentUrl}` : undefined,
      sourceName: this.name,
      image: flyer?.filename,
    };
  }

  private neighborhoodFromAddress(address: string, venueName: string): string {
    const text = `${address} ${venueName}`.toLowerCase();

    // Street / area keywords → neighborhood
    const mappings: [string[], string][] = [
      [['wynwood', 'nw 2nd ave', 'nw 23rd', 'nw 24th', 'nw 25th', 'nw 26th', 'do not sit', 'floyd', 'jolene', 'bardot'], 'Wynwood'],
      [['brickell', 'sw 8th st', 'sw 7th st', 'brickell ave', 'bayfront', 'epic', 'east hotel'], 'Brickell'],
      [['south beach', 'ocean dr', 'collins ave', 'washington ave', 'lincoln rd', 'espanola way', 'faena', 'delano', 'miami beach', 'south of 5th', 'sobe'], 'South Beach'],
      [['mid-beach', 'mid beach', 'fountainebleau', 'fontainebleau', '44th st', '46th st'], 'Mid-Beach'],
      [['downtown', 'biscayne blvd', 'brickell key', 'bayside', 'museum park', 'overtown', 'club space', 'ground', 'nc200'], 'Downtown Miami'],
      [['little havana', 'sw 8th', 'calle ocho', 'ball & chain', 'cafe la trova', 'leah & louisas', 'tower theater'], 'Little Havana'],
      [['design district', 'ne 39th', 'ne 40th', 'ne 41st', 'ne 2nd ave', 'buena vista'], 'Design District'],
      [['edgewater', 'ne 27th', 'ne 28th', 'ne 29th', 'ne 30th', 'miami norfolk'], 'Edgewater'],
      [['coconut grove', 'grand ave', 'main hwy', 'peacock park', 'coconut'], 'Coconut Grove'],
      [['little haiti', 'ne 2nd ave', 'ne 54th', 'ne 55th', 'ne 62nd', 'lagniappe', 'butter miami'], 'Little Haiti'],
      [['allapattah', 'nw 36th', 'nw 7th ave', 'rubell'], 'Allapattah'],
      [['coral gables', 'miracle mile', 'giralda', 'salzedo', 'ponce de leon'], 'Coral Gables'],
      [['fort lauderdale', 'las olas', 'broward', 'flagler village', 'wilton manors'], 'Fort Lauderdale'],
      [['sunrise', 'amerant bank arena', 'BB&T', 'sunlife'], 'Sunrise'],
    ];

    for (const [keywords, neighborhood] of mappings) {
      if (keywords.some((kw) => text.includes(kw))) {
        return neighborhood;
      }
    }

    // Default: if address has FL and not FLL area, Miami
    return text.includes('fort lauderdale') || text.includes('broward') ? 'Fort Lauderdale' : 'Miami';
  }

  private cityFromAddress(address: string): 'Miami' | 'Fort Lauderdale' {
    const lower = address.toLowerCase();
    if (
      lower.includes('fort lauderdale') ||
      lower.includes('lauderdale') ||
      lower.includes('broward') ||
      lower.includes('wilton manors') ||
      lower.includes('sunrise') ||
      lower.includes('hollywood, fl') ||
      lower.includes('pompano')
    ) {
      return 'Fort Lauderdale';
    }
    return 'Miami';
  }
}
