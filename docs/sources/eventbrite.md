# Eventbrite

> Free events filter and Miami-local organizations

## Access Method

**Official API (v3):** Available at `https://www.eventbriteapi.com/v3/` with OAuth 2.0 Bearer token authentication.

**Critical limitation:** The **Event Search endpoint (`/v3/events/search/`) was deprecated in December 2019**. Remaining public endpoints only allow querying by known organization ID or venue ID — there is no location-based or free-event search.

**Current scraper status:** The existing IRL scraper (`scraper/src/sources/eventbrite-miami.ts`) uses an undocumented internal endpoint (`/api/v3/destination/search/`) with a CSRF token flow, plus HTML fallback strategies (`__NEXT_DATA__`, `__SERVER_DATA__`, JSON-LD). Currently returning **0 events** — likely broken by Eventbrite internal API changes.

**Acquisition note:** Eventbrite was acquired by Bending Spoons for ~$500M (shareholders approved Feb 27, 2026). Bending Spoons is known for cost-cutting and platform overhauls. API stability and terms are highly uncertain going forward.

## Data Quality

When working, Eventbrite provides rich structured data:
- Event name, start/end date+time, timezone
- Venue name and full address with lat/lng coordinates
- Ticket pricing including `is_free` flag and price tiers
- Images (multiple sizes)
- Categories and tags
- Online-event flag, cancellation status
- Organizer details
- Event URL and ticket URL

This is one of the **best-structured data sources** for local events.

## Rate Limits

- **Official API:** ~2,000 requests/hour, up to 48,000/day per OAuth token
- **Undocumented internal API:** No formal limits, but subject to bot detection, CSRF enforcement, and IP blocking

## ToS Risks

**Risk level: MEDIUM**

- API Terms of Use (updated May 2025) require: your own privacy policy, compliance with their general ToS, and no subversion of rate limits
- Current scraper uses undocumented internal APIs — a ToS gray area
- Post-acquisition ToS may change significantly

## Recommended Approach

1. **Short-term (days):** Debug the existing scraper. The CSRF token extraction or `/api/v3/destination/search/` endpoint likely changed. Test the HTML fallback path — Eventbrite may have moved from `__NEXT_DATA__` to a different hydration pattern.

2. **Medium-term (weeks):** Register for an official Eventbrite API key and use `GET /v3/organizations/:org_id/events/` to pull events from known Miami-based organizations. Curate a list of ~20-50 active Miami event organizer org IDs. This is ToS-compliant but requires maintaining the org list.

3. **Filter for free events:** Once ingested, filter by `is_free` flag or `$0` price tiers. The API supports this field on event objects even though the search endpoint is gone.

4. **Risk mitigation:** Given the Bending Spoons acquisition, avoid deep dependency. Treat as one of multiple sources.

**Alternative options:**
- **PredictHQ API** — aggregates events from hundreds of sources including Eventbrite; purpose-built for event discovery by location
- **Apify Eventbrite Scraper** — maintained third-party scraper with city/location filters

## Priority: Medium

Valuable source for Miami local events with rich data, but the acquisition creates uncertainty about long-term API availability. The current scraper is broken (0 events). Worth fixing short-term, but diversify rather than building deeper dependence.
