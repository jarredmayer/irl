# Meetup.com

> Recurring community events

## Access Method

**GraphQL API available** with authentication required.

- **API endpoint:** `https://api.meetup.com/gql` (GraphQL)
- **Authentication:** OAuth 2.0 required. Must register a Meetup API consumer (OAuth app) at `meetup.com/api/oauth/list`
- **Legacy REST API:** Deprecated in favor of GraphQL, but some endpoints may still work
- **Pro API:** Additional endpoints for Meetup Pro networks (enterprise tier, requires paid subscription)

**Key GraphQL queries:**
- `searchEvents`: Search events by location (lat/lng + radius), keyword, date range
- `groupByUrlname`: Get group details and upcoming events
- `event`: Get full event details by ID

**Location-based search is supported:** Can search by coordinates with radius, making it well-suited for "events in Miami" queries.

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
- Recurring event flag
- Host/organizer info

**Strengths:**
- Excellent for recurring events (weekly, monthly meetups)
- Structured location data with coordinates
- Active community-maintained data
- Good category/topic taxonomy
- Free vs. paid flag with pricing

**Weaknesses:**
- Heavy on tech/professional events — limited coverage of music, nightlife, cultural events
- Event descriptions can be boilerplate for recurring events
- Some groups are inactive but still show "upcoming" events
- Image quality varies

## Rate Limits

- **Standard tier:** 200 requests per hour (per OAuth token)
- **Pro tier:** Higher limits (undocumented, requires enterprise agreement)
- **Pagination:** Results are paginated, typically 20-50 per page

## ToS Risks

**Risk level: LOW**

- Meetup provides an official API specifically for third-party integration
- ToS requires attribution: "Powered by Meetup" or similar
- Must not compete directly with Meetup's core functionality (group management)
- Data display must include links back to Meetup event pages
- Cannot store data indefinitely — should refresh regularly

## Recommended Approach

1. **Register an OAuth app** on Meetup and obtain API credentials
2. **Use `searchEvents` GraphQL query** with Miami/Fort Lauderdale coordinates and a 25-mile radius
3. **Filter for relevant categories:** Focus on community, social, fitness, arts, and outdoor categories. Exclude pure tech/professional meetups unless they have broad appeal.
4. **Track recurring events:** Use the recurring event metadata to create `seriesId` entries in IRL's data model
5. **Set `trustTier: 'official_api'`** — data comes from the official API
6. **Refresh schedule:** Poll daily for new events, weekly for updates to existing events
7. **Attribution:** Include "via Meetup" in source attribution and link to Meetup event pages

## Priority: Medium

Meetup fills a gap that other sources don't cover well — recurring community events, fitness groups, hobby meetups. The official API makes integration straightforward with low ToS risk. However, the event types don't overlap much with IRL's core focus (music, nightlife, culture), so it's supplementary rather than essential.
