/**
 * Merge FortLauderdaleScraper template events into events.fll.json
 * Runs the scraper, converts raw events to IRLEvent format, deduplicates, and writes output.
 */
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createHash } from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Import scrapers
import { FortLauderdaleScraper } from './src/sources/fort-lauderdale.js';
import { InstagramSourcesScraper } from './src/sources/instagram-sources.js';

const dataDir = join(__dirname, '../src/data');

function generateId(event) {
  const key = `${event.title}|${event.startAt}|${event.venueName || ''}`;
  return createHash('md5').update(key).digest('hex').slice(0, 16);
}

function rawToIRL(raw) {
  const price = raw.priceAmount ?? 0;
  return {
    id: generateId(raw),
    title: raw.title,
    startAt: raw.startAt,
    timezone: 'America/New_York',
    venueName: raw.venueName || undefined,
    address: raw.address || undefined,
    neighborhood: raw.neighborhood || 'Fort Lauderdale',
    lat: raw.lat ?? null,
    lng: raw.lng ?? null,
    city: raw.city || 'Fort Lauderdale',
    tags: raw.tags || [],
    category: raw.category || 'Community',
    priceLabel: raw.priceLabel || (price === 0 ? 'Free' : price < 20 ? '$' : '$$'),
    price: price,
    ticketUrl: raw.ticketUrl || undefined,
    isOutdoor: raw.isOutdoor || false,
    shortWhy: generateShortWhy(raw),
    editorialWhy: raw.description,
    description: raw.description,
    source: raw.sourceName ? { name: raw.sourceName, url: raw.sourceUrl } : undefined,
    isRecurring: raw.recurring || false,
    seriesName: raw.recurring ? raw.title : undefined,
  };
}

function generateShortWhy(event) {
  const parts = [];
  if (event.priceLabel === 'Free' || event.priceAmount === 0) parts.push('Free');
  if ((event.tags || []).includes('live-music')) parts.push('live music');
  if ((event.tags || []).includes('local-favorite')) parts.push('local fave');
  if ((event.tags || []).includes('outdoor') || (event.tags || []).includes('beach')) parts.push('outdoors');
  if ((event.tags || []).includes('waterfront')) parts.push('waterfront views');
  if (parts.length === 0) parts.push('worth checking out');
  return parts.slice(0, 2).join(' · ') + ' in FLL.';
}

async function main() {
  const now = new Date();
  // Show events that started today or later (so ongoing events remain visible)
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Run scrapers
  const fllScraper = new FortLauderdaleScraper();
  const instagramScraper = new InstagramSourcesScraper();

  const [fllRaw, igRaw] = await Promise.all([
    fllScraper.scrape(),
    instagramScraper.scrape(),
  ]);

  // Filter future events only
  const futureRaw = [...fllRaw, ...igRaw].filter(e => {
    const d = new Date(e.startAt);
    return d >= startOfToday && e.city === 'Fort Lauderdale';
  });

  console.log(`FortLauderdaleScraper: ${fllRaw.length} raw → ${fllRaw.filter(e => new Date(e.startAt) >= startOfToday).length} future`);
  console.log(`Instagram FLL: ${igRaw.filter(e=>e.city==='Fort Lauderdale').length} raw → ${futureRaw.filter(e=>e.city==='Fort Lauderdale' && igRaw.includes(e)).length} future`);

  // Convert to IRL format
  const newEvents = futureRaw.map(rawToIRL);

  // Load existing FLL events
  const fllPath = join(dataDir, 'events.fll.json');
  let existing = [];
  try {
    existing = JSON.parse(readFileSync(fllPath, 'utf-8'));
  } catch {}

  // Deduplicate: keep existing events, add new ones by ID
  const existingIds = new Set(existing.map(e => e.id));
  const toAdd = newEvents.filter(e => !existingIds.has(e.id));

  // Also deduplicate by title+date+venue (fuzzy match)
  const existingKeys = new Set(existing.map(e => `${e.title}|${e.startAt?.slice(0,10)}|${e.venueName||''}`));
  const toAddDeduped = toAdd.filter(e => {
    const key = `${e.title}|${e.startAt?.slice(0,10)}|${e.venueName||''}`;
    return !existingKeys.has(key);
  });

  const merged = [...existing, ...toAddDeduped];
  // Sort by startAt
  merged.sort((a, b) => a.startAt.localeCompare(b.startAt));

  writeFileSync(fllPath, JSON.stringify(merged, null, 2));
  console.log(`\n✅ events.fll.json: ${existing.length} existing + ${toAddDeduped.length} new = ${merged.length} total`);

  // Also handle Miami Instagram events
  const miamiIg = igRaw.filter(e => e.city === 'Miami' && new Date(e.startAt) >= startOfToday);
  if (miamiIg.length > 0) {
    const miamiPath = join(dataDir, 'events.miami.json');
    let miamiExisting = [];
    try {
      miamiExisting = JSON.parse(readFileSync(miamiPath, 'utf-8'));
    } catch {}

    const miamiExistingIds = new Set(miamiExisting.map(e => e.id));
    const miamiExistingKeys = new Set(miamiExisting.map(e => `${e.title}|${e.startAt?.slice(0,10)}|${e.venueName||''}`));
    const miamiNewEvents = miamiIg.map(rawToIRL).filter(e => {
      const key = `${e.title}|${e.startAt?.slice(0,10)}|${e.venueName||''}`;
      return !miamiExistingIds.has(e.id) && !miamiExistingKeys.has(key);
    });

    const miamiMerged = [...miamiExisting, ...miamiNewEvents];
    miamiMerged.sort((a, b) => a.startAt.localeCompare(b.startAt));
    writeFileSync(miamiPath, JSON.stringify(miamiMerged, null, 2));
    console.log(`✅ events.miami.json: ${miamiExisting.length} existing + ${miamiNewEvents.length} new = ${miamiMerged.length} total`);
  }
}

main().catch(console.error);
