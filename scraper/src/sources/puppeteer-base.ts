/**
 * Puppeteer Base Scraper
 * For scraping JavaScript-rendered websites
 */

import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import type { Browser, Page } from 'puppeteer';
import { BaseScraper } from './base.js';
import type { RawEvent } from '../types.js';

// Add stealth plugin to avoid detection
puppeteer.use(StealthPlugin());

export abstract class PuppeteerScraper extends BaseScraper {
  protected browser: Browser | null = null;
  protected page: Page | null = null;

  /**
   * Initialize browser instance
   */
  protected async initBrowser(): Promise<void> {
    if (this.browser) return;

    this.log('Launching headless browser...');
    this.browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1920,1080',
      ],
    });

    this.page = await this.browser.newPage();

    // Set viewport (puppeteer-extra v3 may not proxy this on newer Puppeteer)
    if (typeof this.page.setViewport === 'function') {
      await this.page.setViewport({ width: 1920, height: 1080 });
    }

    // Set user agent (puppeteer-extra v3 may not proxy this on newer Puppeteer)
    if (typeof this.page.setUserAgent === 'function') {
      await this.page.setUserAgent(this.userAgent);
    }

    // Block unnecessary resources for faster loading
    // (puppeteer-extra v3 may not proxy setRequestInterception on newer Puppeteer)
    if (typeof this.page.setRequestInterception === 'function') {
      await this.page.setRequestInterception(true);
      this.page.on('request', (req) => {
        const resourceType = req.resourceType();
        if (['image', 'stylesheet', 'font', 'media'].includes(resourceType)) {
          req.abort();
        } else {
          req.continue();
        }
      });
    }
  }

  /**
   * Close browser instance
   */
  protected async closeBrowser(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
    }
  }

  /**
   * Navigate to a URL and wait for content to load
   */
  protected async navigateTo(url: string, waitSelector?: string): Promise<void> {
    if (!this.page) throw new Error('Browser not initialized');

    this.log(`Navigating to ${url}...`);
    await this.page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });

    if (waitSelector) {
      await this.page.waitForSelector(waitSelector, { timeout: 10000 });
    }
  }

  /**
   * Scroll page to load lazy content
   */
  protected async scrollPage(scrolls: number = 3): Promise<void> {
    if (!this.page) return;

    for (let i = 0; i < scrolls; i++) {
      await this.page.evaluate(() => {
        window.scrollBy(0, window.innerHeight);
      });
      await this.sleep(500);
    }

    // Scroll back to top
    await this.page.evaluate(() => {
      window.scrollTo(0, 0);
    });
  }

  /**
   * Get page HTML content
   */
  protected async getPageContent(): Promise<string> {
    if (!this.page) throw new Error('Browser not initialized');
    // puppeteer-extra v3 doesn't proxy all Page methods in Puppeteer v24
    if (typeof this.page.content !== 'function') {
      return await this.page.evaluate(() => document.documentElement.outerHTML);
    }
    return await this.page.content();
  }

  /**
   * Extract data using page.evaluate
   */
  protected async extractData<T>(fn: () => T): Promise<T> {
    if (!this.page) throw new Error('Browser not initialized');
    return await this.page.evaluate(fn);
  }

  /**
   * Click an element
   */
  protected async click(selector: string): Promise<void> {
    if (!this.page) return;
    await this.page.click(selector);
  }

  /**
   * Override scrape to ensure browser cleanup.
   * Gracefully handles missing Chrome — returns empty instead of crashing the aggregator.
   */
  async scrape(): Promise<RawEvent[]> {
    try {
      await this.initBrowser();
      return await this.scrapeWithBrowser();
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.includes('Could not find') && msg.includes('Chrome')) {
        this.log('⚠ Chrome not installed — run: npx puppeteer browsers install chrome');
        return [];
      }
      throw error;
    } finally {
      await this.closeBrowser();
    }
  }

  /**
   * Implement actual scraping logic in subclasses
   */
  protected abstract scrapeWithBrowser(): Promise<RawEvent[]>;
}
