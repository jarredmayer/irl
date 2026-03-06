import { parseISO, differenceInHours } from 'date-fns';
import { haversineDistance } from '../utils/distance';
import { willRainAtTime } from './weather';
import type {
  Event,
  RankingContext,
  ScoredEvent,
  UserLocation,
  UserPreferences,
  WeatherForecast,
} from '../types';

const MAX_TIME_SCORE = 40;
const MAX_DISTANCE_SCORE = 25;
const MAX_TASTE_SCORE = 20;
const EDITOR_PICK_BOOST = 10;
const WEATHER_PENALTY = -10;
const WEATHER_BOOST = 5;
const HIDDEN_GEM_BOOST = 8;
const GENERIC_EVENT_PENALTY = -20;
const RECENCY_BOOST = 5;
const RECENCY_FULL_BOOST_HOURS = 48;
const RECENCY_DECAY_DAYS = 7;
const CATEGORY_DIVERSITY_THRESHOLD = 0.20;
const CATEGORY_DIVERSITY_PENALTY = -3;

// Patterns that indicate generic/filler events
const GENERIC_TITLE_PATTERNS = [
  /^happy hour at /i,
  /^brunch at /i,
  /^live music at /i,
  /^sunset at /i,
  /^yoga at /i,
  /^beach volleyball at /i,
  /^swimming at /i,
  /^dinner at /i,
  /^lunch at /i,
  /^drinks at /i,
  /^cocktails at /i,
];

// Keywords that make a generic title more specific/unique
const UNIQUENESS_KEYWORDS = [
  'special', 'themed', 'featuring', 'presents', 'with', 'live', 'dj',
  'guest', 'limited', 'pop-up', 'festival', 'party', 'night', 'day',
  'bottomless', 'unlimited', 'tasting', 'pairing', 'class', 'workshop',
  'lesson', 'competition', 'tournament', 'championship', 'vs',
];

// Mainstream venues that are well-known (reduce hidden gem score)
const MAINSTREAM_VENUES = [
  'E11EVEN',
  'LIV',
  'Fillmore',
  'Kaseya Center',
  'Hard Rock Stadium',
  'Arsht Center',
  'Faena',
  'Fontainebleau',
];

// Neighborhoods with authentic local character
const LOCAL_NEIGHBORHOODS = [
  'Little Havana',
  'Little Haiti',
  'Allapattah',
  'Little River',
  'Hialeah',
  'Overtown',
  'Liberty City',
  'Palmetto Bay',
];

/**
 * Time-of-day relevance mappings.
 * Each time slot defines category boosts/penalties so that events feel contextually
 * appropriate — e.g., nightlife shouldn't dominate morning feeds.
 * Values are capped at +/- 5 to remain a subtle influence rather than a dominant factor.
 */
const TIME_OF_DAY_BOOSTS: Record<string, Record<string, number>> = {
  morning: {
    fitness: 5, wellness: 5, community: 5,
    nightlife: -5,
  },
  afternoon: {
    'food & drink': 3, food: 3, art: 3, culture: 3,
  },
  evening: {
    'food & drink': 3, food: 3, music: 3, comedy: 3,
    nightlife: 3,
  },
  night: {
    nightlife: 5, music: 5,
    fitness: -5, wellness: -5,
  },
};

/**
 * Determine time-of-day slot from a Date.
 * morning: 6am–12pm, afternoon: 12pm–5pm, evening: 5pm–9pm, night: 9pm–2am (wraps).
 */
