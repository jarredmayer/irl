/**
 * BrandingAgent
 *
 * Assigns images to events using a waterfall (zero LLM cost):
 *  1.   Native event image  — from scraper source (always preferred)
 *  1.5. Fetched venue image — real og:image from VenueImageFetcher cache
 *         keyed by event.source.url  (e.g. thebass.org → The Bass museum photo)
 *         or "https://instagram.com/@handle" (from venue website)
 *  2.   Venue DB image      — from VENUES database imageUrl field
 *  2.5. Venue category      — semantic fallback when venue found but no imageUrl
 *  3.   Vibe-aware Unsplash — specific to event tags (rooftop, latin, jazz…)
 *  4.   Category fallback   — generic category images
 *
 * Uses image ARRAYS with hash-based rotation so events in the same category
 * get visually distinct photos instead of the same repeated image.
 *
 * No API calls. Pure deterministic logic. Safe to run on every scrape.
 * Real venue photos are supplied by VenueImageFetcher (runs before this agent).
 */

import { findVenue } from '../venues.js';
import type { IRLEvent } from '../types.js';

/** Simple string hash → index selector. Deterministic: same event always gets same image. */
function pickImage(images: string[], seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
  }
  return images[Math.abs(hash) % images.length];
}

// ── Venue category images (tier 2.5) ─────────────────────────────────────
const VENUE_CATEGORY_IMAGES: Record<string, string[]> = {
  'club': [
    'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&q=80',
    'https://images.unsplash.com/photo-1571266028243-d220d11eec47?w=800&q=80',
    'https://images.unsplash.com/photo-1574391884720-bbc3740c59d1?w=800&q=80',
    'https://images.unsplash.com/photo-1545128485-c400e7702796?w=800&q=80',
  ],
  'bar': [
    'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=800&q=80',
    'https://images.unsplash.com/photo-1543007630-9710e4a00a20?w=800&q=80',
    'https://images.unsplash.com/photo-1572116469696-31de0f17cc34?w=800&q=80',
    'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=800&q=80',
  ],
  'concert-hall': [
    'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&q=80',
    'https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?w=800&q=80',
    'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=800&q=80',
    'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=800&q=80',
  ],
  'theater': [
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80',
    'https://images.unsplash.com/photo-1503095396549-807759245b35?w=800&q=80',
    'https://images.unsplash.com/photo-1580809361436-42a7ec204889?w=800&q=80',
  ],
  'museum': [
    'https://images.unsplash.com/photo-1554907984-15263bfd63bd?w=800&q=80',
    'https://images.unsplash.com/photo-1566054757965-8c4085344c96?w=800&q=80',
    'https://images.unsplash.com/photo-1518998053901-5348d3961a04?w=800&q=80',
  ],
  'outdoor': [
    'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=800&q=80',
    'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&q=80',
    'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=800&q=80',
    'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&q=80',
  ],
  'hotel': [
    'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80',
    'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800&q=80',
    'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&q=80',
  ],
  'restaurant': [
    'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=80',
    'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&q=80',
    'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&q=80',
    'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=800&q=80',
  ],
  'sports': [
    'https://images.unsplash.com/photo-1461896836934-47568d7a6ea9?w=800&q=80',
    'https://images.unsplash.com/photo-1471295253337-3ceaaedca402?w=800&q=80',
    'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800&q=80',
  ],
  'other': [
    'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800&q=80',
    'https://images.unsplash.com/photo-1528605248644-14dd04022da1?w=800&q=80',
    'https://images.unsplash.com/photo-1523580494863-6f3031224c94?w=800&q=80',
  ],
};

