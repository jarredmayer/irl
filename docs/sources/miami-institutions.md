# Miami Institution Calendars

> PAMM, Wolfsonian, ICA Miami, Bass Museum, Little Haiti Cultural Complex

## Overview

Miami's cultural institutions maintain event calendars on their websites. These are high-quality, editorially curated events (exhibitions, openings, talks, workshops, performances) that serve IRL's mission of surfacing authentic local culture.

The existing scraper already pulls **393 events from "Cultural Attractions"** — this document assesses whether individual institution scraping can improve coverage and data quality.

---

## PAMM (Pérez Art Museum Miami)

**Website:** pamm.org

### Access Method
- Events calendar at `pamm.org/en/programs-events/` or similar path
- Server-rendered HTML with potential JSON-LD markup
- No public API
- May use a CMS like WordPress or custom platform with structured event output

### Data Quality
- **Events:** Exhibition openings, artist talks, community programs, family workshops, film screenings, live music in the sculpture garden
- **Fields available:** Title, date, time, description, image, ticket price, category
- **Strengths:** High-quality images, detailed descriptions, professional curation
- **Weaknesses:** May not include specific address per event (PAMM is a single location: 1103 Biscayne Blvd)

### Recommended Approach
- Scrape the events/programs page with Cheerio or headless browser
- Fixed venue data: `{ lat: 25.7854, lng: -80.1863, address: "1103 Biscayne Blvd, Miami, FL 33132", neighborhood: "Downtown" }`
- Check for iCal feed (many museums offer `.ics` exports)

### Priority: **High** — Premier Miami cultural institution, strong event programming

---

## The Wolfsonian-FIU

**Website:** wolfsonian.org

### Access Method
- Events listed on the main site, likely under `/calendar/` or `/events/`
- Part of FIU (Florida International University) — may use university CMS
- No public API expected
- Smaller event volume than PAMM

### Data Quality
- **Events:** Exhibition openings, lectures, curator talks, academic events, design-focused programming
- **Fields:** Title, date, time, description, possibly free admission info
- **Strengths:** Niche design/architecture focus — unique events not found elsewhere
- **Weaknesses:** Lower event volume, may have sporadic scheduling

### Recommended Approach
- Scrape events page with standard HTML parsing
- Fixed venue: `{ lat: 25.7811, lng: -80.1310, address: "1001 Washington Ave, Miami Beach, FL 33139", neighborhood: "South Beach" }`
- Lower priority due to smaller volume

### Priority: **Low** — Niche content, low event volume

---

## ICA Miami (Institute of Contemporary Art)

**Website:** icamiami.org

### Access Method
- Events at `icamiami.org/programs/` or similar
- Modern website (likely Next.js or similar framework)
- No public API
- May have structured data in page source

### Data Quality
- **Events:** Exhibition openings, artist talks, performances, film screenings, community programs
- **Fields:** Title, date, time, description, image, free admission (ICA Miami is free)
- **Strengths:** Always free admission, strong contemporary art programming, Design District location
- **Weaknesses:** May not list all events on public calendar

### Recommended Approach
- Scrape programs page, look for JSON-LD first
- Fixed venue: `{ lat: 25.8128, lng: -80.1928, address: "61 NE 41st St, Miami, FL 33137", neighborhood: "Design District" }`
- All events can default to `isFree: true`

### Priority: **Medium** — Free admission is valuable for IRL's audience, good location

---

## Bass Museum of Art

**Website:** thebass.org

### Access Method
- Events at `thebass.org/events/` or `/programs/`
- Standard CMS-driven website
- No public API
- Likely WordPress-based — check for WP REST API endpoints

### Data Quality
- **Events:** Exhibition openings, artist talks, workshops, Miami Beach-specific cultural programming
- **Fields:** Title, date, time, description, image, ticket info
- **Strengths:** Strong Miami Beach cultural programming, unique exhibitions
- **Weaknesses:** Events may be sparse outside of exhibition openings

### Recommended Approach
- Check for WordPress REST API: `thebass.org/wp-json/wp/v2/events` or similar
- If WordPress, structured JSON data is available without scraping
- Fixed venue: `{ lat: 25.7953, lng: -80.1305, address: "2100 Collins Ave, Miami Beach, FL 33139", neighborhood: "South Beach" }`

### Priority: **Medium** — Good cultural content, Miami Beach coverage

---

## Little Haiti Cultural Complex

**Website:** Managed by Miami-Dade County (miamidadearts.org or similar)

### Access Method
- Events may be listed on Miami-Dade County arts calendar or a dedicated page
- Government websites often have structured data or iCal feeds
- May be part of a larger county events system
- Check `miamidadearts.org`, `littlehaiticulturalcenter.com`, or similar

### Data Quality
- **Events:** Haitian cultural events, Caribbean art exhibitions, community gatherings, dance performances, music events, community workshops
- **Fields:** Title, date, time, description, possibly image
- **Strengths:** Unique Haitian/Caribbean cultural content not found anywhere else. Critical for IRL's mission of neighborhood-level diversity.
- **Weaknesses:** Government sites may be poorly maintained, data may be sparse or outdated

### Recommended Approach
- Identify the correct URL for event listings
- Scrape with Cheerio (government sites are usually server-rendered HTML)
- Fixed venue: `{ lat: 25.8355, lng: -80.1982, address: "212 NE 59th Terrace, Miami, FL 33137", neighborhood: "Little Haiti" }`
- Combine with Instagram monitoring for the venue's social accounts

### Priority: **High** — Unique cultural content, aligns with IRL's neighborhood diversity goals

---

## Overall Recommended Approach

1. **Batch scraper:** Build a single "cultural institutions" scraper module that handles all five venues with per-venue configuration (URL, selectors, fixed venue data).

2. **Check for iCal feeds first:** Many museums offer `.ics` calendar exports. This is the most reliable and respectful approach.

3. **JSON-LD fallback:** Check event pages for schema.org/Event structured data before parsing HTML.

4. **Fixed venue enrichment:** Since each institution has a single address, pre-populate all location fields (lat/lng, address, neighborhood, city) without geocoding.

5. **Set `trustTier: 'scraped_known_venue'`** — these are official institutional calendars.

6. **Refresh schedule:** Weekly scrape is sufficient — museum events don't change frequently.

7. **Already partially covered:** The existing "Cultural Attractions" source (393 events) likely includes some of these institutions. Cross-reference to avoid duplicates.

## Overall Priority: Medium-High

Cultural institutions provide unique, high-quality events that differentiate IRL from generic aggregators. PAMM and Little Haiti Cultural Complex are the highest priority within this group.
