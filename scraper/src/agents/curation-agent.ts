/**
 * CurationAgent
 *
 * Scores events for editorial quality and sets editorPick on the best ones.
 * Replaces the heuristic-based isEditorPick() in aggregator.ts with LLM scoring.
 *
 * Scoring criteria (1–10):
 *  - Specific: named performer / chef / artist / speaker
 *  - Rare: one-off, opening night, premiere, seasonal
 *  - Culturally significant: local institution, major booking, scene-defining
 *  - Local Miami/FLL relevance: neighborhood context, community ties
 *
 * Threshold: score >= 8 → editorPick: true  (targets ~5–10% of feed)
 * Cost: low — batches 10 events per LLM call, uses Haiku
 * Caching: 7-day TTL keyed by event ID — recurring events are never re-scored
 */

import { BaseAgent, type AgentTool } from './base-agent.js';
import { PersistentCache } from './cache.js';
import type { IRLEvent } from '../types.js';

const BATCH_SIZE = 10;
const EDITOR_PICK_THRESHOLD = 8;

// 7-day cache — recurring events keep the same score across scrapes
const curationCache = new PersistentCache<number>('curation-scores.json', 7);

interface ScoreResult {
  id: string;
  score: number;
}

export class CurationAgent extends BaseAgent {
  protected systemPrompt = `You are a curation editor for IRL, a Miami/Fort Lauderdale events discovery app.

Score each event 1–10 for "editor pick" quality. High scores (8–10) mean:
- A specific performer, chef, artist, or speaker is named (not just "live music")
- It's rare: one-off, opening night, world/US premiere, seasonal, or hard to repeat
- Culturally significant: major booking, local institution milestone, scene-defining moment
- Strong Miami/FLL local relevance: tied to neighborhood identity or cultural moment

Low scores (1–4): generic recurring events with no specific draw ("weekly yoga", "happy hour every Friday")
Mid scores (5–7): recurring events at notable venues, or specific-but-not-rare events

Return ONLY a JSON array, no markdown, no explanation:
[{"id": "<id>", "score": <1-10>}, ...]`;

  protected tools: AgentTool[] = []; // Pure LLM scoring — no tools needed

  private async scoreBatch(events: IRLEvent[]): Promise<ScoreResult[]> {
    const prompt = `Score these ${events.length} events:

${events.map((e) => `ID: ${e.id}
Title: ${e.title}
Venue: ${e.venueName ?? 'Unknown'}, ${e.neighborhood}
Category: ${e.category} | Tags: ${e.tags.slice(0, 6).join(', ')}
Price: ${e.priceLabel ?? 'varies'} | Recurring: ${e.seriesId ? 'Yes' : 'No'}
Description: ${(e.description ?? '').slice(0, 200)}`).join('\n---\n')}

Return JSON array only: [{"id": "...", "score": <1-10>}, ...]`;

    try {
      const response = await this.runLoop(prompt, { maxTurns: 1 });
      const cleaned = response.trim().replace(/^```json?\n?/, '').replace(/\n?```$/, '');
      return JSON.parse(cleaned) as ScoreResult[];
    } catch {
      return [];
    }
  }

  async run(events: IRLEvent[]): Promise<IRLEvent[]> {
    const result = [...events];
    const toScore: IRLEvent[] = [];
    let cacheHits = 0;
    let newPicks = 0;

    // Apply cached scores and collect events needing scoring
    for (let i = 0; i < result.length; i++) {
      const cachedScore = curationCache.get(result[i].id);
      if (cachedScore !== null) {
        cacheHits++;
        if (cachedScore >= EDITOR_PICK_THRESHOLD) {
          result[i] = { ...result[i], editorPick: true };
        }
      } else {
        toScore.push(result[i]);
      }
    }

    console.log(
      `\n🏆 CurationAgent: ${toScore.length} events to score` +
      ` (${cacheHits} cache hits)`
    );

    // Score uncached events in batches
    for (let i = 0; i < toScore.length; i += BATCH_SIZE) {
      const batch = toScore.slice(i, i + BATCH_SIZE);
      const scores = await this.scoreBatch(batch);

      for (const { id, score } of scores) {
        curationCache.set(id, score);
        if (score >= EDITOR_PICK_THRESHOLD) {
          const idx = result.findIndex((e) => e.id === id);
          if (idx >= 0 && !result[idx].editorPick) {
            result[idx] = { ...result[idx], editorPick: true };
            newPicks++;
          }
        }
      }
    }

    curationCache.flush();
    console.log(
      `   CurationAgent: ${newPicks} new editor picks (threshold: ${EDITOR_PICK_THRESHOLD}/10),` +
      ` ${result.filter((e) => e.editorPick).length} total`
    );
    return result;
  }
}
