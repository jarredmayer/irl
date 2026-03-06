import type { ScoredEvent } from '../types';

// ─── STYLE BRIEF ──────────────────────────────────────────
// Editorial brand photography. Single hero subject.
// Bold graphic composition. Rich saturated shadows.
// No faces. No text. No logos. No UI.
// Medium format film aesthetic. Warm analog color grade.
// Miami / South Florida energy where relevant.
// ──────────────────────────────────────────────────────────

const CACHE_PREFIX = 'irl_img_';
const CACHE_TTL_MS = 1000 * 60 * 60 * 24; // 24 hours

interface CacheEntry {
  url: string;
  ts: number;
}

function getCache(eventId: string): string | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + eventId);
    if (!raw) return null;
    const entry: CacheEntry = JSON.parse(raw);
    if (Date.now() - entry.ts > CACHE_TTL_MS) {
      localStorage.removeItem(CACHE_PREFIX + eventId);
      return null;
    }
    return entry.url;
  } catch { return null; }
}

function setCache(eventId: string, url: string): void {
  try {
    const entry: CacheEntry = { url, ts: Date.now() };
    localStorage.setItem(CACHE_PREFIX + eventId, JSON.stringify(entry));
  } catch {}
}

// ─── HASH FOR CONSISTENT FALLBACK SELECTION ───────────────
function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
}

// ─── CURATED FALLBACKS BY CATEGORY ───────────────────────
// Selected for editorial single-subject quality.
// Unsplash photo IDs — no faces, clean, South Florida adjacent.

const CURATED: Record<string, string[]> = {
  nightlife: [
    'photo-1514525253161-7a46d19cd819',
    'photo-1470225620780-dba8ba36b745',
    'photo-1566417713940-fe7c737a9ef2',
  ],
  music: [
    'photo-1493225457124-a3eb161ffa5f',
    'photo-1511671782779-c97d3d27a1d4',
    'photo-1510915361894-db8b60106cb1',
  ],
  outdoor: [
    'photo-1507525428034-b723cf961d3e',
    'photo-1441974231531-c6227db76b6e',
    'photo-1476514525535-07fb3b4ae5f1',
  ],
  outdoors: [
    'photo-1507525428034-b723cf961d3e',
    'photo-1441974231531-c6227db76b6e',
    'photo-1476514525535-07fb3b4ae5f1',
  ],
  arts: [
    'photo-1536924940846-227afb31e2a5',
    'photo-1561214115-f2f134cc4912',
    'photo-1549490349-8643362247b5',
  ],
  'food & drink': [
    'photo-1414235077428-338989a2e8c0',
    'photo-1482049016688-2d3e1b311543',
    'photo-1504674900247-0877df9cc836',
  ],
  food: [
    'photo-1414235077428-338989a2e8c0',
    'photo-1482049016688-2d3e1b311543',
    'photo-1504674900247-0877df9cc836',
  ],
  community: [
    'photo-1529156069898-49953e39b3ac',
    'photo-1500462918059-b1a0cb512f1d',
    'photo-1558618666-fcd25c85cd64',
  ],
  wellness: [
    'photo-1544367567-0f2fcb009e0b',
    'photo-1506126613408-eca07ce68773',
    'photo-1518611012118-696072aa579a',
  ],
  fitness: [
    'photo-1534438327276-14e5300c3a48',
    'photo-1517836357463-d25dfeac3438',
    'photo-1526506118085-60ce8714f8c5',
  ],
  culture: [
    'photo-1554907984-15263bfd63bd',
    'photo-1565060299934-4a8dbf8b9e1c',
    'photo-1577083552431-6e5fd01988ec',
  ],
  market: [
    'photo-1488459716781-31db52582fe9',
    'photo-1542838132-92c53300491e',
    'photo-1506617420156-8e4536971650',
  ],
  film: [
    'photo-1489599849927-2ee91cede3ba',
    'photo-1517604931442-7e0c8ed2963c',
    'photo-1536440136628-849c177e76a1',
  ],
  comedy: [
    'photo-1516280440614-37939bbacd81',
    'photo-1493676304819-0d7a8d026dcf',
    'photo-1503095396549-807759245b35',
  ],
  sports: [
    'photo-1461896836934- voices',
    'photo-1508098682722-e99c43a406b2',
    'photo-1546519638-68e109498ffc',
  ],
  family: [
    'photo-1536640712-4d4c36ff0e4e',
    'photo-1503454537195-1dcabb73ffb9',
    'photo-1516627145497-ae6968895b74',
  ],
  default: [
    'photo-1533174072545-7a4b6ad7a6c3',
    'photo-1519501025264-65ba15a82390',
    'photo-1477959858617-67f85cf4f1df',
  ],
};

