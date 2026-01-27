/**
 * Base Scraper Class
 * Common utilities for all event scrapers
 */

import * as cheerio from 'cheerio';
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

  /**
   * Make an HTTP request with rate limiting
   */
  protected async fetch(url: string, options: RequestInit = {}): Promise<Response> {
    await this.sleep(this.config.rateLimit);

    const response = await fetch(url, {
      ...options,
      headers: {
        'User-Agent': this.userAgent,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response;
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
}
