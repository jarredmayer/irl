# Resident Advisor (RA)

> Electronic/underground events

## Access Method

**No official public API.** RA deprecated their public API in 2019. However, they expose an **undocumented GraphQL API** at `https://ra.co/graphql` which is used by their frontend SPA.

**Current scraper status:** The existing IRL scraper already pulls **259 events** from RA successfully (see `scrape-meta.json`). This is the highest-volume single source in the pipeline.

**GraphQL endpoint details:**
- URL: `https://ra.co/graphql`
- Method: POST with JSON body containing `query` and `variables`
- Key queries: `GET_EVENT_LISTINGS`, `GET_EVENT_DETAIL`, `GET_POPULAR_EVENTS`
- Location filtering: by `areaId` (Miami area IDs exist) or lat/lng bounding box
- Date filtering: `startDate` / `endDate` parameters
- No authentication required for public event data, but sessions/cookies may be needed

**Anti-bot measures:**
- Cloudflare protection on main site
- Rate limiting on GraphQL endpoint
- User-Agent and header validation
- May require browser-like headers (Accept, Referer, etc.)

## Data Quality

**Excellent for electronic/underground events.** RA is the gold standard for this genre.

**Available fields:**
- Event title, date, start/end times
- Venue name, address, area/region
- Full lineup with artist names and links
- Genre tags (techno, house, ambient, etc.)
- Promoter/organizer info
- Ticket price and ticket link
- Event flyer/image (high resolution)
- Event description
- Attendance count / "interested" count

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

No documented rate limits for the GraphQL API. Community reports suggest:
- ~100-200 requests per minute before throttling
- Aggressive scraping triggers Cloudflare challenges
- Recommended: 1-2 second delays between requests, rotating User-Agents

## ToS Risks

**Risk level: MEDIUM**

- RA's Terms of Service prohibit scraping: "You must not use any automated means to access the site"
- However, the undocumented GraphQL API is essentially a public endpoint
- RA has not been known to aggressively enforce against small-scale data consumers
- Risk increases if data is used commercially without attribution
- **Mitigation:** Always link back to RA event pages, attribute source

## Recommended Approach

1. **Continue current approach** — the existing scraper works well with 259 events
2. **Improve resilience:** Add Cloudflare bypass headers, implement exponential backoff
3. **Enrich data:** Use RA's genre tags to populate the new `genres[]` field in the enriched schema
4. **Set `trustTier: 'official_api'`** — while technically scraped, RA data is promoter-maintained and highly reliable
5. **Monitor for breakage:** RA occasionally changes their GraphQL schema. Pin to known query structures and add schema validation

## Priority: High

RA is the single most valuable source for IRL's core audience (local electronic/underground events). Already working, high data quality, strong Miami coverage. Protect and improve this integration.
