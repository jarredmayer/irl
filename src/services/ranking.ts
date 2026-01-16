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

export function scoreEvent(event: Event, context: RankingContext): ScoredEvent {
  const timeScore = computeTimeScore(event.startAt, context.now);
  const { distanceScore, distanceMiles } = computeDistanceScore(
    event,
    context.location
  );
  const tasteScore = computeTasteScore(event.tags, context.preferences);
  const weatherScore = computeWeatherScore(event, context.weather);
  const editorBoost = event.editorPick ? EDITOR_PICK_BOOST : 0;

  const score =
    timeScore + distanceScore + tasteScore + weatherScore + editorBoost;

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