export function getFallbackImage(category: string, seed: string): string {
  const cat = category?.toLowerCase() ?? 'default';
  const photos = CURATED[cat] ?? CURATED.default;
  const idx = hashCode(seed) % photos.length;
  return `https://images.unsplash.com/${photos[idx]}` +
    `?auto=format&fit=crop&w=800&q=80`;
}

// ─── PEXELS API ───────────────────────────────────────────
// Free tier: 200 req/hour. No watermark. High quality.
// Set VITE_PEXELS_API_KEY in .env

const PEXELS_QUERIES: Record<string, string> = {
  nightlife:     'cocktail bar dark moody',
  music:         'live music concert stage',
  outdoor:       'miami beach tropical outdoor',
  outdoors:      'miami beach tropical outdoor',
  arts:          'art gallery sculpture minimal',
  'food & drink': 'restaurant plated dish editorial',
  food:          'restaurant plated dish editorial',
  community:     'outdoor market south florida',
  wellness:      'yoga meditation serene',
  fitness:       'athletic training equipment',
  culture:       'museum exhibition space',
  market:        'farmers market produce fresh',
  film:          'cinema theater dark',
  comedy:        'stage spotlight microphone',
  sports:        'athletic sports equipment',
  family:        'playground colorful outdoor',
  default:       'miami urban architecture',
};

async function fetchPexels(
  category: string,
  seed: string
): Promise<string | null> {
  const key = import.meta.env.VITE_PEXELS_API_KEY;
  if (!key) return null;
  try {
    const query = PEXELS_QUERIES[category?.toLowerCase()]
      ?? PEXELS_QUERIES.default;
    const page = (hashCode(seed) % 3) + 1;
    const res = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=5&page=${page}&orientation=landscape`,
      { headers: { Authorization: key } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const photos = data.photos ?? [];
    if (!photos.length) return null;
    const idx = hashCode(seed) % photos.length;
    return photos[idx]?.src?.large ?? null;
  } catch { return null; }
}

// ─── UNSPLASH API ─────────────────────────────────────────
// Free tier: 50 req/hour. Requires attribution in UI.
// Set VITE_UNSPLASH_ACCESS_KEY in .env

const UNSPLASH_QUERIES: Record<string, string> = {
  nightlife:     'cocktail bar moody',
  music:         'live music performance',
  outdoor:       'tropical beach florida',
  outdoors:      'tropical beach florida',
  arts:          'art gallery minimal',
  'food & drink': 'food photography editorial',
  food:          'food photography editorial',
  community:     'outdoor market community',
  wellness:      'yoga wellness serene',
  fitness:       'fitness training sport',
  culture:       'museum culture exhibition',
  market:        'farmers market produce',
  film:          'cinema movie theater',
  comedy:        'stage microphone spotlight',
  sports:        'sports athletic action',
  family:        'playground family outdoor',
  default:       'miami city lifestyle',
};

async function fetchUnsplash(
  category: string,
  seed: string
): Promise<string | null> {
  const key = import.meta.env.VITE_UNSPLASH_ACCESS_KEY;
  if (!key) return null;
  try {
    const query = UNSPLASH_QUERIES[category?.toLowerCase()]
      ?? UNSPLASH_QUERIES.default;
    const page = (hashCode(seed) % 3) + 1;
    const res = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=5&page=${page}&orientation=landscape`,
      { headers: { Authorization: `Client-ID ${key}` } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const results = data.results ?? [];
    if (!results.length) return null;
    const idx = hashCode(seed) % results.length;
    return results[idx]?.urls?.regular ?? null;
  } catch { return null; }
}

// ─── MAIN EXPORT ──────────────────────────────────────────

export async function generateEventImage(
  event: ScoredEvent
): Promise<string> {
  // 1. Check cache
  const cached = getCache(event.id);
  if (cached) return cached;

  // 2. Immediate fallback — never blocks render
  const fallback = getFallbackImage(event.category, event.id);

  // 3. Try Pexels first
  const pexels = await fetchPexels(event.category, event.id);
  if (pexels) {
    setCache(event.id, pexels);
    return pexels;
  }

  // 4. Try Unsplash API
  const unsplash = await fetchUnsplash(event.category, event.id);
  if (unsplash) {
    setCache(event.id, unsplash);
    return unsplash;
  }

  // 5. Return curated fallback
  setCache(event.id, fallback);
  return fallback;
}

// ─── LEGACY EXPORTS FOR COMPATIBILITY ─────────────────────

export function getCachedImage(eventId: string): string | null {
  return getCache(eventId);
}

export function clearImageCache(): void {
  // Clear all irl_img_ prefixed keys
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(CACHE_PREFIX)) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach(key => localStorage.removeItem(key));
}
