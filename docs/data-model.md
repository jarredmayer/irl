# Data Model Review & Enriched Schema Proposal

## Current Schema Analysis

The current `Event` interface (`src/types/index.ts`) and Zod schema (`src/data/schema.ts`) define the following fields:

### Current Fields — Present in Static Data

| Field | Type | Required | Status |
|-------|------|----------|--------|
| `id` | `string` | Yes | Present |
| `title` | `string` | Yes | Present |
| `startAt` | `string` (ISO 8601) | Yes | Present |
| `endAt` | `string` (ISO 8601) | No | Sometimes present |
| `timezone` | `string` | Yes (default: `America/New_York`) | Present |
| `venueName` | `string` | No | Usually present |
| `venueId` | `string` | No | Sometimes present |
| `address` | `string` | No | Usually present |
| `neighborhood` | `string` | Yes | Present |
| `lat` | `number \| null` | Yes (nullable) | Present |
| `lng` | `number \| null` | Yes (nullable) | Present |
| `city` | `City` | Yes | Present |
| `tags` | `string[]` | Yes (min 1) | Present |
| `category` | `string` | Yes | Present |
| `priceLabel` | `PriceLabel` | No | Sometimes present |
| `price` | `number` | No | Rarely present |
| `ticketUrl` | `string` | No | Sometimes present |
| `isOutdoor` | `boolean` | Yes | Present |
| `shortWhy` | `string` | Yes (max 100) | Present |
| `editorialWhy` | `string` | Yes (max 500) | Present |
| `description` | `string` | Yes | Present |
| `source` | `EventSource` | No | Usually present |
| `image` | `string` (URL) | No | Usually present |
| `editorPick` | `boolean` | No | Sometimes present |
| `seriesId` | `string` | No | Rarely present |
| `seriesName` | `string` | No | Rarely present |
| `isRecurring` | `boolean` | No | Rarely present |
| `organizerId` | `string` | No | Rarely present |
| `organizerName` | `string` | No | Rarely present |
| `addedAt` | `string` (ISO 8601) | No | Present (auto-set by scraper) |

### Fields Required by Task but Missing from Current Schema

| Required Field | Current Status | Gap |
|---------------|---------------|-----|
| `end_time` | Exists as `endAt` but optional | Should be required or have smart default |
| `image_url` | Exists as `image` but optional | Should be required for completeness scoring |
| `ticket_url` / `is_free` boolean | `ticketUrl` optional, no `isFree` field | Need explicit `isFree` boolean |
| `price_range` | Only `priceLabel` (Free/$/$$/$$$) and `price` | Need structured range `{min, max}` |
| `indoor_outdoor` tag | `isOutdoor` boolean exists | Sufficient, but rename consideration |
| `artist/act name` | Not present | **Missing** — needs new field |
| `genre/vibe tags` | Partially covered by `tags[]` | Tags exist but no genre-specific taxonomy |
| `source_url` | Exists inside `source.url` | Present |
| `last_verified` | **Not present** | **Missing** — needs new field |
| `trust_tier` | **Not present** | **Missing** — needs new field |
| `completeness_score` | **Not present** | **Missing** — needs computation |
| `freshness_score` | **Not present** | **Missing** — needs computation |

---

## Proposed Enriched Schema

### Core Event Schema

