/**
 * PersistentCache — lightweight disk-backed JSON cache for LLM results.
 *
 * Why: The scraper runs 2× per day. Without caching:
 *   - Location verifier calls Claude once per venue per run → ~60 calls/day
 *   - Editorial generation calls Claude once per event → ~2,800 calls/day
 *
 * With caching:
 *   - Location verifier: 0 calls for known venues (TTL 30 days)
 *   - Editorial: 0 calls for recurring events (TTL 7 days)
 *   - Only new/changed events ever touch the API
 *
 * Cache files live at scraper/cache/ (gitignored).
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// One level up from agents/ = src/, one more up = scraper/, then cache/
const CACHE_DIR = join(dirname(fileURLToPath(import.meta.url)), '../../cache');

interface CacheFile<T> {
  version: 1;
  entries: Record<string, CacheEntry<T>>;
}

interface CacheEntry<T> {
  value: T;
  cachedAt: string; // ISO
}

export class PersistentCache<T> {
  private data: CacheFile<T>;
  private filepath: string;
  private ttlMs: number;
  private dirty = false;

  constructor(filename: string, ttlDays: number) {
    this.filepath = join(CACHE_DIR, filename);
    this.ttlMs = ttlDays * 24 * 60 * 60 * 1000;
    this.data = this.load();
  }

  private load(): CacheFile<T> {
    if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true });
    if (!existsSync(this.filepath)) return { version: 1, entries: {} };
    try {
      return JSON.parse(readFileSync(this.filepath, 'utf-8')) as CacheFile<T>;
    } catch {
      return { version: 1, entries: {} };
    }
  }

  get(key: string): T | null {
    const entry = this.data.entries[key];
    if (!entry) return null;
    const age = Date.now() - new Date(entry.cachedAt).getTime();
    if (age > this.ttlMs) {
      delete this.data.entries[key];
      this.dirty = true;
      return null;
    }
    return entry.value;
  }

  set(key: string, value: T): void {
    this.data.entries[key] = { value, cachedAt: new Date().toISOString() };
    this.dirty = true;
  }

  /** Write to disk only if changed. Call after a batch of operations. */
  flush(): void {
    if (!this.dirty) return;
    writeFileSync(this.filepath, JSON.stringify(this.data, null, 2));
    this.dirty = false;
  }

  stats(): { total: number; valid: number; expired: number } {
    const now = Date.now();
    let valid = 0;
    let expired = 0;
    for (const entry of Object.values(this.data.entries)) {
      if (now - new Date(entry.cachedAt).getTime() <= this.ttlMs) {
        valid++;
      } else {
        expired++;
      }
    }
    return { total: valid + expired, valid, expired };
  }
}

/** Normalize a string for use as a cache key. */
export function cacheKey(...parts: string[]): string {
  return parts
    .map((p) => p.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''))
    .join('|');
}
