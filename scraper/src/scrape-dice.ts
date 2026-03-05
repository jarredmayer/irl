#!/usr/bin/env npx tsx
/**
 * Standalone Dice.fm scraper via Apify
 *
 * Usage: npm run scrape:dice
 *
 * Requires APIFY_TOKEN in .env
 * Fetches Dice.fm Miami events via the Apify actor, deduplicates against
 * existing events in events.miami.json, and merges new events in.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { DiceRealScraper } from './sources/dice-scraper.js';

// Load .env
try { process.loadEnvFile(); } catch { /* no .env file */ }

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  const token = process.env.APIFY_TOKEN;
  if (!token) {
    console.error('ERROR: APIFY_TOKEN is not set.');
    console.error('Set it in your .env file or environment:');
    console.error('  APIFY_TOKEN=apify_api_your_token_here');
    process.exit(1);
  }

  console.log('=== Dice.fm Scraper (Apify) ===\n');

  // 1. Scrape events
  const scraper = new DiceRealScraper();
  const newEvents = await scraper.scrape();

  if (newEvents.length === 0) {
    console.log('\nNo events found. Exiting.');
    return;
  }

  console.log(`\nScraped ${newEvents.length} events from Dice.fm\n`);

  // 2. Load existing events
  const eventsPath = join(__dirname, '../../src/data/events.miami.json');
  let existing: any[] = [];
  if (existsSync(eventsPath)) {
    try {
      existing = JSON.parse(readFileSync(eventsPath, 'utf-8'));
      console.log(`Loaded ${existing.length} existing events from events.miami.json`);
    } catch {
      console.warn('Could not parse events.miami.json, starting fresh');
    }
  }

  // 3. Deduplicate using title + date + venue composite key
  const makeKey = (e: { title?: string; startAt?: string; venueName?: string }) =>
    `${(e.title || '').toLowerCase().trim()}|${(e.startAt || '').slice(0, 10)}|${(e.venueName || '').toLowerCase().trim()}`;

  const existingKeys = new Set(existing.map(makeKey));

  let added = 0;
  let skipped = 0;

  for (const event of newEvents) {
    const key = makeKey(event);
    if (existingKeys.has(key)) {
      skipped++;
      continue;
    }

    // Convert RawEvent to a minimal IRLEvent-compatible shape
    const irlEvent = {
      id: `dice-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title: event.title,
      startAt: event.startAt,
      endAt: event.endAt,
      timezone: 'America/New_York',
      venueName: event.venueName,
      address: event.address,
      neighborhood: event.neighborhood || 'Miami',
      lat: event.lat ?? null,
      lng: event.lng ?? null,
      city: event.city,
      tags: event.tags,
      category: event.category,
      priceLabel: event.priceLabel,
      priceAmount: event.priceAmount,
      ticketUrl: event.ticketUrl,
      isOutdoor: event.isOutdoor,
      shortWhy: `${event.title} at ${event.venueName || 'a Miami venue'}`,
      editorialWhy: event.description,
      description: event.description,
      source: {
        name: event.sourceName,
        url: event.sourceUrl || '',
      },
      image: event.image,
      editorPick: false,
      addedAt: new Date().toISOString(),
    };

    existing.push(irlEvent);
    existingKeys.add(key);
    added++;
  }

  console.log(`\nResults:`);
  console.log(`  Added:   ${added}`);
  console.log(`  Skipped: ${skipped} (duplicates)`);

  // 4. Save merged events
  if (added > 0) {
    writeFileSync(eventsPath, JSON.stringify(existing, null, 2) + '\n');
    console.log(`\nSaved ${existing.length} total events to events.miami.json`);
  } else {
    console.log('\nNo new events to add.');
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
