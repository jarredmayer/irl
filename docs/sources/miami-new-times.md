# Miami New Times

> Alt-weekly events calendar

## Access Method

**No public API or RSS feed.** Miami New Times runs on **WordPress** (Voice Media Group / "vmg" theme) with events served at `/eventsearch/`. No Cloudflare protection — site is directly accessible.

**URL patterns:**
- Listing page: `miaminewtimes.com/eventsearch/?narrowByDate=YYYY-MM-DD&page=1`
- Detail pages: `miaminewtimes.com/event/{slug}-{numeric-id}/`
- Event type archives: `miaminewtimes.com/eventtype/{type}/`

**Internal AJAX endpoint:** `/wp-admin/admin-ajax.php` — nonce-protected, not a viable public API.

**Current scraper status:** `scraper/src/sources/miami-new-times.ts` exists and uses Cheerio HTML scraping. **Errors with "Timed out after 120s"**. Root cause identified: the N+1 scraping pattern (1 listing page + N detail pages per day, across 14 days) with 500ms/1000ms delays easily exceeds the 120s timeout. Uses 1000ms between listing requests and 500ms between detail fetches.

**No JSON-LD Event schema** on detail pages (only generic WebPage schema). Listing pages render server-side HTML.

**Bot detection:** reCAPTCHA v3 is loaded on the site (site key: `6LeLxtErAAAAAC8i_LTqxCNvETXTw3wZZePixRFp`), which may trigger on rapid automated requests and cause hangs — likely contributing to the timeout issue.

## Data Quality

**Good editorial value for local events.** Miami New Times is the premier alt-weekly for the Miami area and covers:
- Music shows across all genres (electronic, hip-hop, Latin, jazz, indie, punk, hardcore)
- Art openings and gallery events
- Food/drink events (pop-ups, tastings, restaurant openings)
- Comedy shows
- Community events and festivals
- Cultural events (Little Havana, Little Haiti, Overtown, etc.)
- Strong at alt-scene venues (Churchill's Pub, etc.)

**Available fields (verified from live pages):**
- Event title — always present
- Date/Time — present (e.g., "Friday, March 6, 8:00 pm")
- Venue name — present (e.g., "Churchill's Pub")
- Address — sometimes missing from detail page, requires regex extraction
- Neighborhood — sometimes present as a field on listings
- Category — present (e.g., "Hardcore, Music")
- Image — high-res featured image available
- Price — present when available (e.g., "$29.71"), sometimes "TBA"
- Ticket link — present (Ticketmaster/TicketWeb affiliates)
- Description — **frequently thin or absent** on detail pages

**Sample volume:** ~8 events per day on listing pages.

**Strengths:**
- Covers the full spectrum of Miami events (not just one genre)
- Strong local focus — no tourist-trap filler
- Covers neighborhoods deeply (Little Havana, Wynwood, Design District, etc.)
- Particularly strong for alternative/indie scene events

**Weaknesses:**
- Descriptions are frequently thin or absent — lower metadata quality than Eventbrite or Dice
- No structured JSON-LD for events
- End times and prices often missing
- Address extraction can be unreliable

## Rate Limits

- **robots.txt:** No crawl-delay directive. `/events` and `/eventsearch` paths are **not disallowed** — scraping is permitted by robots.txt.
- reCAPTCHA v3 may throttle or block rapid automated requests
- Existing scraper uses 1000ms (listings) / 500ms (details) delays

## ToS Risks

**Risk level: MEDIUM-HIGH**

- ToS explicitly prohibits using "any automated device, spider, robot, crawler, data mining tool" without express permission
- Standard boilerplate for media sites — scraping event metadata (titles, dates, venues) carries lower practical risk than scraping editorial content
- Voice Media Group is a mid-size media company — unlikely to pursue legal action for small-scale metadata scraping
- **Mitigation:** Attribute source, link to New Times event pages, keep volume low
- Consider editorial partnership — alt-weeklies sometimes partner with local apps

## Recommended Approach

1. **Fix the timeout — architecture change required:**
   - **Option A (recommended):** Extract data from listing pages only (title, date, venue, neighborhood, price, image, link). Skip detail page fetches entirely. This cuts request count from ~120+ to ~14.
   - **Option B:** Fetch detail pages only for events missing critical fields, with a hard cap (e.g., max 20 detail fetches per run).
   - **Option C:** Reduce date range from 14 days to 7 days.

2. **Add proper browser User-Agent** to avoid reCAPTCHA v3 triggering.

3. **Increase per-request timeout** while reducing total request count — the issue is per-request blocking, not aggregate time.

4. **Set `trustTier: 'scraped_known_venue'`** — curated content from a known local publication.

5. **Editorial partnership:** Consider reaching out to Miami New Times for a content partnership. They may provide a data feed in exchange for attribution and traffic.

## Priority: Medium

Miami New Times covers the full spectrum of Miami local events with editorial curation, but data quality is only moderate (thin descriptions, missing addresses). The fix is straightforward — primarily a timeout/architecture issue, not a fundamental access problem. The site is not behind hard anti-bot walls and robots.txt is permissive. Worth fixing but data enrichment from other sources may be needed.
