import type { ScoredEvent } from '../types';
import manifest from '../data/category-images-manifest.json';

// ─── STYLE BRIEF ──────────────────────────────────────────
// Editorial brand photography. Single hero subject.
// Bold graphic composition. Rich saturated shadows.
// No faces. No text. No logos. No UI.
// Medium format film aesthetic. Warm analog color grade.
// Miami / South Florida energy where relevant.
// ──────────────────────────────────────────────────────────

const CACHE_PREFIX = 'irl_img_';
const CACHE_TTL_MS = 1000 * 60 * 60 * 24; // 24 hours

// ─── CLEAR STALE CACHE ON LOAD ────────────────────────────
// One-time cleanup to remove old Pexels/Unsplash URLs
// so manifest images take precedence.
function clearStaleImageCache(): void {
  try {
    Object.keys(localStorage)
      .filter(k => k.startsWith(CACHE_PREFIX))
      .forEach(k => localStorage.removeItem(k));
  } catch {}
}
clearStaleImageCache();

// ──────────────────────────────────────────────────────────

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

// ─── LOCAL MANIFEST IMAGES (PRIMARY SOURCE) ───────────────
// Pre-generated editorial images served from /images/category/
// Loads instantly — no async needed.

export function getFallbackImage(category: string, seed: string): string {
  const cat = category?.toLowerCase() ?? 'default';
  const photos: string[] = (manifest as Record<string, string[]>)[cat]
    ?? (manifest as Record<string, string[]>)['default']
    ?? [];
  if (!photos.length) return '';
  const idx = hashCode(seed) % photos.length;
  return photos[idx];
}

// ─── PEXELS API (BACKGROUND UPGRADE) ──────────────────────
// Free tier: 200 req/hour. No watermark. High quality.
// Only used as optional background enhancement.

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

// ─── MAIN EXPORT ──────────────────────────────────────────

export async function generateEventImage(
  event: ScoredEvent
): Promise<string> {
  // 1. Check cache — return immediately if found
  const cached = getCache(event.id);
  if (cached) return cached;

  // 2. If event has a real image URL (not Unsplash/Pexels), use it
  if (event.image &&
      !event.image.includes('images.unsplash.com') &&
      !event.image.includes('images.pexels.com')) {
    setCache(event.id, event.image);
    return event.image;
  }

  // 3. Use local manifest image IMMEDIATELY (primary source)
  const manifestImage = getFallbackImage(event.category, event.id);
  setCache(event.id, manifestImage);

  // 4. Try Pexels in background as optional upgrade (don't block)
  fetchPexels(event.category, event.id).then(pexels => {
    if (pexels) {
      setCache(event.id, pexels);
    }
  });

  // Return manifest image instantly
  return manifestImage;
}

// ─── LEGACY EXPORTS FOR COMPATIBILITY ─────────────────────

export function getCachedImage(eventId: string): string | null {
  return getCache(eventId);
}

export function clearImageCache(): void {
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(CACHE_PREFIX)) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach(key => localStorage.removeItem(key));
}
