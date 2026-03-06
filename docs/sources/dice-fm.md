# Dice.fm

> Music events, often has listings not found elsewhere

## Access Method

**No official public API for third-party consumers.** Dice.fm has internal APIs used by their mobile apps and web frontend but does not offer a documented developer API.

**Current scraper status:** The existing IRL scraper has a "Dice.fm Real" source returning **0 events** (empty status). However, Dice.fm URLs appear throughout the event data as ticket links (e.g., `link.dice.fm/...`), indicating Dice.fm is an important ticketing platform for Miami venues.

**Web scraping approach:**
- Dice.fm web app is a React SPA with server-side rendering
- City-specific pages exist (e.g., `dice.fm/city/miami`)
- Event data is embedded in the page as JSON (SSR hydration data)
- Internal API endpoints can be discovered via network inspection:
  - Event listings by city/genre
  - Event detail by slug or ID
  - Artist pages with upcoming events
- Cloudflare protection is present but not aggressive

**Mobile API:**
- Dice.fm's mobile apps use REST endpoints that could be reverse-engineered
- Authentication may be required (app tokens)
- Higher risk of breakage and ToS enforcement

## Data Quality

**Excellent for music events.** Dice.fm is a ticketing platform, so data is maintained by promoters/venues and is highly reliable.

**Available fields:**
- Event title and full description
- Date, door time, start time, end time
- Venue name, address, city
- Full lineup with artist names and images
- Ticket prices (multiple tiers: GA, VIP, early bird)
- Sold out status
- Event image (high resolution)
- Genre/category tags
- Age restriction
- Promoter/organizer
- Direct ticket purchase link

**Strengths:**
- Data is real-time accurate (ticketing platform — prices and availability are live)
- Excellent lineup data
- Covers events not found on RA (hip-hop, R&B, pop, Latin music)
- Strong Miami venue partnerships (Club Space, The Ground, Revolution Live, etc.)
- Door time vs. show time distinction

**Weaknesses:**
- No public API — scraping required
- Geographic coordinates not always available
- Some events are "Dice exclusive" — may have exclusive data not available elsewhere

## Rate Limits

No documented rate limits. Web scraping considerations:
- Cloudflare may trigger challenges on high-frequency requests
- Recommended: 2-3 second delays between requests
- Session management may be needed for consistent access

## ToS Risks

**Risk level: MEDIUM**

- Dice.fm Terms of Service prohibit scraping and automated access
- They are a well-funded company (>$100M raised) with legal resources
- However, using their ticket links as `ticketUrl` benefits them (drives ticket sales)
- **Mitigation:** Frame integration as driving ticket sales to Dice.fm. Always link to their event pages. Consider reaching out for a partnership — platforms like Dice.fm sometimes offer data feeds to complementary discovery apps.

## Recommended Approach

1. **Fix the existing scraper:** The "Dice.fm Real" source returning 0 events suggests a broken integration. Debug the scraper in `scraper/src/sources/` to identify what changed.

2. **Scrape city event listings:** Parse `dice.fm/city/miami` and extract SSR hydration data. This gives a list of all upcoming Miami events.

3. **Enrich from detail pages:** For each event, fetch the detail page for full lineup, pricing, and description.

4. **Partnership outreach:** Email Dice.fm's partnerships team. Pitch IRL as a discovery layer that drives ticket sales to Dice.fm. They may offer a data feed or affiliate arrangement.

5. **Set `trustTier: 'official_api'`** — data is promoter/venue-maintained through Dice.fm's platform.

6. **Use Dice.fm links for `ticketUrl`:** Continue using `link.dice.fm` URLs as the primary ticket purchase link. This aligns interests — IRL drives sales, Dice.fm gets traffic.

## Priority: High

Dice.fm covers a broad music spectrum beyond electronic (hip-hop, Latin, R&B, pop) and has strong Miami venue partnerships. The existing scraper needs fixing but the data quality justifies the effort. Combined with RA, these two sources would cover the majority of Miami's music event landscape.
