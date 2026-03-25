/**
 * Instagram Real Scraper
 *
 * Monitors Instagram accounts for real events by fetching posts via
 * Instagram's internal API and extracting event data using Claude.
 *
 * Requires:
 *   INSTAGRAM_SESSION_ID — sessionid cookie from a logged-in browser
 *   ANTHROPIC_API_KEY — for Claude-based event extraction
 */

import { BaseScraper } from './base.js';
import { scrapeIGAccount } from './instagram-post-scraper.js';
import type { IGAccountConfig } from './instagram-post-scraper.js';
import type { RawEvent } from '../types.js';

const ACCOUNTS: IGAccountConfig[] = [
  // ── Miami Music/Nightlife ──────────────────────────────────────────
  { handle: 'floydmiami', city: 'Miami', locationHint: 'Floyd Miami nightclub' },
  { handle: 'gramps', city: 'Miami', locationHint: 'Gramps bar in Wynwood' },
  { handle: 'bardotmiami', city: 'Miami', locationHint: 'Bardot Miami music venue' },
  { handle: 'clubspace', city: 'Miami', locationHint: 'Club Space Miami nightclub' },
  { handle: 'manawynd', city: 'Miami', locationHint: 'Mana Wynwood event space' },
  { handle: 'cafelatrovita', city: 'Miami', locationHint: 'Cafe La Trova in Little Havana' },
  { handle: 'ballandchain', city: 'Miami', locationHint: 'Ball & Chain in Little Havana' },
  { handle: 'theandersonmiami', city: 'Miami', locationHint: 'The Anderson bar in Upper Buena Vista' },

  // ── Miami Culture/Art ──────────────────────────────────────────────
  { handle: 'icamiami', city: 'Miami', locationHint: 'Institute of Contemporary Art Miami' },
  { handle: 'pamm_miami', city: 'Miami', locationHint: 'Pérez Art Museum Miami' },
  { handle: 'bassmuseum', city: 'Miami', locationHint: 'The Bass Museum of Art, Miami Beach' },
  { handle: 'moca_miami', city: 'Miami', locationHint: 'MOCA North Miami' },
  { handle: 'wolfsonianu', city: 'Miami', locationHint: 'The Wolfsonian-FIU, Miami Beach' },
  { handle: 'theblackarchivesmiami', city: 'Miami', locationHint: 'Black Archives / Lyric Theater, Overtown' },
  { handle: 'cinematropolis', city: 'Miami', locationHint: 'Cinematropolis indie cinema, Miami' },
  { handle: 'wynwoodwalls', city: 'Miami', locationHint: 'Wynwood Walls outdoor art' },

  // ── Miami Food/Markets ─────────────────────────────────────────────
  { handle: 'wynwoodkitchen', city: 'Miami', locationHint: 'Wynwood Kitchen & Bar' },
  { handle: 'timeoutmarketmiami', city: 'Miami', locationHint: 'Time Out Market Miami Beach' },
  { handle: 'littlerivermiami', city: 'Miami', locationHint: 'Little River neighborhood, Miami' },
  { handle: 'wynwood_marketplace', city: 'Miami', locationHint: 'Wynwood Marketplace' },

  // ── Miami Community/Fitness ────────────────────────────────────────
  { handle: 'criticalmassmiami', city: 'Miami', locationHint: 'Critical Mass monthly bike ride' },
  { handle: 'miamirunclub', city: 'Miami', locationHint: 'Miami Run Club community runs' },

  // ── Fort Lauderdale ────────────────────────────────────────────────
  { handle: 'fortlauderdalebrewery', city: 'Fort Lauderdale', locationHint: 'Fort Lauderdale Brewery' },
  { handle: 'funkybuddha', city: 'Fort Lauderdale', locationHint: 'Funky Buddha Brewery, Oakland Park' },
  { handle: 'culture_room_ftl', city: 'Fort Lauderdale', locationHint: 'Culture Room live music venue' },
  { handle: 'flaglervillage', city: 'Fort Lauderdale', locationHint: 'Flagler Village arts district' },
  { handle: 'gallerynightftl', city: 'Fort Lauderdale', locationHint: 'Gallery Night Fort Lauderdale' },
  { handle: 'sunnysideupmarket', city: 'Fort Lauderdale', locationHint: 'Sunnyside Up Market' },

  // ── Palm Beach ─────────────────────────────────────────────────────
  { handle: 'norton_museum', city: 'Palm Beach', locationHint: 'Norton Museum of Art, West Palm Beach' },
  { handle: 'palmbeachphoto', city: 'Palm Beach', locationHint: 'Palm Beach Photography Festival' },
  { handle: 'wpbgreenmarket', city: 'Palm Beach', locationHint: 'West Palm Beach GreenMarket' },

  // ── New ────────────────────────────────────────────────────────────
  { handle: 'heyrubyhospitality', city: 'Miami', locationHint: 'South Florida lifestyle and curated events' },
];

export class InstagramRealScraper extends BaseScraper {
  constructor() {
    super('Instagram Real', { rateLimit: 2000 });
  }

  async scrape(): Promise<RawEvent[]> {
    const sessionId = process.env.INSTAGRAM_SESSION_ID;
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!sessionId) {
      this.log('⚠ INSTAGRAM_SESSION_ID not set — skipping Instagram scrape');
      return [];
    }
    if (!apiKey) {
      this.log('⚠ ANTHROPIC_API_KEY not set — skipping Instagram scrape');
      return [];
    }

    this.log(`Scraping ${ACCOUNTS.length} Instagram accounts...`);
    const allEvents: RawEvent[] = [];

    for (const account of ACCOUNTS) {
      try {
        const events = await scrapeIGAccount(account);
        this.log(`  @${account.handle}: ${events.length} events`);
        allEvents.push(...events);
      } catch (err: any) {
        this.log(`  @${account.handle}: ERROR — ${err.message ?? err}`);
      }

      // Rate limit between accounts
      await this.sleep(2000);
    }

    this.log(`Total: ${allEvents.length} events from Instagram`);
    return allEvents;
  }
}
