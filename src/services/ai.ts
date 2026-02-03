/**
 * AI Service
 * Handles natural language search, chat assistant, and AI-powered features
 */

import Anthropic from '@anthropic-ai/sdk';
import type { Event, FilterState } from '../types';
import { CATEGORIES, TAGS, NEIGHBORHOODS } from '../constants';

// API key management
const API_KEY_STORAGE_KEY = 'irl_anthropic_api_key';

export function getApiKey(): string | null {
  return localStorage.getItem(API_KEY_STORAGE_KEY);
}

export function setApiKey(key: string): void {
  localStorage.setItem(API_KEY_STORAGE_KEY, key);
}

export function clearApiKey(): void {
  localStorage.removeItem(API_KEY_STORAGE_KEY);
}

export function hasApiKey(): boolean {
  return !!getApiKey();
}

// Create client instance
function getClient(): Anthropic | null {
  const apiKey = getApiKey();
  if (!apiKey) return null;

  return new Anthropic({
    apiKey,
    dangerouslyAllowBrowser: true, // Required for client-side usage
  });
}

/**
 * Parse natural language search query into structured filters
 */
export interface ParsedSearchQuery {
  filters: Partial<FilterState>;
  searchTerms: string[];
  interpretation: string;
}

export async function parseNaturalLanguageSearch(
  query: string
): Promise<ParsedSearchQuery | null> {
  const client = getClient();
  if (!client) return null;

  const systemPrompt = `You are a search query parser for an events app in Miami/Fort Lauderdale.
Parse the user's natural language query into structured filters.

Available categories: ${CATEGORIES.join(', ')}
Available tags: ${TAGS.join(', ')}
Available neighborhoods (Miami): ${NEIGHBORHOODS.Miami.join(', ')}
Available neighborhoods (Fort Lauderdale): ${NEIGHBORHOODS['Fort Lauderdale'].join(', ')}

Time filters: "tonight", "tomorrow", "this-weekend", "this-week", "all"
Cities: "Miami", "Fort Lauderdale"

Respond with JSON only, no markdown:
{
  "filters": {
    "timeFilter": "tonight" | "tomorrow" | "this-weekend" | "this-week" | "all",
    "selectedCategories": ["category1"],
    "selectedTags": ["tag1", "tag2"],
    "selectedNeighborhoods": ["neighborhood1"],
    "city": "Miami" | "Fort Lauderdale" | null,
    "freeOnly": true | false,
    "nearMeOnly": true | false
  },
  "searchTerms": ["specific", "terms", "to", "search"],
  "interpretation": "Brief explanation of how you interpreted the query"
}

Only include filter fields that are relevant to the query. If the query mentions "near me", "nearby", or "close", set nearMeOnly to true.`;

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      messages: [
        { role: 'user', content: query }
      ],
      system: systemPrompt,
    });

    const content = response.content[0];
    if (content.type !== 'text') return null;

    const parsed = JSON.parse(content.text);
    return parsed as ParsedSearchQuery;
  } catch (error) {
    console.error('Failed to parse search query:', error);
    return null;
  }
}

/**
 * Chat assistant for event recommendations
 */
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function chat(
  messages: ChatMessage[],
  events: Event[],
  context?: {
    userLocation?: { lat: number; lng: number } | null;
    savedEventIds?: string[];
    preferences?: { tags: string[] };
  }
): Promise<string | null> {
  const client = getClient();
  if (!client) return null;

  // Build context about available events
  const tonight = events.filter(e => {
    const date = new Date(e.startAt);
    const now = new Date();
    return date.toDateString() === now.toDateString();
  }).slice(0, 20);

  const tomorrow = events.filter(e => {
    const date = new Date(e.startAt);
    const tom = new Date();
    tom.setDate(tom.getDate() + 1);
    return date.toDateString() === tom.toDateString();
  }).slice(0, 20);

  const thisWeekend = events.filter(e => {
    const date = new Date(e.startAt);
    const day = date.getDay();
    const now = new Date();
    const daysUntil = Math.floor((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntil <= 7 && (day === 0 || day === 6);
  }).slice(0, 20);

  const eventContext = `
EVENTS HAPPENING TONIGHT (${tonight.length}):
${tonight.map(e => `- "${e.title}" at ${e.venueName || e.neighborhood}, ${new Date(e.startAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} - ${e.category} - ${e.priceLabel || 'Price varies'} - Tags: ${e.tags.join(', ')}`).join('\n')}

EVENTS TOMORROW (${tomorrow.length}):
${tomorrow.map(e => `- "${e.title}" at ${e.venueName || e.neighborhood}, ${new Date(e.startAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} - ${e.category} - ${e.priceLabel || 'Price varies'}`).join('\n')}

THIS WEEKEND (${thisWeekend.length}):
${thisWeekend.map(e => `- "${e.title}" at ${e.venueName || e.neighborhood}, ${new Date(e.startAt).toLocaleDateString('en-US', { weekday: 'short' })} ${new Date(e.startAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} - ${e.category}`).join('\n')}
`;

  const userContext = context?.preferences?.tags?.length
    ? `\nUser interests: ${context.preferences.tags.join(', ')}`
    : '';

  const systemPrompt = `You are a friendly local guide for Miami and Fort Lauderdale events. You help people discover things to do based on their interests and questions.

${eventContext}
${userContext}

Guidelines:
- Be conversational and enthusiastic but concise
- Recommend specific events from the list above when relevant
- If asked about something not in the events, say you don't have info on that specific thing but suggest alternatives
- For "what should I do" questions, give 2-3 specific recommendations with brief reasons
- Include practical details like time and location
- Keep responses under 200 words unless more detail is requested`;

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
      system: systemPrompt,
    });

    const content = response.content[0];
    if (content.type !== 'text') return null;

    return content.text;
  } catch (error) {
    console.error('Chat error:', error);
    return null;
  }
}

/**
 * Generate a personalized "why you'll love this" blurb
 */
export async function generateEventBlurb(
  event: Event,
  userTags: string[]
): Promise<string | null> {
  const client = getClient();
  if (!client) return null;

  const matchingTags = event.tags.filter(t => userTags.includes(t));

  const prompt = `Generate a single compelling sentence (under 15 words) about why someone interested in ${matchingTags.length ? matchingTags.join(', ') : 'local events'} would enjoy this event:

Event: ${event.title}
Venue: ${event.venueName || event.neighborhood}
Category: ${event.category}
Tags: ${event.tags.join(', ')}
Description: ${event.description.slice(0, 200)}

Just the sentence, no quotes or extra text.`;

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 50,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = response.content[0];
    if (content.type !== 'text') return null;

    return content.text.trim();
  } catch (error) {
    console.error('Failed to generate blurb:', error);
    return null;
  }
}