```typescript
export interface EnrichedEvent {
  // === Identity ===
  id: string;                          // Deterministic hash from title + date + venue
  title: string;
  slug: string;                        // URL-friendly slug

  // === Temporal ===
  startAt: string;                     // ISO 8601 with timezone offset
  endAt: string;                       // ISO 8601 — required (estimate if unknown: startAt + 3h)
  timezone: string;                    // IANA timezone (default: "America/New_York")

  // === Location ===
  venueName: string;                   // Required
  venueId?: string;                    // Stable venue identifier for following
  address: string;                     // Required — full street address
  neighborhood: string;                // From controlled vocabulary
  lat: number;                         // Required (non-nullable)
  lng: number;                         // Required (non-nullable)
  city: City;                          // 'Miami' | 'Fort Lauderdale' | 'Palm Beach'

  // === Content ===
  description: string;                 // Full event description
  shortWhy: string;                    // 1-line editorial hook (max 100 chars)
  editorialWhy: string;                // 2-5 line editorial blurb (max 500 chars)
  image: string;                       // URL — required for display
  imageAlt?: string;                   // Accessibility alt text

  // === Classification ===
  category: string;                    // From controlled vocabulary (12 categories)
  tags: string[];                      // From controlled vocabulary (40+ tags)
  vibes?: string[];                    // Freeform vibe tags: "underground", "rooftop", "latin"
  genres?: string[];                   // Music genre tags: "tech-house", "jazz", "reggaeton"
  isOutdoor: boolean;

  // === Performers ===
  artists?: ArtistCredit[];            // NEW: structured artist/act data
  lineup?: string;                     // Freeform lineup text fallback

  // === Pricing ===
  isFree: boolean;                     // NEW: explicit boolean
  priceLabel?: PriceLabel;             // 'Free' | '$' | '$$' | '$$$'
  priceRange?: PriceRange;             // NEW: structured price range
  ticketUrl?: string;                  // Link to purchase/RSVP

  // === Provenance ===
  source: EventSource;                 // Required (name + url)
  sourceId?: string;                   // ID in the source system for dedup
  trustTier: TrustTier;               // NEW: data trust classification
  lastVerified: string;                // NEW: ISO 8601 timestamp
  addedAt: string;                     // When first ingested

  // === Computed Scores ===
  completenessScore: number;           // NEW: 0–1, computed from field coverage
  freshnessScore: number;              // NEW: 0–1, based on verification recency

  // === Editorial ===
  editorPick?: boolean;
  curatorNotes?: string;               // Internal notes for editorial team

  // === Recurrence ===
  seriesId?: string;
  seriesName?: string;
  isRecurring?: boolean;
  recurrenceRule?: string;             // iCal RRULE format

  // === Organization ===
  organizerId?: string;
  organizerName?: string;
}
```

### Supporting Types

```typescript
export interface ArtistCredit {
  name: string;
  role?: 'headliner' | 'support' | 'dj' | 'host' | 'performer';
  url?: string;                        // Artist website or social
  imageUrl?: string;
}

export interface PriceRange {
  min: number;                         // In USD, 0 for free
  max: number;                         // In USD
  currency: string;                    // Default: "USD"
}

export type TrustTier =
  | 'official_api'              // Data from official API (RA, Eventbrite, etc.)
  | 'scraped_known_venue'       // Scraped from a known/trusted venue website
  | 'scraped_unknown'           // Scraped from an unknown or generic source
  | 'submitted_verified'        // User-submitted and verified by spot-check
  | 'submitted_unverified';     // User-submitted, not yet verified

export interface EventSource {
  name: string;                        // Human-readable source name
  url: string;                         // Source URL
  scrapedAt?: string;                  // When this specific record was fetched
}
```

### Completeness Score Computation

The `completenessScore` is a weighted average of required field presence:

```typescript
function computeCompletenessScore(event: Partial<EnrichedEvent>): number {
  const fields: { key: keyof EnrichedEvent; weight: number }[] = [
    { key: 'title',        weight: 1.0 },
    { key: 'startAt',      weight: 1.0 },
    { key: 'endAt',        weight: 0.5 },
    { key: 'venueName',    weight: 1.0 },
    { key: 'address',      weight: 0.8 },
    { key: 'lat',          weight: 0.8 },
    { key: 'lng',          weight: 0.8 },
    { key: 'description',  weight: 0.7 },
    { key: 'image',        weight: 0.7 },
    { key: 'ticketUrl',    weight: 0.3 },
    { key: 'isFree',       weight: 0.3 },  // Either ticketUrl or isFree should be present
    { key: 'priceRange',   weight: 0.4 },
    { key: 'category',     weight: 0.5 },
    { key: 'tags',         weight: 0.4 },
    { key: 'neighborhood', weight: 0.5 },
    { key: 'source',       weight: 0.5 },
    { key: 'isOutdoor',    weight: 0.3 },
  ];

  const totalWeight = fields.reduce((sum, f) => sum + f.weight, 0);
  let earned = 0;

  for (const { key, weight } of fields) {
    const val = event[key];
    if (val !== undefined && val !== null && val !== '') {
      if (Array.isArray(val) && val.length === 0) continue;
      earned += weight;
    }
  }

  return Math.round((earned / totalWeight) * 100) / 100; // 0.00–1.00
}
```

