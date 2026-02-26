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

// Real HTTP scrapers (verified calendar data)
export {
  DiceMiamiScraper,
  MiamiImprovRealScraper,
  FortLauderdaleImprovScraper,
  BrowardCenterScraper,
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

// Imports for getAllScrapers
import { MiamiNewTimesScraper } from './miami-new-times.js';
import { FarmersMarketsScraper } from './farmers-markets.js';
import { MusicVenuesScraper } from './music-venues.js';
import { ProfessionalSportsScraper } from './professional-sports.js';
import { WellnessFitnessScraper } from './wellness-fitness.js';
import { CulturalVenuesScraper } from './cultural-venues.js';
import { FortLauderdaleScraper } from './fort-lauderdale.js';
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
import {
  DiceMiamiScraper,
  MiamiImprovRealScraper,
  FortLauderdaleImprovScraper,
  BrowardCenterScraper,
  CoralGablesScraper,
} from './real-scrapers.js';
import { VerifiedRecurringScraper } from './verified-recurring.js';
import {
  CoffeeAndChillRealScraper,
  FreeYogaScraper,
  RunClubsScraper,
  CyclingGroupRidesScraper,
} from './community-fitness.js';
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

    // Real festivals
    new IIIPointsScraper(),
    new SOBEWFFScraper(),
    new MiamiSpiceScraper(),
    new MiamiFestivalsScraper(),

    // Real ticketing platforms
    new DiceRealScraper(), // Puppeteer-based real scraper
    new ResidentAdvisorScraper(), // Real RA GraphQL API — Miami area ID 38
    // new DiceFmScraper(),           // SYNTHETIC - fake events like "Keinemusik Miami"
    // new ShotgunScraper(),          // SYNTHETIC - fake events like "Teksupport Miami"

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
    new CoralGablesScraper(),
    // new DiceMiamiScraper(),      // NEEDS PUPPETEER - JS rendered
    // new BrowardCenterScraper(),  // NEEDS PUPPETEER - JS rendered

    // Verified recurring (confirmed from official sources only)
    new VerifiedRecurringScraper(),

    // Community fitness (verified recurring fitness/wellness events)
    new CoffeeAndChillRealScraper(),
    new FreeYogaScraper(),
    new RunClubsScraper(),
    new CyclingGroupRidesScraper(),

    // === DISABLED SYNTHETIC SOURCES ===
    // These generate assumed events without real calendar data
    // Real events from these venues are in CulturalAttractionsScraper
    //
    // new MusicVenuesScraper(),         // SYNTHETIC
    // new WellnessFitnessScraper(),     // SYNTHETIC
    // new CulturalVenuesScraper(),      // SYNTHETIC
    // new FortLauderdaleScraper(),      // SYNTHETIC
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
    // new InstagramSourcesScraper(),    // SYNTHETIC/unverified
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
