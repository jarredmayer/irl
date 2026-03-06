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
   * Categorize event based on weighted keyword scoring and venue signals.
   *
   * Uses a scoring system instead of first-match-wins:
   * - Each keyword match adds weight to its category
   * - Title matches are weighted higher than description matches
   * - Known venue types provide a strong category signal
   * - Returns the category with the highest total score
   */
  protected categorize(title: string, description: string = '', venue: string = ''): string {
    const titleLower = title.toLowerCase();
    const descLower = description.toLowerCase();
    const venueLower = venue.toLowerCase();
    const allText = `${titleLower} ${descLower} ${venueLower}`;

    // Weighted keywords: [keyword, weight]
    // Higher weight = stronger signal for that category
    const categoryKeywords: Record<string, [string, number][]> = {
      Music: [
        ['concert', 3], ['live music', 3], ['jazz', 3], ['orchestra', 3],
        ['symphony', 3], ['album release', 3], ['tour', 2],
        ['music', 2], ['dj', 2], ['band', 2], ['singer', 2], ['rapper', 2],
        ['performance', 1], ['show', 1], ['vinyl', 1], ['hip hop', 2],
        ['r&b', 2], ['reggaeton', 2], ['salsa music', 2], ['rock', 1],
        ['acoustic', 2], ['songwriter', 2],
      ],
      Art: [
        ['art exhibition', 3], ['gallery opening', 3], ['art gallery', 3],
        ['museum exhibit', 3], ['sculpture', 2], ['installation', 2],
        ['art', 1], ['gallery', 2], ['exhibition', 2], ['museum', 2],
        ['opening reception', 2], ['mural', 2], ['photography exhibit', 3],
      ],
      Culture: [
        ['theater', 2], ['theatre', 2], ['ballet', 3], ['opera', 3],
        ['film screening', 3], ['cinema', 2], ['dance performance', 3],
        ['culture', 1], ['dance', 1], ['film', 1], ['play', 1],
        ['musical', 2], ['spoken word', 2], ['poetry', 2],
      ],
      'Food & Drink': [
        ['tasting', 2], ['chef', 2], ['wine tasting', 3], ['beer festival', 3],
        ['food festival', 3], ['brunch', 2], ['cocktail', 1], ['dining', 2],
        ['food', 1], ['drink', 1], ['wine', 1], ['beer', 1],
        ['restaurant', 1], ['market', 1], ['distillery', 2], ['brewery', 2],
      ],
      Fitness: [
        ['fitness', 2], ['yoga', 3], ['pilates', 3], ['run club', 3],
        ['running', 2], ['cycling', 2], ['workout', 2], ['bootcamp', 3],
        ['training', 1], ['gym', 1], ['crossfit', 3], ['5k', 3],
        ['marathon', 3],
      ],
      Wellness: [
        ['wellness retreat', 3], ['meditation', 3], ['mindfulness', 3],
        ['breathwork', 3], ['sound bath', 3],
        ['wellness', 2], ['spa', 2], ['healing', 1],
      ],
      Sports: [
        ['nba', 4], ['nfl', 4], ['mlb', 4], ['mls', 4], ['nhl', 4], ['f1', 4],
        ['basketball', 3], ['hockey', 3], ['football', 3], ['baseball', 3],
        ['soccer', 3], ['tennis', 3],
        ['hurricanes', 3], ['panthers', 3], ['heat', 2], ['dolphins', 3],
        ['marlins', 3], ['inter miami', 4],
        [' vs ', 3], [' vs.', 3],
        ['championship', 2], ['tournament', 2], ['match', 1],
        ['sport', 1], ['game day', 2], ['playoffs', 3],
      ],
      Comedy: [
        ['comedy show', 3], ['stand-up', 3], ['standup', 3], ['improv', 3],
        ['comedy', 2], ['comedian', 3], ['laugh', 1], ['comic', 1],
      ],
      Family: [
        ['family-friendly', 3], ['kids', 2], ['children', 2],
        ['family', 1], ['circus', 2], ['ringling', 3],
      ],
      Community: [
        ['community', 1], ['social', 1], ['networking', 1],
        ['meetup', 2], ['farmers market', 2], ['volunteer', 2],
      ],
      Nightlife: [
        ['nightclub', 3], ['afterhours', 3], ['after hours', 3],
        ['nightlife', 2], ['club night', 3], ['party', 1], ['night', 0.5],
      ],
      Outdoors: [
        ['outdoor', 1], ['park', 1], ['beach', 1], ['garden', 1],
        ['nature', 2], ['hike', 3], ['kayak', 3], ['paddleboard', 3],
      ],
    };

    // Known venue types — provides a strong category signal
    const venueCategories: [string, string, number][] = [
      // Concert halls / music venues → Music
      ['fillmore', 'Music', 3], ['adrienne arsht', 'Music', 3],
      ['the ground', 'Music', 2], ['lagniappe', 'Music', 2],
      ['gramps', 'Music', 2], ['churchill', 'Music', 2],
      ['do not sit', 'Music', 2], ['floyd', 'Music', 2],
      ['broward center', 'Music', 2], ['kravis center', 'Music', 2],

      // Arenas / stadiums → Sports (but also Music for concerts)
      ['kaseya center', 'Sports', 2], ['hard rock stadium', 'Sports', 2],
      ['loandepot park', 'Sports', 2], ['chase stadium', 'Sports', 2],
      ['inter miami', 'Sports', 2], ['fla live arena', 'Sports', 2],
      ['amerant bank arena', 'Sports', 2],

      // Clubs → Nightlife
      ['club space', 'Nightlife', 2], ['e11even', 'Nightlife', 3],
      ['liv', 'Nightlife', 2], ['basement', 'Nightlife', 2],
      ['treehouse', 'Nightlife', 2], ['do not sit', 'Nightlife', 1],

      // Museums / galleries → Art
      ['pamm', 'Art', 3], ['perez art museum', 'Art', 3],
      ['ica miami', 'Art', 3], ['de la cruz', 'Art', 3],
      ['nsu art museum', 'Art', 3], ['norton museum', 'Art', 3],
      ['bass museum', 'Art', 3], ['wynwood walls', 'Art', 2],
      ['rubell', 'Art', 3], ['lowe art museum', 'Art', 3],

      // Theaters → Culture
      ['o cinema', 'Culture', 3], ['coral gables art cinema', 'Culture', 3],
      ['actors playhouse', 'Culture', 3], ['arsht center', 'Culture', 2],

      // Comedy venues → Comedy
      ["don't tell comedy", 'Comedy', 3], ['the improv', 'Comedy', 3],
      ['comedy', 'Comedy', 1],
    ];

    const scores: Record<string, number> = {};

    // Initialize scores
    for (const category of Object.keys(categoryKeywords)) {
      scores[category] = 0;
    }

    // Score keyword matches with title weighting
    for (const [category, keywords] of Object.entries(categoryKeywords)) {
      for (const [keyword, weight] of keywords) {
        // Title matches are worth 2x
        if (titleLower.includes(keyword)) {
          scores[category] += weight * 2;
        }
        // Description matches at base weight
        if (descLower.includes(keyword)) {
          scores[category] += weight;
        }
      }
    }

    // Apply venue-based category signals
    if (venueLower) {
      for (const [venueName, category, weight] of venueCategories) {
        if (venueLower.includes(venueName)) {
          scores[category] += weight;
        }
      }
    }

    // Special case: arena/stadium venues with concert keywords → boost Music
    // (e.g., "Rosalia concert at Kaseya Center" should be Music, not Sports)
    const arenaVenues = ['kaseya center', 'hard rock stadium', 'fla live arena', 'amerant bank arena'];
    const isAtArena = arenaVenues.some((v) => venueLower.includes(v));
    if (isAtArena) {
      const musicSignals = ['concert', 'tour', 'live', 'singer', 'band', 'music', 'album', 'dj'];
      const hasMusicSignal = musicSignals.some((s) => titleLower.includes(s) || descLower.includes(s));
      if (hasMusicSignal) {
        scores['Music'] += 5; // Strong boost for concerts at arenas
      }
    }

    // Find the category with the highest score
    let bestCategory = 'Community';
    let bestScore = 0;
    for (const [category, score] of Object.entries(scores)) {
      if (score > bestScore) {
        bestScore = score;
        bestCategory = category;
      }
    }

    return bestCategory;
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
   * Fetch HTML using Node.js built-in fetch (undici).
   * More reliable than raw https module for DNS/TLS edge cases.
   * Automatically handles compression, redirects, and timeouts.
   */
  protected async fetchHTMLFetch(url: string, timeoutMs = 15_000): Promise<cheerio.CheerioAPI> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
        },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      const html = await res.text();
      return cheerio.load(html);
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * POST JSON using Node.js built-in fetch (undici).
   * More reliable than raw https.request for API calls.
   */
  protected async fetchJSONFetch<T>(url: string, body: string, headers: Record<string, string> = {}, timeoutMs = 15_000): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': this.userAgent,
          ...headers,
        },
        body,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      return await res.json() as T;
    } finally {
      clearTimeout(timer);
    }
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
