#!/usr/bin/env npx tsx
/**
 * Location Verification Script
 * Verifies that all venue coordinates match their addresses
 *
 * Usage: npx tsx src/verify-locations.ts [--fix]
 *
 * Options:
 *   --fix    Generate a patch file with corrected coordinates
 */

import * as fs from 'fs';
import * as path from 'path';
import { batchVerifyLocations, extractUniqueVenues, type VerificationResult } from './geocoding.js';

const DATA_DIR = path.join(process.cwd(), '..', 'src', 'data');

interface EventData {
  id: string;
  title: string;
  venueName?: string;
  address?: string;
  lat: number | null;
  lng: number | null;
}

async function main() {
  const shouldFix = process.argv.includes('--fix');

  console.log('🔍 Loading event data...');

  // Load all event files
  const miamiEvents: EventData[] = JSON.parse(
    fs.readFileSync(path.join(DATA_DIR, 'events.miami.json'), 'utf8')
  );
  const fllEvents: EventData[] = JSON.parse(
    fs.readFileSync(path.join(DATA_DIR, 'events.fll.json'), 'utf8')
  );

  const allEvents = [...miamiEvents, ...fllEvents];
  console.log(`   Loaded ${allEvents.length} events`);

  // Extract unique venues
  const venues = extractUniqueVenues(allEvents);
  console.log(`   Found ${venues.length} unique venues with coordinates`);

  // Verify locations (this will take a while due to rate limiting)
  console.log('\n⏳ This may take a few minutes due to API rate limiting...\n');
  const results = await batchVerifyLocations(venues);

  // Report issues
  const issues = results.filter((r) => !r.isValid && r.discrepancyMiles > 0);

  if (issues.length === 0) {
    console.log('\n✅ All venue locations verified successfully!');
    return;
  }

  console.log('\n\n📋 Locations with issues:');
  console.log('─'.repeat(80));

  for (const issue of issues) {
    console.log(`\n❌ ${issue.name}`);
    console.log(`   Address: ${issue.address}`);
    console.log(`   Current:  (${issue.lat.toFixed(4)}, ${issue.lng.toFixed(4)})`);
    console.log(`   Geocoded: (${issue.suggestedLat?.toFixed(4)}, ${issue.suggestedLng?.toFixed(4)})`);
    console.log(`   Distance: ${issue.discrepancyMiles.toFixed(2)} miles off`);
    if (issue.geocodedAddress) {
      console.log(`   Matched:  ${issue.geocodedAddress}`);
    }
  }

  if (shouldFix) {
    // Generate corrections map
    const corrections: Record<string, { lat: number; lng: number }> = {};
    for (const issue of issues) {
      if (issue.suggestedLat && issue.suggestedLng) {
        corrections[`${issue.name}|${issue.address}`] = {
          lat: issue.suggestedLat,
          lng: issue.suggestedLng,
        };
      }
    }

    const outputPath = path.join(process.cwd(), 'location-corrections.json');
    fs.writeFileSync(outputPath, JSON.stringify(corrections, null, 2));
    console.log(`\n📝 Corrections written to: ${outputPath}`);
    console.log('   Review and apply manually to source files.');
  } else {
    console.log('\n💡 Run with --fix to generate a corrections file');
  }
}

main().catch(console.error);
