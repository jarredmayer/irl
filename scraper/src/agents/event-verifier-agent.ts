/**
 * EventVerifierAgent
 *
 * Confirms that events are real via web search before they reach users.
 * Replaces the static VERIFIED_SOURCES list with per-event verification.
 *
 * Strategy:
 *  1. Trusted sources (RA, Improv, BrowardCenter) → skip verification (already confirmed)
 *  2. Instagram / recurring templates → search web for corroboration
 *  3. If search returns 0 relevant results → flag as unverified (kept, but marked)
 *  4. Results cached 7 days — same TTL as editorial cache
 *
 * Design principle: err on the side of keeping events.
 * "Not found" in web search does NOT remove an event — it just sets verified: false.
 * Only removal is if the search explicitly surfaces a cancellation notice.
 */

import { BaseAgent, type AgentTool } from './base-agent.js';
import { PersistentCache, cacheKey } from './cache.js';
import type { IRLEvent } from '../types.js';

// Sources we consider inherently trustworthy — skip web verification
const TRUSTED_SOURCE_NAMES = new Set([
  'Resident Advisor',
  'Miami Improv',
  'Fort Lauderdale Improv',
  'Broward Center',
  'World Cup 2026',
  'III Points',
  'South Beach Wine & Food Festival',
  'Miami Spice',
  'Dice.fm Real',
]);

interface VerificationResult {
  verified: boolean;
  confidence: 'high' | 'medium' | 'low';
  reasoning: string;
  cancelled?: boolean;
}

// 7-day cache — events are time-sensitive, shorter TTL than venue cache
const verifierCache = new PersistentCache<VerificationResult>(
  'event-verification.json',
  7
);

// 7-day cache for Instagram-sourced events — same as standard cache.
// IG events rarely get cancelled without notice; 3-day was overly aggressive.
const igVerifierCache = new PersistentCache<VerificationResult>(
  'event-verification-ig.json',
  7
);

/** Returns true if this event should use the shorter IG cache (3-day TTL) */
function isInstagramSource(event: IRLEvent): boolean {
  return (event.source?.name ?? '').startsWith('@');
}

/** Returns true if an Instagram event is far enough out to warrant fresher checks */
function needsIgFreshnessCheck(event: IRLEvent): boolean {
  if (!isInstagramSource(event)) return false;
  const daysOut = (new Date(event.startAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  return daysOut > 14;
}

export interface VerifierReport {
  total: number;
  skippedTrusted: number;
  checked: number;
  cacheHits: number;
  verified: number;
  unverified: number;
  cancelled: number;
  removed: number;
}

export class EventVerifierAgent extends BaseAgent {
  /** Set to true if ALL search_web calls returned errors (infra down, not genuine no-results) */
  private searchInfraFailed = false;
  private searchAttempts = 0;
  private searchErrors = 0;

  protected systemPrompt = `You are an event verification assistant for an events app covering Miami and Fort Lauderdale, Florida.

Given an event title, venue, and date, search the web to determine if this event is real and happening.

Use search_web to find corroborating evidence. Look for:
- Official venue websites or social media confirming the event
- Ticketing pages (Eventbrite, Dice.fm, RA, etc.)
- News articles or press releases
- Instagram posts from the venue confirming the event

Respond ONLY with JSON (no markdown):
{
  "verified": true|false,
  "confidence": "high"|"medium"|"low",
  "reasoning": "<one concise sentence>",
  "cancelled": true|false
}

Rules:
- verified: true  → found concrete evidence event is happening
- verified: false → no corroboration found, but don't assume cancelled
- cancelled: true → found explicit cancellation notice (rare — set with confidence "high" only)
- When uncertain, prefer verified: false (not cancelled)`;

  protected tools: AgentTool[] = [
    {
      name: 'search_web',
      description: 'Search the web for information about an event.',
      input_schema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Web search query' },
        },
        required: ['query'],
      },
      handler: async (input) => {
        // Perform a real web search via fetch to a search API.
        // We use DuckDuckGo's HTML endpoint for zero-auth searching.
        const query = encodeURIComponent(String(input.query));
        this.searchAttempts++;
        try {
          const response = await fetch(
            `https://html.duckduckgo.com/html/?q=${query}`,
            {
              headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; IRLBot/1.0)',
                Accept: 'text/html',
              },
              signal: AbortSignal.timeout(8000),
            }
          );
          const html = await response.text();

          // Extract snippet text from result elements
          const snippetPattern = /<a class="result__snippet"[^>]*>([^<]+)</g;
          const titlePattern = /<a class="result__a"[^>]*>([^<]+)</g;
          const results: string[] = [];

          let m;
          const titles: string[] = [];
          while ((m = titlePattern.exec(html)) !== null && titles.length < 5) {
            titles.push(m[1].trim());
          }
          const snippets: string[] = [];
          while ((m = snippetPattern.exec(html)) !== null && snippets.length < 5) {
            snippets.push(m[1].trim());
          }

          for (let i = 0; i < Math.max(titles.length, snippets.length); i++) {
            const part = [titles[i], snippets[i]].filter(Boolean).join(' — ');
            if (part) results.push(part);
          }

          return results.length > 0
            ? { found: true, results }
            : { found: false, message: 'No results found' };
        } catch (err) {
          // Track infrastructure failures (network errors, timeouts) separately
          // from genuine "no results" — they have different implications for trust.
          this.searchErrors++;
          return { found: false, searchFailed: true, error: String(err) };
        }
      },
    },
  ];

  async verifyEvent(event: IRLEvent): Promise<VerificationResult> {
    const key = cacheKey(event.title, event.venueName ?? '', event.startAt.slice(0, 10));
    const cache = needsIgFreshnessCheck(event) ? igVerifierCache : verifierCache;
    const cached = cache.get(key);
    if (cached) return cached;

    // Reset search tracking for this event
    this.searchAttempts = 0;
    this.searchErrors = 0;

    const dateStr = event.startAt.slice(0, 10);
    const prompt = `Verify this event is real and happening:

Title: ${event.title}
Venue: ${event.venueName ?? 'Unknown venue'}
Date: ${dateStr}
City: ${event.city}
${event.source?.url ? `Source URL: ${event.source.url}` : ''}

Search the web for evidence. Focus on: site:instagram.com, site:eventbrite.com, site:ra.co, official venue websites.
Return JSON only.`;

    try {
      const response = await this.runLoop(prompt, { maxTurns: 4 });

      // If ALL search attempts failed with errors (infra down), don't penalize the event —
      // "search unavailable" is not the same as "event not found"
      if (this.searchAttempts > 0 && this.searchErrors === this.searchAttempts) {
        return { verified: true, confidence: 'low', reasoning: 'Search infrastructure unavailable — assuming valid' };
      }

      const cleaned = response.trim().replace(/^```json?\n?/, '').replace(/\n?```$/, '');
      const result = JSON.parse(cleaned) as VerificationResult;
      cache.set(key, result);
      return result;
    } catch {
      // If search infra was down, be lenient. Otherwise mark unverified but keep event.
      if (this.searchAttempts > 0 && this.searchErrors === this.searchAttempts) {
        return { verified: true, confidence: 'low', reasoning: 'Search infrastructure unavailable — assuming valid' };
      }
      return { verified: false, confidence: 'low', reasoning: 'Verification skipped (parse error)' };
    }
  }
}

