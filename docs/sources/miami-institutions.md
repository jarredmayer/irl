# Miami Institution Calendars

> PAMM, Wolfsonian, ICA Miami, Bass Museum, Little Haiti Cultural Complex

## Overview

Miami's cultural institutions maintain event calendars on their websites. These are high-quality, editorially curated events (exhibitions, openings, talks, workshops, performances) that serve IRL's mission of surfacing authentic local culture.

The existing scraper already pulls **393 events from "Cultural Attractions"** — this document assesses individual institution access methods for improved coverage and data quality.

## Summary Table

| Institution | Best Data Source | Data Quality | Ease of Ingestion | Anti-Bot Risk | Priority |
|---|---|---|---|---|---|
| **Bass Museum** | iCal feed + Tribe Events API | Excellent | Trivial (iCal subscribe) | None | **P1** |
| **ICA Miami** | JSON-LD + WP REST API | Good | Easy (parse JSON-LD) | Low | **P2** |
| **PAMM** | WP REST API (`/wp-json/wp/v2/event`) | Good (dates need parsing) | Medium (API + HTML parse) | Low | **P3** |
| **Wolfsonian** | HTML scraping (JS-rendered) | Poor | Hard (headless browser) | Low | **P4** |
| **Little Haiti** | HTML scraping | Poor | Hard (Akamai protection) | High | **P5** |

---

## Bass Museum of Art

**Website:** thebass.org
**Tech stack:** WordPress with **The Events Calendar (Tribe Events)** plugin

### Access Method
- **iCal feed (confirmed working):** `https://thebass.org/events/list/?ical=1` — valid iCalendar 2.0 data. Also supports `?outlook-ical=1` and `webcal://` subscription protocol.
- **Tribe Events REST API:** `https://thebass.org/wp-json/tribe/views/v2/html` — returns filtered event views with embedded JSON state
- **JSON-LD Event schema (confirmed):** Full schema.org/Event markup including `startDate`, `endDate` (ISO 8601 with timezone), `image`, `URL`, `eventAttendanceMode`, `eventStatus`
- Google Calendar / Outlook 365 subscription links built in

### Data Quality — BEST OF ALL FIVE
- **iCal fields:** DTSTART, DTEND (with timezone), SUMMARY, DESCRIPTION, URL, CATEGORIES, ATTACH (image), UID, CREATED, LAST-MODIFIED
- **JSON-LD fields:** name, startDate, endDate, image, url, eventAttendanceMode, eventStatus
- Category filtering: Bass Babies, Open Studio, Workshops, Teen programs, etc.
- Cost/pricing data available. Day-of-week and time-of-day filtering.
- **Events:** Exhibition openings, artist talks, workshops, Miami Beach cultural programming
- **Volume:** 9+ events in current month, regularly updated

### Recommended Approach
- Subscribe to iCal feed — zero scraping required, auto-updates
- Parse with any iCal library (e.g., `ical.js` for Node)
- Explore Tribe Events REST endpoint for richer filtering
- Fixed venue: `{ lat: 25.7953, lng: -80.1305, address: "2100 Collins Ave, Miami Beach, FL 33139", neighborhood: "South Beach" }`

### Priority: **P1 — High** — Best data access of any institution, trivial to integrate

---

## ICA Miami (Institute of Contemporary Art)

**Website:** icamiami.org
**Tech stack:** WordPress with SiteOrigin Panels, ACF, New Relic

### Access Method
- **JSON-LD Event schema (confirmed):** Calendar page at `/calendar/` includes full schema.org/Event markup with `name`, `startDate` (ISO 8601), `location` (Place with street address)
- **WordPress REST API (confirmed):** `https://icamiami.org/wp-json/wp/v2/posts` returns JSON. Events likely stored as custom post type — explore `/wp-json/` for endpoint discovery.
- **Add to Calendar widgets:** Third-party integration (addtocalendar.com) provides per-event iCal export
- 23+ event type categories for filtering. Multilingual support (English, Spanish, Kreyol).

### Data Quality
- **JSON-LD provides:** event name, startDate (ISO 8601), location name, street address, city
- **Events:** Exhibition openings, artist talks, performances, film screenings, community programs
- **Strengths:** Always free admission, strong contemporary art programming, Design District location
- **Weaknesses:** endDate and description not always in JSON-LD; full details require individual page scraping

### Recommended Approach
- Parse JSON-LD from `icamiami.org/calendar/` for clean structured event data — no JS rendering needed
- Supplement with WP REST API exploration for custom post type endpoint
- Fixed venue: `{ lat: 25.8128, lng: -80.1928, address: "61 NE 41st St, Miami, FL 33137", neighborhood: "Design District" }`
- All events default to `isFree: true`

### Priority: **P2 — Medium-High** — Clean JSON-LD, free admission, good location

---

## PAMM (Pérez Art Museum Miami)

**Website:** pamm.org
**Tech stack:** WordPress with block theme ("pamm-block-theme"), Yoast SEO, ACF, imgix CDN

### Access Method
- **WordPress REST API (confirmed working):** `https://www.pamm.org/wp-json/wp/v2/event` — returns structured JSON with pagination (`per_page`, `page`), filtering by `event-category`, `event-venue`, `event-tag` taxonomies
- Use `?_embed` parameter to inline featured images and taxonomy terms
- **No iCal feed, no JSON-LD Event schema** (only generic WebPage schema on listing pages)

