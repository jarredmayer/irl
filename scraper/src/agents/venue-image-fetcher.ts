/**
 * VenueImageFetcher
 *
 * Fetches real venue photos by extracting og:image meta tags from:
 *  - Event source URLs (e.g. thebass.org → The Bass museum photo)
 *  - Instagram account website URLs (e.g. gramps.com → Gramps bar photo)
 *
 * Results are cached to avoid re-fetching on every scrape run.
 * Gracefully skips when no internet is available (sandbox / local dev).
 *
 * Integration: VenueImageFetcher runs before BrandingAgent. It returns a
 * map of { [lookupKey: string]: imageUrl } that BrandingAgent uses as tier 1.5,
 * overriding generic Unsplash fallbacks with real venue photos.
 *
 * Lookup key for non-instagram events: event.source.url (the source website)
 * Lookup key for instagram events:     "https://instagram.com/@{handle}"
 *   → fetched from the account's websiteUrl, stored under the instagram key
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { IRLEvent } from '../types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CACHE_PATH = join(__dirname, '../../cache/venue-images.json');
const CACHE_TTL_DAYS = 14;     // Re-fetch stale entries after 14 days
const MAX_FETCHES_PER_RUN = 60; // Cap to avoid long scrape times
const FETCH_TIMEOUT_MS = 8000;

interface CacheEntry {
  url: string;      // The og:image URL (empty string = confirmed no og:image)
  fetchedAt: string; // ISO timestamp
}

interface VenueImageCache {
  version: 2;
  entries: Record<string, CacheEntry>;
}

export interface InstagramAccountMeta {
  handle: string;
  websiteUrl?: string;
}

export class VenueImageFetcher {
  private cache: VenueImageCache;

  constructor() {
    this.cache = this.loadCache();
  }

  private loadCache(): VenueImageCache {
    try {
      if (existsSync(CACHE_PATH)) {
        const raw = JSON.parse(readFileSync(CACHE_PATH, 'utf-8'));
        // Migrate from version 1
        if (raw.version === 1 && raw.images) {
          return {
            version: 2,
            entries: Object.fromEntries(
              Object.entries(raw.images as Record<string, { url: string; fetchedAt: string }>)
                .map(([k, v]) => [k, v])
            ),
          };
        }
        return raw as VenueImageCache;
      }
    } catch {}
    return { version: 2, entries: {} };
  }

  private saveCache(): void {
    try {
      mkdirSync(dirname(CACHE_PATH), { recursive: true });
      writeFileSync(CACHE_PATH, JSON.stringify(this.cache, null, 2));
    } catch (e) {
      console.error('[VenueImageFetcher] Failed to save cache:', e);
    }
  }

  private isFresh(entry: CacheEntry | undefined): boolean {
    if (!entry) return false;
    const cutoff = Date.now() - CACHE_TTL_DAYS * 24 * 60 * 60 * 1000;
    return new Date(entry.fetchedAt).getTime() > cutoff;
  }

  /**
   * Build a map of lookupKey → imageUrl.
   *
   * For non-instagram events: lookupKey = event.source.url
   * For instagram events:     lookupKey = "https://instagram.com/@{handle}"
   *   (fetched from instagramAccounts[].websiteUrl)
   */
  async buildImageMap(
    events: IRLEvent[],
    instagramAccounts: InstagramAccountMeta[] = []
  ): Promise<Record<string, string>> {
    // ── Collect all fetch jobs ────────────────────────────────────────────────
    type FetchJob = { fetchUrl: string; storeKey: string };
    const jobs: FetchJob[] = [];
    const seenKeys = new Set<string>();

    // Non-instagram event source URLs
    for (const event of events) {
      const url = event.source?.url;
      if (!url || url.includes('instagram.com') || seenKeys.has(url)) continue;
      seenKeys.add(url);
      if (!this.isFresh(this.cache.entries[url])) {
        jobs.push({ fetchUrl: url, storeKey: url });
      }
    }

    // Instagram account website URLs → stored under instagram source key
    for (const account of instagramAccounts) {
      if (!account.websiteUrl) continue;
      const storeKey = `https://instagram.com/@${account.handle}`;
      if (seenKeys.has(storeKey) || this.isFresh(this.cache.entries[storeKey])) continue;
      seenKeys.add(storeKey);
      jobs.push({ fetchUrl: account.websiteUrl, storeKey });
    }

    // ── Fetch (with cap) ──────────────────────────────────────────────────────
    const toFetch = jobs.slice(0, MAX_FETCHES_PER_RUN);
    const deferred = jobs.length - toFetch.length;

    if (toFetch.length > 0) {
      console.log(
        `\n🖼  VenueImageFetcher: fetching og:images for ${toFetch.length} venues` +
          (deferred > 0 ? ` (${deferred} deferred to next run)` : '') +
          '...'
      );

      let fetched = 0;
      let skipped = 0;
      const now = new Date().toISOString();

      for (const job of toFetch) {
        try {
          const imgUrl = await this.fetchOgImage(job.fetchUrl);
          this.cache.entries[job.storeKey] = { url: imgUrl ?? '', fetchedAt: now };
          if (imgUrl) fetched++;
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e);
          // Check both message and nested cause (undici wraps DNS errors as TypeError('fetch failed'))
          const causeCode = (e as { cause?: { code?: string } }).cause?.code ?? '';
          const causeMsg = (e as { cause?: { message?: string } }).cause?.message ?? '';
          const isOffline =
            msg.includes('EAI_AGAIN') ||
            msg.includes('ENOTFOUND') ||
            msg.includes('ECONNREFUSED') ||
            msg.includes('abort') ||
            msg.includes('timeout') ||
            causeCode.includes('EAI_AGAIN') ||
            causeCode.includes('ENOTFOUND') ||
            causeCode.includes('ECONNREFUSED') ||
            causeMsg.includes('EAI_AGAIN') ||
            causeMsg.includes('ENOTFOUND') ||
            msg === 'fetch failed'; // undici generic wrapper for all network errors
          if (!isOffline) {
            console.error(`  [VenueImageFetcher] ${job.fetchUrl}: ${msg}`);
          }
          // Don't cache offline failures — retry next run when internet is available
          if (!isOffline) {
            this.cache.entries[job.storeKey] = { url: '', fetchedAt: now };
          }
          skipped++;
        }
      }

      if (fetched > 0 || (skipped > 0 && skipped < toFetch.length)) {
        console.log(`   ✓ ${fetched} real venue images found, ${skipped} skipped`);
      } else if (skipped === toFetch.length) {
        console.log(`   ⚠ No internet — using cached venue images`);
      }

      this.saveCache();
    }

    // ── Return map of non-empty entries ───────────────────────────────────────
    const result: Record<string, string> = {};
    for (const [key, entry] of Object.entries(this.cache.entries)) {
      if (entry.url) result[key] = entry.url;
    }
    return result;
  }

  private async fetchOgImage(pageUrl: string): Promise<string | null> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const response = await fetch(pageUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
        },
        redirect: 'follow',
      });

      if (!response.ok) return null;

      // Read only the <head> to avoid fetching large HTML bodies
      const reader = response.body?.getReader();
      if (!reader) return null;

      let html = '';
      const headEndRe = /<\/head>/i;
      const maxBytes = 30_000; // Read up to 30 KB looking for og:image

      while (html.length < maxBytes) {
        const { done, value } = await reader.read();
        if (done) break;
        html += new TextDecoder().decode(value);
        if (headEndRe.test(html)) break;
      }
      reader.cancel().catch(() => {});

      // Extract og:image (two attribute orderings)
      const match =
        html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ??
        html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);

      if (!match?.[1]) return null;

      const imgUrl = match[1].trim();
      if (!imgUrl) return null;

      // Resolve relative URLs
      if (imgUrl.startsWith('//')) return `https:${imgUrl}`;
      if (imgUrl.startsWith('/')) {
        try {
          const base = new URL(pageUrl);
          return `${base.origin}${imgUrl}`;
        } catch {
          return null;
        }
      }
      return imgUrl;
    } finally {
      clearTimeout(timer);
    }
  }
}
