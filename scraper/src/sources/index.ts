/**
 * Event Sources Index
 * Export all scrapers
 */

// Base class
export { BaseScraper } from './base.js';

// Resident Advisor
export { ResidentAdvisorScraper } from './resident-advisor.js';

// Original sources
export { MiamiNewTimesScraper } from './miami-new-times.js';
export { FarmersMarketsScraper } from './farmers-markets.js';
export { MusicVenuesScraper } from './music-venues.js';
export { ProfessionalSportsScraper } from './professional-sports.js';
export { WellnessFitnessScraper } from './wellness-fitness.js';
export { CulturalVenuesScraper } from './cultural-venues.js';

// Fort Lauderdale sources
export { FortLauderdaleScraper } from './fort-lauderdale.js';

// Palm Beach sources
export { PalmBeachScraper } from './palm-beach.js';

// Nightlife & clubs
export {
  NightlifeClubsScraper,
  LatinPartiesScraper,
  CandlelightConcertsScraper,
  IIIPointsScraper,
} from './nightlife-clubs.js';

// Comedy & entertainment
export {
  DontTellComedyScraper,
  MiamiImprovScraper,
  DaniaBeachImprovScraper,
  ArshtCenterScraper,
  FillmoreMiamiScraper,
} from './comedy-entertainment.js';

// Food & drink
export {
  FoodEventsScraper,
  MiamiSpiceScraper,
  SOBEWFFScraper,
  WineTastingsScraper,
} from './food-drink.js';

// Hotels & hospitality
export { HotelsHospitalityScraper } from './hotels-hospitality.js';

// Instagram sources
export { InstagramSourcesScraper } from './instagram-sources.js';

// Ticketing platforms
export { DiceFmScraper, ShotgunScraper, WorldCup2026Scraper } from './ticketing-platforms.js';

// Community & lifestyle
export {
  CoffeeAndChillScraper,
  DiploRunClubScraper,
  SoFloPopupsScraper,
} from './community-lifestyle.js';

// Cultural districts & estates
export {
  DesignDistrictScraper,
  DeeringEstateScraper,
  MiamiFestivalsScraper,
  RegattaGroveScraper,
  SouthPointeParkScraper,
} from './cultural-districts.js';

// Coral Gables & neighborhood venues
export { CoralGablesVenuesScraper } from './coral-gables-venues.js';

// Coconut Grove
export { CoconutGroveScraper } from './coconut-grove.js';

// Brickell
export { BrickellVenuesScraper } from './brickell-venues.js';

// Real venue events (actual scheduled events, not recurring templates)
export { RealVenueEventsScraper } from './real-venue-events.js';

// Cultural attractions (Pinecrest Gardens, The Bass, Jungle Island, etc.)
export { CulturalAttractionsScraper } from './cultural-attractions.js';

// Beach cleanups and environmental events
export { BeachCleanupsScraper } from './beach-cleanups.js';

// Pop-ups (food pop-ups, sample sales, art shows, markets)
export { PopUpsScraper } from './pop-ups.js';

// Curated recurring events (verified real recurring events)
export { CuratedRecurringScraper } from './curated-recurring.js';

// Puppeteer-based real scrapers
export { PuppeteerScraper } from './puppeteer-base.js';
export { DiceRealScraper } from './dice-scraper.js';

// Greater Miami & The Beaches official events calendar
export { MiamiBeachesEventsScraper } from './miami-beaches-events.js';

// Candlelight Concerts — real schedule from Fever (Candlelight page only)
export { CandlelightRealScraper } from './candlelight-real.js';

// Hotel website events (real calendar data from hotel events pages)
export { HotelEventsScraper } from './hotel-events.js';

// Real HTTP scrapers (verified calendar data)
export {
  DiceMiamiScraper,
  MiamiImprovRealScraper,
  FortLauderdaleImprovScraper,
  BrowardCenterScraper,
  RevolutionLiveScraper,
  CoralGablesScraper,
} from './real-scrapers.js';

// Verified recurring events (confirmed from official sources)
export { VerifiedRecurringScraper } from './verified-recurring.js';

// Community fitness (verified recurring fitness/wellness events)
export {
  CoffeeAndChillRealScraper,
  FreeYogaScraper,
  RunClubsScraper,
  CyclingGroupRidesScraper,
} from './community-fitness.js';

// WeekendBroward — Broward + Palm Beach events (live music, comedy, karaoke, jazz, local events)
export {
  WeekendBrowardScraper,
  WeekendBrowardLiveMusicScraper,
  WeekendBrowardComedyScraper,
  WeekendBrowardKaraokeScraper,
  WeekendBrowardJazzScraper,
  WeekendBrowardPBLiveMusicScraper,
  WeekendBrowardLocalEventsScraper,
} from './weekend-broward.js';

