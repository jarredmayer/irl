/**
 * Event Sources Index
 * Export all scrapers
 */

export { BaseScraper } from './base.js';
export { MiamiNewTimesScraper } from './miami-new-times.js';
export { FarmersMarketsScraper } from './farmers-markets.js';
export { MusicVenuesScraper } from './music-venues.js';
export { ProfessionalSportsScraper } from './professional-sports.js';
export { WellnessFitnessScraper } from './wellness-fitness.js';
export { CulturalVenuesScraper } from './cultural-venues.js';

import { MiamiNewTimesScraper } from './miami-new-times.js';
import { FarmersMarketsScraper } from './farmers-markets.js';
import { MusicVenuesScraper } from './music-venues.js';
import { ProfessionalSportsScraper } from './professional-sports.js';
import { WellnessFitnessScraper } from './wellness-fitness.js';
import { CulturalVenuesScraper } from './cultural-venues.js';
import type { BaseScraper } from './base.js';

/**
 * Get all available scrapers
 */
export function getAllScrapers(): BaseScraper[] {
  return [
    new MiamiNewTimesScraper(),
    new FarmersMarketsScraper(),
    new MusicVenuesScraper(),
    new ProfessionalSportsScraper(),
    new WellnessFitnessScraper(),
    new CulturalVenuesScraper(),
  ];
}
