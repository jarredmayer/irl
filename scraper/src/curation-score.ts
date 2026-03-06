/**
 * Curation Score Calculator
 *
 * Computes deterministic quality scores for events based on data completeness,
 * freshness, and source trustworthiness. Used alongside the LLM-based CurationAgent
 * for editor picks.
 *
 * Scoring dimensions:
 * - Completeness (0-100): How filled out is the event data?
 * - Freshness (0-100): How recently was the event added relative to start time?
 * - Trust Tier: Source reputation (high/medium/low)
 */

import type { RawEvent, IRLEvent, TrustTier, IndoorOutdoor, ImageTier } from './types.js';

// Source trust tiers based on data quality and verification
const SOURCE_TRUST_MAP: Record<string, TrustTier> = {
  // HIGH TRUST: Official APIs, verified venues, institutional sources
  'resident-advisor': 'high',
  'dice': 'high',
  'eventbrite': 'high',
  'luma': 'high',
  'pamm': 'high',
  'ica-miami': 'high',
  'wolfsonian': 'high',
  'faena': 'high',
  'adrienne-arsht': 'high',
  'club-space': 'high',
  'fever': 'high',
  'sofar-sounds': 'high',

  // MEDIUM TRUST: Aggregators, scraped event sites, community sources
  'do305': 'medium',
  'miami-new-times': 'medium',
  'shotgun': 'medium',
  'partiful': 'medium',
  'bandsintown': 'medium',
  'little-haiti-cultural': 'medium',
  'wynwood-bid': 'medium',
  'coral-gables': 'medium',
  'coconut-grove': 'medium',

  // LOW TRUST: Template generators, user-submitted, unverified
  'curated-recurring': 'low',
  'template': 'low',
  'unknown': 'low',
};

// Field weights for completeness calculation
const FIELD_WEIGHTS = {
  title: 10,           // Required - heavily weighted
  startAt: 10,         // Required - heavily weighted
  description: 15,     // Long descriptions add value
  venueName: 10,       // Important for context
  address: 8,          // Helps with location
  neighborhood: 5,     // Nice to have
  lat: 5,              // Required for map
  lng: 5,              // Required for map
  category: 5,         // Helps with filtering
  tags: 5,             // Helps with discovery
  image: 12,           // Visual appeal critical
  priceLabel: 5,       // Important info
  ticketUrl: 5,        // Actionable
};

const MAX_COMPLETENESS = Object.values(FIELD_WEIGHTS).reduce((a, b) => a + b, 0);

/**
 * Calculate completeness score (0-100) based on filled fields
 */
export function computeCompletenessScore(event: RawEvent | IRLEvent): number {
  let score = 0;

  // Title
  if (event.title && event.title.length > 3) {
    score += FIELD_WEIGHTS.title;
    // Bonus for longer, more descriptive titles
    if (event.title.length > 20) score += 2;
  }

  // Start date
  if (event.startAt) {
    score += FIELD_WEIGHTS.startAt;
  }

  // Description
  if (event.description) {
    if (event.description.length > 200) {
      score += FIELD_WEIGHTS.description;
    } else if (event.description.length > 50) {
      score += Math.floor(FIELD_WEIGHTS.description * 0.6);
    } else if (event.description.length > 10) {
      score += Math.floor(FIELD_WEIGHTS.description * 0.3);
    }
  }

  // Venue name
  if (event.venueName && event.venueName.length > 2) {
    score += FIELD_WEIGHTS.venueName;
  }

  // Address
  if (event.address && event.address.length > 5) {
    score += FIELD_WEIGHTS.address;
  }

  // Neighborhood
  if (event.neighborhood && event.neighborhood !== 'Miami' && event.neighborhood.length > 3) {
    score += FIELD_WEIGHTS.neighborhood;
  }

  // Coordinates
  if (event.lat && event.lng) {
    score += FIELD_WEIGHTS.lat + FIELD_WEIGHTS.lng;
  }

  // Category
  if (event.category && event.category !== 'Other') {
    score += FIELD_WEIGHTS.category;
  }

  // Tags
  if (event.tags && event.tags.length > 0) {
    score += Math.min(event.tags.length, 3) * Math.floor(FIELD_WEIGHTS.tags / 3);
  }

  // Image
  if (event.image && event.image.length > 10) {
    score += FIELD_WEIGHTS.image;
  }

  // Price label
  if (event.priceLabel) {
    score += FIELD_WEIGHTS.priceLabel;
  }

  // Ticket URL
  if ('ticketUrl' in event && event.ticketUrl && event.ticketUrl.length > 10) {
    score += FIELD_WEIGHTS.ticketUrl;
  }

  return Math.min(100, Math.round((score / MAX_COMPLETENESS) * 100));
}