// WeekendBroward via Google Custom Search (Cloudflare bypass)
export { WeekendBrowardGoogleScraper } from './weekend-broward-google.js';

// WeekendBroward verified events (real events from Google index, no API keys needed)
export { WeekendBrowardVerifiedScraper } from './weekend-broward-verified.js';

// WeekendBroward enhanced Puppeteer scraper (handles SiteGround challenge)
export { WeekendBrowardEnhancedScraper } from './weekend-broward-enhanced.js';

// Las Olas Boulevard real events (Wix warmupData scraper)
export { LasOlasEventsScraper } from './las-olas-events.js';

// Broward venue scrapers (Culture Room, Bonnet House, Funky Buddha, Savor Cinema)
export {
  CultureRoomScraper,
  BonnetHouseScraper,
  FunkyBuddhaScraper,
  SavorCinemaScraper,
} from './broward-venues.js';

// WeekendBroward PoW solver (SiteGround proof-of-work bypass)
export { WeekendBrowardPowScraper } from './weekend-broward-pow.js';

// Sofar Sounds — intimate live music events via public GraphQL API
export { SofarSoundsScraper } from './sofar-sounds.js';

// Luma — Miami/FLL events from lu.ma (pre-filtered to exclude tech/startup)
export { LumaScraper } from './luma.js';

// WordPress Tribe Events API venues (HistoryMiami, etc.)
export { HistoryMiamiScraper } from './wp-tribe-venues.js';

// Resy — special dining events (chef collabs, pop-ups, tasting menus)
export { ResyEventsScraper } from './resy-events.js';

// Venue Watchlist — curated venues checked via WP Tribe API / future APIs
export { VenueWatchlistScraper } from './venue-watchlist.js';

// Imports for getAllScrapers
import { MiamiNewTimesScraper } from './miami-new-times.js';
import { FarmersMarketsScraper } from './farmers-markets.js';
import { MusicVenuesScraper } from './music-venues.js';
import { ProfessionalSportsScraper } from './professional-sports.js';
import { WellnessFitnessScraper } from './wellness-fitness.js';
import { CulturalVenuesScraper } from './cultural-venues.js';
import { FortLauderdaleScraper } from './fort-lauderdale.js';
import { PalmBeachScraper } from './palm-beach.js';
import {
  NightlifeClubsScraper,
  LatinPartiesScraper,
  CandlelightConcertsScraper,
  IIIPointsScraper,
} from './nightlife-clubs.js';
import { ResidentAdvisorScraper } from './resident-advisor.js';
import {
  DontTellComedyScraper,
  MiamiImprovScraper,
  DaniaBeachImprovScraper,
  ArshtCenterScraper,
  FillmoreMiamiScraper,
} from './comedy-entertainment.js';
import {
  FoodEventsScraper,
  MiamiSpiceScraper,
  SOBEWFFScraper,
  WineTastingsScraper,
} from './food-drink.js';
import { HotelsHospitalityScraper } from './hotels-hospitality.js';
import { InstagramSourcesScraper } from './instagram-sources.js';
import { DiceFmScraper, ShotgunScraper, WorldCup2026Scraper } from './ticketing-platforms.js';
import {
  CoffeeAndChillScraper,
  DiploRunClubScraper,
  SoFloPopupsScraper,
} from './community-lifestyle.js';
import {
  DesignDistrictScraper,
  DeeringEstateScraper,
  MiamiFestivalsScraper,
  RegattaGroveScraper,
  SouthPointeParkScraper,
} from './cultural-districts.js';
import { CoralGablesVenuesScraper } from './coral-gables-venues.js';
import { CoconutGroveScraper } from './coconut-grove.js';
import { BrickellVenuesScraper } from './brickell-venues.js';
import { RealVenueEventsScraper } from './real-venue-events.js';
import { CulturalAttractionsScraper } from './cultural-attractions.js';
import { BeachCleanupsScraper } from './beach-cleanups.js';
import { PopUpsScraper } from './pop-ups.js';
import { CuratedRecurringScraper } from './curated-recurring.js';
import { DiceRealScraper } from './dice-scraper.js';
import { MiamiBeachesEventsScraper } from './miami-beaches-events.js';
import { CandlelightRealScraper } from './candlelight-real.js';
import { HotelEventsScraper } from './hotel-events.js';
import {
  DiceMiamiScraper,
  MiamiImprovRealScraper,
  FortLauderdaleImprovScraper,
  BrowardCenterScraper,
  RevolutionLiveScraper,
  CoralGablesScraper,
} from './real-scrapers.js';
import { VerifiedRecurringScraper } from './verified-recurring.js';
import {
  CoffeeAndChillRealScraper,
  FreeYogaScraper,
  RunClubsScraper,
  CyclingGroupRidesScraper,
} from './community-fitness.js';
import {
  WeekendBrowardScraper,
  WeekendBrowardLiveMusicScraper,
  WeekendBrowardComedyScraper,
  WeekendBrowardKaraokeScraper,
  WeekendBrowardJazzScraper,
  WeekendBrowardPBLiveMusicScraper,
  WeekendBrowardLocalEventsScraper,
} from './weekend-broward.js';
import { WeekendBrowardGoogleScraper } from './weekend-broward-google.js';
import { WeekendBrowardVerifiedScraper } from './weekend-broward-verified.js';
import { WeekendBrowardEnhancedScraper } from './weekend-broward-enhanced.js';
import { LasOlasEventsScraper } from './las-olas-events.js';
import {
  CultureRoomScraper,
  BonnetHouseScraper,
  FunkyBuddhaScraper,
  SavorCinemaScraper,
} from './broward-venues.js';
import { WeekendBrowardPowScraper } from './weekend-broward-pow.js';
import { SofarSoundsScraper } from './sofar-sounds.js';
import { LumaScraper } from './luma.js';
import { HistoryMiamiScraper } from './wp-tribe-venues.js';
import { ResyEventsScraper } from './resy-events.js';
import { VenueWatchlistScraper } from './venue-watchlist.js';
import type { BaseScraper } from './base.js';

