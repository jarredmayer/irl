# Dice.fm

> Music events, often has listings not found elsewhere

## Access Method

**No official public API for general event discovery.** Three viable approaches exist, two already partially implemented:

### 1. `__NEXT_DATA__` SSR Scraping (existing — broken)

**Scraper:** `scraper/src/sources/dice-scraper.ts` (`DiceRealScraper`)

Dice.fm is a **Next.js app**. The Miami browse page embeds ~30 events as JSON in a `<script id="__NEXT_DATA__">` tag. Confirmed still present as of March 2026.

- **URL:** `https://dice.fm/browse/miami-5e3bf1b0fe75488ec46cdf9f`
- Simple HTTP fetch + JSON parse — no headless browser needed
- Currently returns **0 events** (the `DiceRealScraper` parses `nextData?.props?.pageProps?.events`)
- **Likely cause:** JSON path changed (key may no longer be `props.pageProps.events`), or CI environment DNS/TLS issues, or Cloudflare challenge page returned server-side

### 2. Partners Widget API (existing — working for Club Space)

**Scraper:** `scraper/src/sources/club-space.ts` (`ClubSpaceScraper`)

- **Endpoint:** `https://partners-endpoint.dice.fm/api/v2/events`
- **Auth:** `x-api-key` header — extracted from venue websites that embed Dice widgets
- Currently used for Club Space events (**39 events** in last scrape)
- Returns **rich structured JSON**: detailed artists with headliner flag, ticket types with prices (in cents, face value + fees breakdown), images in multiple variants, descriptions, age limits, genre/type tags, sold-out status

**This can be expanded** to other Miami venues that embed Dice widgets: Factory Town, The Ground, Floyd, MODE, UVA Wynwood, Jungle Island.

### 3. Undocumented REST APIs (blocked)

- `window.DICE_API = 'https://api.dice.fm'` and `window.EVENTS_API = 'https://events-api.dice.fm'` with base path `/v1`
- **Blocked by robots.txt** (`Disallow: /api/`)
- GraphQL Ticket Holders API (`partners-endpoint.dice.fm/graphql`) is partner-only with authentication
- Old `dice-api` npm package is dead (last updated 8 years ago)

## Data Quality

**Excellent.** Dice.fm is a ticketing platform — data is maintained by promoters/venues and is highly reliable.

**Available fields (confirmed from both SSR and Partners API):**

| Field | SSR (`__NEXT_DATA__`) | Partners Widget API |
|-------|----------------------|---------------------|
| Event title | Yes | Yes |
| Date/time | Unix timestamp | ISO 8601 |
| Venue name + address | Yes | Yes, with lat/lng |
| Lineup/artists | `summary_lineup` | `detailed_artists` with headliner flag |
| Price | Yes | Cents, face value + fees breakdown |
| Images | Yes | Square, landscape, portrait variants |
| Description | Yes | Full HTML/text |
| Age restriction | Via highlights | `age_limit` field |
| Genre/type tags | Limited | `genre_tags`, `type_tags` |
| Sold-out status | Basic | Per ticket type |
| Ticket URL | Yes | Deep link to event page |

**Miami coverage is strong.** Dice.fm is the primary ticketing platform for Miami electronic/nightlife:
- **Key venues:** Club Space (terrace), The Ground Miami, Floyd Miami, Factory Town, MODE, UVA Wynwood, Jungle Island
- **Miami Music Week 2026** (March 24-30): Dice is the dominant ticketing platform with dozens of MMW events
- **Regular programming:** 30+ upcoming events on browse page at any time
- Smaller but growing coverage of non-electronic events (hip-hop, live music, festivals)

**Strengths:**
- Real-time accurate (ticketing platform — prices and availability are live)
- Excellent lineup data with headliner distinction
- Covers events not found on RA (hip-hop, R&B, pop, Latin music)
- Door time vs. show time distinction
- Lat/lng coordinates available via Partners API

**Weaknesses:**
- No public API — scraping or widget API key extraction required
- Some events are "Dice exclusive"

## Rate Limits

- **robots.txt:** Only blocks `/api/` path. No crawl-delay specified. Browse pages are allowed.
- Existing scraper uses 2000ms rate limit (conservative)
- `__NEXT_DATA__` approach: **single request returns ~30 events** — minimal load
- Google reCAPTCHA (invisible) present but doesn't block simple `fetch()` with standard User-Agent
- **1 request per 2 seconds is safe**

## ToS Risks

**Risk level: MEDIUM**

From [Dice.fm US Terms of Use](https://support.dice.fm/article/267-united-states-terms-of-use):
- License is "personal, non-commercial use" only
- Prohibits: "reproduce, distribute, publicly display" the services
- Prohibits: "interfere with or circumvent any feature of the App or Services"
- No explicit mention of "scraping" but non-commercial and reproduction clauses broadly apply
- robots.txt blocks `/api/` but **allows browse pages** (which contain `__NEXT_DATA__`)

**The Partners Widget API approach is arguably lower risk** since venues intentionally expose those API keys for public event display.

**Mitigation:** Using Dice.fm ticket links as `ticketUrl` drives sales to them — aligned interests. Always link to event pages and attribute source.

## Recommended Approach

**Dual strategy — fix `DiceRealScraper` + expand Partners Widget API:**

1. **Debug and fix `DiceRealScraper`:** Run locally with verbose logging to inspect what `__NEXT_DATA__` actually contains on the browse page. The JSON path has likely shifted. This is the quickest win for 30+ events per scrape.

2. **Expand the Partners Widget API pattern:** The `ClubSpaceScraper` proves `partners-endpoint.dice.fm/api/v2/events` works. Extract API keys from other Miami venue websites that embed Dice widgets (Factory Town, MODE, Floyd, The Ground, etc.) for venue-specific feeds with richer data.

3. **Set `trustTier: 'official_api'`** — promoter/venue-maintained data through Dice's platform.

4. **Partnership outreach:** Email Dice.fm's partnerships team. Pitch IRL as a discovery layer that drives ticket sales. They may offer a data feed or affiliate arrangement.

5. **Fallback:** Apify scrapers exist ([lexis-solutions/dice-fm](https://apify.com/lexis-solutions/dice-fm), [chalkandcheese/dice-fm-events-scraper](https://apify.com/chalkandcheese/dice-fm-events-scraper/api/javascript)) but add dependency and cost.

## Priority: High

Dice.fm is the dominant ticketing platform for Miami electronic music and nightlife. The existing scraper infrastructure is 90% there — `DiceRealScraper` just needs debugging, and the Partners Widget API in `ClubSpaceScraper` can be generalized to more venues. Fixing this would likely add 30-50 events immediately, particularly critical during Miami Music Week (March 24-30, 2026). Combined with RA, these two sources would cover the majority of Miami's music event landscape.
