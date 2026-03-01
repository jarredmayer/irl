/**
 * Fix null coordinates in event data files.
 * 1. Known-venue lookup by title/venueName pattern
 * 2. Nominatim geocoding for events with addresses
 */

import { readFileSync, writeFileSync } from 'fs';

const MIAMI_FILE = 'src/data/events.miami.json';
const FLL_FILE = 'src/data/events.fll.json';

// Known South Florida venues: pattern (regex on title or venueName) → coords
const VENUE_LOOKUP = [
  // Miami sports
  { pattern: /miami heat|kaseya center/i,        lat: 25.7814, lng: -80.1870, venue: 'Kaseya Center' },
  { pattern: /miami hurricanes.*basketball|watsco/i, lat: 25.7179, lng: -80.2735, venue: 'Watsco Center' },
  { pattern: /world baseball classic|loandepot park/i, lat: 25.7779, lng: -80.2199, venue: 'LoanDepot Park' },
  { pattern: /florida grand opera|adrienne arsht/i, lat: 25.7831, lng: -80.1885, venue: 'Adrienne Arsht Center' },
  { pattern: /jazz in the gardens/i,             lat: 25.9579, lng: -80.2390, venue: 'Hard Rock Stadium' },
  { pattern: /sara baras|swan lake.*ballet|pink martini|lisa loeb|broadway rave|spring serenade|interpol|wax tailor|silvestre dangond|an evening with wim hof|avi hoffman|ethan bloom|the big show improv|cheap trills|crimewave|broadway rave|terror in miami|the outdoor antique/i,
    lat: 25.7831, lng: -80.1885, venue: 'Adrienne Arsht Center' },
  { pattern: /midline/i,                         lat: 25.7616, lng: -80.1933, venue: 'Midline' },
  { pattern: /uva wynwood/i,                     lat: 25.8008, lng: -80.1987, venue: 'Uva Wynwood' },
  { pattern: /kimpton epic hotel/i,              lat: 25.7746, lng: -80.1877, venue: 'Kimpton EPIC Hotel' },
  { pattern: /la diosa/i,                        lat: 25.7995, lng: -80.2024, venue: 'La Diosa' },
  { pattern: /lunasol/i,                         lat: 25.7946, lng: -80.1948, venue: 'Lunasol' },
  // Fort Lauderdale venues
  { pattern: /miami hurricanes.*baseball|mark light field/i, lat: 25.7183, lng: -80.2737, venue: 'Mark Light Field' },
  { pattern: /um:|university of miami.*mindfulness|um mindfulness/i, lat: 25.7181, lng: -80.2745, venue: 'University of Miami' },
  { pattern: /arts ballet theatre/i, lat: 25.7831, lng: -80.1885, venue: 'Adrienne Arsht Center' },
  { pattern: /the parker|parker playhouse|miami city ballet.*parker/i, lat: 26.1244, lng: -80.1363, venue: 'Parker Playhouse' },
  { pattern: /slow burn theatre|broward center|south florida symphony|naked magicians|hallmark movie musical|emperor.*new clothes|kevin spencer/i,
    lat: 26.1178, lng: -80.1438, venue: 'Broward Center for the Performing Arts' },
  { pattern: /florida panthers|amerant bank arena/i, lat: 26.1584, lng: -80.3260, venue: 'Amerant Bank Arena' },
];

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// Known address → coords for Miami area (no network needed)
const ADDRESS_COORDS = {
  '200 e flagler':       { lat: 25.7748, lng: -80.1936 },
  '422 nw north river':  { lat: 25.7737, lng: -80.2032 },
  '4020 virginia key':   { lat: 25.7369, lng: -80.1571 },
  '4447 sw 75':          { lat: 25.7564, lng: -80.3100 },
  '777 ne 79th':         { lat: 25.8551, lng: -80.1876 },
  '7700 biscayne':       { lat: 25.8547, lng: -80.1889 },
  '150 nw 73rd':         { lat: 25.8487, lng: -80.2126 },
  '212 n miami ave':     { lat: 25.7756, lng: -80.1945 },
  '1395 nw 57th':        { lat: 25.7907, lng: -80.3037 },
  '4441 collins':        { lat: 25.8098, lng: -80.1212 },
  '1235 washington ave': { lat: 25.7841, lng: -80.1306 },
  '2900 nw seventh':     { lat: 25.8132, lng: -80.2108 },
  '2900 nw 7th':         { lat: 25.8132, lng: -80.2108 },
  '2 s miami ave':       { lat: 25.7680, lng: -80.1950 },
  '29 ne 11th':          { lat: 25.7800, lng: -80.1934 },
  '12517 ne 91':         { lat: 27.1810, lng: -80.7948 },
  '1677 collins':        { lat: 25.7870, lng: -80.1310 },
  '1438 washington':     { lat: 25.7856, lng: -80.1301 },
  '2103 nw 2nd':         { lat: 25.7971, lng: -80.2015 },
  '1671 collins':        { lat: 25.7869, lng: -80.1311 },
  '1672 collins':        { lat: 25.7870, lng: -80.1310 },
  '915 washington':      { lat: 25.7801, lng: -80.1317 },
  '1050 macarthur':      { lat: 25.7740, lng: -80.1745 },
  '400 se 2nd':          { lat: 25.7671, lng: -80.1919 },
  '2300 nw second':      { lat: 25.7999, lng: -80.2019 },
  '2300 nw 2nd':         { lat: 25.7999, lng: -80.2019 },
  '825 washington':      { lat: 25.7793, lng: -80.1318 },
  '200 ne 62nd':         { lat: 25.8393, lng: -80.1861 },
  '1052 ocean dr':       { lat: 25.7800, lng: -80.1286 },
  '601 biscayne':        { lat: 25.7814, lng: -80.1870 },
  '143 nw 23rd':         { lat: 25.8008, lng: -80.2020 },
  '2411 n miami':        { lat: 25.8030, lng: -80.1973 },
  '1421 s miami':        { lat: 25.7574, lng: -80.1943 },
  '2200 e 4th ave':      { lat: 25.8479, lng: -80.2692 },
  '1920 collins':        { lat: 25.7921, lng: -80.1298 },
  '55 ne 24th':          { lat: 25.8024, lng: -80.1905 },
};