/**
 * Get all available scrapers
 * ONLY VERIFIED SOURCES - real calendar data, not synthetic/assumed events
 */
export function getAllScrapers(): BaseScraper[] {
  return [
    // === VERIFIED REAL SOURCES ===

    // Real calendar scrape
    new MiamiNewTimesScraper(),

    // Known real recurring events
    new FarmersMarketsScraper(),
    new BeachCleanupsScraper(),
    new DontTellComedyScraper(),
    // new DiploRunClubScraper(),   // DISABLED - was a one-time 5K race on Jan 17 2026, NOT weekly
    // new CoffeeAndChillScraper(), // DISABLED - needs verification from @coffeeandchill.miami

    // Real schedules
    // new ProfessionalSportsScraper(),  // DISABLED - generates fake games, need real API
    new WorldCup2026Scraper(),

    // Seasonal festivals — return 0 events when out of season (correct behavior)
    // III Points: Oct/Feb, SOBEWFF: Jan/Feb, Miami Spice: Aug/Sep
    new IIIPointsScraper(),
    new SOBEWFFScraper(),
    new MiamiSpiceScraper(),
    new MiamiFestivalsScraper(),

    // Real ticketing platforms
    // DISABLED: DiceRealScraper — client-side only, no public API, no server-side data
    // new DiceRealScraper(),
    new ResidentAdvisorScraper(), // Real RA GraphQL API — Miami area ID 38
    // DISABLED: MiamiBeachesEventsScraper — DNS failure on Algolia CDN, blocked in all CI environments
    // new MiamiBeachesEventsScraper(),
    new CandlelightRealScraper(), // Real Candlelight concert dates from Fever (candlelight page only)
    new HotelEventsScraper(), // Real events from hotel websites (Biltmore, Faena, EDITION, etc.)
    // new DiceFmScraper(),           // SYNTHETIC - fake events like "Keinemusik Miami"
    // new ShotgunScraper(), // DISABLED - API returning 404 (endpoint changed, auth required)

    // Manually curated REAL events (venues, concerts, cultural)
    new RealVenueEventsScraper(),
    new CulturalAttractionsScraper(),

    // Pop-ups, markets, and temporary events
    new PopUpsScraper(),

    // DISABLED - contains assumed events without verification
    // new CuratedRecurringScraper(),  // NEEDS AUDIT - many events are assumed, not verified

    // Real HTTP scrapers (verified calendar data)
    new MiamiImprovRealScraper(),
    new FortLauderdaleImprovScraper(),
    // DISABLED: CoralGablesScraper — Drupal JSON:API not exposing event content type (403)
    // new CoralGablesScraper(),
    new BrowardCenterScraper(),       // Re-enabled — HTML is server-rendered, no Puppeteer needed
    new RevolutionLiveScraper(),      // FLL's premier live music venue — real concerts with prices
    // new DiceMiamiScraper(),        // NEEDS PUPPETEER - JS rendered

    // Verified recurring (confirmed from official sources only)
    new VerifiedRecurringScraper(),

    // Community fitness (verified recurring fitness/wellness events)
    new CoffeeAndChillRealScraper(),
    new FreeYogaScraper(),
    new RunClubsScraper(),
    new CyclingGroupRidesScraper(),

    // === LAS OLAS BOULEVARD (real events from Wix warmupData) ===
    new LasOlasEventsScraper(),           // Real events from lasolasboulevard.com

    // === CURATED SOURCES (verified recurring / annual events) ===
    new FortLauderdaleScraper(),          // FLL recurring events (annual festivals + verified recurring)
    new PalmBeachScraper(),               // PB recurring events (annual festivals + verified recurring)
    // new NightlifeClubsScraper(),      // SYNTHETIC
    // new LatinPartiesScraper(),        // SYNTHETIC
    // new CandlelightConcertsScraper(), // SYNTHETIC
    // new MiamiImprovScraper(),         // SYNTHETIC - real shows in CulturalAttractions
    // new DaniaBeachImprovScraper(),    // SYNTHETIC - real shows in CulturalAttractions
    // new ArshtCenterScraper(),         // SYNTHETIC - real shows in CulturalAttractions
    // new FillmoreMiamiScraper(),       // SYNTHETIC - real shows in CulturalAttractions
    // new FoodEventsScraper(),          // SYNTHETIC
    // new WineTastingsScraper(),        // SYNTHETIC
    // new HotelsHospitalityScraper(),   // SYNTHETIC
    new InstagramSourcesScraper(),         // Verified recurring events from monitored IG accounts

    // === LUMA (lu.ma — Miami/FLL events, pre-filtered to exclude tech/startup) ===
    new LumaScraper(),

    // === SOFAR SOUNDS (intimate live music via public GraphQL API) ===
    new SofarSoundsScraper(),              // Miami — secret venues, real ticketed events

    // === WORDPRESS TRIBE API VENUES ===
    new HistoryMiamiScraper(),           // HistoryMiami Museum — 13+ events via WP Tribe API

    // === RESY EVENTS (special dining events, chef collabs, pop-ups) ===
    new ResyEventsScraper(),

    // === VENUE WATCHLIST (curated venues checked via WP Tribe API) ===
    new VenueWatchlistScraper(),

    // === BROWARD VENUE SCRAPERS (real calendar data from venue websites) ===
    new CultureRoomScraper(),            // Culture Room — FLL live music, Ticketmaster links
    new BonnetHouseScraper(),            // Bonnet House — museum/garden events via WP Tribe Events API
    new FunkyBuddhaScraper(),            // Funky Buddha Brewery — tap room events, run club
    // DISABLED: SavorCinemaScraper — domain unreachable (connection refused)
    // new SavorCinemaScraper(),

    // WeekendBroward — Broward + Palm Beach events
    // new WeekendBrowardPowScraper(),   // DISABLED: PoW solver fragile in CI, WeekendBrowardVerified covers this data
    // DISABLED (2026-03-05): Chrome binary not available in current CI environment.
    // WeekendBroward Verified (105 events) and PoW solver cover this data.
    // Re-enable when running in GitHub Actions with Chrome installed.
    // new WeekendBrowardEnhancedScraper(),
    new WeekendBrowardVerifiedScraper(), // Verified specific events (real artist names, venues, dates — no API keys)
    // DISABLED: WeekendBroward base/Google scrapers are blocked (Cloudflare, no API key).
    // WeekendBrowardVerifiedScraper above provides adequate coverage (105 events).
    // new WeekendBrowardScraper(),      // RSS (blocked by Cloudflare)
    // new WeekendBrowardGoogleScraper(),// Google Custom Search API (requires GOOGLE_API_KEY + GOOGLE_CSE_ID)
    // DISABLED — Individual Puppeteer scrapers replaced by WeekendBrowardEnhancedScraper above
    // new WeekendBrowardLiveMusicScraper(),
    // new WeekendBrowardComedyScraper(),
    // new WeekendBrowardKaraokeScraper(),
    // new WeekendBrowardJazzScraper(),
    // new WeekendBrowardPBLiveMusicScraper(),
    // new WeekendBrowardLocalEventsScraper(),
    // new SoFloPopupsScraper(),         // SYNTHETIC
    // new DesignDistrictScraper(),      // SYNTHETIC
    // new DeeringEstateScraper(),       // SYNTHETIC
    // new RegattaGroveScraper(),        // SYNTHETIC
    // new SouthPointeParkScraper(),     // SYNTHETIC
    // new CoralGablesVenuesScraper(),   // SYNTHETIC
    // new CoconutGroveScraper(),        // SYNTHETIC
    // new BrickellVenuesScraper(),      // SYNTHETIC
  ];
}
