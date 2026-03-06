# Miami New Times

> Alt-weekly events calendar

## Access Method

**No public API.** Miami New Times is part of the Voice Media Group alt-weekly network. Their events calendar lives at `miaminewtimes.com/events` (or similar paths, they've reorganized several times).

**Current scraper status:** The existing IRL scraper has a "Miami New Times" source that **errors with "Timed out after 120s"**, suggesting the scraper exists but is broken — likely due to site redesign or anti-bot measures.

**Web scraping approach:**
- The events calendar is server-rendered HTML
- Voice Media Group sites have been known to use various CMS platforms (historically WordPress, custom)
- May have Cloudflare or similar CDN protection
- Events pages may require JavaScript rendering (headless browser needed)
- Site has been redesigned multiple times — scraper selectors may be stale

**Potential structured data:**
- Events may have JSON-LD or schema.org markup (common for media sites)
- RSS feeds may exist for editorial content but unlikely for events calendar
- Check for `sitemap.xml` entries for events

## Data Quality

**High editorial value for local events.** Miami New Times is the premier alt-weekly for the Miami area and covers:
- Music shows across all genres (electronic, hip-hop, Latin, jazz, indie)
- Art openings and gallery events
- Food/drink events (pop-ups, tastings, restaurant openings)
- Comedy shows
- Community events and festivals
- Cultural events (Little Havana, Little Haiti, Overtown, etc.)

**Available fields (typical for alt-weekly calendars):**
- Event title
- Date, start time (end time sometimes missing)
- Venue name and address
- Category (music, art, food, comedy, etc.)
- Short description / editorial blurb
- Image (often editorial photography)
- Price info (sometimes)
- Ticket link (sometimes)

**Strengths:**
- Editorially curated — events are selected for quality, not just listed
- Covers the full spectrum of Miami events (not just one genre)
- Strong local focus — no tourist-trap filler
- Editorial descriptions add context beyond raw event data
- Covers neighborhoods deeply (Little Havana, Wynwood, Design District, etc.)

**Weaknesses:**
- No structured API — scraping required
- Data completeness varies (end times, prices often missing)
- Calendar may not be comprehensive — they curate selectively
- Site redesigns break scrapers periodically

## Rate Limits

No documented rate limits. Standard web scraping considerations:
- Respect `robots.txt`
- 2-3 second delays between requests
- Avoid scraping during peak hours

## ToS Risks

**Risk level: MEDIUM**

- Standard media site ToS prohibiting automated access
- Voice Media Group is a mid-size media company — unlikely to pursue legal action against small-scale scraping
- **Mitigation:** Attribute source, link to New Times event pages, keep volume low
- Consider reaching out editorially — alt-weeklies sometimes partner with local apps

## Recommended Approach

1. **Debug the existing scraper:** The timeout error suggests the scraper needs updating. Check if the events calendar URL changed or if the page requires JavaScript rendering.

2. **Use headless browser (Puppeteer):** The existing scraper infrastructure already uses Puppeteer — ensure the New Times scraper is using it with proper wait conditions.

3. **Parse JSON-LD first:** Check event pages for `<script type="application/ld+json">` with schema.org/Event data. This is more stable than CSS selectors.

4. **Fallback to HTML parsing:** If no structured data, parse the calendar HTML with Cheerio.

5. **Set `trustTier: 'scraped_known_venue'`** — editorially curated content from a known local publication.

6. **Editorial partnership:** Consider reaching out to Miami New Times for a content partnership. They may provide a data feed in exchange for attribution and traffic.

## Priority: High

Miami New Times is the single best source for editorially curated, cross-genre local events. The existing scraper just needs fixing (timeout issue). High value for IRL's mission of surfacing quality local events across all categories.