// ── Vibe tag images (tier 3) ─────────────────────────────────────────────
const VIBE_IMAGES: Record<string, string[]> = {
  'rooftop': [
    'https://images.unsplash.com/photo-1519331379826-f10be5486c6f?w=800&q=80',
    'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=800&q=80',
    'https://images.unsplash.com/photo-1470337458703-46ad1756a187?w=800&q=80',
  ],
  'waterfront': [
    'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80',
    'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80',
    'https://images.unsplash.com/photo-1519046904884-53103b34b206?w=800&q=80',
  ],
  'beach': [
    'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80',
    'https://images.unsplash.com/photo-1473116763249-2faaef81ccda?w=800&q=80',
    'https://images.unsplash.com/photo-1519046904884-53103b34b206?w=800&q=80',
    'https://images.unsplash.com/photo-1504681869696-d977211a5f4c?w=800&q=80',
  ],
  'sunset': [
    'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80',
    'https://images.unsplash.com/photo-1495616811223-4d98c6e9c869?w=800&q=80',
    'https://images.unsplash.com/photo-1472120435266-95a3675c6e2b?w=800&q=80',
  ],
  'sunrise': [
    'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?w=800&q=80',
    'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&q=80',
  ],
  'latin': [
    'https://images.unsplash.com/photo-1547153760-18fc86324498?w=800&q=80',
    'https://images.unsplash.com/photo-1504609813442-a8924e83f76e?w=800&q=80',
    'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800&q=80',
  ],
  'jazz': [
    'https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=800&q=80',
    'https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?w=800&q=80',
    'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=800&q=80',
  ],
  'dj': [
    'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&q=80',
    'https://images.unsplash.com/photo-1571266028243-d220d11eec47?w=800&q=80',
    'https://images.unsplash.com/photo-1574391884720-bbc3740c59d1?w=800&q=80',
  ],
  'electronic': [
    'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&q=80',
    'https://images.unsplash.com/photo-1545128485-c400e7702796?w=800&q=80',
    'https://images.unsplash.com/photo-1574391884720-bbc3740c59d1?w=800&q=80',
  ],
  'live-music': [
    'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&q=80',
    'https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?w=800&q=80',
    'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=800&q=80',
    'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=800&q=80',
  ],
  'hip-hop': [
    'https://images.unsplash.com/photo-1547153760-18fc86324498?w=800&q=80',
    'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800&q=80',
    'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&q=80',
  ],
  'dancing': [
    'https://images.unsplash.com/photo-1547153760-18fc86324498?w=800&q=80',
    'https://images.unsplash.com/photo-1504609813442-a8924e83f76e?w=800&q=80',
    'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800&q=80',
  ],
  'art-gallery': [
    'https://images.unsplash.com/photo-1536924940846-227afb31e2a5?w=800&q=80',
    'https://images.unsplash.com/photo-1531913764164-f85c3e01b2aa?w=800&q=80',
    'https://images.unsplash.com/photo-1544967082-d9d25d867d66?w=800&q=80',
    'https://images.unsplash.com/photo-1518998053901-5348d3961a04?w=800&q=80',
  ],
  'museum': [
    'https://images.unsplash.com/photo-1554907984-15263bfd63bd?w=800&q=80',
    'https://images.unsplash.com/photo-1566054757965-8c4085344c96?w=800&q=80',
    'https://images.unsplash.com/photo-1518998053901-5348d3961a04?w=800&q=80',
  ],
  'brunch': [
    'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=80',
    'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80',
    'https://images.unsplash.com/photo-1476224203421-9ac39bcb3327?w=800&q=80',
    'https://images.unsplash.com/photo-1495147466023-ac5c588e2e94?w=800&q=80',
  ],
  'happy-hour': [
    'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=800&q=80',
    'https://images.unsplash.com/photo-1543007630-9710e4a00a20?w=800&q=80',
    'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=800&q=80',
  ],
  'cocktails': [
    'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=800&q=80',
    'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=800&q=80',
    'https://images.unsplash.com/photo-1572116469696-31de0f17cc34?w=800&q=80',
  ],
  'wine-tasting': [
    'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=800&q=80',
    'https://images.unsplash.com/photo-1474722883778-792e7990302f?w=800&q=80',
    'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?w=800&q=80',
  ],
  'craft-beer': [
    'https://images.unsplash.com/photo-1559818126-a1c72c0f30a2?w=800&q=80',
    'https://images.unsplash.com/photo-1535958636474-b021ee887b13?w=800&q=80',
  ],
  'outdoor-dining': [
    'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&q=80',
    'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&q=80',
    'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=800&q=80',
  ],
  'food-market': [
    'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&q=80',
    'https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=800&q=80',
    'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&q=80',
  ],
  'yoga': [
    'https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=800&q=80',
    'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&q=80',
    'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&q=80',
  ],
  'meditation': [
    'https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=800&q=80',
    'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&q=80',
  ],
  'running': [
    'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800&q=80',
    'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=800&q=80',
    'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=800&q=80',
  ],
  'cycling': [
    'https://images.unsplash.com/photo-1571068316344-75bc76f77890?w=800&q=80',
    'https://images.unsplash.com/photo-1534787238916-9ba6764efd4f?w=800&q=80',
  ],
  'fitness-class': [
    'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800&q=80',
    'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800&q=80',
    'https://images.unsplash.com/photo-1534258936925-c58bed479fcb?w=800&q=80',
  ],
  'theater': [
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80',
    'https://images.unsplash.com/photo-1503095396549-807759245b35?w=800&q=80',
    'https://images.unsplash.com/photo-1580809361436-42a7ec204889?w=800&q=80',
  ],
  'comedy': [
    'https://images.unsplash.com/photo-1527224857830-43a7acc85260?w=800&q=80',
    'https://images.unsplash.com/photo-1585699324551-f6c309eedeca?w=800&q=80',
    'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=800&q=80',
  ],
  'pop-up': [
    'https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?w=800&q=80',
    'https://images.unsplash.com/photo-1528605248644-14dd04022da1?w=800&q=80',
  ],
  'networking': [
    'https://images.unsplash.com/photo-1556761175-4b46a572b786?w=800&q=80',
    'https://images.unsplash.com/photo-1528605248644-14dd04022da1?w=800&q=80',
    'https://images.unsplash.com/photo-1523580494863-6f3031224c94?w=800&q=80',
  ],
  'workshop': [
    'https://images.unsplash.com/photo-1556761175-4b46a572b786?w=800&q=80',
    'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&q=80',
  ],
  'family-friendly': [
    'https://images.unsplash.com/photo-1502086223501-7ea6ecd79368?w=800&q=80',
    'https://images.unsplash.com/photo-1472653816316-3ad6f10a6592?w=800&q=80',
    'https://images.unsplash.com/photo-1484820540004-14229fe36ca4?w=800&q=80',
  ],
  'dog-friendly': [
    'https://images.unsplash.com/photo-1534361960057-19f4434a4d07?w=800&q=80',
    'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=800&q=80',
  ],
  'free-event': [
    'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800&q=80',
    'https://images.unsplash.com/photo-1528605248644-14dd04022da1?w=800&q=80',
    'https://images.unsplash.com/photo-1523580494863-6f3031224c94?w=800&q=80',
  ],
};

