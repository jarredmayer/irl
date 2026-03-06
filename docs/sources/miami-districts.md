# Miami District Event Pages

> Wynwood BID, Brickell City Centre, MiMo District

## Overview

Miami's neighborhood business improvement districts and commercial developments maintain event calendars for their areas. These capture neighborhood-level events (art walks, pop-ups, markets, community gatherings) that don't appear on major ticketing platforms.

## Summary Table

| Source | Priority | Method | Anti-Bot | Value |
|---|---|---|---|---|
| **Wynwood BID** | **High** | WP REST API or HTML scrape | None | High — active calendar, good data, community events |
| **Brickell City Centre** | **Low** | Skip — use Eventbrite as proxy | Aggressive (503s) | Low — corporate events, bot-blocked |
| **MiMo District** | **Low** | WP REST API or iCal if available | Possible hosting issues | Low — very few events |

---

## Wynwood BID (Business Improvement District)

**Website:** wynwoodmiami.com
**Tech stack:** WordPress CMS with `wp-pagenavi` pagination, schema.org JSON-LD markup, Google Tag Manager, Facebook Pixel, Smartlook, Clarity analytics

### Access Method
- **Dedicated `/events/` page** with well-organized category-filtered event listing
- **Categories:** Art, Food + Drink, Music + Dance, Festivals + Markets, Health + Fitness, and more
- **WordPress REST API** likely available at `/wp-json/wp/v2/` — best ingestion path if events are a custom post type
- **Business submission dashboard** — businesses can submit their own events
- RSS feed at `/feed/` exists but may be misconfigured (returns homepage HTML instead of XML)
- No iCal export observed
- No aggressive anti-bot measures — standard WordPress site, pages load fine via direct fetch

### Data Quality
- **Events:** Wynwood Art Walk (monthly, second Saturday), gallery openings, pop-up markets, mural tours, street festivals, food events, live music, Panthers games
- **Fields:** Titles, dates, times, venue references, descriptions, category tags
- **Strengths:** Authoritative source for Wynwood-specific events. Active and well-maintained — current 2026 dates confirmed (March 7, Panthers games through April).
- **Weaknesses:** Some events may be neighborhood-wide (no specific address within Wynwood)

**Note:** Wynwood Art Walk is already hardcoded in the existing scraper at `scraper/src/sources/pop-ups.ts`. A proper wynwoodmiami.com scraper would replace that with live data and add dozens of additional events.

### Recommended Approach
1. **Probe WP REST API:** Check `/wp-json/wp/v2/` for available endpoints and events custom post type
2. **Fallback:** HTML scrape the paginated `/events/` grid with standard CSS selectors
3. Default neighborhood: `"Wynwood"`, default area coordinates: `{ lat: 25.8015, lng: -80.1993 }`
4. Supplement with Instagram scraping for @wynwoodmiami

### Priority: **High** — Active calendar, good data quality, replaces hardcoded Art Walk data

---

## Brickell City Centre

**Website:** brickellcitycentre.com
**Tech stack:** Custom-built site (not WordPress), Qualtrics Site Intercept, Facebook Pixel. Recently acquired by **Simon Property Group** from Swire Properties — tech stack may be transitioning to Simon's platform.

### Access Method
- Events page at `/events/` exists with upcoming events (HIIT classes, Pride Month events, cultural events)
- **No public RSS feed, iCal, or API** found
- **Aggressive bot protection:** Returns **503 errors** on all programmatic fetch attempts — likely Cloudflare, Akamai, or similar enterprise WAF. Simon Property Group uses enterprise-grade bot protection across their portfolio.
- Would require headless browser with stealth plugins, and likely ongoing maintenance

### Data Quality
- **Events:** Fitness classes, seasonal celebrations, retail promotions, cultural events
- **Strengths:** Professional presentation
- **Weaknesses:** Primarily commercial/retail-oriented. Lower community focus.

### Recommended Approach
- **Skip direct scraping** — the 503 blocks and corporate event focus make this poor ROI
- Capture Brickell area events via existing Eventbrite scraper and other aggregators instead
- Fixed venue: `{ lat: 25.7661, lng: -80.1916, address: "701 S Miami Ave, Miami, FL 33131", neighborhood: "Brickell" }`

### Priority: **Low** — Bot-blocked, corporate events, better served by Eventbrite proxy

---

## MiMo District (Miami Modern)

**Website:** `mimoboulevard.org` (MiMo Biscayne Association)
**Tech stack:** WordPress CMS with **Timely** calendar plugin

**Note:** `mimodistrict.com` redirects to a `/lander` page returning 403 — it is not the active site.

### Access Method
- **Events page at `mimoboulevard.org/events/`** with monthly, weekly, and daily calendar views
- **Timely calendar plugin** supports subscription/export to Google Calendar, Outlook, and other calendar apps — iCal export likely available
- WordPress REST API likely available
- Site returned 503 on some direct fetches — may be intermittent hosting issues (small nonprofit site) rather than intentional bot blocking

### Data Quality
- **Events:** Association meetings, Earth Day, Taste of MiMo, Cinco de MiMo, neighborhood gatherings
- **Strengths:** Hyper-local community events, authentic neighborhood character
- **Weaknesses:** Very low event volume. Volunteer-run nonprofit with irregular updates. Primarily association meetings plus occasional seasonal events.

### Recommended Approach
- Try WP REST API or Timely calendar feed (iCal) if available
- Low volume means manual monitoring could suffice
- The neighborhood's entertainment/dining events are better captured through individual venue listings or aggregators
- Fixed area: `{ lat: 25.8540, lng: -80.1810, neighborhood: "MiMo District" }`

### Priority: **Low** — Very few events, better served by community submissions

---

## Overall Recommended Approach

1. **Focus on Wynwood BID** as the only high-value target. Probe the WP REST API, then fall back to HTML scraping. This replaces the hardcoded Art Walk in `pop-ups.ts` and adds dozens of events.

2. **Skip Brickell City Centre** — aggressive bot protection and corporate events make it poor ROI. Existing Eventbrite and other aggregators capture Brickell events.

3. **MiMo is optional** — try the Timely calendar feed if it's easily accessible, otherwise leave to community submissions.

4. **Instagram remains primary channel** for all three districts — they're more active on social media than their websites. Existing Instagram Sources pipeline (156 events) already captures some of this.

5. **Set `trustTier: 'scraped_known_venue'`** for all district sources.

## Overall Priority: Medium

Wynwood BID alone elevates this category — it's a high-value, easy-to-scrape WordPress site with an active events calendar. The other two districts are low priority.