### Freshness Score Computation

The `freshnessScore` measures how recently the event data was verified relative to the event date:

```typescript
function computeFreshnessScore(lastVerified: string, eventStartAt: string): number {
  const now = new Date();
  const verified = new Date(lastVerified);
  const eventDate = new Date(eventStartAt);

  const hoursSinceVerified = (now.getTime() - verified.getTime()) / (1000 * 60 * 60);
  const hoursUntilEvent = (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60);

  // Events verified within 24h: perfect freshness
  if (hoursSinceVerified <= 24) return 1.0;

  // Events verified within 72h: high freshness
  if (hoursSinceVerified <= 72) return 0.8;

  // Stale but event is far out (>2 weeks): acceptable
  if (hoursUntilEvent > 336) return 0.6;

  // Stale and event is soon (<48h): concerning
  if (hoursUntilEvent < 48 && hoursSinceVerified > 72) return 0.3;

  // Linear decay from 0.7 to 0.3 over 7 days
  const daysSinceVerified = hoursSinceVerified / 24;
  const decay = Math.max(0.3, 0.7 - (daysSinceVerified - 3) * (0.4 / 7));
  return Math.round(decay * 100) / 100;
}
```

---

## Migration Notes

### Fields to Add to Current Schema

| New Field | Default for Existing Data | Notes |
|-----------|--------------------------|-------|
| `isFree` | Derive from `priceLabel === 'Free'` | Backfill from existing data |
| `priceRange` | Derive from `priceLabel` mapping | `Free→{0,0}`, `$→{0,25}`, `$$→{25,75}`, `$$$→{75,200}` |
| `artists` | Parse from `tags` (e.g., `dj:tech-house`) and `description` | AI-assisted extraction |
| `trustTier` | `'scraped_known_venue'` for known sources, `'scraped_unknown'` otherwise | Map from `source.name` |
| `lastVerified` | Set to `addedAt` or `scrape-meta.scrapedAt` | Backfill |
| `completenessScore` | Compute on backfill | Run computation over all existing events |
| `freshnessScore` | Compute on backfill | Run computation over all existing events |
| `genres` | Extract from `tags[]` where tag contains genre info | e.g., `dj:tech-house` → genre `tech-house` |
| `vibes` | Extract from `tags[]` where tag is a vibe descriptor | e.g., `underground`, `rooftop` |

### Backward Compatibility

The enriched schema is a **superset** of the current schema. All new required fields have sensible defaults derivable from existing data. The migration can be done incrementally:

1. Add new optional fields to TypeScript interface and Zod schema
2. Run a backfill script to compute derived fields
3. Once all events have the new fields, tighten the schema to make them required
4. Update the ranking service to use `completenessScore` and `freshnessScore`

### Current Static Data Gaps

Based on analysis of `events.json` (1,146 deduplicated events):

- **`endAt`**: Often missing — many events only have `startAt`
- **`price`/`priceRange`**: Rarely populated beyond `priceLabel`
- **`artists`**: Not tracked at all — artist info is embedded in title/description/tags
- **`lastVerified`**: Not tracked — no way to know if an event listing is stale
- **`trustTier`**: Not tracked — all events treated equally regardless of source reliability
- **`lat`/`lng`**: Nullable in current schema — some events missing coordinates
- **`image`**: Optional — some events have no image
- **`venueName`/`address`**: Optional — some events (especially recurring/community) lack these
