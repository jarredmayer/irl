/**
 * Editorial Voice Agent
 *
 * Generates daily Yourcast copy using Claude Haiku.
 * Terse, local, unsentimental — like a friend who actually goes out.
 */

import type { ScoredEvent } from '../types';
import { getPreferences } from '../store/preferences';

const CACHE_KEY_PREFIX = 'irl_editorial_';

export interface EditorialResult {
  headline: string;
  subhead: string;
  leadIntro: string;
  wildCardLabel: string;
}

interface CacheEntry {
  result: EditorialResult;
  ts: number;
  key: string;
}

const FALLBACKS: EditorialResult = {
  headline: 'Tonight in Miami',
  subhead: "What's worth going to.",
  leadIntro: 'Top pick for tonight.',
  wildCardLabel: 'Under the radar.',
};

// Cache key based on date + top 3 event IDs
// so it regenerates daily or when events change
function getCacheKey(events: ScoredEvent[]): string {
  const date = new Date().toISOString().slice(0, 10);
  const ids = events.slice(0, 3).map(e => e.id).join('-');
  return `${date}-${ids}`;
}

function getCache(key: string): EditorialResult | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY_PREFIX + key);
    if (!raw) return null;
    const entry: CacheEntry = JSON.parse(raw);
    // Expire after 6 hours
    if (Date.now() - entry.ts > 1000 * 60 * 60 * 6) {
      localStorage.removeItem(CACHE_KEY_PREFIX + key);
      return null;
    }
    return entry.result;
  } catch {
    return null;
  }
}

function setCache(key: string, result: EditorialResult): void {
  try {
    localStorage.setItem(
      CACHE_KEY_PREFIX + key,
      JSON.stringify({ result, ts: Date.now(), key })
    );
  } catch {
    // localStorage might be full
  }
}

// ─── IRL VOICE BRIEF ─────────────────────────────────────
// Terse. Local. Unsentimental.
// Sounds like a friend who actually goes out in Miami.
// Specific beats generic. Facts not feelings.
// Never: perfect, amazing, discover, explore, curated,
//   personalized, vibrant, exciting, seamless.
// Dry wit is fine. Enthusiasm is not.
// Max 8 words for headline. Max 10 words for subhead.
// ─────────────────────────────────────────────────────────

export async function generateEditorialCopy(
  events: ScoredEvent[]
): Promise<EditorialResult> {
  const key = import.meta.env.VITE_ANTHROPIC_API_KEY;
  if (!key) return FALLBACKS;

  if (events.length === 0) return FALLBACKS;

  const cacheKey = getCacheKey(events);
  const cached = getCache(cacheKey);
  if (cached) return cached;

  const prefs = getPreferences();
  const cityLabel = {
    miami: 'Miami',
    ftl: 'Fort Lauderdale',
    pb: 'Palm Beach',
  }[prefs.city ?? 'miami'] ?? 'South Florida';

  const topEvents = events.slice(0, 5).map(e =>
    `- ${e.title} (${e.category}, ${e.neighborhood ?? ''}, ${new Date(e.startAt).toLocaleString('en-US', { weekday: 'short', hour: 'numeric' })})`
  ).join('\n');

  const prompt = `You write copy for IRL, a curated local events app in ${cityLabel}.

IRL voice: terse, local, unsentimental. Like a friend who actually goes out.
Specific beats generic. Facts not feelings. Never hype.
Never use: perfect, amazing, discover, explore, curated, personalized, vibrant, exciting.
Dry wit is fine. Enthusiasm is not.

Tonight's top events:
${topEvents}

Return ONLY valid JSON, no markdown, no preamble:
{
  "headline": "max 8 words, tonight's vibe in one line",
  "subhead": "max 10 words, what to expect tonight",
  "leadIntro": "max 12 words, one line about the top event",
  "wildCardLabel": "max 6 words, teaser for the under-the-radar pick"
}`;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 256,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!res.ok) return FALLBACKS;

    const data = await res.json();
    const text = data.content?.[0]?.text ?? '';
    const clean = text.replace(/```json|```/g, '').trim();
    const parsed: EditorialResult = JSON.parse(clean);

    // Validate required fields
    if (!parsed.headline || !parsed.subhead) return FALLBACKS;

    setCache(cacheKey, parsed);
    return parsed;
  } catch {
    return FALLBACKS;
  }
}

// ─── LEGACY EXPORTS FOR COMPATIBILITY ─────────────────────

export function getCachedEditorial(): EditorialResult | null {
  // Find any valid cache entry
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(CACHE_KEY_PREFIX)) {
        const raw = localStorage.getItem(key);
        if (raw) {
          const entry: CacheEntry = JSON.parse(raw);
          if (Date.now() - entry.ts < 1000 * 60 * 60 * 6) {
            return entry.result;
          }
        }
      }
    }
  } catch {
    // Ignore
  }
  return null;
}

export function clearEditorialCache(): void {
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(CACHE_KEY_PREFIX)) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach(key => localStorage.removeItem(key));
}

// Legacy alias for compatibility
export const generateEditorial = generateEditorialCopy;
export const getYourcastEditorial = generateEditorialCopy;
