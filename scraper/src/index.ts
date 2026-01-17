/**
 * IRL Event Scraper
 * Main entry point
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { EventAggregator } from './aggregator.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  IRL Event Scraper - Miami / Fort Lauderdale');
  console.log('═══════════════════════════════════════════════════════════');

  const isTest = process.argv.includes('--test');
  const startTime = Date.now();

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

    // Save output
    if (!isTest) {
      const dataDir = join(__dirname, '../../src/data');

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

      // Save scrape metadata
      const metaPath = join(dataDir, 'scrape-meta.json');
      const meta = {
        scrapedAt: new Date().toISOString(),
        stats,
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
