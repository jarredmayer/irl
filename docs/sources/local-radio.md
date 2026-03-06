# Local Radio Stations

> WDNA 88.9 FM, WVUM 90.5 FM event listings

## Overview

Miami's local radio stations occasionally host or promote community events. Their event listings provide a niche signal for music and community events that may not appear on mainstream platforms.

---

## WDNA 88.9 FM

**Website:** wdna.org

### Access Method
- WDNA is Miami's community jazz radio station (NPR affiliate)
- Events may be listed under a "Community Calendar" or "Events" section
- Website is likely a simple CMS (WordPress or similar)
- No public API expected
- Check for RSS feed for programming/events

### Data Quality
- **Events:** Jazz concerts, community events, station fundraisers, listening parties, music workshops, cultural events
- **Fields expected:** Title, date, time, venue, description
- **Strengths:** Unique jazz/community music events that don't appear on mainstream platforms. Strong local credibility.
- **Weaknesses:** Very low event volume (maybe 2-5 events per month). Website may not have a dedicated events calendar. Events may be mixed with programming schedule.

### Recommended Approach
- Check website for events page or community calendar
- If it exists, scrape with Cheerio (simple HTML)
- If no events page, monitor social media (Facebook page, Instagram)
- Consider manual curation — volume is low enough for hand-entry
- Set `trustTier: 'scraped_known_venue'`

### Priority: **Low** — Unique jazz niche but very low volume

---

## WVUM 90.5 FM

**Website:** wvum.org

### Access Method
- WVUM is University of Miami's student-run radio station
- Events would be student concerts, campus events, station events
- Website may be hosted on university infrastructure
- Likely basic web presence — student-run organizations often have minimal web development
- Check for social media as primary event promotion channel

### Data Quality
- **Events:** Student concerts, open mic nights, campus music events, station events, battle of the bands
- **Fields expected:** Basic — title, date, maybe time and location
- **Strengths:** Captures student/young adult events and emerging local musicians
- **Weaknesses:** Very low event volume. Events may be campus-only (limited public access). Website may be poorly maintained. Data quality likely inconsistent.

### Recommended Approach
- Check website for any events listing
- Instagram/Twitter monitoring is likely more productive than web scraping
- Consider as a supplementary source for the "emerging artists" niche
- May overlap with events already captured via Instagram Sources (156 events)
- Set `trustTier: 'scraped_unknown'` unless verified

### Priority: **Low** — Very niche, low volume, student-focused

---

## Overall Recommended Approach

1. **Do not build dedicated scrapers** for radio station event pages. The volume doesn't justify the engineering effort.

2. **Include in Instagram monitoring:** If WDNA and WVUM have active Instagram accounts, add them to the existing Instagram Sources pipeline (already pulling 156 events).

3. **Community submission path:** Radio stations could be invited to submit events via the IRL submission form. They're natural partners — IRL promotes their events, they get exposure.

4. **Manual curation:** For the small number of WDNA jazz events, manual entry by the editorial team may be the most efficient approach.

5. **Future consideration:** If IRL builds a "submit via email" feature, add these stations to the outreach list. Radio stations are accustomed to receiving and sending event announcements via email.

## Overall Priority: Low

Local radio stations are niche sources with very low event volume. Better addressed through Instagram monitoring, community submissions, or editorial partnerships than dedicated scraping infrastructure.
