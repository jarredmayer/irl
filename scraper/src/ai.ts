/**
 * AI Service for Scraper
 * Generates editorial content using Claude
 *
 * Editorial results are cached for 7 days.
 * Recurring events (same title+category+venue) are never regenerated until stale.
 */

import Anthropic from '@anthropic-ai/sdk';
import type { RawEvent } from './types.js';
import { PersistentCache, cacheKey } from './agents/cache.js';

// Get API key from environment
const API_KEY = process.env.ANTHROPIC_API_KEY;

let client: Anthropic | null = null;

function getClient(): Anthropic | null {
  if (!API_KEY) return null;
  if (!client) {
    client = new Anthropic({ apiKey: API_KEY });
  }
  return client;
}

export function hasAIEnabled(): boolean {
  return !!API_KEY;
}

// 7-day cache — editorial copy for recurring events doesn't change
const editorialCache = new PersistentCache<{ shortWhy: string; editorialWhy: string }>(
  'editorial.json',
  7
);

/** Cache key for an event — title+category+venue, NOT date (for recurring events) */
function editorialCacheKey(event: RawEvent): string {
  return cacheKey(event.title, event.category, event.venueName ?? event.neighborhood ?? '');
}

/**
 * Generate a short editorial hook for an event
 */
async function generateShortWhy(event: RawEvent): Promise<string | null> {
  const c = getClient();
  if (!c) return null;

  try {
    const response = await c.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 60,
      messages: [{
        role: 'user',
        content: `Write a punchy 10-15 word hook for this event that makes someone want to go. Be specific, not generic. No quotes.

Event: ${event.title}
Category: ${event.category}
Venue: ${event.venueName || 'Unknown'} (${event.neighborhood}, ${event.city})
Price: ${event.priceLabel || 'Varies'}
Tags: ${event.tags.join(', ')}
Description: ${event.description.slice(0, 200)}

Hook only:`,
      }],
    });
    const content = response.content[0];
    if (content.type !== 'text') return null;
    return content.text.trim().replace(/^["']|["']$/g, '');
  } catch {
    return null;
  }
}

/**
 * Generate editorial description for an event
 */
async function generateEditorialWhy(event: RawEvent): Promise<string | null> {
  const c = getClient();
  if (!c) return null;

  try {
    const response = await c.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 150,
      messages: [{
        role: 'user',
        content: `Write a 2-3 sentence editorial description for this event. Sound like a knowledgeable local friend recommending it. Don't restate the title — add value.

Event: ${event.title}
Category: ${event.category}
Venue: ${event.venueName || 'Unknown'} (${event.neighborhood}, ${event.city})
Price: ${event.priceLabel || 'Varies'}
Outdoor: ${event.isOutdoor ? 'Yes' : 'No'}
Description: ${event.description.slice(0, 400)}

2-3 sentences only:`,
      }],
    });
    const content = response.content[0];
    if (content.type !== 'text') return null;
    return content.text.trim();
  } catch {
    return null;
  }
}

/**
 * Batch generate editorial content for multiple events.
 * Checks cache first — only calls the API for events with no cached copy.
 */
export async function batchGenerateEditorial(
  events: RawEvent[],
  options: { batchSize?: number; delayMs?: number } = {}
): Promise<Map<string, { shortWhy: string; editorialWhy: string }>> {
  const { batchSize = 10, delayMs = 500 } = options;
  const results = new Map<string, { shortWhy: string; editorialWhy: string }>();

  if (!hasAIEnabled()) {
    console.log('⚠️  AI not enabled - skipping editorial generation');
    return results;
  }

  // Separate cached from uncached
  const uncached: RawEvent[] = [];
  let cacheHits = 0;

  for (const event of events) {
    const key = editorialCacheKey(event);
    const eventKey = `${event.title}|${event.startAt}`;
    const cached = editorialCache.get(key);
    if (cached) {
      results.set(eventKey, cached);
      cacheHits++;
    } else {
      uncached.push(event);
    }
  }

  const cacheStats = editorialCache.stats();
  console.log(`\n🤖 Editorial: ${cacheHits} cached, ${uncached.length} to generate`);
  console.log(`   Cache: ${cacheStats.valid} valid entries`);

  if (uncached.length === 0) {
    console.log('   ✅ All editorial content served from cache');
    return results;
  }

  // Use Haiku for cost efficiency on batch generation
  for (let i = 0; i < uncached.length; i += batchSize) {
    const batch = uncached.slice(i, i + batchSize);

    const batchResults = await Promise.all(
      batch.map(async (event) => {
        const [shortWhy, editorialWhy] = await Promise.all([
          generateShortWhy(event),
          generateEditorialWhy(event),
        ]);
        return { event, shortWhy: shortWhy || '', editorialWhy: editorialWhy || '' };
      })
    );

    for (const { event, shortWhy, editorialWhy } of batchResults) {
      if (shortWhy || editorialWhy) {
        const content = { shortWhy, editorialWhy };
        const eventKey = `${event.title}|${event.startAt}`;
        results.set(eventKey, content);
        // Cache by title+category+venue (not date) so recurring events reuse
        editorialCache.set(editorialCacheKey(event), content);
      }
    }

    const processed = Math.min(i + batchSize, uncached.length);
    console.log(`   📝 Generated ${processed}/${uncached.length}`);

    if (i + batchSize < uncached.length) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  // Persist cache after all generation
  editorialCache.flush();
  console.log(`   ✅ Editorial done: ${results.size} total (${cacheHits} cached, ${uncached.length} new)\n`);
  return results;
}
