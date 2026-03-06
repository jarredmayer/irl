import 'dotenv/config';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import simpleGit from 'simple-git';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '../..');
const OUTPUT_PATH = join(REPO_ROOT, 'public/data/events.json');

async function run() {
  console.log(`[${new Date().toISOString()}] Starting ingestion...`);

  try {
    // 1. Fetch from all sources
    const raw = await fetchAllSources();
    console.log(`Fetched ${raw.length} raw events`);

    // 2. Normalize to IRL schema
    const normalized = await normalizeEvents(raw);
    console.log(`Normalized ${normalized.length} events`);

    // 3. Merge with existing events (preserve manually added ones)
    const existing = loadExistingEvents();
    const merged = mergeEvents(existing, normalized);
    console.log(`Merged: ${merged.length} events (${existing.length} existing)`);

    // 4. Deduplicate
    const deduped = deduplicateEvents(merged);
    console.log(`After dedup: ${deduped.length} events`);

    // 5. Filter — remove past events, low quality
    const filtered = filterEvents(deduped);
    console.log(`After filter: ${filtered.length} events`);

    // 6. Sort by startAt ascending
    filtered.sort((a, b) =>
      new Date(a.startAt).getTime() - new Date(b.startAt).getTime()
    );

    // 7. Write to public/data/events.json
    writeFileSync(OUTPUT_PATH, JSON.stringify(filtered, null, 2));
    console.log(`Wrote ${filtered.length} events to events.json`);

    // 8. Commit and push to GitHub
    await commitAndPush(filtered.length);

    console.log('Ingestion complete.');
  } catch (err) {
    console.error('Ingestion failed:', err);
    process.exit(1);
  }
}

// ─── LOAD EXISTING ────────────────────────────────────────

function loadExistingEvents() {
  try {
    if (existsSync(OUTPUT_PATH)) {
      return JSON.parse(readFileSync(OUTPUT_PATH, 'utf8'));
    }
  } catch (err) {
    console.warn('Could not load existing events:', err.message);
  }
  return [];
}

// ─── SOURCES ─────────────────────────────────────────────

async function fetchAllSources() {
  const results = await Promise.allSettled([
    fetchEventbrite(),
    fetchRSS('https://www.timeout.com/miami/feed', 'timeout-miami'),
    fetchRSS('https://www.miami.com/feed/', 'miami-com'),
  ]);

  return results
    .filter(r => r.status === 'fulfilled')
    .flatMap(r => r.value);
}

// ─── EVENTBRITE ───────────────────────────────────────────

async function fetchEventbrite() {
  const key = process.env.EVENTBRITE_API_KEY;
  if (!key) {
    console.warn('No Eventbrite key — skipping');
    return [];
  }

  const locations = [
    { lat: 25.7617, lng: -80.1918, name: 'miami' },
    { lat: 26.1224, lng: -80.1373, name: 'ftl' },
    { lat: 26.7153, lng: -80.0534, name: 'pb' },
  ];

  const events = [];
  for (const loc of locations) {
    try {
      const url = `https://www.eventbriteapi.com/v3/events/search/` +
        `?location.latitude=${loc.lat}` +
        `&location.longitude=${loc.lng}` +
        `&location.within=10mi` +
        `&expand=venue,organizer,category` +
        `&start_date.range_start=${new Date().toISOString()}` +
        `&token=${key}`;
      const res = await fetch(url);
      if (!res.ok) continue;
      const data = await res.json();
      events.push(...(data.events ?? []).map(e => ({
        ...e,
        _source: 'eventbrite',
        _city: loc.name,
      })));
    } catch (err) {
      console.warn(`Eventbrite ${loc.name} failed:`, err.message);
    }
  }
  return events;
}

// ─── RSS FEEDS ────────────────────────────────────────────