/**
 * Calculate freshness score (0-100) based on timing
 *
 * Higher scores for:
 * - Events added recently relative to their start time (not last minute adds)
 * - Events that are coming up soon but not too soon
 * - Events verified/updated recently
 */
export function computeFreshnessScore(
  event: RawEvent | IRLEvent,
  now: Date = new Date()
): number {
  const startDate = new Date(event.startAt);
  const addedAt = 'addedAt' in event && event.addedAt
    ? new Date(event.addedAt)
    : now;

  const hoursUntilEvent = (startDate.getTime() - now.getTime()) / (1000 * 60 * 60);
  const hoursEventWasKnown = (startDate.getTime() - addedAt.getTime()) / (1000 * 60 * 60);

  // Events happening in the past get 0
  if (hoursUntilEvent < 0) return 0;

  let score = 50; // Base score

  // Timing sweet spot: Events 2-72 hours away get bonus
  if (hoursUntilEvent >= 2 && hoursUntilEvent <= 72) {
    score += 20;
  } else if (hoursUntilEvent > 72 && hoursUntilEvent <= 168) {
    // This week
    score += 15;
  } else if (hoursUntilEvent > 168 && hoursUntilEvent <= 336) {
    // Next week
    score += 10;
  }

  // Reward events that were known in advance (not last-minute adds)
  // Events known for 24+ hours before they happen are more reliable
  if (hoursEventWasKnown >= 24) {
    score += 15;
  } else if (hoursEventWasKnown >= 12) {
    score += 10;
  } else if (hoursEventWasKnown >= 2) {
    score += 5;
  }

  // Penalty for very far future events (over 30 days)
  if (hoursUntilEvent > 720) {
    score -= 10;
  }

  return Math.min(100, Math.max(0, score));
}

/**
 * Determine trust tier based on source
 */
export function computeTrustTier(sourceName: string): TrustTier {
  // Normalize source name
  const normalized = sourceName.toLowerCase().replace(/[^a-z0-9-]/g, '');

  // Check direct match
  if (SOURCE_TRUST_MAP[normalized]) {
    return SOURCE_TRUST_MAP[normalized];
  }

  // Check partial matches for known sources
  for (const [key, tier] of Object.entries(SOURCE_TRUST_MAP)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return tier;
    }
  }

  // Default to low trust for unknown sources
  return 'low';
}

/**
 * Infer indoor/outdoor status from event data
 */
