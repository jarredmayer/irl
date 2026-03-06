# Bands in Town

> Touring artist shows, last-minute additions

## Access Method

**API type:** REST API v3 (read-only, JSON). Base URL: `https://rest.bandsintown.com`

**Auth:** `app_id` query parameter on every request. No OAuth required for basic access.

**How to get an `app_id`:**
- **Artist/Manager route:** Log into Bandsintown for Artists → Settings → General → "Get API Key." Each key is tied to a single artist by default.
- **Platform/aggregator route:** Must email `API@bandsintown.com` to negotiate a partnership agreement. Multi-artist discovery use cases require explicit written approval.

**Key constraint:** The API is designed for artists promoting their own shows. Using it as a general event-discovery/aggregation engine is **not authorized under the standard `app_id`** and requires a partnership.

**No location-based search:** There is no "events in Miami" endpoint. You must query artist-by-artist via `GET /artists/{name}/events` and filter by `venue.city` / `venue.region`.

## Data Quality

**Available fields per event:**
- `id`, `artist_id`, `datetime`, `on_sale_datetime`
- `description`, `lineup[]` (multi-artist support)
- `venue` → `{name, city, region, country, lat, lng}`
- `offers[]` → `{type, url, status}` (ticket links)
- `url` (Bandsintown event page)

**Available fields per artist:**
- `name`, `id`, `url`, `image_url`, `thumb_url`
- `facebook_page_url`, `mbid` (MusicBrainz ID)
- `tracker_count`, `upcoming_event_count`

**Strengths:** Venue geo-coordinates, ticket offer links with status, multi-artist lineup, on-sale datetime, MusicBrainz ID for cross-referencing.

**Weaknesses:** No genre/category field. No image per event (only per artist). No capacity or age-restriction fields. No price information. No event description beyond a short text.

## Rate Limits

Not publicly documented. Watch for `429` responses and `X-RateLimit-*` headers. Community reports suggest limits are relatively permissive for single-artist use but would quickly become a problem if iterating over thousands of artist names.

## ToS Risks

**Risk level: HIGH**

The [Data Application Terms of Use](https://corp.bandsintown.com/data-applications-terms) contain several provisions that directly conflict with event aggregation:

1. **No competitive use:** Cannot display content on pages that "compete with or adversely affect" Bandsintown's services
2. **No undistinguished aggregation:** Mixing Bandsintown data with third-party event data "without distinction" is explicitly prohibited
3. **No commercial use without written approval**
4. **No local caching** (widgets) / only session-based caching (API)
5. **Attribution required:** Track buttons, RSVP, and ticket links must be rendered per their spec
6. **Termination at will:** Can revoke access "at any time, for any reason, without notice"

## Recommended Approach

1. **Do not build on the free artist-scoped `app_id`.** It violates ToS for aggregation use.
2. **Contact `API@bandsintown.com`** to explore a data partnership. Ask about: (a) location-based events feed, (b) commercial use rights, (c) caching/storage permissions, (d) rate limits for bulk queries.
3. **In the interim, treat as a secondary enrichment source** — use it to enrich events already discovered from other sources (e.g., add lineup data, tracker counts) rather than as a primary ingestion pipe.
4. **Alternative:** Ticketmaster Discovery API covers the same touring-artist segment with fewer legal barriers and a proper geo-search endpoint.

## Priority: Medium

Excellent data quality for touring artists but no location-search endpoint, restrictive ToS for aggregation, and partnership approval required. Becomes high-priority only if a partnership is secured.
