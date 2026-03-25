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
export { MusicVenuesScraper } from './music-venues.js';
export { ProfessionalSportsScraper } from './professional-sports.js';
export { WellnessFitnessScraper } from './wellness-fitness.js';
export { CulturalVenuesScraper } from './cultural-venues.js';

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

// Instagram real scraper (fetches posts via IG API + Claude extraction)
export { InstagramRealScraper } from './instagram-real.js';

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
  CoralGablesScraper,
} from './real-scrapers.js';

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

// Eventbrite Miami — real events via Eventbrite destination search API
export { EventbriteMiamiScraper } from './eventbrite-miami.js';

// Fever Miami — curated experiences (Candlelight, immersive art, etc.) via plan pages
export { FeverMiamiScraper } from './fever-miami.js';

// Shotgun Miami — electronic music / nightlife (Vercel-protected, graceful fallback)
export { ShotgunMiamiScraper } from './shotgun-miami.js';

// Do305 — Miami-specific events platform (DNS issues, graceful fallback)
export { Do305Scraper } from './do305.js';

// Club Space — real events via Dice.fm partners widget API
export { ClubSpaceScraper } from './club-space.js';

// Miami Museums — PAMM, ICA Miami, Wolfsonian, Little Haiti Cultural, Wynwood BID
export {
  PAMMScraper,
  ICAMiamiScraper,
  WolfsonianScraper,
  LittleHaitiCulturalScraper,
  WynwoodBIDScraper,
} from './miami-museums.js';

// Imports for getAllScrapers
import { MiamiNewTimesScraper } from './miami-new-times.js';
import {
  IIIPointsScraper,
} from './nightlife-clubs.js';
import { ResidentAdvisorScraper } from './resident-advisor.js';
import {
  DontTellComedyScraper,
} from './comedy-entertainment.js';
import {
  MiamiSpiceScraper,
  SOBEWFFScraper,
} from './food-drink.js';
import { WorldCup2026Scraper } from './ticketing-platforms.js';
import {
  MiamiFestivalsScraper,
} from './cultural-districts.js';
import { DiceRealScraper } from './dice-scraper.js';
import { CandlelightRealScraper } from './candlelight-real.js';
import { HotelEventsScraper } from './hotel-events.js';
import {
  MiamiImprovRealScraper,
  FortLauderdaleImprovScraper,
  BrowardCenterScraper,
} from './real-scrapers.js';
import { LasOlasEventsScraper } from './las-olas-events.js';
import {
  CultureRoomScraper,
  BonnetHouseScraper,
} from './broward-venues.js';
import { SofarSoundsScraper } from './sofar-sounds.js';
import { LumaScraper } from './luma.js';
import { HistoryMiamiScraper } from './wp-tribe-venues.js';
import { ResyEventsScraper } from './resy-events.js';
import { VenueWatchlistScraper } from './venue-watchlist.js';
import { EventbriteMiamiScraper } from './eventbrite-miami.js';
import { FeverMiamiScraper } from './fever-miami.js';
import { ClubSpaceScraper } from './club-space.js';
import {
  PAMMScraper,
  ICAMiamiScraper,
  WolfsonianScraper,
  LittleHaitiCulturalScraper,
  WynwoodBIDScraper,
} from './miami-museums.js';
import { InstagramRealScraper } from './instagram-real.js';
import type { BaseScraper } from './base.js';

/**
 * Get all available scrapers
 * ONLY REAL SOURCES — every scraper here makes actual HTTP requests
 */
export function getAllScrapers(): BaseScraper[] {
  return [
    // === REAL CALENDAR SCRAPERS ===
    new MiamiNewTimesScraper(),
    new DontTellComedyScraper(),

    // Seasonal festivals — return 0 events when out of season (correct behavior)
    new IIIPointsScraper(),
    new SOBEWFFScraper(),
    new MiamiSpiceScraper(),
    new MiamiFestivalsScraper(),
    new WorldCup2026Scraper(),

    // === REAL TICKETING PLATFORMS ===
    new DiceRealScraper(),
    new ResidentAdvisorScraper(),
    new CandlelightRealScraper(),
    new HotelEventsScraper(),

    // === REAL HTTP SCRAPERS (verified calendar data) ===
    new MiamiImprovRealScraper(),
    new FortLauderdaleImprovScraper(),
    new BrowardCenterScraper(),

    // === LAS OLAS BOULEVARD (real events from Wix warmupData) ===
    new LasOlasEventsScraper(),

    // === LUMA (lu.ma — Miami/FLL events, pre-filtered to exclude tech/startup) ===
    new LumaScraper(),

    // === SOFAR SOUNDS (intimate live music via public GraphQL API) ===
    new SofarSoundsScraper(),

    // === WORDPRESS TRIBE API VENUES ===
    new HistoryMiamiScraper(),

    // === RESY EVENTS (special dining events, chef collabs, pop-ups) ===
    new ResyEventsScraper(),

    // === VENUE WATCHLIST (curated venues checked via WP Tribe API) ===
    new VenueWatchlistScraper(),

    // === EVENTBRITE MIAMI (real events via destination search API) ===
    new EventbriteMiamiScraper(),

    // === FEVER MIAMI (curated experiences — Candlelight, immersive art, Cirque du Soleil) ===
    new FeverMiamiScraper(),

    // === CLUB SPACE (real events via Dice.fm partners widget API) ===
    new ClubSpaceScraper(),

    // === MIAMI MUSEUMS & CULTURAL INSTITUTIONS ===
    new PAMMScraper(),
    new ICAMiamiScraper(),
    new WolfsonianScraper(),
    new LittleHaitiCulturalScraper(),
    new WynwoodBIDScraper(),

    // === BROWARD VENUE SCRAPERS (real calendar data from venue websites) ===
    new CultureRoomScraper(),
    new BonnetHouseScraper(),

    // === INSTAGRAM (real IG API + Claude extraction) ===
    new InstagramRealScraper(),
  ];
}
