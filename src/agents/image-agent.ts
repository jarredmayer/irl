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

// ─── CATEGORY NORMALIZATION MAP ───────────────────────────
// Maps event categories to manifest categories
const CATEGORY_MAP: Record<string, string> = {
  'music': 'music',
  'art': 'arts',
  'culture': 'culture',
  'food & drink': 'food',
  'food': 'food',
  'fitness': 'fitness',
  'wellness': 'wellness',
  'sports': 'fitness',
  'comedy': 'nightlife',
  'family': 'community',
  'community': 'community',
  'nightlife': 'nightlife',
  'outdoors': 'outdoor',
  'outdoor': 'outdoor',
  'shopping': 'community',
};

// ─── LOCAL MANIFEST IMAGES (PRIMARY SOURCE) ───────────────
// Pre-generated editorial images served from /images/category/
// Loads instantly — no async needed.

export function getFallbackImage(category: string, seed: string): string {
  const normalized = CATEGORY_MAP[category?.toLowerCase() ?? ''] ?? 'default';
  const photos: string[] = (manifest as Record<string, string[]>)[normalized]
    ?? (manifest as Record<string, string[]>)['default']
    ?? [];
  if (!photos.length) return '';
  const idx = hashCode(seed) % photos.length;
  return photos[idx];
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

  // 3. Use local manifest image (primary fallback source)
  const manifestImage = getFallbackImage(event.category, event.id);
  if (manifestImage) {
    setCache(event.id, manifestImage);
  }

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
