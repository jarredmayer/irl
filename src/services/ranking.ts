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

export function scoreEvent(event: Event, context: RankingContext): ScoredEvent {
  const timeScore = computeTimeScore(event.startAt, context.now);
  const { distanceScore, distanceMiles } = computeDistanceScore(
    event,
    context.location
  );
  const tasteScore = computeTasteScore(event.tags, context.preferences);
  const weatherScore = computeWeatherScore(event, context.weather);
  const editorBoost = event.editorPick ? EDITOR_PICK_BOOST : 0;
  const hiddenGemScore = computeHiddenGemScore(event);

  const score =
    timeScore + distanceScore + tasteScore + weatherScore + editorBoost + hiddenGemScore;

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

export function rankEvents(
  events: Event[],
  context: RankingContext
): ScoredEvent[] {
  const scored = events.map((event) => scoreEvent(event, context));
  return scored.sort((a, b) => b.score - a.score);
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