function getTimeSlot(now: Date): string {
  const hour = now.getHours();
  if (hour >= 6 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  // 9pm–2am (21–23 and 0–1)
  return 'night';
}

export function scoreEvent(event: Event, context: RankingContext): ScoredEvent {
  const timeScore = computeTimeScore(event.startAt, context.now);
  const { distanceScore, distanceMiles } = computeDistanceScore(
    event,
    context.location
  );
  const tasteScore = computeTasteScore(event.tags, context.preferences);
  const weatherScore = computeWeatherScore(event, context.weather);
  const editorBoost = computeEditorPickBoost(event, context.allEvents);
  const hiddenGemScore = computeHiddenGemScore(event);
  const genericPenalty = computeGenericEventPenalty(event);
  const recencyBoost = computeRecencyBoost(event, context.now);
  const timeOfDayScore = computeTimeOfDayScore(event, context.now);
  const diversityPenalty = computeCategoryDiversityPenalty(event, context.allEvents);

  const score =
    timeScore + distanceScore + tasteScore + weatherScore + editorBoost +
    hiddenGemScore + genericPenalty + recencyBoost + timeOfDayScore + diversityPenalty;

  return {
    ...event,
    score,
    distanceMiles,
  };
}

export function computeTimeScore(startAt: string, now: Date): number {
  const eventDate = parseISO(startAt);
  const hoursUntil = differenceInHours(eventDate, now);

  if (hoursUntil < 0) {
    // Event has started or passed
    return 0;
  }

  if (hoursUntil <= 6) {
    // Events starting in next 6 hours get max score
    return MAX_TIME_SCORE;
  }

  if (hoursUntil <= 24) {
    // Events today/tomorrow get high score
    return MAX_TIME_SCORE * 0.8;
  }

  if (hoursUntil <= 72) {
    // Events in next 3 days
    return MAX_TIME_SCORE * 0.6;
  }

  if (hoursUntil <= 168) {
    // Events in next week
    return MAX_TIME_SCORE * 0.4;
  }

  // Exponential decay for events further out
  const daysOut = hoursUntil / 24;
  const decay = Math.exp(-daysOut / 7);
  return MAX_TIME_SCORE * 0.2 * decay;
}

export function computeDistanceScore(
  event: Event,
  location?: UserLocation
): { distanceScore: number; distanceMiles?: number } {
  if (!location || event.lat === null || event.lng === null) {
    return { distanceScore: 0 };
  }

  const distanceMiles = haversineDistance(
    location.lat,
    location.lng,
    event.lat,
    event.lng
  );

  // Score inversely proportional to distance
  // 0 miles = 25 points, 10+ miles = 0 points
  if (distanceMiles <= 0.5) {
    return { distanceScore: MAX_DISTANCE_SCORE, distanceMiles };
  }

  if (distanceMiles >= 10) {
    return { distanceScore: 0, distanceMiles };
  }

  const score = MAX_DISTANCE_SCORE * (1 - distanceMiles / 10);
  return { distanceScore: score, distanceMiles };
}

export function computeTasteScore(
  eventTags: string[],
  preferences: UserPreferences
): number {
  if (preferences.tags.length === 0) {
    return 0;
  }

  const matchingTags = eventTags.filter((tag) =>
    preferences.tags.includes(tag)
  );

  // 4 points per matching tag, max 20
  const score = Math.min(matchingTags.length * 4, MAX_TASTE_SCORE);
  return score;
}

export function computeWeatherScore(
  event: Event,
  weather?: WeatherForecast
): number {
  if (!weather || !event.isOutdoor) {
    return 0;
  }

  const willRain = willRainAtTime(weather, event.startAt);

  if (willRain) {
    // Penalize outdoor events if rain expected
    return WEATHER_PENALTY;
  }

  // Boost outdoor events on clear days
  if (weather.current.precipitationProbability < 20) {
    return WEATHER_BOOST;
  }

  return 0;
}

export function computeHiddenGemScore(event: Event): number {
  // Check if venue is mainstream (no boost)
  const venueName = event.venueName?.toLowerCase() || '';
  const isMainstream = MAINSTREAM_VENUES.some(
    (v) => venueName.includes(v.toLowerCase())
  );

  if (isMainstream) {
    return 0;
  }

  // Check if in a local neighborhood (full boost)
  const neighborhood = event.neighborhood?.toLowerCase() || '';
  const isLocalNeighborhood = LOCAL_NEIGHBORHOODS.some(
    (n) => neighborhood.toLowerCase() === n.toLowerCase()
  );

  if (isLocalNeighborhood) {
    return HIDDEN_GEM_BOOST;
  }

  // Check for local-favorite tag
  if (event.tags.includes('local-favorite')) {
    return HIDDEN_GEM_BOOST;
  }

  // Partial boost for free events at non-mainstream venues
  if (event.priceLabel === 'Free') {
    return HIDDEN_GEM_BOOST * 0.5;
  }

  return 0;
}

export function computeGenericEventPenalty(event: Event): number {
  const title = event.title.toLowerCase();
  const description = event.description?.toLowerCase() || '';

  /**
   * Additional generic signals beyond the regex title patterns:
   * - Title equals venue name: likely auto-generated from venue data
   * - Description equals editorialWhy: copy-paste indicator, no real editorial effort
   * - Very short descriptions (<50 chars): insufficient context to be compelling
   */
  const titleMatchesVenue =
    event.venueName != null &&
    event.title.trim().toLowerCase() === event.venueName.trim().toLowerCase();

  const descriptionMatchesEditorial =
    event.editorialWhy &&
    event.description &&
    event.description.trim() === event.editorialWhy.trim();

  const hasVeryShortDescription =
    event.description != null && event.description.trim().length > 0 && event.description.trim().length < 50;

  // If any of the new signals fire, apply full generic penalty
  if (titleMatchesVenue || descriptionMatchesEditorial || hasVeryShortDescription) {
    return GENERIC_EVENT_PENALTY;
  }

  // Check if title matches generic patterns
  const isGenericPattern = GENERIC_TITLE_PATTERNS.some((pattern) =>
    pattern.test(event.title)
  );

  if (!isGenericPattern) {
    return 0; // Not generic, no penalty
  }

  // Check if the title has uniqueness keywords that make it less generic
  const hasUniqueness = UNIQUENESS_KEYWORDS.some((keyword) =>
    title.includes(keyword.toLowerCase())
  );

  if (hasUniqueness) {
    return GENERIC_EVENT_PENALTY * 0.3; // Reduced penalty for themed events
  }

  // Check description for specificity
  const hasSpecificDescription =
    description.length > 100 &&
    UNIQUENESS_KEYWORDS.some((keyword) =>
      description.includes(keyword.toLowerCase())
    );

  if (hasSpecificDescription) {
    return GENERIC_EVENT_PENALTY * 0.5; // Moderate penalty if description adds context
  }

  // Full penalty for truly generic events
  return GENERIC_EVENT_PENALTY;
}

/**
 * Recency boost: keeps the feed feeling fresh by promoting newly added events.
 * Events added in the last 48 hours get the full +5 boost.
 * The boost decays linearly to 0 over 7 days from addedAt.
 * Events without an addedAt field receive no boost.
 */
export function computeRecencyBoost(event: Event, now: Date): number {
  if (!event.addedAt) return 0;

  const addedDate = parseISO(event.addedAt);
  const hoursSinceAdded = differenceInHours(now, addedDate);

  if (hoursSinceAdded < 0) return RECENCY_BOOST; // added in the future (clock skew) — full boost
  if (hoursSinceAdded <= RECENCY_FULL_BOOST_HOURS) return RECENCY_BOOST;

  const daysSinceAdded = hoursSinceAdded / 24;
  if (daysSinceAdded >= RECENCY_DECAY_DAYS) return 0;

  // Linear decay from full boost at 2 days to 0 at 7 days
  const decayRange = RECENCY_DECAY_DAYS - RECENCY_FULL_BOOST_HOURS / 24; // 5 days
  const daysIntoDecay = daysSinceAdded - RECENCY_FULL_BOOST_HOURS / 24;
  return RECENCY_BOOST * (1 - daysIntoDecay / decayRange);
}

/**
 * Time-of-day relevance: applies subtle category boosts/penalties based on the
 * current time of day. For example, nightlife events are penalized in the morning
 * and boosted at night. This prevents contextually inappropriate events from
 * dominating the feed. Max influence is +/- 5 points.
 */
export function computeTimeOfDayScore(event: Event, now: Date): number {
  const slot = getTimeSlot(now);
  const boosts = TIME_OF_DAY_BOOSTS[slot] || {};
  const category = event.category.toLowerCase();

  // Check category directly
  if (boosts[category] !== undefined) {
    return boosts[category];
  }

  // Also check event tags for matching boost categories
  for (const tag of event.tags) {
    const tagLower = tag.toLowerCase();
    if (boosts[tagLower] !== undefined) {
      return boosts[tagLower];
    }
  }

  return 0;
}

/**
 * Category diversity weighting: applies diminishing returns when a single category
 * is over-represented (>20% of total events). This prevents any one category from
 * flooding the feed even before the post-ranking diversity pass.
 * The penalty scales proportionally: at 25% share a category gets -3, at 30% it gets -6, etc.
 */
export function computeCategoryDiversityPenalty(event: Event, allEvents?: Event[]): number {
  if (!allEvents || allEvents.length === 0) return 0;

  const total = allEvents.length;
  const categoryCount = allEvents.filter((e) => e.category === event.category).length;
  const proportion = categoryCount / total;

  if (proportion <= CATEGORY_DIVERSITY_THRESHOLD) return 0;

  // Scale penalty proportionally to how far over the threshold
  // Every 5% over threshold = CATEGORY_DIVERSITY_PENALTY (-3)
  const excess = proportion - CATEGORY_DIVERSITY_THRESHOLD;
  return (excess / 0.05) * CATEGORY_DIVERSITY_PENALTY;
}

/**
 * Editor pick boost that scales down when editor picks are over-represented.
 * When editorPick events are <20% of total, the full boost applies.
 * When >20%, the boost is reduced proportionally so that editorial curation
 * doesn't overwhelm organic ranking signals.
 */
export function computeEditorPickBoost(event: Event, allEvents?: Event[]): number {
  if (!event.editorPick) return 0;

  if (!allEvents || allEvents.length === 0) return EDITOR_PICK_BOOST;

  const total = allEvents.length;
  const pickCount = allEvents.filter((e) => e.editorPick).length;
  const pickProportion = pickCount / total;

  if (pickProportion <= 0.20) return EDITOR_PICK_BOOST;

  // Reduce boost proportionally: at 40% picks, boost is halved; at 100% it's ~20% of original
  const scale = 0.20 / pickProportion;
  return EDITOR_PICK_BOOST * scale;
}

export function rankEvents(
  events: Event[],
  context: RankingContext
): ScoredEvent[] {
  // Inject full event list into context for proportion-based scoring
  const enrichedContext = { ...context, allEvents: context.allEvents ?? events };
  const scored = events.map((event) => scoreEvent(event, enrichedContext));
  const sorted = scored.sort((a, b) => b.score - a.score);
  return diversifyFeed(sorted);
}

/**
 * Post-ranking feed diversity pass.
 * Prevents category/venue monotony by limiting consecutive same-category events
 * and applying diminishing returns for repeated series/venues.
 *
 * Rules:
 *  - No more than 2 consecutive events from the same category
 *  - 3rd+ occurrence of same seriesId/venueId in a window gets pushed down
 *  - Guarantees an editorPick in the first 5 items if one exists
 */
function diversifyFeed(events: ScoredEvent[]): ScoredEvent[] {
  if (events.length <= 5) return events;

  const result: ScoredEvent[] = [];
  const deferred: ScoredEvent[] = [];
  const categoryCounts = new Map<string, number>();
  const recentCategories: string[] = []; // sliding window of last 2

  // Pass 1: Build the diversified feed
  for (const event of events) {
    const cat = event.category;
    const consecCount = recentCategories.filter((c) => c === cat).length;

    // Allow max 2 consecutive same-category events
    if (consecCount >= 2) {
      deferred.push(event);
      continue;
    }

    // Track series/venue saturation (3+ of same series in top 30 = defer)
    if (result.length < 30 && event.seriesId) {
      const seriesCount = result.filter((e) => e.seriesId === event.seriesId).length;
      if (seriesCount >= 3) {
        deferred.push(event);
        continue;
      }
    }

    result.push(event);
    recentCategories.push(cat);
    if (recentCategories.length > 2) recentCategories.shift();
    categoryCounts.set(cat, (categoryCounts.get(cat) || 0) + 1);
  }

  // Append deferred events at the end (maintain relative score order)
  result.push(...deferred);

  // Pass 2: Ensure an editorPick is in the first 5 positions
  const firstPickIdx = result.findIndex((e) => e.editorPick);
  if (firstPickIdx > 4 && firstPickIdx < result.length) {
    const [pick] = result.splice(firstPickIdx, 1);
    // Insert at position 1 (after the top-scoring event)
    result.splice(1, 0, pick);
  }

  return result;
}

export function filterByDistance(
  events: ScoredEvent[],
  maxMiles: number
): ScoredEvent[] {
  return events.filter((event) => {
    if (event.distanceMiles === undefined) {
      // Include events without distance (no location permission)
      return true;
    }
    return event.distanceMiles <= maxMiles;
  });
}

/**
 * Compute similarity score between two events
 */
export function computeSimilarityScore(eventA: Event, eventB: Event): number {
  if (eventA.id === eventB.id) {
    return 0; // Don't recommend the same event
  }

  let score = 0;

  // Tag overlap (up to 30 points)
  const sharedTags = eventA.tags.filter((tag) => eventB.tags.includes(tag));
  score += Math.min(sharedTags.length * 10, 30);

  // Same category (20 points)
  if (eventA.category === eventB.category) {
    score += 20;
  }

  // Same neighborhood (15 points)
  if (eventA.neighborhood && eventB.neighborhood) {
    if (eventA.neighborhood.toLowerCase() === eventB.neighborhood.toLowerCase()) {
      score += 15;
    }
  }

  // Similar time of day (10 points)
  const hourA = parseInt(eventA.startAt.slice(11, 13), 10);
  const hourB = parseInt(eventB.startAt.slice(11, 13), 10);
  if (Math.abs(hourA - hourB) <= 2) {
    score += 10;
  }

  // Same price range (5 points)
  if (eventA.priceLabel === eventB.priceLabel) {
    score += 5;
  }

  // Both indoor or both outdoor (5 points)
  if (eventA.isOutdoor === eventB.isOutdoor) {
    score += 5;
  }

  return score;
}

/**
 * Find events similar to a given event
 */
export function findSimilarEvents(
  targetEvent: Event,
  allEvents: Event[],
  limit: number = 5
): Event[] {
  const now = new Date();

  // Filter to future events only
  const futureEvents = allEvents.filter((event) => {
    const eventDate = parseISO(event.startAt);
    return eventDate > now;
  });

  // Score all events by similarity
  const scored = futureEvents.map((event) => ({
    event,
    similarityScore: computeSimilarityScore(targetEvent, event),
  }));

  // Sort by similarity and return top N
  return scored
    .filter((s) => s.similarityScore > 0)
    .sort((a, b) => b.similarityScore - a.similarityScore)
    .slice(0, limit)
    .map((s) => s.event);
}

/**
 * Find events similar to a list of saved events
 * Useful for "Because you saved X" recommendations
 */
export function findRecommendationsFromSaved(
  savedEvents: Event[],
  allEvents: Event[],
  limit: number = 10
): { event: Event; reason: string }[] {
  const now = new Date();
  const savedIds = new Set(savedEvents.map((e) => e.id));

  // Filter to future events that aren't already saved
  const candidates = allEvents.filter((event) => {
    const eventDate = parseISO(event.startAt);
    return eventDate > now && !savedIds.has(event.id);
  });

  // Score each candidate against all saved events
  const recommendations: Map<string, { event: Event; score: number; reason: string }> = new Map();

  for (const savedEvent of savedEvents) {
    for (const candidate of candidates) {
      const score = computeSimilarityScore(savedEvent, candidate);
      if (score > 20) {
        // Only consider if similarity is meaningful
        const existing = recommendations.get(candidate.id);
        if (!existing || score > existing.score) {
          recommendations.set(candidate.id, {
            event: candidate,
            score,
            reason: `Similar to "${savedEvent.title}"`,
          });
        }
      }
    }
  }

  // Sort by score and return top recommendations
  return Array.from(recommendations.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ event, reason }) => ({ event, reason }));
}