export function inferIndoorOutdoor(event: RawEvent): IndoorOutdoor {
  // If explicitly set on the event
  if ('indoorOutdoor' in event && event.indoorOutdoor) {
    return event.indoorOutdoor;
  }

  // Use isOutdoor flag
  if (event.isOutdoor === true) return 'outdoor';
  if (event.isOutdoor === false) return 'indoor';

  // Infer from tags
  const outdoorTags = ['beach', 'park', 'rooftop', 'waterfront', 'outdoor-dining', 'sunset', 'sunrise'];
  const indoorTags = ['museum', 'theater', 'gallery', 'club', 'bar'];

  const tags = event.tags.map(t => t.toLowerCase());

  const hasOutdoor = outdoorTags.some(t => tags.includes(t));
  const hasIndoor = indoorTags.some(t => tags.includes(t));

  if (hasOutdoor && hasIndoor) return 'both';
  if (hasOutdoor) return 'outdoor';
  if (hasIndoor) return 'indoor';

  // Infer from category
  const outdoorCategories = ['Outdoors', 'Fitness', 'Sports'];
  const indoorCategories = ['Comedy', 'Theater', 'Art'];

  if (outdoorCategories.includes(event.category)) return 'outdoor';
  if (indoorCategories.includes(event.category)) return 'indoor';

  // Infer from venue name
  const venueLower = (event.venueName || '').toLowerCase();
  if (venueLower.includes('beach') || venueLower.includes('park') || venueLower.includes('rooftop')) {
    return 'outdoor';
  }
  if (venueLower.includes('museum') || venueLower.includes('theater') || venueLower.includes('club')) {
    return 'indoor';
  }

  return 'unknown';
}

/**
 * Compute combined curation score (0-100)
 *
 * Weighted combination of completeness, freshness, and trust.
 */
export function computeCurationScore(
  event: RawEvent | IRLEvent,
  now: Date = new Date()
): {
  curationScore: number;
  completenessScore: number;
  freshnessScore: number;
  trustTier: TrustTier;
} {
  const completenessScore = computeCompletenessScore(event);
  const freshnessScore = computeFreshnessScore(event, now);
  const sourceName = 'sourceName' in event
    ? event.sourceName
    : ('source' in event && event.source?.name) || 'unknown';
  const trustTier = computeTrustTier(sourceName);

  // Trust multiplier
  const trustMultiplier = trustTier === 'high' ? 1.2 : trustTier === 'medium' ? 1.0 : 0.8;

  // Weighted combination
  const baseScore = (completenessScore * 0.5) + (freshnessScore * 0.5);
  const curationScore = Math.min(100, Math.round(baseScore * trustMultiplier));

  return {
    curationScore,
    completenessScore,
    freshnessScore,
    trustTier,
  };
}

/**
 * Enrich a RawEvent with curation scores for transformation to IRLEvent
 */
export function enrichWithCurationScores(
  event: RawEvent,
  now: Date = new Date()
): RawEvent & {
  completenessScore: number;
  freshnessScore: number;
  trustTier: TrustTier;
  indoorOutdoor: IndoorOutdoor;
} {
  const { completenessScore, freshnessScore, trustTier } = computeCurationScore(event, now);
  const indoorOutdoor = inferIndoorOutdoor(event);

  return {
    ...event,
    completenessScore,
    freshnessScore,
    trustTier,
    indoorOutdoor,
  };
}

/**
 * Filter suppressed events based on quality thresholds
 *
 * Events below minimum thresholds should be filtered out of the feed
 */
export function shouldSuppressEvent(
  event: RawEvent | IRLEvent,
  options: {
    minCompleteness?: number;
    minFreshness?: number;
    requireImage?: boolean;
    requireCoordinates?: boolean;
  } = {}
): { suppress: boolean; reasons: string[] } {
  const {
    minCompleteness = 30,
    minFreshness = 10,
    requireImage = false,
    requireCoordinates = true,
  } = options;

  const reasons: string[] = [];
  const { completenessScore, freshnessScore } = computeCurationScore(event);

  if (completenessScore < minCompleteness) {
    reasons.push(`Low completeness: ${completenessScore}% (min: ${minCompleteness}%)`);
  }

  if (freshnessScore < minFreshness) {
    reasons.push(`Low freshness: ${freshnessScore}% (min: ${minFreshness}%)`);
  }

  if (requireImage && !event.image) {
    reasons.push('Missing image');
  }

  if (requireCoordinates && (!event.lat || !event.lng)) {
    reasons.push('Missing coordinates');
  }

  // Title quality checks
  if (event.title.length < 5) {
    reasons.push('Title too short');
  }

  // Description quality checks
  if (!event.description || event.description.length < 10) {
    reasons.push('Missing or short description');
  }

  return {
    suppress: reasons.length > 0,
    reasons,
  };
}
