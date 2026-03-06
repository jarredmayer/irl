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
  protected systemPrompt = `You are a curation editor for IRL, a Miami/Fort Lauderdale/Palm Beach events discovery app.

IRL is for 25–38 year olds who live here (not tourists). They go out 2–3x per week, care about authenticity, are culturally curious. Think: your coolest, most plugged-in local friend — not a concierge or tourist board.

Score each event 1–10 for "editor pick" quality.

HIGH SCORES (8–10) — the event is genuinely special:
- Named performer, artist, chef, or speaker (not just "live music" or "DJ")
- Rare: one-off, opening night, album release, pop-up, visiting artist, limited capacity
- Free or low-cost events that feel exclusive (secret location, intimate venue)
- Events in neighborhoods that signal authenticity: Little Havana, Little Haiti, Overtown, Allapattah, Little River, Hialeah, Flagler Village, Lake Worth
- Local origin: Miami-born artist, chef, label, or collective
- Cross-cultural: events bridging Miami's communities (Cuban + Haitian + Caribbean + Brazilian)
- Independent venues over corporate: Gramps > Kaseya Center, O Cinema > AMC, Lagniappe > Yard House
- Time-specific magic: sunrise sets at Space, golden hour, late night Little Havana

MID SCORES (5–7): recurring at notable venues, specific-but-not-rare, named artist at a large venue

LOW SCORES (1–4) — penalize:
- Generic title with no named person: "Live Music at [Bar]", "Happy Hour", "DJ Night"
- Corporate brand events: "presented by Modelo", "sponsored by [Bank]"
- Tourist-facing: South Beach mega-clubs, generic boat parties, touristy Little Havana shows
- Tech/startup networking disguised as cultural events
- Events with 5,000+ capacity unless genuinely special
- Lazy PR language: "an unforgettable night", "don't miss this"
- Over-tagged yoga/cycling (fitness is useful but lower curation priority)

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
      // First attempt failed — retry with a simpler one-line-per-event prompt
      try {
        const simplePrompt = `Score 1-10 (8+ = specific & rare, 1-4 = generic recurring):\n` +
          events.map((e) => `${e.id}: "${e.title}" ${e.seriesId ? '(recurring)' : '(one-off)'}`).join('\n') +
          `\nReturn JSON: [{"id":"...","score":<1-10>},...]`;
        const response2 = await this.runLoop(simplePrompt, { maxTurns: 1 });
        const cleaned2 = response2.trim().replace(/^```json?\n?/, '').replace(/\n?```$/, '');
        return JSON.parse(cleaned2) as ScoreResult[];
      } catch {
        // Both attempts failed — apply heuristic fallback rather than losing all scores
        console.log(`   ⚠️  CurationAgent: batch parse failed twice, applying heuristics`);
        return events.map((e) => ({
          id: e.id,
          // Recurring series: safe 4. One-off events: 5. Can't identify editor picks without LLM.
          score: e.seriesId ? 4 : 5,
        }));
      }
    }
  }

  async run(events: IRLEvent[]): Promise<{ events: IRLEvent[]; cacheHits: number; newPicks: number }> {
    const result = [...events];
    const toScore: IRLEvent[] = [];
    let cacheHits = 0;
    let newPicks = 0;

    // Apply cached scores and collect events needing scoring
    for (let i = 0; i < result.length; i++) {
      const cachedScore = curationCache.get(result[i].id);
      if (cachedScore !== null) {
        cacheHits++;
        // Explicitly set editorPick based on score — clear false positives from heuristics
        result[i] = { ...result[i], editorPick: cachedScore >= EDITOR_PICK_THRESHOLD };
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
        const idx = result.findIndex((e) => e.id === id);
        if (idx >= 0) {
          const isPick = score >= EDITOR_PICK_THRESHOLD;
          if (isPick && !result[idx].editorPick) newPicks++;
          result[idx] = { ...result[idx], editorPick: isPick };
        }
      }
    }

    curationCache.flush();
    console.log(
      `   CurationAgent: ${newPicks} new editor picks (threshold: ${EDITOR_PICK_THRESHOLD}/10),` +
      ` ${result.filter((e) => e.editorPick).length} total`
    );
    return { events: result, cacheHits, newPicks };
  }
}
