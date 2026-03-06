# Miami District Event Pages

> Wynwood BID, Brickell City Centre, MiMo District

## Overview

Miami's neighborhood business improvement districts and commercial developments maintain event calendars for their areas. These capture neighborhood-level events (art walks, pop-ups, markets, community gatherings) that don't appear on major ticketing platforms.

---

## Wynwood BID (Business Improvement District)

**Website:** wynwoodmiami.com

### Access Method
- Events/calendar section on the main site
- Wynwood BID is an active organization with regular programming (Art Walk, Second Saturdays, etc.)
- Website is likely a modern CMS (WordPress, Squarespace, or custom)
- No public API expected
- May have social media (Instagram @wynwoodmiami) as a supplementary source

### Data Quality
- **Events:** Wynwood Art Walk (monthly), gallery openings, pop-up markets, mural tours, street festivals, food events, live music
- **Fields expected:** Title, date, time, description, image, sometimes venue/location within Wynwood
- **Strengths:** Authoritative source for Wynwood-specific events. Art Walk dates and featured galleries. Covers the art/culture/nightlife intersection.
- **Weaknesses:** May not list individual venue events (bars, restaurants). Events may be neighborhood-wide (no specific address).

### Recommended Approach
- Scrape events page with Cheerio/Puppeteer
- Default neighborhood: `"Wynwood"`, default area coordinates: `{ lat: 25.8015, lng: -80.1993 }`
- Supplement with Instagram scraping for @wynwoodmiami
- Monitor for Art Walk dates specifically — these are anchor events

### Priority: **Medium** — Good for neighborhood-level events, but volume may be low

---

## Brickell City Centre

**Website:** brickellcitycentre.com

### Access Method
- Events section at `brickellcitycentre.com/events/` or similar
- Operated by Swire Properties — likely a professional commercial real estate site
- May use a third-party events platform (Eventbrite, custom CMS)
- No public API expected

### Data Quality
- **Events:** Shopping events, holiday celebrations, wellness classes, pop-ups, rooftop events, seasonal activations
- **Fields expected:** Title, date, time, description, image, location within the complex
- **Strengths:** Professional presentation, high-quality images, well-structured event data
- **Weaknesses:** Events are primarily commercial/retail-oriented. May not align with IRL's cultural focus. Could feel "corporate" rather than "local."

### Recommended Approach
- Scrape events page with standard HTML parsing
- Fixed venue: `{ lat: 25.7661, lng: -80.1916, address: "701 S Miami Ave, Miami, FL 33131", neighborhood: "Brickell" }`
- **Filter carefully:** Only include events with genuine cultural/community value. Skip pure retail promotions.
- Consider tagging as `tags: ['commercial', 'brickell']` for user filtering

### Priority: **Low** — Commercial events that may not align with IRL's editorial voice

---

## MiMo District (Miami Modern)

**Website:** mimodistrict.com or mimoontheriv.com (the MiMo Biscayne Association)

### Access Method
- Small neighborhood association — website may be basic or infrequently updated
- Events may be posted on social media more than the website
- Check for Facebook page, Instagram presence
- Website may be WordPress-based

### Data Quality
- **Events:** MiMo design tours, architectural walking tours, neighborhood events, small gallery openings, pop-up events along Biscayne Blvd
- **Fields expected:** Basic — title, date, maybe time and description
- **Strengths:** Unique neighborhood that's off the beaten path. Authentic local character.
- **Weaknesses:** Very low event volume. Data may be sparse or poorly structured. Website may not be well-maintained.

### Recommended Approach
- Check if the website has a functional events page
- If minimal web presence, monitor Instagram/Facebook instead
- Fixed area: `{ lat: 25.8540, lng: -80.1810, neighborhood: "MiMo District" }`
- Supplement with manual curation — MiMo events may be better sourced via community submissions

### Priority: **Low** — Unique character but very low event volume; better served by community submissions

---

## Overall Recommended Approach

1. **Start with Wynwood BID** as the highest-value district source. Art Walk alone justifies the integration.

2. **De-prioritize Brickell City Centre** unless IRL wants to cover commercial/retail events. These events are well-publicized through other channels.

3. **Monitor MiMo via social media** rather than web scraping. The event volume doesn't justify a dedicated scraper.

4. **Instagram as primary channel:** All three districts are more active on Instagram than their websites. Consider Instagram monitoring (already in the scraper at 156 events) as the primary channel for district-level events.

5. **Set `trustTier: 'scraped_known_venue'`** for all district sources.

## Overall Priority: Low-Medium

District event pages add neighborhood-level color but are better supplemented by Instagram monitoring and community submissions. Wynwood BID is the exception — worth integrating directly.
