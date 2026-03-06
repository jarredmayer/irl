# Facebook Events

> Community events, Latin cultural events, neighborhood-level

## Access Method

**Official API is severely restricted.** Facebook deprecated public event search via the Graph API in 2018-2019 as part of the Cambridge Analytica fallout. The current state:

- **Graph API v22+** (v25 released Feb 2026): No public event search endpoint. `/{page-id}/events` requires a **Page Access Token** with `pages_manage_events` permission — only works for pages **you own or administer**.
- **`user_events` permission:** Requires Facebook Login and App Review approval, granted very selectively by Meta.
- **No location-based event search:** The old `search?type=event&q=miami` endpoint is permanently gone.

**Web scraping approach:**
- Facebook event pages (`facebook.com/events/123456`) render some public event data **without login**
- **[facebook-event-scraper](https://github.com/francescov1/facebook-event-scraper)** (Node.js/npm) — open-source package that can extract event data from public event pages and page event listings via `scrapeFbEventList(pageUrl)`
- **[Apify Facebook Events Scraper](https://apify.com/apify/facebook-events-scraper)** — managed scraping service ($50-200+/month)
- Anti-bot measures are **among the most aggressive on the web**: IP blocking, browser fingerprinting, behavioral analysis, CAPTCHA, dynamic CSS class names, JavaScript challenges
- Datacenter proxies are immediately blocked; residential/mobile proxy rotation required for any scale
- Facebook event *search* pages require login/cookies and are heavily protected — avoid

**Open Graph meta tags:**
- Public event URLs expose `og:title`, `og:description`, `og:image` in HTML head — parseable without JS rendering
- Only works if you already have the event URL — no discovery mechanism

## Data Quality

**Uniquely valuable for Latin cultural and community events.** Facebook is the only source that comprehensively covers:
- Latin cultural events (Calle Ocho, Little Havana festivals, salsa nights, Viernes Culturales)
- Neighborhood-level community meetups
- Church/community org events
- Pop-up markets and yard sales
- Small organizer events — many post **only** on Facebook

**Available fields (when accessible via scraping):**
- Event title and description
- Date, start time, end time (structured)
- Venue/location name and address
- Cover image
- Host/organizer info
- RSVP count ("interested" / "going") — rough popularity signal
- Ticket URL (if external ticketing)
- Category
- Online/in-person flag

**Weaknesses:**
- Data quality varies wildly — community events often have incomplete addresses, missing times, or vague descriptions
- Many community events are posted as **regular posts, not formal Facebook Events** — invisible to event scrapers
- No structured genre/category taxonomy
- Images may be low resolution
- Events may be cancelled without updates
- Attendee counts unreliable for small events

## Rate Limits

| Method | Limit |
|--------|-------|
| Graph API (page token) | ~200 calls/hour per app, with BUC rate limiting |
| Scraping (Apify/Bright Data) | ~50-200 events/run before block risk |
| Open source scrapers | Fragile; break frequently as Facebook changes DOM |

## ToS Risks

**Risk level: HIGH (scraping) / MEDIUM (API)**

- **Scraping:** Facebook ToS Section 3.2 explicitly prohibits "automated means to collect data" and "circumventing technological measures to control access"
- **Meta v. Bright Data** lawsuit (2022, settled) and *hiQ v. LinkedIn* precedent create legal ambiguity, but Meta has been aggressive about enforcement
- Account bans are the primary risk — any Facebook accounts used for cookie-based scraping will be permanently banned
- Commercial scraping services (Apify, Bright Data) absorb some risk but shift, not eliminate, legal exposure
- **Graph API:** Permitted within API terms, but app review is strict for event-related permissions

## Recommended Approach

1. **Curate a list of 20-30 Miami Facebook Pages** that frequently create formal Facebook Events (Ball & Chain, Cafe La Trova, Little Havana community centers, Calle Ocho Festival, Viernes Culturales, etc.). This mirrors the existing Instagram source pattern in `instagram-sources.ts`.

2. **Use the `facebook-event-scraper` npm package** to periodically pull events from these known pages via `scrapeFbEventList(pageUrl)`. Avoids login requirements for public events and keeps the scraping surface small and targeted.

3. **Open Graph enrichment:**
   - When a Facebook event URL is discovered from another source (Instagram, community submissions), parse the OG meta tags for additional data
   - Low volume, low risk

4. **Community submission bridge:**
   - Allow users to submit events by pasting a Facebook event URL
   - Parse OG data to pre-fill the submission form
   - This turns Facebook into a submission source without requiring direct scraping

5. **Do NOT attempt broad Facebook event search/discovery scraping.** The risk/reward ratio is poor — high ban risk, high maintenance cost, moderate data yield.

6. **Fallback: Manual curation** for the most important Latin cultural events posted as regular Facebook posts (not formal Events). Add to a `facebook-sources.ts` following the `knownEvents` pattern.

## Priority: Medium

Facebook is uniquely valuable for Latin cultural and neighborhood-level events in Miami that don't appear on Eventbrite/Dice/RA. However, access restrictions, legal risk, and maintenance burden make it a second-tier priority. Best ROI is a small curated list of high-value Pages scraped with the open-source Node.js package, rather than any broad discovery approach.