### Data Quality
- **API fields:** id, title, slug, content (full HTML), excerpt, featured_media (responsive srcsets), event-venue taxonomy, event-category taxonomy, event-tag taxonomy, publication/modification dates
- **Key weakness:** Event start/end dates and times are embedded in the content HTML, not exposed as discrete API fields. ACF custom fields returned empty. Requires HTML parsing of content body.
- **Events:** Exhibition openings, artist talks, community programs, family workshops, film screenings, live music in sculpture garden
- **Strengths:** High-quality images via imgix, detailed descriptions, professional curation
- Updated within hours (same-day modification timestamps confirmed)

### Recommended Approach
- Hit `pamm.org/wp-json/wp/v2/event` with pagination params
- Build lightweight HTML parser (Cheerio) to extract event dates/times from `content` field
- Fixed venue: `{ lat: 25.7854, lng: -80.1863, address: "1103 Biscayne Blvd, Miami, FL 33132", neighborhood: "Downtown" }`

### Priority: **P3 — Medium** — Premier institution but date extraction requires extra parsing work

---

## The Wolfsonian-FIU

**Website:** wolfsonian.org
**Tech stack:** Custom static-style site (not WordPress), Google Tag Manager

### Access Method
- **No API, RSS, iCal, or structured data feeds**
- **No JSON-LD or schema.org event markup**
- Events load dynamically via JavaScript with "Load More" button on `/whats-on/events/`
- Requires headless browser (Puppeteer/Playwright) to render content

### Data Quality
- **Events:** Exhibition openings, lectures, curator talks, academic events, design-focused programming
- **Fields from listing page:** Event title, date (text format), brief description
- No structured date fields, no venue/location metadata, no ticket/price data in listing markup
- **Strengths:** Niche design/architecture focus — unique events not found elsewhere
- **Weaknesses:** Low event volume, JS-rendered, minimal semantic HTML

### Recommended Approach
- Use Playwright/Puppeteer to render `/whats-on/events/`, intercept XHR requests to discover underlying data API (Load More button likely calls an API)
- Low event volume makes manual entry a viable alternative
- Fixed venue: `{ lat: 25.7811, lng: -80.1310, address: "1001 Washington Ave, Miami Beach, FL 33139", neighborhood: "South Beach" }`

### Priority: **P4 — Low** — Niche content, JS-rendered, low volume — manual curation may suffice

---

## Little Haiti Cultural Complex

**Website:** `miami.gov/LHCC` (City of Miami government site)
**Tech stack:** ASP.NET with **Granicus OpenCities CMS**, jQuery 1.12.4, Google Maps API

**Note:** `littlehaiticulturalcenter.com` has been taken over by an unrelated streaming site. The authoritative source is `miami.gov/LHCC`.

### Access Method
- **No API, RSS, iCal, or structured data feeds**
- **No JSON-LD or schema.org event markup**
- Events listed as simple HTML links on `/LHCC/Events-directory` with brief descriptions
- **Akamai bot detection** deployed (ak.t timestamp tokens, encrypted ak.ak parameters) — enterprise-grade anti-bot protection

### Data Quality
- **Events:** Haitian cultural events, Caribbean art exhibitions, community gatherings, dance performances, music events
- **Fields:** Basic only — event title, brief description (1-2 sentences), link to detail page
- No structured dates, times, venues, or ticket information on listing pages
- Mix of current and stale events (Art Week 2025 still listed alongside March 2026 events)
- **Strengths:** Unique Haitian/Caribbean cultural content not found anywhere else
- **Weaknesses:** Low update frequency, stale events, Akamai protection, minimal data

### Recommended Approach
- **Consider alternative sources first:** Eventbrite (`eventbrite.com/d/fl--miami/little-haiti/`) and Miami tourism sites aggregate LHCC events with better structure
- If direct scraping required: residential proxy or headless browser with stealth plugins to handle Akamai
- Weekly polling is sufficient given low update frequency
- Supplement with Instagram monitoring for the venue's social accounts
- Fixed venue: `{ lat: 25.8355, lng: -80.1982, address: "212 NE 59th Terrace, Miami, FL 33137", neighborhood: "Little Haiti" }`

### Priority: **P5 — Low (direct scraping) / High (via alternative sources)** — Unique cultural content critical for IRL's diversity goals, but access is the hardest of all five institutions

---

## Overall Recommended Approach

### Phase 1 — Standards-based feeds (immediate)
- **Bass Museum:** Subscribe to iCal feed at `thebass.org/events/list/?ical=1`. Zero scraping needed.

### Phase 2 — WordPress API + structured data (straightforward)
- **ICA Miami:** Parse JSON-LD from `icamiami.org/calendar/`. Supplement with WP REST API.
- **PAMM:** Hit `pamm.org/wp-json/wp/v2/event` with pagination. Parse dates from content HTML.

### Phase 3 — Headless scraping (requires more effort)
- **Wolfsonian:** Headless browser for `/whats-on/events/`. Low volume — manual entry is viable alternative.
- **Little Haiti:** Use alternative sources (Eventbrite, tourism sites). Direct scraping is last resort.

### Cross-cutting
- For WordPress sites (PAMM, ICA, Bass): check `/wp-json/` to enumerate all endpoints and custom post types
- Fixed venue enrichment for all five — single address per institution
- Set `trustTier: 'scraped_known_venue'` for all sources
- Weekly refresh schedule sufficient

## Overall Priority: Medium-High

Cultural institutions provide unique, high-quality events that differentiate IRL from generic aggregators. Bass Museum (iCal) and ICA Miami (JSON-LD) are the quickest wins. PAMM requires moderate effort. Wolfsonian and Little Haiti are low priority for direct scraping.
