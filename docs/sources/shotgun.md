# Shotgun

> Electronic/art events, strong in underground and cultural programming

## Access Method

**No official public API**, but multiple ingestion paths exist. Paris-based company (founded 2014, 20k+ clients, 6M+ users). Tech stack: Next.js on Vercel, React, Cloudflare CDN, AWS, Adyen payments.

### 1. GraphQL API (undocumented — most promising)

- **Endpoint:** `https://spotify-graphql.shotgun.live/api`
- Introspection playground available — run an introspection query to discover event queries
- May bypass the Vercel security checkpoint that blocks the main domain
- **Status:** Unexplored by existing scrapers — highest-potential new avenue

### 2. REST API v1 (existing — broken)

- **Endpoint:** `https://api.shotgun.live/v1/events?citySlug=miami&page=1&perPage=40&startDate=...&endDate=...`
- No auth required
- Response shape: `{ data: [...], meta: { currentPage, lastPage, total } }`
- Referenced in existing scraper at `scraper/src/sources/ticketing-platforms.ts`
- **Currently errored** — returns HTTP 429 (rate limited)

### 3. Multi-strategy HTML Scraper (existing — broken)

- **Scraper:** `scraper/src/sources/shotgun-miami.ts`
- Attempts three strategies: REST API v1/v2, `__NEXT_DATA__` extraction, and Next.js data routes
- **All currently failing** due to Vercel Security Checkpoint + Cloudflare + rate limiting

### Anti-bot Measures (active)

- **Vercel Security Checkpoint** deployed as anti-bot measure (existing scraper already has handling code)
- **Cloudflare CDN** adds another protection layer
- **HTTP 429** confirmed during automated fetches
- Existing scraper uses 1200ms delay — may be insufficient given active 429s

## Data Quality

**Good for electronic and underground events.** Overlaps with RA but covers a broader cultural spectrum.

**Available fields (confirmed from API response schema):**
- Event: `id`, `name`, `slug`, `startDate`, `endDate`, `description`, `coverImage`/`image`
- Venue: `name`, `address`, `city`, `latitude`, `longitude` (geo-coordinates included)
- Pricing: `tickets` array with individual prices ($30-$234 observed)
- Metadata: `tags` (genre), `lineup` (artists), `organizerName`
- Missing: No explicit age restrictions, no capacity data

**Miami/Fort Lauderdale coverage — confirmed active:**
- **Fort Lauderdale:** Nowhere Lounge (recurring Boiler Room Friday series — house, techno, DNB, dubstep), No Boys In The Booth
- **Miami:** Techno events, pool parties (Kimpton Surfcomber), LiveList SoFlo aggregating club nights, raves, festivals
- Genre focus: house, techno, DNB, electronic, bass music
- Covers the underground/indie electronic scene well

**Strengths:**
- Geo-coordinates included (no geocoding needed)
- Structured pricing with ticket tiers
- Good lineup data
- Promoter-maintained listings (reliable data)
- Covers underground events that may not appear on RA

**Weaknesses:**
- Stronger in European markets (Paris, Berlin, London) — Miami is secondary market
- Active bot protection makes reliable ingestion challenging

## Rate Limits

- **Active rate limiting confirmed** — HTTP 429 responses observed
- Vercel Security Checkpoint + Cloudflare layered protection
- Safe rate: unclear — existing 1200ms delay triggers 429s
- GraphQL endpoint may have separate, more lenient limits
- Recommended: 2-3s between requests with exponential backoff on 429s

## ToS Risks

**Risk level: MEDIUM**

- [General Terms and Conditions](https://support.shotgun.live/hc/en-us/articles/14330476029330--General-Terms-and-Conditions) exist but specific scraping prohibitions could not be confirmed (page itself 429'd automated access)
- [Privacy Policy](https://shotgun.live/privacy.html) states data is for Shotgun and Organizer partners only; they do not sell data to third parties
- Vercel/Cloudflare protections signal they actively discourage automated access
- No explicit API ToS found
- **Mitigation:** Attribute source, link to Shotgun event pages, keep volume low

## Recommended Approach

1. **Investigate the GraphQL endpoint** at `spotify-graphql.shotgun.live/api` — run an introspection query to discover event queries. This may bypass Vercel checkpoint entirely and provide the cleanest data access.

2. **Fix the REST API approach:** The `api.shotgun.live/v1` endpoint may work with proper headers and more conservative rate limiting (2-3s between requests). Add retry logic with exponential backoff for 429 responses.

3. **Keep the multi-strategy scraper** (`shotgun-miami.ts`) — it's well-structured. The `__NEXT_DATA__` and JSON-LD fallbacks are sound when the API is blocked.

4. **Consider Pro integration:** Shotgun has a [Pro integrations portal](https://support-pro.shotgun.live/hc/en-us/categories/28743315936402--Integrations) with API integration support. They may offer partner access if contacted.

5. **Set `trustTier: 'official_api'`** if using their API, `'scraped_known_venue'` if scraping.

6. **Cross-reference with RA:** Many electronic events appear on both platforms. Use for dedup validation and data enrichment.

## Priority: Medium-High

Excellent data quality with geo-coordinates, structured pricing, and strong underground electronic coverage in Miami/FTL. The active bot protection is the main challenge, but the unexplored GraphQL endpoint is a promising path. Worth investing time to stabilize — no other single source covers the underground/indie electronic scene in South Florida as well as the combination of RA + Shotgun.
