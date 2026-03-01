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
 *  4.   Category fallback   — generic CATEGORY_IMAGES from venues.ts
 *
 * No API calls. Pure deterministic logic. Safe to run on every scrape.
 * Real venue photos are supplied by VenueImageFetcher (runs before this agent).
 */

import { findVenue, CATEGORY_IMAGES } from '../venues.js';
import type { IRLEvent } from '../types.js';

// Venue category → semantically appropriate image (more specific than event CATEGORY_IMAGES)
// Used as tier 2.5: applies when venue is found but lacks an imageUrl
const VENUE_CATEGORY_IMAGES: Record<string, string> = {
  'club':          'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&q=80',
  'bar':           'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=800&q=80',
  'concert-hall':  'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&q=80',
  'theater':       'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80',
  'museum':        'https://images.unsplash.com/photo-1554907984-15263bfd63bd?w=800&q=80',
  'outdoor':       'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=800&q=80',
  'hotel':         'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80',
  'restaurant':    'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=80',
  'sports':        'https://images.unsplash.com/photo-1461896836934-47568d7a6ea9?w=800&q=80',
  'other':         'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800&q=80',
};

// Tag → specific Unsplash photo (more semantically precise than category defaults)
const VIBE_IMAGES: Record<string, string> = {
  'rooftop':         'https://images.unsplash.com/photo-1519331379826-f10be5486c6f?w=800&q=80',
  'waterfront':      'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80',
  'beach':           'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80',
  'sunset':          'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80',
  'sunrise':         'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?w=800&q=80',
  'latin':           'https://images.unsplash.com/photo-1547153760-18fc86324498?w=800&q=80',
  'jazz':            'https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=800&q=80',
  'dj':              'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&q=80',
  'electronic':      'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&q=80',
  'live-music':      'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&q=80',
  'hip-hop':         'https://images.unsplash.com/photo-1547153760-18fc86324498?w=800&q=80',
  'dancing':         'https://images.unsplash.com/photo-1547153760-18fc86324498?w=800&q=80',
  'art-gallery':     'https://images.unsplash.com/photo-1536924940846-227afb31e2a5?w=800&q=80',
  'museum':          'https://images.unsplash.com/photo-1554907984-15263bfd63bd?w=800&q=80',
  'brunch':          'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=80',
  'happy-hour':      'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=800&q=80',
  'cocktails':       'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=800&q=80',
  'wine-tasting':    'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=800&q=80',
  'craft-beer':      'https://images.unsplash.com/photo-1559818126-a1c72c0f30a2?w=800&q=80',
  'outdoor-dining':  'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&q=80',
  'food-market':     'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&q=80',
  'yoga':            'https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=800&q=80',
  'meditation':      'https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=800&q=80',
  'running':         'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800&q=80',
  'cycling':         'https://images.unsplash.com/photo-1571068316344-75bc76f77890?w=800&q=80',
  'fitness-class':   'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800&q=80',
  'theater':         'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80',
  'comedy':          'https://images.unsplash.com/photo-1527224857830-43a7acc85260?w=800&q=80',
  'pop-up':          'https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?w=800&q=80',
  'networking':      'https://images.unsplash.com/photo-1556761175-4b46a572b786?w=800&q=80',
  'workshop':        'https://images.unsplash.com/photo-1556761175-4b46a572b786?w=800&q=80',
  'family-friendly': 'https://images.unsplash.com/photo-1502086223501-7ea6ecd79368?w=800&q=80',
  'dog-friendly':    'https://images.unsplash.com/photo-1534361960057-19f4434a4d07?w=800&q=80',
  'free-event':      'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800&q=80',
};

// Priority order for tag matching — most visually distinctive tags win
// (evaluated top-to-bottom; first match in this list beats all later tags)
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
  /** Map of sourceUrl/instagramKey → real venue og:image from VenueImageFetcher */
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
    console.log(
      `\n🎨 BrandingAgent: ${realAfter} events with real venue photos` +
        (realAfter > realImageCount ? ` (+${realAfter - realImageCount} new)` : '') +
        `, ${result.length - realAfter} using stock fallback`
    );
    return result;
  }

  private resolveImage(event: IRLEvent): string | undefined {
    // 1. Native event image — always wins (set by scraper from ticketing site)
    if (event.image) return event.image;

    // 1.5. Real venue photo from VenueImageFetcher (og:image from source website)
    //   - Non-instagram: keyed by event.source.url (e.g. "https://thebass.org/")
    //   - Instagram:     keyed by "https://instagram.com/@{handle}" (from websiteUrl)
    if (event.source?.url) {
      const fetched = this.fetchedImages[event.source.url];
      if (fetched) return fetched;
    }

    // 2. Venue DB image — pre-curated imageUrl on known venues
    // 2.5. Venue category fallback — semantic when venue found but lacks imageUrl
    if (event.venueName) {
      const venue = findVenue(event.venueName);
      if (venue?.imageUrl) return venue.imageUrl;
      if (venue?.category && VENUE_CATEGORY_IMAGES[venue.category]) {
        return VENUE_CATEGORY_IMAGES[venue.category];
      }
    }

    // 3. Vibe-aware: best-matching tag → specific Unsplash photo.
    // Priority order defined by TAG_PRIORITY — more specific tags beat generic ones.
    for (const tag of TAG_PRIORITY) {
      if (event.tags.includes(tag) && VIBE_IMAGES[tag]) {
        return VIBE_IMAGES[tag];
      }
    }

    // 4. Category fallback
    return CATEGORY_IMAGES[event.category] ?? CATEGORY_IMAGES['Culture'];
  }
}