async function fetchRSS(url, sourceId) {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'IRL-Bot/1.0' }
    });
    if (!res.ok) return [];
    const xml = await res.text();
    // Basic RSS item extraction
    const items = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;
    while ((match = itemRegex.exec(xml)) !== null) {
      const content = match[1];
      const get = (tag) => {
        const cdataMatch = content.match(
          new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>`)
        );
        if (cdataMatch) return cdataMatch[1].trim();
        const plainMatch = content.match(
          new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`)
        );
        return plainMatch?.[1]?.trim() ?? '';
      };
      items.push({
        title: get('title'),
        description: get('description'),
        link: get('link'),
        pubDate: get('pubDate'),
        _source: sourceId,
      });
    }
    return items;
  } catch (err) {
    console.warn(`RSS ${sourceId} failed:`, err.message);
    return [];
  }
}

// ─── NORMALIZATION ────────────────────────────────────────

const CATEGORY_KEYWORDS = {
  Nightlife:     ['bar', 'club', 'cocktail', 'nightlife', 'lounge', 'rooftop'],
  Music:         ['concert', 'live music', 'band', 'dj', 'jazz', 'festival'],
  Outdoor:       ['beach', 'park', 'outdoor', 'hike', 'kayak', 'surf'],
  Art:           ['gallery', 'art', 'exhibit', 'museum', 'installation'],
  'Food & Drink': ['food', 'dinner', 'brunch', 'tasting', 'chef', 'market'],
  Community:     ['market', 'fair', 'community', 'volunteer', 'neighborhood'],
  Wellness:      ['yoga', 'meditation', 'wellness', 'spa', 'mindful'],
  Fitness:       ['run', 'fitness', 'workout', 'gym', 'race', 'triathlon'],
  Culture:       ['culture', 'heritage', 'history', 'film', 'theatre', 'theater'],
};

function inferCategory(title = '', description = '') {
  const text = `${title} ${description}`.toLowerCase();
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some(k => text.includes(k))) return cat;
  }
  return 'Community';
}

function inferNeighborhood(venueName = '', address = '') {
  const text = `${venueName} ${address}`.toLowerCase();
  if (text.includes('wynwood')) return 'Wynwood';
  if (text.includes('brickell')) return 'Brickell';
  if (text.includes('coconut grove')) return 'Coconut Grove';
  if (text.includes('little havana')) return 'Little Havana';
  if (text.includes('design district')) return 'Design District';
  if (text.includes('south beach') || text.includes('miami beach'))
    return 'Miami Beach';
  if (text.includes('downtown')) return 'Downtown Miami';
  if (text.includes('las olas')) return 'Las Olas';
  if (text.includes('wilton manors')) return 'Wilton Manors';
  if (text.includes('delray')) return 'Delray Beach';
  if (text.includes('west palm')) return 'West Palm Beach';
  return null;
}

