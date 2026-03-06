# Shotgun

> Electronic/art events, strong in underground and cultural programming

## Access Method

**No official public API.** Shotgun (shotgun.live) is a ticketing and event discovery platform focused on electronic music, art, and cultural events. They do not offer a documented API for third-party consumers.

**Web scraping approach:**
- Shotgun is a modern SPA (React/Next.js based)
- Event pages render with structured data (JSON-LD and Open Graph tags)
- City-specific event listing pages exist (e.g., `shotgun.live/cities/miami`)
- Event data is hydrated via `__NEXT_DATA__` or similar SSR payloads
- No heavy anti-bot measures observed — standard Cloudflare protection

**Alternative approaches:**
- Parse JSON-LD structured data from event pages (schema.org/Event markup)
- Monitor RSS/social feeds from Shotgun's Miami-focused promoters
- Use Shotgun's search/filter UI to identify Miami events, then scrape detail pages

## Data Quality

**Good for electronic and art events.** Overlaps somewhat with RA but covers a broader cultural spectrum.

**Available fields:**
- Event title and description
- Date, start time, end time
- Venue name and address
- Ticket price tiers (including free)
- Event image/flyer
- Artist/DJ lineup
- Genre tags
- Organizer/promoter info
- Age restriction info

**Strengths:**
- Covers art events and cultural programming beyond pure electronic music
- Good lineup data
- Price tier information (GA, VIP, early bird, etc.)
- Promoter-maintained listings (reliable data)

**Weaknesses:**
- Miami coverage is **moderate** — Shotgun is stronger in European markets (Paris, Berlin, London)
- Fewer events compared to RA for the Miami area
- May not cover smaller local venues as comprehensively

## Rate Limits

No documented rate limits. Standard web scraping considerations apply:
- Respect `robots.txt`
- 1-2 second delays between requests
- Rotate User-Agents

## ToS Risks

**Risk level: LOW-MEDIUM**

- Standard ToS prohibiting automated access
- Shotgun is a smaller platform and unlikely to aggressively enforce
- JSON-LD structured data is designed for machine consumption (search engines)
- **Mitigation:** Attribute source, link to Shotgun event pages, keep scraping volume low

## Recommended Approach

1. **Start with JSON-LD parsing** from event detail pages — this is the most reliable and least intrusive approach
2. **Build a city listing scraper** that monitors `shotgun.live/cities/miami` for new events
3. **Set `trustTier: 'official_api'`** — promoter-maintained data is reliable
4. **Evaluate coverage:** Run a test scrape to determine how many Miami events Shotgun actually has. If <20/month, may not justify dedicated integration effort.
5. **Cross-reference with RA:** Many electronic events appear on both platforms. Use for dedup validation and data enrichment.

## Priority: Medium

Good data quality and relevant genre coverage, but Miami-specific volume is uncertain. Worth a test scrape to evaluate actual coverage before investing in a full integration. If coverage is strong, elevate to High priority.
