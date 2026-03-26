/**
 * Instagram Real Scraper
 *
 * Fetches actual Instagram posts from curated accounts and uses Claude
 * to extract event data from captions and flyer images.
 *
 * Requires: INSTAGRAM_SESSION_ID env var (browser session cookie)
 *           ANTHROPIC_API_KEY env var (for Claude extraction)
 *
 * If either is missing, logs a warning and returns [] gracefully.
 */

import { BaseScraper } from './base.js';
import { scrapeIGAccount, type IGAccountConfig } from './instagram-post-scraper.js';
import type { RawEvent } from '../types.js';

const ACCOUNTS: IGAccountConfig[] = [
  // ── EVENT AGGREGATORS / EDITORIAL ──────────────────────────────
  { handle: 'heyrubyhospitality', city: 'Miami', locationHint: 'South Florida curated lifestyle events' },
  { handle: 'thirdspacesmiami', city: 'Miami', locationHint: 'Miami culture, art, fashion, music events' },
  { handle: 'socialxchangemiami', city: 'Miami', locationHint: 'Miami young professional events and day parties' },
  { handle: 'miamibucketlist', city: 'Miami', locationHint: 'Miami experiences and things to do' },
  { handle: 'thebrowardscene', city: 'Fort Lauderdale', locationHint: 'Broward County events, restaurants, things to do' },
  { handle: 'fortlauderdaledowntown', city: 'Fort Lauderdale', locationHint: 'Las Olas and downtown Fort Lauderdale events' },
  { handle: 'miamifriendors', city: 'Miami', locationHint: 'South Florida markets, festivals, small business events' },
  { handle: 'thelauderdalelocal', city: 'Fort Lauderdale', locationHint: 'Fort Lauderdale lifestyle blog and events' },

  // ── MIAMI MUSIC / NIGHTLIFE ────────────────────────────────────
  { handle: 'floydmiami', city: 'Miami', locationHint: 'Floyd Miami, Edgewater electronic/dance venue' },
  { handle: 'gramps', city: 'Miami', locationHint: 'Gramps Wynwood, bar with live music and events' },
  { handle: 'bardotmiami', city: 'Miami', locationHint: 'Bardot Miami, Wynwood live music' },
  { handle: 'clubspace', city: 'Miami', locationHint: 'Club Space Miami, downtown electronic music' },
  { handle: 'manawynd', city: 'Miami', locationHint: 'Mana Wynwood, warehouse events venue' },
  { handle: 'cafelatrovita', city: 'Miami', locationHint: 'Cafe La Trova, Little Havana Cuban jazz and cocktails' },
  { handle: 'ballandchain', city: 'Miami', locationHint: 'Ball & Chain, Little Havana salsa and live music' },
  { handle: 'theandersonmiami', city: 'Miami', locationHint: 'The Anderson, Upper Eastside neighborhood bar' },

  // ── MIAMI CULTURE / ART ────────────────────────────────────────
  { handle: 'icamiami', city: 'Miami', locationHint: 'Institute of Contemporary Art Miami, Design District' },
  { handle: 'pamm_miami', city: 'Miami', locationHint: 'Pérez Art Museum Miami, Museum Park waterfront' },
  { handle: 'bassmuseum', city: 'Miami', locationHint: 'The Bass Museum, Miami Beach' },
  { handle: 'moca_miami', city: 'Miami', locationHint: 'Museum of Contemporary Art, North Miami' },
  { handle: 'wolfsonianu', city: 'Miami', locationHint: 'The Wolfsonian-FIU, South Beach' },
  { handle: 'theblackarchivesmiami', city: 'Miami', locationHint: 'Black Archives and Lyric Theater, Overtown' },
  { handle: 'wynwoodwalls', city: 'Miami', locationHint: 'Wynwood Walls, street art and events' },
  { handle: 'newworldsymphony', city: 'Miami', locationHint: 'New World Symphony, SoundScape Park, Miami Beach' },
  { handle: 'o_miami', city: 'Miami', locationHint: 'O Miami Poetry Festival and Third Thursdays' },
  { handle: 'deeringestate', city: 'Miami', locationHint: 'Deering Estate, Cutler Bay nature and events' },
  { handle: 'fairabororigarden', city: 'Miami', locationHint: 'Fairchild Tropical Botanic Garden, Coral Gables' },

  // ── MIAMI FOOD / MARKETS ───────────────────────────────────────
  { handle: 'wynwoodkitchen', city: 'Miami', locationHint: 'Wynwood Kitchen & Bar events' },
  { handle: 'timeoutmarketmiami', city: 'Miami', locationHint: 'Time Out Market Miami, South Beach' },
  { handle: 'wynwood_marketplace', city: 'Miami', locationHint: 'Wynwood Marketplace, open-air weekend market' },

  // ── MIAMI COMMUNITY / FITNESS ──────────────────────────────────
  { handle: 'criticalmassmiami', city: 'Miami', locationHint: 'Monthly bike ride from Government Center' },
  { handle: 'miamirunclub', city: 'Miami', locationHint: 'Group runs from Bayfront Park and Brickell' },

  // ── FORT LAUDERDALE ────────────────────────────────────────────
  { handle: 'funkybuddha', city: 'Fort Lauderdale', locationHint: 'Funky Buddha Brewery tap room events' },
  { handle: 'culture_room_ftl', city: 'Fort Lauderdale', locationHint: 'Culture Room, Fort Lauderdale live music' },
  { handle: 'flaglervillage', city: 'Fort Lauderdale', locationHint: 'Flagler Village arts district events' },
  { handle: 'sunnysideupmarket', city: 'Fort Lauderdale', locationHint: 'Sunday market at Esplanade Park, Riverwalk' },

  // ── PALM BEACH ─────────────────────────────────────────────────
  { handle: 'norton_museum', city: 'Palm Beach', locationHint: 'Norton Museum of Art, West Palm Beach' },
  { handle: 'wpbgreenmarket', city: 'Palm Beach', locationHint: 'West Palm Beach GreenMarket, Clematis Street' },
];

