/**
 * Event Sources Index
 * Export all scrapers
 */

// Base class
export { BaseScraper } from './base.js';

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
  ResidentAdvisorScraper,
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
  ResidentAdvisorScraper,
  LatinPartiesScraper,
  CandlelightConcertsScraper,
  IIIPointsScraper,
} from './nightlife-clubs.js';
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
import type { BaseScraper } from './base.js';

/**
 * Get all available scrapers
 */
export function getAllScrapers(): BaseScraper[] {
  return [
    // Original Miami sources
    new MiamiNewTimesScraper(),
    new FarmersMarketsScraper(),
    new MusicVenuesScraper(),
    new ProfessionalSportsScraper(),
    new WellnessFitnessScraper(),
    new CulturalVenuesScraper(),

    // Fort Lauderdale
    new FortLauderdaleScraper(),

    // Nightlife & clubs
    new NightlifeClubsScraper(),
    new ResidentAdvisorScraper(),
    new LatinPartiesScraper(),
    new CandlelightConcertsScraper(),
    new IIIPointsScraper(),

    // Comedy & entertainment
    new DontTellComedyScraper(),
    new MiamiImprovScraper(),
    new DaniaBeachImprovScraper(),
    new ArshtCenterScraper(),
    new FillmoreMiamiScraper(),

    // Food & drink
    new FoodEventsScraper(),
    new MiamiSpiceScraper(),
    new SOBEWFFScraper(),
    new WineTastingsScraper(),

    // Hotels & hospitality
    new HotelsHospitalityScraper(),

    // Instagram-sourced events
    new InstagramSourcesScraper(),

    // Ticketing platforms
    new DiceFmScraper(),
    new ShotgunScraper(),
    new WorldCup2026Scraper(),

    // Community & lifestyle
    new CoffeeAndChillScraper(),
    new DiploRunClubScraper(),
    new SoFloPopupsScraper(),

    // Cultural districts & estates
    new DesignDistrictScraper(),
    new DeeringEstateScraper(),
    new MiamiFestivalsScraper(),
    new RegattaGroveScraper(),
    new SouthPointeParkScraper(),

    // Coral Gables & neighborhood venues
    new CoralGablesVenuesScraper(),

    // Coconut Grove
    new CoconutGroveScraper(),

    // Brickell
    new BrickellVenuesScraper(),

    // Real venue events (Zey Zey, Bandshell, etc.)
    new RealVenueEventsScraper(),
  ];
}