/**
 * Verify a batch of events. Only checks events from non-trusted sources.
 * Removes events explicitly flagged as cancelled (high confidence).
 * Sets a log entry for unverified events but keeps them in output.
 */
export async function verifyEventBatch(
  events: IRLEvent[],
  options: { max?: number } = {}
): Promise<{ events: IRLEvent[]; report: VerifierReport }> {
  const { max = 20 } = options;

  const report: VerifierReport = {
    total: events.length,
    skippedTrusted: 0,
    checked: 0,
    cacheHits: 0,
    verified: 0,
    unverified: 0,
    cancelled: 0,
    removed: 0,
  };

  // Split trusted vs candidates
  const trusted: IRLEvent[] = [];
  const candidates: IRLEvent[] = [];

  for (const event of events) {
    const sourceName = event.source?.name ?? '';
    if (TRUSTED_SOURCE_NAMES.has(sourceName)) {
      trusted.push(event);
      report.skippedTrusted++;
    } else {
      candidates.push(event);
    }
  }

  if (candidates.length === 0) {
    report.total = events.length;
    return { events, report };
  }

  const toCheck = candidates.slice(0, max);
  const unchecked = candidates.slice(max);

  const stats = verifierCache.stats();
  console.log(`\n🔍 EventVerifierAgent: ${toCheck.length} events to verify (${unchecked.length} deferred)`);
  console.log(`   Cache: ${stats.valid} valid entries`);

  const agent = new EventVerifierAgent();
  const kept: IRLEvent[] = [];

  for (const event of toCheck) {
    report.checked++;

    // Check cache first (without calling agent); IG events >14d out use shorter cache
    const key = cacheKey(event.title, event.venueName ?? '', event.startAt.slice(0, 10));
    const activeCache = needsIgFreshnessCheck(event) ? igVerifierCache : verifierCache;
    const cached = activeCache.get(key);
    if (cached) {
      report.cacheHits++;
    }

    const result = await agent.verifyEvent(event);

    if (result.cancelled && result.confidence === 'high') {
      report.cancelled++;
      report.removed++;
      console.log(`   ❌ CANCELLED: "${event.title}" — ${result.reasoning}`);
    } else {
      kept.push(event);
      if (result.verified) {
        report.verified++;
      } else {
        report.unverified++;
        console.log(`   ⚠️  Unverified: "${event.title}" — ${result.reasoning}`);
      }
    }
  }

  verifierCache.flush();
  igVerifierCache.flush();

  const output = [...trusted, ...kept, ...unchecked];
  console.log(
    `   EventVerifier: ${report.checked} checked, ${report.verified} verified,` +
    ` ${report.unverified} unverified, ${report.removed} removed`
  );

  return { events: output, report };
}
