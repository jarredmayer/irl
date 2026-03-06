# Resident Advisor (RA)

> Electronic/underground events

## Access Method

**No official public API.** RA deprecated their public API in 2019. However, they expose an **undocumented GraphQL API** at `https://ra.co/graphql` which is used by their frontend SPA.

**Current scraper status:** The existing IRL scraper already pulls **259 events** from RA successfully (see `scrape-meta.json`). This is the highest-volume single source in the pipeline.

**GraphQL endpoint details:**
- URL: `https://ra.co/graphql`
- Method: POST with JSON body containing `query` and `variables`
- Key queries: `GET_EVENT_LISTINGS`, `GET_EVENT_DETAIL`, `GET_POPULAR_EVENTS`
- Location filtering: by `areaId` (Miami = Area ID **38**), pagination at 100 events/page
- Date filtering: `startDate` / `endDate` parameters
- Headers required: `User-Agent`, `Referer: https://ra.co/events/us/miami`, `Origin: https://ra.co`
- No authentication required for public event data
- RA backend is NestJS + Prisma + GraphQL

**Existing scraper:** `scraper/src/sources/resident-advisor.ts` — uses GraphQL with HTML fallback via `__NEXT_DATA__` and JSON-LD if GraphQL fails. Rate limit set at 1.5s between requests. Only ~3 API calls needed per scrape run (259 events at 100/page).

**Anti-bot measures:**
- Cloudflare CDN (nameservers: `COCO.NS.CLOUDFLARE.COM` / `ROAN.NS.CLOUDFLARE.COM`)
- GraphQL endpoint is **less protected** than HTML pages — accessible from datacenter IPs
- No CAPTCHA/JS challenge observed on the API endpoint

## Data Quality

**Excellent for electronic/underground events.** RA is the gold standard for this genre.

**Available fields (confirmed from GraphQL schema):**
- Event title (`title`), date (`date`, `listingDate`), start/end times (`startTime`, `endTime`)
- Venue name, address, area/region
- Full lineup with artist names and links (array)
- Genre tags (array of genre names — techno, house, ambient, etc.)
- Promoter/organizer info
- Ticket price (`cost` field + `isTicketed` boolean)
- Event flyer/image (high resolution, `images` array with type `FLYERFRONT`)
- Event description and editorial picks (`pick.blurb`)
- Attendance signals: `interestedCount`, `goingCount` (not currently extracted but queryable)
- Event URL (`contentUrl`)

**Strengths:**
- Deep genre taxonomy for electronic music
- Accurate lineup data with artist profiles
- Strong Miami/Fort Lauderdale coverage (Club Space, Floyd, Do Not Sit, etc.)
- Community-driven data — promoters maintain their own listings
- High signal-to-noise ratio (no generic filler events)

**Weaknesses:**
- Limited to electronic/dance music — won't cover jazz, Latin, comedy, etc.
- Some smaller events may lack complete venue addresses
- No lat/lng coordinates directly — requires geocoding

## Rate Limits

No documented rate limits for the GraphQL API (unofficial endpoint).
- Existing scraper uses 1.5s delay between requests — confirmed working
- Only ~3 API calls per scrape run (100 events/page, 259 total) — negligible load
- No evidence of IP banning at these rates
- Community scrapers use 1s delays successfully

## ToS Risks

**Risk level: MEDIUM-HIGH**

- RA's [Terms of Use](https://ra.co/terms) explicitly prohibit scraping: "You are not permitted to use, or cause others to use, any automated system or software to extract content or data from our Website for commercial purposes except where you... have entered into a written agreement with us."
- Users must not "access our Website via... automated devices, scripts, bots, spiders, crawlers or scrapers (except for standard search engine technologies)."
- **Practical assessment:** Multiple open-source scrapers exist on GitHub and commercial Apify actors operate openly. RA has not been known to pursue enforcement against small-scale, non-commercial aggregators.
- Risk increases if data is redistributed as a core product feature.
- **Mitigation:** Always link back to RA event pages (`https://ra.co{contentUrl}`), attribute source clearly.

## Recommended Approach

1. **Continue current approach** — the existing scraper works well with 259 events
2. **Improve resilience:** HTML fallback via `__NEXT_DATA__` and JSON-LD is already implemented — good defensive measure
3. **Enrich data:** Use RA's genre tags to populate the new `genres[]` field. Add `interestedCount`/`goingCount` to GraphQL query for popularity signals.
4. **Set `trustTier: 'official_api'`** — while technically scraped, RA data is promoter-maintained and highly reliable
5. **Monitor for breakage:** RA occasionally changes their GraphQL schema. Pin to known query structures and add schema validation

**Community tools for reference:**
- [djb-gt/resident-advisor-events-scraper](https://github.com/djb-gt/resident-advisor-events-scraper) — Python, GraphQL-based
- [manuelzander/ra-scraper](https://github.com/manuelzander/ra-scraper) — Python/Scrapy, events + prices + lineups
- [Apify: augeas/resident-advisor](https://apify.com/augeas/resident-advisor/api) — Managed scraping actor

## Priority: High

RA is the single most valuable source for IRL's core audience (local electronic/underground events). Already working, high data quality, strong Miami coverage. Protect and improve this integration.
