/**
 * Base Scraper Class
 * Common utilities for all event scrapers
 */

import * as cheerio from 'cheerio';
import * as https from 'https';
import * as http from 'http';
import { promises as dnsPromises, Resolver } from 'dns';
import type { RawEvent, SourceConfig } from '../types.js';

export abstract class BaseScraper {
  protected name: string;
  protected config: SourceConfig;
  protected userAgent =
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

  constructor(name: string, config: Partial<SourceConfig> = {}) {
    this.name = name;
    this.config = {
      name,
      enabled: true,
      weight: 1.0,
      rateLimit: 1000,
      ...config,
    };
  }

  /**
   * Fetch events from this source
   */
  abstract scrape(): Promise<RawEvent[]>;

  /** Max retries for transient network errors */
  private static MAX_RETRIES = 3;
  /** Per-request timeout in ms */
  private static REQUEST_TIMEOUT_MS = 15_000;

  /**
   * Make an HTTP request with rate limiting, timeout, and retry
   */
  protected async fetch(url: string, options: RequestInit = {}): Promise<Response> {
    await this.sleep(this.config.rateLimit);

    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= BaseScraper.MAX_RETRIES; attempt++) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), BaseScraper.REQUEST_TIMEOUT_MS);

      try {
        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
          headers: {
            'User-Agent': this.userAgent,
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            ...options.headers,
          },
        });

        clearTimeout(timeout);

        // Retry on server errors (502, 503, 429)
        if (response.status === 429 || response.status === 502 || response.status === 503) {
          lastError = new Error(`HTTP ${response.status}: ${response.statusText}`);
          if (attempt < BaseScraper.MAX_RETRIES) {
            const delay = Math.pow(2, attempt) * 1000; // 2s, 4s
            this.log(`  ↻ ${response.status} on attempt ${attempt}, retrying in ${delay / 1000}s...`);
            await this.sleep(delay);
            continue;
          }
          throw lastError;
        }

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return response;
      } catch (error) {
        clearTimeout(timeout);
        lastError = error instanceof Error ? error : new Error(String(error));

        // Only retry on transient network errors (DNS, timeout, connection reset)
        const isTransient =
          lastError.name === 'AbortError' ||
          lastError.message.includes('fetch failed') ||
          lastError.message.includes('ECONNRESET') ||
          lastError.message.includes('ETIMEDOUT') ||
          lastError.message.includes('EAI_AGAIN') ||
          lastError.message.includes('ENOTFOUND') ||
          lastError.message.includes('socket hang up');

        if (isTransient && attempt < BaseScraper.MAX_RETRIES) {
          const delay = Math.pow(2, attempt) * 1000;
          this.log(`  ↻ Network error on attempt ${attempt}, retrying in ${delay / 1000}s...`);
          await this.sleep(delay);
          continue;
        }

        throw lastError;
      }
    }

    throw lastError || new Error('fetch failed after retries');
  }

  /**
   * Fetch and parse HTML
   */
  protected async fetchHTML(url: string): Promise<cheerio.CheerioAPI> {
    const response = await this.fetch(url);
    const html = await response.text();
    return cheerio.load(html);
  }

  /**
   * Fetch JSON data
   */
  protected async fetchJSON<T>(url: string): Promise<T> {
    const response = await this.fetch(url, {
      headers: {
        Accept: 'application/json',
      },
    });
    return response.json() as Promise<T>;
  }

  /**
   * Sleep for rate limiting
   */
  protected sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Clean text content
   */
  protected cleanText(text: string | undefined | null): string {
    if (!text) return '';
    return text
      .replace(/\s+/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ')
      .trim();
  }

  /**
   * Parse price from text
   */
  protected parsePrice(text: string): { label: 'Free' | '$' | '$$' | '$$$'; amount: number } {
    const lower = text.toLowerCase();

    if (lower.includes('free') || lower.includes('$0')) {
      return { label: 'Free', amount: 0 };
    }

    // Extract numeric price
    const match = text.match(/\$(\d+)/);
    if (match) {
      const amount = parseInt(match[1], 10);
      if (amount === 0) return { label: 'Free', amount: 0 };
      if (amount <= 25) return { label: '$', amount };
      if (amount <= 75) return { label: '$$', amount };
      return { label: '$$$', amount };
    }

    return { label: '$', amount: 0 };
  }

  /**
   * Categorize event based on keywords
   */
  protected categorize(title: string, description: string = '', venue: string = ''): string {
    const text = `${title} ${description} ${venue}`.toLowerCase();

    const categoryKeywords: Record<string, string[]> = {
      Music: ['concert', 'music', 'dj', 'band', 'live music', 'performance', 'show', 'jazz', 'vinyl'],
      Art: ['art', 'gallery', 'exhibition', 'museum', 'opening'],
      Culture: ['culture', 'theater', 'theatre', 'dance', 'ballet', 'film', 'cinema'],
      'Food & Drink': ['food', 'drink', 'wine', 'beer', 'cocktail', 'dining', 'restaurant', 'brunch', 'tasting', 'chef', 'market'],
      Fitness: ['fitness', 'yoga', 'pilates', 'running', 'cycling', 'workout', 'training', 'gym', 'run club', 'bootcamp'],
      Wellness: ['wellness', 'meditation', 'mindfulness', 'spa', 'healing', 'breathwork'],
      Sports: ['sport', 'game', 'match', 'tournament', 'championship', 'nba', 'nfl', 'mlb', 'mls', 'nhl', 'f1', 'basketball', 'hockey', 'football', 'baseball', 'soccer', 'hurricanes', 'panthers', 'heat', 'dolphins', 'marlins', 'inter miami', ' vs ', ' vs.'],
      Comedy: ['comedy', 'stand-up', 'improv', 'laugh'],
      Family: ['family', 'kids', 'children', 'family-friendly', 'circus', 'ringling'],
      Community: ['community', 'social', 'networking', 'meetup', 'farmers market'],
      Nightlife: ['nightlife', 'club', 'party', 'night'],
      Outdoors: ['outdoor', 'park', 'beach', 'garden', 'nature', 'hike'],
    };

    for (const [category, keywords] of Object.entries(categoryKeywords)) {
      if (keywords.some((keyword) => text.includes(keyword))) {
        return category;
      }
    }

    return 'Community';
  }

  /**
   * Generate tags from event content
   */
  protected generateTags(title: string, description: string = '', category: string): string[] {
    const text = `${title} ${description}`.toLowerCase();
    const tags: string[] = [];

    const tagKeywords: Record<string, string[]> = {
      'live-music': ['live music', 'live band', 'concert'],
      dj: ['dj', 'vinyl', 'spinning'],
      'happy-hour': ['happy hour'],
      brunch: ['brunch'],
      rooftop: ['rooftop'],
      waterfront: ['waterfront', 'bay', 'ocean', 'marina'],
      'art-gallery': ['gallery', 'exhibition'],
      museum: ['museum'],
      theater: ['theater', 'theatre'],
      comedy: ['comedy', 'stand-up'],
      yoga: ['yoga'],
      running: ['run', 'running', 'marathon', '5k'],
      cycling: ['cycling', 'bike', 'critical mass'],
      beach: ['beach'],
      park: ['park'],
      'food-market': ['farmers market', 'food market', 'smorgasburg'],
      'wine-tasting': ['wine tasting', 'wine'],
      'craft-beer': ['craft beer', 'brewery'],
      cocktails: ['cocktails', 'mixology'],
      dancing: ['dancing', 'dance party', 'salsa'],
      latin: ['latin', 'salsa', 'bachata', 'reggaeton'],
      jazz: ['jazz'],
      electronic: ['electronic', 'techno', 'house music'],
      'outdoor-dining': ['outdoor dining', 'patio'],
      sunset: ['sunset'],
      'family-friendly': ['family', 'kids', 'children'],
      'dog-friendly': ['dog friendly', 'dogs welcome'],
      'free-event': ['free'],
      networking: ['networking', 'professional'],
      workshop: ['workshop', 'class'],
      meditation: ['meditation', 'mindfulness'],
      'local-favorite': ['local favorite'],
    };

    for (const [tag, keywords] of Object.entries(tagKeywords)) {
      if (keywords.some((keyword) => text.includes(keyword))) {
        tags.push(tag);
      }
    }

    // Add category-based tag
    if (category === 'Music' && !tags.includes('live-music') && !tags.includes('dj')) {
      tags.push('live-music');
    }

    return tags.slice(0, 5); // Max 5 tags
  }

  /**
   * Determine if event is outdoor
   */
  protected isOutdoor(title: string, description: string = '', venue: string = ''): boolean {
    const text = `${title} ${description} ${venue}`.toLowerCase();
    const outdoorKeywords = [
      'outdoor',
      'outside',
      'park',
      'beach',
      'garden',
      'patio',
      'rooftop',
      'pool',
      'waterfront',
      'al fresco',
      'open air',
    ];
    return outdoorKeywords.some((keyword) => text.includes(keyword));
  }

  /**
   * Get source name
   */
  getSourceName(): string {
    return this.name;
  }

  /**
   * Check if scraper is enabled
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Log info message
   */
  protected log(message: string): void {
    console.log(`[${this.name}] ${message}`);
  }

  /**
   * Log error message
   */
  protected logError(message: string, error?: unknown): void {
    console.error(`[${this.name}] ERROR: ${message}`, error || '');
  }

  /**
   * Resolve a hostname with fallback to public DNS (Google 8.8.8.8, Cloudflare 1.1.1.1).
   * Fixes EAI_AGAIN errors in GitHub Actions where the default resolver can fail.
   */
  protected async resolveWithFallback(hostname: string): Promise<string | null> {
    try {
      const addresses = await dnsPromises.resolve4(hostname);
      return addresses[0] || null;
    } catch {
      try {
        const resolver = new Resolver();
        resolver.setServers(['8.8.8.8', '1.1.1.1']);
        const addresses = await new Promise<string[]>((resolve, reject) => {
          resolver.resolve4(hostname, (err, addrs) => err ? reject(err) : resolve(addrs));
        });
        return addresses[0] || null;
      } catch {
        return null;
      }
    }
  }

  /**
   * Fetch HTML using Node.js built-in https/http module instead of undici-based fetch.
   * Some sites reject connections from Node.js native fetch (undici) due to TLS
   * incompatibilities or IP-based blocking. The built-in https module uses OpenSSL
   * and behaves more like a traditional browser HTTP stack.
   */
  protected async fetchHTMLNative(url: string, timeoutMs = 10_000): Promise<string> {
    const parsed = new URL(url);

    // Pre-resolve DNS with fallback to public resolvers (fixes EAI_AGAIN in CI)
    let resolvedHost: string | null = null;
    try {
      resolvedHost = await this.resolveWithFallback(parsed.hostname);
    } catch { /* proceed with default resolution */ }

    return new Promise((resolve, reject) => {
      const mod = url.startsWith('https') ? https : http;
      const options: any = {
        headers: {
          'User-Agent': this.userAgent,
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'identity',
          Host: parsed.hostname,
        },
        ...(url.startsWith('https')
          ? { rejectUnauthorized: true, minVersion: 'TLSv1.2' as any, servername: parsed.hostname }
          : {}),
      };

      // If we resolved an IP, use it directly to bypass broken system DNS
      const fetchUrl = resolvedHost
        ? url.replace(parsed.hostname, resolvedHost)
        : url;

      const req = mod.get(
        fetchUrl,
        options,
        (res) => {
          if (
            res.statusCode &&
            res.statusCode >= 300 &&
            res.statusCode < 400 &&
            res.headers.location
          ) {
            req.destroy();
            this.fetchHTMLNative(res.headers.location, timeoutMs).then(resolve, reject);
            return;
          }
          if (res.statusCode && res.statusCode >= 400) {
            req.destroy();
            reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
            return;
          }
          const chunks: Buffer[] = [];
          res.on('data', (chunk) => chunks.push(chunk));
          res.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
          res.on('error', reject);
        },
      );
      req.setTimeout(timeoutMs, () => {
        req.destroy();
        reject(new Error('Request timed out'));
      });
      req.on('error', reject);
    });
  }

  /**
   * Fetch and parse HTML using the native https module with retry.
   * Use this instead of fetchHTML() for sites that block undici-based fetch.
   */
  protected async fetchHTMLNativeRetry(url: string, maxRetries = 2, timeoutMs = 10_000): Promise<cheerio.CheerioAPI> {
    let lastError: Error | undefined;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const html = await this.fetchHTMLNative(url, timeoutMs);
        return cheerio.load(html);
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000;
          this.log(`  ↻ Attempt ${attempt} failed (${lastError.message}), retrying in ${delay / 1000}s...`);
          await this.sleep(delay);
        }
      }
    }
    throw lastError || new Error(`Failed to fetch ${url}`);
  }

  /**
   * POST JSON using native https module and return parsed JSON response.
   * Use for APIs (like Algolia) that fail with undici-based fetch.
   */
  protected fetchJSONNative<T>(url: string, body: string, headers: Record<string, string> = {}, timeoutMs = 15_000): Promise<T> {
    return new Promise((resolve, reject) => {
      const parsed = new URL(url);
      const options: https.RequestOptions = {
        hostname: parsed.hostname,
        port: parsed.port || 443,
        path: parsed.pathname + parsed.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Content-Length': Buffer.byteLength(body),
          ...headers,
        },
        rejectUnauthorized: true,
        minVersion: 'TLSv1.2' as any,
      };

      const req = https.request(options, (res) => {
        if (res.statusCode && res.statusCode >= 400) {
          req.destroy();
          reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
          return;
        }
        const chunks: Buffer[] = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
          try {
            resolve(JSON.parse(Buffer.concat(chunks).toString('utf-8')));
          } catch (e) {
            reject(new Error('Invalid JSON response'));
          }
        });
        res.on('error', reject);
      });

      req.setTimeout(timeoutMs, () => {
        req.destroy();
        reject(new Error('Request timed out'));
      });
      req.on('error', reject);
      req.write(body);
      req.end();
    });
  }

  /**
   * Fetch JSON using native https GET.
   * Use for REST APIs that fail with undici-based fetch.
   */
  protected fetchJSONNativeGet<T>(url: string, timeoutMs = 10_000): Promise<T> {
    return new Promise((resolve, reject) => {
      const mod = url.startsWith('https') ? https : http;
      const req = mod.get(
        url,
        {
          headers: {
            'User-Agent': this.userAgent,
            Accept: 'application/json',
            'Accept-Language': 'en-US,en;q=0.5',
          },
          ...(url.startsWith('https')
            ? { rejectUnauthorized: true, minVersion: 'TLSv1.2' as any }
            : {}),
        },
        (res) => {
          if (
            res.statusCode &&
            res.statusCode >= 300 &&
            res.statusCode < 400 &&
            res.headers.location
          ) {
            req.destroy();
            this.fetchJSONNativeGet<T>(res.headers.location, timeoutMs).then(resolve, reject);
            return;
          }
          if (res.statusCode && res.statusCode >= 400) {
            req.destroy();
            reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
            return;
          }
          const chunks: Buffer[] = [];
          res.on('data', (chunk) => chunks.push(chunk));
          res.on('end', () => {
            try {
              resolve(JSON.parse(Buffer.concat(chunks).toString('utf-8')));
            } catch (e) {
              reject(new Error('Invalid JSON response'));
            }
          });
          res.on('error', reject);
        },
      );
      req.setTimeout(timeoutMs, () => {
        req.destroy();
        reject(new Error('Request timed out'));
      });
      req.on('error', reject);
    });
  }
}
