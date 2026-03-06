/**
 * Editorial Voice Agent (Yourcast)
 *
 * Generates weekly Yourcast editorial content using Claude.
 * Runs on schedule (Thursday morning) or on-demand.
 *
 * Features:
 * - Weather-aware editorial framing
 * - Caches output in localStorage with 6-hour TTL
 * - Graceful fallback when API unavailable
 */

import Anthropic from '@anthropic-ai/sdk';
import {
  EDITORIAL_SYSTEM_PROMPT,
  type YourcastEditorial,
  type EditorialInput,
} from './prompts/editorial';
import type { Event } from '../types';

const CACHE_KEY = 'yourcast_editorial';
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

interface CachedEditorial {
  data: YourcastEditorial;
  cachedAt: number;
  weekOf: string;
}

/**
 * Get cached editorial if valid
 */
export function getCachedEditorial(): YourcastEditorial | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;

    const parsed: CachedEditorial = JSON.parse(cached);
    const now = Date.now();

    // Check TTL
    if (now - parsed.cachedAt > CACHE_TTL_MS) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }

    // Check if it's for the current week
    const currentWeek = getCurrentWeekOf();
    if (parsed.weekOf !== currentWeek) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }

    return parsed.data;
  } catch {
    return null;
  }
}

/**
 * Cache editorial content
 */
function cacheEditorial(data: YourcastEditorial, weekOf: string): void {
  try {
    const cached: CachedEditorial = {
      data,
      cachedAt: Date.now(),
      weekOf,
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cached));
  } catch {
    // localStorage might be full or unavailable
    console.warn('Failed to cache editorial');
  }
}

/**
 * Get the week identifier for caching
 */
function getCurrentWeekOf(): string {
  const now = new Date();
  // Get the Friday of this week
  const dayOfWeek = now.getDay();
  const daysUntilFriday = (5 - dayOfWeek + 7) % 7;
  const friday = new Date(now);
  friday.setDate(now.getDate() + daysUntilFriday);

  return friday.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Build the user prompt from input data
 */
function buildUserPrompt(input: EditorialInput): string {
  const eventSummaries = input.events
    .map(
      (e, i) =>
        `${i + 1}. "${e.title}" at ${e.venueName || 'TBA'} (${e.neighborhood})
   Category: ${e.category}
   Date: ${new Date(e.startAt).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
   Outdoor: ${e.isOutdoor ? 'Yes' : 'No'}
   Description: ${e.description.slice(0, 200)}...`
    )
    .join('\n\n');

  return `Generate the Yourcast editorial for ${input.city} for the week of ${input.week_of}.

WEATHER FORECAST:
- Friday: ${input.weather.friday.condition}, High ${input.weather.friday.high}°F, Low ${input.weather.friday.low}°F
- Saturday: ${input.weather.saturday.condition}, High ${input.weather.saturday.high}°F, Low ${input.weather.saturday.low}°F
- Sunday: ${input.weather.sunday.condition}, High ${input.weather.sunday.high}°F, Low ${input.weather.sunday.low}°F

${input.cultural_moment ? `CULTURAL MOMENT: ${input.cultural_moment}\n` : ''}
SELECTED EVENTS (${input.events.length} total):

${eventSummaries}

The first event listed is the LEAD event. One of the others should be framed as the "wild card" — an unexpected pick.

Return JSON only, no markdown.`;
}

/**
 * Generate editorial content using Claude
 */
export async function generateEditorial(
  input: EditorialInput
): Promise<YourcastEditorial> {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;

  if (!apiKey) {
    console.warn('VITE_ANTHROPIC_API_KEY not set, using fallback editorial');
    return getFallbackEditorial(input);
  }

  try {
    const client = new Anthropic({
      apiKey,
      dangerouslyAllowBrowser: true,
    });

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: EDITORIAL_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: buildUserPrompt(input),
        },
      ],
    });

    // Extract text content
    const textContent = response.content.find((c) => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text content in response');
    }

    // Parse JSON response
    const editorial: YourcastEditorial = JSON.parse(textContent.text);

    // Cache the result
    cacheEditorial(editorial, input.week_of);

    return editorial;
  } catch (error) {
    console.error('Editorial agent error:', error);
    return getFallbackEditorial(input);
  }
}

/**
 * Fallback editorial when API is unavailable
 */
function getFallbackEditorial(input: EditorialInput): YourcastEditorial {
  const isGoodWeather =
    input.weather.saturday.condition.toLowerCase().includes('sun') ||
    input.weather.saturday.condition.toLowerCase().includes('clear');

  const leadEvent = input.events[0];
  const theme = isGoodWeather ? 'sunny_weekend' : 'mixed';

  return {
    headline: isGoodWeather
      ? 'A good week to be outside.'
      : 'Worth leaving the house for.',
    subheadline: `This weekend in ${input.city} brings ${input.events.length} things we think are worth your time. Here are the ones we would actually go to.`,
    lead_event_context: leadEvent
      ? `${leadEvent.title} at ${leadEvent.venueName || 'a venue we like'} in ${leadEvent.neighborhood} is where we would start. The kind of thing that sets the tone for a weekend.`
      : 'Check back soon for our picks.',
    wild_card_line:
      input.events.length > 2
        ? `The ${input.events[2]?.title || 'third pick'} made the list because sometimes the best things are the ones you almost skip.`
        : 'Sometimes the best finds are the unexpected ones.',
    nudge_copy: `${input.city} this weekend: ${input.events.length} things worth your time`,
    newsletter_subject: `Your Forecast · ${input.week_of} · ${input.city}`,
    yourcast_theme: theme,
  };
}

/**
 * Get or generate editorial for the current week
 */
export async function getYourcastEditorial(
  events: Event[],
  weather?: EditorialInput['weather'],
  culturalMoment?: string | null
): Promise<YourcastEditorial> {
  // Check cache first
  const cached = getCachedEditorial();
  if (cached) {
    return cached;
  }

  // Build input
  const weekOf = getCurrentWeekOf();
  const input: EditorialInput = {
    events: events.slice(0, 8).map((e) => ({
      title: e.title,
      venueName: e.venueName,
      neighborhood: e.neighborhood,
      category: e.category,
      startAt: e.startAt,
      description: e.description,
      isOutdoor: e.isOutdoor,
    })),
    weather: weather || {
      friday: { condition: 'Partly Cloudy', high: 82, low: 72 },
      saturday: { condition: 'Sunny', high: 84, low: 73 },
      sunday: { condition: 'Sunny', high: 83, low: 72 },
    },
    week_of: weekOf,
    city: 'Miami',
    cultural_moment: culturalMoment || null,
  };

  return generateEditorial(input);
}

/**
 * Clear cached editorial (useful for testing or forcing refresh)
 */
export function clearEditorialCache(): void {
  localStorage.removeItem(CACHE_KEY);
}
