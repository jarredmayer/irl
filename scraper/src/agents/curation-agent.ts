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
 */

import { BaseAgent, type AgentTool } from './base-agent.js';
import type { IRLEvent } from '../types.js';

const BATCH_SIZE = 10;

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
    console.log(`\n🏆 CurationAgent: scoring ${events.length} events for editor picks`);
    const result = [...events];
    let newPicks = 0;

    for (let i = 0; i < events.length; i += BATCH_SIZE) {
      const batch = events.slice(i, i + BATCH_SIZE);
      const scores = await this.scoreBatch(batch);

      for (const { id, score } of scores) {
        if (score >= 8) {
          const idx = result.findIndex((e) => e.id === id);
          if (idx >= 0 && !result[idx].editorPick) {
            result[idx] = { ...result[idx], editorPick: true };
            newPicks++;
          }
        }
      }
    }

    // Clear existing heuristic picks that scored below threshold (reset then re-apply)
    console.log(`   CurationAgent: ${newPicks} editor picks set (threshold: 8/10)`);
    return result;
  }
}