// ── Category fallback images (tier 4) ────────────────────────────────────
const CATEGORY_IMAGE_ARRAYS: Record<string, string[]> = {
  Music: [
    'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&q=80',
    'https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?w=800&q=80',
    'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=800&q=80',
    'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=800&q=80',
    'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&q=80',
  ],
  Art: [
    'https://images.unsplash.com/photo-1536924940846-227afb31e2a5?w=800&q=80',
    'https://images.unsplash.com/photo-1531913764164-f85c3e01b2aa?w=800&q=80',
    'https://images.unsplash.com/photo-1544967082-d9d25d867d66?w=800&q=80',
    'https://images.unsplash.com/photo-1518998053901-5348d3961a04?w=800&q=80',
  ],
  Culture: [
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80',
    'https://images.unsplash.com/photo-1503095396549-807759245b35?w=800&q=80',
    'https://images.unsplash.com/photo-1566054757965-8c4085344c96?w=800&q=80',
    'https://images.unsplash.com/photo-1554907984-15263bfd63bd?w=800&q=80',
  ],
  'Food & Drink': [
    'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=80',
    'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80',
    'https://images.unsplash.com/photo-1476224203421-9ac39bcb3327?w=800&q=80',
    'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&q=80',
    'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&q=80',
  ],
  Fitness: [
    'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800&q=80',
    'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=800&q=80',
    'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800&q=80',
    'https://images.unsplash.com/photo-1534258936925-c58bed479fcb?w=800&q=80',
    'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=800&q=80',
  ],
  Wellness: [
    'https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=800&q=80',
    'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&q=80',
    'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&q=80',
  ],
  Sports: [
    'https://images.unsplash.com/photo-1461896836934-47568d7a6ea9?w=800&q=80',
    'https://images.unsplash.com/photo-1471295253337-3ceaaedca402?w=800&q=80',
    'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800&q=80',
  ],
  Comedy: [
    'https://images.unsplash.com/photo-1527224857830-43a7acc85260?w=800&q=80',
    'https://images.unsplash.com/photo-1585699324551-f6c309eedeca?w=800&q=80',
    'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=800&q=80',
  ],
  Family: [
    'https://images.unsplash.com/photo-1502086223501-7ea6ecd79368?w=800&q=80',
    'https://images.unsplash.com/photo-1472653816316-3ad6f10a6592?w=800&q=80',
    'https://images.unsplash.com/photo-1484820540004-14229fe36ca4?w=800&q=80',
  ],
  Community: [
    'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800&q=80',
    'https://images.unsplash.com/photo-1528605248644-14dd04022da1?w=800&q=80',
    'https://images.unsplash.com/photo-1523580494863-6f3031224c94?w=800&q=80',
    'https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=800&q=80',
  ],
  Nightlife: [
    'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&q=80',
    'https://images.unsplash.com/photo-1571266028243-d220d11eec47?w=800&q=80',
    'https://images.unsplash.com/photo-1574391884720-bbc3740c59d1?w=800&q=80',
    'https://images.unsplash.com/photo-1545128485-c400e7702796?w=800&q=80',
  ],
  Outdoors: [
    'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=800&q=80',
    'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&q=80',
    'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=800&q=80',
    'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&q=80',
  ],
  Shopping: [
    'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&q=80',
    'https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?w=800&q=80',
    'https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=800&q=80',
  ],
};

