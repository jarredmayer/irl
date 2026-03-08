/**
 * Editorial Voice Agent
 *
 * Generates daily Yourcast copy from event data.
 * Primary path: uses event editorial fields (shortWhy, editorialWhy) from the UXAgent pipeline.
 * Fallback: deterministic contextual templates when editorial fields are sparse.
 * AI generation kept as enhancement when API key is available.
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

// ─── IRL VOICE BRIEF ─────────────────────────────────────
// Terse. Local. Unsentimental.
// Sounds like a friend who actually goes out in Miami.
// Specific beats generic. Facts not feelings.
// Never: perfect, amazing, discover, explore, curated,
//   personalized, vibrant, exciting, seamless.
// Dry wit is fine. Enthusiasm is not.
// Max 8 words for headline. Max 10 words for subhead.
// ─────────────────────────────────────────────────────────

export interface CuratedSlots {
  lead?: ScoredEvent;
  list: ScoredEvent[];
  nudge?: ScoredEvent;
  wildCard?: ScoredEvent;
}

// Cache key based on date + top event IDs + preferences
function getCacheKey(events: ScoredEvent[]): string {
  const date = new Date().toISOString().slice(0, 10);
  const prefs = getPreferences();
  const ids = events.slice(0, 3).map(e => e.id).join('-');
  const prefKey = (prefs.interests || []).slice(0, 2).join(',');
  return `${date}-${ids}-${prefKey}`;
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

// Headline templates grouped by context
const TIME_HEADLINES: Record<string, string[]> = {
  friday: [
    'Your Friday Night, Sorted',
    'Friday. Out. Now.',
    'This Friday Hits Different',
    'Weekend Starts Here',
  ],
  saturday: [
    'Saturday Plans, Handled',
    'Your Saturday Lineup',
    'Saturday Sorted',
    'The Saturday Edit',
  ],
  sunday: [
    'Sunday Plans, Handled',
    'The Sunday Situation',
    'Easy Sunday',
    'Sunday Done Right',
  ],
  weeknight: [
    'Midweek Moves',
    'Tonight, If You\'re Up For It',
    'Don\'t Stay In',
    'Weeknight Worth It',
  ],
  weekend: [
    'The Weekend Rundown',
    'This Weekend, Handled',
    'Weekend Plans, Set',
    'What\'s Good This Weekend',
  ],
};

const CATEGORY_HEADLINES: Record<string, string[]> = {
  'Music': [
    'Live Music Worth Leaving Home For',
    'Turn It Up This Week',
    'Good Sound, Better Night',
  ],
  'Art': [
    'Art You Haven\'t Seen Yet',
    'Worth a Gallery Walk',
    'New Walls, New Work',
  ],
  'Food & Drink': [
    'Eat Here This Week',
    'The Dining Shortlist',
    'Fork-Worthy This Week',
  ],
  'Outdoors': [
    'Get Outside This Week',
    'Fresh Air, Good Plans',
    'Outside > Inside',
  ],
  'Nightlife': [
    'The Night Shift',
    'After Dark This Week',
    'Late Night Sorted',
  ],
  'Community': [
    'Your People Are Here',
    'Locals Only (Not Really)',
    'The Neighborhood Lineup',
  ],
  'Wellness': [
    'Good For You This Week',
    'Recharge Mode',
    'Mind, Body, Weekend',
  ],
};

const CITY_HEADLINES: Record<string, string[]> = {
  Miami: [
    'What\'s Good in Miami',
    'The Miami Edit',
    'Miami This Week',
  ],
  'Fort Lauderdale': [
    'What\'s Up in FLL',
    'The Fort Lauderdale Edit',
    'FLL This Week',
  ],
  'Palm Beach': [
    'What\'s Good in PB',
    'The Palm Beach Edit',
    'Palm Beach This Week',
  ],
  'South Florida': [
    'What\'s Good in SoFlo',
    'This Week in SoFlo',
    'The SoFlo Edit',
  ],
};

const GENERIC_HEADLINES = [
  'This Week\'s Picks',
  'What\'s Worth Your Time',
  'The Short List',
  'Stuff That\'s Actually Good',
  'Out There This Week',
  'Worth Showing Up For',
  'The Honest Picks',
  'No Filler, Just Plans',
];

const WILDCARD_LABELS = [
  'Under the radar.',
  'You wouldn\'t find this on your own.',
  'The one you\'d miss.',
  'Off the beaten path.',
  'Something different.',
  'The unexpected pick.',
  'Left field, right call.',
  'Not what you\'d expect.',
];

// Use a deterministic-ish seed based on date to get variety without randomness
function pickFromList(list: string[], seed: number): string {
  return list[Math.abs(seed) % list.length];
}

function getDaySeed(): number {
  const now = new Date();
  return now.getFullYear() * 1000 + now.getMonth() * 100 + now.getDate();
}

function getTimeContext(): string {
  const now = new Date();
  const day = now.getDay();
  const hour = now.getHours();

  if (day === 5) return hour >= 15 ? 'friday' : 'weeknight';
  if (day === 6) return 'saturday';
  if (day === 0) return 'sunday';
  if (day === 4 && hour >= 17) return 'weekend'; // Thursday evening = weekend preview
  return 'weeknight';
}

function generateSubhead(slots: CuratedSlots): string {
  const parts: string[] = [];

  if (slots.lead?.venueName) {
    parts.push(slots.lead.venueName);
  }
  if (slots.wildCard?.neighborhood) {
    parts.push(slots.wildCard.neighborhood);
  }

  if (parts.length === 2) {
    return `From ${parts[0]} to ${parts[1]}.`;
  }

  // Collect unique categories
  const categories = new Set<string>();
  if (slots.lead) categories.add(slots.lead.category);
  slots.list.forEach(e => categories.add(e.category));
  if (slots.nudge) categories.add(slots.nudge.category);

  const cats = Array.from(categories).slice(0, 3);
  if (cats.length >= 2) {
    return `Spanning ${cats.slice(0, -1).join(', ')}, and ${cats[cats.length - 1]}.`;
  }

  return "What's worth going to.";
}

export function generateDeterministicCopy(
  slots: CuratedSlots,
): EditorialResult {
  const seed = getDaySeed();
  const timeCtx = getTimeContext();
  const prefs = getPreferences();

  const cityMap: Record<string, string> = {
    miami: 'Miami',
    ftl: 'Fort Lauderdale',
    pb: 'Palm Beach',
  };
  const cityLabel = (prefs.city ? cityMap[prefs.city] : null) ?? 'South Florida';

  // Pick headline based on priority: category match > time context > city > generic
  let headline: string;

  const leadCategory = slots.lead?.category;
  if (leadCategory && CATEGORY_HEADLINES[leadCategory]) {
    headline = pickFromList(CATEGORY_HEADLINES[leadCategory], seed);
  } else if (TIME_HEADLINES[timeCtx]) {
    headline = pickFromList(TIME_HEADLINES[timeCtx], seed);
  } else if (CITY_HEADLINES[cityLabel]) {
    headline = pickFromList(CITY_HEADLINES[cityLabel], seed);
  } else {
    headline = pickFromList(GENERIC_HEADLINES, seed);
  }

  // Alternate between approaches using seed parity
  if (seed % 3 === 0 && CITY_HEADLINES[cityLabel]) {
    headline = pickFromList(CITY_HEADLINES[cityLabel], seed);
  } else if (seed % 3 === 1 && TIME_HEADLINES[timeCtx]) {
    headline = pickFromList(TIME_HEADLINES[timeCtx], seed + 1);
  }

  const subhead = generateSubhead(slots);
  const leadIntro = slots.lead?.editorialWhy?.slice(0, 100) || slots.lead?.shortWhy || 'Top pick for the week.';
  const wildCardLabel = pickFromList(WILDCARD_LABELS, seed + 2);

  return { headline, subhead, leadIntro, wildCardLabel };
}

// ─── PRIMARY GENERATION: event data → editorial copy ──────
// Uses shortWhy / editorialWhy fields from the scraper's UXAgent pipeline.
// Falls back to deterministic templates when those fields are sparse.
export async function generateEditorialCopy(
  events: ScoredEvent[],
  slots?: CuratedSlots,
): Promise<EditorialResult> {
  const FALLBACKS: EditorialResult = {
    headline: 'Tonight in Miami',
    subhead: "What's worth going to.",
    leadIntro: 'Top pick for tonight.',
    wildCardLabel: 'Under the radar.',
  };

  if (events.length === 0) return FALLBACKS;

  const cacheKey = getCacheKey(events);
  const cached = getCache(cacheKey);
  if (cached) return cached;

  const prefs = getPreferences();
  const cityMap: Record<string, string> = {
    miami: 'Miami',
    ftl: 'Fort Lauderdale',
    pb: 'Palm Beach',
  };
  const cityLabel = (prefs.city ? cityMap[prefs.city] : null) ?? 'South Florida';

  const top = events[0];
  const wildCard = events.find(e => e.category !== top.category) ?? events[1];

  // Try event-data-driven copy first (from UXAgent editorial fields)
  const hasEditorialData = top.shortWhy || top.editorialWhy;

  let result: EditorialResult;

  if (hasEditorialData) {
    // Event data is rich enough — use it directly
    result = {
      headline: top.shortWhy && top.shortWhy.length <= 60
        ? top.shortWhy
        : `Tonight in ${top.neighborhood ?? cityLabel}`,
      subhead: wildCard
        ? `Plus: ${wildCard.shortWhy || wildCard.title}`
        : "What's worth going to.",
      leadIntro: top.editorialWhy?.slice(0, 100) || top.shortWhy || 'Top pick for tonight.',
      wildCardLabel: wildCard?.shortWhy || 'Under the radar.',
    };
  } else {
    // Sparse editorial data — use deterministic contextual templates
    const effectiveSlots: CuratedSlots = slots ?? {
      lead: top,
      list: events.slice(1, 4),
      nudge: events[4],
      wildCard,
    };
    result = generateDeterministicCopy(effectiveSlots);
  }

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

// Legacy aliases
export const generateEditorial = generateEditorialCopy;
export const getYourcastEditorial = generateEditorialCopy;
