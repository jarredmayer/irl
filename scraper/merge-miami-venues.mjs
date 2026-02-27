/**
 * Merge CulturalAttractionsScraper new venue events into events.miami.json
 */
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createHash } from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
import { CulturalAttractionsScraper } from './src/sources/cultural-attractions.js';

const dataDir = join(__dirname, '../src/data');

function generateId(event) {
  const key = `${event.title}|${event.startAt}|${event.venueName || ''}`;
  return createHash('md5').update(key).digest('hex').slice(0, 16);
}

function rawToIRL(raw) {
  const price = raw.priceAmount ?? raw.price ?? 0;
  return {
    id: generateId(raw),
    title: raw.title,
    startAt: raw.startAt || `${raw.date}T${raw.time || '12:00'}:00`,
    timezone: 'America/New_York',
    venueName: raw.venueName || raw.venue || undefined,
    address: raw.address || undefined,
    neighborhood: raw.neighborhood || 'Miami',
    lat: raw.lat ?? null,
    lng: raw.lng ?? null,
    city: raw.city || 'Miami',
    tags: raw.tags || [],
    category: raw.category || 'Culture',
    priceLabel: raw.priceLabel || (price === 0 ? 'Free' : price < 20 ? '$' : price < 50 ? '$$' : '$$$'),
    price: price,
    ticketUrl: raw.ticketUrl || (price > 0 ? raw.sourceUrl : undefined),
    isOutdoor: raw.isOutdoor || (raw.tags || []).some(t => ['outdoor','beach','park','waterfront','rooftop'].includes(t)),
    shortWhy: generateShortWhy(raw),
    editorialWhy: raw.description,
    description: raw.description,
    source: raw.sourceName ? { name: raw.sourceName, url: raw.sourceUrl } : { name: 'Cultural Attractions', url: raw.sourceUrl },
    editorPick: (raw.tags || []).includes('local-favorite'),
  };
}

function generateShortWhy(event) {
  const tags = event.tags || [];
  const parts = [];
  if (event.priceLabel === 'Free' || (event.priceAmount ?? event.price) === 0) parts.push('Free');
  if (tags.includes('film')) parts.push('indie cinema');
  if (tags.includes('rooftop')) parts.push('rooftop views');
  if (tags.includes('live-music') || tags.includes('jazz')) parts.push('live music');
  if (tags.includes('local-favorite')) parts.push('local fave');
  if (tags.includes('art-gallery') || tags.includes('museum')) parts.push('art + culture');
  if (tags.includes('waterfront')) parts.push('waterfront');
  if (parts.length === 0) parts.push('worth checking out');
  return parts.slice(0, 2).join(' · ') + '.';
}

async function main() {
  const now = new Date();
  const scraper = new CulturalAttractionsScraper();
  const raw = await scraper.scrape();
  console.log(`CulturalAttractionsScraper: ${raw.length} total raw events`);

  // Only future Miami events
  const future = raw.filter(e => {
    const d = new Date(e.startAt);
    return d >= now && (e.city === 'Miami' || !e.city);
  });
  console.log(`Future Miami events: ${future.length}`);

  const newEvents = future.map(rawToIRL);

  // Load existing
  const miamiPath = join(dataDir, 'events.miami.json');
  let existing = [];
  try {
    existing = JSON.parse(readFileSync(miamiPath, 'utf-8'));
  } catch {}

  // Deduplicate
  const existingIds = new Set(existing.map(e => e.id));
  const existingKeys = new Set(existing.map(e => `${e.title}|${e.startAt?.slice(0,10)}|${e.venueName||''}`));

  const toAdd = newEvents.filter(e => {
    const key = `${e.title}|${e.startAt?.slice(0,10)}|${e.venueName||''}`;
    return !existingIds.has(e.id) && !existingKeys.has(key);
  });

  // Log what's being added
  const newVenues = [...new Set(toAdd.map(e => e.venueName).filter(Boolean))];
  console.log('New venues being added:', newVenues.join(', '));

  const merged = [...existing, ...toAdd];
  merged.sort((a, b) => a.startAt.localeCompare(b.startAt));

  writeFileSync(miamiPath, JSON.stringify(merged, null, 2));
  console.log(`\n✅ events.miami.json: ${existing.length} existing + ${toAdd.length} new = ${merged.length} total`);
}

main().catch(console.error);