// Priority order for tag matching — most visually distinctive tags win
const TAG_PRIORITY = [
  'rooftop', 'waterfront', 'beach', 'sunset', 'sunrise',
  'art-gallery', 'museum', 'theater',
  'latin', 'jazz', 'dj', 'electronic', 'hip-hop', 'live-music',
  'outdoor-dining', 'food-market', 'brunch', 'happy-hour', 'cocktails',
  'wine-tasting', 'craft-beer',
  'yoga', 'meditation', 'running', 'cycling', 'fitness-class',
  'comedy', 'pop-up', 'networking', 'workshop',
  'family-friendly', 'dog-friendly', 'dancing', 'free-event',
];

export class BrandingAgent {
  private fetchedImages: Record<string, string>;

  constructor(fetchedVenueImages: Record<string, string> = {}) {
    this.fetchedImages = fetchedVenueImages;
  }

  run(events: IRLEvent[]): IRLEvent[] {
    let updated = 0;
    const realImageCount = events.filter((e) => e.image && !e.image.includes('unsplash')).length;

    const result = events.map((e) => {
      const resolved = this.resolveImage(e);
      if (resolved !== e.image) {
        updated++;
        return { ...e, image: resolved };
      }
      return e;
    });

    const realAfter = result.filter((e) => e.image && !e.image.includes('unsplash')).length;
    const uniqueImages = new Set(result.map((e) => e.image)).size;
    console.log(
      `\n🎨 BrandingAgent: ${realAfter} real venue photos` +
        (realAfter > realImageCount ? ` (+${realAfter - realImageCount} new)` : '') +
        `, ${result.length - realAfter} stock fallback` +
        `, ${uniqueImages} unique images across ${result.length} events`
    );
    return result;
  }

  private resolveImage(event: IRLEvent): string | undefined {
    // Seed for hash-based image rotation — unique per event
    const seed = event.id || `${event.title}|${event.startAt}`;

    // 1. Native event image — always wins (but not Unsplash fallbacks from prior runs)
    if (event.image && !event.image.includes('images.unsplash.com')) return event.image;

    // 1.5. Real venue photo from VenueImageFetcher
    if (event.source?.url) {
      const fetched = this.fetchedImages[event.source.url];
      if (fetched) return fetched;
    }

    // 2. Venue DB image
    // 2.5. Venue category fallback with rotation
    if (event.venueName) {
      const venue = findVenue(event.venueName);
      if (venue?.imageUrl) return venue.imageUrl;
      if (venue?.category && VENUE_CATEGORY_IMAGES[venue.category]) {
        return pickImage(VENUE_CATEGORY_IMAGES[venue.category], seed);
      }
    }

    // 3. Vibe-aware: best-matching tag with rotation
    for (const tag of TAG_PRIORITY) {
      if (event.tags.includes(tag) && VIBE_IMAGES[tag]) {
        return pickImage(VIBE_IMAGES[tag], seed);
      }
    }

    // 4. Category fallback with rotation
    const categoryImages = CATEGORY_IMAGE_ARRAYS[event.category] ?? CATEGORY_IMAGE_ARRAYS['Culture'];
    return pickImage(categoryImages, seed);
  }
}
