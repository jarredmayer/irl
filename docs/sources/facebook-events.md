# Facebook Events

> Community events, Latin cultural events, neighborhood-level

## Access Method

**Official API is severely restricted.** Facebook deprecated public event search via the Graph API in 2018-2019 as part of the Cambridge Analytica fallout. The current state:

- **Graph API v19+:** No public event search endpoint. You can only access events for Pages you admin or events the authenticated user has RSVP'd to.
- **Page Events endpoint:** `GET /{page-id}/events` still works for Pages you have admin access to, or public Pages' events with a valid access token.
- **No location-based event search:** The old `search?type=event&q=miami` endpoint is gone.

**Web scraping approach:**
- Facebook has **extremely aggressive anti-bot measures**: login walls, Cloudflare, JavaScript rendering, CAPTCHAs, account suspensions
- Event pages are behind authentication for most content
- Public events have limited data visible without login
- Scraping Facebook carries the highest risk of any source on this list

**Alternative approaches:**
1. **Page-specific monitoring:** Create a curated list of Miami venue/organizer Facebook Pages and poll their events via the Graph API (requires a Facebook App with Pages access)
2. **Open Graph / meta tags:** Public event URLs expose title, date, description, and image via Open Graph meta tags — parseable without authentication
3. **Community partnerships:** Ask venue operators to share their Facebook event links, then parse the public OG data
4. **Third-party aggregators:** Services like All Events, 10times, or PredictHQ already aggregate Facebook events and may offer API access

## Data Quality

**Unique and high-value for community events.** Facebook is the only source that comprehensively covers:
- Latin cultural events (Calle Ocho, Little Havana festivals, salsa nights)
- Neighborhood-level community meetups
- Church/community org events
- Pop-up markets and yard sales
- House parties and semi-private gatherings (public ones)
- HOA and neighborhood association events

**Available fields (when accessible):**
- Event title and description
- Date, start time, end time
- Venue/location name and address
- Cover image
- Host/organizer info
- RSVP count ("interested" / "going")
- Ticket URL (if external ticketing)
- Category
- Online/in-person flag

**Weaknesses:**
- Data quality varies wildly — community events often have incomplete addresses, missing times, or vague descriptions
- No structured genre/category taxonomy
- Images may be low resolution
- Events may be cancelled without updates

## Rate Limits

- **Graph API:** 200 calls per user per hour (standard tier), higher with approved app permissions
- **Web scraping:** Effectively zero tolerance — accounts get suspended, IPs get blocked

## ToS Risks

**Risk level: VERY HIGH (scraping) / MEDIUM (API)**

- **Scraping:** Explicitly prohibited. Facebook/Meta actively litigates against scrapers (multiple lawsuits). Account bans are automated.
- **Graph API:** Permitted within API terms, but app review is strict. Event-related permissions require justification and review.
- **Open Graph parsing:** Gray area — it's technically public metadata designed for link previews, but bulk parsing could be flagged.

## Recommended Approach

1. **Do NOT scrape Facebook directly.** The legal and technical risks are too high.

2. **Curated Page list approach:**
   - Build a list of 50-100 key Miami venue/organizer Facebook Pages
   - Use the Graph API to poll their events (requires Facebook App with `pages_read_engagement` permission)
   - This is ToS-compliant and provides the highest-value events

3. **Open Graph enrichment:**
   - When a Facebook event URL is discovered from another source (Instagram, community submissions), parse the OG meta tags for additional data
   - Low volume, low risk

4. **Community submission bridge:**
   - Allow users to submit events by pasting a Facebook event URL
   - Parse OG data from the URL to pre-fill the submission form
   - This turns Facebook into a submission source without requiring direct scraping

5. **Third-party aggregator:**
   - Evaluate PredictHQ or All Events as intermediaries that legally aggregate Facebook event data
   - May provide API access to pre-processed Facebook events

## Priority: Medium

Facebook is the single best source for community and Latin cultural events, but the access restrictions make it the hardest to integrate. The curated Page list approach is the most viable path. Start with a manual list of key Miami venue Pages and expand from there.
