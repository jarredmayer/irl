# Partiful

> Semi-private events, tastemaker layer

## Access Method

**No official public API.** Partiful is an invitation-based event platform built on **Next.js + React + Firebase**.

**Public surfaces:**
- **Discover pages** exist at `partiful.com/discover/{city}` — currently available for NYC, SF, LA, Boston, and DC only. **Miami is not yet included.** These list public events with structured data, accessible without login.
- **Individual event pages** (`partiful.com/e/{id}`) for events marked as "Public" by hosts are accessible without login.
- Both contain `__NEXT_DATA__` JSON with full event metadata and schema.org JSON-LD — clean structured extraction is straightforward.

**Unofficial tools:**
- [`cerebralvalley/partiful-api`](https://github.com/cerebralvalley/partiful-api) npm package — exposes 5 read-only endpoints: `getEvent`, `getMutuals`, `getUsers`, `getInvitableContacts`, `getGuestsCsv`. Requires Bearer token manually extracted from browser dev tools; tokens expire frequently. **Not suitable for production.**

**The fundamental challenge:** The vast majority of Partiful events are **private by default**. Only events where hosts explicitly toggle "Public" and submit to Discover are visible. This is a small fraction of total events. There is no "Partiful Miami events" page.

**Anti-bot measures:** Google Tag Manager, FullStory, Branch.io deep linking observed. No aggressive bot detection (Cloudflare, reCAPTCHA) on public pages currently, but this could change.

## Data Quality

**Variable — depends on the host.** Partiful events range from casual house parties to professionally organized cultural events.

**Available fields on public event pages (via `__NEXT_DATA__` / JSON-LD):**
- Event title, description (rich text)
- Date/time with timezone
- Location (street address or "Virtual")
- Host name(s) and profile photos
- Attendee metrics: Going, Interested, Maybe counts
- Event status (PUBLISHED, etc.)
- Event images (hosted on Firebase Storage)
- Custom questionnaire fields (if any)
- Custom links attached by hosts
- RSVP options (Going / Maybe / Can't Go)

**Strengths:**
- Captures events that appear nowhere else (house parties, private dinners, rooftop gatherings)
- "Tastemaker" signal — Partiful is popular with creative/cultural communities
- Named in Time's 100 Most Influential Companies 2025, 2M+ new users in H1 2025
- Host-curated descriptions are authentic and personality-driven

**Weaknesses:**
- Location is often vague ("Wynwood" instead of a full address)
- No price/ticket information (most events are free/invite-only)
- No genre/category taxonomy
- Most events are private — public surface is small
- Profile browsing and event history are gated behind authentication and mutual connections — **weak as a tastemaker discovery layer** compared to Luma where organizer pages are fully public

## Rate Limits

No documented rate limits. Public pages are standard Next.js SSR — standard HTTP rate limiting likely applies.

## ToS Risks

**Risk level: HIGH**

- [Terms of Service](https://partiful.com/terms) explicitly prohibit: scraping, copying, framing, or creating derivative works from Service Content
- [Community Guidelines](https://partiful.com/community-guidelines) prohibit spambots, self-bots, and "artificial means to inflate activity"
- Partiful is sensitive to data privacy issues — a 2025 TechCrunch report on GPS metadata handling showed they take data security seriously and would likely act on unauthorized data collection
- **Ethical consideration:** Even if technically feasible, aggregating private Partiful events without host consent would violate the platform's social contract

## Recommended Approach

**Do not scrape Partiful.** Instead, use it as a **submission source**:

1. **Partiful URL import in submission form:**
   - Allow event submitters to paste a Partiful link
   - Parse the `__NEXT_DATA__` JSON or JSON-LD for title, date, location, description, image
   - Pre-fill the submission form with parsed data
   - Submitter (ideally the host) opts in to having their event appear on IRL

2. **Tastemaker partnerships:**
   - Identify 10-20 Miami "tastemakers" who regularly host events on Partiful
   - Partner with them: they share their Partiful links with IRL, IRL gives them a "Tastemaker" badge
   - This creates a curated, consent-based pipeline of high-quality semi-private events

3. **Partnership outreach:** Contact Partiful about a data-sharing agreement. They're a growth-stage startup and may be open to partnerships that drive event attendance. Request Miami be added to the Discover feed.

4. **Trust tier:** Events sourced via Partiful should be `submitted_verified` (host opted in) or `submitted_unverified` (third-party submitted the link).

5. **Privacy controls:** Always allow hosts to request removal. Include a "This is my event and I want it removed" flow.

6. **Avoid:** Using the `cerebralvalley/partiful-api` for production — requires stolen auth tokens, fragile, ToS-violating.

## Priority: Low

The combination of explicit ToS prohibition, most events being private, no public API, and Miami not being on the Discover feed makes Partiful a low-yield, high-risk automated source. The right approach is partnership-based and consent-driven — a Phase 2 initiative after the core ingestion pipeline is built. Revisit if Partiful launches an official API or adds Miami to Discover.
