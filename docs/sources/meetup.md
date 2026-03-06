# Meetup.com

> Recurring community events

## Access Method

**GraphQL API only** — the old REST API is fully deprecated.

- **API endpoint:** `POST https://api.meetup.com/gql` (or `/gql-ext` for extended queries)
- **Authentication:** OAuth 2.0 required (Bearer tokens). No simple API keys. Must register an OAuth consumer and complete the server auth flow.
- **Paywall:** **Meetup Pro subscription required to apply for API access** (~$30/month on 6-month plan, ~$35/month month-to-month). Having Pro does not guarantee approval — Meetup can deny or revoke access at will.
- **Legacy REST API:** Fully deprecated.

**Key GraphQL queries:**
- `searchEvents`: Search events by location (lat/lng + radius), keyword, date range
- `groupByUrlname`: Get group details and upcoming events
- `event`: Get full event details by ID

**Location-based search:** Uses lat/lon coordinates, not city names. Miami (~25.76, -80.19) and Fort Lauderdale (~26.12, -80.14) with ~15-25 mile radius. Results require post-processing to trim nearby areas — no exact city-boundary filtering.

## Data Quality

**Good for recurring community events.** Meetup excels at:
- Tech meetups, coding workshops
- Running clubs, hiking groups, fitness classes
- Book clubs, language exchanges
- Networking events, professional groups
- Hobby groups (board games, photography, etc.)

**Available fields:**
- Event title and description (often detailed, with agenda)
- Date, start time, end time, timezone
- Venue name and address (if in-person)
- Lat/lng coordinates
- RSVP count and attendee limit
- Group name and URL
- Category and topics (structured tags)
- Online/in-person flag
- Fee info (free vs. paid, amount)
- Event image
- Recurring event flag and recurrence info
- Host/organizer info

**Strengths:**
- Excellent for recurring events (weekly, monthly meetups)
- Structured location data with coordinates
- Active community-maintained data
- Good category/topic taxonomy
- Free vs. paid flag with pricing
- High density of active groups in Miami/Fort Lauderdale corridor

**Weaknesses:**
- Heavy on tech/professional events — limited coverage of music, nightlife, cultural events
- Event descriptions can be boilerplate for recurring events
- Some groups are inactive but still show "upcoming" events
- Image quality varies
- Member/attendee data intentionally restricted for privacy

## Rate Limits

- **Points-based system** on GraphQL API (replaced old 30-requests-per-10-seconds REST limit)
- When exceeded: `RATE_LIMITED` error with `consumedPoints` and `resetAt` timestamp
- Exact point allocations per query not publicly documented — must monitor via error responses
- **For periodic ingestion (daily/weekly sync), rate limits are unlikely to be a practical problem**

## ToS Risks

**Risk level: MEDIUM**

- **License revocable at any time** for any reason, including if Meetup determines usage "undermines its commercial interests"
- **Data use restricted** to "applications related to Meetup events and groups" — aggregating into a broader events platform could be interpreted as competitive use
- **No data resale or redistribution** beyond facilitating Meetup event participation
- **Monitoring/audit clause:** Meetup can audit your usage at any time
- Attribution required: links back to Meetup event pages
- Cannot store data indefinitely — should refresh regularly

**Scraping alternative:** Multiple open-source tools exist ([scrape-meetup](https://github.com/digitalcolony/scrape-meetup), [Apify scrapers](https://apify.com/filip_cicvarek/meetup-scraper)), but IP blocking is aggressive for high-volume scraping.

## Recommended Approach

1. **Start with scraping for validation.** Use a lightweight scraper or Apify actor to pull Miami/FTL events and assess data quality and volume before committing to Pro costs. Run infrequently (weekly) with caching to minimize detection risk.

2. **If Meetup proves high-value, invest in Pro.** Apply for OAuth consumer access with a use case framed around "enhancing Meetup event discovery" (not "competing with Meetup"). Budget ~$30/month.

3. **Build ingestion around lat/lon queries** for Miami (25.76, -80.19) and Fort Lauderdale (26.12, -80.14) with ~15-25 mile radius each, then deduplicate overlapping results.

4. **Filter for relevant categories:** Focus on community, social, fitness, arts, and outdoor categories. Exclude pure tech/professional meetups unless they have broad appeal.

5. **Track recurring events:** Use recurrence metadata to create `seriesId` entries in IRL's data model.

6. **Set `trustTier: 'official_api'`** if using the API, `'scraped_unknown'` if scraping.

7. **Refresh schedule:** Weekly syncs sufficient. Rate limits won't be an issue at this cadence.

## Priority: Medium

Meetup fills a gap that other sources don't cover well — recurring community events, fitness groups, hobby meetups. However, the Pro paywall (~$30/month), OAuth approval gate, and restrictive ToS create friction. It is not a "plug and play" data source. The data is high quality for its niche but won't cover concerts, nightlife, festivals, or cultural events. Worth pursuing after higher-yield, lower-friction sources are integrated.