async function geocode(address) {
  const key = address.toLowerCase().trim();
  for (const [prefix, coords] of Object.entries(ADDRESS_COORDS)) {
    if (key.startsWith(prefix)) return coords;
  }
  return null;
}

function applyVenueLookup(event) {
  const text = `${event.title} ${event.venueName || ''}`;
  for (const entry of VENUE_LOOKUP) {
    if (entry.pattern.test(text)) {
      return { lat: entry.lat, lng: entry.lng };
    }
  }
  return null;
}

async function processFile(file) {
  const events = JSON.parse(readFileSync(file, 'utf8'));
  let fixed = 0;
  let geocoded = 0;
  let skipped = 0;

  for (const event of events) {
    if (event.lat !== null && event.lng !== null) continue;

    // Try venue lookup first
    const coords = applyVenueLookup(event);
    if (coords) {
      event.lat = coords.lat;
      event.lng = coords.lng;
      fixed++;
      continue;
    }

    // Try address lookup
    if (event.address) {
      const result = await geocode(event.address);
      if (result) {
        event.lat = result.lat;
        event.lng = result.lng;
        geocoded++;
      } else {
        skipped++;
      }
      continue;
    }

    skipped++;
  }

  writeFileSync(file, JSON.stringify(events, null, 2));
  console.log(`${file}: venue-lookup=${fixed}, geocoded=${geocoded}, still-null=${skipped}`);
}

console.log('Fixing null coordinates...\n');
await processFile(MIAMI_FILE);
await processFile(FLL_FILE);
console.log('\nDone.');
