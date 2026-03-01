/**
 * UXAgent
 *
 * Generates shortWhy and editorialWhy for events with missing or generic copy.
 * Replaces batchGenerateEditorial() in ai.ts with a proper agent interface.
 *
 * Voice: knowledgeable local — warm, opinionated, specific. Never generic.
 * shortWhy:     1 punchy sentence, max 12 words. A reason to stop scrolling.
 * editorialWhy: 2–3 sentences. The cultural story — neighborhood, crowd, context.
 *
 * Only updates events with empty or obviously generic copy.
 * Batches 10 events per call. Uses Sonnet for copy quality.
 * Caching: 14-day TTL keyed by event ID — recurring events reuse generated copy
 */

import { BaseAgent, type AgentTool } from './base-agent.js';
import { PersistentCache } from './cache.js';
import type { IRLEvent } from '../types.js';

const BATCH_SIZE = 10;

// 14-day cache — longer TTL since editorial voice doesn't change often
const uxCache = new PersistentCache<{ shortWhy: string; editorialWhy: string }>('ux-copy.json', 14);

// Patterns that indicate generic/template copy — these events get rewritten
const GENERIC_PATTERNS = [
  /^the kind of/i,
  /^join us/i,
  /^discover/i,
  /^experience/i,
  /^explore/i,
  /^don't miss/i,
  /^come (?:enjoy|experience|discover)/i,
  /^located in/i,
  /^welcome to/i,
];

function isGenericCopy(text: string | undefined): boolean {
  if (!text || text.trim().length < 15) return true;
  return GENERIC_PATTERNS.some((p) => p.test(text.trim()));
}

interface CopyResult {
  id: string;
  shortWhy?: string;
  editorialWhy?: string;
}

interface GenerationTask {
  event: IRLEvent;
  needsShortWhy: boolean;
  needsEditorialWhy: boolean;
}

export class UXAgent extends BaseAgent {
  protected systemPrompt = `You are an editorial writer for IRL, a Miami/Fort Lauderdale events discovery app.

Voice: knowledgeable local. Warm, opinionated, specific. You've been to these places.

For each event write:
- shortWhy: 1 punchy sentence (max 12 words). A reason to STOP SCROLLING, not a genre label.
  Never start with: "Join", "Discover", "Experience", "Explore", "Don't miss", "Come"
  Good: "Rosalía's most ambitious show — and her first US performance of this album."
  Bad: "Experience the magic of live Latin music at a legendary Miami venue."

- editorialWhy: 2–3 sentences. Tell the cultural story. Mention at least one of:
  neighborhood context, crowd vibe, price value, what makes THIS instance special.
  Don't feature-dump. Don't describe what the venue has ("a bar with a dance floor").
  Write what the night feels like.

Return ONLY a JSON array, no markdown:
[{"id": "<id>", "shortWhy": "...", "editorialWhy": "..."}, ...]`;

  protected tools: AgentTool[] = []; // Pure generation — no tools needed

  private async generateBatch(tasks: GenerationTask[]): Promise<CopyResult[]> {
    const prompt = `Write editorial copy for these ${tasks.length} events. For each event, only generate the fields marked GENERATE — preserve fields marked KEEP as-is.

${tasks.map(({ event: e, needsShortWhy, needsEditorialWhy }) => `ID: ${e.id}
Title: ${e.title}
Venue: ${e.venueName ?? 'Unknown'}, ${e.neighborhood}
Category: ${e.category} | Tags: ${e.tags.slice(0, 6).join(', ')}
Price: ${e.priceLabel ?? 'varies'} | Outdoor: ${e.isOutdoor}
Recurring series: ${e.seriesId ? `Yes (${e.seriesName ?? ''})` : 'No'}
Description: ${(e.description ?? '').slice(0, 250)}
shortWhy: ${needsShortWhy ? 'GENERATE' : `KEEP: "${e.shortWhy}"`}
editorialWhy: ${needsEditorialWhy ? 'GENERATE' : `KEEP: "${e.editorialWhy}"`}`).join('\n---\n')}

Return JSON array only — include only fields that were GENERATE, omit KEEP fields:
[{"id": "...", "shortWhy": "...", "editorialWhy": "..."}, ...]`;

    try {
      const response = await this.runLoop(prompt, { maxTurns: 1, model: 'claude-sonnet-4-6' });
      const cleaned = response.trim().replace(/^```json?\n?/, '').replace(/\n?```$/, '');
      return JSON.parse(cleaned) as CopyResult[];
    } catch {
      return [];
    }
  }

  async run(events: IRLEvent[]): Promise<{ events: IRLEvent[]; cacheHits: number; updated: number }> {
    const resultMap = new Map(events.map((e) => [e.id, e]));
    const toGenerate: GenerationTask[] = [];
    let cacheHits = 0;
    let updated = 0;

    // Apply cached copy and collect events needing generation
    for (const event of events) {
      const cached = uxCache.get(event.id);
      if (cached) {
        cacheHits++;
        resultMap.set(event.id, { ...event, shortWhy: cached.shortWhy, editorialWhy: cached.editorialWhy });
      } else {
        const needsShortWhy = isGenericCopy(event.shortWhy);
        const needsEditorialWhy = isGenericCopy(event.editorialWhy);
        if (needsShortWhy || needsEditorialWhy) {
          toGenerate.push({ event, needsShortWhy, needsEditorialWhy });
        }
      }
    }

    if (toGenerate.length === 0) {
      console.log(`\n✍️  UXAgent: all events have good copy (${cacheHits} cache hits)`);
      return { events: Array.from(resultMap.values()), cacheHits, updated };
    }

    console.log(
      `\n✍️  UXAgent: generating copy for ${toGenerate.length} events` +
      ` (${cacheHits} cache hits, ${events.length - toGenerate.length - cacheHits} already good)`
    );

    for (let i = 0; i < toGenerate.length; i += BATCH_SIZE) {
      const batch = toGenerate.slice(i, i + BATCH_SIZE);
      const copies = await this.generateBatch(batch);

      for (const result of copies) {
        const { id } = result;
        const task = batch.find((t) => t.event.id === id);
        const event = resultMap.get(id);
        if (!event || !task) continue;

        // Merge: use generated fields, fall back to existing for KEEP fields
        const shortWhy = result.shortWhy ?? (task.needsShortWhy ? event.shortWhy : event.shortWhy);
        const editorialWhy = result.editorialWhy ?? (task.needsEditorialWhy ? event.editorialWhy : event.editorialWhy);

        if (shortWhy && editorialWhy) {
          uxCache.set(id, { shortWhy, editorialWhy });
          resultMap.set(id, { ...event, shortWhy, editorialWhy });
          updated++;
        }
      }
    }

    uxCache.flush();
    console.log(`   UXAgent: copy updated for ${updated} events`);
    return { events: Array.from(resultMap.values()), cacheHits, updated };
  }
}
