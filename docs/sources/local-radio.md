# Miami Local Radio Stations

> WDNA 88.9 FM and WVUM 90.5 FM event listings

---

## WDNA 88.9 FM (wdna.org)

> "Serious Jazz Community Public Radio" — Miami's jazz and community radio station since 1980.

### Access Method

**Website:** `wdna.org` — appears to be WordPress-based. The site has an `/events/` page and individual event pages at `/event/<slug>/` and `/events/<slug>/`. Event type archives exist at `/eventtype/<type>/` (e.g., `/eventtype/jazz-encounters/`).

**RSS feed:** Unknown. All direct fetches to `wdna.org` (including `/feed/`, `/wp-json/`, `/events/`) return a JavaScript redirect to `/lander`, suggesting aggressive bot/scraper blocking or a front-end gating mechanism (possibly a pledge drive interstitial or cookie wall). The site content is indexed by Google, so the pages do exist behind the redirect.

**API:** No public API. WordPress REST API (`/wp-json/`) is blocked by the same redirect. If the site uses The Events Calendar plugin (suggested by the `/event/` and `/events/` URL patterns), there would normally be a Tribe Events REST API at `/wp-json/tribe/events/v1/events`, but it is inaccessible.

**Scraping feasibility: MEDIUM-LOW.** The blanket redirect to `/lander` on all direct requests blocks simple HTTP scraping. A headless browser (Puppeteer/Playwright) that handles the redirect/cookie gate would likely be required. Once past the gate, WordPress event pages should have predictable HTML structure.

### Event Types

- **Jazz Encounters** — Monthly series (every 2nd Friday) at the WDNA Jazz Gallery (2921 Coral Way, Miami, FL 33145). Live jazz performance + open jam session. Tickets $0-$40, student tickets available free.
- **UM Frost Jazz Hour** — Weekly series (Thursdays) featuring University of Miami Frost School of Music students and faculty performing live from the Jazz Gallery.
- **One-off concerts** — Individual artist performances at the Jazz Gallery and promoted partner events at venues like Miami Beach Bandshell.
- **Station events** — Pledge drives, Give Miami Day fundraising, community outreach.

### Data Quality

Based on Google-indexed event pages, individual events include:
- Event title with artist name
- Date and time (e.g., "Friday, January 10, 2025, 8 PM - 10 PM")
- Venue name and address (WDNA Jazz Gallery, 2921 Coral Way)
- Description with artist bio and event details
- Ticket pricing and Eventbrite ticket links
- Parking information
- Event type/category (Jazz Encounters, UM Frost Jazz Hour, etc.)

Data quality appears **good** for the events that are listed — structured, consistent, and with useful metadata. However, the total volume is low (likely 4-8 events per month).

### Update Frequency

- Jazz Encounters: monthly (2nd Friday)
- UM Frost Jazz Hour: weekly during academic year
- Other events: sporadic
- Estimated total: **4-8 events/month**

### Priority: Low

The scraping difficulty is disproportionate to the volume of events. The `/lander` redirect blocks all simple ingestion methods. Headless browser scraping would work but is heavy infrastructure for a handful of monthly jazz events. Consider monitoring their Eventbrite organizer page as a simpler alternative for ticketed events.

---

## WVUM 90.5 FM (wvum.org)

> Award-winning student-run radio station of the University of Miami. Alternative and electronic music focus. Flagship station for Miami Hurricanes sports.

### Access Method

**Website:** `wvum.org` — Built on a custom platform (likely Squarespace or similar). Has a `/schedule` page for programming but no dedicated events section on the main site.

**University calendar (Localist):** WVUM has a group page on the University of Miami's Localist-powered events platform at `events.miami.edu/group/wvum-fm_wvum_905_fm/calendar`. This is the primary events listing mechanism.

**Localist API:** The University of Miami's Localist instance exposes a public REST API at:
```
https://events.miami.edu/api/2/events?group_id=wvum-fm_wvum_905_fm
```

The API returns JSON with rich structured fields including:
- `id`, `title`, `urlname`
- `description` / `description_text`
- `first_date`, `last_date`, `event_instances` (with start/end times)
- `location_name`, `room_number`, `address` (with coordinates)
- `experience` (in-person/virtual/hybrid)
- `ticket_url`, `ticket_cost`, `free` flag
- `has_register`, `allows_attendance`
- `keywords`, `tags`, `filters` (audience/topic categories)
- `departments` (sponsoring units)
- `created_at`, `updated_at`
- `status`, `verified`
- Image URLs

**RSS/iCal feeds:** The Localist calendar offers RSS, iCal, Google Calendar, and Outlook subscription feeds.

**Scraping feasibility: HIGH** — the Localist API is public, documented, and returns clean JSON. No authentication required for read access.

### Event Types

- **Station events** — On-campus events, listening parties, DJ showcases
- **Music festivals** — Presence at Art Basel Miami Beach, Ultra Music Festival, Miami Music Week
- **University events** — Student-oriented concerts, alumni reunions, fundraisers
- **Sports broadcasts** — Hurricanes baseball, football, basketball, volleyball (these are broadcast schedules, not physical events to attend)

### Data Quality

**API data quality: Excellent** when events are listed. The Localist API provides all standard event fields with structured location data, categorization, and timestamps.

**Volume concern: Very low.** As of March 2026, the WVUM calendar shows "No events this upcoming." Historical data also appears sparse — the calendar had no events listed for the Dec 2025 - Jan 2026 period either. The station appears to list events on the university calendar only occasionally. Most WVUM event promotion happens via social media (X/Twitter: @wvum905, Instagram) rather than the formal calendar.

### Update Frequency

- Sporadic. Events appear to be posted only for major station events (a few per semester).
- Estimated total: **0-3 events/month**, with long gaps.

### Priority: Low

The Localist API is technically excellent — clean JSON, no auth needed, rich fields — but the WVUM group almost never posts events to it. The ingestion code would be trivial to write but would yield near-zero data. Not worth prioritizing unless WVUM begins actively using their calendar. Could be bundled into a broader University of Miami events ingestion (the Localist API serves all UM groups, not just WVUM).

---

## Combined Summary

| Dimension | WDNA 88.9 FM | WVUM 90.5 FM |
|---|---|---|
| **Event volume** | 4-8/month | 0-3/month |
| **Data access** | Blocked (redirect wall) | Localist API (open JSON) |
| **Data quality** | Good (when accessible) | Excellent (when posted) |
| **Scraping difficulty** | Medium-High (headless browser) | Trivial (REST API) |
| **Event relevance** | High (jazz concerts, community) | Low (sporadic student events) |
| **ToS risk** | Medium (scraping WordPress) | None (public university API) |

### Recommended Approach

1. **WVUM:** Add a lightweight Localist API poller as part of a broader `events.miami.edu` integration. The API call is a single GET request. Even though WVUM events are sparse, the same integration covers all University of Miami groups — a much larger event pool. Minimal effort, future-proof.

2. **WDNA:** Defer. The redirect/bot blocking makes scraping non-trivial, and the event volume is low. If WDNA events are desired, the path of least resistance is to scrape their Eventbrite organizer page (Jazz Encounters tickets are sold via Eventbrite) rather than fighting the wdna.org redirect wall. Revisit if the site changes its anti-bot behavior.

### Overall Priority: Low

Neither station justifies dedicated scraper development as a standalone effort. WVUM's value is as part of a broader UM Localist integration. WDNA's events can be partially captured via existing Eventbrite ingestion. The combined unique event volume (~5-10 events/month) is too low to prioritize over higher-yield sources.
