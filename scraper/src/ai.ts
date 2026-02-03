/**
 * AI Service for Scraper
 * Generates editorial content using Claude
 */

import Anthropic from '@anthropic-ai/sdk';
import type { RawEvent } from './types.js';

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

/**
 * Generate a short editorial hook for an event
 */
export async function generateShortWhy(event: RawEvent): Promise<string | null> {
  const client = getClient();
  if (!client) return null;

  const prompt = `Generate a short, punchy editorial hook (10-15 words max) for this event. It should make someone want to attend. Be specific to the event, not generic. No quotes around the response.

Event: ${event.title}
Category: ${event.category}
Venue: ${event.venueName || 'Unknown'}
Neighborhood: ${event.neighborhood}
City: ${event.city}
Tags: ${event.tags.join(', ')}
Price: ${event.priceLabel || 'Varies'}
Description: ${event.description.slice(0, 300)}

Just the hook, nothing else:`;

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 50,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = response.content[0];
    if (content.type !== 'text') return null;

    return content.text.trim().replace(/^["']|["']$/g, '');
  } catch (error) {
    console.error('AI shortWhy generation failed:', error);
    return null;
  }
}

/**
 * Generate editorial description for an event
 */
export async function generateEditorialWhy(event: RawEvent): Promise<string | null> {
  const client = getClient();
  if (!client) return null;

  const prompt = `Write a compelling 2-3 sentence editorial description for this event. Make it personal and enticing, like a friend recommending it. Focus on what makes it special and why someone should go. Don't repeat the title or basic info - add value beyond the description.

Event: ${event.title}
Category: ${event.category}
Venue: ${event.venueName || 'Unknown'}
Neighborhood: ${event.neighborhood}
City: ${event.city}
Tags: ${event.tags.join(', ')}
Price: ${event.priceLabel || 'Varies'}
Is Outdoor: ${event.isOutdoor ? 'Yes' : 'No'}
Original Description: ${event.description.slice(0, 500)}

Editorial description (2-3 sentences only):`;

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 150,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = response.content[0];
    if (content.type !== 'text') return null;

    return content.text.trim();
  } catch (error) {
    console.error('AI editorialWhy generation failed:', error);
    return null;
  }
}

/**
 * Batch generate editorial content for multiple events
 * Uses rate limiting to avoid API limits
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

  console.log(`\n🤖 Generating AI editorial content for ${events.length} events...`);

  for (let i = 0; i < events.length; i += batchSize) {
    const batch = events.slice(i, i + batchSize);

    // Process batch in parallel
    const batchResults = await Promise.all(
      batch.map(async (event) => {
        const eventKey = `${event.title}|${event.startAt}`;

        const [shortWhy, editorialWhy] = await Promise.all([
          generateShortWhy(event),
          generateEditorialWhy(event),
        ]);

        return {
          key: eventKey,
          shortWhy: shortWhy || '',
          editorialWhy: editorialWhy || '',
        };
      })
    );

    // Store results
    for (const result of batchResults) {
      if (result.shortWhy || result.editorialWhy) {
        results.set(result.key, {
          shortWhy: result.shortWhy,
          editorialWhy: result.editorialWhy,
        });
      }
    }

    // Progress update
    const processed = Math.min(i + batchSize, events.length);
    console.log(`   📝 Processed ${processed}/${events.length} events`);

    // Rate limiting delay between batches
    if (i + batchSize < events.length) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  console.log(`   ✅ Generated content for ${results.size} events\n`);
  return results;
}