function generateId(title, startAt) {
  // Simple hash for ID generation
  const str = `${title}-${startAt}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(16, '0').slice(0, 16);
}

function cityNameFromCode(code) {
  const names = {
    miami: 'Miami',
    ftl: 'Fort Lauderdale',
    pb: 'Palm Beach',
  };
  return names[code] ?? 'Miami';
}

async function normalizeEvents(raw) {
  return raw.map((e, i) => {
    const now = new Date().toISOString();

    // Eventbrite format
    if (e._source === 'eventbrite') {
      const title = e.name?.text ?? 'Untitled';
      const startAt = e.start?.utc?.replace('Z', '') ?? now;
      return {
        id: `eb-${e.id}`,
        title,
        startAt,
        endAt: e.end?.utc?.replace('Z', '') ?? null,
        timezone: e.start?.timezone ?? 'America/New_York',
        venueName: e.venue?.name ?? '',
        address: e.venue?.address?.localized_address_display ?? '',
        neighborhood: inferNeighborhood(
          e.venue?.name,
          e.venue?.address?.localized_address_display
        ),
        lat: parseFloat(e.venue?.latitude ?? '0') || null,
        lng: parseFloat(e.venue?.longitude ?? '0') || null,
        city: cityNameFromCode(e._city),
        tags: [],
        category: inferCategory(title, e.description?.text ?? ''),
        priceLabel: e.is_free ? 'Free' : null,
        isOutdoor: false,
        shortWhy: `${inferCategory(title, e.description?.text ?? '')} at ${e.venue?.name ?? 'TBA'}.`,
        editorialWhy: e.description?.text ?? '',
        description: e.description?.text ?? '',
        ticketUrl: e.url ?? '',
        source: {
          name: 'Eventbrite',
          url: e.url ?? '',
        },
        image: e.logo?.url ?? '',
        editorPick: false,
        venueId: e.venue?.id ? `eb-${e.venue.id}` : null,
        addedAt: now,
      };
    }

    // RSS format — basic extraction
    const title = e.title ?? 'Untitled';
    const startAt = e.pubDate
      ? new Date(e.pubDate).toISOString().replace('Z', '')
      : now;

    return {
      id: generateId(title, startAt),
      title,
      startAt,
      endAt: null,
      timezone: 'America/New_York',
      venueName: '',
      address: '',
      neighborhood: inferNeighborhood(e.title, e.description),
      lat: null,
      lng: null,
      city: 'Miami',
      tags: [],
      category: inferCategory(e.title, e.description),
      priceLabel: null,
      isOutdoor: false,
      shortWhy: `${inferCategory(e.title, e.description)} event.`,
      editorialWhy: e.description ?? '',
      description: e.description ?? '',
      ticketUrl: e.link ?? '',
      source: {
        name: e._source,
        url: e.link ?? '',
      },
      image: '',
      editorPick: false,
      venueId: null,
      addedAt: now,
    };
  }).filter(e => e.title && e.title !== 'Untitled');
}

// ─── MERGE ────────────────────────────────────────────────

function mergeEvents(existing, incoming) {
  const existingIds = new Set(existing.map(e => e.id));
  const newEvents = incoming.filter(e => !existingIds.has(e.id));
  return [...existing, ...newEvents];
}

// ─── DEDUPLICATION ────────────────────────────────────────

function deduplicateEvents(events) {
  const seen = new Map();
  for (const event of events) {
    // Dedupe key: normalized title + date
    const dateStr = new Date(event.startAt)
      .toISOString().slice(0, 10);
    const titleNorm = event.title
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
    const key = `${titleNorm}-${dateStr}`;
    if (!seen.has(key)) {
      seen.set(key, event);
    }
  }
  return Array.from(seen.values());
}

// ─── FILTERING ────────────────────────────────────────────

function filterEvents(events) {
  const now = new Date();
  const twoWeeksOut = new Date(
    now.getTime() + 14 * 24 * 60 * 60 * 1000
  );
  return events.filter(e => {
    const start = new Date(e.startAt);
    // Remove past events
    if (start < now) return false;
    // Remove events more than 2 weeks out
    if (start > twoWeeksOut) return false;
    // Remove events with no title
    if (!e.title?.trim()) return false;
    return true;
  });
}

// ─── GIT COMMIT + PUSH ────────────────────────────────────

async function commitAndPush(count) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    console.warn('No GITHUB_TOKEN — skipping push');
    return;
  }

  const git = simpleGit(REPO_ROOT);

  // Configure git if needed
  await git.addConfig('user.email', 'ingest-bot@goirl.app', false, 'local');
  await git.addConfig('user.name', 'IRL Ingest Bot', false, 'local');

  // Set remote with token auth
  await git.remote([
    'set-url', 'origin',
    `https://${token}@github.com/jarredmayer/irl.git`
  ]);

  await git.add('public/data/events.json');

  const status = await git.status();
  if (!status.staged.length) {
    console.log('No changes to commit.');
    return;
  }

  const timestamp = new Date().toISOString().slice(0, 16);
  await git.commit(
    `chore(data): ingest ${count} events [${timestamp}]`
  );
  await git.push('origin', 'main');
  console.log('Pushed to GitHub — Vercel will auto-deploy.');
}

// ─── RUN ─────────────────────────────────────────────────
run();