export class InstagramRealScraper extends BaseScraper {
  constructor() {
    super('Instagram Real', { weight: 1.4, rateLimit: 2000 });
  }

  async scrape(): Promise<RawEvent[]> {
    // Check required env vars
    const hasSession = !!process.env.INSTAGRAM_SESSION_ID;
    const hasApiKey = !!process.env.ANTHROPIC_API_KEY;

    if (!hasSession) {
      this.log('⚠️  INSTAGRAM_SESSION_ID not set — skipping Instagram scrape');
      this.log('   Get it from browser DevTools → Application → Cookies → instagram.com → sessionid');
      return [];
    }

    if (!hasApiKey) {
      this.log('⚠️  ANTHROPIC_API_KEY not set — skipping Instagram scrape');
      return [];
    }

    this.log(`Scraping ${ACCOUNTS.length} Instagram accounts...`);
    const allEvents: RawEvent[] = [];

    for (const account of ACCOUNTS) {
      try {
        const events = await scrapeIGAccount(account);
        if (events.length > 0) {
          this.log(`  ✅ @${account.handle}: ${events.length} events`);
          allEvents.push(...events);
        } else {
          this.log(`  ⬚  @${account.handle}: 0 events (no upcoming events in recent posts)`);
        }
      } catch (err: any) {
        const msg = err?.message || String(err);
        if (msg.includes('429') || msg.includes('rate limit')) {
          this.log(`  ⏳ @${account.handle}: rate limited — stopping IG scrape`);
          break; // Stop entirely on rate limit
        }
        this.log(`  ❌ @${account.handle}: ${msg.slice(0, 100)}`);
      }

      // Rate limit between accounts
      await new Promise(r => setTimeout(r, 2000));
    }

    this.log(`Instagram Real: ${allEvents.length} total events from ${ACCOUNTS.length} accounts`);
    return allEvents;
  }
}
