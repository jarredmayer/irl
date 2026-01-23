/**
 * IRL Event Scraper
 * Main entry point with delta loading support
 */

import { writeFileSync, readFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { EventAggregator } from './aggregator.js';
import type { IRLEvent } from './types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

interface DeltaReport {
  added: { id: string; title: string; date: string }[];
  removed: { id: string; title: string; date: string }[];
  modified: { id: string; title: string; changes: string[] }[];
  unchanged: number;
}

/**
 * Load existing events from disk
 */
function loadExistingEvents(dataDir: string): IRLEvent[] {
  const combinedPath = join(dataDir, 'events.json');
  if (existsSync(combinedPath)) {
    try {
      const content = readFileSync(combinedPath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return [];
    }
  }
  return [];
}

/**
 * Calculate delta between old and new events
 */
function calculateDelta(oldEvents: IRLEvent[], newEvents: IRLEvent[]): DeltaReport {
  const oldMap = new Map(oldEvents.map(e => [e.id, e]));
  const newMap = new Map(newEvents.map(e => [e.id, e]));

  const added: DeltaReport['added'] = [];
  const removed: DeltaReport['removed'] = [];
  const modified: DeltaReport['modified'] = [];
  let unchanged = 0;

  // Find added and modified events
  for (const [id, newEvent] of newMap) {
    const oldEvent = oldMap.get(id);
    if (!oldEvent) {
      added.push({
        id,
        title: newEvent.title,
        date: newEvent.startAt.slice(0, 10),
      });
    } else {
      // Check for modifications
      const changes: string[] = [];
      if (oldEvent.title !== newEvent.title) changes.push('title');
      if (oldEvent.startAt !== newEvent.startAt) changes.push('time');
      if (oldEvent.venueName !== newEvent.venueName) changes.push('venue');
      if (oldEvent.description !== newEvent.description) changes.push('description');

      if (changes.length > 0) {
        modified.push({ id, title: newEvent.title, changes });
      } else {
        unchanged++;
      }
    }
  }

  // Find removed events (but only count non-past events)
  const now = new Date();
  for (const [id, oldEvent] of oldMap) {
    if (!newMap.has(id)) {
      const eventDate = new Date(oldEvent.startAt);
      // Only count as removed if the event was in the future
      if (eventDate >= now) {
        removed.push({
          id,
          title: oldEvent.title,
          date: oldEvent.startAt.slice(0, 10),
        });
      }
    }
  }

  return { added, removed, modified, unchanged };
}

/**
 * Print delta report
 */
function printDeltaReport(delta: DeltaReport): void {
  console.log('\n📊 Delta Report:');
  console.log(`   ➕ Added: ${delta.added.length} events`);
  if (delta.added.length > 0 && delta.added.length <= 10) {
    delta.added.forEach(e => console.log(`      • ${e.title} (${e.date})`));
  } else if (delta.added.length > 10) {
    delta.added.slice(0, 5).forEach(e => console.log(`      • ${e.title} (${e.date})`));
    console.log(`      ... and ${delta.added.length - 5} more`);
  }

  console.log(`   ➖ Removed: ${delta.removed.length} events`);
  if (delta.removed.length > 0 && delta.removed.length <= 10) {
    delta.removed.forEach(e => console.log(`      • ${e.title} (${e.date})`));
  } else if (delta.removed.length > 10) {
    delta.removed.slice(0, 5).forEach(e => console.log(`      • ${e.title} (${e.date})`));
    console.log(`      ... and ${delta.removed.length - 5} more`);
  }

  console.log(`   📝 Modified: ${delta.modified.length} events`);
  if (delta.modified.length > 0 && delta.modified.length <= 5) {
    delta.modified.forEach(e => console.log(`      • ${e.title} (${e.changes.join(', ')})`));
  }

  console.log(`   ✓ Unchanged: ${delta.unchanged} events`);
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  IRL Event Scraper - Miami / Fort Lauderdale');
  console.log('═══════════════════════════════════════════════════════════');

  const isTest = process.argv.includes('--test');
  const startTime = Date.now();
  const dataDir = join(__dirname, '../../src/data');

  try {
    // Run aggregator
    const aggregator = new EventAggregator();
    const { events, results, stats } = await aggregator.aggregate();

    // Print stats
    console.log('═══════════════════════════════════════════════════════════');
    console.log('  RESULTS');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`  Total events scraped: ${stats.total}`);
    console.log(`  After deduplication: ${stats.deduplicated}`);
    console.log('');
    console.log('  By source:');
    for (const [source, count] of Object.entries(stats.bySource)) {
      console.log(`    - ${source}: ${count}`);
    }

    // Check for errors
    const errors = results.filter((r) => r.errors.length > 0);
    if (errors.length > 0) {
      console.log('');
      console.log('  ⚠️  Errors encountered:');
      for (const result of errors) {
        console.log(`    - ${result.source}: ${result.errors.join(', ')}`);
      }
    }

    // Split events by city
    const miamiEvents = events.filter((e) => e.city === 'Miami');
    const fllEvents = events.filter((e) => e.city === 'Fort Lauderdale');

    console.log('');
    console.log(`  Miami events: ${miamiEvents.length}`);
    console.log(`  Fort Lauderdale events: ${fllEvents.length}`);

    // Calculate and print delta
    const existingEvents = loadExistingEvents(dataDir);
    if (existingEvents.length > 0) {
      const delta = calculateDelta(existingEvents, events);
      printDeltaReport(delta);
    }

    // Save output
    if (!isTest) {

      // Ensure directory exists
      if (!existsSync(dataDir)) {
        mkdirSync(dataDir, { recursive: true });
      }

      // Save Miami events
      const miamiPath = join(dataDir, 'events.miami.json');
      writeFileSync(miamiPath, JSON.stringify(miamiEvents, null, 2));
      console.log(`\n  ✅ Saved ${miamiEvents.length} Miami events to ${miamiPath}`);

      // Save Fort Lauderdale events
      const fllPath = join(dataDir, 'events.fll.json');
      writeFileSync(fllPath, JSON.stringify(fllEvents, null, 2));
      console.log(`  ✅ Saved ${fllEvents.length} Fort Lauderdale events to ${fllPath}`);

      // Save combined events
      const combinedPath = join(dataDir, 'events.json');
      writeFileSync(combinedPath, JSON.stringify(events, null, 2));
      console.log(`  ✅ Saved ${events.length} combined events to ${combinedPath}`);

      // Save scrape metadata with delta info
      const metaPath = join(dataDir, 'scrape-meta.json');
      const delta = existingEvents.length > 0
        ? calculateDelta(existingEvents, events)
        : { added: [], removed: [], modified: [], unchanged: 0 };
      const meta = {
        scrapedAt: new Date().toISOString(),
        stats,
        delta: {
          added: delta.added.length,
          removed: delta.removed.length,
          modified: delta.modified.length,
          unchanged: delta.unchanged,
        },
        sources: results.map((r) => ({
          name: r.source,
          count: r.events.length,
          errors: r.errors,
        })),
      };
      writeFileSync(metaPath, JSON.stringify(meta, null, 2));
      console.log(`  ✅ Saved metadata to ${metaPath}`);
    } else {
      console.log('\n  🧪 Test mode - no files saved');

      // Print sample events
      console.log('\n  Sample events:');
      events.slice(0, 3).forEach((event, i) => {
        console.log(`\n  ${i + 1}. ${event.title}`);
        console.log(`     📅 ${event.startAt}`);
        console.log(`     📍 ${event.venueName || event.neighborhood}`);
        console.log(`     🏷️  ${event.tags.join(', ')}`);
      });
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n═══════════════════════════════════════════════════════════`);
    console.log(`  Completed in ${duration}s`);
    console.log(`═══════════════════════════════════════════════════════════\n`);
  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  }
}

main();
