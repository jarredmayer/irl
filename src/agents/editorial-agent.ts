/**
 * Editorial Voice Agent
 *
 * Generates daily Yourcast copy from event data.
 * No API calls — editorial quality comes from the UXAgent in the scraper pipeline.
 * The frontend just surfaces the best copy from the top events.
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

  const top = events[0];
  const wildCard = events.find(e => e.category !== top.category) ?? events[1];

  const result: EditorialResult = {
    headline: top.shortWhy && top.shortWhy.length <= 60
      ? top.shortWhy
      : `Tonight in ${top.neighborhood ?? cityLabel}`,
    subhead: wildCard
      ? `Plus: ${wildCard.shortWhy || wildCard.title}`
      : "What's worth going to.",
    leadIntro: top.editorialWhy?.slice(0, 100) || top.shortWhy || 'Top pick for tonight.',
    wildCardLabel: wildCard?.shortWhy || 'Under the radar.',
  };

  setCache(cacheKey, result);
  return result;
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
